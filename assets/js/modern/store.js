/**
 * R1 应用核心层：状态仓库 / R1WS 事件绑定 / 连接流程 / 主题 / 工具函数
 * 说明：通信协议全部由 websocket.js（R1WS）负责，这里只做状态编排。
 */
(function (global) {
  "use strict";

  var useState = React.useState,
    useEffect = React.useEffect;
  var useRef = React.useRef,
    useCallback = React.useCallback;
  var useSyncExternalStore = React.useSyncExternalStore;

  /* ================= 状态仓库 ================= */
  var state = {
    booted: false,
    route: "music",
    sheet:
      null /* { type:'login'|'local'|'memo'|'voice'|'restart'|'advanced'|'settings'|'about'|'source'|'eq'|'tools', payload } */,
    connected: false,
    connecting: false,
    lastIp: "",
    history: [],
    scan: { running: false, devices: [], scanned: 0, total: 0 },
    deviceInfo: {},
    apiInfo: {},
    customBg: "",
    musicInfo: {},
    btInfo: {},
    dark: false,
    followSystem: true,
  };

  var listeners = [];
  function subscribe(callback) {
    listeners.push(callback);
    return function () {
      listeners = listeners.filter(function (item) {
        return item !== callback;
      });
    };
  }
  function getSnapshot() {
    return state;
  }
  function setState(patch) {
    var next = typeof patch === "function" ? patch(state) : patch;
    var changed = false;
    for (var key in next) {
      if (next[key] !== state[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = Object.assign({}, state, next);
    for (var index = 0; index < listeners.length; index++) listeners[index]();
  }
  function useStore() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }

  /* 绑定单个 R1WS 事件：handler 变化不重新订阅，卸载自动解绑 */
  function useR1Event(name, handler) {
    var ref = useRef(handler);
    useEffect(function () {
      ref.current = handler;
    });
    useEffect(
      function () {
        if (typeof R1WS === "undefined") return;
        var callback = function (data) {
          ref.current(data);
        };
        R1WS.on(name, callback);
        return function () {
          R1WS.off(name, callback);
        };
      },
      [name],
    );
  }

  /* ================= 主题（沿用原版 data-theme 亮/暗双主题） ================= */
  function isSystemDark() {
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  /* ================= 网页自定义背景 =================
   * 背景图存 localStorage（r1_custom_bg_url），显示为全屏固定图层；
   * 有背景时把 --mui-* 表面变量改成半透明，卡片/导航自动变成毛玻璃。 */
  function updateBgCssVars(hasBg) {
    var root = document.documentElement;
    var isDark = root.getAttribute("data-theme") === "dark";
    if (hasBg) {
      root.style.setProperty("--mui-bg", "transparent");
      root.style.setProperty(
        "--mui-paper",
        isDark ? "rgba(30, 30, 30, 0.78)" : "rgba(255, 255, 255, 0.78)",
      );
      root.style.setProperty(
        "--mui-sider-bg",
        isDark ? "rgba(30, 30, 30, 0.78)" : "rgba(255, 255, 255, 0.78)",
      );
      root.style.setProperty(
        "--mui-header-bg",
        isDark ? "rgba(30, 30, 30, 0.78)" : "rgba(255, 255, 255, 0.78)",
      );
      root.style.setProperty(
        "--mui-nav-bg",
        isDark ? "rgba(30, 30, 30, 0.78)" : "rgba(255, 255, 255, 0.78)",
      );
      root.style.setProperty(
        "--mui-modal-bg",
        isDark ? "rgba(30, 30, 30, 0.88)" : "rgba(255, 255, 255, 0.88)",
      );
    } else {
      root.style.removeProperty("--mui-bg");
      root.style.removeProperty("--mui-paper");
      root.style.removeProperty("--mui-sider-bg");
      root.style.removeProperty("--mui-header-bg");
      root.style.removeProperty("--mui-nav-bg");
      root.style.removeProperty("--mui-modal-bg");
    }
  }
  function getCustomBg() {
    try {
      return localStorage.getItem("r1_custom_bg_url") || "";
    } catch (error) {
      return "";
    }
  }
  function setCustomBg(url) {
    try {
      if (url) localStorage.setItem("r1_custom_bg_url", url);
      else localStorage.removeItem("r1_custom_bg_url");
    } catch (error) {
      toast("背景图过大，浏览器存不下，请换小一点的图片", "err");
      return;
    }
    updateBgCssVars(!!url);
    setState({ customBg: url || "" });
  }
  function applyTheme(dark) {
    try {
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    } catch (error) {}
    try {
      localStorage.setItem("r1_theme", dark ? "dark" : "light");
    } catch (error) {}
    setState({ dark: !!dark });
    /* 主题切换时若开着网页背景，半透明变量要按新主题重算 */
    if (state.customBg) updateBgCssVars(true);
  }
  function setFollowSystem(value) {
    try {
      localStorage.setItem("r1_follow_system", value ? "true" : "false");
    } catch (error) {}
    setState({ followSystem: !!value });
    if (value) applyTheme(isSystemDark());
  }
  function initTheme() {
    var follow = true,
      dark = false;
    try {
      follow = localStorage.getItem("r1_follow_system") !== "false";
      dark = follow ? isSystemDark() : localStorage.getItem("r1_theme") === "dark";
    } catch (error) {}
    setState({ dark: dark, followSystem: follow });
    try {
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    } catch (error) {}

    /* 跟随系统时实时响应系统主题变化 */
    if (follow && window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var handler = function (value) {
        if (state.followSystem) applyTheme(value.matches);
      };
      if (mq.addEventListener) mq.addEventListener("change", handler);
      else if (mq.addListener) mq.addListener(handler);
    }
  }

  /* ================= 连接 ================= */
  function pushHistory(ip) {
    var list = [{ ip: ip, time: Date.now() }]
      .concat(
        (state.history || []).filter(function (item) {
          return item.ip !== ip;
        }),
      )
      .slice(0, 8);
    setState({ history: list });
    try {
      localStorage.setItem("r1_connect_history", JSON.stringify(list));
    } catch (error) {}
    try {
      localStorage.setItem("r1_last_ip", ip);
    } catch (error) {}
  }

  function connectTo(ip) {
    ip = String(ip || "").trim();
    try {
      ip = R1Config.parseDeviceAddress(ip).address;
    } catch (error) {
      toast(error.message, "err");
      return;
    }
    setState({ connecting: true, lastIp: ip });
    pushHistory(ip);
    try {
      R1WS.connect(ip);
    } catch (error) {
      toast("连接失败：" + (error && error.message), "err");
    }
    setTimeout(function () {
      setState({ connecting: false });
    }, 6000);
  }

  function disconnect() {
    try {
      R1WS.disconnect();
    } catch (error) {}
    setState({ connected: false });
  }

  /* ================= 局域网扫描 ================= */
  var scanCleanup = null;
  function startScan() {
    if (state.scan.running) return;
    if (typeof R1WS === "undefined" || !R1WS.scanLocalDevices) return;

    function onProgress(value) {
      setState({
        scan: Object.assign({}, state.scan, { scanned: value.scanned, total: value.total }),
      });
    }
    R1WS.on("scan:progress", onProgress);
    setState({ scan: { running: true, devices: [], scanned: 0, total: 0 } });

    var result;
    try {
      result = R1WS.scanLocalDevices();
    } catch (error) {
      result = null;
    }

    var done = function (response) {
      R1WS.off("scan:progress", onProgress);
      scanCleanup = null;
      var devices = (response && response.devices) || [];
      setState({ scan: { running: false, devices: devices, scanned: 0, total: 0 } });
      if (!devices.length && !(response && response.cancelled))
        toast("未发现设备，可手动输入 IP", "info");
    };
    if (result && typeof result.then === "function")
      result.then(done, function () {
        done({ devices: [] });
      });
    else done({ devices: [] });

    if (result && typeof result.abort === "function") scanCleanup = result.abort;
  }
  function stopScan() {
    if (scanCleanup) {
      try {
        scanCleanup();
      } catch (error) {}
      scanCleanup = null;
    }
    R1WS.off && R1WS.off("scan:progress", function () {});
    setState({ scan: Object.assign({}, state.scan, { running: false }) });
  }

  /* ================= 弹层控制 ================= */
  function openSheet(type, payload) {
    setState({ sheet: { type: type, payload: payload || null } });
  }
  function closeSheet() {
    setState({ sheet: null });
  }
  var ROUTES = ["music", "screen", "sound", "bluetooth", "device"];
  function goRoute(route) {
    /* 记住当前页面：刷新 / 重开后直接恢复上次停留的板块 */
    if (ROUTES.indexOf(route) >= 0) {
      try {
        localStorage.setItem("r1_last_route", route);
      } catch (error) {}
    }
    setState({ route: route, sheet: null });
  }

  /* ================= 工具函数 ================= */
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    var value = Math.floor(sec / 60),
      value2 = sec % 60;
    return (value < 10 ? "0" : "") + value + ":" + (value2 < 10 ? "0" : "") + value2;
  }
  function fmtBytes(value) {
    if (!value) return "0 B";
    var items = ["B", "KB", "MB", "GB"],
      index = 0;
    var numericValue = Number(value);
    while (numericValue >= 1024 && index < items.length - 1) {
      numericValue /= 1024;
      index++;
    }
    return numericValue.toFixed(numericValue >= 100 || index === 0 ? 0 : 1) + " " + items[index];
  }
  function isEmptyObj(value) {
    return !value || typeof value !== "object" || !Object.keys(value).length;
  }

  /* ================= 业务常量 ================= */
  var SOURCES = [
    { v: 1, key: "qq", label: "QQ 音乐", icon: "music" },
    { v: 2, key: "netease", label: "网易云音乐", icon: "music" },
    { v: 3, key: "kuwo", label: "酷我音乐", icon: "music" },
  ];
  var sOURCELABEL = {
    1: "QQ 音乐",
    2: "网易云音乐",
    3: "酷我音乐",
    qq: "QQ 音乐",
    netease: "网易云音乐",
    kuwo: "酷我音乐",
  };

  /* 设备协议：1=随机 2=顺序 3=单曲；UI 循环 list → random → single → list */
  var mODEORDER = ["list", "random", "single"];
  var mODELABEL = { list: "顺序播放", random: "随机播放", single: "单曲循环" };
  var mODEICON = { list: "repeat", random: "shuffle", single: "repeatOne" };
  var mODECODE = { random: 1, list: 2, single: 3 };
  function nextMode(current) {
    var value = mODEORDER.indexOf(current);
    return mODEORDER[(value + 1) % mODEORDER.length];
  }

  /* ================= 启动 ================= */
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;

    initTheme();
    var savedBg = getCustomBg();
    if (savedBg) {
      setState({ customBg: savedBg });
      updateBgCssVars(true);
    }
    try {
      var savedRoute = localStorage.getItem("r1_last_route") || "";
      var nextState = {
        history: JSON.parse(localStorage.getItem("r1_connect_history") || "[]"),
        lastIp: localStorage.getItem("r1_last_ip") || "",
      };
      /* 刷新后恢复到上次停留的板块；值非法时回落到音乐页 */
      if (ROUTES.indexOf(savedRoute) >= 0) nextState.route = savedRoute;
      setState(nextState);
    } catch (error) {}

    if (typeof R1WS === "undefined") return;

    R1WS.on("connected", function () {
      setState({ connected: true, connecting: false });
    });
    R1WS.on("disconnected", function () {
      setState({ connected: false });
    });
    R1WS.on("error", function (value) {
      var message = (value && (value.message || value.msg)) || "设备通信出错";
      if (global.R1UI && global.R1UI.toast) global.R1UI.toast(message, "err");
    });
    R1WS.on("device_info", function (info) {
      setState({ deviceInfo: Object.assign({}, info || {}) });
    });
    R1WS.on("api_info", function (info) {
      /* 缓存最近一次有效的 QQ 登录号：页面刷新后设备上报 user_info 有几秒延迟，
       * 期间头像组件先用缓存，避免闪回 R1 字样；登出（state 非 1）时清掉缓存 */
      try {
        if (info && info.userid) {
          if (Number(info.qqmusic_login_state) === 1) {
            localStorage.setItem("r1_qq_avatar", String(info.userid));
          } else {
            localStorage.removeItem("r1_qq_avatar");
          }
        }
      } catch (error) {}
      setState({ apiInfo: Object.assign({}, info || {}) });
    });

    try {
      if (R1WS.initLocalNetworkPermission) R1WS.initLocalNetworkPermission();
    } catch (error) {}

    /* 自动连接上次设备 */
    var lastIp = state.lastIp;
    if (lastIp) {
      setState({ connecting: true });
      try {
        R1WS.connect(lastIp);
      } catch (error) {}
      setTimeout(function () {
        if (!state.connected) setState({ connecting: false });
      }, 7000);
    }

    setState({ booted: true });
  }

  /* toast 直接透传 R1UI，避免循环依赖 */
  function toast(message, type) {
    if (global.R1UI && global.R1UI.toast) global.R1UI.toast(message, type);
  }
  function confirm(options) {
    if (global.R1UI && global.R1UI.confirm) return global.R1UI.confirm(options);
    return Promise.resolve(true);
  }

  global.R1Core = {
    useStore: useStore,
    setState: setState,
    getState: function () {
      return state;
    },
    useR1Event: useR1Event,
    boot: boot,
    connectTo: connectTo,
    disconnect: disconnect,
    startScan: startScan,
    stopScan: stopScan,
    openSheet: openSheet,
    closeSheet: closeSheet,
    goRoute: goRoute,
    applyTheme: applyTheme,
    setFollowSystem: setFollowSystem,
    isSystemDark: isSystemDark,
    getCustomBg: getCustomBg,
    setCustomBg: setCustomBg,
    updateBgCssVars: updateBgCssVars,
    /* 兼容别名：早期页面用 applyAppearance 切主题 */
    applyAppearance: function (mode) {
      applyTheme(mode === "dark" || mode === "oled");
    },
    toast: toast,
    confirm: confirm,
    fmtTime: fmtTime,
    fmtBytes: fmtBytes,
    isEmptyObj: isEmptyObj,
    SOURCES: SOURCES,
    SOURCE_LABEL: sOURCELABEL,
    MODE_LABEL: mODELABEL,
    MODE_ICON: mODEICON,
    MODE_CODE: mODECODE,
    MODE_ORDER: mODEORDER,
    nextMode: nextMode,
  };
})(window);
