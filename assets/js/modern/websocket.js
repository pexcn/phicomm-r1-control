/**
 * R1音箱 WebSocket 通信模块
 * 支持原版所有消息类型、自动请求设备信息、状态回调、自动重连
 */
(function (global) {
  "use strict";

  /* ========== 配置常量 ========== */
  var RECONNECT_DELAY = 3000; // 重连间隔(ms)
  var HEARTBEAT_INTERVAL = 30000; // 心跳间隔(ms)
  var REQUEST_TIMEOUT = 10000; // 请求超时(ms)

  /* 调试日志总开关：控制台里执行 R1_DEBUG = true 即可打开（console.error/warn 不受控）。
   * 原实现是全局把 console.log 覆写成空函数，有两个副作用：
   *  1. 页面里所有脚本（含扩展、devtools 之外的第三方）的 log 都被静默；
   *  2. 函数参数在调用前就已求值，收消息热路径上的 JSON.stringify 照跑不误，
   *     屏蔽输出并没有省下开销。
   * 现改为短路判断：开关关闭时 && 右侧整体不求值，零成本。 */
  global.R1_DEBUG = false;
  var INFO_UPDATE_INTERVAL = 5000; // 设备信息更新间隔(ms)
  var MUSIC_UPDATE_INTERVAL = 500; // 音乐状态更新间隔(ms)

  /* ========== 内部状态 ========== */
  var ws = null; // WebSocket实例
  var connected = false; // 连接状态
  var connecting = false; // 正在连接
  var wsUrl = ""; // WebSocket地址
  var reconnectTimer = null; // 重连定时器
  var heartbeatTimer = null; // 心跳定时器
  var infoUpdateTimer = null; // 信息更新定时器
  var musicUpdateTimer = null; // 音乐状态更新定时器
  var requestId = 0; // 请求ID计数器
  var pendingRequests = {}; // 等待响应的请求
  var listeners = {}; // 事件监听器
  var connectIp = ""; // 连接IP
  var localIp = ""; // 本地IP（从设备获取）
  var hostname = ""; // 设备主机名
  var ver = 1000; // 固件版本
  var uVer = 1000; // Unisound版本
  var isUnisound = false; // 是否Unisound
  var isNewUnisound = false; // 是否新版Unisound
  var initDone = false; // 初始化完成
  var lastInfoUpdateTime = 0; // 上次信息更新时间
  var lastDeviceInfoUpdateTime = 0; // 上次设备信息更新时间

  /* ========== 数据缓存 ========== */
  var deviceInfo = {}; // 设备信息（系统信息）
  var apiInfo = {}; // API信息（登录/授权）
  var musicInfo = {}; // 音乐信息
  var bluetoothInfo = {}; // 蓝牙信息

  /* ========== 工具函数 ========== */
  function generateId() {
    return ++requestId;
  }

  /* ========== 事件系统 ========== */
  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function (cb) {
      return cb !== callback;
    });
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(function (cb) {
      try {
        cb(data);
      } catch (e) {
        console.error("[R1WS] 事件回调错误:", e);
      }
    });
  }

  /* ========== WebSocket 连接管理 ========== */
  /* 局域网访问权限模块（Chromium 147+ local-network-access API）
   * HTTPS 页面下需要此权限才能 ws:// 直连局域网设备 */
  var _lnPermissionState = "unknown"; /* granted / prompt / denied / unknown / unsupported */

  function initLocalNetworkPermission() {
    if (!navigator || !navigator.permissions) {
      _lnPermissionState = "unsupported";
      R1_DEBUG && console.log("[R1WS] 浏览器不支持 Permissions API，跳过权限检测");
      return Promise.resolve();
    }
    return navigator.permissions
      .query({ name: "local-network-access" })
      .then(function (status) {
        _lnPermissionState = status.state;
        R1_DEBUG && console.log("[R1WS] 本地网络访问权限:", _lnPermissionState);
        status.onchange = function () {
          _lnPermissionState = status.state;
          R1_DEBUG && console.log("[R1WS] 本地网络访问权限变更:", _lnPermissionState);
          emit("permission_change", { state: _lnPermissionState });
        };
      })
      .catch(function (e) {
        _lnPermissionState = "unsupported";
        R1_DEBUG && console.log("[R1WS] local-network-access 不支持:", e.message);
      });
  }

  /* 页面加载时初始化权限检测 */
  if (typeof window !== "undefined") {
    initLocalNetworkPermission();
  }

  function buildWsUrl(ip) {
    if (ip) return R1Config.parseDeviceAddress(ip).url;
    return R1Config.serviceUrl("ws").replace(/^http/, "ws");
  }

  /* 执行实际的 WebSocket 创建与连接绑定 */
  function doConnect(wsUrl) {
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      connecting = false;
      emit("error", { message: "WebSocket创建失败: " + e.message });
      scheduleReconnect();
      return;
    }

    ws.onopen = function () {
      connected = true;
      connecting = false;
      emit("connected", { url: wsUrl });
      startHeartbeat();
      requestInitInfo();
    };

    ws.onclose = function () {
      var wasConnected = connected;
      connected = false;
      connecting = false;
      ws = null;
      stopInfoUpdate();
      stopMusicUpdate();
      emit("disconnected", {});
      if (wasConnected) scheduleReconnect();
    };

    ws.onerror = function () {
      connecting = false;
      emit("error", { message: "WebSocket连接错误" });
    };

    ws.onmessage = function (evt) {
      if (typeof evt.data === "string") {
        handleMessage(evt.data);
      } else {
        /* 二进制帧：原网页 (原网页.js:1098) 正是把这种 binary 帧当成屏幕推流
         *  — 直接 URL.createObjectURL(data.data) 给 <img> 用。
         * 兼容：Blob / ArrayBuffer / Uint8Array */
        try {
          var payload = evt.data;
          if (payload instanceof ArrayBuffer) {
            payload = new Blob([payload], { type: "image/jpeg" });
          } else if (payload && payload.byteLength != null && !(payload instanceof Blob)) {
            /* Uint8Array / typed array */
            payload = new Blob([payload], { type: "image/jpeg" });
          }
          emit("screen_frame", payload);
        } catch (eFrame) {
          try {
            if (window.console) window.console.warn("[R1] binary frame drop:", eFrame);
          } catch (e2) {}
        }
      }
    };
  }

  /* connect: 入口函数，带 local-network-access 权限检查 */
  function connect(ip) {
    var target = ip ? R1Config.parseDeviceAddress(ip).address : "";
    if (connected && connectIp === target) return;
    if (connecting && ws) {
      try {
        ws.onclose = null;
        ws.close();
      } catch (e) {}
      ws = null;
      connecting = false;
    }
    clearTimers();
    connecting = true;
    connected = false;
    connectIp = target;
    wsUrl = buildWsUrl(ip);
    initDone = false;
    emit("connecting", { url: wsUrl });
    R1_DEBUG && console.log("[R1WS] 正在连接:", wsUrl);

    /* 根据权限状态决定连接策略 */
    var isHttps =
      typeof window !== "undefined" && window.location && window.location.protocol === "https:";
    if (
      /^wss:/.test(wsUrl) ||
      !isHttps ||
      _lnPermissionState === "granted" ||
      _lnPermissionState === "unsupported"
    ) {
      /* HTTP 页面 / 已授权 / 不支持权限API → 直接连接 */
      doConnect(wsUrl);
      return;
    }

    if (_lnPermissionState === "prompt") {
      /* 待授权：提示用户后连接，触发浏览器权限弹窗 */
      R1_DEBUG && console.log("[R1WS] 需要本地网络访问权限，正在请求...");
      emit("permission_prompt", {});
      doConnect(wsUrl);
      return;
    }

    if (_lnPermissionState === "denied") {
      /* 已拒绝：仍然尝试连接（部分浏览器可能仍允许），失败则提示用户手动开启 */
      console.warn("[R1WS] 本地网络访问权限被拒绝，尝试连接...");
      doConnect(wsUrl);
      return;
    }

    /* unknown 状态：先查一次权限再决定 */
    initLocalNetworkPermission().then(function () {
      /* 递归调用自身，此时 _lnPermissionState 已更新 */
      connecting = false;
      connect(ip);
    });
  }

  function disconnect() {
    clearTimers();
    stopInfoUpdate();
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    connected = false;
    connecting = false;
    emit("disconnected", {});
  }

  function scheduleReconnect() {
    clearTimers();
    reconnectTimer = setTimeout(function () {
      connect(connectIp);
    }, RECONNECT_DELAY);
  }

  function startHeartbeat() {
    heartbeatTimer = setInterval(function () {
      if (connected && ws) wsSend({ type: "ping", timestamp: Date.now() });
    }, HEARTBEAT_INTERVAL);
  }

  function clearTimers() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (musicUpdateTimer) {
      clearInterval(musicUpdateTimer);
      musicUpdateTimer = null;
    }
  }

  /* ========== 原始发送函数 ========== */
  function wsSend(obj) {
    if (!connected || !ws) return false;
    try {
      ws.send(JSON.stringify(obj));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ========== 初始化信息请求（移植原版连接后逻辑） ========== */
  function requestInitInfo() {
    /* 原版连接后首先发送 get_info 获取基本信息 */
    wsSend({ type: "get_info", type_id: String(Date.now()) });
  }

  /* ========== 定期更新设备信息 ========== */
  function startInfoUpdate() {
    if (infoUpdateTimer) return;
    infoUpdateTimer = setInterval(function () {
      if (!connected) return;
      requestDeviceInfo();
    }, INFO_UPDATE_INTERVAL);
  }

  function stopInfoUpdate() {
    if (infoUpdateTimer) {
      clearInterval(infoUpdateTimer);
      infoUpdateTimer = null;
    }
  }

  /* ========== 请求设备详细信息（完整移植原版update_device_info + update_device_info1 + update_systeminfo逻辑） ========== */
  function requestDeviceInfo(force) {
    var now = Date.now();
    if (!force && now < lastDeviceInfoUpdateTime) return;
    lastDeviceInfoUpdateTime = now + INFO_UPDATE_INTERVAL;

    /* 移植原版update_device_info：发送API信息请求 */
    if (isNewUnisound) {
      wsSend({
        type: "send_to_unisound",
        data: { type: "api", data: { type: "info" } },
      });
    }

    /* 移植原版update_device_info1：发送sends批量请求 */
    if (ver + 1 > 1855) {
      var list = [];
      list.push({
        type: "shell",
        type_id: "useless_services_detection",
        shell: "/system/bin/pm list packages",
      });
      /* 原版：is_new_unisound && u_ver + 1 > 1820 时发送 */
      if (isNewUnisound && uVer + 1 > 1820) {
        list.push({
          type: "send_to_unisound",
          data: { type: "get_memo" },
        });
        list.push({
          type: "send_to_unisound",
          data: { type: "get_info" },
        });
      }
      wsSend({ type: "sends", list: list });
    } else {
      /* 旧版固件 */
      wsSend({
        type: "shell",
        type_id: "useless_services_detection",
        shell: "/system/bin/pm list packages",
      });
      if (isNewUnisound && uVer + 1 > 1820) {
        wsSend({
          type: "send_to_unisound",
          data: { type: "get_memo" },
        });
        setTimeout(function () {
          wsSend({
            type: "send_to_unisound",
            data: { type: "get_info" },
          });
        }, 200);
      }
    }

    /* 移植原版update_systeminfo：发送系统信息请求 */
    requestSystemInfo();
  }

  function requestSystemInfo() {
    /* 移植原版update_systeminfo逻辑 */
    if (ver + 1 > 1853) {
      wsSend({
        type: "sends",
        type_id: "device_info",
        list: [
          { type: "get_device_info", type_id: "get_device_info" },
          {
            type: "shell",
            type_id: "cpu_temp",
            shell: "cat /sys/class/hwmon/hwmon0/device/temp0_input",
          },
          { type: "shell", type_id: "date", shell: "date" },
        ],
      });
    } else {
      /* 旧版固件用shell查询 */
      wsSend({
        type: "shell",
        type_id: "query",
        shell:
          "cat /proc/meminfo&&cat /proc/stat&&echo incremental:$(getprop ro.build.version.incremental)&&echo date:$(date)",
      });
    }
    /* 兜底：部分新固件（如实测 ver 1882）的 get_device_info 回包缺固件版本/
     * 内存/uptime 字段，导致设备页显示 "--"。老的 shell 查询一次拿全，
     * 与新分支并行不冲突，两条通道谁回包用谁。 */
    wsSend({
      type: "shell",
      type_id: "query",
      shell:
        "cat /proc/meminfo&&cat /proc/stat&&echo incremental:$(getprop ro.build.version.incremental)&&echo date:$(date)",
    });
  }

  /* ========== 音乐状态更新（定期轮询获取播放信息） ========== */
  function startMusicUpdate() {
    if (musicUpdateTimer) return;
    musicUpdateTimer = setInterval(function () {
      if (!connected) return;
      requestMusicInfo();
    }, MUSIC_UPDATE_INTERVAL);
  }

  function stopMusicUpdate() {
    if (musicUpdateTimer) {
      clearInterval(musicUpdateTimer);
      musicUpdateTimer = null;
    }
  }

  function requestMusicInfo() {
    /* 请求当前音乐播放状态 */
    wsSend({ type: "get_info", type_id: String(Date.now()) });
  }

  /* ========== 消息处理（完整移植原版message函数逻辑） ========== */
  function handleMessage(rawData) {
    var data;
    try {
      data = JSON.parse(rawData);
    } catch (e) {
      console.warn("[R1WS] 非JSON消息:", rawData);
      return;
    }

    R1_DEBUG &&
      console.log(
        "[R1WS] 收到消息 type=" +
          data.type +
          " type_id=" +
          (data.type_id || "") +
          " code=" +
          (data.code || ""),
      );

    /* 回调处理（原版callbacks机制） */
    if (data.type_id && pendingRequests[data.type_id]) {
      var pending = pendingRequests[data.type_id];
      clearTimeout(pending.timer);
      delete pendingRequests[data.type_id];
      pending.callback(data);
    }

    var type = data.type;

    /* ===== 核心消息类型处理（移植原版message函数switch逻辑） ===== */
    switch (type) {
      /* 初始化信息 - 原版连接后第一个返回的消息 */
      case "get_info":
        handleGetInfo(data);
        break;

      /* Unisound消息 - send_to_unisound的响应通过此类型返回！
       * 原版：message()中 case 'Unisound' → Unisound(e)
       * Unisound()解析e.data（JSON），根据e.type路由：
       *   - 'api' → api(e, format) → api()中根据i.type路由：
       *     - 'info' → 更新登录/授权信息
       *     - 'login_netease_music' → 网易云登录
       *     - 'login_kuwo_music' → 酷我登录
       *     - 'collect'/'cancel_collect' → 收藏
       *     - 'get_song_list' → 歌单
       *   - 'get_qrcode' → 二维码
       *   - 'qrcode_state' → 二维码状态
       *   - 'login' → 登录
       *   - 'login_state' → 登录状态
       *   - 'get_info' → update_unisound_info(e)
       *   - 'get_memo'/'add_memo'等 → memo_info(e)
       */
      case "Unisound":
        handleUnisound(data);
        break;

      /* 批量消息 */
      case "sends":
        handleSends(data);
        break;

      /* 音乐列表（原版：update_list(data)，结构 {playList:[...], playIndex:N}） */
      case "list":
        try {
          var listData = data.data;
          if (typeof listData === "string") listData = JSON.parse(listData);
          /* 兼容多种结构：
           *  1) data.data = {playList:[{name,singer}], playIndex:N}  原版
           *  2) data.data = [{name,singer}, ...]                         简化版
           *  3) data.data = {list:[...], index:N}                       备选 */
          if (listData && Array.isArray(listData.playList)) {
            listData = listData.playList;
          } else if (listData && Array.isArray(listData.list)) {
            listData = listData.list;
          }
          if (!Array.isArray(listData)) listData = [];
          emit("music_list", listData);
        } catch (e) {
          emit("music_list", []);
        }
        break;

      /* 音效配置 */
      case "get_eq_config":
        try {
          var eqData = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
          emit("eq_config", eqData);
        } catch (e) {}
        break;

      /* 登录状态 */
      case "login_state":
        emit("login_state", data.data);
        break;

      /* 蓝牙设备 */
      case "BT_Device":
        emit("bluetooth_devices", data.data);
        break;

      /* 蓝牙开关确认 */
      case "BT_enable":
      case "BT_disable":
        emit("bluetooth_state", { enabled: type === "BT_enable" });
        break;

      /* 最大音量 */
      case "max_vol":
        if (data.code === 200) emit("max_volume", data.data);
        break;

      /* 屏幕截图（原版：type:"screencap" data:"data:image/jpeg;base64,..."） */
      case "screencap":
        emit("screencap", data.data || "");
        /* 推流到屏幕实时预览 */
        if (data.data) emit("screen_frame", data.data);
        break;

      /* 设备屏幕流独立协议（start_screencap_ack / stop_screencap_ack / screencap_frame） */
      case "start_screencap_ack":
        emit("screen_started", data);
        break;
      case "stop_screencap_ack":
        emit("screen_stopped", data);
        break;
      case "screencap_frame":
        if (data.data) emit("screen_frame", data.data);
        break;

      /* 设置背景结果 */
      case "set_background":
        emit("background_set", data);
        break;

      /* 设置均衡器结果 */
      case "set_eq":
        emit("eq_set", data);
        break;

      /* 屏幕尺寸 */
      case "wm_size":
        emit("screen_size", data);
        break;

      /* 蓝牙操作结果 */
      default:
        if (type && type.substr(0, 3) === "BT_") {
          emit("bluetooth_result", { code: data.code, msg: data.msg });
        } else if (
          type === "Set_Service_Normally_Open" ||
          type === "Set_DLNA_Open" ||
          type === "Set_AirPlay_Open"
        ) {
          emit("service_setting_result", { type: type, code: data.code, msg: data.msg });
        }
        break;
    }

    /* ===== 按type_id处理的消息 ===== */
    var typeId = data.type_id;
    if (typeId) {
      switch (typeId) {
        /* 设备信息批量返回 */
        case "device_info":
          handleDeviceInfoBatch(data);
          break;

        /* get_device_info单独返回 */
        case "get_device_info":
          handleGetDeviceInfo(data);
          break;

        /* Shell查询结果 - 系统信息 */
        case "query":
          handleShellQuery(data);
          break;

        /* Shell结果 - CPU温度 */
        case "cpu_temp":
          if (data.data) {
            var tempLines = data.data.split("\r\n");
            if (tempLines.length > 1) {
              deviceInfo.cpu_temp = Math.round(parseFloat(tempLines[1]));
            } else {
              deviceInfo.cpu_temp = data.data;
            }
            emit("device_info", deviceInfo);
          }
          break;

        /* Shell结果 - 日期 */
        case "date":
          if (data.data) {
            var dateLines = data.data.split("\r\n");
            if (dateLines.length > 1) {
              deviceInfo.device_time = dateLines[1];
            } else {
              deviceInfo.device_time = data.data;
            }
            emit("device_info", deviceInfo);
          }
          break;

        /* Shell结果 - 主机名 */
        case "get_hostname":
          handleHostname(data);
          break;

        /* 无用服务检测 */
        case "useless_services_detection":
          /* 原版useless_services_detection()，解析可用禁用的服务列表 */
          try {
            var pkgList = "";
            if (data.data && typeof data.data === "string") {
              var lines = data.data.split("\r\n");
              pkgList = lines.length > 1 ? lines.slice(1).join("\n") : data.data;
            }
            var uselessList = [];
            var allUseless =
              "com.phicomm.speaker.airskill,com.android.providers.telephony,com.phicomm.speaker.productiontest,com.android.externalstorage,com.android.providers.downloads,com.android.certinstaller,com.phicomm.speaker.bugreport,com.android.inputdevices,com.android.server.telecom,com.android.keychain,com.phicomm.speaker.otaservice,com.android.proxyhandler,com.phicomm.speaker.ijetty,com.android.vpndialogs,com.android.location.fused,com.phicomm.speaker.exceptionreporter".split(
                ",",
              );
            for (var ui = 0; ui < allUseless.length; ui++) {
              if (pkgList.indexOf(allUseless[ui]) > -1) uselessList.push(allUseless[ui]);
            }
            emit("useless_services", { list: uselessList, count: uselessList.length });
          } catch (eUseless) {}
          break;

        /* 音乐播放 */
        case "play":
          emit("play_result", data);
          break;

        /* 发送消息结果 */
        case "send_message":
          emit("send_result", data);
          break;

        /* 休眠结果 */
        case "dormancy":
          if (isNewUnisound) {
            wsSend({ type: "send_to_unisound", data: { type: "get_info" } });
          }
          break;

        /* 修改颜色 */
        case "modify_color":
          emit("color_saved", data);
          break;

        /* 切换播放器 */
        case "switch_player":
          emit("player_switched", data);
          break;

        /* 重启echo */
        case "reboot_echo":
          if (typeId !== "switch_player") emit("echo_rebooted", data);
          break;

        /* 屏幕尺寸 */
        case "wm_size":
          emit("screen_size", data);
          break;
      }
    }

    /* Shell命令输出：type='shell' 且未被子处理器消费时，转发到ADB终端 */
    if (type === "shell") {
      emit("shell_output", {
        type_id: data.type_id || "",
        data: data.data || "",
        code: data.code,
      });
    }

    /* 通用消息转发 */
    emit("message", data);
  }

  /* ===== 处理get_info初始化信息 ===== */
  function handleGetInfo(data) {
    try {
      /* 去重逻辑：svc_前缀的type_id是服务状态刷新请求，跳过去重检查
       * 普通get_info用时间戳作type_id，parseInt后与lastInfoUpdateTime比较去重 */
      var typeIdNum = parseInt(data.type_id);
      var isServiceRefresh = data.type_id && String(data.type_id).indexOf("svc_") === 0;
      if (!isServiceRefresh && (!data.type_id || lastInfoUpdateTime >= typeIdNum)) return;
      if (!isServiceRefresh && !isNaN(typeIdNum)) lastInfoUpdateTime = typeIdNum;
      var info = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
      if (!info) return;

      /* 提取版本信息 */
      if (info.ver != null) ver = info.ver;
      if (info.u_ver != null) uVer = info.u_ver;
      if (ver + 1 > 1835) {
        isUnisound = !!info.Unisound;
        isNewUnisound = isUnisound && uVer > 1000;
      }

      /* 提取设备基本信息 */
      if (info.ver != null) deviceInfo.ver = info.ver;
      if (info.u_ver != null) deviceInfo.u_ver = info.u_ver;
      if (info.device_name) deviceInfo.device_name = info.device_name;
      if (info.Current_PlayerType) deviceInfo.Current_PlayerType = info.Current_PlayerType;
      if (info.Support_Flac) deviceInfo.Support_Flac = info.Support_Flac;
      if (info.ExoPlayer_Version) deviceInfo.ExoPlayer_Version = info.ExoPlayer_Version;
      if (info.Service_Normally_Open != null)
        deviceInfo.Service_Normally_Open = info.Service_Normally_Open;
      if (info.dlna_open != null) deviceInfo.dlna_open = info.dlna_open;
      if (info.airplay_open != null) deviceInfo.airplay_open = info.airplay_open;
      if (info.device_state != null) deviceInfo.device_state = info.device_state;
      if (info.music_light_enable != null) deviceInfo.music_light_enable = info.music_light_enable;
      if (info.music_light_mode != null) deviceInfo.music_light_mode = info.music_light_mode;
      if (info.music_light_luma != null) deviceInfo.music_light_luma = info.music_light_luma;
      if (info.music_light_chroma != null) deviceInfo.music_light_chroma = info.music_light_chroma;
      if (info.music_light_color != null) deviceInfo.music_light_color = info.music_light_color;

      /* 提取音乐信息（原版通过update_info处理） */
      var musicUpdated = false;
      var songChanged = false;
      if (info.vol != null) {
        musicInfo.volume = info.vol;
        musicUpdated = true;
      }
      if (info.play_mode != null) {
        musicInfo.play_mode = info.play_mode;
        musicUpdated = true;
      }
      if (info.music_source != null) {
        musicInfo.music_source = info.music_source;
        musicUpdated = true;
      }
      if (info.ttsModelType != null) {
        musicInfo.ttsModelType = info.ttsModelType;
        musicUpdated = true;
      }
      if (info.play_type != null) {
        musicInfo.play_type = info.play_type;
        musicUpdated = true;
      }
      if (info.play_state != null) {
        musicInfo.play_state = info.play_state;
        musicUpdated = true;
      }
      if (info.music_info) {
        var mi = info.music_info;
        /* 原版兼容：arist → artist */
        if (mi.arist != null && mi.artist == null) mi.artist = mi.arist;
        /* 检测歌曲切换（原版：music_id != music_info.id） */
        if (mi.id != null && mi.id !== musicInfo.id) {
          songChanged = true;
        }
        if (mi.title) musicInfo.title = mi.title;
        if (mi.artist) musicInfo.artist = mi.artist;
        if (mi.album) musicInfo.album = mi.album;
        if (mi.cover) musicInfo.cover = mi.cover;
        if (mi.progress != null) musicInfo.progress = mi.progress;
        if (mi.duration != null) musicInfo.duration = mi.duration;
        if (mi.playing != null) musicInfo.playing = mi.playing;
        if (mi.id != null) musicInfo.id = mi.id;
        if (mi.ItemType != null) musicInfo.ItemType = mi.ItemType;
        if (mi.state != null) musicInfo.state = mi.state;
        if (mi.position != null) musicInfo.position = mi.position;
        if (mi.albumUrl) musicInfo.albumUrl = mi.albumUrl;
        musicUpdated = true;
      }
      if (musicUpdated) emit("music_info", musicInfo);

      /* 歌曲切换时获取封面和歌词（移植原版update_music_info逻辑） */
      if (songChanged && musicInfo.id && info.play_type === 1) {
        fetchMusicInfo(musicInfo.id, musicInfo);
        /* 同时请求播放列表（原版：ws_send('{"type":"list"}') */
        wsSend({ type: "list" });
      }

      emit("init_info", info);
      emit("device_info", deviceInfo);

      /* 初始化完成后请求详细信息 */
      if (!initDone) {
        initDone = true;
        /* 获取主机名和IP */
        wsSend({
          type: "shell",
          type_id: "get_hostname",
          shell: "getprop net.hostname && netcfg",
        });
        /* 请求设备详细信息 */
        requestDeviceInfo();
        /* 启动定期更新 */
        startInfoUpdate();
        /* 启动音乐状态更新 */
        startMusicUpdate();
      }
    } catch (e) {
      console.error("[R1WS] get_info解析错误:", e);
    }
  }

  /* ===== 处理Unisound消息（完整移植原版Unisound函数 + api函数逻辑） =====
   * 原版流程：
   *   message() → case 'Unisound' → Unisound(e)
   *   Unisound(e): e = e.data → JSON.parse(e.data) → 检查 e.code
   *     - e.type === 'api' → api(e, format) → api()中 i.type === 'info' → 更新登录/授权
   *     - e.type === 'get_info' → update_unisound_info(e)
   *     - e.type === 'get_memo' → memo_info(e)
   *     - e.type === 'login' → login(e)
   *     - e.type === 'login_state' → login_state(e)
   *     - 等等
   */
  function handleUnisound(data) {
    try {
      /* 原版：data = data.data, data = JSON.parse(data.data)
       * 即设备返回的响应有三层嵌套：
       *   第 1 层: WS 消息 {type:"Unisound", code:200, data:{...}}
       *   第 2 层: data.data = {data: "{...JSON 字符串...}"}
       *   第 3 层: JSON.parse(data.data) = {login_msg, login_state, type, code, data}
       *
       * 之前代码只解了第 1 层，拿到的是 {data: "..."} 对象，info.type 永远是 undefined，
       * 所以歌单/登录/授权等所有 Unisound 消息都无法路由。
       * 此处按原版逻辑做两层解包。 */
      var wrapper = data && data.data;
      if (!wrapper) {
        console.warn("[R1WS] Unisound消息无data字段:", data);
        return;
      }
      var info;
      if (typeof wrapper === "string") {
        info = JSON.parse(wrapper);
      } else if (wrapper && typeof wrapper.data === "string") {
        /* 原版格式：wrapper 是 {data:"..."} 对象，再 JSON.parse 一层 */
        info = JSON.parse(wrapper.data);
      } else {
        /* 兜底：wrapper 本身就是要的 info */
        info = wrapper;
      }
      if (!info) return;

      R1_DEBUG &&
        console.log(
          "[R1WS] Unisound消息 type=" +
            info.type +
            " code=" +
            info.code +
            " dataType=" +
            (info.data ? typeof info.data : "null"),
        );

      /* 原版：1 == e.code || 2 == e.code
       * 但get_song_list等响应code可能是"200"，需要特殊处理 */
      if (info.code !== 1 && info.code !== 2 && info.code !== "1" && info.code !== "2") {
        /* 非标准code的消息，检查是否是已知的特殊响应类型 */
        if (
          info.type !== "get_song_list" &&
          info.type !== "api" &&
          info.type !== "get_qrcode" &&
          info.type !== "qrcode_state" &&
          info.type !== "login" &&
          info.type !== "login_state" &&
          info.type !== "is_xiaoai"
        ) {
          R1_DEBUG && console.log("[R1WS] Unisound消息code不匹配，跳过:", info.code);
          return;
        }
        /* get_song_list等可能直接返回code:"200"，允许通过 */
        R1_DEBUG && console.log("[R1WS] Unisound特殊消息允许通过 type=" + info.type);
      }

      var innerType = info.type;

      switch (innerType) {
        /* API响应 - 包含登录/授权信息（原版：api(e, format)）
         * 原版 format 判断：
         *   data.data 是 string → format=1（要 JSON.parse）
         *   data.data 是 object → format=2（直接用）
         *   data.data 不存在     → format=0（占位）
         */
        case "api":
          var apiFmt;
          if (info.data === undefined || info.data === null) {
            apiFmt = 0;
          } else if (typeof info.data === "string") {
            apiFmt = 1;
          } else {
            apiFmt = 2;
          }
          handleUnisoundApi(info, apiFmt);
          break;

        /* Unisound设备信息（原版：update_unisound_info(e)） */
        case "get_info":
          handleUnisoundGetInfo(info);
          break;

        /* 备忘录（原版：memo_info(e)） */
        case "get_memo":
        case "add_memo":
        case "update_memo":
        case "del_memo":
        case "delall_memo":
        case "clear_memo":
          emit("memo_info", info);
          break;

        /* 二维码 */
        case "get_qrcode":
          R1_DEBUG && console.log("[R1WS] 收到get_qrcode事件");
          emit("qrcode", info.data);
          break;

        /* 二维码状态 */
        case "qrcode_state":
          R1_DEBUG &&
            console.log(
              "[R1WS] 收到qrcode_state事件, info.data keys=" +
                (info.data ? Object.keys(info.data).join(",") : "null"),
            );
          emit("qrcode_state", info.data);
          break;

        /* 登录 */
        case "login":
          R1_DEBUG &&
            console.log("[R1WS] 收到login事件, info=" + JSON.stringify(info).substring(0, 500));
          emit("unisound_login", info);
          break;

        /* 登录状态 */
        case "login_state":
          R1_DEBUG &&
            console.log(
              "[R1WS] 收到login_state事件, info=" + JSON.stringify(info).substring(0, 500),
            );
          emit("unisound_login_state", info);
          break;

        /* 网易云登录 */
        case "login_netease_music":
          emit("netease_login", info);
          break;

        /* 酷我登录 */
        case "login_kuwo_music":
          emit("kuwo_login", info);
          break;

        /* 小爱ID */
        case "get_xiaoai_id":
          emit("xiaoai_id", info);
          break;

        /* 收藏/取消收藏 */
        case "collect":
        case "cancel_collect":
          emit("collect_result", info);
          break;

        /* 歌单列表（原版：get_song_list(i) → create_song_list_window） */
        case "get_song_list":
          R1_DEBUG &&
            console.log(
              "[R1WS] 收到歌单响应 code=" +
                info.code +
                " data keys=" +
                (info.data ? Object.keys(info.data).join(",") : "null"),
            );
          if (info.code === 200 || info.code === "200") {
            if (songListCache) {
              songListCache.data = info;
            }
          }
          emit("song_list", info);
          break;

        /* 唤醒基准 */
        case "Main_Wakeup_Benchmark":
        case "User_Wakeup_Benchmark":
          emit("wakeup_benchmark", info);
          break;

        /* 小爱开关 */
        case "is_xiaoai":
          emit("xiaoai_state", info);
          break;

        /* ASR最大时长 */
        case "asrMaxDuration":
          emit("asr_max_duration", info);
          break;

        /* 语音报时 */
        case "Voice_time_reporting":
          emit("voice_time_reporting", info);
          break;

        /* 退出登录 */
        case "exit_login":
          emit("exit_login", info);
          break;

        /* 提交播放记录 */
        case "Submit_Play_Record":
          break;

        /* 小爱开关 */
        case "is_xiaoai":
          emit("xiaoai_state", info);
          break;

        /* 本地音乐（直挂Unisound根级别） */
        case "play_local_music":
          emit("local_music_play", info);
          break;
        case "scan_local_music":
          emit("local_music_scan", info);
          break;
        case "get_local_music":
          emit("local_music_list", info);
          break;

        default:
          R1_DEBUG && console.log("[R1WS] 未处理的Unisound子类型:", innerType);
          break;
      }
    } catch (e) {
      console.error("[R1WS] Unisound解析错误:", e);
    }
  }

  /* ===== 处理Unisound API响应（完整移植原版api函数逻辑） =====
   * 原版api(e, t):
   *   t=1: i = JSON.parse(e.data).nameValuePairs  (data是JSON字符串)
   *   t=2: i = e.data                              (data是对象)
   *   i.type === 'info' → 更新device_info_data.api_info → load_device_info()
   */
  function handleUnisoundApi(e, format) {
    try {
      /* 原版：1 != e.login_state → 显示错误信息，else块不执行
       * 但get_song_list等响应可能没有login_state字段
       * 原版api()中: if(1 != e.login_state) { 显示错误 } else { 处理逻辑 }
       * 即login_state必须为1才处理，undefined也会跳过
       *
       * 兼容扩展：login_state = 0/-1/'0'/'-1' 都视为未登录
       * 这是部分设备的私有协议（不再用 0 而用 -1 表示未登录） */
      var ls = e.login_state;
      var isLoginFail = ls !== undefined && ls !== 1 && ls !== "1";
      if (isLoginFail) {
        console.warn("[R1WS] API登录状态异常:", e.login_msg, "(" + ls + ")");
        emit("api_error", { msg: e.login_msg, state: ls });
        /* 不return：原版api()会丢掉整个响应，但这里我们依然尝试解析e.data，
         * 因为部分接口（如get_song_list）即使未登录也可能返回部分信息 */
      }
      /* 如果login_state不存在(undefined)，原版1!=undefined为true也会跳过
       * 但实际测试中get_song_list响应应该有login_state:1
       * 如果没有login_state字段，仍然尝试处理data */

      /* 解析data部分 */
      var parsed;
      if (format === 1 && typeof e.data === "string") {
        /* 原版：JSON.parse(e.data).nameValuePairs */
        var parsedData = JSON.parse(e.data);
        parsed = parsedData.nameValuePairs || parsedData;
      } else {
        /* 原版：i = e.data */
        parsed = e.data;
      }
      if (!parsed) {
        console.warn("[R1WS] API响应data为空");
        return;
      }

      var innerType = parsed.type;
      R1_DEBUG && console.log("[R1WS] API子类型:", innerType, "parsed keys:", Object.keys(parsed));

      switch (innerType) {
        /* 登录/授权信息（原版：device_info_data.api_info = i → load_device_info()） */
        case "info":
          handleApiInfo(parsed);
          break;

        /* 网易云登录 */
        case "login_netease_music":
          emit("netease_login", parsed);
          break;

        /* 酷我登录 */
        case "login_kuwo_music":
          emit("kuwo_login", parsed);
          break;

        /* 小爱ID */
        case "get_xiaoai_id":
          emit("xiaoai_id", parsed);
          break;

        /* 收藏 */
        case "collect":
        case "cancel_collect":
          emit("collect_result", parsed);
          break;

        /* 歌单（API响应格式） */
        case "get_song_list":
          R1_DEBUG &&
            console.log(
              "[R1WS] [api响应] 收到歌单 parsed.code=" +
                parsed.code +
                " data keys=" +
                (parsed.data ? Object.keys(parsed.data).join(",") : "null") +
                " dataType=" +
                typeof parsed.data,
            );
          if (parsed.code === 200 || parsed.code === "200") {
            if (songListCache) {
              songListCache.data = parsed;
            }
            /* 提取歌单数据：parsed.data = {title, data: [...]} */
            var groups = (parsed.data && parsed.data.data) || [];
            R1_DEBUG &&
              console.log(
                "[R1WS] [api响应] 歌单分组数=" +
                  (Array.isArray(groups) ? groups.length : "N/A") +
                  ", 首组title=" +
                  (groups[0] && groups[0].title ? groups[0].title : "N/A"),
              );
          }
          emit("song_list", parsed);
          break;

        /* 二维码（原版：update_qrcode_data(e)） */
        case "get_qrcode":
          emit("qrcode", parsed);
          break;

        /* 二维码状态（原版：update_qrstate(e)） */
        case "qrcode_state":
          emit("qrcode_state", parsed);
          break;

        /* 登录（原版：login(e) 处理登录结果） */
        case "login":
          /* 把外层code合并到parsed中，确保login_result事件包含完整信息 */
          if (parsed && info.code !== undefined && parsed.code === undefined) {
            parsed.code = info.code;
          }
          emit("login_result", parsed);
          break;

        /* 本地音乐相关 */
        case "play_local_music":
          emit("local_music_play", parsed);
          break;
        case "scan_local_music":
          emit("local_music_scan", parsed);
          break;
        case "get_local_music":
          emit("local_music_list", parsed);
          break;

        default:
          R1_DEBUG && console.log("[R1WS] 未处理的API子类型:", innerType);
          break;
      }
    } catch (err) {
      console.error("[R1WS] API解析错误:", err);
    }
  }

  /* ===== 处理Unisound get_info（移植原版update_unisound_info） ===== */
  function handleUnisoundGetInfo(e) {
    try {
      if (e.code !== 1) return;
      var data = e.data;
      if (!data) return;

      /* 更新休眠/唤醒状态 */
      if (data.isIdle !== undefined) {
        deviceInfo.isIdle = data.isIdle;
      }
      if (data.DeviceStatus !== undefined) {
        deviceInfo.DeviceStatus = data.DeviceStatus;
      }

      emit("unisound_device_info", data);
      emit("device_info", deviceInfo);
    } catch (err) {
      console.error("[R1WS] Unisound get_info解析错误:", err);
    }
  }

  /* ===== 处理API信息（登录信息+授权信息+设备信息） ===== */
  function handleApiInfo(apiData) {
    try {
      R1_DEBUG &&
        console.log("[R1WS] handleApiInfo 收到数据:", JSON.stringify(apiData).substring(0, 500));

      var info = apiData;
      /* 兼容nameValuePairs格式（原版load_device_info逻辑） */
      if (info.code !== undefined && info.code !== 200) {
        console.warn("[R1WS] API信息返回错误:", info.msg, "(" + info.code + ")");
        return;
      }

      if (info.data) {
        var dataObj = info.data.nameValuePairs || info.data;
        if (dataObj) {
          var devicePart = dataObj.device_info;
          var userPart = dataObj.user_info;

          /* 兼容嵌套的nameValuePairs（原版：n.device_info.nameValuePairs ? n.device_info.nameValuePairs : n.device_info） */
          if (devicePart && devicePart.nameValuePairs) devicePart = devicePart.nameValuePairs;
          if (userPart && userPart.nameValuePairs) userPart = userPart.nameValuePairs;

          R1_DEBUG &&
            console.log(
              "[R1WS] devicePart:",
              devicePart ? JSON.stringify(devicePart).substring(0, 300) : "null",
            );
          R1_DEBUG &&
            console.log(
              "[R1WS] userPart:",
              userPart ? JSON.stringify(userPart).substring(0, 300) : "null",
            );

          /* 更新授权/设备信息（原版：a = n.device_info） */
          if (devicePart) {
            apiInfo.ip = devicePart.ip;
            apiInfo.sn = devicePart.sn;
            apiInfo.mac = devicePart.mac;
            apiInfo.sq_type = devicePart.sq_type;
            apiInfo.sq_expire_time = devicePart.sq_expire_time;
            apiInfo.sq_expire_time_text = devicePart.sq_expire_time_text;
            apiInfo.device_sid = devicePart.device_sid;
            apiInfo.device_msid = devicePart.device_msid;
          }

          /* 更新登录信息（原版：s = n.user_info） */
          if (userPart) {
            apiInfo.nick = userPart.nick;
            apiInfo.userid = userPart.userid;
            apiInfo.qqmusic_login_state = userPart.qqmusic_login_state;
            apiInfo.netease_uid = userPart.netease_uid;
            apiInfo.netease_login_state = userPart.netease_login_state;
            apiInfo.netease_login_info = userPart.netease_login_info;
            apiInfo.kuwo_uid = userPart.kuwo_uid;
            apiInfo.kuwo_login_state = userPart.kuwo_login_state;
            apiInfo.login_time = userPart.login_time;
          }

          R1_DEBUG && console.log("[R1WS] api_info已更新, 触发api_info事件");
          emit("api_info", apiInfo);
          emit("device_info", deviceInfo);

          /* 移植原版：api()中也调用update_device_list */
          if (hostname) {
            try {
              var devEntry = {
                hostname: hostname,
                ip:
                  apiInfo.ip ||
                  localIp ||
                  (connectIp ? R1Config.parseDeviceAddress(connectIp).host : ""),
                dev_name: deviceInfo.device_name || deviceInfo.dev_name || "",
                url:
                  location.href.indexOf("?") > -1
                    ? location.href.split("?")[0]
                    : location.href.split("#")[0],
                device_sid: apiInfo.device_sid || "",
                device_msid: apiInfo.device_msid || "",
              };
              var list = [];
              var saved = localStorage.getItem("device_list");
              if (saved) {
                try {
                  list = JSON.parse(saved);
                } catch (e) {
                  list = [];
                }
              }
              var found = false;
              for (var i = 0; i < list.length; i++) {
                if (list[i].hostname === devEntry.hostname) {
                  for (var k in devEntry) {
                    if (devEntry[k] && devEntry[k] !== list[i][k]) list[i][k] = devEntry[k];
                  }
                  found = true;
                  break;
                }
              }
              if (!found) list.push(devEntry);
              localStorage.setItem("device_list", JSON.stringify(list));
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error("[R1WS] API信息解析错误:", e);
    }
  }

  /* ===== 处理批量消息 ===== */
  function handleSends(data) {
    if (data.code === 200 && Array.isArray(data.data)) {
      /* device_info批量返回 */
      if (data.type_id === "device_info") {
        handleDeviceInfoBatch(data);
      } else {
        /* 其他批量消息逐个处理 */
        data.data.forEach(function (item) {
          handleMessage(JSON.stringify(item));
        });
      }
    }
  }

  /* ===== 处理设备信息批量返回 ===== */
  function handleDeviceInfoBatch(data) {
    if (data.code !== 200 || !Array.isArray(data.data)) return;

    var items = data.data;
    var deviceInfoItem = null;
    var cpuTempItem = null;
    var dateItem = null;

    for (var i = 0; i < items.length; i++) {
      if (items[i].type_id === "get_device_info") deviceInfoItem = items[i];
      else if (items[i].type_id === "cpu_temp") cpuTempItem = items[i];
      else if (items[i].type_id === "date") dateItem = items[i];
    }

    if (deviceInfoItem) handleGetDeviceInfo(deviceInfoItem);
    if (cpuTempItem && cpuTempItem.data) {
      var tempLines = cpuTempItem.data.split("\r\n");
      if (tempLines.length > 1) deviceInfo.cpu_temp = Math.round(parseInt(tempLines[1]) || 0);
    }
    if (dateItem && dateItem.data) {
      var dateLines = dateItem.data.split("\r\n");
      if (dateLines.length > 1) deviceInfo.device_time = dateLines[1];
    }

    emit("device_info", deviceInfo);
  }

  /* ===== 处理get_device_info（系统详细信息） ===== */
  function handleGetDeviceInfo(data) {
    try {
      var d = data.data;
      if (!d) return;

      /* 兼容nameValuePairs格式 */
      if (d.nameValuePairs) d = d.nameValuePairs;

      /* 提取内存信息 */
      if (d.meminfo) {
        var memLines = d.meminfo.split("\r\n");
        var memTotal = -1,
          memFree = -1,
          memCached = -1;
        for (var i = 0; i < memLines.length; i++) {
          var parts = memLines[i].split(":");
          if (parts[0] === "MemTotal") memTotal = parseInt(parts[1]);
          else if (parts[0] === "MemFree") memFree = parseInt(parts[1]);
          else if (parts[0] === "Cached") memCached = parseInt(parts[1]);
          if (memTotal !== -1 && memFree !== -1 && memCached !== -1) break;
        }
        if (memTotal !== -1) {
          deviceInfo.mem_total = Math.round(memTotal / 1024) + "MB";
          deviceInfo.mem_available = Math.round((memFree + memCached) / 1024) + "MB";
          deviceInfo.mem_total_raw = memTotal;
          deviceInfo.mem_free_raw = memFree;
          deviceInfo.mem_cached_raw = memCached;
        }
      }

      /* 提取CPU信息 */
      if (d.cpuinfo && Array.isArray(d.cpuinfo)) {
        var cpuUsage = d.cpuinfo[3] ? parseInt(d.cpuinfo[3]) : 0;
        deviceInfo.cpu_usage = cpuUsage;
      }

      /* CPU在线核心 */
      if (d.cpu) {
        var cpuLines = d.cpu.split("\r\n");
        for (var j = 0; j < cpuLines.length; j++) {
          var cpuParts = cpuLines[j].split(":");
          if (cpuParts[0] === "online") {
            deviceInfo.cpu_online = cpuParts[1];
            break;
          }
        }
      }

      /* 最大CPU频率 */
      var maxFreq = 0;
      var procCount = d.availableProcessors || 0;
      for (var k = 0; k < procCount; k++) {
        var cpuData = d["cpu" + k];
        if (cpuData) {
          var freqLines = cpuData.split("\r\n");
          for (var m = 0; m < freqLines.length; m++) {
            var freqParts = freqLines[m].split(":");
            if (freqParts[0] === "scaling_cur_freq") {
              var freq = parseInt(freqParts[1]);
              if (freq > maxFreq) maxFreq = freq;
            }
          }
        }
      }
      if (maxFreq > 0) deviceInfo.cpu_max_freq = (maxFreq / 1e6).toFixed(2);

      /* 运行时间 */
      if (d.elapsedRealtime != null) {
        deviceInfo.uptime = formatUptime(d.elapsedRealtime);
        deviceInfo.uptime_raw = d.elapsedRealtime;
      }

      /* 固件版本 */
      if (d.incremental) deviceInfo.firmware_ver = d.incremental;

      /* 设备名称 */
      if (deviceInfo.device_name) {
        /* 名称与主机名相同（或已包含主机名）时不重复拼接，否则出现 xxx(xxx) */
        deviceInfo.dev_name =
          hostname && deviceInfo.device_name.indexOf(hostname) < 0
            ? deviceInfo.device_name + "(" + hostname + ")"
            : deviceInfo.device_name;
      } else if (hostname) {
        deviceInfo.dev_name = hostname;
      }

      /* 播放器信息 */
      var playerType = deviceInfo.Current_PlayerType || 0;
      if (playerType === 1) deviceInfo.current_player = "MediaPlayer";
      else if (playerType === 2) {
        deviceInfo.current_player = "ExoPlayer";
        if (deviceInfo.ExoPlayer_Version) {
          deviceInfo.current_player += " " + deviceInfo.ExoPlayer_Version;
        }
      }

      /* 更新时间 */
      deviceInfo.update_time = formatTimestamp(Math.round(Date.now() / 1000));

      emit("device_info", deviceInfo);
    } catch (e) {
      console.error("[R1WS] get_device_info解析错误:", e);
    }
  }

  /* ===== 处理Shell查询结果（旧版固件） ===== */
  function handleShellQuery(data) {
    try {
      if (!data.data) return;
      var lines = data.data.split("\r\n");
      var memTotal = -1,
        memFree = -1,
        memCached = -1;
      var lineIdx = 0;

      /* 解析内存信息 */
      for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].split(":");
        if (parts[0] === "MemTotal") memTotal = parseInt(parts[1]);
        else if (parts[0] === "MemFree") memFree = parseInt(parts[1]);
        else if (parts[0] === "Cached") memCached = parseInt(parts[1]);
        if (memTotal !== -1 && memFree !== -1 && memCached !== -1) {
          lineIdx = i + 1;
          break;
        }
      }

      if (memTotal !== -1) {
        deviceInfo.mem_total = Math.round(memTotal / 1024) + "MB";
        deviceInfo.mem_available = Math.round((memFree + memCached) / 1024) + "MB";
      }

      /* 解析CPU和启动时间 */
      var btime = null;
      for (var j = lineIdx; j < lines.length; j++) {
        if (lines[j].substring(0, 6) === "btime ") {
          btime = parseInt(lines[j].substring(6));
        } else if (lines[j].split(":")[0] === "incremental") {
          deviceInfo.firmware_ver = lines[j].split(":")[1];
        } else if (lines[j].split(":")[0] === "date") {
          deviceInfo.device_time = lines[j].split(":").slice(1).join(":");
        }
      }

      if (btime) {
        deviceInfo.uptime = formatUptime(Date.now() - btime * 1000);
      }

      if (hostname) deviceInfo.dev_name = hostname;
      deviceInfo.ip = localIp || connectIp;
      deviceInfo.update_time = formatTimestamp(Math.round(Date.now() / 1000));

      emit("device_info", deviceInfo);
    } catch (e) {
      console.error("[R1WS] shell查询解析错误:", e);
    }
  }

  /* ===== 处理主机名 ===== */
  function handleHostname(data) {
    try {
      if (!data.data) return;
      var lines = data.data.split("\r\n");
      if (lines.length > 1) {
        hostname = lines[1];
        deviceInfo.hostname = hostname;

        /* 提取IP */
        lines.forEach(function (line) {
          if (line.indexOf("wlan0") > -1) {
            var parts = line.split(" ");
            var ipRegex = /(\d{1,3}\.){3}\d{1,3}/;
            parts.forEach(function (part) {
              if (ipRegex.test(part)) {
                localIp = part.split("/")[0];
                deviceInfo.ip = localIp;
              }
            });
          }
        });

        /* 移植原版update_device_list逻辑：保存设备信息到localStorage */
        if (hostname) {
          try {
            var devEntry = {
              hostname: hostname,
              ip: deviceInfo.ip || (connectIp ? R1Config.parseDeviceAddress(connectIp).host : ""),
              dev_name: deviceInfo.device_name || deviceInfo.dev_name || "",
              url:
                location.href.indexOf("?") > -1
                  ? location.href.split("?")[0]
                  : location.href.split("#")[0],
            };
            var list = [];
            var saved = localStorage.getItem("device_list");
            if (saved) {
              try {
                list = JSON.parse(saved);
              } catch (e) {
                list = [];
              }
            }
            /* 更新或添加 */
            var found = false;
            for (var i = 0; i < list.length; i++) {
              if (list[i].hostname === devEntry.hostname) {
                for (var k in devEntry) {
                  if (devEntry[k] && devEntry[k] !== list[i][k]) list[i][k] = devEntry[k];
                }
                found = true;
                break;
              }
            }
            if (!found) list.push(devEntry);
            localStorage.setItem("device_list", JSON.stringify(list));
          } catch (e) {}
        }

        emit("device_info", deviceInfo);
      }
    } catch (e) {}
  }

  /* ========== 时间格式化工具 ========== */
  function formatTimestamp(ts) {
    var d = new Date(ts * 1000);
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    var h = ("0" + d.getHours()).slice(-2);
    var min = ("0" + d.getMinutes()).slice(-2);
    var sec = ("0" + d.getSeconds()).slice(-2);
    return y + "-" + m + "-" + day + " " + h + ":" + min + ":" + sec;
  }

  function formatUptime(ms) {
    var days = Math.floor(ms / 86400000);
    var hours = Math.floor((ms % 86400000) / 3600000);
    var mins = Math.floor((ms % 3600000) / 60000);
    var secs = Math.floor((ms % 60000) / 1000);
    var parts = [];
    if (days) parts.push(days + " 天");
    if (hours || days) parts.push(hours + " 小时");
    if (mins || hours || days) parts.push(mins + " 分钟");
    if (secs || mins || hours || days) parts.push(secs + " 秒");
    return parts.join(" ") || "0 秒";
  }

  /* ========== 业务接口 ========== */

  /* 通用发送（兼容原版send_message格式） */
  function sendMessage(params, callback) {
    if (!connected || !ws) {
      emit("error", { message: "未连接到设备" });
      return false;
    }
    var msg = {
      type: "send_message",
      what: params.what,
      arg1: params.arg1 || 0,
      arg2: params.arg2 || 0,
      obj: params.obj || "",
    };
    if (callback) {
      var id = generateId();
      msg.type_id = id;
      pendingRequests[id] = {
        callback: callback,
        timer: setTimeout(function () {
          delete pendingRequests[id];
          callback({ error: "请求超时" });
        }, REQUEST_TIMEOUT),
      };
    }
    return wsSend(msg);
  }

  /* 音乐控制（完整移植原版send_music_cmd逻辑） */
  function musicPlay(song) {
    /* 原版：点播音乐用 send_message what:65536 arg2:1 obj:"web_播放xxx" */
    return sendMessage({
      what: 65536,
      arg1: 0,
      arg2: 1,
      obj: song ? "web_播放" + song : "web_播放",
    });
  }
  function musicPrev() {
    /* 原版：send(null, null, "prev", {}) → ws_send({type:"prev"}) */
    return wsSend({ type: "prev" });
  }
  function musicNext() {
    /* 原版：send(null, null, "next", {}) → ws_send({type:"next"}) */
    return wsSend({ type: "next" });
  }
  function musicPause() {
    /* 原版：send(null, null, "send_message", {what:4, arg1:2, arg2:-1, obj:true}) */
    return sendMessage({ what: 4, arg1: 2, arg2: -1, obj: true });
  }
  function musicResume() {
    /* 原版：send(null, null, "send_message", {what:4, arg1:3, arg2:-1, obj:true}) */
    return sendMessage({ what: 4, arg1: 3, arg2: -1, obj: true });
  }
  function musicControl(action) {
    /* 兼容旧接口，内部路由到正确函数 */
    switch (action) {
      case "prev":
        return musicPrev();
      case "next":
        return musicNext();
      case "pause":
        return musicPause();
      case "play":
        return musicResume();
      default:
        return musicResume();
    }
  }
  function seekTo(positionSeconds) {
    /* 原版：send(null, null, "set_position", {position: e}) + send_message {what:4, arg1:3, arg2:-1, obj:true}
     * position单位为毫秒，前端进度条为秒，需要转换 */
    var positionMs = Math.round(positionSeconds * 1000);
    wsSend({ type: "set_position", position: positionMs });
    return sendMessage({ what: 4, arg1: 3, arg2: -1, obj: true });
  }
  function setVolume(volume) {
    /* 原版：ws_send({type:"set_vol", vol: value}) */
    return wsSend({ type: "set_vol", vol: volume });
  }
  function requestMusicList() {
    /* 原版：ws_send('{"type":"list"}') */
    return wsSend({ type: "list" });
  }
  function playByIndex(index) {
    /* 原版：send(null, null, "play", {index: index}) → ws_send({type:"play", index: index}) */
    return wsSend({ type: "play", index: index });
  }
  /* 请求歌单列表（移植原版"我的歌单"按钮逻辑）
   * 原版：ws_send({type:"send_to_unisound", data:{type:"api", data:{type:"get_song_list", music_source: info.music_source}}})
   * 关键：music_source 必须是字符串 'qq' / 'netease' / 'kuwo'，传数字 1/2/3 设备不认识，
   * 会返回「暂不支持该网站！」。
   * 原版 select 的 value 就是字符串（['QQ音乐','qq']、['网易云音乐','netease']、['酷我音乐','kuwo']）。
   */
  var songListCache = null; /* 歌单缓存，10分钟有效 */
  /* 数字→字符串 映射：1=qq 2=netease 3=kuwo
   * 设备接口只认字符串 'qq'/'netease'/'kuwo'，传数字 1/2/3 会被设备拒绝。
   * 此处统一在发送前转成字符串。 */
  var MUSIC_SOURCE_STR = { 1: "qq", 2: "netease", 3: "kuwo" };
  function musicSourceToStr(src) {
    if (src === undefined || src === null) return "netease";
    if (typeof src === "string") return src;
    return MUSIC_SOURCE_STR[src] || "netease";
  }
  function requestSongList(musicSource, force) {
    var source = musicSource || (musicInfo && musicInfo.music_source) || 2; /* 默认网易云 */
    var sourceStr = musicSourceToStr(source);
    R1_DEBUG &&
      console.log(
        "[R1WS] requestSongList musicSource=" +
          musicSource +
          " → source=" +
          source +
          " → str=" +
          sourceStr +
          " (musicInfo.music_source=" +
          (musicInfo && musicInfo.music_source) +
          ", force=" +
          !!force +
          ")",
      );
    /* 强制刷新或音乐源变更 → 忽略缓存（用字符串作为缓存键） */
    if (force || (songListCache && songListCache.music_source !== sourceStr)) {
      R1_DEBUG && console.log("[R1WS] requestSongList 清理缓存（源变更或强制刷新）");
      songListCache = null;
    }
    /* 检查缓存：只有真正拿到过数据（data 非空）才允许命中。
     * 若上次请求响应迟到/失败，缓存里是 data:null 的半成品，
     * 直接命中会把 null emit 出去且不再发请求 —— 表现为"重新加载永远加载不出歌单"。 */
    if (
      songListCache &&
      Date.now() - songListCache.time < 600000 &&
      songListCache.music_source === sourceStr
    ) {
      if (songListCache.data) {
        R1_DEBUG && console.log("[R1WS] requestSongList 命中缓存，直接 emit");
        emit("song_list", songListCache.data);
        return;
      }
      R1_DEBUG &&
        console.log("[R1WS] requestSongList 缓存为空数据（上次响应缺失），作废并重新请求");
      songListCache = null;
    }
    songListCache = { music_source: sourceStr, time: Date.now(), data: null };
    var req = {
      type: "send_to_unisound",
      data: {
        type: "api",
        data: {
          type: "get_song_list",
          music_source: sourceStr /* 关键：必须是 'qq'/'netease'/'kuwo' */,
        },
      },
    };
    R1_DEBUG && console.log("[R1WS] requestSongList 发送请求:", JSON.stringify(req));
    wsSend(req);
  }
  function playSongList(url) {
    /* 原版：ws_send({type:"send_message", what:65536, arg1:0, arg2:9, obj: url}) */
    return sendMessage({ what: 65536, arg1: 0, arg2: 9, obj: url });
  }
  function playPersonalRadio() {
    return sendMessage({ what: 65536, arg1: 0, arg2: 1, obj: "web_播放个性电台" });
  }
  function playCollection() {
    return sendMessage({ what: 65536, arg1: 0, arg2: 8 });
  }
  /* 收藏歌曲（原版：ws_send({type:'send_to_unisound', data:{type:'api', data:{type:'collect', music_info:music_info}}})） */
  function collectSong(musicInfoObj) {
    return wsSend({
      type: "send_to_unisound",
      data: { type: "api", data: { type: "collect", music_info: musicInfoObj || musicInfo } },
    });
  }
  /* 取消收藏歌曲（原版：ws_send({type:'send_to_unisound', data:{type:'api', data:{type:'cancel_collect', music_info:music_info}}})） */
  function cancelCollectSong(musicInfoObj) {
    return wsSend({
      type: "send_to_unisound",
      data: {
        type: "api",
        data: { type: "cancel_collect", music_info: musicInfoObj || musicInfo },
      },
    });
  }

  /* 获取音乐详细信息（封面+歌词，移植原版update_music_info逻辑）
   * 原版通过POST请求 r1.wxfsq.com/music 获取封面和歌词
   * 请求参数：{ info: musicId, music_info: JSON.stringify(musicInfo) }
   * 返回：{ code:1, data: { pic:封面URL, lrc:歌词LRC格式, id:音乐ID, ... } }
   */
  function fetchMusicInfo(musicId, mi) {
    if (!musicId) return;
    var postData = { info: musicId, music_info: JSON.stringify(mi || musicInfo) };
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", R1Config.musicApiUrl, true);
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        try {
          /* 兼容JSONP和JSON响应 */
          var text = xhr.responseText;
          var jsonMatch = text.match(/\((\{[\s\S]*\})\)/);
          var data = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(text);
          if (data && data.code === 1 && data.data) {
            var apiData = data.data;
            /* 更新封面 */
            if (apiData.pic) {
              musicInfo.cover = apiData.pic;
              emit("music_info", musicInfo);
            }
            /* 解析LRC歌词 */
            var lyrics = parseLrc(apiData.lrc);
            if (lyrics.length > 0) {
              emit("lrc", { lyrics: lyrics, musicId: musicId });
            }
          }
        } catch (e) {
          console.error("[R1WS] fetchMusicInfo解析错误:", e);
        }
      };
      /* 构建form data */
      var params = [];
      for (var key in postData) {
        params.push(encodeURIComponent(key) + "=" + encodeURIComponent(postData[key]));
      }
      xhr.send(params.join("&"));
    } catch (e) {
      console.error("[R1WS] fetchMusicInfo请求错误:", e);
    }
  }

  /* 解析LRC歌词格式（移植原版update_music_info中的歌词解析逻辑）
   * LRC格式：[mm:ss.xx]歌词内容
   * 返回：[{ time: 毫秒, text: 歌词文本 }, ...]
   */
  function parseLrc(lrcText) {
    if (!lrcText) return [{ time: 0, text: "暂无歌词" }];
    try {
      /* 原版：i.replace(/\[/g, "\r\n[").replace(/\r\n\r\n/g, "\r\n") */
      var formatted = lrcText.replace(/\[/g, "\r\n[").replace(/\r\n\r\n/g, "\r\n");
      var lines = formatted.match(/(\[\d{1,3}:\d{1,2}.\d{1,3}\])(.*)/g);
      if (!lines || !lines.length) return [];

      var result = [];
      for (var i = 0; i < lines.length; i++) {
        var timeMatches = lines[i].match(/(\[\d{1,3}:\d{1,2}.\d{1,3}\])/g);
        if (!timeMatches) continue;
        var lastTime = timeMatches[timeMatches.length - 1];
        var text = lines[i].substring(lines[i].indexOf(lastTime) + lastTime.length).trim();
        for (var j = 0; j < timeMatches.length; j++) {
          var timeStr = timeMatches[j];
          var ms = lrcTimeToMs(timeStr.substring(1, timeStr.length - 1));
          if (!isNaN(ms) && text) {
            /* 过滤空行：原版保留所有时间戳行，UI 层用 text || line 渲染时
             * 若 text 为空字符串会回退到整个对象，导致 React 错误 #31。
             * 此处主动跳过 text 为空的行（空歌词行无意义）。 */
            result.push({ time: ms, text: text });
          }
        }
      }
      /* 按时间排序 */
      result.sort(function (a, b) {
        return a.time - b.time;
      });
      return result;
    } catch (e) {
      console.error("[R1WS] LRC解析错误:", e);
      return [{ time: 0, text: "暂无歌词" }];
    }
  }

  /* LRC时间转毫秒 [mm:ss.xx] → 毫秒数 */
  function lrcTimeToMs(timeStr) {
    var parts = timeStr.split(":");
    var min = parseInt(parts[0]) || 0;
    var secParts = parts[1] ? parts[1].split(".") : [0, 0];
    var sec = parseInt(secParts[0]) || 0;
    var ms = parseInt(secParts[1]) || 0;
    /* 补齐毫秒位数（2位→3位） */
    if (secParts[1] && secParts[1].length === 2) ms = ms * 10;
    return min * 60000 + sec * 1000 + ms;
  }

  /* 屏幕控制 */
  function setAtmosphereLight(enable) {
    return sendMessage({ what: 4, arg1: 64, arg2: enable ? 1 : 0 });
  }
  function setLightBrightness(brightness) {
    return sendMessage({ what: 4, arg1: 65, arg2: brightness });
  }
  function setLightMode(mode) {
    return sendMessage({ what: 4, arg1: 68, arg2: mode });
  }
  function setLightColorSpeed(speed) {
    return sendMessage({ what: 4, arg1: 66, arg2: speed });
  }
  function setLightColor(color) {
    return sendMessage({ what: 4, arg1: 70, arg2: color });
  }

  /* 蓝牙控制（原版BT_协议） */
  function setBluetoothEnable(enable) {
    return wsSend({ type: enable ? "BT_enable" : "BT_disable" });
  }
  function scanBluetooth() {
    return wsSend({ type: "BT_StartScan" });
  }
  function requestBluetoothDevices() {
    return wsSend({ type: "BT_Device" });
  }
  function setBluetoothScanMode(mode) {
    return wsSend({ type: "BT_setScanMode", mode: mode });
  }
  function pairBluetooth(mac) {
    return wsSend({ type: "BT_createBond", mac: mac });
  }
  function removeBond(mac) {
    return wsSend({ type: "BT_removeBond", mac: mac });
  }
  function connectA2dp(mac) {
    return wsSend({ type: "BT_Connect_A2dp_Device", mac: mac });
  }
  function connectA2dpSink(mac) {
    return wsSend({ type: "BT_Connect_A2dpSink_Device", mac: mac });
  }
  function disconnectA2dp(mac) {
    return wsSend({ type: "BT_Disconnect_A2dp_Device", mac: mac });
  }
  function disconnectA2dpSink(mac) {
    return wsSend({ type: "BT_Disconnect_A2dpSink_Device", mac: mac });
  }

  /* 音效控制 */
  function setAsrMaxDuration(duration) {
    return sendMessage({
      what: 65536,
      arg1: 0,
      arg2: 10,
      obj: JSON.stringify({ type: "set_asr_max_duration", duration: duration }),
    });
  }
  function setBluetoothPromptTone(enable) {
    return sendMessage({
      what: 65536,
      arg1: 0,
      arg2: 10,
      obj: JSON.stringify({ type: "set_bluetooth_prompt_tone", enable: enable }),
    });
  }
  function tts(text) {
    return sendMessage({ what: 65536, obj: text });
  }

  /* 设备控制 */
  function rebootDevice() {
    return sendMessage({ what: 1, arg1: 1, arg2: -1 });
  }
  function rebootEcho() {
    return sendMessage({ what: 1, arg1: 2, arg2: -1 });
  }
  function rebootAdbd() {
    return sendMessage({ what: 1, arg1: 3, arg2: -1 });
  }
  function wakeupDevice() {
    return sendMessage({ what: 256, arg1: 1, arg2: -1 });
  }
  function setDevName(name) {
    return sendMessage({ what: 2, arg1: 0, arg2: 0, obj: name });
  }

  function executeShell(cmd, type_id) {
    if (!connected || !ws) return false;
    return wsSend({ type: "shell", type_id: type_id || "shell_cmd", shell: cmd });
  }

  /* 服务设置（原版协议：直接发送type，带type_id） */
  function setServiceNormallyOpen(open) {
    return wsSend({
      type: "Set_Service_Normally_Open",
      open: open,
      type_id: "Set_Service_Normally_Open",
    });
  }
  function setDlnaOpen(open) {
    return wsSend({ type: "Set_DLNA_Open", open: open, type_id: "Set_DLNA_Open" });
  }
  function setAirplayOpen(open) {
    return wsSend({ type: "Set_AirPlay_Open", open: open, type_id: "Set_AirPlay_Open" });
  }

  /* 刷新服务状态（发送get_info获取最新的Service_Normally_Open/dlna_open/airplay_open）
   * 注意：不能用requestDeviceInfo()，因为它有5秒节流且不请求服务状态字段
   * 直接发送get_info，用时间戳作type_id绕过去重 */
  function requestServiceInfo() {
    return wsSend({ type: "get_info", type_id: "svc_" + Date.now() });
  }
  function setWakeupXiaoai(enable) {
    return sendMessage({
      what: 65536,
      arg1: 0,
      arg2: 10,
      obj: JSON.stringify({ type: "set_wakeup_xiaoai", enable: enable }),
    });
  }
  function setWakeupXiaoaiWord(word) {
    return sendMessage({
      what: 65536,
      arg1: 0,
      arg2: 10,
      obj: JSON.stringify({ type: "set_wakeup_xiaoai_word", word: word }),
    });
  }
  function setIotApi(api) {
    return sendMessage({
      what: 65536,
      arg1: 0,
      arg2: 10,
      obj: JSON.stringify({ type: "set_iot_api", iot_api: api }),
    });
  }
  function setWakeupBenchmark(value) {
    return sendMessage({
      what: 65536,
      arg1: 0,
      arg2: 10,
      obj: JSON.stringify({ type: "set_wakeup_benchmark", value: value }),
    });
  }
  function setDormancy(enable) {
    return sendMessage({
      what: 65536,
      arg1: 0,
      arg2: 10,
      obj: JSON.stringify({ type: "set_dormancy", enable: enable }),
    });
  }

  /* ========== 麦克风开关（移植原版 stop_wakeup / enter_wakeup） ========== */
  function stopWakeup() {
    return wsSend({ type: "send_to_unisound", data: { type: "stop_wakeup" } });
  }
  function enterWakeup() {
    return wsSend({ type: "send_to_unisound", data: { type: "enter_wakeup" } });
  }

  /* ========== 切换播放器（移植原版 switch_player） ========== */
  function switchPlayer(player) {
    return wsSend({ type: "switch_player", player: player });
  }

  /* ========== 登录/扫码登录（完整移植原版 login() / load_qrcode() / update_qrcode() / update_qrstate()） ========== */
  /**
   * 请求二维码（QQ音乐）
   * 原版：ws_send({type:"send_to_unisound", data:{type:"get_qrcode", login_param: login_param}})
   * 注意：原版的 get_qrcode 请求不带 music_source 字段，只带 login_param（QQ OAuth 参数）。
   * 设备根据 type="get_qrcode" 自动判断走 QQ 通道。
   * 此函数也支持 netease/kuwo（原版可能通过不同的 app 区分，但我们的实现走同一通道）。
   */
  function requestQRCode(musicSource) {
    /* 原版：ws_send({type:"send_to_unisound", data:{type:"get_qrcode", login_param: login_param}})
     * 不同平台用不同的 pt_3rd_aid：
     *   QQ音乐=100497308（默认），网易云=100495085，酷我(QQ登录)=100243533 */
    var pt3rdAidMap = { 1: 100497308, 2: 100495085, 3: 100243533 };
    var source = musicSource || musicInfo.music_source || 1;
    var loginParam = {
      aid: 716027609,
      daid: 383,
      pt_3rd_aid: pt3rdAidMap[source] || 100497308,
      u1: "https://graph.qq.com/oauth2.0/login_jump",
      referer: "https://graph.qq.com/oauth2.0/authorize",
    };
    return wsSend({
      type: "send_to_unisound",
      data: {
        type: "get_qrcode",
        login_param: loginParam,
      },
    });
  }

  /**
   * 轮询二维码状态
   * 原版：update_qrcode() 定时200ms执行一次，update_qrstate(e) 解析返回的状态码
   * 状态：0=未扫描 1=已扫描未确认 2=已确认登录 3=已过期
   * 返回：type:"Unisound" data.type="api" data.data.type="qrcode_state" data.data.data.state data.data.data.nick data.data.data.uid
   */
  function pollQRCodeState(musicSource, qrsig) {
    /* 原版：ws_send({type:"send_to_unisound", data:{type:"qrcode_state", qrsig: qrcode.qrsig, login_param: login_param}}) */
    var pt3rdAidMap = { 1: 100497308, 2: 100495085, 3: 100243533 };
    var source = musicSource || musicInfo.music_source || 1;
    var loginParam = {
      aid: 716027609,
      daid: 383,
      pt_3rd_aid: pt3rdAidMap[source] || 100497308,
      u1: "https://graph.qq.com/oauth2.0/login_jump",
      referer: "https://graph.qq.com/oauth2.0/authorize",
    };
    return wsSend({
      type: "send_to_unisound",
      data: {
        type: "qrcode_state",
        qrsig: qrsig,
        login_param: loginParam,
      },
    });
  }

  /**
   * 二维码登录成功后，将 qrcode_state 提交给设备完成登录
   * 原版：根据 login_app 发送不同类型
   *   qqmusic → type:'login', qrcode_state
   *   netease → type:'login_netease_music', qrcode_state
   *   kuwo_qq → type:'login_kuwo_music', qrcode_state
   */
  function loginByQRState(qrcodeState, musicSource) {
    var source = musicSource || musicInfo.music_source || 1;
    var typeMap = { 1: "login", 2: "login_netease_music", 3: "login_kuwo_music" };
    var loginType = typeMap[source] || "login";
    R1_DEBUG &&
      console.log(
        "[R1WS] loginByQRState: loginType=" +
          loginType +
          ", qrcodeState keys=" +
          (qrcodeState ? Object.keys(qrcodeState).join(",") : "null"),
      );
    return wsSend({
      type: "send_to_unisound",
      data: {
        type: loginType,
        qrcode_state: qrcodeState,
      },
    });
  }

  /**
   * QQ音乐登录（账户密码）
   * 原版：login(e) → ws_send({type:"send_to_unisound", data:{type:"login", data:e}})
   * e = { uin, cookies, login_type, music_source }
   */
  function loginByAccount(musicSource, account) {
    return wsSend({
      type: "send_to_unisound",
      data: {
        type: "login",
        data: Object.assign(
          {
            music_source: musicSourceToStr(musicSource || musicInfo.music_source || 2),
            login_type: "account",
          },
          account || {},
        ),
      },
    });
  }

  /**
   * 获取登录状态
   * 原版：login_state() → ws_send({type:"send_to_unisound", data:{type:"login_state"}})
   * 注意：原版不传 music_source，保持一致以避免兼容性问题 */
  function requestLoginState(musicSource) {
    var data = { type: "login_state" };
    /* 仅在明确传入 musicSource 时才加上，否则和原版一致不传 */
    if (musicSource !== undefined && musicSource !== null) {
      data.music_source = musicSourceToStr(musicSource);
    }
    return wsSend({
      type: "send_to_unisound",
      data: data,
    });
  }

  /**
   * 退出登录
   * 原版：ws_send({type:"send_to_unisound", data:{type:"api", data:{type:"login", music_source:..., obj:{type:"logout"}}}})
   */
  function logout(musicSource) {
    return wsSend({
      type: "send_to_unisound",
      data: {
        type: "api",
        data: {
          type: "login",
          music_source: musicSourceToStr(musicSource || musicInfo.music_source || 2),
          obj: { type: "logout" },
        },
      },
    });
  }

  /**
   * 退出登录（原版：ws_send({type:"send_to_unisound", data:{type:"exit_login"}})）
   * 退出当前已登录的账号，设备会返回 exit_login 响应
   */
  function exitLogin() {
    return wsSend({
      type: "send_to_unisound",
      data: { type: "exit_login" },
    });
  }

  /**
   * 切换音乐源
   * 原版：set_music_source(source) → send({type:"send_message", what:65536, arg1:0, arg2:4, obj:source})
   * source 为字符串：'qq' | 'netease' | 'kuwo'
   */
  function setMusicSource(source) {
    return sendMessage({ what: 65536, arg1: 0, arg2: 4, obj: source });
  }

  /**
   * 切换发音人（萱萱=SWEET 小雯=FEMALE 糖糖=CHILDREN 玲玲=LZL 小峰=MALE 天天=TIANTIAN）
   * 原版：update_TtsSpeaker(e) → send({type:"send_message", what:65536, arg1:0, arg2:2, obj:e})
   */
  function setTtsSpeaker(speaker) {
    return sendMessage({ what: 65536, arg1: 0, arg2: 2, obj: speaker });
  }

  /* ========== 均衡器（移植原版 update_sound_effects 逻辑） ========== */
  /**
   * 请求当前均衡器配置
   * 原版：ws_send('{"type":"get_eq_config"}')
   * 返回：type:"get_eq_config" data: {preset, band0..band9, gain, balance, bass, mid, treble, ...}
   */
  function requestEqConfig() {
    return wsSend({ type: "get_eq_config" });
  }

  /**
   * 设置均衡器
   * 原版：set_eq(e) → ws_send({type:"set_eq", data:JSON.stringify(e)})
   * e = {preset, band0, band1, ..., band9, gain, balance, bass, mid, treble}
   */
  function setEq(config) {
    return wsSend({ type: "set_eq", data: JSON.stringify(config) });
  }

  /* ========== 语音报时（移植原版 Voice_time_reporting 逻辑） ========== */
  /**
   * 设置语音报时（原版min_uver:1832支持）
   * 原版：send_message {what:65536, arg1:0, arg2:1, obj:"web_语音报时开/关"} (开关)
   *       send_message {what:65536, arg1:0, arg2:10, obj:JSON.stringify({type:"set_voice_time_reporting", ...})} (配置)
   * 配置项：enable(开关) hour(整点报时) half_hour(半点报时) time_12h(12小时制) start_time/end_time
   */
  function setVoiceTimeReporting(config) {
    return sendMessage({
      what: 65536,
      arg1: 0,
      arg2: 10,
      obj: JSON.stringify(Object.assign({ type: "set_voice_time_reporting" }, config)),
    });
  }

  /* ========== 自动重启（移植原版 Auto_restart_device 逻辑） ========== */
  /**
   * 设置自动重启（原版min_ver:1848支持）
   * 原版：send_message {what:65536, arg1:0, arg2:10, obj:JSON.stringify({type:"set_auto_restart", enable, time})}
   * time 格式："03:00" 每日3点自动重启
   */
  function setAutoRestart(enable, time) {
    return sendMessage({
      what: 65536,
      arg1: 0,
      arg2: 10,
      obj: JSON.stringify({ type: "set_auto_restart", enable: enable, time: time || "03:00" }),
    });
  }

  /* ========== 本地音乐（移植原版 play_local_music 逻辑） ========== */
  /**
   * 播放本地音乐
   * 原版：ws_send({type:"send_to_unisound", data:{type:"api", data:{type:"play_local_music", path:xxx}}})
   * 旧版（max_ver:1855）：play_local_music
   * 1856-1864：仅Current_PlayerType==1生效
   * 1865+：Current_PlayerType in [1,2] 生效
   */
  function playLocalMusic(path) {
    return wsSend({
      type: "send_to_unisound",
      data: {
        type: "api",
        data: { type: "play_local_music", path: path || "" },
      },
    });
  }

  /**
   * 扫描本地音乐
   * 原版：ws_send({type:"send_to_unisound", data:{type:"api", data:{type:"scan_local_music"}}})
   */
  function scanLocalMusic() {
    return wsSend({
      type: "send_to_unisound",
      data: {
        type: "api",
        data: { type: "scan_local_music" },
      },
    });
  }

  /**
   * 获取本地音乐列表
   * 原版：ws_send({type:"send_to_unisound", data:{type:"api", data:{type:"get_local_music"}}})
   */
  function requestLocalMusicList() {
    return wsSend({
      type: "send_to_unisound",
      data: {
        type: "api",
        data: { type: "get_local_music" },
      },
    });
  }

  /* ========== 备忘/闹钟/提醒（移植原版 memo_info / get_memo / add_memo / del_memo） ========== */
  /**
   * 获取备忘列表
   * 原版：ws_send({type:"send_to_unisound", data:{type:"get_memo"}})
   * 返回：type:"Unisound" data.type="get_memo" data.data={memo:[{id, type, time, text, ...}]}
   */
  function requestMemoList() {
    return wsSend({ type: "send_to_unisound", data: { type: "get_memo" } });
  }

  /**
   * 添加备忘/闹钟/提醒
   * 原版：ws_send({type:"send_to_unisound", data:{type:"add_memo", data:{type, time, text}}})
   * type: 0=提醒 1=闹钟 2=备忘
   */
  function addMemo(memo) {
    return wsSend({ type: "send_to_unisound", data: { type: "add_memo", data: memo } });
  }

  /**
   * 删除备忘
   * 原版：ws_send({type:"send_to_unisound", data:{type:"del_memo", id:xxx}})
   */
  function deleteMemo(id) {
    return wsSend({ type: "send_to_unisound", data: { type: "del_memo", id: id } });
  }

  /**
   * 清空闹钟/提醒（原版"设备信息"页面的"清除闹铃/提醒"按钮）
   * 原版：直接遍历删除所有type=0/1的memo
   */
  function clearAlarms() {
    return wsSend({ type: "send_to_unisound", data: { type: "clear_memo", filter: "alarm" } });
  }

  /* ========== 小爱相关（移植原版 set_wakeup_xiaoai / xiaoai_settings / activation_xiaoai） ========== */
  /**
   * 重启小爱服务
   * 原版：reboot_xiaoaiservice → send_message {what:1, arg1:4, arg2:-1}
   */
  function rebootXiaoaiService() {
    return sendMessage({ what: 1, arg1: 4, arg2: -1 });
  }

  /**
   * 一键激活小爱
   * 原版：activation_xiaoai → send_message {what:65536, arg1:0, arg2:10, obj:JSON.stringify({type:"activation_xiaoai"})}
   */
  function activateXiaoai() {
    return sendMessage({
      what: 65536,
      arg1: 0,
      arg2: 10,
      obj: JSON.stringify({ type: "activation_xiaoai" }),
    });
  }

  /**
   * 修改小讯唤醒词
   * 原版：send_message {what:65536, arg1:0, arg2:3, obj:word}
   */
  function setWakeupWord(word) {
    return sendMessage({ what: 65536, arg1: 0, arg2: 3, obj: word });
  }

  /* ========== 高级功能入口（移植原版 dlna/mdns/adb/device_scan_index） ========== */
  /**
   * DLNA投屏
   * 原版：location.href = "pages/dlna/?" + Date.now()
   * 修复：通过 WS 开启 DLNA 服务，并提示用户用手机投屏
   */
  function openDLNA() {
    setDlnaOpen(true);
    /* 同时确保服务常驻 */
    wsSend({ type: "Set_Service_Normally_Open", open: true, type_id: "Set_Service_Normally_Open" });
  }

  /**
   * mDNS服务发现
   * 原版：location.href = "pages/mdns/?" + Date.now()
   * 修复：通过 shell 重启 mDNS 服务
   */
  function openMDNS() {
    executeShell("am startservice com.phicomm.speaker.device/.service.MdnsService", "mdns_restart");
  }

  /**
   * ADB控制台
   * 原版：plus.webview.create(e.href).show()
   */
  function openADB() {
    /* 打开独立 ADB 控制台页面，自动传入当前设备 IP */
    var ip = localIp || (connectIp ? R1Config.parseDeviceAddress(connectIp).host : "");
    var url = R1Config.assetUrl("pages/adb/?ip=" + encodeURIComponent(ip) + "&t=" + Date.now());
    window.open(url, "_blank");
  }

  /**
   * 设备扫描（局域网内寻找 R1 音响）
   * 原版是 location.href = 'pages/device-scan/?' 但该文件不存在，故重写
   *
   * 策略：
   * 1. 用 WebRTC 获取本机内网 IP 段（如 192.168.1.x）
   * 2. 扫描该段所有 .1 ~ .254 的地址
   * 3. 对每个 IP 尝试打开 ws://ip:<port> 并发送 {type:'get_info'}
   * 4. 收到任何 WebSocket 响应即视为可能设备，再根据内容判定 R1
   *
   * 事件：
   *   'scan:progress' - { scanned, total, current }
   *   'scan:found'    - { ip, info }
   *   'scan:debug'    - { ip, raw }  任何 WebSocket 响应
   *   'scan:done'     - { devices: [...], elapsed }
   *
   * 端口列表默认按以下顺序尝试：80, 8080, 9999, 9090, 9527
   */
  function scanLocalDevices(opts) {
    opts = opts || {};
    var startIP = opts.startIP || 1;
    var endIP = opts.endIP || 254;
    var timeout = opts.timeout || 1500;
    var concurrency = opts.concurrency || 20;
    var ports = opts.ports || [80, 8080, 9999, 9090, 9527];
    var singleIP = opts.ip || null; /* 单 IP 模式：只探测这一个 IP */
    var subnetOverride = opts.subnet || null; /* 直接指定子网，跳过 WebRTC */

    /* 异步流程：getLocalIPs -> 逐个探测 */
    var cancelled = false;
    var finishScan;
    var scanTimers = new Set();
    var scanSockets = new Set();
    var closePeer = function () {};
    function later(fn, ms) {
      var timer = setTimeout(function () {
        scanTimers.delete(timer);
        if (!cancelled) fn();
      }, ms);
      scanTimers.add(timer);
      return timer;
    }

    return Object.assign(
      new Promise(function (resolve) {
        var devices = [];
        var found = {};
        var scanned = 0;
        var total = 0;
        var startTs = Date.now();

        emit("scan:progress", { scanned: 0, total: 0, current: "" });

        function finish(aborted) {
          if (cancelled) return;
          cancelled = true;
          scanTimers.forEach(clearTimeout);
          scanTimers.clear();
          closePeer();
          scanSockets.forEach(function (socket) {
            try {
              socket.close();
            } catch (e) {}
          });
          scanSockets.clear();
          var result = {
            devices: devices.slice(),
            elapsed: Date.now() - startTs,
            cancelled: !!aborted,
          };
          emit("scan:progress", { scanned: aborted ? scanned : total, total: total, current: "" });
          emit("scan:done", result);
          resolve(result);
        }
        finishScan = finish;

        function isR1Response(data) {
          if (!data) return false;
          try {
            var dump = JSON.stringify(data).toLowerCase();
            if (/r1|phicomm|unisound|echo[_-]?service/.test(dump)) return true;
          } catch (e) {}
          if (data.model && /r1|phicomm/i.test(String(data.model))) return true;
          if (data.device_name && /r1|phicomm/i.test(String(data.device_name))) return true;
          if (data.hostname && /phicomm_r1/i.test(String(data.hostname))) return true;
          if (data.type === "info" && data.info) return true;
          if (data.code === 1 && data.data) return true; /* new_EchoService 标准响应 */
          return false;
        }

        function makeDevice(ip, port, data) {
          var info = (data && data.info) || data || {};
          return {
            ip: ip,
            port: port,
            name: info.device_name || data.device_name || data.model || "未知设备",
            model: info.model || data.model || "unknown",
            version: info.version || data.version || 0,
            isR1: isR1Response(data),
            raw: data,
          };
        }

        function probe(ip, port) {
          if (cancelled) return;
          scanned++;
          emit("scan:progress", { scanned: scanned, total: total, current: ip + ":" + port });
          var probeWs = null;
          var done = false;
          var timer = later(function () {
            if (done) return;
            done = true;
            try {
              probeWs && probeWs.close();
            } catch (e) {}
          }, timeout);

          try {
            // 默认直连；只有明确配置代理时才使用服务器 WebSocket 路由。
            var proxy = R1Config.scanProxyBaseUrl;
            var probeUrl = proxy
              ? new URL(encodeURIComponent(ip + ":" + port) + "/", proxy).href
              : "ws://" + ip + ":" + port;
            probeWs = new WebSocket(probeUrl);
            scanSockets.add(probeWs);
          } catch (e) {
            clearTimeout(timer);
            return;
          }

          /* 抑制 onerror 静默关闭 */
          var hadError = false;
          probeWs.onopen = function () {
            if (cancelled) return;
            try {
              probeWs.send(JSON.stringify({ type: "get_info", type_id: String(Date.now()) }));
            } catch (e) {}
          };
          probeWs.onmessage = function (ev) {
            if (done || cancelled) return;
            done = true;
            clearTimeout(timer);
            var data = null;
            try {
              data = JSON.parse(ev.data);
            } catch (e) {
              data = { raw: ev.data };
            }
            /* 任何响应都算发现 */
            emit("scan:debug", { ip: ip, port: port, raw: data });
            var key = ip + ":" + port;
            if (!found[key]) {
              found[key] = true;
              var dev = makeDevice(ip, port, data);
              devices.push(dev);
              emit("scan:found", { ip: ip, info: dev });
            }
            try {
              probeWs.close();
            } catch (e) {}
          };
          probeWs.onerror = function () {
            hadError = true;
            if (done) return;
            done = true;
            clearTimeout(timer);
            try {
              probeWs.close();
            } catch (e) {}
          };
          probeWs.onclose = function () {
            scanSockets.delete(probeWs);
            if (done) return;
            done = true;
            clearTimeout(timer);
          };
        }

        function probeAllPortsForIP(ip) {
          /* 对单个 IP 按顺序尝试所有端口 */
          var pi = 0;
          function nextPort() {
            if (pi >= ports.length || cancelled) return;
            probe(ip, ports[pi]);
            pi++;
            /* 端口之间短间隔（同一 IP 上一个端口失败再试下一个） */
            later(nextPort, 30);
          }
          nextPort();
        }

        function getLocalIPs(cb) {
          var ips = [],
            settled = false;
          function complete() {
            if (settled || cancelled) return;
            settled = true;
            closePeer();
            cb(ips);
          }
          try {
            var RTC =
              window.RTCPeerConnection ||
              window.webkitRTCPeerConnection ||
              window.mozRTCPeerConnection;
            if (!RTC) {
              complete();
              return;
            }
            var pc = new RTC({ iceServers: [] });
            closePeer = function () {
              try {
                pc.close();
              } catch (e) {}
            };
            pc.createDataChannel("");
            pc.onicecandidate = function (e) {
              if (!e || !e.candidate || !e.candidate.candidate) {
                try {
                  pc.close();
                } catch (er) {}
                complete();
                return;
              }
              var m = e.candidate.candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
              if (m && ips.indexOf(m[1]) === -1) ips.push(m[1]);
            };
            pc.createOffer()
              .then(function (o) {
                return pc.setLocalDescription(o);
              })
              .catch(function () {
                try {
                  pc.close();
                } catch (e) {}
                complete();
              });
            later(function () {
              try {
                pc.close();
              } catch (e) {}
              complete();
            }, 1500);
          } catch (e) {
            complete();
          }
        }

        function ipToBase(ip) {
          var p = ip.split(".");
          return p[0] + "." + p[1] + "." + p[2] + ".";
        }
        function buildList(base) {
          var list = [];
          for (var i = startIP; i <= endIP; i++) list.push(base + i);
          return list;
        }

        /* 单 IP 模式 */
        if (singleIP) {
          total = ports.length;
          emit("scan:progress", { scanned: 0, total: total, current: singleIP });
          probeAllPortsForIP(singleIP);
          later(finish, timeout * ports.length + 800);
          return;
        }

        /* 子网覆盖模式 */
        if (subnetOverride) {
          var base = subnetOverride.endsWith(".") ? subnetOverride : subnetOverride + ".";
          var ipList = buildList(base);
          total = ipList.length * ports.length;
          var idx = 0;
          function runBatch() {
            var batch = ipList.slice(idx, idx + concurrency);
            idx += batch.length;
            if (batch.length === 0) {
              later(finish, timeout + 500);
              return;
            }
            batch.forEach(function (ip) {
              probeAllPortsForIP(ip);
            });
            later(runBatch, Math.floor(timeout / 2));
          }
          runBatch();
          return;
        }

        /* 自动检测子网 */
        getLocalIPs(function (ips) {
          if (cancelled) return;
          if (!ips || ips.length === 0) {
            /* 兜底：探测 192.168.1.x / 192.168.0.x */
            var fallback = ["192.168.1.", "192.168.0.", "192.168.31.", "10.0.0."];
            var ipList = [];
            fallback.forEach(function (b) {
              for (var i = startIP; i <= endIP; i++) ipList.push(b + i);
            });
            total = ipList.length * ports.length;
            var idx2 = 0;
            function runBatch2() {
              var batch = ipList.slice(idx2, idx2 + concurrency);
              idx2 += batch.length;
              if (batch.length === 0) {
                later(finish, timeout + 500);
                return;
              }
              batch.forEach(function (ip) {
                probeAllPortsForIP(ip);
              });
              later(runBatch2, Math.floor(timeout / 2));
            }
            runBatch2();
            return;
          }
          /* 选第一个非 127 开头的内网 IP */
          var base2 = null;
          for (var i = 0; i < ips.length; i++) {
            if (
              ips[i].indexOf("127.") !== 0 &&
              /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ips[i])
            ) {
              base2 = ipToBase(ips[i]);
              break;
            }
          }
          if (!base2) base2 = ipToBase(ips[0]);

          var ipList2 = buildList(base2);
          total = ipList2.length * ports.length;
          emit("scan:progress", { scanned: 0, total: total, current: "扫描 " + base2 + "*" });

          var idx3 = 0;
          function runBatch3() {
            var batch = ipList2.slice(idx3, idx3 + concurrency);
            idx3 += batch.length;
            if (batch.length === 0) {
              later(finish, timeout + 500);
              return;
            }
            batch.forEach(function (ip) {
              probeAllPortsForIP(ip);
            });
            later(runBatch3, Math.floor(timeout / 2));
          }
          runBatch3();
        });
      }),
      {
        abort: function () {
          if (finishScan) finishScan(true);
        },
      },
    );
  }

  /**
   * 探测单个 IP 的多个端口
   * 用于调试：手动输入一个 IP 试一下
   */
  function probeSingleIP(ip, opts) {
    opts = opts || {};
    return scanLocalDevices(Object.assign({}, opts, { ip: ip, singleIP: ip }));
  }

  function openDeviceScan() {
    /* 改为打开内置扫描页面：直接复用当前页面并跳到高级页签
     * 高级页里有"设备扫描"按钮，已集成 scanLocalDevices 逻辑 */
    try {
      emit("openDeviceScan");
    } catch (e) {}
    try {
      /* 优先跳到当前窗口 hash 锚点，方便被 #device-scan 路由识别 */
      window.location.hash = "#device-scan";
    } catch (e) {}
    try {
      window.focus();
    } catch (e) {}
  }

  /**
   * 进入配网页面
   * 打开独立的配网页面，用户连接R1热点后在页面上输入WiFi信息
   */
  function openConfigWifi() {
    window.open(R1Config.assetUrl("pages/wifi/") + "?" + Date.now(), "_blank");
  }

  /* ========== 自定义背景（移植原版 set_background_css + 上传背景） ========== */
  /**
   * 上传背景图片到设备
   * 原版：ws_send({type:"set_background", data:base64String})
   */
  function setBackground(base64Data) {
    return wsSend({ type: "set_background", data: base64Data });
  }

  /* ========== 屏幕截图（移植原版 screencap） ========== */
  /**
   * 请求屏幕截图
   * 原版：ws_send({type:"screencap"})
   * 返回：type:"screencap" data: "data:image/jpeg;base64,..."
   */
  function requestScreencap() {
    return wsSend({ type: "screencap" });
  }

  /* ========== 设备屏幕实时推流（移植原版 start_screencap） ========== */
  /**
   * 开始接收设备屏幕帧
   * 原版：ws_send('{"type":"start_screencap","interval":100}')
   * @param {number} intervalMs 帧间隔（毫秒）
   */
  function startScreenStream(intervalMs) {
    return wsSend({ type: "start_screencap", interval: intervalMs || 100 });
  }

  /**
   * 停止设备屏幕帧
   * 原版：ws_send('{"type":"stop_screencap"}')
   */
  function stopScreenStream() {
    return wsSend({ type: "stop_screencap" });
  }

  /**
   * 向设备发送输入命令（移植原版 send_input / send_keyevent）
   * 原版：ws_send({type:"input", input:"text xxx" | "keyevent 4" | "tap 100 200" ...})
   */
  function sendInput(input) {
    return wsSend({ type: "input", input: input });
  }

  /**
   * 向设备发送 keyevent（4=返回 23=确定 67=删除 19/20/21/22=上下左右）
   */
  function sendKeyevent(keyCode) {
    return sendInput("keyevent " + keyCode);
  }

  /**
   * 重置设备屏幕分辨率
   * 原版：ws_send({type:"shell", shell:"wm size 720x480"})
   */
  function resetScreenResolution() {
    return wsSend({ type: "shell", shell: "wm size 720x480" });
  }

  /**
   * 重置系统语言
   * 原版：ws_send({type:"shell", shell:"setprop persist.sys.language zh && setprop persist.sys.country CN"})
   */
  function resetSystemLanguage() {
    return wsSend({
      type: "shell",
      shell: "setprop persist.sys.language zh && setprop persist.sys.country CN",
    });
  }

  /* ========== 提交播放记录开关（移植原版 Submit_Play_Record） ========== */
  /**
   * 提交播放记录开关（原版min_uver:1824支持）
   * 原版：send_message {what:65536, arg1:0, arg2:10, obj:JSON.stringify({type:"set_submit_play_record", enable})}
   */
  function setSubmitPlayRecord(enable) {
    return sendMessage({
      what: 65536,
      arg1: 0,
      arg2: 10,
      obj: JSON.stringify({ type: "set_submit_play_record", enable: enable }),
    });
  }

  /* ========== 屏幕尺寸（移植原版 wm_size） ========== */
  /**
   * 请求屏幕尺寸
   * 原版：ws_send({type:"shell", shell:"wm size", type_id:"wm_size"})
   */
  function requestScreenSize() {
    return wsSend({ type: "shell", shell: "wm size", type_id: "wm_size" });
  }

  /* ========== 工具方法：手动触发任意消息（方便调试） ========== */
  function sendRaw(obj) {
    return wsSend(obj);
  }

  /* ========== 导出接口 ========== */
  global.R1WS = {
    /* 连接管理 */
    connect: connect,
    disconnect: disconnect,
    isConnected: function () {
      return connected;
    },
    getConnectIp: function () {
      return connectIp || "";
    },
    get deviceVer() {
      return ver;
    },

    /* 本地网络访问权限 */
    get localNetworkPermission() {
      return _lnPermissionState;
    },
    initLocalNetworkPermission: initLocalNetworkPermission,

    /* 事件系统 */
    on: on,
    off: off,
    emit: emit,

    /* 通用发送 */
    sendMessage: sendMessage,
    wsSend: wsSend,
    executeShell: executeShell,

    /**
     * 安装 APK 到设备
     * 流程：
     * 1. 浏览器上传 APK 到服务器 → 得到 HTTP 下载地址
     * 2. 在设备上执行 shell: curl/wget 下载 APK 到 /tmp/
     * 3. 执行 pm install 安装
     * 4. 清理临时文件
     * @param {string} downloadUrl - APK 在服务器上的 HTTP 下载地址
     * @param {function} onProgress - 进度回调 (msg)
     */
    installApk: function (downloadUrl, onProgress) {
      if (!connected) {
        if (onProgress) onProgress({ stage: "error", msg: "设备未连接" });
        return false;
      }
      var tmpFile = "/tmp/r1_install.apk";
      /* 优先用 curl，没有就用 wget，都没有尝试 toybox wget */
      var downloadCmd =
        "(curl -sL -o " +
        tmpFile +
        " " +
        downloadUrl +
        " || wget -q -O " +
        tmpFile +
        " " +
        downloadUrl +
        " || toybox wget -q -O " +
        tmpFile +
        " " +
        downloadUrl +
        ") && echo DOWNLOAD_OK || echo DOWNLOAD_FAIL";
      var installCmd =
        "pm install -r " + tmpFile + "; INSTALL_EXIT=$?; rm -f " + tmpFile + "; exit $INSTALL_EXIT";

      if (onProgress) onProgress({ stage: "downloading", msg: "正在下载 APK 到设备..." });

      /* 第一步：下载 */
      wsSend({ type: "shell", type_id: "apk_download", shell: downloadCmd });
      /* 等下载完成再安装，通过 shell_output 事件驱动 */

      return true;
    },

    /* 音乐 */
    musicPlay: musicPlay,
    musicPrev: musicPrev,
    musicNext: musicNext,
    musicPause: musicPause,
    musicResume: musicResume,
    musicControl: musicControl,
    seekTo: seekTo,
    setVolume: setVolume,
    requestMusicList: requestMusicList,
    /* 当前设备音乐信息（app.js 需要在 MusicPanel 内访问，
     * 而 MusicPanel 渲染时需要读当前 song.title 用于高亮匹配，
     * 因此通过 getter 暴露给 R1WS 命名空间） */
    get musicInfo() {
      return musicInfo;
    },
    playByIndex: playByIndex,
    requestSongList: requestSongList,
    fetchMusicInfo: fetchMusicInfo,
    playSongList: playSongList,
    playPersonalRadio: playPersonalRadio,
    playCollection: playCollection,
    collectSong: collectSong,
    cancelCollectSong: cancelCollectSong,

    /* 屏幕 */
    setAtmosphereLight: setAtmosphereLight,
    setLightBrightness: setLightBrightness,
    setLightMode: setLightMode,
    setLightColorSpeed: setLightColorSpeed,
    setLightColor: setLightColor,

    /* 蓝牙 */
    setBluetoothEnable: setBluetoothEnable,
    scanBluetooth: scanBluetooth,
    requestBluetoothDevices: requestBluetoothDevices,
    setBluetoothScanMode: setBluetoothScanMode,
    pairBluetooth: pairBluetooth,
    removeBond: removeBond,
    connectA2dp: connectA2dp,
    connectA2dpSink: connectA2dpSink,
    disconnectA2dp: disconnectA2dp,
    disconnectA2dpSink: disconnectA2dpSink,

    /* 音效 */
    setAsrMaxDuration: setAsrMaxDuration,
    setBluetoothPromptTone: setBluetoothPromptTone,
    tts: tts,

    /* 设备 */
    rebootDevice: rebootDevice,
    rebootEcho: rebootEcho,
    rebootAdbd: rebootAdbd,
    wakeupDevice: wakeupDevice,
    setDevName: setDevName,
    setServiceNormallyOpen: setServiceNormallyOpen,
    setDlnaOpen: setDlnaOpen,
    setAirplayOpen: setAirplayOpen,
    requestServiceInfo: requestServiceInfo,
    setWakeupXiaoai: setWakeupXiaoai,
    setWakeupXiaoaiWord: setWakeupXiaoaiWord,
    setIotApi: setIotApi,
    setWakeupBenchmark: setWakeupBenchmark,
    setDormancy: setDormancy,
    stopWakeup: stopWakeup,
    enterWakeup: enterWakeup,
    switchPlayer: switchPlayer,
    setWakeupWord: setWakeupWord,
    setMusicSource: setMusicSource,
    setTtsSpeaker: setTtsSpeaker,
    requestMusicInfo: requestMusicInfo,

    /* 登录/扫码 */
    requestQRCode: requestQRCode,
    pollQRCodeState: pollQRCodeState,
    loginByQRState: loginByQRState,
    loginByAccount: loginByAccount,
    requestLoginState: requestLoginState,
    logout: logout,
    exitLogin: exitLogin,

    /* 均衡器 */
    requestEqConfig: requestEqConfig,
    setEq: setEq,

    /* 语音报时 */
    setVoiceTimeReporting: setVoiceTimeReporting,

    /* 自动重启 */
    setAutoRestart: setAutoRestart,

    /* 本地音乐 */
    playLocalMusic: playLocalMusic,
    scanLocalMusic: scanLocalMusic,
    requestLocalMusicList: requestLocalMusicList,

    /* 备忘/闹钟/提醒 */
    requestMemoList: requestMemoList,
    addMemo: addMemo,
    deleteMemo: deleteMemo,
    clearAlarms: clearAlarms,

    /* 小爱 */
    rebootXiaoaiService: rebootXiaoaiService,
    activateXiaoai: activateXiaoai,

    /* 高级功能 */
    openDLNA: openDLNA,
    openMDNS: openMDNS,
    openADB: openADB,
    openDeviceScan: openDeviceScan,
    openConfigWifi: openConfigWifi,
    scanLocalDevices: scanLocalDevices,

    /* 背景/截图 */
    setBackground: setBackground,
    requestScreencap: requestScreencap,
    startScreenStream: startScreenStream,
    stopScreenStream: stopScreenStream,
    sendInput: sendInput,
    sendKeyevent: sendKeyevent,
    resetScreenResolution: resetScreenResolution,
    resetSystemLanguage: resetSystemLanguage,

    /* 杂项 */
    setSubmitPlayRecord: setSubmitPlayRecord,
    requestScreenSize: requestScreenSize,
    sendRaw: sendRaw,

    /* 数据缓存 */
    getDeviceInfo: function () {
      return deviceInfo;
    },
    getApiInfo: function () {
      return apiInfo;
    },
    getMusicInfo: function () {
      return musicInfo;
    },
    getBluetoothInfo: function () {
      return bluetoothInfo;
    },

    /* 版本信息 */
    getVer: function () {
      return ver;
    },
    getUVer: function () {
      return uVer;
    },
    isUnisound: function () {
      return isUnisound;
    },

    /* 手动请求信息 */
    requestDeviceInfo: requestDeviceInfo,
    requestSystemInfo: requestSystemInfo,
  };
})(window);
