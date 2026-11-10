var DEFAULT_CONTROL_HOST = new URL(R1Config.assetBaseUrl).host,
  IP_PATTERN = /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])(\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])){3}$/,
  HOSTNAME_PATTERN = /^phicomm_r1_\S+$/i,
  DEFAULT_BACKGROUND = "background: var(--background);",
  CHANGELOG = [
    "2021-03-19：音量条增加防误触(双击激活后可调节)。",
    "2021-03-20：增加顶部歌词显示，页面按钮精简。",
    "2021-03-22：增加滚动歌词(双击封面切换)。",
    "2021-03-26：增加音效控制页面。",
    "2021-04-15：适配new_Unisound、EchoService登录功能。",
    "2021-06-25：增加禁用无用的服务、清除小讯数据。",
    "2021-08-06：增加唤醒识别精度控制。",
    "2021-10-22：增加蓝牙控制页面。",
    "2021-11-01：优化页面加载流程。",
    "2021-11-30：最大音量改为动态获取。",
    "2022-01-02：增加语音报时设置。",
    "2022-01-03：增加12小时制、自动重启、氛围灯颜色。",
    "2022-02-19：增加登录相关按钮。",
    "2022-03-23：增加重启Echo、禁用/启用小讯。",
    "2022-04-07：支持设置背景模糊。",
    "2022-04-13：播放器切换。",
    "2022-05-08：增加播放音质切换。",
    "2023-10-15：最大录音时间最小值改为2秒。",
    "2024-04-07：显示cpu温度。",
    "2024-12-30：app小白条透明隐藏。",
    "2025-07-22：保存自定义eq。",
    "2025-08-17：增加重启adbd。",
    "2025-08-30：新增蓝牙控制页的扬声器音量选项。",
    "2026-02-12：增加唤醒灵敏度锁定控件。",
    "2026-03-15：优化屏幕操作体验。",
    "2026-04-12：新增 DSP 低音增强开关控件。",
    "2026-04-14：页面处理本地网络访问权限。",
    "2026-10-26：重构网页控制面板代码。",
    "2026-10-27：音乐页全新 UI，图标化控制按钮、新增全屏歌词、播放列表弹窗，统一弹窗样式，修复歌词居中与长文本裁切问题。",
    "2026-10-29：歌词区域自适应高度。",
    "2026-10-31：新增MiPlay服务开关、立体声声道选择及音乐页投送状态适配。",
    "2026-11-04：新增MiPlay声道切换和同步延迟调节，修复全屏歌词多行裁切。",
    "2026-11-06：修复QQ扫码、登录结果提示及刷新或断线后的登录状态恢复。",
    "2026-11-07：新增多源搜歌、下一首插队、队列编辑及上传安装进度（需1887）；封面切换更平滑，修复歌词和屏幕闪烁。",
    "2026-11-08：新增独立蓝牙服务开关，首页蓝牙按钮改称投放连接、常开开关改称投放服务常开（服务设置需新版1887）；连接与初始化提示改为弹窗，修复登录提示重复、初始化遮挡二维码及取消后无法重新登录，首页取消连接不再额外显示恢复按钮，自动连接可取消，连接取消按钮统一为“取消连接”，修复跳过初始化后仍停留等待，处理状态显示在提示正文并保持按钮尺寸稳定；修复封面背景回退、音乐页重复渲染、屏幕长按误返回及小讯旧版本信息残留，修复未安装new_Unisound时搜歌播放缺少播放链接。",
    "2026-11-09：修复初始化完成后仍显示等待、半屏歌词切歌撑高、歌词反复滚动和长播放列表关闭卡顿；拖动进度后立即恢复更新，暂停时调整进度不再自动播放；修复小屏搜索栏错行；切歌加载时保留原封面背景，音乐页与全屏歌词共用封面渐变，进入音乐页保持轻微动效，不再透出首页背景；版本信息弹窗显示音箱真实编译时间（需1888），方便区分同版本更新；修复投送切到蓝牙后播放时间残留、切换发音人或音乐源时多余成功弹窗，以及连接过程中重复连接按钮。",
    "2026-11-10：修复自定义背景模糊时的四周暗边，模糊强度变化时同步调整图片边界。",
  ];
function readMiPlayAvailable() {
  try {
    var echoVersion = "undefined" != typeof ver ? parseInt(ver, 10) : 0;
    return !!isNaN(echoVersion) || echoVersion >= 1882;
  } catch (error) {
    return !0;
  }
}
function readGlobal(globalName, fallbackValue) {
  try {
    if (void 0 !== window[globalName]) return window[globalName];
  } catch (error) {}
  try {
    var globalValue = new Function(
      "return typeof " + globalName + ' !== "undefined" ? ' + globalName + " : undefined;",
    )();
    if (void 0 !== globalValue) return globalValue;
  } catch (error) {}
  return fallbackValue;
}
var state = {
    ws: null,
    ip: "",
    ver: 1e3,
    uVer: -1,
    renderedUnisoundVersion: null,
    unisoundVersionReloading: !1,
    confirmedEchoVersion: null,
    confirmedEchoIp: null,
    confirmedEchoWs: null,
    musicCapabilityEpoch: 0,
    confirmedEchoBuildTimestamp: null,
    connectId: null,
    connectIp: -1,
    connectInitialized: !1,
    initState: !0,
    initState1: !0,
    reload: !1,
    unisoundSkipCheck: null,
    loginIntent: null,
    controlHost: readGlobal("control_host", DEFAULT_CONTROL_HOST) || DEFAULT_CONTROL_HOST,
    info: {},
    deviceTag: "",
    hostname: "",
    localIp: null,
    deviceDate: null,
    unisoundAvailable: !1,
    isNewUnisound: !1,
    unisoundInfo: {},
    unisoundRetryCount: [0, 0, 0],
    deviceInfoCache: {},
    deviceInfoLastFetch: 0,
    musicInfo: null,
    apiMusicInfo: null,
    currentMusicData: null,
    musicId: "",
    lyrics: [[-1, "暂无歌词"]],
    lyricTiming: [],
    playType: 0,
    playIndex: 0,
    playlist: {},
    tempSongList: null,
    coverBackgroundEnabled: !0,
    timeLocked: !1,
    mousePressed: !1,
    titleDisplayUntil: 0,
    lastLyricTime: -1,
    dragProtectionUntil: 0,
    lrcFullscreen: !1,
    lastScrolledLrcIndex: -1,
    fullscreenPlayProtectUntil: 0,
    radioReportList: [],
    autoRestartTimes: [0, 0],
    loginParams: {
      aid: 716027609,
      daid: 383,
      pt_3rd_aid: 100497308,
      u1: "https://graph.qq.com/oauth2.0/login_jump",
      referer: "https://graph.qq.com/oauth2.0/authorize",
    },
    loginApp: "qqmusic",
    loginMode: "speaker",
    loginSession: null,
    qrState: 0,
    qrLoaded: !1,
    qrUpdateTime: -1,
    qrLastUpdateTime: -1,
    memoList: [],
    unusableServices: [],
    pageList: [],
    soundEffectsData: null,
    tests: [],
    callbacks: {},
    notificationManager: null,
    currentPage: null,
    pingTime: 0,
    pingResult: -1,
    testConnectState: !1,
    version: {
      echo: readGlobal("new_echo_ver", 1e3) || 1e3,
      unisound: readGlobal("new_unisound_ver", 1e3) || 1e3,
      app: readGlobal("new_app_ver", 0) || 0,
      web: readGlobal("web_ver", 1e3) || 1e3,
    },
    downurl: readGlobal("downurl", "https://xfdown.lanzouq.com/") || "https://xfdown.lanzouq.com/",
    downids: {
      app: readGlobal("app_downid", "") || "",
      echo: readGlobal("echo_downid", "") || "",
      unisound: readGlobal("unisound_downid", "") || "",
    },
  },
  ui = {
    main: null,
    container: null,
    pageTitle: null,
    popup: null,
    statusBar: null,
    background: null,
    textsPanel: null,
    buttonsPanel: null,
    musicPanel: null,
    loginPanel: null,
    qrcode: null,
    qrcodeMessage: null,
    switchButtons: null,
    buttons: [],
    screen: null,
    screenImage: null,
    deviceInfo: null,
    soundEffects: null,
    bluetooth: null,
    musicPic: null,
    musicLyrics: null,
    musicTimeRange: null,
    musicTimeCurrent: null,
    musicTimeTotal: null,
    qualityPanel: null,
    qualitySelect: null,
    qualityLabel: null,
    playlistPanel: null,
    playlistContainer: null,
    playlistTable: null,
    fullscreenOverlay: null,
    fullscreenLrc: null,
    fullscreenCover: null,
    fullscreenTitleEl: null,
    fullscreenArtistEl: null,
    fullscreenPlayBtn: null,
    fullscreenTimeEl: null,
    volumeRange: null,
    volumeLabel: null,
    eqsBox: null,
    bassBox: null,
    loudnessBox: null,
    speakerVolBox: null,
    presetBox: null,
    btEnableBtn: null,
    btDiscoverBtn: null,
    btScanBtn: null,
    btListContainer: null,
    btPairedList: null,
    btScannedList: null,
    btWrapper: null,
    btTable: null,
    btLastHash: "",
    submitRecordBtn: null,
    btToneBtn: null,
    dormancyBtn: null,
    wakeupBtn: null,
    wakeupBenchmark: null,
    asrMaxDuration: null,
    asrMaxDurationLabel: null,
    textWindow: null,
    colorPicker: null,
    voiceReportingPanel: null,
    autoRestartPanel: null,
  },
  timers = {
    load: null,
    login: -1,
    qrState: -1,
    qrLoad: -1,
    loginResult: -1,
    trackInfo: -1,
    progress: -1,
    background: -1,
    deviceInfo: -1,
    bluetooth: -1,
    soundEffects: -1,
    wakeupBenchmark: -1,
    asrDuration: -1,
    connect: -1,
    ping: -1,
    lyrics: -1,
    infoRefresh: -1,
    screen: -1,
    titleScroll: -1,
    connectTimeout: -1,
    rebootEcho: -1,
    unisoundInit: -1,
    unisoundInitBackup: -1,
    longPress: -1,
    listClick: -1,
    loginState: -1,
    mouseWheel: -1,
  };
function padZero(value, width) {
  for (var text = String(value); text.length < width;) text = "0" + text;
  return text;
}
function flatten(items) {
  for (var flattenedItems = [], itemIndex = 0; itemIndex < items.length; itemIndex++)
    if (Array.isArray(items[itemIndex]))
      for (
        var nestedItems = flatten(items[itemIndex]), nestedIndex = 0;
        nestedIndex < nestedItems.length;
        nestedIndex++
      )
        flattenedItems.push(nestedItems[nestedIndex]);
    else flattenedItems.push(items[itemIndex]);
  return flattenedItems;
}
function arrIncludes(items, value) {
  if (!items) return !1;
  for (var index = 0; index < items.length; index++) if (items[index] === value) return !0;
  return !1;
}
function removeEl(element) {
  element && element.parentNode && element.parentNode.removeChild(element);
}
function fireEvent(element, eventType) {
  try {
    var event = document.createEvent("HTMLEvents");
    (event.initEvent(eventType, !0, !0), element.dispatchEvent(event));
  } catch (error) {
    try {
      element.fireEvent("on" + eventType);
    } catch (error2) {}
  }
}
function $(selector, parentElement) {
  return (parentElement || document).querySelector(selector);
}
function $$(selector, parentElement) {
  return Array.prototype.slice.call((parentElement || document).querySelectorAll(selector));
}
function makeEl(tagName, attributes) {
  var children = Array.prototype.slice.call(arguments, 2),
    element = document.createElement(tagName);
  if (attributes)
    for (var attributeName in attributes)
      if (Object.prototype.hasOwnProperty.call(attributes, attributeName)) {
        var attributeValue = attributes[attributeName];
        if (void 0 !== attributeValue)
          if ("style" === attributeName && "object" == typeof attributeValue)
            for (var styleName in attributeValue)
              Object.prototype.hasOwnProperty.call(attributeValue, styleName) &&
                (element.style[styleName] = attributeValue[styleName]);
          else
            "class" === attributeName || "className" === attributeName
              ? (element.className = attributeValue)
              : "html" === attributeName
                ? (element.innerHTML = attributeValue)
                : "text" === attributeName
                  ? (element.textContent = attributeValue)
                  : 0 === attributeName.indexOf("on") && "function" == typeof attributeValue
                    ? (element[attributeName.toLowerCase()] = attributeValue)
                    : attributeName in element
                      ? (element[attributeName] = attributeValue)
                      : element.setAttribute(attributeName, attributeValue);
      }
  var inputType = String(element.type || "").toLowerCase();
  ("button" === tagName ||
    ("input" === tagName && /^(button|submit|reset)$/.test(inputType)) ||
    (attributes &&
      "function" == typeof attributes.onclick &&
      !/^(input|select|textarea)$/.test(tagName))) &&
    element.classList.add("app_btn");
  for (
    var childNodes = flatten(children), childIndex = 0;
    childIndex < childNodes.length;
    childIndex++
  ) {
    var child = childNodes[childIndex];
    null != child &&
      !1 !== child &&
      element.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}
function makeButton(label, onClick, attributes) {
  var options = { type: "button", value: label, className: "btn", onclick: onClick };
  if (attributes)
    for (var key in attributes)
      Object.prototype.hasOwnProperty.call(attributes, key) && (options[key] = attributes[key]);
  return makeEl("input", options);
}
function makeText(text, style, attributes = {}) {
  return makeEl("text", {
    innerHTML: null == text ? "" : text,
    style: style || "",
    ...attributes,
  });
}
function makeDiv(style, attributes = {}) {
  return makeEl("div", { style: style || "", ...attributes });
}
function isEchoVer(minimumVersion) {
  var currentVersion = Number(state.ver),
    requiredVersion = Number(minimumVersion);
  return isFinite(currentVersion) && isFinite(requiredVersion) && currentVersion >= requiredVersion;
}
function formatBuildTimestamp(timestamp) {
  if (
    "number" != typeof timestamp ||
    !isFinite(timestamp) ||
    timestamp <= 0 ||
    Math.floor(timestamp) !== timestamp ||
    timestamp > 86399999712e5
  )
    return "未知";
  var date = new Date(timestamp + 288e5);
  if (!isFinite(date.getTime()) || date.getUTCFullYear() > 9999) return "未知";
  function padTimestampPart(value, width) {
    for (var text = String(value); text.length < width;) text = "0" + text;
    return text;
  }
  return (
    padTimestampPart(date.getUTCFullYear(), 4) +
    "-" +
    padTimestampPart(date.getUTCMonth() + 1, 2) +
    "-" +
    padTimestampPart(date.getUTCDate(), 2) +
    " " +
    padTimestampPart(date.getUTCHours(), 2) +
    ":" +
    padTimestampPart(date.getUTCMinutes(), 2) +
    ":" +
    padTimestampPart(date.getUTCSeconds(), 2) +
    "." +
    padTimestampPart(date.getUTCMilliseconds(), 3) +
    " +08:00"
  );
}
function getConfirmedBuildTimestamp() {
  return null != state.confirmedEchoVersion &&
    Number(state.ver) === state.confirmedEchoVersion &&
    state.confirmedEchoIp === state.ip &&
    state.confirmedEchoWs === state.ws &&
    state.ws &&
    state.ws.readyState === WebSocket.OPEN
    ? state.confirmedEchoBuildTimestamp
    : null;
}
function updateVersionFooter() {
  var verDivElement = $("#ver_div");
  if (verDivElement) {
    var socket =
        null != state.confirmedEchoVersion &&
        Number(state.ver) === state.confirmedEchoVersion &&
        state.confirmedEchoIp === state.ip &&
        state.confirmedEchoWs === state.ws &&
        state.ws &&
        state.ws.readyState === WebSocket.OPEN,
      text = socket
        ? '<a href="javascript:openVersionInfo();">版本号：' + state.confirmedEchoVersion + "</a>"
        : '<a href="javascript:app_down();">下载APP</a>';
    (window.plus &&
      (state.version && state.version.app > plus.runtime.versionCode
        ? (text =
            '<a href="javascript:app_down();">APP有更新：' +
            state.version.app.toString().split("").join(".") +
            "</a>")
        : socket || (text = "")),
      verDivElement.innerHTML !== text &&
        ((verDivElement.innerHTML = text), ui.applyLyricsModeHeight && ui.applyLyricsModeHeight()),
      verDivElement.title && (verDivElement.title = ""));
  }
}
function hasMusicQueueCapability() {
  var confirmedEchoVersion = state.confirmedEchoVersion;
  return (
    "number" == typeof confirmedEchoVersion &&
    isFinite(confirmedEchoVersion) &&
    confirmedEchoVersion >= 1887 &&
    Number(state.ver) === confirmedEchoVersion &&
    state.confirmedEchoIp === state.ip &&
    state.confirmedEchoWs === state.ws &&
    !!state.ws &&
    state.ws.readyState === WebSocket.OPEN
  );
}
function musicQueueContext() {
  return { epoch: state.musicCapabilityEpoch, ip: state.ip, ws: state.ws };
}
function isMusicQueueContextCurrent(context) {
  return (
    hasMusicQueueCapability() &&
    context.epoch === state.musicCapabilityEpoch &&
    context.ip === state.ip &&
    context.ws === state.ws
  );
}
function confirmEchoVersion(versionInfo) {
  var versionInfo2 = versionInfo && versionInfo.ver,
    numericValue =
      "number" == typeof versionInfo2 ||
      ("string" == typeof versionInfo2 && "" !== versionInfo2.trim())
        ? Number(versionInfo2)
        : NaN;
  isFinite(numericValue) || (numericValue = null);
  var buildTimestamp =
      versionInfo && "未知" !== formatBuildTimestamp(versionInfo.build_timestamp)
        ? versionInfo.build_timestamp
        : null,
    value =
      state.confirmedEchoVersion !== numericValue ||
      state.confirmedEchoIp !== state.ip ||
      state.confirmedEchoWs !== state.ws ||
      state.confirmedEchoBuildTimestamp !== buildTimestamp;
  ((state.confirmedEchoVersion === numericValue &&
    state.confirmedEchoIp === state.ip &&
    state.confirmedEchoWs === state.ws) ||
    (state.musicCapabilityEpoch = (state.musicCapabilityEpoch || 0) + 1),
    (state.confirmedEchoVersion = numericValue),
    (state.confirmedEchoIp = state.ip),
    (state.confirmedEchoWs = state.ws),
    (state.confirmedEchoBuildTimestamp = buildTimestamp),
    value && "function" == typeof closeVersionInfoWindow && closeVersionInfoWindow(),
    updateVersionFooter(),
    syncMusicQueueCapability());
}
function resetEchoVersionConfirmation() {
  ((state.confirmedEchoVersion = null),
    (state.confirmedEchoIp = null),
    (state.confirmedEchoWs = null),
    (state.confirmedEchoBuildTimestamp = null),
    (state.musicCapabilityEpoch = (state.musicCapabilityEpoch || 0) + 1),
    "function" == typeof closeVersionInfoWindow && closeVersionInfoWindow(),
    updateVersionFooter(),
    syncMusicQueueCapability());
}
function syncMusicQueueCapability() {
  var value = hasMusicQueueCapability(),
    musicBtnSearchElement = $("#music_btn_search");
  if (
    (musicBtnSearchElement &&
      (musicBtnSearchElement.style.display = value ? "inline-flex" : "none"),
    ui.playlistTable && ui.playlistTable._queueCapability !== value)
  ) {
    ui.playlistTable._queueCapability = value;
    for (
      var dragHandleElement = ui.playlistTable.querySelectorAll(".drag_handle"), index = 0;
      index < dragHandleElement.length;
      index++
    )
      dragHandleElement[index].style.display = value ? "inline-flex" : "none";
  }
  value ||
    ("function" == typeof attachQueueRowDrag &&
      (attachQueueRowDrag.active &&
        attachQueueRowDrag.active.cancel &&
        attachQueueRowDrag.active.cancel(),
      (attachQueueRowDrag.pending = null)),
    "function" == typeof MUSIC_SEARCH_CANCEL &&
      (MUSIC_SEARCH_CANCEL(),
      $("#music_search_wrap") && ui.popup && ui.popup.onclose && ui.popup.onclose()));
}
function isUnisoundVer(minimumVersion) {
  var currentVersion = Number(state.uVer);
  return isFinite(currentVersion) && currentVersion > 1e3 && currentVersion + 1 > minimumVersion;
}
var urlParams = {
  all: function () {
    var options = {},
      text = location.search.replace(/^\?/, "");
    if (!text) return options;
    for (var items = text.split("&"), index = 0; index < items.length; index++)
      if (items[index]) {
        var items2 = items[index].split("=");
        options[decodeURIComponent(items2[0])] =
          items2.length > 1 ? decodeURIComponent(items2[1]) : null;
      }
    return options;
  },
  get: function (value) {
    for (
      var value2 = Array.isArray(value) ? value : [value],
        value3 = urlParams.all(),
        options = {},
        index = 0,
        index2 = 0;
      index2 < value2.length;
      index2++
    )
      Object.prototype.hasOwnProperty.call(value3, value2[index2]) &&
        ((options[value2[index2]] = value3[value2[index2]]), index++);
    return index ? options : null;
  },
  put: function (value) {
    var value2 = urlParams.all();
    for (var key in value)
      Object.prototype.hasOwnProperty.call(value, key) && (value2[key] = value[key]);
    urlParams.set(value2);
  },
  del: function (value) {
    for (
      var value2 = urlParams.all(), value3 = Array.isArray(value) ? value : [value], index = 0;
      index < value3.length;
      index++
    )
      delete value2[value3[index]];
    urlParams.set(value2);
  },
  set: function (value) {
    for (var items = [], value2 = Object.keys(value), index = 0; index < value2.length; index++) {
      var item = value[value2[index]];
      void 0 !== item &&
        items.push(
          null === item
            ? encodeURIComponent(value2[index])
            : encodeURIComponent(value2[index]) + "=" + encodeURIComponent(item),
        );
    }
    history.replaceState(null, "", location.pathname + (items.length ? "?" + items.join("&") : ""));
  },
};
function getparam(keys) {
  return urlParams.get(keys);
}
function putparam(parameters) {
  urlParams.put(parameters);
}
function delparam(keys) {
  urlParams.del(keys);
}
var wsCallbackSequence = 0;
function sendWs(message, callback, timeoutMs) {
  var requestId,
    timeoutId,
    socket = state.ws,
    hasCallback = "function" == typeof callback,
    isSettled = !1;
  function completeRequest(response) {
    isSettled ||
      ((isSettled = !0),
      clearTimeout(timeoutId),
      requestId &&
        state.callbacks[requestId] === completeRequest &&
        delete state.callbacks[requestId],
      hasCallback &&
        setTimeout(function () {
          callback(response);
        }, 0));
  }
  if (!socket || socket.readyState !== WebSocket.OPEN) return (completeRequest(!1), !1);
  try {
    if (
      ("string" == typeof message && (message = JSON.parse(message)),
      "send_message" === message.type &&
        4 === Number(message.what) &&
        -1 !== [27, 28, 29].indexOf(Number(message.arg1)) &&
        !hasMusicQueueCapability())
    )
      return (completeRequest(!1), !1);
    var outgoingMessage = {};
    for (var field in message)
      Object.prototype.hasOwnProperty.call(message, field) &&
        (outgoingMessage[field] = message[field]);
    if (hasCallback) {
      if (
        ((requestId =
          outgoingMessage.type_id ||
          outgoingMessage.type + "_" + Date.now() + "_" + ++wsCallbackSequence),
        state.callbacks[requestId])
      )
        return (completeRequest(!1), !1);
      outgoingMessage.type_id = requestId;
    }
    var serializedMessage = JSON.stringify(outgoingMessage);
    return (
      hasCallback &&
        ((completeRequest.ws = socket),
        (state.callbacks[requestId] = completeRequest),
        (timeoutId = setTimeout(function () {
          completeRequest(!1);
        }, timeoutMs || 6e3))),
      socket.send(serializedMessage),
      !0
    );
  } catch (error) {
    return (completeRequest(!1), !1);
  }
}
function cancelWsCallbacks(socket) {
  var callbacks = [];
  for (var callbackId in state.callbacks)
    Object.prototype.hasOwnProperty.call(state.callbacks, callbackId) &&
      state.callbacks[callbackId].ws === socket &&
      callbacks.push(state.callbacks[callbackId]);
  for (var index = 0; index < callbacks.length; index++) callbacks[index](!1);
}
function sendAction(messageType, firstArgument, secondArgument, payload, extraFields) {
  var message = {
    type: "send_message",
    what: messageType,
    arg1: firstArgument,
    arg2: secondArgument,
    obj: payload,
  };
  if (extraFields)
    for (var field in extraFields)
      Object.prototype.hasOwnProperty.call(extraFields, field) &&
        (message[field] = extraFields[field]);
  sendWs(message);
}
function sendToUnisound(message) {
  sendWs({ type: "send_to_unisound", data: message });
}
function runShell(command, requestType) {
  var message = { type: "shell", shell: command };
  (requestType && (message.type_id = requestType), sendWs(message));
}
function msToTime(milliseconds) {
  var totalSeconds = Math.floor(milliseconds / 1e3);
  return padZero(Math.floor(totalSeconds / 60), 2) + ":" + padZero(totalSeconds % 60, 2);
}
function formatUnixTime(timestamp) {
  var date = new Date(1e3 * parseInt(timestamp, 10));
  return isNaN(date.getTime())
    ? ""
    : date.getFullYear() +
        "-" +
        padZero(date.getMonth() + 1, 2) +
        "-" +
        padZero(date.getDate(), 2) +
        " " +
        padZero(date.getHours(), 2) +
        ":" +
        padZero(date.getMinutes(), 2) +
        ":" +
        padZero(date.getSeconds(), 2);
}
function formatDuration(milliseconds, showZeroUnits) {
  var days = Math.floor(milliseconds / 864e5),
    hours = Math.floor((milliseconds % 864e5) / 36e5),
    minutes = Math.floor((milliseconds % 36e5) / 6e4),
    seconds = Math.floor((milliseconds % 6e4) / 1e3);
  if (showZeroUnits) return days + " 天 " + hours + " 小时 " + minutes + " 分钟 " + seconds + " 秒";
  var parts = [];
  return (
    days && parts.push(days + " 天"),
    (hours || days) && parts.push(hours + " 小时"),
    (minutes || hours || days) && parts.push(minutes + " 分钟"),
    parts.push(seconds + " 秒"),
    parts.join(" ")
  );
}
function timeToMs(timeText) {
  var parts = timeText.split(":");
  return isNaN(parts[0]) ? timeText : 6e4 * parseInt(parts[0], 10) + 1e3 * parseFloat(parts[1]);
}
function setPageTitle(title) {
  ui.pageTitle &&
    ((title = String(null == title ? "" : title)),
    (ui.pageTitle._pageTitleText === title &&
      ui.pageTitle._pageTitleHtml === ui.pageTitle.innerHTML) ||
      ui.pageTitle.innerHTML === title ||
      ((ui.pageTitle.innerHTML = title),
      (ui.pageTitle._pageTitleText = title),
      (ui.pageTitle._pageTitleHtml = ui.pageTitle.innerHTML)));
}
var BACKGROUND_PROPS = [
  "background-image",
  "background-color",
  "background-position",
  "background-size",
  "background-repeat",
  "background-attachment",
  "background-origin",
  "background-clip",
];
function safeBackgroundUrl(url) {
  return !(url = String(url || "").trim()) || /[\u0000-\u0020\u007f"'<>\\]/.test(url)
    ? ""
    : /^https?:\/\/[^/]+/i.test(url) ||
        /^data:image\/(?:png|jpe?g|gif|webp|bmp|avif|x-icon);base64,[a-z0-9+/=]+$/i.test(url)
      ? url
      : "";
}
function backgroundImageUrl(url) {
  var value = /^url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s()]+))\s*\)$/i.exec(url || "");
  return value ? safeBackgroundUrl(value[1] || value[2] || value[3]) : "";
}
function parseBackgroundCss(cssText) {
  var style = document.createElement("div").style;
  style.cssText = String(cssText || "");
  var options = {},
    propertyValue = style.getPropertyValue("background-image"),
    url = backgroundImageUrl(propertyValue),
    isMatch = /url\s*\(/i.test(propertyValue) && !url;
  (BACKGROUND_PROPS.forEach(function (item) {
    var propertyValue3 = style.getPropertyValue(item);
    propertyValue3 &&
      !/expression\s*\(|javascript\s*:|[{}<>]/i.test(propertyValue3) &&
      (!/url\s*\(/i.test(propertyValue3) || ("background-image" === item && url)) &&
      (options[item] = propertyValue3);
  }),
    isMatch && delete options["background-image"]);
  var propertyValue2 = style.getPropertyValue("background");
  return (
    Object.keys(options).length ||
      !propertyValue2 ||
      /url\s*\(|expression\s*\(|javascript\s*:|[{}<>]/i.test(propertyValue2) ||
      (options.background = propertyValue2),
    { props: options, url: url }
  );
}
function animateCoverOpacity(element, value, value2, value3, value4, value5) {
  null != element._opacityFrame && cancelAnimationFrame(element._opacityFrame);
  var value6,
    value7 = (element._opacitySequence = (element._opacitySequence || 0) + 1);
  ((element.style.transition = "none"),
    (element.style.opacity = String(value)),
    (element._opacityDuration = value3),
    (element._opacityFrame = requestAnimationFrame(function value9(value8) {
      if (element._opacitySequence === value7)
        if (value4()) {
          null == value6 && (value6 = value8);
          var numericValue =
              "number" == typeof value8 ? Math.min(1, (value8 - value6) / value3) : 1,
            value10 = numericValue * numericValue * (3 - 2 * numericValue);
          ((element.style.opacity = String(value + (value2 - value) * value10)),
            numericValue < 1
              ? (element._opacityFrame = requestAnimationFrame(value9))
              : ((element._opacityFrame = null), value5 && value5()));
        } else element._opacityFrame = null;
    })));
}
function cancelBackgroundLayers(element, value, value2) {
  var element2 = element && element._backgroundLayers;
  if (element2) {
    var value22 = value2 && !value && element2.incoming && element2.fading;
    (element2.sequence++,
      value22 ||
        (element2.incoming &&
          (null != element2.incoming._opacityFrame &&
            cancelAnimationFrame(element2.incoming._opacityFrame),
          (element2.incoming._opacitySequence = (element2.incoming._opacitySequence || 0) + 1)),
        (element2.fading = !1),
        clearTimeout(element2.timer),
        null != element2.frame && cancelAnimationFrame(element2.frame),
        (element2.timer = element2.frame = null)),
      (element2.pendingReady = null),
      element2.loader && (element2.loader.onload = element2.loader.onerror = null),
      (element2.loader = null),
      (element2.requestedKey = ""),
      value &&
        ([element2.current, element2.incoming].forEach(function (item) {
          item && item.parentNode === element && element.removeChild(item);
        }),
        (element2.current = element2.incoming = null),
        (element2.url = "")));
  }
}
function settleBackgroundLayers(element, value) {
  value.incoming &&
    ((value.incoming.style.transition = "none"),
    (value.incoming.style.opacity = "1"),
    value.current && value.current.parentNode === element && element.removeChild(value.current),
    (value.current = value.incoming),
    (value.incoming = null));
}
function applyHomeBackgroundBlur(element, value) {
  var value2 = Math.max(0, Math.min(60, parseInt(value, 10) || 0)),
    value3 = Math.ceil((160 * value2) / 50);
  ((element.style.left = element.style.top = -value3 + "px"),
    (element.style.width = element.style.height =
      value3 ? "calc(100% + " + 2 * value3 + "px)" : "100%"),
    (element.style.backgroundAttachment = "scroll"),
    (element.style.filter = element.style.webkitFilter = value2 ? "blur(" + value2 + "px)" : ""));
}
function transitionBackground(element, value, value2) {
  if (element) {
    value2 = value2 || {};
    var backgroundLayers = element._backgroundLayers;
    backgroundLayers ||
      (backgroundLayers = element._backgroundLayers =
        { sequence: 0, current: null, incoming: null, url: "" });
    var value3 =
      (value2.mode || "") +
      ":" +
      JSON.stringify(value.props) +
      ":" +
      (null == value2.blur ? "" : value2.blur);
    if (
      backgroundLayers.requestedKey !== value3 ||
      backgroundLayers.hostname !== state.hostname ||
      (backgroundLayers.guard && !backgroundLayers.guard())
    ) {
      cancelBackgroundLayers(element, !1, !0);
      var sequence = backgroundLayers.sequence,
        hostname = state.hostname;
      if (
        ((backgroundLayers.hostname = hostname),
        (backgroundLayers.requestedKey = value3),
        (backgroundLayers.background = value),
        (backgroundLayers.cover = !!value2.cover),
        (backgroundLayers.guard = value2.guard),
        value.url)
      ) {
        var image = new Image();
        ((backgroundLayers.loader = image),
          (image.onload = function () {
            if (isCurrentTransition())
              if (((image.onload = image.onerror = null), "function" == typeof image.decode))
                try {
                  Promise.resolve(image.decode()).then(
                    applyLoadedBackground,
                    handleBackgroundError,
                  );
                } catch (error) {
                  handleBackgroundError();
                }
              else applyLoadedBackground();
          }),
          (image.onerror = handleBackgroundError),
          (image.src = value.url));
      } else applyLoadedBackground();
    }
  }
  function isCurrentTransition() {
    return (
      element._backgroundLayers === backgroundLayers &&
      backgroundLayers.sequence === sequence &&
      state.hostname === hostname &&
      !1 !== element.isConnected &&
      (!value2.guard || value2.guard())
    );
  }
  function applyLoadedBackground() {
    if (isCurrentTransition()) {
      backgroundLayers.loader = null;
      var cover =
        value2.cover &&
        ((backgroundLayers.incoming && !backgroundLayers.incoming._coverBackground) ||
          (backgroundLayers.current && !backgroundLayers.current._coverBackground));
      if (
        (cover &&
          (backgroundLayers.incoming &&
            (null != backgroundLayers.incoming._opacityFrame &&
              cancelAnimationFrame(backgroundLayers.incoming._opacityFrame),
            (backgroundLayers.incoming._opacitySequence =
              (backgroundLayers.incoming._opacitySequence || 0) + 1)),
          clearTimeout(backgroundLayers.timer),
          null != backgroundLayers.frame && cancelAnimationFrame(backgroundLayers.frame),
          (backgroundLayers.timer = backgroundLayers.frame = null),
          (backgroundLayers.fading = !1),
          (backgroundLayers.pendingReady = null)),
        backgroundLayers.incoming && backgroundLayers.fading)
      )
        backgroundLayers.pendingReady = applyLoadedBackground;
      else {
        settleBackgroundLayers(element, backgroundLayers);
        var container = document.createElement("div");
        if (
          ((container.className = "background_image_layer"),
          (container._backgroundUrl = value.url),
          (container._coverBackground = !!value2.cover),
          (container._homeBackground = element === ui.background && !value2.cover && !!value.url),
          Object.keys(value.props).forEach(function (item) {
            container.style.setProperty(item, value.props[item]);
          }),
          value2.cover &&
            ((container.style.width = container.style.height = "120%"),
            (container.style.transform = "translate(-8%,-5%)")),
          null != value2.blur)
        )
          container.style.filter = container.style.webkitFilter = value2.blur
            ? "blur(" + value2.blur + "px)" + (value2.cover ? " brightness(0.9)" : "")
            : "";
        else if (element === ui.background) {
          var value4 = Math.max(
            0,
            Math.min(
              60,
              parseInt(localStorage.getItem(state.hostname + "_BackgroundBlur"), 10) || 0,
            ),
          );
          container.style.filter = container.style.webkitFilter = value4
            ? "blur(" + value4 + "px)"
            : "";
        }
        container._homeBackground &&
          applyHomeBackgroundBlur(container, null == value2.blur ? value4 : value2.blur);
        var value5 =
          "function" == typeof prefersReducedDialogMotion && prefersReducedDialogMotion();
        if (
          ((container.style.transition = value5 || cover ? "none" : "opacity 0.2s ease"),
          (container.style.opacity = !backgroundLayers.current || value5 || cover ? "1" : "0"),
          element.appendChild(container),
          (element.style.backgroundImage = "none"),
          element === ui.background &&
            ((element.style.width = element.style.height = "100%"),
            (element.style.overflow = container._homeBackground ? "hidden" : "")),
          (element.style.transform = element.style.filter = element.style.webkitFilter = ""),
          (backgroundLayers.url = value.url),
          !backgroundLayers.current || value5 || cover)
        )
          return (
            backgroundLayers.current &&
              backgroundLayers.current.parentNode === element &&
              element.removeChild(backgroundLayers.current),
            (backgroundLayers.current = container),
            cover &&
              !value5 &&
              ((container.style.transform = "translate(-8%,-5%) scale(1.04)"),
              container.offsetWidth,
              (container.style.transition = "transform 0.2s ease"),
              (backgroundLayers.frame = requestAnimationFrame(function () {
                isCurrentTransition() &&
                  backgroundLayers.current === container &&
                  !backgroundLayers.incoming &&
                  ((backgroundLayers.frame = null),
                  (container.style.transform = "translate(-8%,-5%)"));
              }))),
            void (value2.onReady && value2.onReady())
          );
        ((backgroundLayers.incoming = container),
          container.offsetWidth,
          (backgroundLayers.frame = requestAnimationFrame(function () {
            isCurrentTransition() &&
              backgroundLayers.incoming === container &&
              ((backgroundLayers.frame = null),
              (backgroundLayers.fading = !0),
              animateCoverOpacity(
                container,
                0,
                1,
                200,
                function () {
                  return (
                    element._backgroundLayers === backgroundLayers &&
                    backgroundLayers.incoming === container &&
                    state.hostname === hostname &&
                    !1 !== element.isConnected
                  );
                },
                function () {
                  (value2.onReady && isCurrentTransition() && value2.onReady(),
                    (backgroundLayers.timer = setTimeout(function () {
                      if (
                        element._backgroundLayers === backgroundLayers &&
                        backgroundLayers.incoming === container &&
                        state.hostname === hostname &&
                        !1 !== element.isConnected
                      ) {
                        ((backgroundLayers.timer = null),
                          (backgroundLayers.fading = !1),
                          settleBackgroundLayers(element, backgroundLayers));
                        var pendingReady = backgroundLayers.pendingReady;
                        ((backgroundLayers.pendingReady = null), pendingReady && pendingReady());
                      }
                    }, 20)));
                },
              ));
          })));
      }
    }
  }
  function handleBackgroundError() {
    isCurrentTransition() &&
      ((image.onload = image.onerror = null),
      (backgroundLayers.loader = null),
      (backgroundLayers.requestedKey = ""),
      backgroundLayers.fading || settleBackgroundLayers(element, backgroundLayers),
      value2.onError && value2.onError());
  }
}
function setBackgroundCss(cssText, options) {
  var background =
    "#background_div" === (options = options || "#background_div")
      ? ui.background
      : document.getElementById(options.replace(/^#/, ""));
  background &&
    (background === ui.background && (state.coverBackgroundApplied = !1),
    transitionBackground(background, parseBackgroundCss(cssText), {
      mode: "stored",
      guard: function () {
        return "#background_div" !== options || ui.background === background;
      },
      onReady: function () {
        background === ui.background && updateStatusBar();
      },
      onError: function () {
        setBackgroundCss(DEFAULT_BACKGROUND, options);
      },
    }),
    background === ui.background &&
      state.lrcFullscreen &&
      "function" == typeof updateFullscreenBg &&
      updateFullscreenBg(!0));
}
function restoreBackground() {
  (setBackgroundCss(localStorage.getItem(state.hostname + "_background") || DEFAULT_BACKGROUND),
    ui.main &&
      (ui.main.classList && ui.main.classList.contains("mask") && ui.main.classList.remove("mask"),
      ui.main.style &&
        ((ui.main.style.backdropFilter = ""), (ui.main.style.webkitBackdropFilter = ""))),
    ui.qualitySelect && ui.qualitySelect.style && (ui.qualitySelect.style.backdropFilter = ""),
    updateStatusBar());
}
function applyBackground(cssText) {
  var dEFAULTBACKGROUND,
    textElement = $("#text");
  if ("" === cssText)
    ((dEFAULTBACKGROUND = DEFAULT_BACKGROUND),
      localStorage.removeItem(state.hostname + "_background"),
      textElement && (textElement.value = "已恢复默认背景！"));
  else {
    if (!(cssText = safeBackgroundUrl(cssText)))
      return void (textElement && (textElement.value = "背景图片地址无效！"));
    ((dEFAULTBACKGROUND = 'background: url("' + cssText + '") center top / cover no-repeat fixed;'),
      localStorage.setItem(state.hostname + "_background", dEFAULTBACKGROUND),
      textElement && (textElement.value = "设置背景图片成功！"));
  }
  (setBackgroundCss(dEFAULTBACKGROUND),
    updateStatusBar(),
    setTimeout(function () {
      showAppAlert(textElement ? textElement.value : "");
    }, 600));
}
function supportsBackdropFilter() {
  return (
    CSS.supports("backdrop-filter", "blur(10px)") ||
    CSS.supports("-webkit-backdrop-filter", "blur(10px)")
  );
}
function findTextColor(backgroundColor) {
  if (/^(rgb|RGB)/.test(backgroundColor))
    return resBgColor(backgroundColor.replace(/(?:\(|\)|rgb|RGB)*/g, "").split(","));
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(backgroundColor)) return !1;
  var value = backgroundColor.toLowerCase();
  if (4 === value.length) {
    for (var text = "#", index = 1; index < 4; index++) text += value[index] + value[index];
    value = text;
  }
  for (var items = [], numericValue = 1; numericValue < 7; numericValue += 2)
    items.push(parseInt("0x" + value.slice(numericValue, numericValue + 2), 16));
  return resBgColor(items);
}
function resBgColor(value) {
  return 0.213 * value[0] + 0.715 * value[1] + 0.072 * value[2] > 127.5 ? "#000000" : "#ffffff";
}
function getBackgroundData() {
  var background = ui.background,
    background2 = background && background._backgroundLayers;
  if (background2) {
    var incoming =
      background2.incoming && "1" === background2.incoming.style.opacity
        ? background2.incoming
        : background2.current;
    return (incoming && incoming._backgroundUrl) || "";
  }
  return background ? backgroundImageUrl(background.style.backgroundImage) : "";
}
function getBackgroundColorAt(position) {
  var backgroundData = getBackgroundData();
  if (backgroundData) {
    var image = new Image();
    ((image.src = backgroundData),
      (image.onload = function () {
        var canvas = document.createElement("canvas");
        ((canvas.width = this.width), (canvas.height = this.height));
        var drawingContext = canvas.getContext("2d");
        drawingContext.drawImage(image, 0, 0);
        for (
          var payload = drawingContext.getImageData(parseInt(canvas.width / 2, 10), 10, 1, 1).data,
            text2 = "",
            index2 = 0;
          index2 < 3;
          index2++
        )
          text2 += padZero(payload[index2].toString(16), 2);
        position("#" + text2);
      }));
  } else {
    for (
      var backgroundColor = document.body.style.backgroundColor,
        items = backgroundColor.substr(4, backgroundColor.length - 1).split(","),
        text = "",
        index = 0;
      index < items.length;
      index++
    )
      text += padZero(parseInt(items[index], 10).toString(16), 2);
    position("#" + text);
  }
}
function updateStatusBar() {
  if (ui.main && ui.background && ui.container) {
    var value = Math.max(
      0,
      Math.min(60, parseInt(localStorage.getItem(state.hostname + "_BackgroundBlur"), 10) || 0),
    );
    ui.background.style.filter = ui.background.style.webkitFilter = "";
    var backgroundLayers = ui.background._backgroundLayers;
    backgroundLayers &&
      [backgroundLayers.current, backgroundLayers.incoming].forEach(function (element) {
        element && element._homeBackground
          ? applyHomeBackgroundBlur(element, value)
          : element &&
            !element._coverBackground &&
            (element.style.filter = element.style.webkitFilter =
              value ? "blur(" + value + "px)" : "");
      });
    if (window.plus) {
      var statusBarElement = $("#StatusBar");
      if (statusBarElement)
        if (plus.navigator.isImmersedStatusbar()) {
          ((statusBarElement.style.height =
            parseInt(plus.navigator.getStatusbarHeight() / 2, 10) + 10 + "px"),
            (statusBarElement.style.display = "block"));
          try {
            var colorClass = plus.android.importClass("android.graphics.Color");
            plus.android.importClass("android.view.Window");
            var window2 = plus.android.runtimeMainActivity().getWindow(),
              windowManagerClass = plus.android.importClass("android.view.WindowManager"),
              viewClass = plus.android.importClass("android.view.View");
            (window2.clearFlags(
              windowManagerClass.LayoutParams.FLAG_TRANSLUCENT_STATUS |
                windowManagerClass.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION,
            ),
              window2
                .getDecorView()
                .setSystemUiVisibility(
                  viewClass.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                    viewClass.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                    viewClass.SYSTEM_UI_FLAG_LAYOUT_STABLE,
                ),
              window2.addFlags(windowManagerClass.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS),
              window2.setNavigationBarColor(colorClass.TRANSPARENT),
              plus.navigator.hideSystemNavigation());
          } catch (error) {}
        } else
          ((statusBarElement.style.display = "none"),
            getBackgroundColorAt(function (value2) {
              (plus.navigator.setStatusBarBackground(value2),
                plus.navigator.setStatusBarStyle(
                  "#000000" === findTextColor(value2) ? "dark" : "light",
                ));
            }));
    }
    ((ui.main.style =
      "position:fixed;z-index:1;left:0;top:0;width:100%;height:100%;overflow:auto;background-color:rgba(var(--mask-color),0);"),
      (ui.container.style.width = "99%"),
      ui.qualitySelect && ui.qualitySelect.style && (ui.qualitySelect.style.backdropFilter = ""),
      ui.main.classList && ui.main.classList.contains("mask") && ui.main.classList.remove("mask"));
  }
}
function setCookie(name, value, duration) {
  var date = new Date();
  (date.setTime(date.getTime() + 1e3 * duration),
    (document.cookie = name + "=" + value + "; expires=" + date.toGMTString()));
}
function getCookie(name) {
  for (
    var value = name + "=", items = document.cookie.split(";"), index = 0;
    index < items.length;
    index++
  ) {
    var text = items[index].replace(/^\s+|\s+$/g, "");
    if (0 === text.indexOf(value)) return text.substring(value.length);
  }
  return "";
}
function insertStyle(cssText) {
  var stylesheet = makeEl("style", { type: "text/css" });
  (stylesheet.appendChild(document.createTextNode(cssText)), document.head.appendChild(stylesheet));
}
function goPage(pagePath) {
  location.href = R1Config.assetUrl(pagePath) + "?" + Date.now();
}
function openDlna() {
  goPage("pages/dlna/");
}
function openMdns() {
  goPage("pages/mdns/");
}
function openAdb() {
  var url = new URL(location.href);
  ((url = new URL(R1Config.assetUrl("pages/adb/"))),
    (url.search = "?" + Date.now()),
    window.plus ? plus.webview.create(url.href).show() : (location.href = url.href));
}
function openDeviceScan() {
  goPage("pages/device-scan/");
}
var APP_DIALOG_EXIT_MS = 160,
  popupRenderHosts = [];
function prefersReducedDialogMotion() {
  try {
    return (
      "undefined" != typeof window &&
      "function" == typeof window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch (error) {
    return !1;
  }
}
function retainPopupLayer(element) {
  (-1 === popupRenderHosts.indexOf(element) && popupRenderHosts.push(element),
    popupRenderHosts.forEach(function (element2, index) {
      element2.style.zIndex = 9998 + 2 * index;
    }));
}
function releasePopupLayer(element) {
  var value = popupRenderHosts.indexOf(element);
  (-1 !== value && popupRenderHosts.splice(value, 1),
    popupRenderHosts.forEach(function (element2, index) {
      element2.style.zIndex = 9998 + 2 * index;
    }));
}
function createPopupHost(options) {
  var container = makeEl("div", {
    class: "popup2 app_popup_host",
    style:
      "text-align:center;display:" + (!1 === (options = options || {}).open ? "none" : "block"),
  });
  if (
    ((container._popupBlur = makeEl("div", { class: "app_popup_blur" })),
    !1 === options.blur &&
      (container._popupBlur.style.backdropFilter = container._popupBlur.style.webkitBackdropFilter =
        "none"),
    (container._popupDim = makeEl("div", { class: "app_popup_dim" })),
    (container.content = container._popupContent = makeEl("div", { class: "app_popup_content" })),
    container.appendChild(container._popupBlur),
    container.appendChild(container._popupDim),
    container.appendChild(container.content),
    (container._popupOpen = !1 !== options.open),
    (container._popupCleanups = []),
    container.addEventListener)
  ) {
    function blockInactivePopupEvents(event) {
      (container._popupOpen &&
        popupRenderHosts
          .filter(function (item) {
            return item._popupOpen;
          })
          .slice(-1)[0] === container) ||
        (event.preventDefault(), event.stopImmediatePropagation());
    }
    ["click", "pointerdown", "keydown", "submit", "focusin"].forEach(function (item) {
      container.addEventListener(item, blockInactivePopupEvents, !0);
    });
  }
  return (
    (container.onclose = function () {
      return closePopupAnimated(container);
    }),
    (container.onclick = function (event) {
      (event.target !== container && event.target !== container.content) || container.onclose();
    }),
    document.body.appendChild(container),
    container._popupOpen && retainPopupLayer(container),
    container
  );
}
function showFlowNotice(kind, title, message) {
  var flowNotice = ui.flowNotice;
  if (
    !flowNotice ||
    !flowNotice.host._popupOpen ||
    flowNotice.kind !== kind ||
    flowNotice.title.textContent !== title
  ) {
    clearFlowNotice();
    var popupHost = createPopupHost({ blur: !1 });
    ((popupHost.onclose = function () {
      return !1;
    }),
      (popupHost.onclick = function () {}));
    var container = makeEl("div", {
        class: "app_dialog_wrap app_flow_wrap",
        style:
          "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:max-content;min-width:min(280px,92vw);max-width:92vw;z-index:2",
      }),
      container2 = makeEl("div", {
        class: "app_dialog_panel",
        role: "dialog",
        "aria-modal": "true",
        style:
          "background:transparent;border-radius:15px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.5);max-height:80vh;display:flex;flex-direction:column;-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.12)",
      }),
      container3 = makeEl("div", {
        style:
          "background:var(--primary-blue);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0",
      }),
      heading = makeEl("h3", {
        style:
          "font-size:16px;color:#fff;margin:0;text-shadow:none;font-weight:600;text-align:left;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
      });
    container3.appendChild(heading);
    var container4 = makeEl("div", {
        style: "flex:1;overflow-x:hidden;overflow-y:auto;padding:15px 20px",
      }),
      container5 = makeEl("div", {
        role: "status",
        "aria-live": "polite",
        style:
          "font-size:13px;line-height:1.6;white-space:pre-line;word-break:break-all;color:#fff;text-align:left;text-shadow:none;max-width:560px",
      }),
      container6 = makeEl("div", {
        class: "app_flow_actions",
        style: "display:flex;gap:10px;margin-top:15px",
      });
    (container4.appendChild(container5),
      container4.appendChild(container6),
      container2.appendChild(container3),
      container2.appendChild(container4),
      container.appendChild(container2),
      popupHost.content.appendChild(container),
      (popupHost._popupSurface = container2),
      (flowNotice = ui.flowNotice =
        {
          kind: kind,
          host: popupHost,
          panel: container2,
          title: heading,
          message: container5,
          actions: container6,
        }),
      dialogContentMotion(container2, !1));
  }
  return (
    flowNotice.title.textContent !== title && (flowNotice.title.textContent = title),
    flowNotice.message.textContent !== message && (flowNotice.message.textContent = message),
    flowNotice
  );
}
function makeFlowButton(label, onClick, attributes) {
  var appDialogButton = createAppDialogButton(label, "normal", onClick);
  return (
    attributes &&
      Object.keys(attributes).forEach(function (item) {
        appDialogButton[item] = attributes[item];
      }),
    Object.defineProperty(appDialogButton, "value", {
      get: function () {
        return appDialogButton.textContent;
      },
      set: function (value) {
        appDialogButton.textContent = value;
      },
    }),
    appDialogButton
  );
}
function clearFlowNotice(kind) {
  var flowNotice = ui.flowNotice;
  (kind && flowNotice && flowNotice.kind !== kind) ||
    ((!kind || "unisound" === kind || (flowNotice && "unisound" === flowNotice.kind)) &&
      (clearTimeout(timers.loginState),
      clearTimeout(timers.unisoundInit),
      clearTimeout(timers.unisoundInitBackup),
      (timers.loginState = timers.unisoundInit = timers.unisoundInitBackup = -1)),
    flowNotice &&
      ((ui.flowNotice = null),
      state.unisoundSkipCheck &&
        state.unisoundSkipCheck.notice === flowNotice &&
        (clearTimeout(state.unisoundSkipCheck.timer), (state.unisoundSkipCheck = null)),
      closePopupAnimated(flowNotice.host)));
}
function ensurePopupHost() {
  return (
    (ui.popup && ui.popup._popupContent && ui.popup._popupOpen && !ui.popup._appDialogExit) ||
      (!ui.popup ||
        ((ui.popup._popupContent || ui.popup.children.length) &&
          (!ui.popup._popupContent ||
            ui.popup._popupOpen ||
            ui.popup._appDialogExit ||
            ui.popup.content.children.length)) ||
        ui.popup.remove(),
      (ui.popup = createPopupHost())),
    ui.popup
  );
}
function registerPopupCleanup(element, cleanup) {
  return (
    element &&
      element._popupOpen &&
      "function" == typeof cleanup &&
      element._popupCleanups.push(cleanup),
    element
  );
}
function restoreAnimatedDialog(element) {
  var appDialogExit = element._appDialogExit;
  (appDialogExit &&
    (clearTimeout(appDialogExit.timer),
    (element._appDialogExit = null),
    (element.style.pointerEvents = appDialogExit.pointerEvents),
    (element.inert = appDialogExit.inert),
    null === appDialogExit.ariaHidden
      ? element.removeAttribute("aria-hidden")
      : element.setAttribute("aria-hidden", appDialogExit.ariaHidden),
    appDialogExit.ids.forEach(function (item) {
      item.node.id = item.id;
    }),
    appDialogExit.controls.forEach(function (item) {
      (void 0 !== item.disabled && (item.node.disabled = item.disabled),
        (item.visual || []).forEach(function (input) {
          item.node.style.setProperty
            ? item.node.style.setProperty(input.name, input.value, input.priority)
            : (item.node.style[input.name] = input.value);
        }),
        null === item.ariaDisabled
          ? item.node.removeAttribute("aria-disabled")
          : item.node.setAttribute("aria-disabled", item.ariaDisabled),
        null === item.tabIndex
          ? item.node.removeAttribute("tabindex")
          : item.node.setAttribute("tabindex", item.tabIndex));
    })),
    element.classList.remove(
      "app_dialog_outgoing",
      "app_dlg_out",
      "app_backdrop_out",
      "app_surface_out",
      "app_content_out",
      "app_content_in",
    ),
    element._popupLightExit ||
      Array.prototype.slice.call(element.children).forEach(restoreAnimatedDialog));
}
function dialogContentMotion(element, value) {
  if (element) {
    var element2 =
      element.classList.contains("app_dialog_panel") || element.classList.contains("music_list_div")
        ? element
        : element.querySelector(".app_dialog_panel");
    element2 &&
      (element2.classList.remove("app_content_in", "app_content_out"),
      element2.offsetWidth,
      element2.classList.add(value ? "app_content_out" : "app_content_in"));
  }
}
function enterAnimatedDialog(value, value2) {
  value &&
    (restoreAnimatedDialog(value),
    value._popupDim && value._popupDim.classList.remove("app_backdrop_out"),
    dialogContentMotion(value2 || value._popupSurface || value, !1));
}
function reopenPopupHost(element) {
  return element && element._popupContent
    ? (ui.popup !== element && ui.popup && ui.popup._popupOpen && closePopupAnimated(ui.popup),
      enterAnimatedDialog(element),
      (element._popupOpen = !0),
      (element.style.display = "block"),
      element.parentNode !== document.body && document.body.appendChild(element),
      releasePopupLayer(element),
      retainPopupLayer(element),
      (ui.popup = element),
      element)
    : ensurePopupHost();
}
function dismissAnimatedDialog(element, value, value2) {
  if (((value2 = value2 || {}), !element || element._appDialogExit)) return !1;
  var options = {
    timer: null,
    pointerEvents: element.style.pointerEvents || "",
    inert: !!element.inert,
    ariaHidden: element.getAttribute("aria-hidden"),
    ids: [],
    controls: [],
  };
  ((element._appDialogExit = options),
    (element.style.pointerEvents = "none"),
    (element.inert = !0),
    element.setAttribute("aria-hidden", "true"),
    element._popupLightExit ||
      Array.prototype.slice
        .call(element.querySelectorAll("button,input,select,textarea,a[href],[tabindex]"))
        .forEach(function (element2) {
          var options2 = {
            node: element2,
            disabled: "disabled" in element2 ? element2.disabled : void 0,
            ariaDisabled: element2.getAttribute("aria-disabled"),
            tabIndex: element2.getAttribute("tabindex"),
            visual: [],
          };
          if ("undefined" != typeof window && "function" == typeof window.getComputedStyle) {
            var computedStyle = window.getComputedStyle(element2);
            [
              "opacity",
              "color",
              "-webkit-text-fill-color",
              "background-color",
              "background-image",
              "filter",
              "backdrop-filter",
              "-webkit-backdrop-filter",
              "box-shadow",
              "transform",
            ].forEach(function (item) {
              options2.visual.push({
                name: item,
                value: element2.style.getPropertyValue(item),
                priority: element2.style.getPropertyPriority(item),
                frozen: computedStyle.getPropertyValue(item),
              });
            });
          }
          options.controls.push(options2);
        }),
    options.controls.forEach(function (item) {
      var node = item.node;
      (item.visual.forEach(function (item2) {
        node.style.setProperty(item2.name, item2.frozen, "important");
      }),
        "disabled" in node && (node.disabled = !0),
        node.setAttribute("aria-disabled", "true"),
        node.setAttribute("tabindex", "-1"));
    }),
    !element._appDialogGuard &&
      element.addEventListener &&
      ((element._appDialogGuard = function (event) {
        element._appDialogExit && (event.preventDefault(), event.stopImmediatePropagation());
      }),
      [
        "click",
        "mousedown",
        "mouseup",
        "touchstart",
        "touchend",
        "pointerdown",
        "pointerup",
        "keydown",
        "keyup",
        "submit",
        "input",
        "change",
        "contextmenu",
      ].forEach(function (item) {
        element.addEventListener(item, element._appDialogGuard, !0);
      })),
    element.classList.add("app_dialog_outgoing"),
    dialogContentMotion(value2.surface || element, !0),
    element._popupDim && element._popupDim.classList.add("app_backdrop_out"),
    value2.releaseIds &&
      [element]
        .concat(Array.prototype.slice.call(element.querySelectorAll("[id]")))
        .forEach(function (item) {
          item.id && (options.ids.push({ node: item, id: item.id }), item.removeAttribute("id"));
        }));
  try {
    document.activeElement &&
      element.contains(document.activeElement) &&
      document.activeElement.blur();
  } catch (error) {}
  function finishDialogExit() {
    element._appDialogExit === options &&
      (value2.keepNode ? (element.style.display = "none") : element.remove(),
      value2.onFinish && value2.onFinish());
  }
  return (
    prefersReducedDialogMotion()
      ? finishDialogExit()
      : (options.timer = setTimeout(finishDialogExit, APP_DIALOG_EXIT_MS)),
    value && value(),
    !0
  );
}
function closePopupAnimated(value) {
  if (!value || !value._popupContent || !value._popupOpen || value._appDialogExit) return !1;
  ((value._popupOpen = !1),
    ui.popup === value &&
      (ui.popup =
        popupRenderHosts
          .filter(function (item) {
            return item._popupOpen && item !== value && item._sharedPopup;
          })
          .slice(-1)[0] || value));
  var call = value.call;
  value.call = null;
  var value2,
    value3 = value._popupCleanups.splice(0);
  if (
    (dismissAnimatedDialog(value, null, {
      keepNode: !!value._popupKeepNode,
      releaseIds: !value._popupKeepNode,
      surface: value._popupSurface,
      onFinish: function () {
        releasePopupLayer(value);
      },
    }),
    value3.concat("function" == typeof call ? [call] : []).forEach(function (item) {
      try {
        item();
      } catch (error) {
        value2 || (value2 = error);
      }
    }),
    value2)
  )
    throw value2;
  return !0;
}
function preparePopupDialog() {
  return ui.popup && ui.popup._popupOpen && (ui.popup.content.children.length || ui.popup.call)
    ? (closePopupAnimated(ui.popup), (ui.popup = createPopupHost()), ui.popup)
    : ensurePopupHost();
}
function createDialogPanel(content, options) {
  var host =
    (options = options || {}).host || (options.stack ? createPopupHost() : preparePopupDialog());
  ((host._sharedPopup = !0), (ui.popup = host));
  var container = makeEl("div", {
    class: "app_dialog_wrap",
    style:
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:auto;min-width:90%;max-width:92vw;z-index:2",
  });
  host.content.appendChild(container);
  var text =
    "background:transparent;border-radius:15px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.5);max-height:80vh;display:flex;flex-direction:column;";
  ((text +=
    "-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.12);"),
    options.width && (text += "width:" + options.width + ";"));
  var container2 = makeEl("div", { class: "app_dialog_panel", style: text }),
    container3 = makeEl("div", {
      style:
        "background:var(--primary-blue);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0",
    }),
    heading = makeEl("h3", {
      style:
        "font-size:16px;color:#fff;margin:0;text-shadow:none;font-weight:600;text-align:left;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
      html: content || "",
    });
  container3.appendChild(heading);
  var button = makeEl("button", {
    type: "button",
    html: "✕",
    class: "app_btn app_dialog_close app_dialog_close_icon",
    style:
      "border:none;background:none;color:#fff;font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;outline:none;flex-shrink:0;transition:transform 0.2s",
    onclick: function () {
      closePopupAnimated(host);
    },
  });
  (container3.appendChild(button), container2.appendChild(container3));
  var text2 = "flex:1;overflow-x:hidden;overflow-y:auto;";
  ((text2 += options.noPadding ? "" : "padding:15px 20px;"),
    options.bodyStyle && (text2 += options.bodyStyle));
  var container4 = makeEl("div", { style: text2 });
  (container2.appendChild(container4),
    container.appendChild(container2),
    dialogContentMotion(container2, !1));
  var options2 = {
    wrap: container,
    panel: container2,
    header: container3,
    body: container4,
    title: heading,
    closeBtn: button,
    host: host,
    close: function () {
      return closePopupAnimated(host);
    },
    onClose: function (value) {
      return (registerPopupCleanup(host, value), options2);
    },
    isOpen: function () {
      return !!host._popupOpen && !host._appDialogExit;
    },
  };
  return options2;
}
function createTextWindow(text, title, options) {
  var dialogPanel = createDialogPanel(text || "提示", { noPadding: !0 });
  (dialogPanel.wrap.classList.add("app_prompt_wrap"),
    (ui.textWindow = dialogPanel.wrap),
    (dialogPanel.title.style.fontSize = "15px"),
    (dialogPanel.title.title = text || "提示"),
    (dialogPanel.body.style.backgroundColor = "rgba(0,0,0,0.25)"),
    (dialogPanel.body.style.color = "#fff"),
    (dialogPanel.body.style.maxWidth = "90vw"),
    (dialogPanel.body.style.maxHeight = "60vh"));
  var textWindowTextElement = makeEl("div", {
      id: "text_window_text",
      style: "color:#fff;text-align:left;margin:10px 20px;text-shadow:none",
    }),
    items = String(title).split("\r\n");
  ((textWindowTextElement.innerHTML = items
    .map(function (item) {
      return "<text>" + item + "</text><br>";
    })
    .join("")),
    dialogPanel.body.appendChild(textWindowTextElement),
    dialogPanel.panel.appendChild(
      makeEl("span", {
        class: "app_btn app_dialog_close_option",
        style:
          "display:block;text-align:center;padding:10px;color:#fff;cursor:pointer;border-top:1px solid rgba(255,255,255,0.1)",
        html: "确认",
        onclick: dialogPanel.close,
      }),
    ),
    (dialogPanel.closeBtn.onclick = dialogPanel.close),
    (dialogPanel.host.call = options),
    dialogContentMotion(dialogPanel.panel, !1));
}
function createColorPicker() {
  if (ui.colorPicker)
    ui.colorPicker._dialog.isOpen() || reopenPopupHost(ui.colorPicker._dialog.host);
  else {
    var dialogPanel = createDialogPanel("设置氛围灯颜色");
    ((ui.colorPicker = dialogPanel.wrap), (ui.colorPicker._dialog = dialogPanel));
    var body = dialogPanel.body;
    ((body.style.color = "#fff"),
      body.appendChild(makeDiv("height:10px")),
      body.appendChild(makeText("选择颜色：")),
      body.appendChild(
        makeEl("input", {
          id: "color_selection",
          type: "color",
          style: "width:200px;height:120px",
          onchange: function () {
            var colorValueElement2 = $("#color_value");
            colorValueElement2 && (colorValueElement2.value = this.value.toUpperCase());
          },
        }),
      ),
      body.appendChild(makeDiv("height:10px")),
      body.appendChild(makeText("颜色值：")),
      body.appendChild(
        makeEl("input", {
          id: "color_value",
          type: "text",
          style: "height:40px;width:136px",
          onchange: function () {
            var colorSelectionElement2 = $("#color_selection");
            colorSelectionElement2 && (colorSelectionElement2.value = this.value.toUpperCase());
          },
        }),
      ),
      body.appendChild(makeDiv("height:10px")),
      body.appendChild(
        makeButton("保存", function () {
          if (dialogPanel.isOpen()) {
            var value2 = dialogPanel.body.querySelector("#color_value").value;
            if (!/^#[0-9a-fA-F]{6}$/.test(value2))
              return showAppAlert("颜色值错误！请输入 #RRGGBB 格式的颜色。");
            (sendWs({
              type: "send_message",
              type_id: "modify_color",
              what: 4,
              arg1: 70,
              arg2: parseInt(value2.slice(1), 16),
            }),
              dialogPanel.close());
          }
        }),
      ));
  }
  if (null != state.info.music_light_color) {
    for (var text = state.info.music_light_color.toString(16); text.length < 6;) text = "0" + text;
    var value = "#" + text.toUpperCase(),
      colorSelectionElement = ui.colorPicker._dialog.body.querySelector("#color_selection");
    colorSelectionElement && (colorSelectionElement.value = value);
    var colorValueElement = ui.colorPicker._dialog.body.querySelector("#color_value");
    colorValueElement && (colorValueElement.value = value);
  }
}
var appDialogStack = [];
function updateAppDialogLayers() {
  popupRenderHosts.forEach(function (element, index) {
    element.style.zIndex = 9998 + 2 * index;
  });
}
function createAppDialogButton(label, variant, onClick) {
  var options = {
    normal:
      "flex:1;border:none;border-radius:8px;padding:9px 0;font-size:13px;color:#fff;cursor:pointer;background:rgba(255,255,255,0.15)",
    primary:
      "flex:1;border:none;border-radius:8px;padding:9px 0;font-size:13px;color:#fff;cursor:pointer;background:var(--primary-blue)",
    danger:
      "flex:1;border:none;border-radius:8px;padding:9px 0;font-size:13px;color:#fff;cursor:pointer;background:rgba(230,80,80,0.9)",
  };
  return makeEl("button", {
    type: "button",
    text: label || "确定",
    class: "app_btn",
    style: options[variant] || options.normal,
    onclick: onClick,
  });
}
function showAppDialog(options) {
  var width = (options = options || {}).width || "78vw",
    popupHost = createPopupHost({ blur: !1 }),
    popupDim = popupHost._popupDim,
    container = makeEl("div", {
      class: "app_dialog_wrap app_prompt_wrap",
      style:
        "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:" +
        width +
        ";z-index:2",
    }),
    container2 = makeEl("div", {
      class: "app_dialog_panel",
      style:
        "background:transparent;border-radius:15px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.5);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.12);max-height:70vh;display:flex;flex-direction:column",
    }),
    container3 = makeEl("div", {
      style:
        "background:var(--primary-blue);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0",
    });
  container3.appendChild(
    makeEl("h3", {
      style:
        "font-size:15px;color:#fff;margin:0;text-shadow:none;font-weight:600;text-align:left;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
      text: options.title || "提示",
    }),
  );
  var button = makeEl("button", {
    type: "button",
    text: "✕",
    class: "app_btn app_dialog_close app_dialog_close_icon",
    style:
      "border:none;background:none;color:#fff;font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;outline:none;border-radius:50%",
  });
  container3.appendChild(button);
  var container4 = makeEl("div", {
    style: "flex:1;overflow-x:hidden;overflow-y:auto;padding:12px 16px",
  });
  (container2.appendChild(container3),
    container2.appendChild(container4),
    container.appendChild(container2));
  var isEnabled = !1,
    value = null,
    options2 = { host: popupHost, backdrop: popupDim, wrap: container };
  function isTopDialog() {
    return (
      appDialogStack[appDialogStack.length - 1] === options2 &&
      popupRenderHosts
        .filter(function (item) {
          return item._popupOpen;
        })
        .slice(-1)[0] === popupHost
    );
  }
  function closeDialog(value2) {
    if (isEnabled) return !1;
    ((isEnabled = !0), clearTimeout(value), closePopupAnimated(popupHost));
    var value3 = appDialogStack.indexOf(options2);
    return (
      -1 !== value3 && appDialogStack.splice(value3, 1),
      updateAppDialogLayers(),
      !value2 && options.onCancel && options.onCancel(),
      !0
    );
  }
  function handleDialogAction(value2) {
    if (!isEnabled && isTopDialog())
      if (value2.cancel) closeDialog();
      else {
        var value3 = input ? input.value : void 0;
        closeDialog(!0) && value2.onClick && value2.onClick(value3);
      }
  }
  ((button.onclick = function () {
    isTopDialog() && closeDialog();
  }),
    (popupDim.onclick = function () {
      isTopDialog() && closeDialog();
    }));
  var input = null,
    text = null != options.text ? options.text : options.message;
  (null != text &&
    "" !== text &&
    container4.appendChild(
      makeEl("div", {
        style:
          "color:#fff;font-size:13px;padding:2px 0 12px;text-align:left;line-height:1.6;word-break:break-all;white-space:pre-line",
        text: text,
      }),
    ),
    options.input &&
      ((input = makeEl("input", {
        type: options.input.type || "text",
        value: null == options.input.value ? "" : options.input.value,
        placeholder: options.input.placeholder || "",
        style:
          "width:100%;box-sizing:border-box;color:#fff;background:#333;border:1px solid #555;border-radius:8px;padding:8px 10px;font-size:13px;outline:none;margin-bottom:12px",
      })),
      container4.appendChild(input),
      (value = setTimeout(function () {
        if (!isEnabled && isTopDialog())
          try {
            input.focus();
          } catch (error) {}
      }, 80))));
  var container5 = makeEl("div", { style: "display:flex;gap:10px" }),
    buttons =
      options.buttons && options.buttons.length
        ? options.buttons
        : [{ text: "确定", style: "primary" }],
    actionButtons = buttons.filter(function (item) {
      return !item.cancel;
    }),
    actionButtonItem = actionButtons[actionButtons.length - 1];
  return (
    actionButtons
      .concat(
        buttons.filter(function (item) {
          return item.cancel;
        }),
      )
      .forEach(function (element) {
        container5.appendChild(
          createAppDialogButton(element.text, element.style, function () {
            handleDialogAction(element);
          }),
        );
      }),
    container4.appendChild(container5),
    input &&
      (input.onkeydown = function (event) {
        "Enter" === event.key &&
          !event.isComposing &&
          229 !== event.keyCode &&
          actionButtonItem &&
          !isEnabled &&
          isTopDialog() &&
          (event.preventDefault(), event.stopPropagation(), handleDialogAction(actionButtonItem));
      }),
    appDialogStack.push(options2),
    updateAppDialogLayers(),
    (popupHost.onclick = function (event) {
      (event.target !== popupHost && event.target !== popupHost.content) ||
        !isTopDialog() ||
        closeDialog();
    }),
    (popupHost.onclose = function () {
      return !!isTopDialog() && closeDialog();
    }),
    popupHost.content.appendChild(container),
    dialogContentMotion(container2, !1),
    {
      host: popupHost,
      wrap: container,
      panel: container2,
      close: closeDialog,
      input: function () {
        return input ? input.value : void 0;
      },
    }
  );
}
function showAppAlert(message, onClose, options) {
  return showAppDialog({
    message: message,
    text: (options = options || {}).text,
    title: options.title,
    width: options.width,
    onCancel: options.onCancel,
    buttons: [
      { text: options.okText || "确定", style: options.style || "primary", onClick: onClose },
    ],
  });
}
function showAppConfirm(message, onConfirm, options) {
  return showAppDialog({
    message: message,
    text: (options = options || {}).text,
    title: options.title,
    width: options.width,
    onCancel: options.onCancel,
    buttons: [
      { text: options.okText || "确定", style: options.style || "primary", onClick: onConfirm },
      { text: options.cancelText || "取消", style: "normal", cancel: !0 },
    ],
  });
}
function showAppPrompt(message, defaultValue, onConfirm, options) {
  return showAppDialog({
    message: message,
    text: (options = options || {}).text,
    title: options.title,
    width: options.width,
    onCancel: options.onCancel,
    input: {
      value: null == defaultValue ? "" : defaultValue,
      placeholder: options.placeholder || "",
      type: options.inputType || "text",
    },
    buttons: [
      { text: options.okText || "确定", style: options.style || "primary", onClick: onConfirm },
      { text: options.cancelText || "取消", style: "normal", cancel: !0 },
    ],
  });
}
var BUTTON_DEFINITIONS = [
  [
    "点播音乐",
    {
      ws_type: "send_message",
      input: "obj",
      param: { what: 65536, arg1: 0, arg2: 1, obj: "web_播放" },
      type: 1,
      min_ver: 1600,
      min_uver: 1700,
      err: "请输入要点播的音乐，例如：泠鸢yousa 乡情曲！",
      succ: "点播成功！",
    },
  ],
  [
    "点播广播",
    {
      ws_type: "send_message",
      input: "obj",
      param: { what: 65536, arg1: 0, arg2: 1, obj: "web_收听" },
      type: 1,
      min_ver: 1600,
      min_uver: 1700,
      err: "请输入要点播的广播电台名称！",
      succ: "点播成功！",
    },
  ],
  [
    "点播歌单",
    {
      ws_type: "send_message",
      input: "obj",
      param: { what: 65536, arg1: 0, arg2: 9, obj: "" },
      type: 1,
      min_ver: 1700,
      min_uver: 1700,
      err: "请输入要点播的歌单链接！",
      succ: "点播成功！",
    },
  ],
  [
    "个性电台",
    {
      ws_type: "send_message",
      param: { what: 65536, arg1: 0, arg2: 1, obj: "web_播放个性电台" },
      type: 0,
      min_ver: 1600,
      min_uver: 1700,
      succ: "好的，播放个性电台！",
    },
  ],
  ["我的歌单", { type: -1, min_ver: 1600, min_uver: 1800, itemType: "get_song_list" }],
  [
    "小讯收藏",
    {
      ws_type: "send_message",
      param: { what: 65536, arg1: 0, arg2: 8 },
      type: 0,
      min_ver: 1700,
      min_uver: 1700,
      succ: "好的，播放小讯收藏歌单！",
    },
  ],
  [
    "本地音乐",
    {
      type: -1,
      itemType: "play_local_music",
      min_ver: 1856,
      max_ver: 1864,
      state: ["info.Current_PlayerType", [1]],
    },
  ],
  [
    "本地音乐",
    {
      type: -1,
      itemType: "play_local_music",
      min_ver: 1865,
      state: ["info.Current_PlayerType", [1, 2]],
    },
  ],
  [
    "打开投放连接",
    {
      ws_type: "send_message",
      param: { what: 64, arg1: 1, arg2: -1 },
      type: 0,
      max_ver: 1810,
      succ: "已打开投放连接！",
    },
  ],
  [
    "关闭投放连接",
    {
      ws_type: "send_message",
      param: { what: 64, arg1: 2, arg2: -1 },
      type: 0,
      max_ver: 1810,
      succ: "已关闭投放连接！",
    },
  ],
  [
    "打开氛围灯",
    {
      ws_type: "send_message",
      param: { what: 4, arg1: 64, arg2: 1 },
      type: 0,
      max_ver: 1810,
      succ: "已开启氛围灯！",
    },
  ],
  [
    "关闭氛围灯",
    {
      ws_type: "send_message",
      param: { what: 4, arg1: 64, arg2: 0 },
      type: 0,
      max_ver: 1810,
      succ: "已关闭氛围灯！",
    },
  ],
  [
    "打开投放连接",
    {
      ws_type: "send_message",
      title: ["投放连接(关)", "投放连接(开)"],
      tips: ["打开已允许的蓝牙、DLNA、AirPlay、MiPlay服务", "断开当前投放并退出连接模式"],
      param: [
        { what: 64, arg1: 1, arg2: -1 },
        { what: 64, arg1: 2, arg2: -1 },
      ],
      type: 2,
      min_ver: 1820,
      succ: ["已打开投放连接！", "已退出投放连接！"],
      state: [0, "info.device_state", [[0, 1, 2, 5], 3]],
    },
  ],
  [
    "执行指令",
    {
      ws_type: "send_message",
      input: "obj",
      param: { what: 65536, arg1: 0, arg2: 1, obj: "web_" },
      type: 1,
      min_ver: 1600,
      min_uver: 1839,
      err: "请输入要执行的指令！",
      succ: "已发送指令！",
    },
  ],
  [
    "执行shell",
    {
      ws_type: "shell",
      input: "shell",
      param: { shell: "" },
      type: 1,
      err: "请输入要执行的shell命令！",
    },
  ],
  ["重启小讯", { type: -1, is_unisound: !0, itemType: "reboot_unisound" }],
  ["重启音箱", { type: -1, itemType: "reboot" }],
  ["重启adbd", { type: -1, itemType: "reboot_adbd" }],
  ["重启Echo", { type: -1, itemType: "reboot_echo", min_ver: 1854 }],
  [
    "唤醒小讯",
    {
      ws_type: "send_message",
      param: { what: 256, arg1: 1, arg2: -1 },
      type: 0,
      min_ver: 1810,
      succ: "已唤醒！",
    },
  ],
  [
    "打开氛围灯",
    {
      ws_type: "send_message",
      title: ["氛围灯(关)", "氛围灯(开)"],
      tips: ["打开氛围灯", "关闭氛围灯"],
      param: [
        { what: 4, arg1: 64, arg2: 1 },
        { what: 4, arg1: 64, arg2: 0 },
      ],
      type: 2,
      min_ver: 1820,
      succ: ["已开启氛围灯！", "已关闭氛围灯！"],
      state: [0, "info.music_light_enable", [!1, !0]],
    },
  ],
  [
    "修改设备名",
    {
      ws_type: "set_dev_name",
      input: "dev_name",
      param: { dev_name: "" },
      type: 1,
      min_ver: 1841,
      err: "请输入要修改的设备名！",
      succ: "设备名修改成功！",
    },
  ],
  [
    "修改小讯唤醒词",
    {
      ws_type: "send_message",
      input: "obj",
      param: { what: 65536, arg1: 0, arg2: 3, obj: "" },
      type: 1,
      min_uver: 1600,
      err: "请输入要修改的小讯唤醒词！",
      succ: "小讯唤醒词修改成功！",
    },
  ],
  [
    "打开小爱唤醒",
    {
      ws_type: "send_message",
      is_unisound: !0,
      title: ["打开小爱唤醒", "关闭小爱唤醒"],
      param: [
        {
          what: 65536,
          arg1: 0,
          arg2: 10,
          obj: { type: "set_wakeup_xiaoai", enable: !0 },
        },
        {
          what: 65536,
          arg1: 0,
          arg2: 10,
          obj: { type: "set_wakeup_xiaoai", enable: !1 },
        },
      ],
      type: 2,
      min_uver: 1837,
      succ: ["已开启小爱唤醒！", "已关闭小爱唤醒！"],
      state: [2, "unisoundInfo.Wakeup_Xiaoai", [!1, !0], ["unisoundInfo.is_xiaoai_exists", !0]],
    },
  ],
  [
    "修改小爱唤醒词",
    {
      ws_type: "send_message",
      input: "obj.word",
      param: {
        what: 65536,
        arg1: 0,
        arg2: 10,
        obj: { type: "set_wakeup_xiaoai_word", word: "" },
      },
      type: 1,
      min_uver: 1837,
      err: "请输入要修改的小爱唤醒词！",
      succ: "小爱唤醒词修改成功！",
      state: ["unisoundInfo.is_xiaoai_exists", [!0]],
    },
  ],
  [
    "小爱设置页面",
    {
      type: -1,
      itemType: "xiaoai_settings",
      state: ["unisoundInfo.is_xiaoai_exists", [!0]],
    },
  ],
  [
    "重启小爱服务",
    {
      type: -1,
      itemType: "reboot_xiaoaiservice",
      state: ["unisoundInfo.is_xiaoai_exists", [!0]],
    },
  ],
  [
    "一键激活小爱",
    {
      type: -1,
      itemType: "activation_xiaoai",
      state: ["unisoundInfo.xiaoai_vercode", [902010020]],
    },
  ],
  ["设置语音报时", { type: -1, itemType: "Voice_time_reporting", min_uver: 1832 }],
  ["设置自动重启", { type: -1, itemType: "Auto_restart_device", min_ver: 1848 }],
  [
    "设置氛围灯亮度",
    {
      ws_type: "send_message",
      input: "arg2",
      param: { what: 4, arg1: 65, arg2: "" },
      type: 1,
      err: "请输入要修改的亮度(默认100)！",
      succ: "氛围灯亮度修改成功！",
    },
  ],
  [
    "切换官方氛围效果",
    {
      ws_type: "send_message",
      param: { what: 4, arg1: 67, arg2: 0 },
      type: 0,
      max_ver: 1500,
      succ: "已切换为官方氛围效果！",
    },
  ],
  [
    "切换七彩氛围效果",
    {
      ws_type: "send_message",
      param: { what: 4, arg1: 67, arg2: 1 },
      type: 0,
      max_ver: 1500,
      succ: "已切换为七彩氛围效果！",
    },
  ],
  [
    "切换官方氛围效果",
    {
      ws_type: "send_message",
      param: { what: 4, arg1: 68, arg2: 0 },
      type: 0,
      min_ver: 1600,
      max_ver: 1810,
      succ: "已切换为官方氛围效果！",
    },
  ],
  [
    "切换七彩氛围效果",
    {
      ws_type: "send_message",
      param: { what: 4, arg1: 68, arg2: 2 },
      type: 0,
      min_ver: 1600,
      max_ver: 1810,
      succ: "已切换为七彩氛围效果！",
    },
  ],
  [
    "切换七彩氛围效果",
    {
      ws_type: "send_message",
      title: ["切换七彩氛围效果", "切换官方氛围效果"],
      param: [
        { what: 4, arg1: 68, arg2: 2 },
        { what: 4, arg1: 68, arg2: 0 },
      ],
      type: 2,
      min_ver: 1820,
      max_ver: 1828,
      succ: ["已切换为七彩氛围效果！", "已切换为官方氛围效果！"],
      state: [0, "info.music_light_mode", [0, [1, 2, 3]]],
    },
  ],
  [
    "切换七彩氛围效果",
    {
      ws_type: "send_message",
      title: [
        "当前：官方氛围效果",
        "当前：七彩氛围效果",
        "当前：七彩旋转效果",
        "当前：七彩旋转效果1",
      ],
      param: [
        { what: 4, arg1: 68, arg2: 2 },
        { what: 4, arg1: 68, arg2: 1 },
        { what: 4, arg1: 68, arg2: 3 },
        { what: 4, arg1: 68, arg2: 0 },
      ],
      type: 2,
      min_ver: 1829,
      max_ver: 1847,
      succ: [
        "已切换为七彩氛围效果！",
        "已切换为七彩旋转效果！",
        "已切换为七彩旋转效果1！",
        "已切换为官方氛围效果！",
      ],
      state: [0, "info.music_light_mode", [0, 2, 1, 3]],
    },
  ],
  [
    "切换七彩氛围效果",
    {
      ws_type: "send_message",
      title: [
        "当前：官方氛围效果",
        "当前：七彩氛围效果",
        "当前：七彩旋转效果",
        "当前：七彩旋转效果1",
        "当前：单色氛围效果",
      ],
      param: [
        { what: 4, arg1: 68, arg2: 2 },
        { what: 4, arg1: 68, arg2: 1 },
        { what: 4, arg1: 68, arg2: 3 },
        { what: 4, arg1: 68, arg2: 4 },
        { what: 4, arg1: 68, arg2: 0 },
      ],
      type: 2,
      min_ver: 1848,
      succ: [
        "已切换为七彩氛围效果！",
        "已切换为七彩旋转效果！",
        "已切换为七彩旋转效果1！",
        "已切换为单色氛围效果！",
        "已切换为官方氛围效果！",
      ],
      state: [0, "info.music_light_mode", [0, 2, 1, 3, 4]],
    },
  ],
  [
    "设置颜色渐变速度",
    {
      ws_type: "send_message",
      input: "arg2",
      param: { what: 4, arg1: 66, arg2: "" },
      type: 3,
      err: "请输入要修改的速度(默认4)！",
      succ: "氛围灯颜色渐变速度修改成功！",
      state: ["info.music_light_mode", [0, 1, 3]],
      hide: !0,
    },
  ],
  [
    "设置氛围灯光颜色",
    {
      type: -1,
      itemType: "modify_color",
      state: ["info.music_light_mode", [4]],
      max_ver: 1880,
      hide: !0,
    },
  ],
  [
    "设置氛围灯光颜色",
    {
      type: -1,
      itemType: "modify_color",
      state: ["info.music_light_mode", [2, 4]],
      min_ver: 1881,
      hide: !0,
    },
  ],
  ["设置背景图片", { type: -1, itemType: "set_background" }],
  [
    "开灯",
    {
      ws_type: "shell",
      param: { shell: "lights_test set 7fffff8000 ffffff" },
      type: 0,
      succ: "已开！",
    },
  ],
  [
    "关灯",
    {
      ws_type: "shell",
      param: { shell: "lights_test set 7fffff8000 0" },
      type: 0,
      succ: "已关！",
    },
  ],
  [
    "TTS",
    {
      ws_type: "send_message",
      input: "obj",
      param: { what: 65536, obj: "" },
      type: 1,
      min_uver: 1800,
      err: "请输入要阅读的文本",
      succ: "",
    },
  ],
  ["打开网络配置", { type: -1, itemType: "open_net_config" }],
  [
    "设置IOT_API",
    {
      ws_type: "send_message",
      input: "obj.iot_api",
      param: {
        what: 65536,
        arg1: 0,
        arg2: 10,
        obj: '{"type":"set_iot_api","iot_api":""}',
      },
      type: 1,
      min_uver: 1816,
      err: "请输入要设置的API",
      succ: "IOT_API设置成功！",
    },
  ],
  ["上传软件更新", { type: -1, min_ver: 1835, itemType: "upload_page" }],
  [
    "允许蓝牙服务启动",
    {
      ws_type: "Set_Bluetooth_Open",
      title: ["蓝牙服务(已关闭)", "蓝牙服务(已开启)"],
      tips: ["允许蓝牙服务启动", "禁止蓝牙服务启动"],
      param: [{ open: !0 }, { open: !1 }],
      type: 2,
      min_ver: 1887,
      succ: ["已允许！", "已禁止！"],
      state: [0, "info.bluetooth_open", [!1, !0]],
    },
  ],
  [
    "允许DLNA服务启动",
    {
      ws_type: "Set_DLNA_Open",
      title: ["DLNA服务(已关闭)", "DLNA服务(已开启)"],
      tips: ["允许DLNA服务启动", "禁止DLNA服务启动"],
      param: [{ open: !0 }, { open: !1 }],
      type: 2,
      min_ver: 1852,
      succ: ["已允许！", "已禁止！"],
      state: [0, "info.dlna_open", [!1, !0]],
    },
  ],
  [
    "允许AirPlay服务启动",
    {
      ws_type: "Set_AirPlay_Open",
      title: ["AirPlay服务(已关闭)", "AirPlay服务(已开启)"],
      tips: ["允许AirPlay服务启动", "禁止AirPlay服务启动"],
      param: [{ open: !0 }, { open: !1 }],
      type: 2,
      min_ver: 1852,
      succ: ["已允许！", "已禁止！"],
      state: [0, "info.airplay_open", [!1, !0]],
    },
  ],
  [
    "允许MiPlay服务启动",
    {
      ws_type: "Set_MiPlay_Open",
      title: ["MiPlay服务(已关闭)", "MiPlay服务(已开启)"],
      tips: ["允许MiPlay服务启动", "禁止MiPlay服务启动"],
      param: [{ open: !0 }, { open: !1 }],
      type: 2,
      succ: ["已允许！", "已禁止！"],
      state: [0, "info.miplay_open", [!1, !0]],
    },
  ],
  ["MiPlay设置", { type: -1, itemType: "miplay_adv" }],
  [
    "打开投放服务常开",
    {
      ws_type: "Set_Service_Normally_Open",
      title: ["投放服务常开(关)", "投放服务常开(开)"],
      tips: ["打开蓝牙、DLNA、AirPlay、MiPlay常开", "关闭投放服务常开"],
      param: [{ open: !0 }, { open: !1 }],
      type: 2,
      min_ver: 1840,
      succ: ["已打开！", "已关闭！"],
      state: [0, "info.Service_Normally_Open", [!1, !0]],
    },
  ],
  ["设备连接页面", { type: -1, itemType: "connect_page" }],
];
function buildTextsPanel(parentElement) {
  var container = makeEl("div");
  if (
    (container.appendChild(makeText("信息：")),
    container.appendChild(makeEl("textarea", { id: "text", readOnly: !0 })),
    container.appendChild(makeEl("br")),
    container.appendChild(makeText("输入：")),
    container.appendChild(makeEl("input", { type: "search", id: "input" })),
    isEchoVer(1600) && isUnisoundVer(1700))
  ) {
    var container2 = makeEl("div");
    container2.appendChild(makeText("发音人:"));
    var ttsSpeakerElement = makeEl("select", { id: "tts_speaker" });
    ttsSpeakerElement.onchange = function () {
      updateTtsSpeaker(this.value);
    };
    for (
      var items = [
          ["萱萱", "SWEET"],
          ["小雯", "FEMALE"],
          ["糖糖", "CHILDREN"],
          ["玲玲", "LZL"],
          ["小峰", "MALE"],
          ["天天", "TIANTIAN"],
        ],
        index = 0;
      index < items.length;
      index++
    ) {
      var option = makeEl("option", { value: items[index][1], html: items[index][0] });
      (items[index][1] === parentElement.ttsModelType && (option.selected = !0),
        ttsSpeakerElement.appendChild(option));
    }
    (container2.appendChild(ttsSpeakerElement), container2.appendChild(makeText("音乐源:")));
    var musicSourceElement = makeEl("select", { id: "music_source" });
    musicSourceElement.onchange = function () {
      setMusicSource(this.value);
    };
    for (
      var items2 = [
          ["QQ音乐", "qq"],
          ["酷我音乐", "kuwo"],
          ["网易云音乐", "netease"],
        ],
        index2 = 0;
      index2 < items2.length;
      index2++
    ) {
      var option2 = makeEl("option", { value: items2[index2][1], html: items2[index2][0] });
      (items2[index2][1] === parentElement.music_source && (option2.selected = !0),
        musicSourceElement.appendChild(option2));
    }
    (container2.appendChild(musicSourceElement), container.appendChild(container2));
  }
  return container;
}
var MUSIC_ICONS = {
  fullscreen:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  fullscreenExit:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
  list: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  playing:
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="rgba(255,147,71,1)"><path d="M3 9h2v6H3zM7.5 6h2v12h-2zM12 3h2v18h-2zM16.5 6h2v12h-2zM21 9h2v6h-2z"/></svg>',
  more: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>',
  drag: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="6" r="2"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/></svg>',
  locate:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  playSm:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
  buffer:
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" opacity="0.25"/><path d="M12 4c4.41 0 8 3.59 8 8h-2c0-3.31-2.69-6-6-6V4z"/></svg>',
  loading:
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" opacity="0.25"/><path d="M12 3a9 9 0 0 1 9 9h-2a7 7 0 0 0-7-7V3z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
  collect:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
  cancelCollect:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>',
  shuffle:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
  sequential:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>',
  repeatOne:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zM13 15V9h-1l-2 1v1h1.5v4H13z"/></svg>',
  background:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
  backgroundOff:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="rgba(255,255,255,0.4)"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
};
function updatePlayButtonIcon(button, isPlaying) {
  button &&
    button.getAttribute("data-status") !== isPlaying &&
    (button.setAttribute("data-status", isPlaying),
    "pause" === isPlaying
      ? ((button.innerHTML = MUSIC_ICONS.pause),
        button.setAttribute("title", "暂停"),
        button.setAttribute("data", "pause"),
        button.classList.add("playing"),
        button.classList.remove("buffering"))
      : "buffer" === isPlaying
        ? ((button.innerHTML = MUSIC_ICONS.buffer),
          button.setAttribute("title", "缓冲中"),
          button.setAttribute("data", "buffer"),
          button.classList.remove("playing"),
          button.classList.add("buffering"))
        : "loading" === isPlaying
          ? ((button.innerHTML = MUSIC_ICONS.loading),
            button.setAttribute("title", "加载中"),
            button.setAttribute("data", "loading"),
            button.classList.remove("playing"),
            button.classList.add("buffering"))
          : ((button.innerHTML = MUSIC_ICONS.play),
            button.setAttribute("title", "播放"),
            button.setAttribute("data", "play"),
            button.classList.remove("playing"),
            button.classList.remove("buffering")));
}
function updatePlayModeIcon(button, playMode) {
  if (button) {
    var numericValue = 2 == playMode ? 2 : 3 == playMode ? 3 : 1;
    button._renderedPlayMode !== numericValue &&
      ((button._renderedPlayMode = numericValue),
      2 == playMode
        ? ((button.innerHTML = MUSIC_ICONS.sequential), button.setAttribute("title", "顺序播放"))
        : 3 == playMode
          ? ((button.innerHTML = MUSIC_ICONS.repeatOne), button.setAttribute("title", "单曲循环"))
          : ((button.innerHTML = MUSIC_ICONS.shuffle), button.setAttribute("title", "随机播放")));
  }
}
function onDoubleTap(element, callback) {
  var numericValue = 0;
  element.addEventListener("click", function (event) {
    var value = Date.now();
    value - numericValue < 400 ? ((numericValue = 0), callback(event)) : (numericValue = value);
  });
}
function buildMusicPanel(parentElement) {
  var musicRootElement = makeEl("div", {
    id: "music_root",
    style:
      "display:none;max-width:" +
      (window.screen && window.screen.width >= 768 ? "580" : "520") +
      "px;margin:0 auto;padding:0 14px 12px;box-sizing:border-box",
  });
  ui.musicPanel = musicRootElement;
  var container = makeEl("div", {
    style:
      "position:relative;width:100%;height:240px;display:flex;justify-content:center;align-items:center;margin:0 0 15px;box-sizing:border-box",
  });
  musicRootElement.appendChild(container);
  var musicPicElement = makeEl("img", {
    id: "music_pic",
    src: R1Config.assetUrl("favicon.svg"),
    style:
      "display:block;width:240px;height:240px;border-radius:50%;object-fit:cover;border:4px solid rgba(var(--mask-color),0.25);box-shadow:0 6px 24px rgba(0,0,0,0.35);-webkit-animation:img 30s linear infinite;animation:img 30s linear infinite;animation-play-state:paused;user-select:none;-webkit-user-drag:none",
    draggable: "false",
  });
  ((musicPicElement.placeholderSrc = R1Config.assetUrl("favicon.svg")),
    (musicPicElement.onload = function () {
      updateCoverBackground();
    }),
    (musicPicElement.onerror = function () {
      this !== ui.musicPic ||
        this._coverPending ||
        this._coverLoading ||
        (restoreCoverBackground(),
        this.src !== this.placeholderSrc && (this.src = this.placeholderSrc));
    }),
    (ui.musicPic = musicPicElement),
    container.appendChild(musicPicElement));
  var musicLrcElement = makeEl("div", {
    id: "music_lrc",
    style: "display:none;width:100%;height:100%;overflow:hidden;position:relative",
  });
  ((ui.musicLyrics = musicLrcElement), container.appendChild(musicLrcElement));
  var value = null,
    callback = function () {
      null === value &&
        (value = requestAnimationFrame(function () {
          if (
            ((value = null),
            !(
              state.lrcFullscreen ||
              !musicRootElement.parentNode ||
              "none" === musicRootElement.style.display ||
              (ui.musicPanel && ui.musicPanel !== musicRootElement)
            ))
          ) {
            var lyricsPending = state.lyricsPending,
              lyricsPending2 =
                lyricsPending &&
                lyricsPending.musicId === state.musicId &&
                lyricsPending.hostname === state.hostname &&
                lyricsPending.socket === state.ws,
              numericValue = 240;
            if (
              "block" === musicLrcElement.style.display &&
              (lyricsPending2 ||
                ("function" == typeof hasRealLyrics &&
                  hasRealLyrics() &&
                  state.lyricTiming.length > 0))
            ) {
              var main = ui.main,
                clientHeight = main ? main.clientHeight : window.innerHeight,
                top = main ? main.getBoundingClientRect().top : 0,
                scrollTop = main ? main.scrollTop : window.pageYOffset || 0,
                value3 = container.getBoundingClientRect().top - top + scrollTop,
                value4 = musicRootElement.getBoundingClientRect().height - container.offsetHeight,
                numericValue2 = 0;
              function parseCssNumber(value6) {
                return parseFloat(value6) || 0;
              }
              function measureFollowingHeight(parentElement2, referenceElement) {
                if (!parentElement2 || !referenceElement) return 0;
                for (
                  var isEnabled = !1, numericValue3 = 0, index2 = 0;
                  index2 < parentElement2.children.length;
                  index2++
                ) {
                  var childrenItem = parentElement2.children[index2];
                  if (childrenItem !== referenceElement) {
                    if (isEnabled) {
                      var computedStyle = getComputedStyle(childrenItem);
                      "none" !== computedStyle.display &&
                        "absolute" !== computedStyle.position &&
                        "fixed" !== computedStyle.position &&
                        (numericValue3 +=
                          childrenItem.getBoundingClientRect().height +
                          parseCssNumber(computedStyle.marginTop) +
                          parseCssNumber(computedStyle.marginBottom));
                    }
                  } else isEnabled = !0;
                }
                return numericValue3;
              }
              var container8 = ui.container;
              ((numericValue2 += measureFollowingHeight(container8, musicRootElement)),
                main && container8 && (numericValue2 += measureFollowingHeight(main, container8)),
                container8 &&
                  (numericValue2 += parseCssNumber(getComputedStyle(container8).paddingBottom)),
                main && (numericValue2 += parseCssNumber(getComputedStyle(main).paddingBottom)),
                (numericValue = Math.max(
                  240,
                  clientHeight - value3 - value4 - numericValue2 - 20,
                )));
            }
            var value5 = Math.floor(numericValue) + "px";
            container.style.height !== value5 && (container.style.height = value5);
          }
        }));
    };
  ((ui.applyLyricsModeHeight = callback),
    onDoubleTap(musicPicElement, function () {
      if (state.musicInfo) {
        var trackTitle = getTrackTitle(state.musicInfo);
        (setPageTitle(trackTitle), (document.title = state.deviceTag + trackTitle));
      }
      ((musicPicElement.style.display = "none"),
        (musicLrcElement.style.display = "block"),
        setTimeout(callback, 20),
        updateLyrics(!0),
        localStorage.setItem(state.hostname + "_lrc_mode", 1));
    }),
    onDoubleTap(musicLrcElement, function () {
      state.lrcFullscreen
        ? exitFullscreenLrc()
        : ((musicLrcElement.style.display = "none"),
          (musicPicElement.style.display = "block"),
          callback(),
          localStorage.setItem(state.hostname + "_lrc_mode", 0));
    }),
    0 != localStorage.getItem(state.hostname + "_lrc_mode") &&
      ((musicPicElement.style.display = "none"),
      (musicLrcElement.style.display = "block"),
      setTimeout(callback, 0),
      setTimeout(callback, 150),
      setTimeout(callback, 400),
      setTimeout(callback, 900)));
  var container2 = makeEl("div", {
    style: "display:flex;align-items:center;justify-content:center;margin:6px 0",
  });
  musicRootElement.appendChild(container2);
  var container3 = makeEl("div", {
    style:
      "flex:0 0 48px;width:48px;text-align:center;color:var(--white);font-variant-numeric:tabular-nums;font-family:Consolas,Monaco,monospace;line-height:1.2",
  });
  ((ui.musicTimeCurrent = makeText("00:00")),
    container3.appendChild(ui.musicTimeCurrent),
    container2.appendChild(container3));
  var container4 = makeEl("div", { style: "flex:1 1 auto;padding:0 8px;min-width:0" }),
    musicTimeElement = makeEl("input", {
      id: "music_time",
      type: "range",
      min: 0,
      step: 1,
      max: 0,
      value: 0,
      style: "width:100%;pointer-events:auto;cursor:pointer",
    });
  if (((ui.musicTimeRange = musicTimeElement), isEchoVer(1827))) {
    var callback2 = function () {
        (state.seekSession && !state.seekSession.committed) || beginMusicSeek();
      },
      callback3 = function () {
        commitMusicSeek();
      };
    (["pointerdown", "mousedown", "touchstart"].forEach(function (item) {
      musicTimeElement.addEventListener(item, callback2);
    }),
      musicTimeElement.addEventListener("input", function () {
        previewMusicSeek(musicTimeElement.value);
      }),
      [
        "pointerup",
        "mouseup",
        "touchend",
        "change",
        "keyup",
        "blur",
        "pointercancel",
        "touchcancel",
      ].forEach(function (item) {
        musicTimeElement.addEventListener(item, callback3);
      }),
      ["pointerup", "mouseup", "touchend"].forEach(function (item) {
        document.addEventListener(item, function () {
          ui.musicTimeRange === musicTimeElement && callback3();
        });
      }));
  }
  (container4.appendChild(musicTimeElement), container2.appendChild(container4));
  var container5 = makeEl("div", {
    style:
      "flex:0 0 48px;width:48px;text-align:center;color:var(--white);font-variant-numeric:tabular-nums;font-family:Consolas,Monaco,monospace;line-height:1.2",
  });
  ((ui.musicTimeTotal = makeText("00:00")),
    container5.appendChild(ui.musicTimeTotal),
    container2.appendChild(container5),
    (ui.qualityPanel = makeEl("div", {
      id: "quality_div",
      style:
        "display:none;text-align:center;margin:2px 0 8px;color:rgba(255,255,255,0.7);text-shadow:var(--white-shadow)",
    })),
    ui.qualityPanel.appendChild(makeText("音质：", "")),
    (ui.qualitySelect = makeEl("select", {
      id: "switch_quality",
      style: "margin:5px 5px 0px 0px;min-width: 60px;height: 25px;backdrop-filter: none;",
    })),
    (ui.qualitySelect.onchange = function () {
      sendWs({ type: "switch_quality", quality: this.value });
    }));
  for (
    var items = [
        ["Hi-Res", 3],
        ["无损", 2],
        ["超品", 1],
        ["高品", 0],
      ],
      index = 0;
    index < items.length;
    index++
  ) {
    var option = makeEl("option", { value: items[index][1], html: items[index][0] });
    (items[index][1] == parentElement.ExoPlayer_Quality && (option.selected = !0),
      ui.qualitySelect.appendChild(option));
  }
  (1 != state.info.Support_Flac &&
    ui.qualitySelect.length > 2 &&
    ((ui.qualitySelect[0].style.display = "none"),
    (ui.qualitySelect[1].style.display = "none"),
    (ui.qualitySelect[2].selected = !0)),
    ui.qualityPanel.appendChild(ui.qualitySelect),
    (ui.qualityLabel = makeText("", "")),
    ui.qualityPanel.appendChild(ui.qualityLabel),
    musicRootElement.appendChild(ui.qualityPanel),
    2 == parentElement.Current_PlayerType &&
      isEchoVer(1863) &&
      (ui.qualityPanel.style.display = "block"));
  var container6 = makeEl("div", {
    style: "display:flex;justify-content:center;align-items:center;margin:14px 0 10px",
  });
  musicRootElement.appendChild(container6);
  var musicBtnPrevElement = makeEl("button", {
    id: "music_btn_prev",
    type: "button",
    data: "prev",
    html: MUSIC_ICONS.prev,
    title: "上一首",
    style:
      "width:64px;height:50px;margin:0 16px;border:none;border-radius:25px;background:rgba(255,255,255,0.1);color:var(--white);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;outline:none;transition:background 0.15s",
    onclick: function () {
      var numericValue = parseInt(this.getAttribute("time") || Date.now(), 10);
      Date.now() - numericValue < 0 ||
        (this.setAttribute("time", Date.now() + 500), executeMusicCommand(this));
    },
  });
  container6.appendChild(musicBtnPrevElement);
  var playButton = makeEl("button", {
    id: "music_btn_play",
    type: "button",
    data: "play",
    html: MUSIC_ICONS.play,
    title: "播放",
    style:
      "width:88px;height:58px;margin:0 16px;border:none;border-radius:29px;background:var(--primary-blue);color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;outline:none;box-shadow:0 4px 16px rgba(53,145,234,0.5);transition:transform 0.1s",
    onclick: function () {
      var numericValue = parseInt(this.getAttribute("time") || Date.now(), 10);
      Date.now() - numericValue < 0 ||
        (this.setAttribute("time", Date.now() + 500), executeMusicCommand(this));
    },
  });
  container6.appendChild(playButton);
  var musicBtnNextElement = makeEl("button", {
    id: "music_btn_next",
    type: "button",
    data: "next",
    html: MUSIC_ICONS.next,
    title: "下一首",
    style:
      "width:64px;height:50px;margin:0 16px;border:none;border-radius:25px;background:rgba(255,255,255,0.1);color:var(--white);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;outline:none;transition:background 0.15s",
    onclick: function () {
      var numericValue = parseInt(this.getAttribute("time") || Date.now(), 10);
      Date.now() - numericValue < 0 ||
        (this.setAttribute("time", Date.now() + 500), executeMusicCommand(this));
    },
  });
  container6.appendChild(musicBtnNextElement);
  var container7 = makeEl("div", {
    class: "music_aux_controls",
    style: "display:flex;justify-content:center;align-items:center;flex-wrap:wrap;margin:6px 0 0px",
  });
  musicRootElement.appendChild(container7);
  var text =
      "width:56px;height:40px;margin:6px 8px;border:none;border-radius:20px;background:rgba(255,255,255,0.08);color:var(--white);cursor:pointer;align-items:center;justify-content:center;padding:0;outline:none;transition:background 0.15s",
    musicBtnCollectElement = makeEl("button", {
      id: "music_btn_collect",
      type: "button",
      data: "collect",
      html: MUSIC_ICONS.collect,
      title: "收藏",
      hidden: !0,
      style: text + ";display:none",
      onclick: function () {
        executeMusicCommand(this);
      },
    });
  container7.appendChild(musicBtnCollectElement);
  var musicBtnCancelCollectElement = makeEl("button", {
    id: "music_btn_cancel_collect",
    type: "button",
    data: "cancel_collect",
    html: MUSIC_ICONS.cancelCollect,
    title: "取消收藏",
    hidden: !0,
    style: text + ";display:none",
    onclick: function () {
      executeMusicCommand(this);
    },
  });
  container7.appendChild(musicBtnCancelCollectElement);
  var musicBtnPlaymodeElement = makeEl("button", {
    id: "music_btn_playmode",
    type: "button",
    data: "playmode",
    mode: "1",
    html: MUSIC_ICONS.shuffle,
    title: "随机播放",
    style: text + ";display:inline-flex",
    onclick: function () {
      for (
        var items2 = [
            ["随机播放", 1],
            ["顺序播放", 2],
            ["单曲循环", 3],
          ],
          value3 = (parseInt(this.getAttribute("mode"), 10) % 3) + 1,
          items2Item = items2[0],
          index2 = 0;
        index2 < items2.length;
        index2++
      )
        items2[index2][1] === value3 && (items2Item = items2[index2]);
      (this.setAttribute("mode", items2Item[1]),
        updatePlayModeIcon(this, items2Item[1]),
        sendWs({ type: "set_play_mode", mode: items2Item[1] }),
        sendWs({ type: "get_info" }));
    },
  });
  container7.appendChild(musicBtnPlaymodeElement);
  var musicBtnBackgroundElement = makeEl("button", {
    id: "music_btn_background",
    type: "button",
    html: state.coverBackgroundEnabled ? MUSIC_ICONS.background : MUSIC_ICONS.backgroundOff,
    title: state.coverBackgroundEnabled ? "关闭封面背景" : "打开封面背景",
    style: text + ";display:inline-flex",
    onclick: function () {
      var text2 = state.coverBackgroundEnabled
          ? "确定要关闭封面背景吗？"
          : "确定要打开封面背景吗？\r\n提示：打开后可能会导致页面卡顿！",
        receiver = this;
      showAppConfirm(text2, function () {
        ((state.coverBackgroundEnabled = !state.coverBackgroundEnabled),
          localStorage.setItem("Cover_background_open", state.coverBackgroundEnabled),
          (receiver.innerHTML = state.coverBackgroundEnabled
            ? MUSIC_ICONS.background
            : MUSIC_ICONS.backgroundOff),
          receiver.setAttribute(
            "title",
            state.coverBackgroundEnabled ? "关闭封面背景" : "打开封面背景",
          ),
          state.coverBackgroundEnabled ? updateCoverBackground() : restoreBackground());
      });
    },
  });
  container7.appendChild(musicBtnBackgroundElement);
  var musicBtnFullscreenElement = makeEl("button", {
    id: "music_btn_fullscreen",
    type: "button",
    html: MUSIC_ICONS.fullscreen,
    title: "全屏歌词",
    style: text + ";display:inline-flex",
    onclick: function () {
      toggleFullscreenLrc();
    },
  });
  container7.appendChild(musicBtnFullscreenElement);
  var musicBtnListElement = makeEl("button", {
    id: "music_btn_list",
    type: "button",
    html: MUSIC_ICONS.list,
    title: "播放列表",
    style: text + ";display:inline-flex",
    onclick: function () {
      showPlaylistOverlay();
    },
  });
  container7.appendChild(musicBtnListElement);
  var musicBtnSearchElement = makeEl("button", {
    id: "music_btn_search",
    type: "button",
    html: MUSIC_ICONS.search,
    title: "搜索音乐（需 EchoService 1887+）",
    style: text + ";display:" + (hasMusicQueueCapability() ? "inline-flex" : "none"),
    onclick: function () {
      hasMusicQueueCapability() &&
        "function" == typeof createMusicSearchDialog &&
        createMusicSearchDialog();
    },
  });
  (container7.appendChild(musicBtnSearchElement),
    updatePlayModeIcon(musicBtnPlaymodeElement, parentElement.play_mode || 1));
  var value2 = window.innerWidth + ":" + window.innerHeight,
    callback4 = function () {
      var value3 = window.innerWidth + ":" + window.innerHeight;
      value3 !== value2 &&
        ((value2 = value3),
        setTimeout(function () {
          (callback(),
            state.lrcFullscreen && updateFullscreenTitle(),
            state.lrcFullscreen && ui.fullscreenLrc
              ? ((ui.fullscreenLrc._lyrics = null), updateLyrics(!0))
              : ui.musicLyrics &&
                "block" === ui.musicLyrics.style.display &&
                ((ui.musicLyrics._lyrics = null), updateLyrics(!0)));
        }, 150));
    };
  if (
    (window.addEventListener("resize", callback4),
    window.addEventListener("orientationchange", callback4),
    "function" == typeof ResizeObserver)
  ) {
    var resizeObserverInstance = new ResizeObserver(function () {
      ui.musicPanel === musicRootElement ? callback() : resizeObserverInstance.disconnect();
    });
    ([container2, ui.qualityPanel, container6, container7].forEach(function (item) {
      resizeObserverInstance.observe(item);
    }),
      ui.main &&
        Array.prototype.slice.call(ui.main.children).forEach(function (item) {
          item !== ui.container && resizeObserverInstance.observe(item);
        }));
  }
  return musicRootElement;
}
function createFullscreenLrcOverlay() {
  if (!ui.fullscreenOverlay) {
    var lrcFullscreenOverlayElement = makeEl("div", { id: "lrc_fullscreen_overlay" });
    ui.fullscreenOverlay = lrcFullscreenOverlayElement;
    var lrcFullscreenBgElement = makeEl("div", { id: "lrc_fullscreen_bg" });
    if (
      ((ui.fullscreenBg = lrcFullscreenBgElement),
      lrcFullscreenOverlayElement.appendChild(lrcFullscreenBgElement),
      window.plus)
    )
      try {
        var value = Math.floor(plus.navigator.getStatusbarHeight() / 2);
        value > 0 &&
          lrcFullscreenOverlayElement.appendChild(
            makeEl("div", {
              style:
                "height:" +
                value +
                "px;flex-shrink:0;position:relative;z-index:2;pointer-events:none",
            }),
          );
      } catch (error) {}
    var lrcFullscreenHeaderElement = makeEl("div", { id: "lrc_fullscreen_header" }),
      lrcFullscreenCoverElement = makeEl("img", {
        id: "lrc_fullscreen_cover",
        src: "",
        onerror: function () {
          this.style.visibility = "hidden";
        },
      });
    ((ui.fullscreenCover = lrcFullscreenCoverElement),
      lrcFullscreenHeaderElement.appendChild(lrcFullscreenCoverElement));
    var lrcFullscreenInfoElement = makeEl("div", { id: "lrc_fullscreen_info" });
    ui.fullscreenTitleEl = makeEl("div", {
      id: "lrc_fullscreen_title",
      html: "",
    });
    var lrcFullscreenMetaElement = makeEl("div", { id: "lrc_fullscreen_meta" });
    ((ui.fullscreenArtistEl = makeEl("span", {
      id: "lrc_fullscreen_artist",
      html: "",
    })),
      (ui.fullscreenTimeEl = makeEl("span", {
        id: "lrc_fs_time",
        html: "00:00 / 00:00",
      })),
      lrcFullscreenMetaElement.appendChild(ui.fullscreenArtistEl),
      lrcFullscreenMetaElement.appendChild(ui.fullscreenTimeEl),
      lrcFullscreenInfoElement.appendChild(ui.fullscreenTitleEl),
      lrcFullscreenInfoElement.appendChild(lrcFullscreenMetaElement),
      lrcFullscreenHeaderElement.appendChild(lrcFullscreenInfoElement));
    var lrcFullscreenBtnsElement = makeEl("div", { id: "lrc_fullscreen_btns" }),
      lrcFullscreenPlayElement = makeEl("button", {
        id: "lrc_fullscreen_play",
        type: "button",
        html: MUSIC_ICONS.play,
        title: "播放",
        onclick: function () {
          if (!state.musicInfo || (6 != state.musicInfo.state && 10 != state.musicInfo.state)) {
            var numericValue = parseInt(this.getAttribute("time") || "0", 10);
            if (!(Date.now() - numericValue < 0)) {
              this.setAttribute("time", Date.now() + 600);
              var isPlayingState2 = isPlayingState();
              if (
                ((state.info.play_state = !isPlayingState2),
                (state.fullscreenPlayProtectUntil = Date.now() + 2e3),
                isPlayingState2)
              ) {
                ((this.innerHTML = MUSIC_ICONS.play),
                  this.classList.remove("playing"),
                  this.setAttribute("data", "play"),
                  sendAction(4, 2, -1, !0));
                var musicBtnPlayElement = $("#music_btn_play");
                musicBtnPlayElement &&
                  (musicBtnPlayElement.setAttribute("data", "play"),
                  musicBtnPlayElement.classList.remove("playing"),
                  updatePlayButtonIcon(musicBtnPlayElement, "play"));
              } else {
                ((this.innerHTML = MUSIC_ICONS.pause),
                  this.classList.add("playing"),
                  this.setAttribute("data", "pause"),
                  0 == state.info.play_type &&
                  (!state.playlist.playList || state.playlist.playList.length < 1) &&
                  state.info.Recoverable_music
                    ? sendAction(4, 24, 1, !0)
                    : sendAction(4, 3, -1, !0));
                var musicBtnPlayElement2 = $("#music_btn_play");
                musicBtnPlayElement2 &&
                  (musicBtnPlayElement2.setAttribute("data", "pause"),
                  musicBtnPlayElement2.classList.add("playing"),
                  updatePlayButtonIcon(musicBtnPlayElement2, "pause"));
              }
              sendWs({ type: "get_info" });
            }
          }
        },
      });
    ((ui.fullscreenPlayBtn = lrcFullscreenPlayElement),
      lrcFullscreenBtnsElement.appendChild(lrcFullscreenPlayElement));
    var lrcFullscreenNextElement = makeEl("button", {
      id: "lrc_fullscreen_next",
      type: "button",
      html: MUSIC_ICONS.next,
      title: "下一首",
      onclick: function () {
        var numericValue = parseInt(this.getAttribute("time") || "0", 10);
        Date.now() - numericValue < 0 ||
          (this.setAttribute("time", Date.now() + 500),
          sendWs({ type: "next" }),
          sendWs({ type: "get_info" }));
      },
    });
    ((ui.fullscreenNextBtn = lrcFullscreenNextElement),
      lrcFullscreenBtnsElement.appendChild(lrcFullscreenNextElement),
      lrcFullscreenBtnsElement.appendChild(
        makeEl("button", {
          id: "lrc_fullscreen_close",
          type: "button",
          html: MUSIC_ICONS.close,
          title: "退出全屏",
          onclick: function () {
            exitFullscreenLrc();
          },
        }),
      ),
      lrcFullscreenHeaderElement.appendChild(lrcFullscreenBtnsElement),
      lrcFullscreenOverlayElement.appendChild(lrcFullscreenHeaderElement));
    var lrcFullscreenContentElement = makeEl("div", { id: "lrc_fullscreen_content" });
    ((ui.fullscreenLrc = lrcFullscreenContentElement),
      lrcFullscreenOverlayElement.appendChild(lrcFullscreenContentElement),
      document.body.appendChild(lrcFullscreenOverlayElement));
  }
}
function syncFullscreenControls() {
  if (state.lrcFullscreen) {
    ui.fullscreenPlayBtn &&
      (!state.musicInfo || (6 != state.musicInfo.state && 10 != state.musicInfo.state)
        ? state.fullscreenPlayProtectUntil && Date.now() < state.fullscreenPlayProtectUntil
          ? (ui.fullscreenPlayBtn.disabled = !1)
          : ((ui.fullscreenPlayBtn.disabled = !1),
            updatePlayButtonIcon(ui.fullscreenPlayBtn, isPlayingState() ? "pause" : "play"))
        : ((ui.fullscreenPlayBtn.disabled = !0),
          updatePlayButtonIcon(
            ui.fullscreenPlayBtn,
            6 == state.musicInfo.state ? "buffer" : "loading",
          )));
    var numericValue = state.lyricTiming[2] ? parseInt(state.lyricTiming[2], 10) : 0,
      numericValue2 = state.lyricTiming[1] ? parseInt(state.lyricTiming[1], 10) : 0;
    ui.fullscreenTimeEl &&
      (ui.fullscreenTimeEl.innerHTML = msToTime(numericValue2) + " / " + msToTime(numericValue));
  }
}
function isPlayingState() {
  var playState = state.info.play_state;
  return !0 === playState || 1 === playState || "true" === playState || "1" === playState;
}
function updateFullscreenBg(value) {
  if (ui.fullscreenBg && state.lrcFullscreen) {
    var fullscreenBg = ui.fullscreenBg,
      fullscreenOverlay = ui.fullscreenOverlay,
      musicPic = ui.musicPic,
      musicPic2 = musicPic && musicPic._coverRequest,
      isEnabled =
        !value &&
        state.coverBackgroundEnabled &&
        musicPic &&
        (musicPic._coverPending || musicPic._coverLoading),
      backgroundLayers = fullscreenBg._backgroundLayers;
    if (
      isEnabled &&
      backgroundLayers &&
      backgroundLayers.hostname === state.hostname &&
      (backgroundLayers.current || backgroundLayers.incoming)
    )
      fullscreenBg.style.display = "block";
    else {
      var options,
        url =
          !value &&
          state.coverBackgroundEnabled &&
          ui.musicPic &&
          ui.musicPic.complete &&
          0 !== ui.musicPic.naturalWidth &&
          ui.musicPic.src &&
          -1 === ui.musicPic.src.indexOf("favicon.svg") &&
          ui.musicPic._failedBackgroundCover !== ui.musicPic.src
            ? safeBackgroundUrl(ui.musicPic.src)
            : "",
        text = url ? "cover" : "stored",
        numericValue =
          "cover" === text
            ? 50
            : Math.max(
                0,
                Math.min(
                  60,
                  parseInt(localStorage.getItem(state.hostname + "_BackgroundBlur"), 10) || 0,
                ),
              );
      if (url)
        options = {
          url: url,
          props: {
            "background-image": 'url("' + url + '")',
            "background-size": "cover",
            "background-position": "center",
            "background-repeat": "no-repeat",
            "background-attachment": "fixed",
          },
        };
      else {
        var background = ui.background && ui.background._backgroundLayers,
          background2 =
            background &&
            background.hostname === state.hostname &&
            (background.incoming && "1" === background.incoming.style.opacity
              ? background.incoming
              : background.current);
        if (
          !background ||
          background.hostname !== state.hostname ||
          !background.requestedKey ||
          background.cover ||
          (background.guard && !background.guard())
        ) {
          if (background2 && !background2._coverBackground) {
            var options2 = {};
            (BACKGROUND_PROPS.forEach(function (item) {
              var propertyValue = background2.style.getPropertyValue(item);
              propertyValue && (options2[item] = propertyValue);
            }),
              Object.keys(options2).length ||
                (options2.background = background2.style.getPropertyValue("background")),
              (options = { url: background2._backgroundUrl || "", props: options2 }));
          }
        } else options = background.background;
        options ||
          (options = parseBackgroundCss(
            localStorage.getItem(state.hostname + "_background") || DEFAULT_BACKGROUND,
          ));
      }
      ((fullscreenBg.style.display = "block"),
        (fullscreenOverlay.style.background = "#10243a"),
        transitionBackground(fullscreenBg, options, {
          mode: text,
          cover: "cover" === text,
          blur: numericValue,
          guard: function () {
            return (
              ui.fullscreenBg === fullscreenBg &&
              ui.fullscreenOverlay === fullscreenOverlay &&
              state.lrcFullscreen &&
              ("cover" !== text ||
                (state.coverBackgroundEnabled &&
                  ui.musicPic === musicPic &&
                  musicPic.src === url &&
                  musicPic._coverRequest === musicPic2 &&
                  (!isEnabled || state.coverBackgroundApplied)))
            );
          },
          onError: function () {
            "cover" === text && isEnabled
              ? updateFullscreenBg(!0)
              : "cover" === text
                ? restoreCoverBackground()
                : setBackgroundCss(DEFAULT_BACKGROUND);
          },
        }));
    }
  }
}
function enterFullscreenLrc() {
  (createFullscreenLrcOverlay(),
    clearTimeout(ui.fullscreenOverlay._closeTimer),
    (ui.fullscreenOverlay._closeSequence = (ui.fullscreenOverlay._closeSequence || 0) + 1),
    (state.lrcFullscreen = !0),
    ui.musicPic && (ui.musicPic.style.display = "none"),
    ui.musicLyrics &&
      ((ui.musicLyrics.style.display = "block"),
      (ui.musicLyrics.innerHTML = ""),
      (ui.musicLyrics._lyrics = null)),
    localStorage.setItem(state.hostname + "_lrc_mode", 1),
    ui.fullscreenLrc && ((ui.fullscreenLrc.innerHTML = ""), (ui.fullscreenLrc._lyrics = null)),
    (ui.fullscreenOverlay.style.display = "flex"),
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        ui.fullscreenOverlay.classList.add("active");
      });
    }),
    updateFullscreenBg(),
    updateFullscreenTitle(),
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var lrcFullscreenHeaderElement = $("#lrc_fullscreen_header"),
          offsetHeight = lrcFullscreenHeaderElement ? lrcFullscreenHeaderElement.offsetHeight : 90,
          lrcFullscreenContentElement = $("#lrc_fullscreen_content");
        (lrcFullscreenContentElement &&
          (lrcFullscreenContentElement.style.paddingBottom = offsetHeight + "px"),
          $(".music_lrc_div") && ($(".music_lrc_div").style.bottom = offsetHeight + "px"),
          updateLyrics(!0),
          window.plus
            ? plus.navigator.setFullscreen(!0)
            : document.documentElement.requestFullscreen());
      });
    }));
}
function exitFullscreenLrc() {
  var fullscreenOverlay = ui.fullscreenOverlay,
    fullscreenBg = ui.fullscreenBg,
    hostname = state.hostname;
  clearTimeout(fullscreenOverlay._closeTimer);
  var value = (fullscreenOverlay._closeSequence = (fullscreenOverlay._closeSequence || 0) + 1);
  (cancelBackgroundLayers(fullscreenBg, !1),
    (state.lrcFullscreen = !1),
    ui.fullscreenCover &&
      (clearTimeout(ui.fullscreenCover._coverTimer),
      (ui.fullscreenCover._coverRequest = (ui.fullscreenCover._coverRequest || 0) + 1),
      (ui.fullscreenCover._requestedCover = ""),
      (ui.fullscreenCover.style.opacity = "1")),
    [ui.fullscreenTitleEl, ui.fullscreenArtistEl].forEach(function (item) {
      item &&
        ((item._marqueeSequence = (item._marqueeSequence || 0) + 1),
        (item._marqueeText = null),
        null != item._marqueeRaf && cancelAnimationFrame(item._marqueeRaf),
        null != item._marqueeStartFrame && cancelAnimationFrame(item._marqueeStartFrame),
        clearTimeout(item._marqueeStartTimer),
        (item._marqueeRaf = item._marqueeStartFrame = item._marqueeStartTimer = null));
    }),
    window.plus ? plus.navigator.setFullscreen(!1) : document.exitFullscreen(),
    fullscreenOverlay.classList.remove("active"),
    (fullscreenOverlay._closeTimer = setTimeout(function () {
      if (
        ui.fullscreenOverlay === fullscreenOverlay &&
        fullscreenOverlay._closeSequence === value &&
        !state.lrcFullscreen &&
        state.hostname === hostname
      ) {
        ((fullscreenOverlay._closeTimer = null),
          (fullscreenOverlay.style.display = "none"),
          cancelBackgroundLayers(fullscreenBg, !0),
          fullscreenBg && (fullscreenBg.style.backgroundImage = ""),
          ui.fullscreenLrc &&
            ((ui.fullscreenLrc.innerHTML = ""), (ui.fullscreenLrc._lyrics = null)));
        var lrcFullscreenContentElement = $("#lrc_fullscreen_content");
        (lrcFullscreenContentElement && (lrcFullscreenContentElement.style.paddingBottom = ""),
          ui.musicLyrics && ((ui.musicLyrics.innerHTML = ""), (ui.musicLyrics._lyrics = null)),
          setTimeout(function () {
            ui.fullscreenOverlay !== fullscreenOverlay ||
              fullscreenOverlay._closeSequence !== value ||
              state.lrcFullscreen ||
              state.hostname !== hostname ||
              updateLyrics(!0);
          }, 30));
      }
    }, 200)));
}
function toggleFullscreenLrc() {
  state.lrcFullscreen ? exitFullscreenLrc() : enterFullscreenLrc();
}
function setFullscreenMarquee(element, text) {
  if (element && element._marqueeText !== text) {
    element._marqueeText = text;
    var value = (element._marqueeSequence = (element._marqueeSequence || 0) + 1);
    if (
      (null != element._marqueeStartFrame && cancelAnimationFrame(element._marqueeStartFrame),
      clearTimeout(element._marqueeStartTimer),
      (element._marqueeStartFrame = element._marqueeStartTimer = null),
      element._marqueeRaf &&
        (cancelAnimationFrame(element._marqueeRaf), (element._marqueeRaf = null)),
      (element.innerHTML = ""),
      text)
    ) {
      var label = makeEl("span", { class: "marquee-wrapper" });
      (label.appendChild(makeEl("span", { class: "marquee-text", html: text })),
        element.appendChild(label));
      var callback = function () {
        if (((element._marqueeStartTimer = null), isCurrentMarquee() && element.offsetWidth)) {
          var clientWidth = element.clientWidth,
            scrollWidth = label.scrollWidth;
          if (!(scrollWidth <= clientWidth + 2)) {
            label.appendChild(
              makeEl("span", {
                class: "marquee-text",
                html: text,
                style: "padding-left:60px",
              }),
            );
            var numericValue = 0,
              value2 = null,
              value3 = scrollWidth + 60,
              callback2 = function (value4) {
                if (isCurrentMarquee()) {
                  if (null === value2)
                    return (
                      (value2 = value4),
                      void (element._marqueeRaf = requestAnimationFrame(callback2))
                    );
                  var value5 = Math.min(value4 - value2, 100);
                  ((numericValue -= (40 * value5) / 1e3) <= -value3 && (numericValue += value3),
                    (label.style.transform = "translateX(" + numericValue + "px)"),
                    (value2 = value4),
                    (element._marqueeRaf = requestAnimationFrame(callback2)));
                }
              };
            element._marqueeRaf = requestAnimationFrame(callback2);
          }
        }
      };
      element._marqueeStartFrame = requestAnimationFrame(function () {
        isCurrentMarquee() &&
          (element._marqueeStartFrame = requestAnimationFrame(function () {
            ((element._marqueeStartFrame = null),
              isCurrentMarquee() && (element._marqueeStartTimer = setTimeout(callback, 60)));
          }));
      });
    }
  }
  function isCurrentMarquee() {
    return element._marqueeSequence === value && state.lrcFullscreen;
  }
}
function updateFullscreenTitle() {
  if (ui.fullscreenTitleEl && state.lrcFullscreen) {
    var musicInfo = (state.musicInfo && state.musicInfo.title) || "",
      musicInfo2 = (state.musicInfo && (state.musicInfo.artist || state.musicInfo.arist)) || "";
    if (
      (setFullscreenMarquee(ui.fullscreenTitleEl, musicInfo || "歌词"),
      setFullscreenMarquee(ui.fullscreenArtistEl, musicInfo2),
      ui.fullscreenCover)
    ) {
      var musicPic = ui.musicPic && ui.musicPic.src;
      if (musicPic && -1 === musicPic.indexOf("favicon.svg")) {
        var fullscreenCover = ui.fullscreenCover;
        if (
          fullscreenCover.src !== musicPic &&
          fullscreenCover._requestedCover !== musicPic &&
          !ui.musicPic._coverPending &&
          !ui.musicPic._coverLoading
        ) {
          ((fullscreenCover._requestedCover = musicPic),
            (fullscreenCover._coverRequest = (fullscreenCover._coverRequest || 0) + 1));
          var coverRequest = fullscreenCover._coverRequest;
          transitionCoverImage(fullscreenCover, musicPic, function () {
            return (
              ui.fullscreenCover === fullscreenCover &&
              fullscreenCover._coverRequest === coverRequest &&
              state.lrcFullscreen
            );
          });
        }
        ui.fullscreenCover.style.visibility = "visible";
      } else ui.fullscreenCover.style.visibility = "hidden";
    }
  }
}
function getLrcParent() {
  return state.lrcFullscreen && ui.fullscreenLrc ? ui.fullscreenLrc : ui.musicLyrics;
}
function buildPlaylistPanel() {
  var popupHost = createPopupHost({ open: !1 });
  ((popupHost.id = "list_overlay"),
    (popupHost._sharedPopup = !0),
    (popupHost._popupDim.style.backgroundColor = "rgba(0,0,0,0.35)"),
    popupHost.content.classList.add("app_playlist_content"),
    (ui.playlistOverlay = popupHost));
  var listDivElement = makeEl("div", {
    id: "list_div",
    class: "music_list_div app_playlist_panel",
  });
  ((ui.playlistPanel = listDivElement),
    (popupHost._popupKeepNode = !0),
    (popupHost._popupLightExit = !0),
    (popupHost._popupSurface = listDivElement),
    popupHost.content.appendChild(listDivElement));
  var listHeaderElement = makeEl("div", { id: "list_header" }),
    textNode = makeText("播放列表[0]");
  return (
    (textNode.id = "list_title"),
    (textNode.title = "点击定位到当前播放歌曲"),
    (textNode.style.cursor = "pointer"),
    (textNode.onclick = function () {
      if (popupHost._popupOpen && !popupHost._appDialogExit) {
        var playlist = state.playlist && state.playlist.playIndex;
        if (playlist > -1 && ui.playlistContainer && ui.playlistTable) {
          var elementsByTagNameItem = ui.playlistTable.getElementsByTagName("tr")[playlist];
          elementsByTagNameItem &&
            (ui.playlistContainer.scrollTop =
              elementsByTagNameItem.offsetTop -
              (ui.playlistContainer.clientHeight - elementsByTagNameItem.offsetHeight) / 2);
        }
      }
    }),
    listHeaderElement.appendChild(textNode),
    listHeaderElement.appendChild(
      makeEl("button", {
        id: "list_close_btn",
        type: "button",
        class: "app_dialog_close app_dialog_close_icon",
        html: "✕",
        onclick: function () {
          hidePlaylistOverlay();
        },
      }),
    ),
    listDivElement.appendChild(listHeaderElement),
    (ui.playlistContainer = makeEl("div", { id: "list_container" })),
    listDivElement.appendChild(ui.playlistContainer),
    (ui.playlistTable = makeEl("table", {
      id: "playlist_table",
      border: "0",
      cellspacing: "0",
      cellpadding: "0",
      style: "width:100%;color:var(--white);text-shadow:var(--white-shadow);margin:0 auto",
    })),
    ui.playlistContainer.appendChild(ui.playlistTable),
    popupHost
  );
}
var playlistPollTimer = null,
  playlistScrollTimer = null;
function startPlaylistPolling() {
  (stopPlaylistPolling(),
    (playlistPollTimer = setInterval(function () {
      sendWs({ type: "list" });
    }, 2e3)));
}
function stopPlaylistPolling() {
  playlistPollTimer && (clearInterval(playlistPollTimer), (playlistPollTimer = null));
}
function showPlaylistOverlay() {
  if (ui.playlistOverlay) {
    clearTimeout(playlistScrollTimer);
    var popupOpen = ui.playlistOverlay._popupOpen;
    (enterAnimatedDialog(ui.playlistOverlay, ui.playlistPanel),
      (ui.playlistOverlay._popupOpen = !0),
      popupOpen || registerPopupCleanup(ui.playlistOverlay, cleanupPlaylistOverlay),
      (ui.playlistOverlay.style.display = "block"),
      releasePopupLayer(ui.playlistOverlay),
      retainPopupLayer(ui.playlistOverlay),
      (ui.popup = ui.playlistOverlay),
      ui.playlistDirty &&
        state.playlist &&
        Array.isArray(state.playlist.playList) &&
        updatePlaylist(state.playlist),
      startPlaylistPolling());
    var playlist = state.playlist && state.playlist.playIndex;
    playlist > -1 &&
      ui.playlistTable &&
      ui.playlistContainer &&
      (playlistScrollTimer = setTimeout(function () {
        playlistScrollTimer = null;
        var elementsByTagNameItem = ui.playlistTable.getElementsByTagName("tr")[playlist];
        if (elementsByTagNameItem) {
          var offsetTop = elementsByTagNameItem.offsetTop,
            offsetHeight = elementsByTagNameItem.offsetHeight,
            clientHeight = ui.playlistContainer.clientHeight,
            value = offsetTop - Math.max(0, (clientHeight - offsetHeight) / 2);
          (value < 0 && (value = 0), (ui.playlistContainer.scrollTop = value));
        }
      }, 50));
  }
}
function cleanupPlaylistOverlay() {
  if (
    (clearTimeout(playlistScrollTimer),
    (playlistScrollTimer = null),
    stopPlaylistPolling(),
    ui.playlistOverlay)
  ) {
    var active = "function" == typeof attachQueueRowDrag && attachQueueRowDrag.active;
    active && active.cancel && active.cancel();
  }
}
function hidePlaylistOverlay() {
  return closePopupAnimated(ui.playlistOverlay);
}
function findTableRow(event) {
  for (var target = event.target; target && "tr" !== target.localName;)
    target = target.parentElement;
  return target;
}
function buildVolumePanel(value) {
  var container = makeEl("div"),
    textNode = makeText("音量："),
    container2 = makeDiv("min-width:50px;display:inline-block");
  (container2.appendChild(textNode), container.appendChild(container2));
  var input = makeEl("input", {
    type: "range",
    min: 0,
    step: 1,
    max: value.vol,
    value: value.vol,
  });
  ui.volumeRange = input;
  var callback = function (value2) {
    (clearTimeout(input._enableTimer),
      (input.style.pointerEvents = "auto"),
      (input._enableTimer = setTimeout(function () {
        input.style.pointerEvents = "none";
      }, value2 || 3e3)));
  };
  ((input.style.pointerEvents = "none"),
    textNode.addEventListener("click", function () {
      callback(3e3);
    }),
    input.addEventListener("input", function () {
      (callback(3e3),
        clearTimeout(input._pressTimer),
        (state.mousePressed = !0),
        (input._pressTimer = setTimeout(function () {
          state.mousePressed = !1;
        }, 600)),
        ui.volumeLabel && (ui.volumeLabel.innerHTML = "   " + input.value + "/" + input.max),
        sendWs({ type: "set_vol", vol: input.value }),
        sendWs({ type: "get_info" }));
    }),
    container.appendChild(input),
    (ui.volumeLabel = makeText(" " + input.value + "/" + input.max)));
  var container3 = makeDiv("width:30px;display:inline-block");
  return (
    container3.appendChild(ui.volumeLabel),
    container.appendChild(container3),
    container.addEventListener("dblclick", function () {
      callback(3e3);
    }),
    container
  );
}
function buildBluetoothPanel() {
  if (!isEchoVer(1847)) return null;
  var bluetoothElement = makeEl("div", { id: "bluetooth", style: "display:none" });
  ui.bluetooth = bluetoothElement;
  var input = makeEl("input", {
    type: "button",
    className: "btn",
    value: "打开蓝牙适配器",
    disabled: !0,
  });
  ((input.wait = !1),
    (input.enable = -1),
    (input.onclick = function () {
      0 === input.enable
        ? ((input.wait = !0),
          (input.disabled = !0),
          (input.value = "正在打开。。。"),
          sendWs({ type: "BT_enable" }))
        : 1 === input.enable &&
          ((input.wait = !0),
          (input.disabled = !0),
          (input.value = "正在关闭。。。"),
          sendWs({ type: "BT_disable" }));
    }),
    (ui.btEnableBtn = input),
    bluetoothElement.appendChild(input));
  var input2 = makeEl("input", {
    type: "button",
    className: "btn",
    value: "打开蓝牙可发现",
    disabled: !0,
  });
  ((input2.onclick = function () {
    (sendWs({
      type: "BT_setScanMode",
      mode: state.info.Service_Normally_Open
        ? 23 == input2.ScanMode
          ? 21
          : 23
        : 23 == input2.ScanMode
          ? 20
          : 23,
    }),
      sendWs({ type: "BT_Device" }));
  }),
    (ui.btDiscoverBtn = input2),
    bluetoothElement.appendChild(input2));
  var input3 = makeEl("input", {
    type: "button",
    className: "btn",
    value: "扫描蓝牙设备",
    disabled: !0,
  });
  ((input3.onclick = function () {
    (sendWs({ type: "BT_StartScan" }), sendWs({ type: "BT_Device" }));
  }),
    (ui.btScanBtn = input3),
    bluetoothElement.appendChild(input3),
    (ui.btWrapper = makeEl("div", {
      style: "max-width:600px;margin:10px auto;border-radius:15px",
    })),
    ui.btWrapper.classList.add("mask"),
    ui.btWrapper.appendChild(makeDiv("height:15px")));
  var container = makeEl("div"),
    textNode = makeText(
      "蓝牙列表",
      "color:var(--white);text-shadow:var(--white-shadow);font-size:15px",
    );
  ((textNode.id = "bluetooth_list_title"), container.appendChild(textNode));
  var textNode2 = makeText(
    "\t▼",
    "font-size:13px;color:var(--white);text-shadow:var(--white-shadow)",
  );
  ((textNode2.id = "bluetooth_list_ico"),
    container.appendChild(textNode2),
    (container.onclick = function () {
      var bluetoothListOccupancyElement = $("#bluetooth_list_occupancy");
      "none" === ui.btListContainer.style.display
        ? (bluetoothListOccupancyElement && (bluetoothListOccupancyElement.style.display = "none"),
          (ui.btListContainer.style.display = "block"),
          (textNode2.innerHTML = "\t▼"))
        : (bluetoothListOccupancyElement && (bluetoothListOccupancyElement.style.display = "block"),
          (ui.btListContainer.style.display = "none"),
          (textNode2.innerHTML = "\t▲"));
    }),
    ui.btWrapper.appendChild(container),
    ui.btWrapper.appendChild(
      makeEl("div", {
        id: "bluetooth_list_occupancy",
        style: "display:none;height:15px",
      }),
    ),
    (ui.btListContainer = makeEl("div", {
      style: "margin:0 auto;max-height:500px;overflow:auto",
    })),
    ui.btWrapper.appendChild(ui.btListContainer),
    (ui.btTable = makeEl("table", {
      border: "0",
      style: "width:100%;color:var(--white);text-shadow:var(--white-shadow);margin:0 auto",
    })),
    ui.btListContainer.appendChild(ui.btTable),
    ui.btTable.appendChild(makeEl("hr", { size: 1, className: "hr1" })));
  var container2 = makeEl("div"),
    textNode3 = makeText(
      "已配对的设备[0]",
      "color:var(--white);text-shadow:var(--white-shadow);font-size:13px",
    );
  ((textNode3.id = "bluetooth_pairing_title"),
    container2.appendChild(textNode3),
    ui.btTable.appendChild(container2),
    (ui.btPairedList = makeEl("div")),
    ui.btTable.appendChild(ui.btPairedList),
    ui.btTable.appendChild(makeEl("hr", { size: 1, className: "hr1" })));
  var container3 = makeEl("div"),
    textNode4 = makeText(
      "扫描到的设备[0]",
      "color:var(--white);text-shadow:var(--white-shadow);font-size:13px",
    );
  return (
    (textNode4.id = "bluetooth_scan_title"),
    container3.appendChild(textNode4),
    ui.btTable.appendChild(container3),
    (ui.btScannedList = makeEl("div")),
    ui.btTable.appendChild(ui.btScannedList),
    ui.btTable.appendChild(makeEl("hr", { size: 1, className: "hr1" })),
    bluetoothElement.appendChild(ui.btWrapper),
    bluetoothElement
  );
}
function updateScreenStageSize(value, value2) {
  if (value > 0 && value2 > 0 && ui.screenStage) {
    var value3 = value2 / value;
    ui.screenStage._ratio !== value3 &&
      ((ui.screenStage._ratio = value3), (ui.screenStage.style.paddingBottom = 100 * value3 + "%"));
  }
}
function buildScreenPanel() {
  var screenDivElement = makeEl("div", { id: "screen_div", style: "display:none" });
  ui.screen = screenDivElement;
  var container = makeEl("div", { style: "width:100%;max-width:720px;margin:0 auto" }),
    screenStageElement = makeEl("div", {
      id: "screen_stage",
      style:
        "position:relative;height:0;overflow:hidden;background:#111;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none",
    });
  ((ui.screenStage = screenStageElement), updateScreenStageSize(720, 480));
  var screenImgElement = makeEl("img", {
    id: "screen_img",
    draggable: !1,
    style:
      "position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;visibility:hidden;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none",
  });
  (screenImgElement.setAttribute("_width", 0),
    screenImgElement.setAttribute("_height", 0),
    (screenImgElement.onload = function () {
      if (ui.screen && "none" !== ui.screen.style.display && this.getAttribute("src")) {
        var naturalWidth = this.naturalWidth,
          naturalHeight = this.naturalHeight;
        naturalWidth > 0 &&
          naturalHeight > 0 &&
          (updateScreenStageSize(naturalWidth, naturalHeight),
          (this.getAttribute("_width") == naturalWidth &&
            this.getAttribute("_height") == naturalHeight) ||
            (this.setAttribute("_width", naturalWidth),
            this.setAttribute("_height", naturalHeight),
            runShell("wm size", "wm_size")));
      }
    }),
    (ui.screenImage = screenImgElement),
    screenStageElement.appendChild(screenImgElement),
    container.appendChild(screenStageElement),
    screenDivElement.appendChild(container),
    screenDivElement.appendChild(makeEl("br")));
  for (
    var items = [
        ["返回", 4],
        ["输入", -1, "input"],
        ["删除", 67],
      ],
      index = 0;
    index < items.length;
    index++
  )
    (function (value) {
      var button = makeButton(value[0], function () {
        if ("input" === value[2]) {
          ((this.disabled = !0), stopScreenCapture());
          var receiver = this,
            callback = function () {
              ((receiver.disabled = !1),
                setTimeout(function () {
                  ui.screen && "none" !== ui.screen.style.display && startScreenCapture();
                }, 500));
            };
          setTimeout(function () {
            showAppPrompt(
              "请输入内容！",
              "",
              function (value2) {
                (callback(), null != value2 && sendTextInput(value2));
              },
              { placeholder: "输入要发送的文字", onCancel: callback },
            );
          }, 600);
        } else sendKeyEvent(value[1]);
      });
      ("input" === value[2] && (button.id = "input_text_btn"),
        screenDivElement.appendChild(button));
    })(items[index]);
  (screenDivElement.appendChild(makeEl("br")),
    screenDivElement.appendChild(
      makeButton("重置分辨率", function () {
        ((this.disabled = !0), (this.value = "已重置分辨率为720x480！"));
        var receiver = this;
        (setTimeout(function () {
          ((receiver.value = "重置分辨率"), (receiver.disabled = !1));
        }, 1e3),
          runShell("wm size 720x480"));
      }),
    ),
    screenDivElement.appendChild(
      makeButton("重置系统语言", function () {
        ((this.disabled = !0),
          (this.value = "已重置系统语言为中文，重启音箱后生效！"),
          showAppAlert(this.value));
        var receiver = this;
        (setTimeout(function () {
          ((receiver.value = "重置系统语言"), (receiver.disabled = !1));
        }, 1e3),
          runShell("setprop persist.sys.language zh && setprop persist.sys.country CN"));
      }),
    ),
    ui.container && ui.container.appendChild(screenDivElement));
}
function sendTextInput(text) {
  var items = text.split(""),
    callback = function () {
      for (var text2 = "", index = 0; index < 2 || items.length > 0; index++) {
        var value = items.shift();
        if (null == value || "" === value) break;
        text2 += value;
      }
      text2 && (sendAdbInput("text " + text2), setTimeout(callback, 100));
    };
  callback();
}
function sendKeyEvent(value) {
  sendAdbInput("keyevent " + value);
}
function sendAdbInput(value) {
  sendWs({ type: "input", input: value });
}
function startScreenCapture() {
  (sendWs({ type: "start_screencap", interval: 100 }),
    (document.onkeydown = function (event) {
      var options = { 13: 23, 37: 21, 38: 19, 39: 22, 40: 20 };
      if (options[event.keyCode]) return (sendKeyEvent(options[event.keyCode]), !1);
    }));
}
function stopScreenCapture() {
  (sendWs({ type: "stop_screencap" }), (document.onkeydown = null));
}
function unhideScreen() {
  ((document.title = "R1音箱屏幕页面" + state.deviceTag),
    setPageTitle(document.title),
    ui.screen && (ui.screen.style.display = "block"),
    startScreenCapture(),
    ui.screenImage &&
      (ui.screenImage.setAttribute("_width", 0), ui.screenImage.setAttribute("_height", 0)),
    ui.screen && ui.screen.controller && ui.screen.controller.destroy(),
    ui.screen &&
      (ui.screen.controller = new ScreenController(ui.screenImage, {
        longPressDelay: 500,
        moveThreshold: 8,
        targetResolution: { width: 720, height: 480 },
      })));
}
function hideScreen() {
  (stopScreenCapture(),
    "function" == typeof clearScreenFrameUrl && clearScreenFrameUrl(),
    ui.screen &&
      ui.screen.controller &&
      (ui.screen.controller.destroy(), (ui.screen.controller = null)),
    ui.screen && (ui.screen.style.display = "none"));
}
function buildSoundEffectsPanel() {
  var soundEffectsElement = makeEl("div", {
    id: "sound_effects",
    style: "display:none;max-width:600px;margin:10px auto;border-radius:15px",
  });
  (soundEffectsElement.classList.add("mask"),
    (ui.soundEffects = soundEffectsElement),
    soundEffectsElement.appendChild(makeDiv("height:15px")),
    (ui.eqsBox = makeEl("div")),
    (ui.bassBox = makeEl("div")),
    (ui.loudnessBox = makeEl("div")),
    (ui.speakerVolBox = makeEl("div")),
    (ui.presetBox = makeEl("div")),
    soundEffectsElement.appendChild(makeText("EQ：")),
    soundEffectsElement.appendChild(
      makeEl("input", {
        type: "checkbox",
        id: "eq_switch",
        onclick: function () {
          (sendWs({ type: "set_eq_enable", enable: this.checked }),
            sendWs({ type: "get_eq_config" }));
        },
      }),
    ),
    soundEffectsElement.appendChild(ui.eqsBox),
    soundEffectsElement.appendChild(makeText("低音：")),
    soundEffectsElement.appendChild(
      makeEl("input", {
        type: "checkbox",
        id: "bass_switch",
        onclick: function () {
          (sendWs({ type: "set_bass_enable", enable: this.checked }),
            sendWs({ type: "get_eq_config" }));
        },
      }),
    ),
    soundEffectsElement.appendChild(ui.bassBox),
    soundEffectsElement.appendChild(makeText("响度：")),
    soundEffectsElement.appendChild(
      makeEl("input", {
        type: "checkbox",
        id: "loudness_switch",
        onclick: function () {
          (sendWs({ type: "set_loudness_enable", enable: this.checked }),
            sendWs({ type: "get_eq_config" }));
        },
      }),
    ),
    soundEffectsElement.appendChild(ui.loudnessBox),
    isEchoVer(1876) &&
      (soundEffectsElement.appendChild(makeText("扬声器音量：")),
      soundEffectsElement.appendChild(ui.speakerVolBox)));
  var textNode = makeText("DSP低音增强：");
  ((textNode.id = "dsp_bass_text"),
    soundEffectsElement.appendChild(textNode),
    soundEffectsElement.appendChild(
      makeEl("input", {
        type: "checkbox",
        id: "dsp_bass_switch",
        onclick: function () {
          isEchoVer(1869)
            ? (sendAction(16384, 100, 0, this.checked ? 1 : 0),
              runShell(
                'echo route0feture: $(getprop persist.route0feture) && echo pram: $(tinymix -D 2 "DSP Firmware PRAM")',
                "dsp_bass_state",
              ))
            : runShell(
                "setprop persist.route0feture " +
                  (this.checked ? 1 : 0) +
                  ' && echo route0feture: $(getprop persist.route0feture) && echo pram: $(tinymix -D 2 "DSP Firmware PRAM")',
                "dsp_bass_state",
              );
        },
      }),
    ),
    soundEffectsElement.appendChild(ui.presetBox),
    soundEffectsElement.appendChild(makeDiv("height:15px")),
    ui.container && ui.container.appendChild(soundEffectsElement));
}
function refreshAudioEffects(value) {
  state.soundEffectsData = value;
  var eq = value.eq,
    bass = value.bass,
    loudness = value.loudness,
    mixer = value.Mixer,
    eqSwitchElement = $("#eq_switch"),
    bassSwitchElement = $("#bass_switch"),
    loudnessSwitchElement = $("#loudness_switch");
  (eqSwitchElement && (eqSwitchElement.checked = !0 === eq.sound_effects_eq_enable),
    bassSwitchElement && (bassSwitchElement.checked = !0 === bass.sound_effects_bass_enable),
    loudnessSwitchElement &&
      (loudnessSwitchElement.checked = !0 === loudness.sound_effects_loudness_enable),
    renderEqBands(eq),
    renderBassControl(bass),
    renderLoudnessControl(loudness),
    renderSpeakerVolume(mixer),
    renderEqPreset(eq));
}
function renderEqBands(value) {
  if (ui.eqsBox)
    for (
      var value2 = "" !== ui.eqsBox.innerHTML,
        bands = value.Bands,
        options = {
          6e4: "低频",
          23e4: "中低",
          91e4: "中频",
          36e5: "中高",
          14e6: "高频",
        },
        index = 0;
      index < bands.list.length;
      index++
    )
      (function (value3) {
        var input, value4;
        if (value2)
          ((input = $("#band_" + value3.Band)), (value4 = $("#band_text_" + value3.Band)));
        else {
          var container = makeDiv("width:80px;display:inline-block");
          (container.appendChild(makeText((options[value3.Frequency] || value3.Frequency) + "：")),
            ui.eqsBox.appendChild(container),
            ((input = makeEl("input", {
              type: "range",
              min: parseInt(bands.minBandLevel / 100, 10),
              max: parseInt(bands.maxBandLevel / 100, 10),
            })).id = "band_" + value3.Band),
            input.setAttribute("Band", value3.Band),
            input.addEventListener("input", function () {
              var value5 = $("#band_text_" + this.getAttribute("Band"));
              (value5 && (value5.innerHTML = "   " + this.value + "dB"),
                sendWs({
                  type: "set_eq_bandlevel",
                  band: this.getAttribute("Band"),
                  level: 100 * this.value,
                }),
                sendWs({ type: "get_eq_config" }));
            }),
            ui.eqsBox.appendChild(input),
            ((value4 = makeText("")).id = "band_text_" + value3.Band));
          var container2 = makeDiv("width:50px;display:inline-block");
          (container2.appendChild(value4),
            ui.eqsBox.appendChild(container2),
            ui.eqsBox.appendChild(makeEl("div")));
        }
        (!state.mousePressed && input && (input.value = parseInt(value3.BandLevel / 100, 10)),
          value4 && (value4.innerHTML = "   " + value3.BandLevel / 100 + "dB"));
      })(bands.list[index]);
}
function renderBassControl(value) {
  if (ui.bassBox) {
    var bassValueElement, bassTextValueElement;
    if ("" !== ui.bassBox.innerHTML)
      ((bassValueElement = $("#bass_value")), (bassTextValueElement = $("#bass_text_value")));
    else {
      var container = makeDiv("width:80px;display:inline-block");
      (container.appendChild(makeText("低音增强：")),
        ui.bassBox.appendChild(container),
        ((bassValueElement = makeEl("input", { type: "range", min: 0, max: 100 })).id =
          "bass_value"),
        bassValueElement.addEventListener("input", function () {
          var bassTextValueElement2 = $("#bass_text_value");
          (bassTextValueElement2 &&
            (bassTextValueElement2.innerHTML = "   " + bassValueElement.value + "%"),
            sendWs({ type: "set_bass_strength", strength: 10 * bassValueElement.value }),
            sendWs({ type: "get_eq_config" }));
        }),
        ui.bassBox.appendChild(bassValueElement),
        ((bassTextValueElement = makeText("")).id = "bass_text_value"));
      var container2 = makeDiv("width:50px;display:inline-block");
      (container2.appendChild(bassTextValueElement), ui.bassBox.appendChild(container2));
    }
    (!state.mousePressed &&
      bassValueElement &&
      (bassValueElement.value = value.Current_Strength / 10),
      bassTextValueElement &&
        (bassTextValueElement.innerHTML = "   " + value.Current_Strength / 10 + "%"));
  }
}
function renderLoudnessControl(value) {
  if (ui.loudnessBox) {
    var loudnessValueElement, loudnessTextValueElement;
    if ("" !== ui.loudnessBox.innerHTML)
      ((loudnessValueElement = $("#loudness_value")),
        (loudnessTextValueElement = $("#loudness_text_value")));
    else {
      var container = makeDiv("width:80px;display:inline-block");
      (container.appendChild(makeText("响度控制：")),
        ui.loudnessBox.appendChild(container),
        ((loudnessValueElement = makeEl("input", { type: "range", min: -3e3, max: 3e3 })).id =
          "loudness_value"),
        loudnessValueElement.addEventListener("input", function () {
          var loudnessTextValueElement2 = $("#loudness_text_value");
          (loudnessTextValueElement2 &&
            (loudnessTextValueElement2.innerHTML = "   " + loudnessValueElement.value / 100 + "dB"),
            sendWs({ type: "set_loudness_gain", gain: loudnessValueElement.value }),
            sendWs({ type: "get_sq_config" }));
        }),
        ui.loudnessBox.appendChild(loudnessValueElement),
        ((loudnessTextValueElement = makeText("")).id = "loudness_text_value"));
      var container2 = makeDiv("width:50px;display:inline-block");
      (container2.appendChild(loudnessTextValueElement), ui.loudnessBox.appendChild(container2));
    }
    (!state.mousePressed &&
      loudnessValueElement &&
      (loudnessValueElement.value = value.Current_Gain),
      loudnessTextValueElement &&
        (loudnessTextValueElement.innerHTML = "   " + value.Current_Gain / 100 + "dB"));
  }
}
function renderSpeakerVolume(value) {
  if (isEchoVer(1876) && ui.speakerVolBox) {
    var numericValue = 231;
    if (!("" !== ui.speakerVolBox.innerHTML)) {
      var container = makeDiv("width:80px;display:inline-block");
      (container.appendChild(makeText("中低音：")), ui.speakerVolBox.appendChild(container));
      var timeoutId,
        input = makeEl("input", { type: "range", min: 211, max: 251, value: numericValue });
      ((input.id = "bass_vol_value"),
        input.addEventListener("input", function () {
          var bassVolTextValueElement2 = $("#bass_vol_text_value");
          (bassVolTextValueElement2 &&
            (bassVolTextValueElement2.innerHTML = "   " + (input.value - numericValue) + "dB"),
            clearTimeout(timeoutId),
            (timeoutId = setTimeout(function () {
              sendWs({
                type: "sends",
                list: [
                  {
                    type: "setMixerValue",
                    controlName: "DAC Digital Volume L",
                    value: input.value,
                  },
                  { type: "get_eq_config" },
                ],
              });
            }, 100)));
        }),
        ui.speakerVolBox.appendChild(input));
      var textNode = makeText("");
      textNode.id = "bass_vol_text_value";
      var container2 = makeDiv("width:50px;display:inline-block");
      (container2.appendChild(textNode),
        ui.speakerVolBox.appendChild(container2),
        ui.speakerVolBox.appendChild(makeEl("div")));
      var container3 = makeDiv("width:80px;display:inline-block");
      (container3.appendChild(makeText("高音：")), ui.speakerVolBox.appendChild(container3));
      var timeoutId2,
        input2 = makeEl("input", { type: "range", min: 211, max: 251, value: numericValue });
      ((input2.id = "high_vol_value"),
        input2.addEventListener("input", function () {
          var highVolTextValueElement2 = $("#high_vol_text_value");
          (highVolTextValueElement2 &&
            (highVolTextValueElement2.innerHTML = "   " + (input2.value - numericValue) + "dB"),
            clearTimeout(timeoutId2),
            (timeoutId2 = setTimeout(function () {
              sendWs({
                type: "sends",
                list: [
                  {
                    type: "setMixerValue",
                    controlName: "DAC Digital Volume R",
                    value: input2.value,
                  },
                  { type: "get_eq_config" },
                ],
              });
            }, 100)));
        }),
        ui.speakerVolBox.appendChild(input2));
      var textNode2 = makeText("");
      textNode2.id = "high_vol_text_value";
      var container4 = makeDiv("width:50px;display:inline-block");
      (container4.appendChild(textNode2), ui.speakerVolBox.appendChild(container4));
    }
    var bassVolValueElement = $("#bass_vol_value"),
      highVolValueElement = $("#high_vol_value"),
      bassVolTextValueElement = $("#bass_vol_text_value"),
      highVolTextValueElement = $("#high_vol_text_value");
    value &&
      bassVolValueElement &&
      highVolValueElement &&
      bassVolTextValueElement &&
      highVolTextValueElement &&
      (state.mousePressed ||
        ((bassVolValueElement.value = value["DAC Digital Volume L"] || bassVolValueElement.value),
        (highVolValueElement.value = value["DAC Digital Volume R"] || highVolValueElement.value)),
      (bassVolTextValueElement.innerHTML =
        "   " + (bassVolValueElement.value - numericValue) + "dB"),
      (highVolTextValueElement.innerHTML =
        "   " + (highVolValueElement.value - numericValue) + "dB"));
  }
}
function renderEqPreset(value) {
  if (ui.presetBox) {
    var value2 = "" !== ui.presetBox.innerHTML,
      items = value.Preset_list.slice(0),
      currentPreset = value.Current_Preset;
    items.length > 0 && -1 == currentPreset && items.unshift({ Preset: -1, Name: "Custom" });
    var options = {
      Custom: "自定义",
      Normal: "标准",
      Classical: "古典",
      Dance: "舞曲",
      Flat: "平直",
      Folk: "民俗",
      "Heavy Metal": "重金属",
      "Hip Hop": "嘻哈",
      Jazz: "爵士",
      Pop: "流行",
      Rock: "摇滚",
    };
    if (value2) {
      var presetListElement = $("#preset_list");
      if (!presetListElement) return;
      if (!updateCustomPresets())
        for (var index = 0; index < presetListElement.length; index++)
          if (presetListElement[index].value == currentPreset) {
            presetListElement[index].selected = !0;
            break;
          }
    } else {
      var container = makeDiv("display:inline-block");
      (container.appendChild(makeText("预设EQ：")), ui.presetBox.appendChild(container));
      var presetListElement2 = makeEl("select", {
        id: "preset_list",
        style: "backdrop-filter:none",
      });
      presetListElement2.onchange = function () {
        if (-2 == parseInt(this.value, 10))
          for (
            var optionItem = this.options[this.selectedIndex],
              parsedData = JSON.parse(optionItem.getAttribute("bands")),
              index3 = 0;
            index3 < parsedData.length;
            index3++
          )
            sendWs({
              type: "set_eq_bandlevel",
              band: parsedData[index3].Band,
              level: parsedData[index3].BandLevel,
            });
        else
          -1 != parseInt(this.value, 10) && sendWs({ type: "set_eq_preset", preset: this.value });
        sendWs({ type: "get_eq_config" });
      };
      var option = makeEl("option", {
        value: -1,
        html: options.Custom,
        style: "display:none",
      });
      (option.value == currentPreset && (option.selected = !0),
        presetListElement2.appendChild(option));
      for (var index2 = 0; index2 < items.length; index2++)
        if (!(items[index2].Preset < 0)) {
          var option2 = makeEl("option", {
            value: items[index2].Preset,
            html: options[items[index2].Name] || items[index2].Name,
          });
          (option2.value == currentPreset && (option2.selected = !0),
            presetListElement2.appendChild(option2));
        }
      (ui.presetBox.appendChild(presetListElement2),
        ui.presetBox.appendChild(
          makeButton("保存EQ", function () {
            showAppPrompt(
              "请输入要保存的EQ名称！",
              "",
              function (value3) {
                value3 && callback(value3);
              },
              { placeholder: "EQ 名称" },
            );
          }),
        ));
      var callback = function (value3) {
        for (
          var value4 = "自定义[" + value3 + "]",
            parsedData = JSON.parse(localStorage.getItem("custom_eqs") || "[]"),
            options2 = {
              name: value4,
              bands: JSON.stringify(state.soundEffectsData.eq.Bands.list),
            },
            value5 = -1,
            index3 = 0;
          index3 < parsedData.length;
          index3++
        )
          if (parsedData[index3].name === options2.name) {
            value5 = index3;
            break;
          }
        (-1 !== value5 ? (parsedData[value5] = options2) : parsedData.push(options2),
          localStorage.setItem("custom_eqs", JSON.stringify(parsedData)),
          showAppAlert("已保存！"),
          updateCustomPresets());
      };
      updateCustomPresets();
    }
  }
}
function updateCustomPresets() {
  var isEnabled = !1,
    parsedData = JSON.parse(localStorage.getItem("custom_eqs") || "[]"),
    presetListElement = $("#preset_list");
  if (!presetListElement) return !1;
  for (var index = 0; index < parsedData.length; index++) {
    for (
      var parsedDataItem = parsedData[index], element = null, index2 = 0;
      index2 < presetListElement.length;
      index2++
    )
      if (presetListElement[index2].innerText === parsedDataItem.name) {
        element = presetListElement[index2];
        break;
      }
    (element
      ? element.getAttribute("bands") !== parsedDataItem.bands &&
        element.setAttribute("bands", parsedDataItem.bands)
      : ((element = makeEl("option", { value: -2, html: parsedDataItem.name })).setAttribute(
          "bands",
          parsedDataItem.bands,
        ),
        presetListElement.appendChild(element)),
      element.getAttribute("bands") === JSON.stringify(state.soundEffectsData.eq.Bands.list) &&
        ((element.selected = !0), (isEnabled = !0)));
  }
  return isEnabled;
}
function startSoundEffectsRefresh() {
  (stopSoundEffectsRefresh(),
    (timers.soundEffects = setInterval(function () {
      (sendWs({ type: "get_eq_config" }),
        runShell(
          'echo route0feture: $(getprop persist.route0feture) && echo pram: $(tinymix -D 2 "DSP Firmware PRAM")',
          "dsp_bass_state",
        ));
    }, 1e3)));
}
function stopSoundEffectsRefresh() {
  (clearInterval(timers.soundEffects), (timers.soundEffects = -1));
}
function unhideSoundEffects() {
  ((document.title = "R1音箱音效页面" + state.deviceTag),
    setPageTitle(document.title),
    ui.soundEffects && (ui.soundEffects.style.display = "block"),
    startSoundEffectsRefresh());
}
function hideSoundEffects() {
  (ui.soundEffects && (ui.soundEffects.style.display = "none"), stopSoundEffectsRefresh());
}
function getTrackTitle(track) {
  return track
    ? track.title
      ? track.artist
        ? track.title + "-" + track.artist
        : track.album
          ? track.title + "-" + track.album
          : track.title
      : track.album || ""
    : "";
}
function getReportedUnisoundVersion(value) {
  var value2 = value && value.u_ver,
    numericValue =
      "number" == typeof value2 || ("string" == typeof value2 && "" !== value2.trim())
        ? Number(value2)
        : NaN;
  return isFinite(numericValue) && Math.floor(numericValue) === numericValue && numericValue > 1e3
    ? numericValue
    : -1;
}
function readUnisoundAvailable() {
  var unisoundDeviceInfo = state.unisoundDeviceInfo;
  if (
    !unisoundDeviceInfo ||
    unisoundDeviceInfo.ip !== state.ip ||
    unisoundDeviceInfo.ws !== state.ws ||
    !state.ws ||
    state.ws.readyState !== WebSocket.OPEN
  )
    return !1;
  var unisound = unisoundDeviceInfo.info.Unisound;
  return (
    unisoundDeviceInfo.info.u_ver > 1e3 &&
    (null == unisound ||
      !0 === unisound ||
      1 === unisound ||
      "true" === unisound ||
      "1" === unisound)
  );
}
function updateUnisoundAvailability(value) {
  var uVer = state.uVer,
    reportedUnisoundVersion = getReportedUnisoundVersion(value);
  ((state.uVer = reportedUnisoundVersion),
    (state.unisoundDeviceInfo = {
      ip: state.ip,
      ws: state.ws,
      info: { Unisound: value.Unisound, u_ver: reportedUnisoundVersion },
    }),
    (state.unisoundAvailable = readUnisoundAvailable()),
    (state.isNewUnisound = state.unisoundAvailable),
    uVer !== reportedUnisoundVersion &&
      "function" == typeof closeVersionInfoWindow &&
      closeVersionInfoWindow(),
    updateMusicCollectionButtons(value));
}
function resetUnisoundAvailability() {
  ((state.uVer = -1),
    (state.unisoundDeviceInfo = null),
    (state.unisoundAvailable = state.isNewUnisound = !1),
    (state.unisoundInfo = {}),
    (state.unisoundRetryCount = [0, 0, 0]),
    "function" == typeof closeVersionInfoWindow && closeVersionInfoWindow(),
    updateMusicCollectionButtons(state.info || {}));
}
function updateMusicCollectionButtons(value) {
  var musicInfo =
    readUnisoundAvailable() &&
    Number(state.unisoundDeviceInfo.info.u_ver) >= 1700 &&
    (0 == value.play_type || 1 == value.play_type) &&
    value.music_info &&
    (0 == value.music_info.ItemType || 1 == value.music_info.ItemType);
  (["#music_btn_collect", "#music_btn_cancel_collect"].forEach(function (item) {
    var element = $(item);
    element &&
      ((element.hidden = !musicInfo), (element.style.display = musicInfo ? "inline-flex" : "none"));
  }),
    ui.applyLyricsModeHeight && ui.applyLyricsModeHeight());
}
function executeMusicCommand(command) {
  var data = command.getAttribute("data");
  if (("collect" !== data && "cancel_collect" !== data) || readUnisoundAvailable()) {
    if ("prev" === data) sendWs({ type: "prev" });
    else if ("next" === data) sendWs({ type: "next" });
    else if ("pause" === data) sendAction(4, 2, -1, !0);
    else if ("play" === data) {
      var playlist = state.playlist && state.playlist.playList;
      0 == state.info.play_type &&
      (!playlist || playlist.length < 1) &&
      !state.info.play_state &&
      state.info.Recoverable_music
        ? sendAction(4, 24, 1, !0)
        : sendAction(4, 3, -1, !0);
    } else
      "collect" === data
        ? showAppConfirm("确定要收藏[" + getTrackTitle(state.musicInfo) + "]吗？", function () {
            readUnisoundAvailable() &&
              sendToUnisound({
                type: "api",
                data: { type: "collect", music_info: state.musicInfo },
              });
          })
        : "cancel_collect" === data &&
          showAppConfirm("确定要取消收藏[" + getTrackTitle(state.musicInfo) + "]吗？", function () {
            readUnisoundAvailable() &&
              sendToUnisound({
                type: "api",
                data: { type: "cancel_collect", music_info: state.musicInfo },
              });
          });
    sendWs({ type: "get_info" });
  }
}
function transitionCoverImage(element, value, value2, value3) {
  clearTimeout(element._coverTimer);
  var value4 = "function" == typeof prefersReducedDialogMotion && prefersReducedDialogMotion();
  ((element.style.transition = "opacity 0.18s ease"),
    (element.style.opacity = value4 ? "1" : "0"),
    (element._coverTimer = setTimeout(
      function () {
        value2() &&
          ((element._coverTimer = null),
          value3 && value3(),
          (element.src = value),
          (element.style.opacity = "1"));
      },
      value4 ? 0 : 180,
    )));
}
function updateMusicCover(coverUrl) {
  var musicPic = ui.musicPic;
  if (
    musicPic &&
    (coverUrl = coverUrl || musicPic.placeholderSrc) &&
    musicPic._requestedCover !== coverUrl
  ) {
    (waitMusicCover(),
      (musicPic._coverPending = !1),
      (musicPic._coverLoading = coverUrl !== musicPic.placeholderSrc),
      (musicPic._requestedCover = coverUrl),
      coverUrl === musicPic.placeholderSrc && restoreCoverBackground());
    var coverRequest = musicPic._coverRequest;
    (clearTimeout(musicPic._coverTimer), (musicPic.style.opacity = "1"));
    var image = new Image();
    ((image.onload = function () {
      commitCoverImage(coverUrl);
    }),
      (image.onerror = function () {
        musicPic === ui.musicPic &&
          musicPic._coverRequest === coverRequest &&
          ((musicPic._coverLoading = !1),
          restoreCoverBackground(),
          commitCoverImage(musicPic.placeholderSrc || coverUrl));
      }),
      (image.src = coverUrl));
  }
  function commitCoverImage(value) {
    if (
      musicPic === ui.musicPic &&
      musicPic._coverRequest === coverRequest &&
      (transitionCoverImage(
        musicPic,
        value,
        function () {
          return musicPic === ui.musicPic && musicPic._coverRequest === coverRequest;
        },
        function () {
          ((musicPic._coverLoading = !1),
            value === coverUrl &&
              value !== musicPic.placeholderSrc &&
              (musicPic._failedBackgroundCover = ""));
        },
      ),
      state.lrcFullscreen && ui.fullscreenCover && value !== musicPic.placeholderSrc)
    ) {
      var fullscreenCover = ui.fullscreenCover;
      ((fullscreenCover._requestedCover = value),
        (fullscreenCover._coverRequest = (fullscreenCover._coverRequest || 0) + 1));
      var coverRequest2 = fullscreenCover._coverRequest;
      transitionCoverImage(
        fullscreenCover,
        value,
        function () {
          return (
            ui.fullscreenCover === fullscreenCover &&
            fullscreenCover._coverRequest === coverRequest2 &&
            musicPic._coverRequest === coverRequest &&
            state.lrcFullscreen
          );
        },
        function () {
          fullscreenCover.style.visibility = "visible";
        },
      );
    }
  }
}
function waitMusicCover() {
  var musicPic = ui.musicPic;
  musicPic &&
    ((musicPic._coverRequest = (musicPic._coverRequest || 0) + 1),
    (musicPic._requestedCover = ""),
    (musicPic._coverPending = !0),
    (musicPic._coverLoading = !1),
    clearTimeout(musicPic._coverTimer),
    (musicPic.style.opacity = "1"),
    ui.fullscreenCover &&
      (clearTimeout(ui.fullscreenCover._coverTimer),
      (ui.fullscreenCover._coverRequest = (ui.fullscreenCover._coverRequest || 0) + 1),
      (ui.fullscreenCover._requestedCover = ""),
      (ui.fullscreenCover.style.opacity = "1")),
    [ui.background, ui.fullscreenBg].forEach(function (element) {
      var element2 = element && element._backgroundLayers;
      element2 &&
        element2.cover &&
        (cancelBackgroundLayers(element, !1, !0),
        element2.fading ||
          (element2.incoming &&
            (element2.incoming.parentNode === element && element.removeChild(element2.incoming),
            (element2.incoming = null))));
    }));
}
function restoreCoverBackground() {
  state.coverBackgroundEnabled &&
    (ui.musicPic && (ui.musicPic._failedBackgroundCover = ui.musicPic.src), restoreBackground());
}
function updateCoverBackground() {
  if (
    ui.musicPanel &&
    "block" === ui.musicPanel.style.display &&
    state.coverBackgroundEnabled &&
    ui.musicPic &&
    ui.background &&
    !ui.musicPic._coverPending &&
    !ui.musicPic._coverLoading
  ) {
    var url = safeBackgroundUrl(ui.musicPic.src);
    if (
      !url ||
      url.indexOf("favicon.svg") > -1 ||
      (ui.musicPic.complete && 0 === ui.musicPic.naturalWidth) ||
      ui.musicPic._failedBackgroundCover === url
    )
      restoreCoverBackground();
    else if (ui.musicPic.complete) {
      var background = ui.background,
        musicPic = ui.musicPic,
        coverRequest = musicPic._coverRequest;
      ((state.coverBackgroundApplied = !0),
        transitionBackground(
          background,
          {
            url: url,
            props: {
              "background-image": 'url("' + url + '")',
              "background-position": "center",
              "background-size": "cover",
              "background-repeat": "no-repeat",
              "background-attachment": "fixed",
            },
          },
          {
            mode: "cover",
            cover: !0,
            blur: 50,
            guard: function () {
              return (
                ui.background === background &&
                ui.musicPic === musicPic &&
                musicPic.src === url &&
                musicPic._coverRequest === coverRequest &&
                !musicPic._coverPending &&
                !musicPic._coverLoading &&
                state.coverBackgroundApplied &&
                state.coverBackgroundEnabled &&
                ui.musicPanel &&
                "block" === ui.musicPanel.style.display
              );
            },
            onReady: function () {
              var mask =
                state.apiMusicInfo && state.apiMusicInfo.mask
                  ? state.apiMusicInfo.mask
                  : "rgba(var(--mask-color),0.1);";
              (ui.main.classList &&
                !ui.main.classList.contains("mask") &&
                ui.main.classList.add("mask"),
                (ui.main.style =
                  "position:fixed;z-index:1;left:0;top:0;width:100%;height:100%;overflow:auto;background-color:" +
                  mask +
                  ";backdrop-filter:none;-webkit-backdrop-filter:none"),
                ui.qualitySelect &&
                  ui.qualitySelect.style &&
                  (ui.qualitySelect.style.backdropFilter = "none"));
            },
            onError: restoreCoverBackground,
          },
        ),
        state.lrcFullscreen && updateFullscreenBg());
    }
  }
}
function hasRealLyrics() {
  return !!state.lyrics.length && (1 !== state.lyrics.length || -1 !== state.lyrics[0][0]);
}
function lyricsWaiting() {
  var lyricsPending = state.lyricsPending;
  return (
    !!lyricsPending &&
    lyricsPending.musicId === state.musicId &&
    lyricsPending.hostname === state.hostname &&
    lyricsPending.socket === state.ws
  );
}
function showLrcPlaceholder(value) {
  var lrcParent = getLrcParent();
  if (
    lrcParent &&
    (!ui.musicLyrics || "block" === ui.musicLyrics.style.display || state.lrcFullscreen) &&
    !(
      (hasRealLyrics() && lrcParent.querySelector(".music_lrc_div")) ||
      (lrcParent._placeholderText === value && lrcParent.querySelector(".lrc_placeholder"))
    )
  ) {
    ((lrcParent.innerHTML = ""), (lrcParent._lyrics = null), (lrcParent._placeholderText = value));
    var container = makeEl("div", {
      class: "lrc_placeholder",
      style:
        "width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;user-select:none",
    });
    (container
      .appendChild(makeEl("h3", { class: "lrc", style: "margin:0" }))
      .appendChild(makeEl("span", { class: "lrc-inner", html: value })),
      lrcParent.appendChild(container),
      ui.applyLyricsModeHeight && setTimeout(ui.applyLyricsModeHeight, 0));
  }
}
function updateLyrics(value, value2) {
  if (lyricsWaiting()) return (syncProgressBar(), void showLrcPlaceholder("正在加载歌词…"));
  if (!state.lyricTiming.length)
    return (
      ui.musicTimeRange && (setMusicProgress(0, 0), (state.lastLyricTime = -1)),
      void showLrcPlaceholder("暂无播放")
    );
  var value3 = state.titleDisplayUntil - Date.now() > 0,
    musicPic = ui.musicPic && "running" !== ui.musicPic.style.webkitAnimationPlayState,
    value4 = -1 === state.lyricTiming[0];
  if (value || value4 || !(value3 || (musicPic && !state.timeLocked))) {
    var callback = function () {
      renderLyricsFrame(value);
    };
    value2 ? waitAndRender(callback) : callback();
  } else syncProgressBar();
}
function syncProgressBar() {
  if (!(state.lyricTiming.length < 2) && ui.musicTimeRange) {
    var numericValue = parseInt(state.lyricTiming[2], 10) || 0,
      numericValue2 = parseInt(state.lyricTiming[1], 10) || 0;
    (!state.timeLocked &&
      -1 !== state.lyricTiming[0] &&
      state.info &&
      state.info.play_state &&
      ((numericValue2 += Math.max(0, Date.now() - state.lyricTiming[0])),
      numericValue > 0 && (numericValue2 = Math.min(numericValue, numericValue2))),
      setMusicProgress(numericValue, numericValue2));
  }
}
function seekSessionCurrent(value) {
  return (
    value &&
    value.musicId === state.musicId &&
    value.hostname === state.hostname &&
    value.socket === state.ws
  );
}
function clearMusicSeek() {
  var seekSession = state.seekSession;
  (seekSession && clearTimeout(seekSession.timer),
    (state.seekSession = null),
    (state.timeLocked = !1),
    (state.dragProtectionUntil = 0));
}
function beginMusicSeek() {
  (clearMusicSeek(),
    (state.seekSession = {
      musicId: state.musicId,
      hostname: state.hostname,
      socket: state.ws,
      position: null,
      committed: !1,
      timer: null,
    }),
    (state.timeLocked = !0));
}
function previewMusicSeek(position) {
  (seekSessionCurrent(state.seekSession) && !state.seekSession.committed) || beginMusicSeek();
  var seekSession = state.seekSession;
  ((seekSession.position = Math.max(0, parseInt(position, 10) || 0)),
    (state.lyricTiming = [
      -1,
      seekSession.position,
      state.musicInfo ? state.musicInfo.duration : 0,
    ]),
    setMusicProgress(state.lyricTiming[2], seekSession.position),
    updateLyrics(!0));
}
function commitMusicSeek() {
  var seekSession = state.seekSession;
  seekSessionCurrent(seekSession)
    ? seekSession.committed ||
      (null !== seekSession.position
        ? ((seekSession.committed = !0),
          (seekSession.started = Date.now()),
          (seekSession.until = seekSession.started + 900),
          (state.timeLocked = !1),
          (state.lyricTiming[0] = state.info && state.info.play_state ? seekSession.started : -1),
          sendWs({ type: "set_position", position: seekSession.position }),
          sendWs({ type: "get_info" }),
          (seekSession.timer = setTimeout(function () {
            if (state.seekSession === seekSession) {
              var value = seekSessionCurrent(seekSession);
              (clearMusicSeek(), value && sendWs({ type: "get_info" }));
            }
          }, 900)),
          updateLyrics(!0))
        : clearMusicSeek())
    : clearMusicSeek();
}
function acceptMusicSeekPosition(position) {
  var seekSession = state.seekSession;
  if (!seekSession) return !0;
  if (!seekSessionCurrent(seekSession)) return (clearMusicSeek(), !0);
  if (!seekSession.committed) return !1;
  var numericValue = state.info && state.info.play_state ? Date.now() - seekSession.started : 0;
  return (
    (Math.abs(Number(position.position) - seekSession.position - numericValue) <= 1500 ||
      Date.now() >= seekSession.until) &&
    (clearMusicSeek(), !0)
  );
}
function setMusicProgress(position, duration) {
  var musicTimeRange = ui.musicTimeRange;
  if (musicTimeRange) {
    (musicTimeRange.max !== String(position) && (musicTimeRange.max = position),
      musicTimeRange.value !== String(duration) && (musicTimeRange.value = duration));
    var value = msToTime(position),
      value2 = msToTime(duration);
    (ui.musicTimeTotal &&
      ui.musicTimeTotal.textContent !== value &&
      (ui.musicTimeTotal.textContent = value),
      ui.musicTimeCurrent &&
        ui.musicTimeCurrent.textContent !== value2 &&
        (ui.musicTimeCurrent.textContent = value2));
  }
}
function waitAndRender(value) {
  var value2 = Date.now(),
    musicId = state.musicId,
    hostname = state.hostname,
    socket = state.ws,
    callback = function () {
      state.musicId === musicId &&
        state.hostname === hostname &&
        state.ws === socket &&
        (Date.now() - value2 > 1e3
          ? value()
          : state.lyricTiming[2] < 1 || !state.lyrics.length
            ? setTimeout(callback, 50)
            : value());
    };
  callback();
}
function renderLyricsFrame(value) {
  var value2 = computePlaybackTime();
  if ((updateProgressFromTime(value2), hasRealLyrics())) renderActiveLyric(value2, value);
  else {
    var lyricItemItem = state.lyrics.length ? state.lyrics[0][1] : "";
    showLrcPlaceholder(
      "暂无歌词" === lyricItemItem || "♪ MiPlay ♪" === lyricItemItem ? lyricItemItem : "暂无播放",
    );
  }
  (notifyMediaSession(), syncFullscreenControls());
}
function computePlaybackTime() {
  var numericValue =
    -1 !== state.lyricTiming[0]
      ? parseInt(state.lyricTiming[1], 10) + (Date.now() - state.lyricTiming[0])
      : parseInt(state.lyricTiming[1], 10);
  return (
    isNaN(numericValue) && (numericValue = 0),
    numericValue < state.lastLyricTime &&
      state.lastLyricTime - numericValue < 1e3 &&
      (numericValue = state.lastLyricTime),
    (state.lastLyricTime = numericValue),
    numericValue
  );
}
function updateProgressFromTime(value) {
  ui.musicPanel &&
    "block" === ui.musicPanel.style.display &&
    !state.timeLocked &&
    state.lyricTiming[2] &&
    ui.musicTimeRange &&
    setMusicProgress(parseInt(state.lyricTiming[2], 10) || 0, value);
}
function renderActiveLyric(value, value2) {
  value += 280;
  var value3 = locateActiveLyric(state.lyrics, value),
    allIndex = value3.allIndex,
    visibleIndex = value3.visibleIndex,
    visible = value3.visible;
  ((window.current_lrc_index = allIndex),
    null === visibleIndex && (visibleIndex = visible.length - 1));
  var lrcParent = getLrcParent();
  if (
    ((ui.musicLyrics && "block" === ui.musicLyrics.style.display) || state.lrcFullscreen) &&
    lrcParent
  ) {
    (lrcParent.querySelector(".music_lrc_div") && lrcParent._lyrics === state.lyrics) ||
      buildLyricsDom(visible);
    var musicLrcDivElement = lrcParent.querySelector(".music_lrc_div"),
      elementsByTagName = musicLrcDivElement ? musicLrcDivElement.getElementsByTagName("h3") : null;
    if (
      (elementsByTagName &&
        elementsByTagName.length > visible.length &&
        (visible.length < 2 && (visibleIndex = 1), (visibleIndex += 1)),
      elementsByTagName && elementsByTagName[visibleIndex])
    ) {
      var lyricItem = state.lyrics[allIndex],
        text = String(lyricItem && "" !== lyricItem[1]);
      (elementsByTagName[visibleIndex].getAttribute("current") !== text &&
        elementsByTagName[visibleIndex].setAttribute("current", text),
        -1 === elementsByTagName[visibleIndex].className.indexOf("current_lrc") &&
          (clearOldHighlights(elementsByTagName[visibleIndex]),
          elementsByTagName[visibleIndex].classList.add("current_lrc")));
      var seekSession = state.seekSession,
        seekSession2 = seekSession && lrcParent._scrolledSeek !== seekSession;
      (lrcParent._scrolledLyrics !== state.lyrics ||
        lrcParent._scrolledLrcDiv !== musicLrcDivElement ||
        lrcParent._scrolledLrcIndex !== visibleIndex ||
        seekSession2) &&
        (scrollToActive(musicLrcDivElement, elementsByTagName, visibleIndex),
        (lrcParent._scrolledLyrics = state.lyrics),
        (lrcParent._scrolledLrcDiv = musicLrcDivElement),
        (lrcParent._scrolledLrcIndex = visibleIndex),
        (lrcParent._scrolledSeek = seekSession),
        (state.lastScrolledLrcIndex = visibleIndex));
    }
  } else {
    var lyricItem2 = state.lyrics[allIndex];
    lyricItem2 &&
      lyricItem2[1] &&
      -1 != lyricItem2[0] &&
      ui.pageTitle &&
      ui.pageTitle.innerHTML !== lyricItem2[1] &&
      setPageTitle(lyricItem2[1]);
  }
}
function locateActiveLyric(value, value2) {
  for (
    var value3 = null, value4 = null, items = [], value5 = value.length - 1, index = 0;
    index <= value5;
    index++
  ) {
    var item = value[index],
      numericValue = parseInt(item[0], 10);
    (numericValue > value2
      ? null === value3 && (value3 = index > 0 ? index - 1 : index)
      : index === value5 && null === value3 && (value3 = index),
      "" !== item[1] &&
        (numericValue > value2 &&
          null === value4 &&
          (value4 = items.length > 0 ? items.length - 1 : 0),
        items.push(item)));
  }
  return { allIndex: value3, visibleIndex: value4, visible: items };
}
function buildLyricsDom(value) {
  var lrcParent = getLrcParent();
  if (lrcParent) {
    window.innerWidth;
    var container,
      lrcFullscreenHeaderElement = $("#lrc_fullscreen_header"),
      offsetHeight = lrcFullscreenHeaderElement ? lrcFullscreenHeaderElement.offsetHeight : 90,
      offsetHeight2 = offsetHeight;
    container = state.lrcFullscreen
      ? makeEl("div", {
          style:
            "position:absolute;left:0;top:0;right:0;bottom:" +
            offsetHeight2 +
            "px;overflow-x:hidden;overflow-y:auto;box-sizing:border-box",
          class: "music_lrc_div",
        })
      : makeEl("div", {
          style: "width:100%;height:100%;overflow-x:hidden;overflow-y:auto;box-sizing:border-box",
          class: "music_lrc_div",
        });
    var clientHeight = lrcParent.clientHeight || 224,
      numericValue = value.length < 3 ? 3 - value.length : 1,
      callback = function (value4, value5) {
        var heading = makeEl("h3", { class: "lrc" + (value5 ? " " + value5 : "") });
        return (heading.appendChild(makeEl("span", { class: "lrc-inner", html: value4 })), heading);
      };
    if (!state.lrcFullscreen && 50 * (numericValue + value.length + 1) < clientHeight) {
      for (
        var currentLrcIndex = null != window.current_lrc_index ? window.current_lrc_index : -1,
          lyricItem =
            currentLrcIndex >= 0 && state.lyrics[currentLrcIndex]
              ? state.lyrics[currentLrcIndex]
              : null,
          index = 0;
        index < value.length;
        index++
      ) {
        var item = value[index],
          lyricItem2 = lyricItem && item[0] === lyricItem[0] && item[1] === lyricItem[1],
          value2 = callback(item[1], lyricItem2 ? "current_lrc" : "");
        (lyricItem2 && value2.setAttribute("current", "true"), container.appendChild(value2));
      }
      container.classList.add("lrc-center");
    } else {
      for (var index2 = 0; index2 < numericValue; index2++)
        container.appendChild(makeEl("h3", { class: "lrc", style: "height:20px;margin:0" }));
      for (var index3 = 0; index3 < value.length; index3++)
        container.appendChild(callback(value[index3][1]));
      if (
        (container.appendChild(makeEl("h3", { class: "lrc", style: "margin:0" })),
        state.lrcFullscreen)
      ) {
        var numericValue2 = 0;
        if (window.plus)
          try {
            numericValue2 = Math.floor(plus.navigator.getStatusbarHeight() / 2);
          } catch (error) {}
        var value3 = window.innerHeight - offsetHeight - offsetHeight - numericValue2;
        value3 < 100 && (value3 = 500);
        var verticalPadding = Math.floor(value3 / 2);
        ((container.style.paddingTop = verticalPadding + "px"),
          (container.style.paddingBottom = verticalPadding + "px"));
      } else ((container.style.paddingTop = "12px"), (container.style.paddingBottom = "12px"));
    }
    ((lrcParent.innerHTML = ""),
      (lrcParent._placeholderText = null),
      lrcParent.appendChild(container),
      (lrcParent._lyrics = state.lyrics),
      ui.applyLyricsModeHeight &&
        (setTimeout(ui.applyLyricsModeHeight, 0), setTimeout(ui.applyLyricsModeHeight, 150)));
  }
}
function clearOldHighlights(value) {
  for (
    var lrcShrinkElement = document.querySelectorAll(".lrc_shrink"), index = 0;
    index < lrcShrinkElement.length;
    index++
  )
    lrcShrinkElement[index].classList.remove("lrc_shrink");
  for (
    var matchedElement = document.querySelectorAll('.current_lrc, h3.lrc[current="true"]'),
      index2 = 0;
    index2 < matchedElement.length;
    index2++
  )
    (value && matchedElement[index2] === value) ||
      (matchedElement[index2].classList.add("lrc_shrink"),
      matchedElement[index2].classList.remove("current_lrc"),
      matchedElement[index2].setAttribute("current", "false"));
}
function scrollToActive(value, value2, value3) {
  if (value && value2 && value2[value3]) {
    var bounds = value.getBoundingClientRect(),
      bounds2 = value2[value3].getBoundingClientRect(),
      clientHeight = value.clientHeight,
      height = bounds2.height,
      value4 = bounds2.top - bounds.top + value.scrollTop + height / 2 - clientHeight / 2;
    if (state.lrcFullscreen) value4 += bounds.top + clientHeight / 2 - window.innerHeight / 2;
    (value4 < 0 && (value4 = 0),
      window.jQuery
        ? window.jQuery(value).stop().animate({ scrollTop: value4 }, 400)
        : (value.scrollTop = value4));
  }
}
function notifyMediaSession() {
  if (state.notificationManager && 1 == state.info.play_type) {
    state.notificationManager.timer ||
      (state.notificationManager.timer = setTimeout(function () {
        var musicBtnPlayElement = $("#music_btn_play");
        (state.notificationManager.updateNotification(
          1 == state.info.play_type ? state.musicInfo : null,
          musicBtnPlayElement && "pause" === musicBtnPlayElement.getAttribute("data"),
        ),
          (state.notificationManager.timer = 0));
      }, 500));
  }
}
function updatePlaylist(value) {
  if (value && Array.isArray(value.playList)) {
    var pending = attachQueueRowDrag.pending;
    if (pending) {
      var value2 = queueListSignature(value.playList);
      if (value2 === pending.expected || Date.now() >= pending.until)
        attachQueueRowDrag.pending = null;
      else {
        if (value2 === pending.before) return;
        attachQueueRowDrag.pending = null;
      }
    }
    if (
      ((state.playlist = value),
      !ui.playlistOverlay || (ui.playlistOverlay._popupOpen && !ui.playlistOverlay._appDialogExit))
    ) {
      var listTitleElement = $("#list_title");
      (listTitleElement &&
        (listTitleElement.textContent =
          "播放列表[" +
          (value.playList.length ? Number(value.playIndex) + 1 : 0) +
          "/" +
          value.playList.length +
          "]"),
        attachQueueRowDrag.active || renderPlaylistItems(value));
    } else ui.playlistDirty = !0;
  }
}
function queueListSignature(value) {
  return JSON.stringify(
    value.map(function (item) {
      return item.itemId || "";
    }),
  );
}
function renderPlaylistItems(value) {
  if (ui.playlistTable && !attachQueueRowDrag.active)
    if (
      !ui.playlistOverlay ||
      (ui.playlistOverlay._popupOpen && !ui.playlistOverlay._appDialogExit)
    ) {
      ui.playlistDirty = !1;
      var playlistTable = ui.playlistTable,
        value2 = Array.prototype.slice.call(playlistTable.getElementsByTagName("tr")),
        value3 = Object.create(null);
      value2.forEach(function (element) {
        var itemId = element.getAttribute("itemId");
        null !== itemId && (value3[itemId] || (value3[itemId] = []), value3[itemId].push(element));
      });
      var setInstance = new Set();
      (value.playList.forEach(function (track, index) {
        var value3Item = value3[track.itemId || ""],
          element = value3Item && value3Item.length ? value3Item.shift() : null;
        (element && element._queue) ||
          buildQueueRowContent((element = makeEl("tr", { class: "span" })));
        var elementsByTagNameItem = playlistTable.getElementsByTagName("tr")[index] || null;
        (elementsByTagNameItem !== element &&
          playlistTable.insertBefore(element, elementsByTagNameItem),
          (element._song = track),
          element.setAttribute("index", index),
          element.setAttribute("itemId", track.itemId || ""));
        var title = track.title || track.album || "",
          artist = track.artist || "";
        (element._queue.title.textContent !== title && (element._queue.title.textContent = title),
          element._queue.artist.textContent !== artist &&
            (element._queue.artist.textContent = artist),
          (element.style.borderBottom =
            index < value.playList.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none"),
          (element._queue.handle.style.display = hasMusicQueueCapability()
            ? "inline-flex"
            : "none"),
          setQueueRowPlaying(element, Number(value.playIndex) === index),
          setInstance.add(element));
      }),
        value2.forEach(function (item) {
          !setInstance.has(item) && item.parentNode && item.parentNode.removeChild(item);
        }));
      for (
        var elementsByTagName = playlistTable.getElementsByTagName("hr");
        elementsByTagName.length;
      )
        elementsByTagName[0].parentNode.removeChild(elementsByTagName[0]);
    } else ui.playlistDirty = !0;
}
function setQueueRowPlaying(element, value) {
  element.getAttribute("playing") !== (value ? "true" : "false") &&
    ((element._queue.icon.style.display = value ? "inline-flex" : "none"),
    (element._queue.play.style.display = value ? "none" : "inline-flex"),
    element.setAttribute("playing", value ? "true" : "false"));
}
function queueRowAction(value, value2) {
  return function (event) {
    event && event.stopPropagation();
    for (var value22 = value2 || this; value22 && "tr" !== value22.localName;)
      value22 = value22.parentElement;
    if (
      value22 &&
      !attachQueueRowDrag.active &&
      (!ui.playlistOverlay || (ui.playlistOverlay._popupOpen && !ui.playlistOverlay._appDialogExit))
    ) {
      var numericValue = Number(value22.getAttribute("index"));
      if (isFinite(numericValue) && !(numericValue < 0)) {
        var value3 = value(numericValue, value22._song);
        Array.isArray(value3) && sendAction(value3[0], value3[1], value3[2], value3[3]);
      }
    }
  };
}
function buildQueueRowContent(element) {
  element.style.cssText =
    "display:flex;align-items:center;text-align:left;box-sizing:border-box;width:100%;padding:8px 8px 8px 12px;text-shadow:none;";
  var label = makeEl("span", {
      style: "flex:1;min-width:0;overflow:hidden;text-align:left",
    }),
    container = makeEl("div", {
      style: "display:flex;align-items:center;min-width:0;gap:3px;text-align:left",
    }),
    label2 = makeEl("span", {
      class: "q_playing_icon",
      html: MUSIC_ICONS.playing,
      title: "正在播放",
      style: "display:none;flex-shrink:0;align-items:center",
    }),
    label3 = makeEl("span", {
      style:
        "min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:#fff;text-shadow:none",
    }),
    container2 = makeEl("div", {
      style:
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:rgba(255,255,255,0.6);text-shadow:none",
    });
  (container.appendChild(label2),
    container.appendChild(label3),
    label.appendChild(container),
    label.appendChild(container2),
    element.appendChild(label));
  var label4 = makeEl("span", {
      style: "display:inline-flex;align-items:center;gap:6px;flex-shrink:0;margin-left:8px",
    }),
    text =
      "border:none;border-radius:50%;width:30px;height:30px;color:#fff;cursor:pointer;background:rgba(255,255,255,0.15);flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;padding:0;margin:0;outline:none;",
    button = makeEl("button", {
      type: "button",
      class: "app_btn",
      "data-qact": "play",
      html: MUSIC_ICONS.playSm,
      title: "播放这首",
      style: text,
    });
  button.onclick = queueRowAction(function (value) {
    return [4, 11, -1, value];
  }, button);
  var button2 = makeEl("button", {
    type: "button",
    class: "app_btn",
    "data-qact": "more",
    html: MUSIC_ICONS.more,
    title: "更多操作",
    style: text,
  });
  button2.onclick = queueRowAction(function (value, value2) {
    showQueueRowMenu(value, value2, state.playlist.playList.length);
  }, button2);
  var button3 = makeEl("button", {
    type: "button",
    class: "drag_handle app_btn",
    html: MUSIC_ICONS.drag,
    title: "点击调整位置，长按拖动",
    style: text + "touch-action:none;cursor:grab",
  });
  ((button3.onclick = queueRowAction(function (value, value2) {
    (button3._suppressClickUntil && Date.now() < button3._suppressClickUntil) ||
      showQueueMoveDialog(value, value2, state.playlist.playList.length);
  }, button3)),
    label4.appendChild(button),
    label4.appendChild(button2),
    label4.appendChild(button3),
    element.appendChild(label4),
    (element._queue = {
      title: label3,
      artist: container2,
      icon: label2,
      play: button,
      handle: button3,
    }),
    attachQueueRowDrag(element, button3));
}
function buildFixedDialog(value, value2) {
  var dialogPanel = createDialogPanel(value, {
    host: createPopupHost({ blur: !1 }),
    width: value2,
    bodyStyle: "padding:10px 14px",
  });
  return (
    (dialogPanel.wrap.style.minWidth = "0"),
    (dialogPanel.wrap.style.width = value2),
    (dialogPanel.panel.style.maxHeight = "70vh"),
    (dialogPanel.title.style.fontSize = "15px"),
    dialogPanel.body.classList.add("app_menu_items"),
    dialogPanel
  );
}
function showQueueRowMenu(value, value2, value3) {
  var value4 = musicQueueContext(),
    fixedDialog = buildFixedDialog("《" + getTrackTitle(value2) + "》", "70vw");
  function addQueueAction(value5, value6, value7, value8) {
    fixedDialog.body.appendChild(
      makeEl("button", {
        type: "button",
        class: "app_btn",
        html:
          '<span style="width:16px;flex-shrink:0;display:inline-flex;justify-content:center;align-items:center">' +
          value5 +
          '</span><span style="flex:1;color:#fff;font-size:14px;line-height:16px;text-align:left">' +
          value6 +
          "</span>",
        style:
          "display:flex;align-items:center;gap:10px;width:100%;border:none;background:none;color:#fff;font-size:14px;cursor:pointer;padding:12px 6px;text-align:left;outline:none;border-bottom:1px solid rgba(255,255,255,0.08)",
        onclick: function () {
          fixedDialog.isOpen() &&
            popupRenderHosts
              .filter(function (item) {
                return item._popupOpen;
              })
              .slice(-1)[0] === fixedDialog.host &&
            (value8 || fixedDialog.close(), value7());
        },
      }),
    );
  }
  (hasMusicQueueCapability() &&
    value !== state.playlist.playIndex &&
    addQueueAction(MUSIC_ICONS.trash, "从队列删除", function () {
      isMusicQueueContextCurrent(value4) && confirmQueueRemove(value, value2);
    }),
    state.info &&
      state.info.music_info &&
      state.info.music_info.id &&
      addQueueAction(
        MUSIC_ICONS.list,
        "歌曲信息",
        function () {
          createMusicInfoWindow({ index: value, music_info: value2 }, { stack: !0 });
        },
        !0,
      ));
}
function showQueueMoveDialog(value, track, value2) {
  if (hasMusicQueueCapability()) {
    var value3 = musicQueueContext(),
      fixedDialog = buildFixedDialog("《" + getTrackTitle(track) + "》移动", "70vw"),
      playlist = state.playlist && state.playlist.playIndex;
    (value !== playlist &&
      addMoveAction(MUSIC_SEARCH_ICONS.next, "下一首播放", function () {
        sendAction(
          4,
          27,
          -1,
          JSON.stringify({
            itemId: track.itemId,
            title: track.title || track.album || "",
            artist: track.artist || "",
            itemType: track.itemType || 0,
            url: track.url || "",
          }),
        );
      }),
      value > 0 &&
        (addMoveAction(MUSIC_ICONS.up, "置顶", function () {
          sendAction(4, 28, -1, JSON.stringify({ from: value, to: 0 }));
        }),
        addMoveAction(MUSIC_ICONS.up, "上移一位", function () {
          sendAction(4, 28, -1, JSON.stringify({ from: value, to: value - 1 }));
        })),
      value < value2 - 1 &&
        (addMoveAction(MUSIC_ICONS.down, "下移一位", function () {
          sendAction(4, 28, -1, JSON.stringify({ from: value, to: value + 1 }));
        }),
        addMoveAction(MUSIC_ICONS.down, "移到最后", function () {
          sendAction(4, 28, -1, JSON.stringify({ from: value, to: value2 - 1 }));
        })));
  }
  function addMoveAction(value4, value5, value6) {
    fixedDialog.body.appendChild(
      makeEl("button", {
        type: "button",
        class: "app_btn",
        html:
          '<span style="width:16px;flex-shrink:0;display:inline-flex;justify-content:center;align-items:center">' +
          value4 +
          '</span><span style="flex:1;color:#fff;font-size:14px;line-height:16px;text-align:left">' +
          value5 +
          "</span>",
        style:
          "display:flex;align-items:center;gap:10px;width:100%;border:none;background:none;color:#fff;font-size:14px;cursor:pointer;padding:12px 6px;text-align:left;outline:none;border-bottom:1px solid rgba(255,255,255,0.08)",
        onclick: function () {
          (fixedDialog.close(), isMusicQueueContextCurrent(value3) && value6());
        },
      }),
    );
  }
}
function confirmQueueRemove(value, value2) {
  if (hasMusicQueueCapability()) {
    var value3 = musicQueueContext(),
      fixedDialog = buildFixedDialog("删除确认", "78vw");
    (fixedDialog.wrap.classList.add("app_prompt_wrap"),
      fixedDialog.body.appendChild(
        makeEl("div", {
          style: "color:#fff;font-size:13px;padding:4px 0 14px;text-align:left;line-height:1.6",
          text: "从队列删除《" + getTrackTitle(value2) + "》？",
        }),
      ));
    var container = makeEl("div", { style: "display:flex;gap:10px" }),
      button = makeEl("button", {
        type: "button",
        text: "取消",
        class: "app_btn",
        style:
          "flex:1;border:none;border-radius:8px;padding:9px 0;font-size:13px;color:#fff;cursor:pointer;background:rgba(255,255,255,0.15)",
      }),
      button2 = makeEl("button", {
        type: "button",
        text: "删除",
        class: "app_btn",
        style:
          "flex:1;border:none;border-radius:8px;padding:9px 0;font-size:13px;color:#fff;cursor:pointer;background:rgba(230,80,80,0.9)",
      });
    ((button.onclick = function () {
      fixedDialog.close();
    }),
      (button2.onclick = function () {
        (fixedDialog.close(),
          isMusicQueueContextCurrent(value3) &&
            sendAction(4, 29, -1, JSON.stringify({ index: value })));
      }),
      container.appendChild(button2),
      container.appendChild(button),
      fixedDialog.body.appendChild(container));
  }
}
function attachQueueRowDrag(element, element2) {
  var value = null;
  function beginDrag(event, value2, value3) {
    if (
      hasMusicQueueCapability() &&
      !attachQueueRowDrag.active &&
      !attachQueueRowDrag.pending &&
      (!ui.playlistOverlay ||
        (ui.playlistOverlay._popupOpen && !ui.playlistOverlay._appDialogExit)) &&
      (null == event.button || 0 === event.button)
    ) {
      (event.cancelable && event.preventDefault(), event.stopPropagation());
      var bounds = element.getBoundingClientRect();
      ((value = {
        pointerId: value3,
        y: value2,
        startY: value2,
        grabOffset: value2 - bounds.top,
        height: bounds.height,
        from: Number(element.getAttribute("index")),
        list: state.playlist.playList.slice(),
        playing: Number(state.playlist.playIndex),
        centers: Array.prototype.map.call(
          element.parentNode.getElementsByTagName("tr"),
          function (value4) {
            var bounds2 = value4.getBoundingClientRect();
            return bounds2.top + bounds2.height / 2 + ui.playlistContainer.scrollTop;
          },
        ),
        context: musicQueueContext(),
        dragging: !1,
        timer: null,
        frame: null,
        cleanups: [],
        cancel: cancelDrag,
      }),
        (attachQueueRowDrag.active = value),
        window.PointerEvent
          ? (addDragListener(document, "pointermove", handlePointerMove, { passive: !1 }),
            addDragListener(document, "pointerup", handlePointerUp),
            addDragListener(document, "pointercancel", cancelDrag))
          : "touchstart" === event.type
            ? (addDragListener(document, "touchmove", handleTouchMove, { passive: !1 }),
              addDragListener(document, "touchend", finishDrag),
              addDragListener(document, "touchcancel", cancelDrag))
            : (addDragListener(document, "mousemove", handleMouseMove),
              addDragListener(document, "mouseup", finishDrag)),
        addDragListener(window, "blur", cancelDrag),
        addDragListener(document, "keydown", handleDragKeydown),
        (value.timer = setTimeout(function () {
          value &&
            element.parentNode &&
            (isMusicQueueContextCurrent(value.context)
              ? ((value.dragging = !0),
                (attachQueueRowDrag.dragging = !0),
                (element.style.opacity = "0.6"),
                (element.style.position = "relative"),
                (element.style.zIndex = "2"),
                (element.style.transition = "none"),
                (element.style.boxShadow = "0 6px 18px rgba(0,0,0,0.4)"),
                (element2.style.cursor = "grabbing"),
                navigator.vibrate && navigator.vibrate(30),
                updateDropTarget(),
                (value.frame = requestAnimationFrame(scrollDuringDrag)))
              : cancelDrag());
        }, 400)));
    }
    function addDragListener(element3, eventType, listener, options) {
      (element3.addEventListener(eventType, listener, options),
        value.cleanups.push(function () {
          element3.removeEventListener(eventType, listener, options);
        }));
    }
  }
  function updateDrag(event, pointerY) {
    value &&
      (isMusicQueueContextCurrent(value.context)
        ? ((value.y = pointerY),
          value.dragging
            ? (event.cancelable && event.preventDefault(), updateDropTarget())
            : Math.abs(pointerY - value.startY) > 8 &&
              ((element2._suppressClickUntil = Date.now() + 600), cancelDrag()))
        : cancelDrag());
  }
  function updateDropTarget() {
    if (value && value.dragging && element.parentNode) {
      for (
        var parentNode = element.parentNode,
          items = Array.prototype.slice
            .call(parentNode.getElementsByTagName("tr"))
            .filter(function (item) {
              return item !== element;
            }),
          value2 = value.y - value.grabOffset + value.height / 2 + ui.playlistContainer.scrollTop,
          numericValue = Number(element.getAttribute("index")),
          index = numericValue;
        index > 0 && value2 <= value.centers[index - 1];
      )
        index--;
      for (; index < items.length && value2 >= value.centers[index + 1];) index++;
      (index !== numericValue &&
        (parentNode.insertBefore(element, items[index] || null),
        reindexQueueRows(),
        navigator.vibrate && navigator.vibrate(15)),
        (element.style.transform = ""));
      var bounds = element.getBoundingClientRect();
      element.style.transform = "translateY(" + (value.y - value.grabOffset - bounds.top) + "px)";
    }
  }
  function scrollDuringDrag() {
    if (value && value.dragging)
      if (isMusicQueueContextCurrent(value.context)) {
        var playlistContainer = ui.playlistContainer;
        if (playlistContainer) {
          var bounds = playlistContainer.getBoundingClientRect(),
            numericValue = value.y < bounds.top + 40 ? -8 : value.y > bounds.bottom - 40 ? 8 : 0;
          numericValue && ((playlistContainer.scrollTop += numericValue), updateDropTarget());
        }
        value.frame = requestAnimationFrame(scrollDuringDrag);
      } else cancelDrag();
  }
  function finishDrag() {
    if (value) {
      var value2 = value,
        numericValue = Number(element.getAttribute("index")),
        value3 = queueListSignature(state.playlist.playList),
        value4 = queueListSignature(value2.list);
      if ((cleanupDrag(), isMusicQueueContextCurrent(value2.context))) {
        if (value2.dragging)
          if (
            ((element2._suppressClickUntil = Date.now() + 600),
            (attachQueueRowDrag.lastDragEnd = Date.now()),
            value3 === value4)
          )
            if (numericValue !== value2.from) {
              var items = value2.list.slice(),
                item = items.splice(value2.from, 1)[0];
              items.splice(numericValue, 0, item);
              var index = Number(state.playlist.playIndex);
              index === value2.from
                ? (index = numericValue)
                : value2.from < index && numericValue >= index
                  ? index--
                  : value2.from > index && numericValue <= index && index++;
              var options = {
                before: value4,
                expected: queueListSignature(items),
                until: Date.now() + 3e3,
              };
              ((attachQueueRowDrag.pending = options),
                (state.playlist = Object.assign({}, state.playlist, {
                  playList: items,
                  playIndex: index,
                })),
                renderPlaylistItems(state.playlist),
                sendAction(4, 28, -1, JSON.stringify({ from: value2.from, to: numericValue })),
                setTimeout(function () {
                  sendWs({ type: "list" });
                }, 100),
                setTimeout(function () {
                  attachQueueRowDrag.pending === options &&
                    ((attachQueueRowDrag.pending = null), sendWs({ type: "list" }));
                }, 3e3));
            } else renderPlaylistItems(state.playlist);
          else renderPlaylistItems(state.playlist);
      } else renderPlaylistItems(state.playlist);
    }
  }
  function cleanupDrag() {
    value &&
      (clearTimeout(value.timer),
      null != value.frame && cancelAnimationFrame(value.frame),
      value.cleanups.forEach(function (item) {
        item();
      }),
      (value = null),
      (attachQueueRowDrag.active = null),
      (attachQueueRowDrag.dragging = !1),
      (element.style.opacity = ""),
      (element.style.position = ""),
      (element.style.zIndex = ""),
      (element.style.transition = ""),
      (element.style.transform = ""),
      (element.style.boxShadow = ""),
      (element2.style.cursor = "grab"));
  }
  function cancelDrag() {
    if (value) {
      var dragging = value.dragging;
      (cleanupDrag(),
        dragging && (element2._suppressClickUntil = Date.now() + 600),
        renderPlaylistItems(state.playlist));
    }
  }
  function handleDragKeydown(event) {
    "Escape" === event.key && cancelDrag();
  }
  function handlePointerMove(event) {
    value && event.pointerId === value.pointerId && updateDrag(event, event.clientY);
  }
  function handlePointerUp(event) {
    value && event.pointerId === value.pointerId && finishDrag();
  }
  function handleMouseMove(event) {
    updateDrag(event, event.clientY);
  }
  function handleTouchMove(event) {
    1 === event.touches.length ? updateDrag(event, event.touches[0].clientY) : cancelDrag();
  }
  (window.PointerEvent
    ? element2.addEventListener("pointerdown", function (event) {
        !1 !== event.isPrimary && beginDrag(event, event.clientY, event.pointerId);
      })
    : (element2.addEventListener("mousedown", function (event) {
        beginDrag(event, event.clientY, null);
      }),
      element2.addEventListener(
        "touchstart",
        function (event) {
          1 === event.touches.length && beginDrag(event, event.touches[0].clientY, null);
        },
        { passive: !1 },
      )),
    element2.addEventListener("contextmenu", function (event) {
      event.preventDefault();
    }),
    (element2._cancelQueueDrag = cancelDrag));
}
function reindexQueueRows() {
  for (
    var elementsByTagName = ui.playlistTable.getElementsByTagName("tr"), index = 0;
    index < elementsByTagName.length;
    index++
  )
    elementsByTagName[index].setAttribute("index", index);
}
function fetchTrackInfo() {
  if (1 == state.info.play_type) {
    var musicId = state.musicId,
      hostname = state.hostname,
      socket = state.ws;
    setTimeout(function () {
      sendWs({ type: "list" });
    }, 100);
    var options,
      callback = function (message) {
        if (
          isTrackRequestCurrent() &&
          (1 != message.code || (message.data && message.data.id === musicId))
        ) {
          if (((state.lyricsPending = null), 1 == message.code)) {
            var value = getTrackTitle(state.musicInfo) + "\t";
            if (
              (ui.musicPanel &&
                "block" === ui.musicPanel.style.display &&
                ((state.titleDisplayUntil = Date.now() + 1e3),
                setPageTitle(value),
                (document.title = state.deviceTag + value)),
              !(state.apiMusicInfo !== message.data || (ui.musicPic && ui.musicPic._coverPending)))
            )
              return;
            ((state.apiMusicInfo = message.data),
              message.update && message.update > 0
                ? (localStorage.removeItem("musicinfo"),
                  clearTimeout(timers.trackInfo),
                  (timers.trackInfo = setTimeout(fetchTrackInfo, parseInt(message.update, 10))))
                : localStorage.setItem("musicinfo", JSON.stringify(message)),
              updateMusicCover(state.apiMusicInfo.pic || state.musicInfo.albumUrl),
              updateFullscreenTitle());
            var lrc = state.apiMusicInfo.lrc;
            try {
              lrc = lrc.replace(/\[/g, "\r\n[").replace(/\r\n\r\n/g, "\r\n");
            } catch (error) {}
            var items = (lrc || "").match(/(\[\d{1,3}:\d{1,2}.\d{1,3}\])(.*)/g) || [],
              lyrics = state.lyrics;
            state.lyrics = [];
            for (var index = 0; index < items.length; index++) {
              var itemItem = items[index],
                value2 = itemItem.match(/(\[\d{1,3}:\d{1,2}.\d{1,3}\])/g);
              if (value2)
                for (
                  var value2Item = value2[value2.length - 1],
                    text = itemItem
                      .substring(itemItem.indexOf(value2Item) + value2Item.length)
                      .replace(/^\s+|\s+$/g, ""),
                    index2 = 0;
                  index2 < value2.length;
                  index2++
                ) {
                  var value2Item2 = value2[index2],
                    value3 = timeToMs(value2Item2.substr(1, value2Item2.length - 2));
                  isNaN(value3) || state.lyrics.push([value3, text]);
                }
            }
            (state.lyrics.length
              ? state.lyrics.sort(function (left, right) {
                  return left[0] - right[0];
                })
              : (state.lyrics = [[-1, "暂无歌词"]]),
              JSON.stringify(lyrics) === JSON.stringify(state.lyrics) && (state.lyrics = lyrics));
          } else
            (ui.musicPic &&
              ui.musicPic._coverPending &&
              updateMusicCover(ui.musicPic.placeholderSrc),
              (state.lyrics = [[-1, "暂无歌词"]]));
          (state.musicInfo && !state.lyricTiming.length && (state.lyricTiming = [-1, 0, 0]),
            updateLyrics(!0));
        }
      },
      parsedData = JSON.parse(localStorage.getItem("musicinfo") || "[]");
    if (1 != parsedData.code || parsedData.data.id !== state.musicId) {
      if (state.musicInfo)
        if (window.jQuery)
          ((options =
            "local_" === String(state.musicId).substring(0, 6)
              ? {
                  info: state.musicId,
                  file: state.info.music_info.title,
                  metadata: state.currentMusicData
                    ? JSON.stringify(state.currentMusicData.MediaMetadata)
                    : null,
                }
              : 2 == state.info.play_type
                ? {
                    type: "dlna",
                    info: state.musicId,
                    file: getTrackTitle(state.info.music_info),
                  }
                : {
                    info: state.musicId,
                    music_info: JSON.stringify(state.musicInfo),
                  }),
            window.jQuery.ajax({
              type: "POST",
              url: R1Config.musicApiUrl,
              data: options,
              dataType: "jsonp",
              success: callback,
              error: function () {
                isTrackRequestCurrent() &&
                  ((state.lyricsPending = null),
                  (state.lyrics = [[-1, "暂无歌词"]]),
                  ui.musicPic &&
                    ui.musicPic._coverPending &&
                    updateMusicCover(ui.musicPic.placeholderSrc),
                  updateLyrics(!0));
              },
            }));
    } else callback(parsedData);
  }
  function isTrackRequestCurrent() {
    return (
      state.musicId === musicId &&
      state.hostname === hostname &&
      state.ws === socket &&
      1 == state.info.play_type &&
      state.musicInfo
    );
  }
}
function updatePlayerState(value) {
  if (
    (confirmEchoVersion(value),
    updateUnisoundAvailability(value),
    null == state.renderedUnisoundVersion || state.renderedUnisoundVersion === state.uVer)
  ) {
    for (
      var matchedElement = $$("input[type=range]"), index = 0;
      index < matchedElement.length;
      index++
    )
      ((matchedElement[index].onmousedown = function () {
        state.mousePressed = !0;
      }),
        (matchedElement[index].onmouseup = function () {
          state.mousePressed = !1;
        }));
    if (null == value.ver || state.ver == value.ver) {
      if (
        ((state.info = value),
        (state.playType == value.play_type && 4 != value.play_type) ||
          (clearMusicSeek(),
          (state.lyricTiming = [-1, 0, 0]),
          (state.lastLyricTime = 0),
          ui.musicTimeRange && (setMusicProgress(0, 0), (ui.musicTimeRange.disabled = !0))),
        updateVersionFooter(),
        isEchoVer(1835))
      ) {
        var disableUnisoundElement = $("#disable_unisound");
        if (disableUnisoundElement)
          if (value.Unisound) {
            if (
              ((disableUnisoundElement.value = "禁用小讯"),
              (state.unisoundRetryCount[0] = 0),
              !state.unisoundAvailable)
            ) {
              if (state.unisoundRetryCount[1] > 6) return void location.reload();
              state.unisoundRetryCount[0]++;
            }
          } else if (
            ((disableUnisoundElement.value = "启用小讯"),
            (state.unisoundRetryCount[1] = 0),
            state.unisoundAvailable)
          ) {
            if (state.unisoundRetryCount[0] > 6) return void location.reload();
            state.unisoundRetryCount[0]++;
          }
      }
      if (isEchoVer(1856)) {
        var switchPlayerElement = $("#switch_player");
        switchPlayerElement &&
          (2 == state.info.PlayerType
            ? (switchPlayerElement.setAttribute("PlayerType", 2),
              (switchPlayerElement.value = "切换MediaPlayer播放器"))
            : (switchPlayerElement.setAttribute("PlayerType", 1),
              (switchPlayerElement.value = "切换ExoPlayer播放器")));
      }
      if (
        (!state.mousePressed && ui.volumeRange && (ui.volumeRange.value = value.vol),
        ui.volumeRange && ui.volumeLabel)
      ) {
        var value2 = "   " + ui.volumeRange.value + "/" + ui.volumeRange.max;
        ui.volumeLabel.innerHTML !== value2 && (ui.volumeLabel.innerHTML = value2);
      }
      var ttsSpeakerElement = $("#tts_speaker");
      if (ttsSpeakerElement)
        for (var index2 = 0; index2 < ttsSpeakerElement.length; index2++)
          ttsSpeakerElement[index2].value === value.ttsModelType &&
            (ttsSpeakerElement[index2].selected = !0);
      if ((updateButtonVisibility(), isEchoVer(1600))) {
        if (isUnisoundVer(1600)) {
          var musicSourceElement = $("#music_source");
          if (musicSourceElement)
            for (var index3 = 0; index3 < musicSourceElement.length; index3++)
              musicSourceElement[index3].value === value.music_source &&
                (musicSourceElement[index3].selected = !0);
        }
        for (
          var items = [
              ["随机播放", 1],
              ["顺序播放", 2],
              ["单曲循环", 3],
            ],
            itemItem = items[0],
            index4 = 0;
          index4 < items.length;
          index4++
        )
          items[index4][1] == value.play_mode && (itemItem = items[index4]);
        var musicBtnPlaymodeElement = $("#music_btn_playmode");
        musicBtnPlaymodeElement &&
          (musicBtnPlaymodeElement.setAttribute("mode", itemItem[1]),
          updatePlayModeIcon(musicBtnPlaymodeElement, itemItem[1]));
      }
      if (ui.musicPanel && "none" === ui.musicPanel.style.display)
        state.notificationManager && state.notificationManager.cancelNotification();
      else {
        var musicInfo = state.musicInfo;
        if (
          value.music_info &&
          "object" == typeof value.music_info &&
          !Array.isArray(value.music_info)
        ) {
          var parsedData = JSON.parse(JSON.stringify(value.music_info));
          (delete parsedData.Current_MusicData, (state.musicInfo = parsedData));
        } else state.musicInfo = null;
        if (
          2 == value.play_type ||
          3 == value.play_type ||
          4 == value.play_type ||
          5 == value.play_type
        ) {
          var text =
              2 == value.play_type
                ? "DLNA模式"
                : 3 == value.play_type
                  ? "AirPlay模式"
                  : 4 == value.play_type
                    ? "蓝牙模式"
                    : "MiPlay模式",
            trackTitle = state.musicInfo ? getTrackTitle(state.musicInfo) : "";
          trackTitle
            ? (setPageTitle("[" + text + "]" + trackTitle),
              (document.title = state.deviceTag + "[" + text + "]" + trackTitle))
            : (setPageTitle(text), (document.title = state.deviceTag + text));
        } else
          !state.musicInfo &&
            musicInfo &&
            1 != value.play_type &&
            (setPageTitle("R1音箱音乐页面" + state.deviceTag),
            (document.title = state.deviceTag + "R1音箱音乐页面" + state.deviceTag));
        (updateMusicControls(value),
          (state.musicInfo && 1 == value.play_type) || (state.lyricsPending = null),
          state.musicInfo && updateMusicTrackInfo(value),
          5 == value.play_type &&
            (ui.musicPic &&
              state.musicInfo &&
              state.musicInfo.albumUrl &&
              updateMusicCover(state.musicInfo.albumUrl),
            "function" == typeof updateFullscreenTitle && updateFullscreenTitle(),
            (state.musicInfo && state.musicInfo.duration > 0) || (state.lyricTiming = [-1, 0, 0]),
            (state.lyrics.length && "♪ MiPlay ♪" === state.lyrics[0][1]) ||
              ((state.lyrics = [[-1, "♪ MiPlay ♪"]]), updateLyrics(!0))));
        var musicBtnPlayElement = $("#music_btn_play"),
          lyricsContainer = document.querySelector(".music_lrc_div");
        !state.musicInfo || (6 != state.musicInfo.state && 10 != state.musicInfo.state)
          ? value.play_state
            ? (lyricsContainer && (lyricsContainer.style.pointerEvents = "none"),
              ui.musicPic && (ui.musicPic.style.webkitAnimationPlayState = "running"),
              musicBtnPlayElement &&
                ((musicBtnPlayElement.disabled = !1),
                updatePlayButtonIcon(musicBtnPlayElement, "pause")))
            : (lyricsContainer && (lyricsContainer.style.pointerEvents = ""),
              ui.musicPic && (ui.musicPic.style.webkitAnimationPlayState = "paused"),
              musicBtnPlayElement &&
                ((musicBtnPlayElement.disabled = !1),
                updatePlayButtonIcon(musicBtnPlayElement, "play")))
          : musicBtnPlayElement &&
            ((musicBtnPlayElement.disabled = !0),
            updatePlayButtonIcon(
              musicBtnPlayElement,
              6 == state.musicInfo.state ? "buffer" : "loading",
            ));
        var musicInfo2 =
          state.musicInfo && (6 == state.musicInfo.state || 10 == state.musicInfo.state);
        if (
          (value.play_state || musicInfo2
            ? (lyricsContainer && (lyricsContainer.style.pointerEvents = "none"),
              ui.musicPic && (ui.musicPic.style.webkitAnimationPlayState = "running"))
            : (lyricsContainer && (lyricsContainer.style.pointerEvents = ""),
              ui.musicPic && (ui.musicPic.style.webkitAnimationPlayState = "paused")),
          0 != state.playType && 0 == value.play_type && null != state.musicId)
        ) {
          (ui.qualityLabel && (ui.qualityLabel.innerHTML = ""),
            ui.qualityPanel && (ui.qualityPanel.style.display = "none"),
            (state.lyricTiming = []),
            (state.lyricsPending = null),
            (state.musicId = null),
            (state.lyrics = [[-1, "暂无歌词"]]),
            updateLyrics(!0),
            ui.playlistTable && (ui.playlistTable.innerHTML = ""),
            (state.playlist = {}));
          var listTitleElement = $("#list_title");
          (listTitleElement && (listTitleElement.innerHTML = "播放列表[0]"),
            (document.title = "R1音箱音乐页面" + state.deviceTag),
            setPageTitle(document.title),
            ui.musicPic &&
              ((ui.musicPic._coverTrack = null), updateMusicCover(ui.musicPic.placeholderSrc)),
            ui.musicLyrics && (ui.musicLyrics.innerHTML = ""),
            updateFullscreenTitle());
        }
        (!state.coverBackgroundEnabled &&
          state.coverBackgroundApplied &&
          (restoreBackground(), (state.coverBackgroundApplied = !1)),
          syncFullscreenControls(),
          (state.playType = value.play_type));
      }
    } else location.reload();
  } else
    state.unisoundVersionReloading || ((state.unisoundVersionReloading = !0), location.reload());
}
function updateMusicControls(value) {
  updateMusicCollectionButtons(value);
  var musicBtnPrevElement = $("#music_btn_prev"),
    musicBtnNextElement = $("#music_btn_next"),
    musicBtnPlayElement = $("#music_btn_play"),
    musicBtnPlaymodeElement = $("#music_btn_playmode");
  if (musicBtnPrevElement) {
    if (
      (2 == value.play_type || 3 == value.play_type
        ? ((musicBtnPrevElement.disabled = !0), (musicBtnNextElement.disabled = !0))
        : ((musicBtnPrevElement.disabled = !1), (musicBtnNextElement.disabled = !1)),
      musicBtnPlaymodeElement &&
        (musicBtnPlaymodeElement.style.display =
          0 == value.play_type || 1 == value.play_type ? "inline-flex" : "none"),
      !state.musicInfo)
    ) {
      musicBtnPlaymodeElement && (musicBtnPlaymodeElement.style.display = "none");
      var musicBtnCollectElement = $("#music_btn_collect"),
        musicBtnCancelCollectElement = $("#music_btn_cancel_collect"),
        musicBtnListElement = $("#music_btn_list");
      return (
        musicBtnCollectElement && (musicBtnCollectElement.style.display = "none"),
        musicBtnCancelCollectElement && (musicBtnCancelCollectElement.style.display = "none"),
        musicBtnListElement && (musicBtnListElement.style.display = "none"),
        ui.qualityPanel && (ui.qualityPanel.style.display = "none"),
        ui.qualitySelect && (ui.qualitySelect.style.display = "none"),
        ui.qualityLabel && (ui.qualityLabel.style.display = "none"),
        (musicBtnPrevElement.disabled = !0),
        (musicBtnNextElement.disabled = !0),
        void (
          musicBtnPlayElement &&
          ((musicBtnPlayElement.disabled = !1),
          musicBtnPlayElement.setAttribute("data", "play"),
          musicBtnPlayElement.classList.remove("playing"),
          updatePlayButtonIcon(musicBtnPlayElement, "play"))
        )
      );
    }
    var value2 = 0 == value.play_type || 1 == value.play_type,
      musicBtnListElement2 = $("#music_btn_list");
    (musicBtnListElement2 && (musicBtnListElement2.style.display = value2 ? "inline-flex" : "none"),
      musicBtnPlaymodeElement &&
        (musicBtnPlaymodeElement.style.display = value2 ? "inline-flex" : "none"));
    var qualityPanel = ui.qualityPanel,
      qualitySelect = ui.qualitySelect,
      qualityLabel = ui.qualityLabel;
    if (
      (qualityPanel && (qualityPanel.style.display = value2 ? "block" : "none"),
      qualitySelect && (qualitySelect.style.display = value2 ? "" : "none"),
      qualityLabel && (qualityLabel.style.display = value2 ? "" : "none"),
      state.musicInfo &&
        void 0 !== state.musicInfo.arist &&
        (state.musicInfo.artist = state.musicInfo.arist),
      isEchoVer(1863) && 2 == state.info.PlayerType && updateQualityInfo(),
      state.musicInfo && musicBtnPlayElement)
    )
      return 6 == state.musicInfo.state || 10 == state.musicInfo.state
        ? (musicBtnPlayElement.setAttribute("data", "play"),
          musicBtnPlayElement.classList.remove("playing"),
          (musicBtnPlayElement.disabled = !0),
          void updatePlayButtonIcon(
            musicBtnPlayElement,
            6 == state.musicInfo.state ? "buffer" : "loading",
          ))
        : void (value.play_state
            ? (musicBtnPlayElement.setAttribute("data", "pause"),
              musicBtnPlayElement.classList.add("playing"),
              (musicBtnPlayElement.disabled = !1),
              updatePlayButtonIcon(musicBtnPlayElement, "pause"))
            : (musicBtnPlayElement.setAttribute("data", "play"),
              musicBtnPlayElement.classList.remove("playing"),
              (musicBtnPlayElement.disabled = !1),
              updatePlayButtonIcon(musicBtnPlayElement, "play")));
  }
}
((attachQueueRowDrag.active = null),
  (attachQueueRowDrag.dragging = !1),
  (attachQueueRowDrag.pending = null));
var PCM_BIT_MAP = {
  3: 8,
  2: 16,
  268435456: 16,
  536870912: 24,
  805306368: 32,
  4: 32,
};
function describeAudioFormat(value, value2, value3) {
  if (!value) return "";
  var items = [];
  if (!1 !== value3) {
    var text,
      text2 = "";
    ("audio/vorbis" === value.sampleMimeType
      ? (text2 = "[OGG]")
      : "audio/mp4a-latm" === value.sampleMimeType
        ? (text2 = "[M4A]")
        : "audio/mpeg" === value.sampleMimeType && (text2 = "[MP3]"),
      (text =
        value.bitrate > 32e4
          ? value.sampleRate > 44100 && value.pcmEncoding > 3
            ? "Hi-Res"
            : "无损"
          : value.bitrate > 256e3
            ? "超品"
            : value.bitrate > 128e3
              ? "高品"
              : value.bitrate < 128e3
                ? "低品"
                : "标准"),
      items.push(text + text2));
  }
  var pCMBITMAPItem = PCM_BIT_MAP[value.pcmEncoding],
    numericValue = 0;
  if (value2 > 0) numericValue = parseInt(value2 / 1e3, 10);
  else if (value.bitrate > 0 && "audio/flac" !== value.sampleMimeType) {
    (pCMBITMAPItem &&
      "audio/raw" === value.sampleMimeType &&
      pCMBITMAPItem * value.sampleRate * value.channelCount === value.bitrate) ||
      (numericValue = parseInt(value.bitrate / 1e3, 10));
  }
  return (
    numericValue > 0 && items.push(numericValue + "Kbps"),
    pCMBITMAPItem && items.push(pCMBITMAPItem + "Bit"),
    value.sampleRate > 0 && items.push(value.sampleRate / 1e3 + "kHz"),
    items.join(" ")
  );
}
function updateQualityInfo() {
  if ((ui.applyLyricsModeHeight && ui.applyLyricsModeHeight(), ui.qualitySelect)) {
    var exoPlayerQuality = state.info.ExoPlayer_Quality;
    if (ui.qualitySelect.length > 2) {
      var text = state.info.Support_Flac ? "" : "none";
      ((ui.qualitySelect[0].style.display = text), (ui.qualitySelect[1].style.display = text));
    }
    exoPlayerQuality > 1 && !state.info.Support_Flac && (exoPlayerQuality = 1);
    for (var index = 0; index < ui.qualitySelect.length; index++)
      ui.qualitySelect[index].value == exoPlayerQuality && (ui.qualitySelect[index].selected = !0);
    var currentMusicData = state.info.music_info ? state.info.music_info.Current_MusicData : null;
    if (
      (JSON.stringify(currentMusicData) !== JSON.stringify(state.currentMusicData) &&
        ((state.currentMusicData = currentMusicData),
        currentMusicData &&
          state.musicInfo &&
          null != state.musicInfo.id &&
          "local_" === String(state.musicInfo.id).substring(0, 6) &&
          fetchTrackInfo()),
      !currentMusicData)
    )
      return (
        ui.qualityLabel && (ui.qualityLabel.innerHTML = ""),
        void (ui.qualityPanel && (ui.qualityPanel.style.display = "none"))
      );
    var value,
      apiData = currentMusicData.api_data,
      quality = apiData && "string" == typeof apiData.quality ? apiData.quality : null,
      br = apiData && "number" == typeof apiData.br ? apiData.br : 0;
    (quality
      ? ((value = "当前：" + quality),
        currentMusicData.Format &&
          (value += " " + describeAudioFormat(currentMusicData.Format, br, !1)))
      : (value = currentMusicData.Format
          ? describeAudioFormat(currentMusicData.Format, br, !0)
          : ""),
      (ui.qualitySelect.style.display = apiData ? "" : "none"),
      ui.qualityPanel && (ui.qualityPanel.style.display = "block"),
      ui.qualityLabel &&
        value !== ui.qualityLabel.innerHTML &&
        (ui.qualityLabel.innerHTML = value));
  }
}
function updateMusicTrackInfo(track) {
  var musicInfo = state.musicInfo,
    id =
      2 == track.play_type
        ? encodeURIComponent(musicInfo.title + "-" + musicInfo.artist + "-" + musicInfo.albumUrl)
        : musicInfo.id;
  if (
    (state.musicId !== musicInfo.id && 2 != track.play_type) ||
    (2 == track.play_type && id !== state.musicId) ||
    4 == track.play_type
  ) {
    var pic;
    if (
      ((state.lyricTiming = [
        -1,
        Math.max(0, parseInt(musicInfo.position, 10) || 0),
        Math.max(0, parseInt(musicInfo.duration, 10) || 0),
      ]),
      (state.lyrics = [[-1, "暂无歌词"]]),
      (state.musicId = id),
      (state.lyricsPending =
        1 == track.play_type ? { musicId: id, hostname: state.hostname, socket: state.ws } : null),
      ui.musicLyrics && ((ui.musicLyrics.innerHTML = ""), (ui.musicLyrics._placeholderText = null)),
      updateLyrics(!0),
      state.currentMusicData &&
        state.currentMusicData.api_data &&
        state.currentMusicData.api_data.info &&
        state.currentMusicData.id == state.musicId &&
        (pic = state.currentMusicData.api_data.info.pic),
      ui.musicPic)
    ) {
      var serializedData = JSON.stringify([track.play_type, id, musicInfo.title, musicInfo.artist]);
      (ui.musicPic._coverTrack !== serializedData &&
        (waitMusicCover(), (ui.musicPic._coverTrack = serializedData)),
        (pic || musicInfo.albumUrl) && updateMusicCover(pic || musicInfo.albumUrl));
    }
    updateFullscreenTitle();
    var trackTitle = getTrackTitle(musicInfo);
    (trackTitle &&
      (2 == track.play_type
        ? setPageTitle("[DLNA模式]" + trackTitle)
        : 3 == track.play_type
          ? setPageTitle("[AirPlay模式]" + trackTitle)
          : 4 == track.play_type
            ? setPageTitle("蓝牙模式[" + trackTitle + "]")
            : 5 == track.play_type
              ? setPageTitle("[MiPlay模式]" + trackTitle)
              : setPageTitle(trackTitle),
      (document.title = state.deviceTag + (ui.pageTitle ? ui.pageTitle.innerHTML : "")),
      updateFullscreenTitle()),
      fetchTrackInfo());
  } else
    ui.playlistTable && ui.playlistTable.getElementsByTagName("tr").length < 1 && fetchTrackInfo();
  var value = acceptMusicSeekPosition(musicInfo);
  if (!state.timeLocked && value) {
    var numericValue =
        4 == track.play_type ? 0 : Math.max(0, parseInt(musicInfo.duration, 10) || 0),
      numericValue2 = numericValue > 0 ? Math.max(0, parseInt(musicInfo.position, 10) || 0) : 0;
    ((state.lyricTiming[0] = track.play_state && numericValue > 0 ? Date.now() : -1),
      (state.lyricTiming[1] = numericValue2),
      (state.lyricTiming[2] = numericValue),
      ui.musicTimeRange &&
        (setMusicProgress(numericValue, numericValue2),
        (ui.musicTimeRange.disabled = numericValue < 1)));
  } else
    !state.timeLocked &&
      state.seekSession &&
      state.seekSession.committed &&
      !track.play_state &&
      -1 !== state.lyricTiming[0] &&
      ((state.lyricTiming[1] += Math.max(0, Date.now() - state.lyricTiming[0])),
      (state.lyricTiming[0] = -1));
  if (
    state.titleDisplayUntil - Date.now() > 0 &&
    ui.musicPanel &&
    "block" === ui.musicPanel.style.display
  ) {
    var trackTitle2 = getTrackTitle(musicInfo);
    trackTitle2 &&
      (2 == track.play_type
        ? setPageTitle("[DLNA模式]" + trackTitle2)
        : 3 == track.play_type
          ? setPageTitle("[AirPlay模式]" + trackTitle2)
          : 4 == track.play_type
            ? setPageTitle("蓝牙模式[" + trackTitle2 + "]")
            : 5 == track.play_type
              ? setPageTitle("[MiPlay模式]" + trackTitle2)
              : setPageTitle(trackTitle2),
      (document.title = state.deviceTag + (ui.pageTitle ? ui.pageTitle.innerHTML : "")),
      updateFullscreenTitle());
  }
}
function buildDeviceInfoPanel() {
  if (isEchoVer(1825) || (state.ver < 1823 && state.ver > 1800)) {
    var deviceInfoElement = makeEl("div", { id: "device_info", style: "display:none" });
    ((ui.deviceInfo = deviceInfoElement),
      ui.container && ui.container.appendChild(deviceInfoElement));
    var container = makeEl("div", {
      style: "max-width:600px;margin:10px auto;border-radius:15px",
    });
    if (
      (container.classList.add("mask"),
      deviceInfoElement.appendChild(container),
      container.appendChild(makeDiv("height:15px")),
      state.isNewUnisound && isUnisoundVer(1800) && isEchoVer(1825))
    ) {
      container.appendChild(
        makeText("登录信息：<br>", "color:var(--white);text-shadow:var(--white-shadow)"),
      );
      var textNode = makeText("", "color:var(--white);text-shadow:var(--white-shadow)");
      ((textNode.id = "user_info_text"),
        container.appendChild(textNode),
        container.appendChild(makeEl("br")),
        container.appendChild(
          makeText("<br>授权信息：<br>", "color:var(--white);text-shadow:var(--white-shadow)"),
        ));
      var textNode2 = makeText("", "color:var(--white);text-shadow:var(--white-shadow)");
      ((textNode2.id = "sq_info_text"),
        container.appendChild(textNode2),
        container.appendChild(makeEl("br")));
    }
    var text =
      state.isNewUnisound && isUnisoundVer(1800) && isEchoVer(1825)
        ? "<br>系统信息：<br>"
        : "系统信息：<br>";
    container.appendChild(makeText(text, "color:var(--white);text-shadow:var(--white-shadow)"));
    var textNode3 = makeText("", "color:var(--white);text-shadow:var(--white-shadow)");
    ((textNode3.id = "state_info_text"),
      container.appendChild(textNode3),
      container.appendChild(makeEl("br")),
      container.appendChild(makeDiv("height:15px")),
      state.isNewUnisound &&
        isUnisoundVer(1822) &&
        isEchoVer(1825) &&
        buildBenchmarkSection(deviceInfoElement),
      state.isNewUnisound &&
        isUnisoundVer(1800) &&
        isEchoVer(1825) &&
        buildLoginActions(deviceInfoElement),
      buildDeviceActions(deviceInfoElement));
  }
}
function buildBenchmarkSection(element) {
  var container = makeEl("div", {
    style: "max-width:600px;margin:10px auto;border-radius:15px",
  });
  (container.classList.add("mask"), container.appendChild(makeDiv("height:15px")));
  var container2 = makeEl("div"),
    container3 = makeDiv("");
  (container3.appendChild(makeText("唤醒灵敏度")), container2.appendChild(container3));
  var container4 = makeDiv("width:50px;display:inline-block");
  (container4.appendChild(makeText("低")), container2.appendChild(container4));
  var input = makeEl("input", {
    type: "range",
    min: 0,
    step: 10,
    max: 300,
    value: 0,
    disabled: !0,
  });
  ((input.maxValue = 300), (input.style.pointerEvents = "none"));
  var callback = function (value) {
    (clearTimeout(input._disableTimer),
      (input.style.pointerEvents = "auto"),
      (input._disableTimer = setTimeout(function () {
        input.style.pointerEvents = "none";
      }, value || 3e3)));
  };
  (container3.firstChild.addEventListener("click", function () {
    callback(3e3);
  }),
    input.addEventListener("input", function () {
      (callback(3e3), clearTimeout(timers.wakeupBenchmark));
      var value = this.max - this.value;
      timers.wakeupBenchmark = setTimeout(function () {
        isUnisoundVer(1848)
          ? sendToUnisound({
              type: "User_Wakeup_Benchmark",
              User_Wakeup_Benchmark: value / 100,
            })
          : sendToUnisound({
              type: "Main_Wakeup_Benchmark",
              Benchmark: value / 100,
            });
      }, 100);
    }),
    container2.appendChild(input));
  var container5 = makeDiv("width:50px;display:inline-block");
  if (
    (container5.appendChild(makeText("高")),
    container2.appendChild(container5),
    container2.addEventListener("dblclick", function () {
      callback(3e3);
    }),
    (ui.wakeupBenchmark = input),
    container.appendChild(container2),
    isUnisoundVer(1822) && isEchoVer(1828))
  ) {
    var container6 = makeEl("div"),
      container7 = makeDiv("");
    (container7.appendChild(makeText("最大录音时间")), container6.appendChild(container7));
    var container8 = makeDiv("width:50px;display:inline-block");
    (container8.appendChild(makeText("当前：")), container6.appendChild(container8));
    var input2 = makeEl("input", {
      type: "range",
      min: 2,
      step: 1,
      max: 10,
      value: 1,
      disabled: !0,
    });
    input2.style.pointerEvents = "none";
    var callback2 = function (value) {
      (clearTimeout(input2._disableTimer),
        (input2.style.pointerEvents = "auto"),
        (input2._disableTimer = setTimeout(function () {
          input2.style.pointerEvents = "none";
        }, value || 3e3)));
    };
    (input2.addEventListener("input", function () {
      (callback2(3e3),
        clearTimeout(timers.asrDuration),
        (timers.asrDuration = setTimeout(function () {
          (ui.asrMaxDurationLabel && (ui.asrMaxDurationLabel.innerHTML = input2.value + "秒"),
            sendToUnisound({
              type: "asrMaxDuration",
              Duration: 1e3 * parseInt(input2.value, 10),
            }));
        }, 100)));
    }),
      container6.appendChild(input2));
    var textNode = makeText("未知"),
      container9 = makeDiv("width:50px;display:inline-block");
    (container9.appendChild(textNode),
      container6.appendChild(container9),
      container6.addEventListener("dblclick", function () {
        callback2(3e3);
      }),
      (ui.asrMaxDuration = input2),
      (ui.asrMaxDurationLabel = textNode),
      container.appendChild(container6));
  }
  (container.appendChild(makeDiv("height:15px")), element.appendChild(container));
}
function buildLoginActions(element) {
  (element.appendChild(
    makeButton("刷新授权", function () {
      updateDeviceInfo();
    }),
  ),
    element.appendChild(
      makeButton("重登录QQ音乐", function () {
        switchLoginApp("qqmusic", "QQ音乐");
      }),
    ),
    isUnisoundVer(1844) &&
      element.appendChild(
        makeButton("重登录酷我音乐", function () {
          switchLoginApp("kuwo", "酷我音乐");
        }),
      ),
    element.appendChild(
      makeButton("重登录网易云音乐", function () {
        switchLoginApp("netease", "网易云音乐");
      }),
    ),
    element.appendChild(
      makeButton("退出登录", function () {
        showAppConfirm("确定要退出登录吗？", function () {
          (hideLogin(), clearQrCache(), sendToUnisound({ type: "exit_login" }));
        });
      }),
    ));
}
function switchLoginApp(value, value2) {
  showAppConfirm("确定要重新登录" + value2 + "？", function () {
    (hideLogin(),
      (state.loginMode = "music"),
      (state.loginApp = value),
      hideAllPages(),
      stopInfoRefresh(),
      unhideLogin());
  });
}
function buildDeviceActions(element) {
  element.appendChild(
    makeButton(
      "清理进程",
      function () {
        ((this.disabled = !0), (this.value = "请稍候。。。"), runShell("ps", "ps"));
      },
      { id: "Cleanup_process" },
    ),
  );
  var button = makeButton("开始/退出休眠", function () {
    this.disabled = !0;
    var receiver = this;
    setTimeout(function () {
      receiver.disabled = !1;
    }, 2e3);
    var dormancyState = this.dormancyState,
      value = this.value,
      value2 =
        ((receiver = this),
        function () {
          1 == dormancyState
            ? sendAction(256, 1, -1, !0)
            : 0 == dormancyState && sendAction(256, 2, -1, !0);
        });
    -1 !== dormancyState ? showAppConfirm("确定要" + value + "吗？", value2) : value2();
  });
  if (
    ((button.id = "dormancy_btn"),
    (button.style.display = "none"),
    (button.dormancyState = -1),
    (ui.dormancyBtn = button),
    element.appendChild(button),
    isUnisoundVer(1840))
  ) {
    var button2 = makeButton("启用/禁用麦克风", function () {
      this.disabled = !0;
      var receiver = this;
      setTimeout(function () {
        receiver.disabled = !1;
      }, 2e3);
      var wakeupState = this.wakeupState,
        callback = function () {
          1 == wakeupState
            ? sendToUnisound({ type: "stop_wakeup" })
            : 0 == wakeupState && sendToUnisound({ type: "enter_wakeup" });
        };
      -1 !== wakeupState
        ? showAppConfirm(
            "确定要" +
              (0 == wakeupState ? "启用" : "禁用") +
              "麦克风吗？\r\n提示：此功能为临时开关！",
            callback,
          )
        : callback();
    });
    ((button2.id = "Wakeup_set_btn"),
      (button2.style.display = "none"),
      (button2.wakeupState = -1),
      (ui.wakeupBtn = button2),
      element.appendChild(button2));
  }
  var button3 = makeButton("无可禁用的无用服务", function () {
    ((this.disabled = !0),
      (this.value = "请稍候。。。"),
      this.setAttribute("wait", Date.now() + 3e4));
    for (var items = [], index = 0; index < state.unusableServices.length; index++)
      items.push("/system/bin/pm hide " + state.unusableServices[index]);
    runShell(items.join(" && "), "hide_useless_services");
  });
  if (
    ((button3.id = "hide_useless_services"),
    (button3.disabled = !0),
    button3.setAttribute("wait", 0),
    element.appendChild(button3),
    isEchoVer(1835))
  ) {
    var button4 = makeButton(state.unisoundAvailable ? "禁用小讯" : "启用小讯", function () {
      var receiver = this;
      showAppConfirm("确定要" + this.value + "吗？", function () {
        ((receiver.disabled = !0),
          setTimeout(function () {
            receiver.disabled = !1;
          }, 1e3),
          "禁用小讯" === receiver.value
            ? runShell("/system/bin/pm hide com.phicomm.speaker.device")
            : runShell("/system/bin/pm unhide com.phicomm.speaker.device"));
      });
    });
    ((button4.id = "disable_unisound"), element.appendChild(button4));
  }
  if (
    (state.unisoundAvailable &&
      element.appendChild(
        makeButton("清除小讯数据", function () {
          showAppConfirm("确定要清除小讯数据吗？\r\n清除后需重新扫码登录才能使用！", function () {
            showAppConfirm("真的要清除小讯数据吗？", function () {
              (runShell("/system/bin/pm clear com.phicomm.speaker.device"),
                setTimeout(function () {
                  (runShell("/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity"),
                    showAppAlert("清除完毕，稍候请重新扫码登录！"));
                }, 3e3));
            });
          });
        }),
      ),
    isUnisoundVer(1825) && isEchoVer(1841))
  ) {
    var button5 = makeButton("打开/关闭蓝牙提示音", function () {
      this.disabled = !0;
      var receiver = this;
      (setTimeout(function () {
        receiver.disabled = !1;
      }, 1e3),
        1 == receiver.toneState
          ? sendToUnisound({ type: "Set_Bluetooth_prompt_tone", enable: !1 })
          : 0 == receiver.toneState &&
            sendToUnisound({ type: "Set_Bluetooth_prompt_tone", enable: !0 }),
        sendToUnisound({ type: "get_info" }));
    });
    ((button5.id = "Bluetooth_prompt_tone_btn"),
      (button5.style.display = "none"),
      (button5.toneState = -1),
      (ui.btToneBtn = button5),
      element.appendChild(button5));
  }
  if (isUnisoundVer(1824)) {
    var button6 = makeButton("打开/关闭提交播放记录", function () {
      this.disabled = !0;
      var receiver = this;
      (setTimeout(function () {
        receiver.disabled = !1;
      }, 1e3),
        1 == receiver.recordState
          ? sendToUnisound({ type: "Submit_Play_Record", enable: !1 })
          : 0 == receiver.recordState && sendToUnisound({ type: "Submit_Play_Record", enable: !0 }),
        sendToUnisound({ type: "get_info" }));
    });
    ((button6.id = "Submit_Play_Record_btn"),
      (button6.style.display = "none"),
      (button6.recordState = -1),
      (ui.submitRecordBtn = button6),
      element.appendChild(button6));
  }
  if (state.isNewUnisound && isUnisoundVer(1820) && isEchoVer(1815)) {
    var button7 = makeButton("无可清除的闹铃/提醒", function () {
      var receiver = this;
      showAppConfirm("确定要清除吗？", function () {
        ((receiver.disabled = !0),
          (receiver.value = "请稍候。。。"),
          isUnisoundVer(1840)
            ? sendToUnisound({ type: "delall_memo" })
            : sendToUnisound({ type: "del_memo", data: state.memoList }),
          receiver.setAttribute("wait", Date.now() + 3e4));
      });
    });
    ((button7.id = "clear_memo"),
      (button7.disabled = !0),
      button7.setAttribute("wait", 0),
      element.appendChild(button7));
  }
  if (isEchoVer(1856)) {
    var button8 = makeButton(
      2 == state.info.PlayerType ? "切换MediaPlayer播放器" : "切换ExoPlayer播放器",
      function () {
        var playerType = this.getAttribute("PlayerType"),
          numericValue = "2" === playerType ? 1 : 2;
        showAppConfirm(
          "确定要切换为" + ("2" === playerType ? "MediaPlayer播放器" : "ExoPlayer播放器") + "吗？",
          function () {
            sendWs({ type: "switch_player", player: numericValue });
          },
        );
      },
    );
    ((button8.id = "switch_player"), element.appendChild(button8));
  }
  var button9 = makeButton("打开/关闭smb服务", function () {
    var receiver = this,
      state2 = receiver.getAttribute("state") || 0;
    showAppConfirm("确定要" + receiver.value + "吗？", function () {
      (receiver.setAttribute("state", "1" === state2 ? 0 : 1),
        (state2 = receiver.getAttribute("state") || 0),
        (receiver.value = "1" === state2 ? "关闭smb服务" : "打开smb服务"),
        runShell(
          "setprop sys.rksmbd.start " + state2 + " && getprop sys.rksmbd.start",
          "rksmbd_state",
        ),
        showAppAlert(
          "1" === state2 ? "已打开smbd服务！\r\n用户名: root\r\n密码: 123456" : "已关闭smbd服务！",
        ));
    });
  });
  ((button9.id = "rksmbd"),
    (button9.style.display = "none"),
    element.appendChild(button9),
    runShell(
      '[ "$(getenforce)" = "Enforcing" ] && echo -1 || getprop sys.rksmbd.start',
      "rksmbd_state",
    ));
}
function updateDeviceInfo() {
  var value = Date.now();
  (value > state.deviceInfoLastFetch &&
    state.isNewUnisound &&
    ((state.deviceInfoLastFetch = value + 5e3),
    sendToUnisound({ type: "api", data: { type: "info" } })),
    -1 === timers.deviceInfo &&
      ((timers.deviceInfo = 1), updateDeviceInfoWorker(), updateSystemInfo()));
}
function updateDeviceInfoWorker() {
  if (-1 !== timers.deviceInfo)
    if (isEchoVer(1855)) {
      var items = [
        {
          type: "shell",
          type_id: "useless_services_detection",
          shell: "/system/bin/pm list packages",
        },
      ];
      (state.isNewUnisound &&
        isUnisoundVer(1820) &&
        (items.push({ type: "send_to_unisound", data: { type: "get_memo" } }),
        items.push({ type: "send_to_unisound", data: { type: "get_info" } })),
        sendWs({ type: "sends", list: items }));
    } else
      (runShell("/system/bin/pm list packages", "useless_services_detection"),
        state.isNewUnisound &&
          isUnisoundVer(1820) &&
          (sendToUnisound({ type: "get_memo" }),
          setTimeout(function () {
            sendToUnisound({ type: "get_info" });
          }, 200)));
}
function updateSystemInfo() {
  isEchoVer(1853)
    ? sendWs({
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
      })
    : runShell(
        "cat /proc/meminfo&&cat /proc/stat&&echo incremental:$(getprop ro.build.version.incremental)&&echo date:$(date)",
        "query",
      );
}
function setSystemInfoV2(value, value2) {
  (setTimeout(function () {
    -1 !== timers.deviceInfo && updateSystemInfo();
  }, 1e3),
    updateDeviceInfoWorker());
  var stateInfoTextElement = $("#state_info_text");
  if (stateInfoTextElement) {
    for (
      var items = value.meminfo.split("\r\n"), value3 = -1, value4 = -1, value5 = -1, index = 0;
      index < items.length;
      index++
    ) {
      var items2 = items[index].split(":");
      if (
        ("MemTotal" === items2[0]
          ? (value3 = parseInt(items2[1], 10))
          : "MemFree" === items2[0]
            ? (value4 = parseInt(items2[1], 10))
            : "Cached" === items2[0] && (value5 = parseInt(items2[1], 10)),
        -1 !== value3 && -1 !== value4 && -1 !== value5)
      )
        break;
    }
    for (
      var items3 = value.cpu.split("\r\n"), text = "0-0", index2 = 0;
      index2 < items3.length;
      index2++
    )
      if (0 === items3[index2].indexOf("online:")) {
        text = items3[index2].split(":")[1].replace(/^\s+|\s+$/g, "");
        break;
      }
    for (var numericValue = 0, index3 = 0; index3 < value.availableProcessors; index3++)
      for (
        var items4 = (value["cpu" + index3] || "").split("\r\n"), index4 = 0;
        index4 < items4.length;
        index4++
      ) {
        var items5 = items4[index4].split(":");
        if ("scaling_cur_freq" === items5[0]) {
          var numericValue2 = parseInt(items5[1], 10);
          numericValue2 > numericValue && (numericValue = numericValue2);
        }
      }
    var text2 = "MediaPlayer";
    2 == state.info.Current_PlayerType &&
      ((text2 = "ExoPlayer"),
      state.info.Support_Flac &&
        (isEchoVer(1864)
          ? (text2 += "[FLAC]")
          : isEchoVer(1863)
            ? (text2 += "[FFmpeg]")
            : isEchoVer(1856) && (text2 += "[FLAC]")));
    var cpuTemperature = "",
      text3 = "";
    if (value2)
      for (var index5 = 0; index5 < value2.length; index5++) {
        if ("cpu_temp" === value2[index5].type_id && value2[index5].data) {
          var items6 = String(value2[index5].data).split("\r\n");
          items6[1] && (cpuTemperature = items6[1]);
        }
        if ("date" === value2[index5].type_id && value2[index5].data) {
          var items7 = String(value2[index5].data).split("\r\n");
          items7[1] && (text3 = items7[1]);
        }
      }
    if (text3) {
      var date = new Date(text3 + " +0800");
      isNaN(date.getTime()) || (state.deviceDate = date);
    }
    var value6 =
      "设备名称：" +
      (state.info.device_name
        ? state.info.device_name + "(" + state.hostname + ")"
        : state.hostname);
    ((value6 += "<br>固件版本：" + value.incremental),
      (value6 += "<br>设备IP：" + state.localIp),
      isEchoVer(1856) &&
        ((value6 += "<br>当前播放器：" + text2),
        2 == state.info.Current_PlayerType &&
          "string" == typeof state.info.ExoPlayer_Version &&
          (value6 += "<br>ExoPlayer版本：" + state.info.ExoPlayer_Version)),
      (value6 +=
        "<br>CPU使用率[" +
        text +
        "]：(" +
        (numericValue / 1e6).toFixed(2) +
        "Ghz)" +
        parseInt(value.cpuinfo[3], 10) +
        "%"),
      cpuTemperature && (value6 += " " + Math.round(cpuTemperature) + "℃"),
      (value6 +=
        "<br>可用/全部：" +
        parseInt((value4 + value5) / 1024, 10) +
        "MB/" +
        parseInt(value3 / 1024, 10) +
        "MB"),
      (value6 += "<br>系统已运行：" + formatDuration(value.elapsedRealtime)),
      state.deviceDate &&
        (value6 +=
          "<br>音箱当前时间：" + formatUnixTime(parseInt(state.deviceDate.getTime() / 1e3, 10))),
      (value6 += "<br>信息更新时间：" + formatUnixTime(parseInt(Date.now() / 1e3, 10))),
      (stateInfoTextElement.innerHTML = value6));
  }
}
function setSystemInfoV1(text) {
  (setTimeout(function () {
    -1 !== timers.deviceInfo && updateSystemInfo();
  }, 1e3),
    updateDeviceInfoWorker());
  var stateInfoTextElement = $("#state_info_text");
  if (stateInfoTextElement) {
    for (
      var items = text.split("\r\n"),
        value = -1,
        value2 = -1,
        value3 = -1,
        numericValue = 0,
        index = 0;
      index < items.length;
      index++
    ) {
      var items2 = items[index].split(":");
      if (
        ("MemTotal" === items2[0]
          ? (value = parseInt(items2[1], 10))
          : "MemFree" === items2[0]
            ? (value2 = parseInt(items2[1], 10))
            : "Cached" === items2[0] && (value3 = parseInt(items2[1], 10)),
        -1 !== value && -1 !== value2 && -1 !== value3)
      ) {
        numericValue = index + 1;
        break;
      }
    }
    for (
      var value4 = null, numericValue2 = 0, value5 = null, index2 = numericValue;
      index2 < items.length;
      index2++
    ) {
      0 === items[index2].indexOf("btime ") && (value4 = items[index2].substring(6));
      var items3 = items[index2].split(":"),
        value6 = items3.shift();
      if ("incremental" === value6) numericValue2 = items3.join(":");
      else if ("date" === value6 && (value5 = items3.join(":"))) {
        var date = new Date(value5 + " +0800");
        isNaN(date.getTime()) || (state.deviceDate = date);
      }
    }
    var value7 =
      "设备名称：" +
      (state.info.device_name
        ? state.info.device_name + "(" + state.hostname + ")"
        : state.hostname);
    ((value7 += "<br>固件版本：" + numericValue2),
      (value7 += "<br>设备IP：" + state.localIp),
      (value7 +=
        "<br>可用/全部：" +
        parseInt((value2 + value3) / 1024, 10) +
        "MB/" +
        parseInt(value / 1024, 10) +
        "MB"),
      (value7 += "<br>系统已运行：" + formatDuration(Date.now() - 1e3 * value4)),
      (value7 += "<br>信息更新时间：" + formatUnixTime(parseInt(Date.now() / 1e3, 10))),
      (stateInfoTextElement.innerHTML = value7));
  }
}
function detectUnusableServices(value) {
  state.unusableServices = [];
  for (
    var items =
        "com.phicomm.speaker.airskill,com.android.providers.telephony,com.phicomm.speaker.productiontest,com.android.externalstorage,com.android.providers.downloads,com.android.certinstaller,com.phicomm.speaker.bugreport,com.android.inputdevices,com.android.server.telecom,com.android.keychain,com.phicomm.speaker.otaservice,com.android.proxyhandler,com.phicomm.speaker.ijetty,com.android.vpndialogs,com.android.location.fused,com.phicomm.speaker.exceptionreporter".split(
          ",",
        ),
      index = 0;
    index < items.length;
    index++
  )
    value.indexOf(items[index]) > -1 && state.unusableServices.push(items[index]);
  var hideUselessServicesElement = $("#hide_useless_services");
  hideUselessServicesElement &&
    (state.unusableServices.length > 0
      ? Date.now() > parseInt(hideUselessServicesElement.getAttribute("wait"), 10) &&
        ((hideUselessServicesElement.value =
          "禁用[" + state.unusableServices.length + "]个无用的服务"),
        (hideUselessServicesElement.style.display = ""),
        (hideUselessServicesElement.disabled = !1))
      : ((hideUselessServicesElement.value = "无可禁用的无用服务"),
        (hideUselessServicesElement.disabled = !0)));
}
function handleMemoInfo(message) {
  if (message.data) {
    var clearMemoElement = $("#clear_memo");
    if (clearMemoElement) {
      if ("del_memo" === message.type || "delall_memo" === message.type) {
        var value = state.memoList.length - message.data.length;
        clearMemoElement.value = "已清除" + (value < 1 ? "" : value + "个") + "闹铃/提醒！";
      }
      (message.data.length > 0
        ? Date.now() > parseInt(clearMemoElement.getAttribute("wait"), 10) &&
          ((clearMemoElement.style.display = ""),
          (clearMemoElement.disabled = !1),
          (clearMemoElement.value = "清除" + message.data.length + "个闹铃/提醒"))
        : setTimeout(function () {
            var clearMemoElement2 = $("#clear_memo");
            clearMemoElement2 &&
              ((clearMemoElement2.value = "无可清除的闹铃/提醒"),
              (clearMemoElement2.disabled = !0));
          }, 1e3),
        (state.memoList = message.data));
    }
  }
}
function loadDeviceInfo() {
  var userInfoTextElement = $("#user_info_text"),
    sqInfoTextElement = $("#sq_info_text"),
    apiInfo = state.deviceInfoCache.api_info;
  if (apiInfo)
    if (200 == apiInfo.code) {
      var nameValuePairs = apiInfo.data.nameValuePairs || apiInfo.data,
        nameValuePairs2 = nameValuePairs.device_info.nameValuePairs || nameValuePairs.device_info,
        nameValuePairs3 = nameValuePairs.user_info.nameValuePairs || nameValuePairs.user_info;
      if (userInfoTextElement) {
        var value = "用户：" + nameValuePairs3.nick + "(" + nameValuePairs3.userid + ")";
        ((value +=
          "<br>QQ音乐：" +
          (1 == nameValuePairs3.qqmusic_login_state
            ? "已登录(" + nameValuePairs3.userid + ")"
            : "未登录")),
          isUnisoundVer(1844) &&
            (value +=
              "<br>酷我音乐：" +
              (1 == nameValuePairs3.kuwo_login_state && nameValuePairs3.kuwo_uid
                ? "已登录(" + nameValuePairs3.kuwo_uid + ")"
                : "未登录")),
          (value +=
            "<br>网易云音乐：" +
            (1 == nameValuePairs3.netease_login_state && nameValuePairs3.netease_uid
              ? "已登录(" + nameValuePairs3.netease_uid + ")"
              : nameValuePairs3.netease_login_info || "未登录")),
          (value +=
            "<br>最后登录时间：" +
            (nameValuePairs3.login_time ? formatUnixTime(nameValuePairs3.login_time) : "未知")),
          (userInfoTextElement.innerHTML = value));
      }
      if (sqInfoTextElement) {
        var value2 = "公网IP：" + nameValuePairs2.ip;
        ((value2 += "<br>设备SN：" + nameValuePairs2.sn),
          (value2 += "<br>设备MAC：" + nameValuePairs2.mac));
        var text = "未授权",
          numericValue = parseInt(Date.now() / 1e3, 10);
        ((1 != nameValuePairs2.sq_type &&
          2 != nameValuePairs2.sq_type &&
          3 != nameValuePairs2.sq_type) ||
          (numericValue > nameValuePairs2.sq_expire_time && 3 != nameValuePairs2.sq_type
            ? (text =
                2 == nameValuePairs2.sq_type
                  ? "试用已过期<br>过期时间：" + formatUnixTime(nameValuePairs2.sq_expire_time)
                  : "已过期<br>过期时间：" + formatUnixTime(nameValuePairs2.sq_expire_time))
            : 2 == nameValuePairs2.sq_type
              ? (text = "试用授权<br>到期时间：" + formatUnixTime(nameValuePairs2.sq_expire_time))
              : ((text = "已授权<br>到期时间："),
                (text +=
                  3 == nameValuePairs2.sq_type
                    ? nameValuePairs2.sq_expire_time_text || "永久"
                    : formatUnixTime(nameValuePairs2.sq_expire_time)))),
          (value2 += "<br>授权状态：" + text),
          (sqInfoTextElement.innerHTML = value2));
      }
      (urlParams.del(["connect_id", "connect_ip"]),
        location.host.indexOf(state.controlHost) > -1 &&
          urlParams.put({ connect_id: nameValuePairs2.device_msid, connect_ip: state.ip }),
        updateDeviceList({
          hostname: state.hostname,
          ip: state.localIp || R1Config.parseDeviceAddress(state.ip).host,
          dev_name: state.info.device_name,
          url: location.href.split("?")[0],
          device_sid: nameValuePairs2.device_sid,
          device_msid: nameValuePairs2.device_msid,
        }));
    } else
      userInfoTextElement &&
        (userInfoTextElement.innerHTML = apiInfo.msg + "(" + apiInfo.code + ")");
}
function unhideDeviceInfo() {
  ((document.title = "R1音箱信息页面" + state.deviceTag),
    setPageTitle(document.title),
    ui.deviceInfo && (ui.deviceInfo.style.display = "block"),
    updateDeviceInfo());
}
function hideDeviceInfo() {
  (clearInterval(timers.deviceInfo),
    (timers.deviceInfo = -1),
    ui.deviceInfo && (ui.deviceInfo.style.display = "none"));
}
function stopBluetoothRefresh() {
  (clearInterval(timers.bluetooth), (timers.bluetooth = -1));
}
function startBluetoothRefresh() {
  (stopBluetoothRefresh(),
    state.ws &&
      state.ws.readyState === WebSocket.OPEN &&
      (sendWs({ type: "BT_Device" }),
      (timers.bluetooth = setInterval(function () {
        sendWs({ type: "BT_Device" });
      }, 1e3))));
}
function unhideBluetooth() {
  ((document.title = "R1音箱蓝牙页面" + state.deviceTag),
    setPageTitle(document.title),
    ui.bluetooth && (ui.bluetooth.style.display = "block"),
    startBluetoothRefresh());
}
function hideBluetooth() {
  for (
    var items = [ui.btScanBtn, ui.btDiscoverBtn, ui.btEnableBtn], index = 0;
    index < items.length;
    index++
  )
    items[index] && (items[index].disabled = !0);
  ((ui.btLastHash = ""),
    ui.btEnableBtn && (ui.btEnableBtn.enable = -1),
    ui.btPairedList && (ui.btPairedList.innerHTML = ""),
    ui.btScannedList && (ui.btScannedList.innerHTML = ""),
    stopBluetoothRefresh(),
    ui.bluetooth && (ui.bluetooth.style.display = "none"));
}
function refreshBluetoothDevices(value) {
  if (ui.btPairedList) {
    var value2 = bluetoothDataHash(value);
    if (ui.btLastHash !== value2) {
      ui.btLastHash = value2;
      var scrollTop = ui.btListContainer ? ui.btListContainer.scrollTop : 0;
      ((ui.btPairedList.innerHTML = ""), (ui.btScannedList.innerHTML = ""));
      var bluetoothPairingTitleElement = $("#bluetooth_pairing_title"),
        bluetoothScanTitleElement = $("#bluetooth_scan_title");
      if (
        (bluetoothPairingTitleElement &&
          (bluetoothPairingTitleElement.innerHTML = "已配对的设备[0]"),
        bluetoothScanTitleElement && (bluetoothScanTitleElement.innerHTML = "扫描到的设备[0]"),
        ui.btScanBtn &&
          (value.Scanning
            ? ((ui.btScanBtn.disabled = !0), (ui.btScanBtn.value = "扫描中。。。"))
            : ((ui.btScanBtn.disabled = !1), (ui.btScanBtn.value = "扫描蓝牙设备"))),
        !value.Enabled)
      )
        return (
          ui.btEnableBtn &&
            !ui.btEnableBtn.wait &&
            0 != ui.btEnableBtn.enable &&
            ((ui.btEnableBtn.enable = 0),
            (ui.btEnableBtn.disabled = !1),
            (ui.btEnableBtn.value = "打开蓝牙适配器")),
          ui.btScanBtn && (ui.btScanBtn.disabled = !0),
          void (ui.btDiscoverBtn && (ui.btDiscoverBtn.disabled = !0))
        );
      (ui.btEnableBtn &&
        !ui.btEnableBtn.wait &&
        1 != ui.btEnableBtn.enable &&
        ((ui.btEnableBtn.enable = 1),
        (ui.btEnableBtn.disabled = !1),
        (ui.btEnableBtn.value = "关闭蓝牙适配器"),
        state.info.Service_Normally_Open && sendWs({ type: "BT_setScanMode", mode: 21 })),
        ui.btDiscoverBtn &&
          ((ui.btDiscoverBtn.disabled = !1),
          (ui.btDiscoverBtn.ScanMode = value.ScanMode),
          (ui.btDiscoverBtn.value = 23 == value.ScanMode ? "关闭蓝牙可发现" : "打开蓝牙可发现")));
      for (
        var bondedDevices = value.Bonded_Devices || [],
          scanDevices = value.Scan_Devices || [],
          connectedDevice = value.ConnectedDevice || "",
          a2dpConnectedDevices = value.A2dp_ConnectedDevices || [],
          a2dpSinkConnectedDevices = value.A2dpSink_ConnectedDevices || [],
          index = 0;
        index < bondedDevices.length;
        index++
      )
        ((bondedDevices[index].A2dpConnect = arrIncludes(
          a2dpConnectedDevices,
          bondedDevices[index].Address,
        )),
          (bondedDevices[index].A2dpSinkConnect = arrIncludes(
            a2dpSinkConnectedDevices,
            bondedDevices[index].Address,
          )),
          classifyBluetoothDevice(bondedDevices[index]));
      for (var index2 = 0; index2 < scanDevices.length; index2++)
        classifyBluetoothDevice(scanDevices[index2]);
      renderBluetoothList(
        ui.btPairedList,
        bondedDevices,
        connectedDevice,
        bluetoothPairingTitleElement,
        "已配对的设备",
      );
      for (var items = [], index3 = 0; index3 < scanDevices.length; index3++) {
        for (var isEnabled = !1, index4 = 0; index4 < bondedDevices.length; index4++)
          if (bondedDevices[index4].Address === scanDevices[index3].Address) {
            isEnabled = !0;
            break;
          }
        isEnabled || items.push(scanDevices[index3]);
      }
      (renderBluetoothList(
        ui.btScannedList,
        items,
        connectedDevice,
        bluetoothScanTitleElement,
        "扫描到的设备",
      ),
        ui.btListContainer && scrollTop > 0 && (ui.btListContainer.scrollTop = scrollTop));
    }
  }
}
function bluetoothDataHash(value) {
  var items = [];
  (items.push(value.Scanning ? 1 : 0),
    items.push(value.Enabled ? 1 : 0),
    items.push(value.ScanMode || 0),
    items.push(value.ConnectedDevice || ""));
  for (
    var bondedDevices = value.Bonded_Devices || [], index = 0;
    index < bondedDevices.length;
    index++
  ) {
    var bondedDeviceItem = bondedDevices[index];
    items.push(
      bondedDeviceItem.Address || "",
      bondedDeviceItem.Name || "",
      bondedDeviceItem.BondState || 0,
    );
  }
  items.push("|");
  for (
    var scanDevices = value.Scan_Devices || [], index2 = 0;
    index2 < scanDevices.length;
    index2++
  ) {
    var scanDeviceItem = scanDevices[index2];
    items.push(scanDeviceItem.Address || "", scanDeviceItem.Name || "");
  }
  items.push("|");
  for (
    var a2dpConnectedDevices = value.A2dp_ConnectedDevices || [], index3 = 0;
    index3 < a2dpConnectedDevices.length;
    index3++
  )
    items.push(a2dpConnectedDevices[index3]);
  for (
    var a2dpSinkConnectedDevices = value.A2dpSink_ConnectedDevices || [], index4 = 0;
    index4 < a2dpSinkConnectedDevices.length;
    index4++
  )
    items.push(a2dpSinkConnectedDevices[index4]);
  return items.join(",");
}
function classifyBluetoothDevice(value) {
  var bluetoothClass = value.BluetoothClass || 0,
    value2 = 7936 & bluetoothClass,
    value3 = 16769024 & bluetoothClass;
  value.Service = value3;
  ((value.DeviceType =
    {
      256: "COMPUTER",
      512: "PHONE",
      768: "NETWORKING",
      1024: "AUDIO_VIDEO",
      1280: "PERIPHERAL",
      1536: "IMAGING",
      1792: "WEARABLE",
      2048: "TOY",
      7936: "UNCATEGORIZED",
    }[value2] || ""),
    (value.A2dpSink = !!(262144 & value3 || value3)),
    (value.A2dp = !!(524288 & value3)));
}
function renderBluetoothList(element, value, value2, value3, value4) {
  for (
    var documentFragment = document.createDocumentFragment(), index = 0, index2 = 0;
    index2 < value.length;
    index2++
  ) {
    var item = value[index2],
      trElement = makeEl("tr", { class: "span" });
    (trElement.setAttribute(
      "Connected",
      (item.Address === value2 && (item.A2dpConnect || item.A2dpSinkConnect)) ||
        item.A2dpConnect ||
        item.A2dpSinkConnect,
    ),
      "true" == trElement.getAttribute("Connected") &&
        trElement.appendChild(makeEl("span", { html: "[已连接]" })),
      trElement.setAttribute("data", JSON.stringify(item)),
      (function (value5) {
        value5.onclick = function () {
          createBluetoothConfigDialog(value5);
        };
      })(trElement),
      trElement.appendChild(makeEl("span", { html: getBluetoothDeviceTitle(item) })),
      documentFragment.appendChild(trElement),
      index++,
      index2 < value.length - 1 &&
        documentFragment.appendChild(
          makeEl("hr", {
            class: "hr",
            style: "width:80%;background-color:rgba(255,255,255,0.1)",
          }),
        ));
  }
  (element.appendChild(documentFragment),
    value3 && (value3.innerHTML = value4 + "[" + index + "]"));
}
function getBluetoothDeviceTitle(value) {
  var text = 11 == value.BondState ? "[配对中]" : "";
  return (
    "UNCATEGORIZED" !== value.DeviceType &&
      (text +=
        {
          COMPUTER: "💻",
          PHONE: "📱",
          AUDIO_VIDEO: "🎧",
          PERIPHERAL: "[外围设备]",
        }[value.DeviceType] || value.DeviceType),
    text + (value.name || value.Name || value.Address)
  );
}
var miPlayGroupDialog = null;
function createMiPlayGroupDialog() {
  if (miPlayGroupDialog && miPlayGroupDialog.isOpen()) miPlayGroupDialog.close();
  else {
    var dialogPanel = createDialogPanel("MiPlay 立体声组合", {
      transparent: !0,
      width: "92vw",
    });
    ((miPlayGroupDialog = dialogPanel), (dialogPanel.wrap.id = "miplay_group_wrap"));
    var text = "color:#fff;font-size:13px;line-height:1.5;text-align:left",
      container = makeEl("div", { style: text + ";margin:4px 0 8px" });
    dialogPanel.body.appendChild(container);
    var input = makeEl("input", {
      type: "button",
      class: "btn",
      value: "🔗 一键组队（自动发现副机）",
      style: "width:100%;margin-bottom:10px;padding:10px;font-size:14px;font-weight:bold",
    });
    dialogPanel.body.appendChild(input);
    var container2 = makeEl("div", {
      style: text + ";font-weight:bold;margin:6px 0 4px",
      html: "发现的音箱：",
    });
    dialogPanel.body.appendChild(container2);
    var container3 = makeEl("div", { style: "margin:0 0 10px" });
    dialogPanel.body.appendChild(container3);
    var container4 = makeEl("div", {
      style: text + ";color:#90caf9;cursor:pointer;margin:8px 0 4px",
      html: "▶ 高级手动配置",
    });
    dialogPanel.body.appendChild(container4);
    var container5 = makeEl("div", { style: "display:none;margin:0 0 8px" });
    dialogPanel.body.appendChild(container5);
    var container6 = makeEl("div", { style: "display:flex;gap:6px;margin-bottom:8px" }),
      items = [
        ["关闭", 0],
        ["主机(左)", 1],
        ["副机(右)", 2],
      ];
    (items.forEach(function (item) {
      var input5 = makeEl("input", {
        type: "button",
        class: "btn",
        value: item[0],
        style: "flex:1;font-size:12px",
      });
      (input5.setAttribute("data-role", item[1]), container6.appendChild(input5));
    }),
      container5.appendChild(container6));
    var container7 = makeEl("div", {
      style: "display:flex;gap:6px;margin-bottom:6px;align-items:center",
    });
    container7.appendChild(makeText("对端IP:"));
    var input2 = makeEl("input", {
      type: "text",
      placeholder: "对端音箱IP",
      style: "flex:1;color:#fff;font-size:12px",
    });
    (container7.appendChild(input2), container5.appendChild(container7));
    var container8 = makeEl("div", {
      style: "display:flex;gap:6px;margin-bottom:6px;align-items:center",
    });
    container8.appendChild(makeText("远程声道:"));
    var input3 = makeEl("input", {
        type: "text",
        placeholder: "副机IP",
        style: "flex:1;color:#fff;font-size:12px",
      }),
      select = makeEl("select", {
        style: "flex:1;color:#fff;background:#333;border:1px solid #555;padding:4px",
      });
    [
      ["立体声", 0],
      ["仅左", 1],
      ["仅右", 2],
    ].forEach(function (item) {
      var option = makeEl("option", { value: item[1], html: item[0] });
      select.appendChild(option);
    });
    var input4 = makeEl("input", {
      type: "button",
      class: "btn",
      value: "设置",
      style: "font-size:12px;padding:4px 8px",
    });
    (container8.appendChild(input3),
      container8.appendChild(select),
      container8.appendChild(input4),
      container5.appendChild(container8),
      dialogPanel.body.appendChild(
        makeEl("input", {
          type: "button",
          class: "btn",
          value: "🔄 刷新",
          style: "width:100%;margin-bottom:4px;font-size:12px",
          onclick: function () {
            (sendWs({ type: "get_info" }), setTimeout(refreshGroupStatus, 600));
          },
        }),
      ),
      (container4.onclick = function () {
        var value = "none" !== container5.style.display;
        ((container5.style.display = value ? "none" : "block"),
          (container4.innerHTML = value ? "▶ 高级手动配置" : "▼ 高级手动配置"));
      }),
      (input.onclick = function () {
        showAppConfirm(
          "确定一键组队？\n本机将设为主机(左)，自动发现的音箱设为副机(右)。",
          function () {
            (dialogPanel.isOpen() &&
              document.getElementById("miplay_group_wrap") === dialogPanel.wrap &&
              ((input.value = "⏳ 组队中..."), (input.disabled = !0)),
              sendWs({ type: "Set_MiPlay_Group_Auto" }),
              setTimeout(function () {
                (dialogPanel.isOpen() &&
                  document.getElementById("miplay_group_wrap") === dialogPanel.wrap &&
                  ((input.value = "🔗 一键组队（自动发现副机）"), (input.disabled = !1)),
                  sendWs({ type: "get_info" }),
                  setTimeout(refreshGroupStatus, 600));
              }, 1500));
          },
        );
      }),
      (input4.onclick = function () {
        var text2 = input3.value.trim();
        if (text2) {
          var value = select.value;
          (sendWs({
            type: "Set_MiPlay_Remote_Channel",
            ip: text2,
            channel: parseInt(value),
          }),
            setTimeout(function () {
              showAppAlert("声道设置已发送！");
            }, 500));
        } else showAppAlert("请填写副机IP！");
      }),
      items.forEach(function (item) {
        container6.querySelectorAll("input").forEach(function (element) {
          parseInt(element.getAttribute("data-role"), 10) === item[1] &&
            (element.onclick = function () {
              var text2 = input2.value.trim();
              0 === item[1] || text2
                ? showAppConfirm("确定设置为【" + item[0] + "】？", function () {
                    (sendWs({ type: "Set_MiPlay_Group", role: item[1], peer: text2 }),
                      setTimeout(function () {
                        (sendWs({ type: "get_info" }), refreshGroupStatus());
                      }, 800));
                  })
                : showAppAlert("请先填写对端音箱IP！");
            });
        });
      }),
      sendWs({ type: "get_info" }),
      setTimeout(refreshGroupStatus, 500));
    var intervalId = setInterval(function () {
      dialogPanel.isOpen() && document.getElementById("miplay_group_wrap") === dialogPanel.wrap
        ? (sendWs({ type: "get_info" }), setTimeout(refreshGroupStatus, 300))
        : clearInterval(intervalId);
    }, 5e3);
    dialogPanel.onClose(function () {
      (clearInterval(intervalId), miPlayGroupDialog === dialogPanel && (miPlayGroupDialog = null));
    });
  }
  function refreshGroupStatus() {
    if (dialogPanel.isOpen() && document.getElementById("miplay_group_wrap") === dialogPanel.wrap) {
      var numericValue = parseInt(state.info.miplay_group_role || 0, 10),
        miplayGroupPeer = state.info.miplay_group_peer || "",
        items2 = (state.info.miplay_discovered || "").split(",").filter(function (text5) {
          return text5.trim();
        }),
        value = 2 == state.info.miplay_state;
      "" === input2.value && (input2.value = miplayGroupPeer);
      var text2 = 1 === numericValue ? "主机(左)" : 2 === numericValue ? "副机(右)" : "未启用",
        text3 = value ? "投送中" : "待机";
      if (
        ((container.innerHTML =
          "<b>当前角色：</b>" +
          text2 +
          "（" +
          text3 +
          "）" +
          (miplayGroupPeer ? " | 对端：" + miplayGroupPeer : "") +
          '<br><span style="color:#90caf9">组合后请设置本机声道：主机=仅左，副机=仅右</span>' +
          container5.querySelectorAll("input[data-role]").forEach(function (element) {
            var value2 = parseInt(element.getAttribute("data-role"), 10) === numericValue;
            (element.setAttribute("data-active", value2 ? "1" : "0"),
              (element.style.background = value2 ? "rgba(255,255,255,0.85)" : ""),
              (element.style.color = value2 ? "#1565c0" : "#fff"));
          })),
        0 === items2.length)
      )
        container3.innerHTML =
          '<span style="color:#999;font-size:12px">暂未发现其他音箱（确保对方也开启了组合功能）</span>';
      else {
        var text4 = "";
        (items2.forEach(function (text5) {
          var text6 = text5.trim();
          text4 +=
            '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;background:rgba(255,255,255,0.08);border-radius:8px;padding:6px 8px"><span style="flex:1">📡 ' +
            text6 +
            "</span><select style=\"color:#fff;background:#333;border:1px solid #555;padding:2px 4px;font-size:12px\" onchange=\"sendWs({type:'Set_MiPlay_Remote_Channel',ip:'" +
            text6 +
            '\',channel:parseInt(this.value)})"><option value="0">立体声</option><option value="1">仅左</option><option value="2">仅右</option></select></div>';
        }),
          (container3.innerHTML = text4));
      }
    }
  }
}
function createBluetoothConfigDialog(element) {
  var data = element.getAttribute("data");
  if (data) {
    var parsedData = JSON.parse(data),
      connected = element.getAttribute("Connected"),
      dialogPanel = createDialogPanel(getBluetoothDeviceTitle(parsedData), { noPadding: !0 }),
      body = dialogPanel.body;
    body.appendChild(
      makeEl("div", {
        style:
          "background:#f5f5f5;padding:10px 16px;color:#666;font-size:12px;border-bottom:1px solid #eee",
        html: "MAC：" + parsedData.Address,
      }),
    );
    var container = makeEl("div", {
      class: "dark_opts",
      style: "background:rgba(0,0,0,0.25)",
    });
    body.appendChild(container);
    var callback = function (value, value2, value3) {
      var trElement = makeEl("tr", {
        class: "span1",
        style: "color:#fff;background-color:transparent;text-shadow:none",
      });
      (value3
        ? trElement.setAttribute("none", "true")
        : (trElement.onclick = function () {
            dialogPanel.isOpen() && (dialogPanel.close(), value2.call(this));
          }),
        trElement.appendChild(makeEl("span", { html: value })),
        container.appendChild(trElement));
    };
    12 == parsedData.BondState
      ? ("true" == connected &&
          callback("断开设备", function () {
            (parsedData.A2dpConnect
              ? sendWs({ type: "BT_Disconnect_A2dp_Device", mac: parsedData.Address })
              : parsedData.A2dpSinkConnect &&
                sendWs({
                  type: "BT_Disconnect_A2dpSink_Device",
                  mac: parsedData.Address,
                }),
              sendWs({ type: "BT_Device" }));
          }),
        parsedData.A2dpSink &&
          callback("推送音频", function () {
            (sendWs({ type: "BT_Connect_A2dp_Device", mac: parsedData.Address }),
              sendWs({ type: "BT_Device" }));
          }),
        parsedData.A2dp &&
          callback("连接设备", function () {
            (sendWs({ type: "BT_Connect_A2dpSink_Device", mac: parsedData.Address }),
              sendWs({ type: "BT_Device" }));
          }),
        callback("取消配对", function () {
          (sendWs({ type: "BT_removeBond", mac: parsedData.Address }),
            sendWs({ type: "BT_Device" }));
        }))
      : parsedData.A2dpSink || parsedData.A2dp
        ? callback("配对", function () {
            (sendWs({ type: "BT_createBond", mac: parsedData.Address }),
              sendWs({ type: "BT_Device" }));
          })
        : callback("不支持连接此设备！", function () {}, !0);
  }
}
var voiceReportingSession = null,
  voiceReportingGeneration = 0,
  autoRestartSession = null,
  autoRestartGeneration = 0;
function requestVoiceTimeReporting() {
  sendToUnisound({ type: "Voice_time_reporting" });
}
function openVoiceTimeReportingPanel(value) {
  if (
    ((value = value ||
      state.voiceReportingData || {
        Time_reporting_list: [],
        Time_reporting_open: !1,
        Whole_point_prompt: "",
        Half_dot_prompt: "",
      }),
    (state.radioReportList = value.Time_reporting_list || []),
    ui.voiceReportingPanel)
  )
    ui.voiceReportingDialog.isOpen() || reopenPopupHost(ui.voiceReportingHost);
  else {
    var dialogPanel = createDialogPanel("设置语音报时");
    ((ui.voiceReportingPanel = dialogPanel.wrap),
      (ui.voiceReportingHost = dialogPanel.host),
      (ui.voiceReportingDialog = dialogPanel));
    var body = dialogPanel.body;
    ((body.style.color = "#fff"),
      body.appendChild(makeDiv("height:10px")),
      body.appendChild(
        makeEl("input", {
          type: "checkbox",
          id: "time_reporting_switch",
          onclick: function () {
            sendToUnisound({
              type: "set_Time_reporting_open",
              open: this.checked,
            });
          },
        }),
      ),
      body.appendChild(makeText("语音报时")),
      body.appendChild(
        makeEl("input", {
          type: "checkbox",
          id: "Half_an_hour_switch",
          onclick: function () {
            for (
              var checked = this.checked, index2 = 0;
              index2 < state.radioReportList.length;
              index2++
            )
              state.radioReportList[index2] > 0 &&
                (state.radioReportList[index2] = checked ? 3 : 1);
            sendToUnisound({
              type: "set_Time_reporting_list",
              list: state.radioReportList,
            });
          },
        }),
      ),
      body.appendChild(makeText("半点报时")),
      isUnisoundVer(1833) &&
        (body.appendChild(
          makeEl("input", {
            type: "checkbox",
            id: "Time_reporting_12h_switch",
            onclick: function () {
              sendToUnisound({
                type: "set_Time_reporting_12h",
                open: this.checked,
              });
            },
          }),
        ),
        body.appendChild(makeText("12小时制"))),
      body.appendChild(makeDiv("height:10px")));
    for (var index = 0; index < 24; index++)
      (index > 0 && index % 4 == 0 && body.appendChild(makeDiv("height:10px")),
        (function (value2) {
          var input = makeEl("input", {
            type: "checkbox",
            id: "time_reporting_" + value2,
          });
          ((input.onclick = function () {
            var halfAnHourSwitchElement = body.querySelector("#Half_an_hour_switch");
            ((state.radioReportList[value2] = this.checked
              ? halfAnHourSwitchElement && halfAnHourSwitchElement.checked
                ? 3
                : 1
              : 0),
              sendToUnisound({
                type: "set_Time_reporting_list",
                list: state.radioReportList,
              }));
          }),
            body.appendChild(input));
        })(index),
        body.appendChild(makeText(index + "点")));
    (body.appendChild(makeDiv("height:10px")),
      body.appendChild(makeText("整点提示：")),
      body.appendChild(
        makeEl("input", {
          type: "text",
          id: "Whole_point_prompt",
          style: "height:40px;width:150px",
        }),
      ),
      body.appendChild(
        makeButton(
          "保存",
          function () {
            if (dialogPanel.isOpen()) {
              var value2 = body.querySelector("#Whole_point_prompt").value;
              if (value2 && -1 === value2.indexOf("[hour]"))
                return showAppAlert("请添加[hour]字段！");
              sendToUnisound({ type: "set_Whole_point_prompt", prompt: value2 });
            }
          },
          { style: "padding:6px 12px;margin:2px" },
        ),
      ),
      body.appendChild(makeDiv("height:10px")),
      body.appendChild(makeText("半点提示：")),
      body.appendChild(
        makeEl("input", {
          type: "text",
          id: "Half_dot_prompt",
          style: "height:40px;width:150px",
        }),
      ),
      body.appendChild(
        makeButton(
          "保存",
          function () {
            if (dialogPanel.isOpen()) {
              var value2 = body.querySelector("#Half_dot_prompt").value;
              if (value2 && -1 === value2.indexOf("[hour]"))
                return showAppAlert("请添加[hour]字段！");
              sendToUnisound({ type: "set_Half_dot_prompt", prompt: value2 });
            }
          },
          { style: "padding:6px 12px;margin:2px" },
        ),
      ));
  }
  if (!voiceReportingSession || voiceReportingSession.dlg !== ui.voiceReportingDialog) {
    var options = {
      dlg: ui.voiceReportingDialog,
      generation: ++voiceReportingGeneration,
    };
    ((voiceReportingSession = options),
      options.dlg.onClose(function () {
        voiceReportingSession === options &&
          ((voiceReportingSession = null), voiceReportingGeneration++);
      }));
  }
  return (
    createVoiceTimeReportingPanel(value),
    requestVoiceTimeReporting(),
    ui.voiceReportingDialog
  );
}
function createVoiceTimeReportingPanel(value) {
  if (value) {
    ((state.voiceReportingData = value), (state.radioReportList = value.Time_reporting_list || []));
    var voiceReportingSession2 = voiceReportingSession;
    if (
      voiceReportingSession2 &&
      voiceReportingSession2.generation === voiceReportingGeneration &&
      voiceReportingSession2.dlg.isOpen()
    ) {
      var body = voiceReportingSession2.dlg.body;
      body.querySelector("#time_reporting_switch").checked = value.Time_reporting_open;
      for (var isEnabled = !1, index = 0; index < state.radioReportList.length; index++)
        state.radioReportList[index] > 1 && (isEnabled = !0);
      body.querySelector("#Half_an_hour_switch").checked = isEnabled;
      for (var index2 = 0; index2 < state.radioReportList.length; index2++) {
        var checkbox = body.querySelector("#time_reporting_" + index2);
        checkbox && (checkbox.checked = state.radioReportList[index2] > 0);
      }
      if (isUnisoundVer(1833)) {
        var timeReporting12hSwitchElement = body.querySelector("#Time_reporting_12h_switch");
        timeReporting12hSwitchElement &&
          (timeReporting12hSwitchElement.checked = value.Time_reporting_12h);
      }
      ((body.querySelector("#Whole_point_prompt").value = value.Whole_point_prompt),
        (body.querySelector("#Half_dot_prompt").value = value.Half_dot_prompt));
    }
  }
}
function requestAutoRestart() {
  sendWs({ type: "Auto_restart_device" });
}
function openAutoRestartPanel(value) {
  if (
    ((value = value ||
      state.autoRestartData || {
        Auto_restart_device_time: [0, 0],
        Auto_restart_device_open: !1,
      }),
    (state.autoRestartTimes = value.Auto_restart_device_time),
    ui.autoRestartPanel)
  )
    ui.autoRestartDialog.isOpen() || reopenPopupHost(ui.autoRestartHost);
  else {
    var dialogPanel = createDialogPanel("设置自动重启");
    ((ui.autoRestartPanel = dialogPanel.wrap),
      (ui.autoRestartHost = dialogPanel.host),
      (ui.autoRestartDialog = dialogPanel));
    var body = dialogPanel.body;
    ((body.style.color = "#fff"),
      body.appendChild(
        makeEl("input", {
          type: "checkbox",
          id: "Auto_restart_device_switch",
          onclick: function () {
            sendWs({
              type: "set_Auto_restart_device_open",
              open: this.checked,
            });
          },
        }),
      ),
      body.appendChild(makeText("开关")),
      body.appendChild(makeDiv("height:10px")),
      body.appendChild(makeText("每天")),
      body.appendChild(
        makeEl("input", {
          type: "time",
          id: "Auto_restart_device_time",
          onchange: function () {
            if (this.value) {
              var items = this.value.split(":");
              sendWs({
                type: "set_Auto_restart_device_time",
                times: JSON.stringify([parseInt(items[0], 10), parseInt(items[1], 10)]),
              });
            }
          },
        }),
      ),
      body.appendChild(makeText("自动重启")));
  }
  if (!autoRestartSession || autoRestartSession.dlg !== ui.autoRestartDialog) {
    var options = { dlg: ui.autoRestartDialog, generation: ++autoRestartGeneration };
    ((autoRestartSession = options),
      options.dlg.onClose(function () {
        autoRestartSession === options && ((autoRestartSession = null), autoRestartGeneration++);
      }));
  }
  return (createAutoRestartPanel(value), requestAutoRestart(), ui.autoRestartDialog);
}
function createAutoRestartPanel(value) {
  if (value) {
    ((state.autoRestartData = value), (state.autoRestartTimes = value.Auto_restart_device_time));
    var autoRestartSession2 = autoRestartSession;
    if (
      autoRestartSession2 &&
      autoRestartSession2.generation === autoRestartGeneration &&
      autoRestartSession2.dlg.isOpen()
    ) {
      var body = autoRestartSession2.dlg.body;
      body.querySelector("#Auto_restart_device_switch").checked = value.Auto_restart_device_open;
      var autoRestartTimes = state.autoRestartTimes || [0, 0];
      body.querySelector("#Auto_restart_device_time").value =
        padZero(autoRestartTimes[0], 2) + ":" + padZero(autoRestartTimes[1], 2);
    }
  }
}
function initLogin() {
  if (!ui.loginPanel) {
    ((ui.loginPanel = makeEl("div", {
      id: "login_div",
      style: "display:none",
    })),
      (ui.qrcode = makeEl("img", {
        style: "margin:10px auto;position:relative",
      })),
      (ui.qrcodeMessage = makeText("")),
      ui.loginPanel.appendChild(ui.qrcodeMessage),
      ui.loginPanel.appendChild(makeEl("div")),
      ui.loginPanel.appendChild(ui.qrcode));
    var container = makeEl("div");
    (container.appendChild(
      makeButton("刷新二维码", function () {
        updateQrcode();
      }),
    ),
      container.appendChild(
        makeButton("重启小讯", function () {
          var receiver = this;
          ((receiver.value = "重启中。。。"),
            runShell("/system/bin/am force-stop com.phicomm.speaker.device"),
            setTimeout(function () {
              (runShell("/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity"),
                setTimeout(function () {
                  ((receiver.value = "重启小讯"), showAppAlert("重启完毕！"));
                }, 1e4));
            }, 3e3));
        }),
      ),
      container.appendChild(
        makeButton(
          "校准音箱时间",
          function () {
            var receiver = this;
            ((receiver.value = "正在校准。。。"),
              setTimeout(function () {
                receiver.value = "校准音箱时间";
              }, 2e3),
              runShell(
                "settings put global auto_time 0 & sleep 1 & settings put global ntp_server ntp1.aliyun.com & settings put global auto_time 1",
                "set_date",
              ));
          },
          { id: "rtime" },
        ),
      ),
      ui.loginPanel.appendChild(container),
      ui.loginPanel.appendChild(makeDiv("height:10px")));
  }
}
function showDisconnectedActions(value) {
  var customIpPageElement = $("#custom_ip_page");
  if (customIpPageElement && "none" !== customIpPageElement.style.display)
    hideDisconnectedActions();
  else {
    var disconnectedActions = ui.disconnectedActions;
    if (!disconnectedActions) {
      (disconnectedActions = ui.disconnectedActions =
        makeEl("div", {
          id: "connection_actions",
          style: "text-align:center;margin:20px auto;max-width:440px",
        })).appendChild(
        makeEl("div", {
          text: "连接已取消，可重新连接音箱或刷新页面。",
          style: "color:#fff;font-size:14px;margin-bottom:15px",
        }),
      );
      var container = makeEl("div", {
        class: "app_flow_actions",
        style: "display:flex;gap:10px",
      });
      (container.appendChild(
        makeFlowButton("重新连接", function () {
          disconnectedActions === ui.disconnectedActions &&
            "none" !== disconnectedActions.style.display &&
            (hideDisconnectedActions(), disconnectedActions._retry());
        }),
      ),
        container.appendChild(
          makeFlowButton("刷新页面", function () {
            location.reload();
          }),
        ),
        disconnectedActions.appendChild(container));
    }
    ((disconnectedActions._retry = value),
      ui.container &&
        disconnectedActions.parentNode !== ui.container &&
        ui.container.appendChild(disconnectedActions),
      (disconnectedActions.style.display = "block"));
  }
}
function hideDisconnectedActions() {
  ui.disconnectedActions && (ui.disconnectedActions.style.display = "none");
}
function unhideLogin(value) {
  if ((clearLoginFlowNotices(), loginSessionCurrent(state.loginSession)))
    return (invalidateLoginIntent(), void resumeLoginConnection());
  if (!loginIntentCurrent(state.loginIntent)) {
    (invalidateLoginIntent(),
      initLogin(),
      stopQrStateRefresh(),
      removeEl($("#login_selection_div")));
    for (
      var pwdLoginDivElement = $$("#pwd_login_div"), index = 0;
      index < pwdLoginDivElement.length;
      index++
    )
      removeEl(pwdLoginDivElement[index]);
    if (
      (ui.qrcode &&
        ui.qrcode.parentNode !== ui.loginPanel &&
        (ui.loginPanel &&
          ui.loginPanel.parentNode &&
          ui.loginPanel.parentNode.removeChild(ui.loginPanel),
        (ui.loginPanel = null),
        initLogin(),
        ui.container && ui.container.appendChild(ui.loginPanel)),
      "kuwo" === state.loginApp)
    ) {
      (hideDisconnectedActions(),
        (state.loginSession = {
          app: "kuwo",
          device: loginDeviceKey(),
          stage: "choose",
        }),
        hideAllPages(),
        stopInfoRefresh(),
        ui.switchButtons && (ui.switchButtons.style.display = "none"));
      var loginSelectionDivElement = makeEl("div", {
        id: "login_selection_div",
        style: "text-align:center",
      });
      return (
        ui.container.appendChild(loginSelectionDivElement),
        loginSelectionDivElement.appendChild(makeEl("h3", { html: "登录酷我音乐" })),
        loginSelectionDivElement.appendChild(
          makeButton("QQ登录", function () {
            (hideLogin(), (state.loginApp = "kuwo_qq"), unhideLogin());
          }),
        ),
        void loginSelectionDivElement.appendChild(
          makeButton("密码登录", function () {
            (hideLogin(), (state.loginApp = "kuwo_pwd"), unhideLogin());
          }),
        )
      );
    }
    var text =
      "speaker" === state.loginMode && "qqmusic" === state.loginApp
        ? "音箱尚未登录，本次将使用手机QQ扫码登录音箱账号，是否继续？"
        : {
            qqmusic: "本次登录将会使用QQ互联登录您的QQ音乐账号，是否继续？",
            netease: "本次登录将会使用QQ互联登录您的网易云音乐账号，是否继续？",
            kuwo_qq: "本次登录将会使用QQ互联登录您的酷我音乐账号，是否继续？",
            kuwo_pwd: "本次将会登录您的酷我音乐账号，是否继续？",
          }[state.loginApp];
    if (text) {
      value && (text = value + "\n\n" + text);
      var options = {
        app: state.loginApp,
        mode: state.loginMode,
        device: loginDeviceKey(),
        dialog: null,
      };
      state.loginIntent = options;
      var value2 = showAppConfirm(
        text,
        function () {
          if (loginIntentCurrent(options)) {
            if (
              ((state.loginIntent = null),
              clearLoginFlowNotices(),
              hideDisconnectedActions(),
              hideAllPages(),
              stopInfoRefresh(),
              ui.switchButtons && (ui.switchButtons.style.display = "none"),
              "kuwo_pwd" === state.loginApp)
            )
              return (
                (state.loginSession = {
                  app: state.loginApp,
                  device: loginDeviceKey(),
                  stage: "password",
                }),
                setPageTitle("酷我音乐登录页面"),
                void buildPasswordLogin()
              );
            (setPageTitle("R1音箱登录页面"),
              ui.loginPanel &&
                !ui.loginPanel.parentNode &&
                ui.container &&
                ui.container.appendChild(ui.loginPanel),
              (ui.loginPanel.style.display = "block"),
              loadQrcode());
          }
        },
        {
          onCancel: function () {
            loginIntentCurrent(options) &&
              ((state.loginIntent = null),
              hideLogin(),
              clearQrCache(),
              clearTimeout(timers.connect),
              (timers.connect = -1),
              hideAllPages(),
              stopInfoRefresh(),
              ui.switchButtons && (ui.switchButtons.style.display = "none"),
              showDisconnectedActions(connectSpeaker),
              state.ws && state.ws.close());
          },
        },
      );
      state.loginIntent === options && (options.dialog = value2);
    }
  }
}
function buildPasswordLogin() {
  var pwdLoginDivElement = makeEl("div", { id: "pwd_login_div" });
  (pwdLoginDivElement.appendChild(ui.qrcodeMessage), pwdLoginDivElement.appendChild(makeEl("div")));
  var container = makeEl("div");
  (pwdLoginDivElement.appendChild(container),
    pwdLoginDivElement.appendChild(ui.qrcode),
    ui.container.appendChild(pwdLoginDivElement),
    (ui.qrcodeMessage.innerHTML = "<h3>登录酷我音乐</h3><h3></h3>"),
    container.appendChild(makeText("账号：")));
  var usernameElement = makeEl("input", { type: "text", id: "username", className: "input" });
  (container.appendChild(usernameElement),
    container.appendChild(makeEl("div")),
    container.appendChild(makeText("密码：")));
  var passwordElement = makeEl("input", {
    type: "password",
    id: "password",
    className: "input",
  });
  (container.appendChild(passwordElement),
    container.appendChild(makeEl("div")),
    container.appendChild(
      makeButton(
        "登录",
        function () {
          var loginSession = state.loginSession;
          loginSessionCurrent(loginSession) &&
            loginConnected() &&
            ((this.disabled = !0),
            (this.value = "登录中。。。"),
            queueLoginRequest(
              loginSession,
              {
                type: "login_kuwo",
                username: usernameElement.value,
                password: passwordElement.value,
              },
              "auth",
            ));
        },
        { id: "pwd_login_btn" },
      ),
    ));
}
function loginDeviceKey() {
  return state.ip || state.hostname || location.host;
}
function loginConnected() {
  return state.ws && state.ws.readyState === WebSocket.OPEN;
}
function loginSessionCurrent(value) {
  return (
    !!value &&
    value === state.loginSession &&
    value.app === state.loginApp &&
    value.device === loginDeviceKey()
  );
}
function loginIntentCurrent(value) {
  return (
    !!value &&
    value === state.loginIntent &&
    value.app === state.loginApp &&
    value.mode === state.loginMode &&
    value.device === loginDeviceKey()
  );
}
function loginFlowActive() {
  return loginIntentCurrent(state.loginIntent) || loginSessionCurrent(state.loginSession);
}
function invalidateLoginIntent() {
  var loginIntent = state.loginIntent;
  ((state.loginIntent = null), loginIntent && loginIntent.dialog && loginIntent.dialog.close(!0));
}
function clearLoginFlowNotices() {
  (clearFlowNotice("connection"),
    clearFlowNotice("unisound"),
    showRebootEchoButton(!1),
    (state.reload = !1));
}
function clearQrCache() {
  try {
    for (
      var items = ["qrcode_state", "qrcode_data", "qrcode_app", "qrcode_cache"], index = 0;
      index < items.length;
      index++
    )
      localStorage.removeItem(items[index]);
  } catch (error) {}
}
function setLoginMessage(value, value2) {
  if (ui.qrcodeMessage) {
    var elementsByTagName = ui.qrcodeMessage.getElementsByTagName("h3");
    elementsByTagName[null == value2 ? 1 : value2] &&
      (elementsByTagName[null == value2 ? 1 : value2].innerText = value);
  }
}
function clearLoginTimers() {
  (stopQrStateRefresh(),
    clearTimeout(timers.qrLoad),
    (timers.qrLoad = -1),
    clearTimeout(timers.login),
    (timers.login = -1),
    clearTimeout(timers.loginResult),
    (timers.loginResult = -1));
}
function hideLogin() {
  invalidateLoginIntent();
  var loginSession = state.loginSession;
  (loginSession &&
    loginSession.restartPending &&
    ((state.loginRecoveryDevice = loginSession.device),
    (loginSession.restartPending = !1),
    recoverLoginService()),
    clearLoginTimers(),
    (state.loginSession = null),
    (state.qrLoaded = !1),
    ui.qrcode && ((ui.qrcode.onload = null), (ui.qrcode.onerror = null), (ui.qrcode.qrsig = "")),
    ui.loginPanel && (ui.loginPanel.style.display = "none"),
    removeEl($("#login_selection_div")));
  for (
    var pwdLoginDivElement = $$("#pwd_login_div"), index = 0;
    index < pwdLoginDivElement.length;
    index++
  )
    removeEl(pwdLoginDivElement[index]);
  ui.switchButtons && (ui.switchButtons.style.display = "");
}
function loadQrcode() {
  var options = { qqmusic: 100497308, netease: 100495085, kuwo_qq: 100243533 };
  state.loginParams.pt_3rd_aid = options[state.loginApp] || options.qqmusic;
  var message = null;
  try {
    message = JSON.parse(localStorage.getItem("qrcode_cache"));
  } catch (error) {}
  (clearQrCache(),
    message &&
    message.app === state.loginApp &&
    message.device === loginDeviceKey() &&
    "number" == typeof message.time &&
    Date.now() >= message.time &&
    Date.now() - message.time < 12e4 &&
    validQrData(message.data)
      ? (beginQrSession(), updateQrCodeData(message.data, message.time))
      : updateQrcode());
}
function beginQrSession() {
  return (
    clearLoginTimers(),
    (state.loginSession = {
      app: state.loginApp,
      device: loginDeviceKey(),
      stage: "loading",
    }),
    (state.qrState = 0),
    (state.qrLoaded = !1),
    (state.qrUpdateTime = -1),
    (state.qrLastUpdateTime = -1),
    (ui.qrcode.onload = null),
    (ui.qrcode.onerror = null),
    (ui.qrcode.qrsig = ""),
    ui.qrcode.removeAttribute("src"),
    (ui.qrcode.style.cssText = "margin:10px auto;position:relative"),
    (ui.qrcodeMessage.innerHTML =
      "<h3>正在加载二维码，请稍候。。。<br>提示：第一次加载二维码会比较慢，请耐心等待！</h3><h3></h3>"),
    state.loginSession
  );
}
function updateQrcode() {
  if (
    (!loginSessionCurrent(state.loginSession) || "done" !== state.loginSession.stage) &&
    ui.qrcode &&
    ui.loginPanel &&
    "none" !== ui.loginPanel.style.display
  ) {
    clearQrCache();
    var options = { qqmusic: 100497308, netease: 100495085, kuwo_qq: 100243533 };
    ((state.loginParams.pt_3rd_aid = options[state.loginApp] || options.qqmusic),
      beginQrSession(),
      requestQrcode(state.loginSession));
  }
}
function requestQrcode(value) {
  loginSessionCurrent(value) &&
    (loginConnected()
      ? ((value.stage = "loading"),
        clearTimeout(timers.qrLoad),
        (timers.qrLoad = setTimeout(function () {
          loginSessionCurrent(value) &&
            "loading" === value.stage &&
            ((value.stage = "error"),
            clearQrCache(),
            setLoginMessage(
              "二维码加载超时，请点击刷新二维码！音箱时间：" +
                (state.deviceDate
                  ? formatUnixTime(parseInt(state.deviceDate.getTime() / 1e3, 10))
                  : ""),
              0,
            ));
        }, 3e4)),
        sendToUnisound({ type: "get_qrcode", login_param: state.loginParams }))
      : setLoginMessage("连接已断开，恢复连接后将重新获取二维码", 0));
}
function validQrData(value) {
  return !!(
    value &&
    "string" == typeof value.image &&
    value.image &&
    value.cookies &&
    "string" == typeof value.cookies.qrsig &&
    value.cookies.qrsig
  );
}
function loginReplyMatches(value, value2) {
  if (!loginSessionCurrent(value2) || !value) return !1;
  if (value.qrcode_app && value.qrcode_app !== value2.app) return !1;
  if (value.login_param && value.login_param.pt_3rd_aid != state.loginParams.pt_3rd_aid) return !1;
  var qrsig = value.qrsig || (value.cookies && value.cookies.qrsig);
  return !qrsig || !ui.qrcode.qrsig || qrsig === ui.qrcode.qrsig;
}
function startQrStateRefresh() {
  stopQrStateRefresh();
  var loginSession = state.loginSession;
  if (
    loginSessionCurrent(loginSession) &&
    "polling" === loginSession.stage &&
    ui.qrcode.qrsig &&
    loginConnected()
  ) {
    setLoginMessage("等待二维码状态返回。。。");
    var callback = function () {
      if (
        loginSessionCurrent(loginSession) &&
        "polling" === loginSession.stage &&
        loginConnected()
      ) {
        var pollStarted = state.qrUpdateTime < 0 ? loginSession.pollStarted : state.qrUpdateTime;
        (Date.now() - pollStarted >= 15e3 &&
          setLoginMessage("二维码状态暂未返回，正在重试；可点击刷新二维码"),
          (state.qrLastUpdateTime = Date.now()),
          sendToUnisound({
            type: "qrcode_state",
            qrsig: ui.qrcode.qrsig,
            login_param: state.loginParams,
          }));
      }
    };
    (callback(), (timers.qrState = setInterval(callback, 2e3)));
  }
}
function stopQrStateRefresh() {
  (clearInterval(timers.qrState), (timers.qrState = -1));
}
function updateQrCodeData(value, value2) {
  var loginSession = state.loginSession;
  if (
    loginSessionCurrent(loginSession) &&
    "loading" === loginSession.stage &&
    loginReplyMatches(value, loginSession)
  )
    if (validQrData(value)) {
      (clearTimeout(timers.qrLoad),
        (timers.qrLoad = -1),
        (loginSession.stage = "polling"),
        (loginSession.pollStarted = Date.now()),
        (state.qrState = 0),
        (state.qrLoaded = !0),
        (ui.qrcode.style.cssText = "margin:10px auto;position:relative"),
        (ui.qrcode.qrsig = value.cookies.qrsig),
        (ui.qrcode.onerror = function () {
          loginSessionCurrent(loginSession) &&
            "polling" === loginSession.stage &&
            setLoginMessage("二维码图片加载失败，请点击刷新二维码", 0);
        }),
        setLoginMessage(
          "请使用手机QQ扫码" + ("speaker" === state.loginMode ? "登录音箱账号！" : "登录！"),
          0,
        ),
        (ui.qrcode.src = value.image));
      try {
        localStorage.setItem(
          "qrcode_cache",
          JSON.stringify({
            app: loginSession.app,
            device: loginSession.device,
            time: value2 || Date.now(),
            data: value,
          }),
        );
      } catch (error) {}
      startQrStateRefresh();
    } else setLoginMessage("二维码返回数据异常，请刷新二维码", 0);
}
function queueLoginRequest(value, value2, value3) {
  loginSessionCurrent(value) &&
    ((value.request = value2),
    (value.nextStage = value3),
    (value.stage = "pending"),
    clearTimeout(timers.login),
    (timers.login = setTimeout(function () {
      flushLoginRequest(value);
    }, 1e3)));
}
function flushLoginRequest(value) {
  if (loginSessionCurrent(value) && "pending" === value.stage && value.request)
    if (loginConnected()) {
      var request = value.request;
      ((value.request = null),
        (value.stage = value.nextStage),
        setLoginMessage(
          "submit" === value.stage ? "正在提交登录数据。。。" : "正在登录，请稍候。。。",
        ),
        sendToUnisound(request),
        watchLoginResult(value));
    } else setLoginMessage("连接已断开，恢复连接后继续提交登录");
}
function watchLoginResult(value) {
  (clearTimeout(timers.loginResult),
    (timers.loginResult = setTimeout(function () {
      !loginSessionCurrent(value) ||
        ("auth" !== value.stage && "submit" !== value.stage) ||
        ("kuwo_pwd" !== value.app
          ? setLoginMessage("登录结果暂未返回，请等待；若长时间无响应，请刷新二维码后重试")
          : loginFailed(value, "登录结果暂未返回，可手动重试密码登录"));
    }, 3e4)));
}
function pauseLoginConnection() {
  return (
    !!loginSessionCurrent(state.loginSession) &&
    (clearLoginTimers(), setLoginMessage("连接已断开，恢复连接后继续登录"), !0)
  );
}
function recoverLoginService() {
  state.loginRecoveryDevice &&
    state.loginRecoveryDevice === loginDeviceKey() &&
    loginConnected() &&
    ((state.loginRecoveryDevice = null),
    runShell("/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity"));
}
function resumeLoginConnection() {
  recoverLoginService();
  var loginSession = state.loginSession;
  return (
    !!loginSessionCurrent(loginSession) &&
    (setPageTitle("R1音箱登录页面"),
    "loading" === loginSession.stage
      ? requestQrcode(loginSession)
      : "polling" === loginSession.stage
        ? startQrStateRefresh()
        : "pending" === loginSession.stage
          ? flushLoginRequest(loginSession)
          : "done" === loginSession.stage
            ? "music" === state.loginMode && "qqmusic" !== loginSession.app
              ? restartMusicLogin(loginSession)
              : sendToUnisound({ type: "login_state" })
            : ("auth" !== loginSession.stage && "submit" !== loginSession.stage) ||
              (setLoginMessage("连接已恢复，等待登录结果；如无响应请刷新二维码重试"),
              sendToUnisound({ type: "login_state" }),
              watchLoginResult(loginSession)),
    !0)
  );
}
function updateQrState(value) {
  var loginSession = state.loginSession;
  if (
    loginSessionCurrent(loginSession) &&
    "polling" === loginSession.stage &&
    loginReplyMatches(value, loginSession)
  ) {
    var value2 = value && value.qrcode_state,
      value22 = value2 && value2[value2.call];
    if (value2 && Array.isArray(value22) && null != value2.code) {
      state.qrUpdateTime = Date.now();
      var value22Item = value22[4] || "";
      if (66 != value2.code && 67 != value2.code && 0 != value2.code)
        return (
          stopQrStateRefresh(),
          (loginSession.stage = "error"),
          (state.qrLoaded = !1),
          clearQrCache(),
          void setLoginMessage(value22Item || "二维码已失效，请刷新二维码")
        );
      if (0 == value2.code) {
        var location2 = value2.location && value2.location.cookies;
        if (!location2 || "string" != typeof location2.p_uin)
          return void setLoginMessage("扫码结果缺少账号信息，正在重新查询");
        (stopQrStateRefresh(), (state.qrState = 1), clearQrCache());
        var qQNumber = parseQQNumber(location2.p_uin);
        (setLoginMessage("扫码登录QQ：" + (value22[5] || "") + "(" + qQNumber + ")", 0),
          (ui.qrcode.onerror = null),
          (ui.qrcode.style.cssText =
            "margin:10px auto;position:relative;border-radius:100%;height:120px"),
          (ui.qrcode.src =
            "https://q1.qlogo.cn/g?b=qq&nk=" + encodeURIComponent(qQNumber) + "&s=100"));
        (queueLoginRequest(
          loginSession,
          {
            type: {
              qqmusic: "login",
              netease: "login_netease_music",
              kuwo_qq: "login_kuwo_music",
            }[loginSession.app],
            qrcode_state: value2,
          },
          "auth",
        ),
          (value22Item = "正在查询用户信息，请稍候。。。"));
      }
      setLoginMessage(value22Item);
    }
  }
}
function parseQQNumber(text) {
  text = text.substr(1);
  for (var index = 0; index < text.length; index++) if (0 != text[index]) return text.substr(index);
  return text;
}
function loginFailed(value, value2) {
  if (loginSessionCurrent(value)) {
    (clearLoginTimers(),
      clearQrCache(),
      (value.stage = "kuwo_pwd" === value.app ? "password" : "error"),
      (value.request = null));
    var pwdLoginBtnElement = $("#pwd_login_btn");
    ("kuwo_pwd" === value.app &&
      pwdLoginBtnElement &&
      ((pwdLoginBtnElement.disabled = !1), (pwdLoginBtnElement.value = "登录")),
      (state.qrLoaded = !1),
      setLoginMessage(value2));
  }
}
function handleQQLogin(value) {
  var loginSession = state.loginSession;
  loginSessionCurrent(loginSession) &&
    "qqmusic" === loginSession.app &&
    "auth" === loginSession.stage &&
    (clearTimeout(timers.loginResult),
    1 == value.code && 1 == value.login_state
      ? ((loginSession.stage = "done"),
        clearQrCache(),
        sendToUnisound({ type: "login_state" }),
        showAppAlert("登录成功,欢迎" + value.nick + "[" + value.userid + "]"))
      : loginFailed(
          loginSession,
          value.login_msg || value.msg || "音箱账号登录失败，请刷新二维码后重试",
        ));
}
function finishMusicLogin(value, value2) {
  loginSessionCurrent(value) &&
    "submit" === value.stage &&
    (clearTimeout(timers.loginResult),
    200 == value2.code
      ? ((value.stage = "done"),
        (value.restartPending = !0),
        clearQrCache(),
        setLoginMessage("数据已提交，正在重启小讯。。。"),
        runShell("/system/bin/am force-stop com.phicomm.speaker.device"),
        (timers.login = setTimeout(function () {
          restartMusicLogin(value);
        }, 3e3)))
      : loginFailed(value, "数据提交失败！" + (value2.msg || "请刷新二维码后重试")));
}
function restartMusicLogin(value) {
  loginSessionCurrent(value) &&
    "done" === value.stage &&
    loginConnected() &&
    (value.restartPending &&
      ((value.restartPending = !1),
      runShell("/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity"),
      sendAction(65536, 3, 0, '{"type":"login_state","code":1,"login_state":"0"}')),
    (timers.login = setTimeout(function () {
      loginSessionCurrent(value) && location.reload();
    }, 1e3)));
}
function handleNeteaseLogin(message, value) {
  var loginSession = state.loginSession;
  if (loginSessionCurrent(loginSession) && "netease" === loginSession.app)
    if (1 !== value) {
      if ("auth" === loginSession.stage)
        if (
          (clearTimeout(timers.loginResult),
          1 == message.code && message.data && 200 == message.data.code && message.data.profile)
        ) {
          var profile = message.data.profile;
          (profile.avatarUrl && (ui.qrcode.src = profile.avatarUrl),
            setLoginMessage(
              "网易云音乐登录成功！用户：" +
                profile.nickname +
                "[" +
                profile.userId +
                "]，正在提交登录数据。。。",
            ),
            queueLoginRequest(
              loginSession,
              {
                type: "api",
                data: { type: "login_netease_music", data: message.data },
              },
              "submit",
            ));
        } else
          loginFailed(loginSession, "网易云音乐登录失败！" + (message.msg || "请刷新二维码后重试"));
    } else finishMusicLogin(loginSession, message);
}
function handleKuwoLogin(message, value) {
  var loginSession = state.loginSession;
  if (
    loginSessionCurrent(loginSession) &&
    ("kuwo_qq" === loginSession.app || "kuwo_pwd" === loginSession.app)
  )
    if (1 !== value) {
      if ("auth" === loginSession.stage)
        if (
          (clearTimeout(timers.loginResult),
          1 == message.code &&
            message.data &&
            "succ" === message.data.result &&
            message.data.userInfo)
        ) {
          var userInfo = message.data.userInfo;
          (userInfo.pic && (ui.qrcode.src = userInfo.pic),
            setLoginMessage(
              "酷我音乐登录成功！用户：" +
                userInfo.nickName +
                "[" +
                userInfo.uid +
                "]，正在提交登录数据。。。",
            ),
            queueLoginRequest(
              loginSession,
              { type: "api", data: { type: "login_kuwo_music", data: message.data } },
              "submit",
            ));
        } else loginFailed(loginSession, "酷我音乐登录失败！" + (message.msg || "请重试"));
    } else finishMusicLogin(loginSession, message);
}
function unisoundNoticeCurrent(value, value2) {
  return (
    !!value &&
    value === ui.flowNotice &&
    !!value.host.parentNode &&
    value2 === state.ws &&
    loginConnected()
  );
}
function readDeviceInfoResponse(message) {
  if (!message || "get_info" !== message.type || 200 !== message.code) return null;
  var parsedData;
  try {
    parsedData = JSON.parse(message.data);
  } catch (error) {
    return null;
  }
  return parsedData && "object" == typeof parsedData && !Array.isArray(parsedData)
    ? parsedData
    : null;
}
function checkUnisoundSkip(value, value2, input) {
  if (!(
    !unisoundNoticeCurrent(value, value2) ||
    (state.unisoundSkipCheck && state.unisoundSkipCheck.pending)
  )) {
    (clearTimeout(timers.loginState),
      clearTimeout(timers.unisoundInitBackup),
      (timers.loginState = timers.unisoundInitBackup = -1));
    var offsetWidth = value.panel.offsetWidth;
    (offsetWidth > 0 &&
      value.panel.parentNode.style.setProperty("width", offsetWidth + "px", "important"),
      (input.disabled = !0),
      (input.value = "跳过等待"),
      (value.message.textContent = "已发送跳过指令，等待音箱同步状态后检查，请稍候。"),
      (state.unisoundSkipSequence = (state.unisoundSkipSequence || 0) + 1));
    var options = (state.unisoundSkipCheck = {
      notice: value,
      socket: value2,
      button: input,
      pending: !0,
      id: "unisound_skip_" + Date.now() + "_" + state.unisoundSkipSequence,
    });
    options.timer = setTimeout(function () {
      ((options.timer = null),
        state.unisoundSkipCheck === options &&
          unisoundNoticeCurrent(value, value2) &&
          ((value.message.textContent = "正在检查音箱初始化状态，请稍候。"),
          sendWs(
            { type: "get_info", type_id: options.id },
            function (value3) {
              if (state.unisoundSkipCheck === options && unisoundNoticeCurrent(value, value2)) {
                if (
                  ((options.pending = !1),
                  !(value3 && value3.type_id === options.id
                    ? readDeviceInfoResponse(value3)
                    : null))
                )
                  return (
                    (input.disabled = !1),
                    (input.value = "重试跳过"),
                    void (value.message.textContent =
                      value3 && "login_state" === value3.type
                        ? "音箱仍未通过初始化，请稍候或重试跳过。"
                        : "检查初始化状态失败，请重试跳过。")
                  );
                ((state.unisoundSkipCheck = null),
                  (state.reload = !1),
                  clearFlowNotice("unisound"),
                  handleMessage(value3),
                  state.initState || state.initState1 || startInfoRefresh());
              }
            },
            6e3,
          )));
    }, 1e3);
  }
}
function handleLoginState(value) {
  if ((clearTimeout(timers.loginState), (timers.loginState = -1), 1 == value.code)) {
    var unisoundSkipCheck = state.unisoundSkipCheck;
    if (
      !unisoundSkipCheck ||
      !unisoundNoticeCurrent(unisoundSkipCheck.notice, unisoundSkipCheck.socket) ||
      (0 != value.login_state && 1 != value.login_state)
    ) {
      1 == value.login_state && clearFlowNotice("unisound");
      var loginSession = state.loginSession;
      if (loginSessionCurrent(loginSession) && "music" === state.loginMode)
        "qqmusic" === loginSession.app &&
          "done" === loginSession.stage &&
          1 == value.login_state &&
          (hideLogin(), clearQrCache(), location.reload());
      else if (!loginFlowActive() || 1 == value.login_state)
        if (0 == value.login_state) {
          (clearTimeout(timers.unisoundInit),
            (timers.unisoundInit = -1),
            runShell("/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity"));
          var value2 = showFlowNotice(
              "unisound",
              "小讯初始化",
              "等待小讯初始化。。。(请确保您当前安装的new_Unisound版本是1.8或以上！)",
            ),
            socket = state.ws;
          if (
            ((value2.phase = "initializing"),
            (value2.socket = socket),
            !value2.actions.querySelector("#Skip_Waiting"))
          ) {
            var element = makeFlowButton("跳过等待", function () {
              unisoundNoticeCurrent(value2, socket) &&
                !this.disabled &&
                (sendAction(65536, 3, 0, '{"type":"login_state","code":1,"login_state":"1"}'),
                checkUnisoundSkip(value2, socket, this));
            });
            ((element.id = "Skip_Waiting"),
              (element.style.background = "var(--primary-blue)"),
              value2.actions.appendChild(element));
          }
          ((timers.loginState = setTimeout(function () {
            unisoundNoticeCurrent(value2, socket) && sendWs({ type: "get_info" });
          }, 1e3)),
            -1 === timers.unisoundInitBackup &&
              (timers.unisoundInitBackup = setTimeout(function () {
                unisoundNoticeCurrent(value2, socket) &&
                  ((state.reload = !0), addRecoveryButtons(value2.actions));
              }, 6e3)));
        } else if (1 == value.login_state) {
          var isEnabled = !state.initState;
          if ((loginSession && 1 === state.qrState && clearQrCache(), hideLogin(), isEnabled))
            return void location.reload();
          (unhideIndex(), sendWs({ type: "get_info" }));
        } else if (-4 == value.login_state) {
          (clearTimeout(timers.unisoundInit),
            clearTimeout(timers.unisoundInitBackup),
            (timers.unisoundInit = -1),
            (timers.unisoundInitBackup = -1));
          var value3 = updatePingStatus(value),
            socket2 = state.ws;
          ((timers.loginState = setTimeout(function () {
            unisoundNoticeCurrent(value3, socket2) && sendToUnisound({ type: "login_state" });
          }, 1e3)),
            addRtimeButton(value3.actions));
        } else {
          if (
            (clearTimeout(timers.unisoundInit),
            clearTimeout(timers.unisoundInitBackup),
            (timers.unisoundInit = -1),
            (timers.unisoundInitBackup = -1),
            String(value.login_msg || "").indexOf("授权") > -1)
          )
            return void addRecoveryButtons(
              showFlowNotice("unisound", "小讯授权失败", value.login_msg).actions,
              !0,
            );
          if (loginSessionCurrent(loginSession)) return;
          (clearFlowNotice("unisound"),
            (state.loginMode = "speaker"),
            (state.loginApp = "qqmusic"),
            unhideLogin(value.login_msg));
        }
    }
  }
}
function updatePingStatus(value) {
  var text = String(state.pingTime).substring(0, 10),
    value2 =
      1 == state.pingResult
        ? "成功(" + text + ")"
        : 0 == state.pingResult
          ? "失败(" + text + ")"
          : "等待(" + text + ")",
    unixTimeText = state.deviceDate
      ? formatUnixTime(parseInt(state.deviceDate.getTime() / 1e3, 10))
      : "",
    value3 = showFlowNotice(
      "unisound",
      "音箱时间校准",
      (value.login_msg || "请校准音箱时间") +
        "\n音箱时间：" +
        unixTimeText +
        "\n测试PING授权服务器：" +
        value2,
    );
  return (runShell("date & ping -w 1 r1service.wxfsq.com", "ping_r1service"), value3);
}
function addRtimeButton(element) {
  var flowNotice = ui.flowNotice,
    socket = state.ws;
  unisoundNoticeCurrent(flowNotice, socket) &&
    element === flowNotice.actions &&
    !element.querySelector("#rtime") &&
    element.appendChild(
      makeFlowButton(
        "校准音箱时间",
        function () {
          if (unisoundNoticeCurrent(flowNotice, socket)) {
            var receiver = this;
            ((receiver.value = "正在校准。。。"),
              setTimeout(function () {
                unisoundNoticeCurrent(flowNotice, socket) &&
                  receiver.parentNode === element &&
                  (receiver.value = "校准音箱时间");
              }, 2e3),
              runShell(
                "settings put global auto_time 0 & sleep 1 & settings put global ntp_server ntp1.aliyun.com & settings put global auto_time 1",
                "set_date",
              ));
          }
        },
        { id: "rtime" },
      ),
    );
}
function addRecoveryButtons(element, value) {
  var flowNotice = ui.flowNotice,
    socket = state.ws;
  unisoundNoticeCurrent(flowNotice, socket) &&
    element === flowNotice.actions &&
    (value && (flowNotice.recoveryLoginState = !0),
    element.querySelector("#unisound_restart") ||
      element.appendChild(
        makeFlowButton(
          "重启小讯",
          function () {
            if (unisoundNoticeCurrent(flowNotice, socket)) {
              ((state.unisoundSkipCheck = null), (this.value = "重启中。。。"));
              var value2 = showFlowNotice("unisound", "重启小讯", "重启中。。。");
              (runShell("/system/bin/am force-stop com.phicomm.speaker.device"),
                setTimeout(function () {
                  socket === state.ws &&
                    loginConnected() &&
                    (runShell("/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity"),
                    unisoundNoticeCurrent(value2, socket) &&
                      (flowNotice.recoveryLoginState &&
                        sendAction(
                          65536,
                          3,
                          0,
                          '{"type":"login_state","code":1,"login_state":"0"}',
                        ),
                      setTimeout(function () {
                        unisoundNoticeCurrent(value2, socket) &&
                          (showFlowNotice(
                            "unisound",
                            "小讯初始化",
                            "等待小讯初始化。。。(请确保您当前安装的new_Unisound版本是1.8或以上！)",
                          ),
                          showAppAlert("重启完毕！"),
                          location.reload());
                      }, 1e4)));
                }, 3e3));
            }
          },
          { id: "unisound_restart" },
        ),
      ),
    element.querySelector("#speaker_restart") ||
      element.appendChild(
        makeFlowButton(
          "重启音箱",
          function () {
            if (unisoundNoticeCurrent(flowNotice, socket)) {
              this.value = "重启中。。。";
              var value2 = showFlowNotice("unisound", "重启音箱", "重启中。。。");
              (runShell("stop adbd&&start adbd&&adb reboot"),
                setTimeout(function () {
                  unisoundNoticeCurrent(value2, socket) &&
                    (showAppAlert("重启完毕！"), location.reload());
                }, 1e4));
            }
          },
          { id: "speaker_restart" },
        ),
      ),
    addRtimeButton(element));
}
function handleUnisoundMessage(message) {
  var parsedData;
  try {
    parsedData = JSON.parse(message.data.data);
  } catch (error) {
    return;
  }
  if (parsedData) {
    var type = parsedData.type;
    if ("get_qrcode" !== type)
      if ("qrcode_state" !== type)
        if ("login" !== type)
          if ("login_netease_music" !== type)
            if ("login_kuwo_music" !== type)
              if ("api" !== type) {
                if ("login_kuwo" === type) {
                  var loginSession = state.loginSession,
                    pwdLoginBtnElement = $("#pwd_login_btn");
                  if (
                    !pwdLoginBtnElement ||
                    !loginSessionCurrent(loginSession) ||
                    "kuwo_pwd" !== loginSession.app ||
                    "auth" !== loginSession.stage
                  )
                    return;
                  return 1 == parsedData.code &&
                    parsedData.data &&
                    "succ" === parsedData.data.result
                    ? void handleKuwoLogin(parsedData, 0)
                    : (clearTimeout(timers.loginResult),
                      (loginSession.stage = "password"),
                      (pwdLoginBtnElement.disabled = !1),
                      (pwdLoginBtnElement.value = "登录"),
                      void setLoginMessage(
                        parsedData.msg ||
                          (parsedData.data && parsedData.data.msg) ||
                          "酷我音乐登录失败，请重试",
                      ));
                }
                if (1 == parsedData.code || 2 == parsedData.code)
                  if (((state.tests = parsedData), "login_state" !== type)) {
                    if ("exit_login" === type)
                      return (
                        hideLogin(),
                        clearQrCache(),
                        showAppAlert("已退出登录！"),
                        void location.reload()
                      );
                    if (
                      "get_memo" !== type &&
                      "add_memo" !== type &&
                      "update_memo" !== type &&
                      "del_memo" !== type &&
                      "delall_memo" !== type
                    )
                      if ("Main_Wakeup_Benchmark" !== type && "User_Wakeup_Benchmark" !== type)
                        if ("get_info" !== type)
                          if ("asrMaxDuration" !== type) {
                            if ("Voice_time_reporting" !== type)
                              return "set_Time_reporting" === type ||
                                "set_Whole_point_prompt" === type ||
                                "set_Half_dot_prompt" === type
                                ? (requestVoiceTimeReporting(),
                                  void (
                                    ("set_Whole_point_prompt" !== type &&
                                      "set_Half_dot_prompt" !== type) ||
                                    showAppAlert("已保存！")
                                  ))
                                : void (
                                    "Submit_Play_Record" !== type &&
                                    "is_xiaoai" !== type &&
                                    setTimeout(function () {
                                      sendToUnisound({ type: "get_info" });
                                    }, 500)
                                  );
                            createVoiceTimeReportingPanel(parsedData);
                          } else updateAsrMaxDuration(parsedData);
                        else updateUnisoundInfo(parsedData);
                      else updateWakeupBenchmark(parsedData);
                    else handleMemoInfo(parsedData);
                  } else handleLoginState(parsedData);
              } else
                void 0 === parsedData.data
                  ? handleApiResponse(parsedData, 0)
                  : "object" != typeof parsedData.data
                    ? handleApiResponse(parsedData, 1)
                    : handleApiResponse(parsedData, 2);
            else handleKuwoLogin(parsedData, 0);
          else handleNeteaseLogin(parsedData, 0);
        else handleQQLogin(parsedData);
      else updateQrState(parsedData.data);
    else
      1 == parsedData.code || 2 == parsedData.code
        ? updateQrCodeData(parsedData.data)
        : loginSessionCurrent(state.loginSession) &&
          "loading" === state.loginSession.stage &&
          loginFailed(state.loginSession, parsedData.msg || "二维码获取失败，请刷新二维码");
  }
}
function detectXiaoaiInstalled() {
  state.xiaoaiChecked ||
    ((state.xiaoaiChecked = !0),
    sendWs({
      type: "shell",
      type_id: "detect_xiaoai",
      shell: 'pm list packages | grep -E "com.xiaomi.xiaoailite|com.duoqin.ai"',
    }));
}
function updateUnisoundInfo(message) {
  if (1 == message.code && ((state.unisoundInfo = message.data), state.isNewUnisound)) {
    var payload = message.data;
    if (
      (ui.dormancyBtn && (ui.dormancyBtn.style.display = ""),
      ui.wakeupBtn && (ui.wakeupBtn.style.display = ""),
      ui.wakeupBtn &&
        (payload.isIdle
          ? ((ui.wakeupBtn.wakeupState = 0),
            (ui.wakeupBtn.value = "当前：已禁用麦克风"),
            (ui.wakeupBtn.style.backgroundColor = "rgba(238,0,0,1)"))
          : ((ui.wakeupBtn.wakeupState = 1),
            (ui.wakeupBtn.value = "当前：已启用麦克风"),
            (ui.wakeupBtn.style.backgroundColor = ""))),
      ui.dormancyBtn &&
        (isUnisoundVer(1849)
          ? 5 == payload.DeviceStatus
            ? ((ui.dormancyBtn.value = "退出休眠"),
              (ui.dormancyBtn.dormancyState = 1),
              (ui.dormancyBtn.style.backgroundColor = "rgba(238,0,0,1)"),
              ui.wakeupBtn &&
                ((ui.wakeupBtn.disabled = !0), (ui.wakeupBtn.style.backgroundColor = "")))
            : ((ui.dormancyBtn.value = "开始休眠"),
              (ui.dormancyBtn.dormancyState = 0),
              (ui.dormancyBtn.style.backgroundColor = ""),
              ui.wakeupBtn && (ui.wakeupBtn.disabled = !1))
          : ((ui.dormancyBtn.value = payload.isIdle ? "退出休眠" : "开始休眠"),
            (ui.dormancyBtn.dormancyState = payload.isIdle ? 1 : 0))),
      ui.submitRecordBtn &&
        ((ui.submitRecordBtn.style.display = ""),
        (ui.submitRecordBtn.value = payload.Submit_Play_Record
          ? "点击关闭提交播放记录"
          : "点击打开提交播放记录"),
        (ui.submitRecordBtn.recordState = payload.Submit_Play_Record ? 1 : 0)),
      ui.btToneBtn &&
        ((ui.btToneBtn.style.display = ""),
        (ui.btToneBtn.value = payload.Bluetooth_prompt_tone
          ? "点击关闭蓝牙提示音"
          : "点击打开蓝牙提示音"),
        (ui.btToneBtn.toneState = payload.Bluetooth_prompt_tone ? 1 : 0)),
      isUnisoundVer(1848) && state.unisoundInfo.Wakeup_Benchmark)
    ) {
      var options = {};
      for (var key in state.unisoundInfo.Wakeup_Benchmark)
        options[key] = state.unisoundInfo.Wakeup_Benchmark[key];
      ((options.code = 1), updateWakeupBenchmark(options));
    } else if (state.unisoundInfo.Main_Wakeup_Benchmark) {
      var options2 = {};
      for (var key2 in state.unisoundInfo.Main_Wakeup_Benchmark)
        options2[key2] = state.unisoundInfo.Main_Wakeup_Benchmark[key2];
      ((options2.code = 1), updateWakeupBenchmark(options2));
    }
    if (state.unisoundInfo.asrMaxDuration) {
      var options3 = {};
      for (var key3 in state.unisoundInfo.asrMaxDuration)
        options3[key3] = state.unisoundInfo.asrMaxDuration[key3];
      ((options3.code = 1), updateAsrMaxDuration(options3));
    }
    updateButtonVisibility();
  }
}
function updateWakeupBenchmark(value) {
  if (1 == value.code) {
    var wakeupBenchmark = ui.wakeupBenchmark;
    wakeupBenchmark &&
      (isUnisoundVer(1848) && state.isNewUnisound
        ? ((wakeupBenchmark.disabled = !1),
          (wakeupBenchmark.min = 0),
          (wakeupBenchmark.max =
            100 * (wakeupBenchmark.maxValue / 100 - value.Default_Main_WakeupBenchmark)),
          (wakeupBenchmark.value =
            wakeupBenchmark.max - 100 * parseFloat(value.User_WakeupBenchmark)))
        : isUnisoundVer(1822) &&
          state.isNewUnisound &&
          ((wakeupBenchmark.disabled = !1),
          (wakeupBenchmark.min = 100 * parseFloat(value.Default_Main_WakeupBenchmark)),
          (wakeupBenchmark.max = wakeupBenchmark.maxValue),
          (wakeupBenchmark.value =
            wakeupBenchmark.max - 100 * parseFloat(value.Main_WakeupBenchmark))));
  }
}
function updateAsrMaxDuration(value) {
  if (1 == value.code && isUnisoundVer(1822) && state.isNewUnisound) {
    var asrMaxDuration = ui.asrMaxDuration,
      asrMaxDurationLabel = ui.asrMaxDurationLabel;
    asrMaxDuration &&
      ((asrMaxDuration.disabled = !1),
      (asrMaxDuration.max = parseInt(value.Default_asrMaxDuration, 10) / 1e3),
      (asrMaxDuration.value = parseInt(value.asrMaxDuration, 10) / 1e3),
      asrMaxDurationLabel &&
        (asrMaxDurationLabel.innerHTML = parseInt(value.asrMaxDuration, 10) / 1e3 + "秒"));
  }
}
function handleApiResponse(message, value) {
  if (message)
    if (1 == message.login_state) {
      var nameValuePairs;
      try {
        if (1 === value) {
          var parsedData = JSON.parse(message.data);
          nameValuePairs = parsedData && (parsedData.nameValuePairs || parsedData);
        } else 2 === value && (nameValuePairs = message.data);
      } catch (error) {
        return;
      }
      nameValuePairs &&
        ("info" === nameValuePairs.type
          ? ((state.deviceInfoCache.api_info = nameValuePairs), loadDeviceInfo())
          : "login_netease_music" === nameValuePairs.type
            ? handleNeteaseLogin(nameValuePairs, 1)
            : "collect" === nameValuePairs.type || "cancel_collect" === nameValuePairs.type
              ? showAppAlert(nameValuePairs.msg)
              : "get_song_list" === nameValuePairs.type
                ? handleSongListResponse(nameValuePairs)
                : "login_kuwo_music" === nameValuePairs.type && handleKuwoLogin(nameValuePairs, 1));
    } else {
      var loginSession = state.loginSession;
      loginSessionCurrent(loginSession) &&
        "submit" === loginSession.stage &&
        loginFailed(
          loginSession,
          "数据提交失败！" + (message.login_msg || message.msg || "音箱账号未登录"),
        );
      var userInfoTextElement = $("#user_info_text");
      userInfoTextElement &&
        (userInfoTextElement.innerHTML = message.login_msg + "(" + message.login_state + ")");
    }
}
var songListSession = null,
  songListGeneration = 0,
  songListRequest = null,
  songListAmbiguousSocket = null;
function songListSessionCurrent(value) {
  return (
    !!value &&
    value === songListSession &&
    value.generation === songListGeneration &&
    value.socket === state.ws &&
    value.source === state.info.music_source &&
    value.dlg.isOpen()
  );
}
function requestSongList(value) {
  if (songListSessionCurrent(value))
    if (
      (songListRequest &&
        songListRequest.socket !== state.ws &&
        (clearTimeout(songListRequest.timer), (songListRequest = null)),
      songListRequest)
    )
      value.waiting = !0;
    else {
      value.waiting = !1;
      var options = { session: value, socket: state.ws, source: value.source, timer: null };
      ((songListRequest = options),
        (options.timer = setTimeout(function () {
          if (songListRequest === options) {
            ((songListRequest = null),
              (songListAmbiguousSocket = options.socket),
              songListSessionCurrent(options.session) &&
                (options.session.dlg.title.innerHTML = "获取歌单超时，请重新打开重试"));
            var songListSession2 = songListSession;
            songListSessionCurrent(songListSession2) &&
              songListSession2.waiting &&
              requestSongList(songListSession2);
          }
        }, 1e4)),
        sendToUnisound({
          type: "api",
          data: { type: "get_song_list", music_source: value.source },
        }));
    }
}
function handleSongListResponse(value) {
  var songListRequest2 = songListRequest;
  (songListRequest2 && (clearTimeout(songListRequest2.timer), (songListRequest = null)),
    (songListRequest2 && songListRequest2.socket !== state.ws) ||
      (state.tempSongList || (state.tempSongList = {}),
      (state.tempSongList.music_source = songListRequest2
        ? songListRequest2.source
        : state.info.music_source),
      200 == value.code
        ? ((state.tempSongList.time = Date.now()), (state.tempSongList.data = value))
        : (state.tempSongList.time = -1)),
    songListRequest2 &&
      songListAmbiguousSocket !== songListRequest2.socket &&
      renderSongListWindow(value, songListRequest2.session));
  var songListSession2 = songListSession;
  songListSessionCurrent(songListSession2) &&
    songListSession2.waiting &&
    requestSongList(songListSession2);
}
function openSongListWindow(value) {
  if (songListSessionCurrent(songListSession))
    return (value && renderSongListWindow(value, songListSession), songListSession.dlg);
  var dialogPanel = createDialogPanel("我的歌单", { noPadding: !0 }),
    options = {
      dlg: dialogPanel,
      generation: ++songListGeneration,
      socket: state.ws,
      source: state.info.music_source,
      timer: null,
      waiting: !1,
    };
  ((songListSession = options),
    dialogPanel.onClose(function () {
      (clearTimeout(options.timer),
        songListSession === options && ((songListSession = null), songListGeneration++));
    }));
  var songListDivElement = makeEl("div", {
    id: "song_list_div",
    class: "song_list_panel",
    style: "background:transparent;text-align:left;color:#fff",
  });
  ((songListDivElement.onclick = function (event) {
    if (dialogPanel.isOpen()) {
      clearTimeout(timers.listClick);
      for (
        var target = event.target;
        target && (!target.classList || !target.classList.contains("click"));
      )
        target = target.parentElement;
      if (target) {
        var dataId = target.getAttribute("data-id") || "",
          dataTitle = target.getAttribute("data-title") || "";
        dataId &&
          showAppConfirm("点播歌单[" + dataTitle + "]？", function () {
            (sendAction(65536, 0, 9, String(dataId)), dialogPanel.close());
            var btnPageMusicElement = $("#btn_page_music");
            btnPageMusicElement && navigateToPage(btnPageMusicElement);
          });
      }
    }
  }),
    dialogPanel.body.appendChild(songListDivElement));
  var title = dialogPanel.title;
  if (((title.id = "song_list_title"), (title.innerHTML = "正在加载歌单列表。。。"), value))
    renderSongListWindow(value, options);
  else {
    var tempSongList = state.tempSongList;
    tempSongList &&
    tempSongList.time > 0 &&
    Date.now() - tempSongList.time < 6e5 &&
    tempSongList.music_source === options.source
      ? (options.timer = setTimeout(function () {
          renderSongListWindow(tempSongList.data, options);
        }, 200))
      : requestSongList(options);
  }
  return dialogPanel;
}
function renderSongListWindow(message, value) {
  if (((value = value || songListSession), message && songListSessionCurrent(value))) {
    var songListDivElement = value.dlg.body.querySelector("#song_list_div"),
      title = value.dlg.title;
    if (songListDivElement)
      if (((songListDivElement.innerHTML = ""), 200 == message.code)) {
        var payload = message.data;
        title.innerHTML = payload.title;
        for (var value2 = Object.keys(payload.data), index = 0; index < value2.length; index++) {
          var list = payload.data[value2[index]].list;
          (songListDivElement.appendChild(makeDiv("height:5px")),
            songListDivElement.appendChild(
              makeText(
                payload.data[value2[index]].title + "[" + list.length + "]",
                "font-size:16px;color:#fff;margin-left:5px;text-shadow:none",
              ),
            ),
            songListDivElement.appendChild(makeDiv("height:5px")));
          for (var index2 = 0; index2 < list.length; index2++) {
            var listItem = list[index2],
              container = makeEl("div", {
                class: "click",
                style:
                  "background-color:rgba(255,255,255,0.15);color:#fff;border-bottom:1px solid rgba(255,255,255,0.1);padding:8px 12px;margin:0",
                "data-id": String(listItem.id || ""),
                "data-title": String(listItem.title || ""),
              });
            container.appendChild(
              makeEl("img", {
                src: listItem.pic,
                style: "border-radius:10%;margin:0 10px 0 5px;height:66px;width:66px",
              }),
            );
            var container2 = makeEl("div", {
              style:
                "margin-right:5px;display:flex;justify-content:center;align-items:flex-start;flex-direction:column",
            });
            (container.appendChild(container2),
              songListDivElement.appendChild(container),
              container2.appendChild(
                makeText(listItem.title, "font-size:16px;color:#fff;text-align:left"),
              ),
              container2.appendChild(
                makeText(
                  listItem.content,
                  "font-size:12px;color:rgba(255,255,255,0.6);text-align:left",
                ),
              ));
          }
        }
      } else title.innerHTML = message.msg;
  }
}
function createMusicInfoWindow(value, value2) {
  var musicInfo = value.music_info,
    options = {},
    dialogPanel = createDialogPanel("", { noPadding: !0, stack: !(!value2 || !value2.stack) }),
    header = dialogPanel.header;
  ((header.style.justifyContent = "center"),
    header.removeChild(dialogPanel.title),
    header.removeChild(dialogPanel.closeBtn));
  var image = makeEl("img", {
    style: "border-radius:10%;height:66px;margin:0 12px 0 5px",
  });
  header.appendChild(image);
  var container = makeEl("div", {
    style:
      "margin:0;display:flex;justify-content:center;align-items:flex-start;flex-direction:column;word-break:break-all",
  });
  header.appendChild(container);
  var textNode = makeText(
      "正在获取歌曲信息，请稍候。。。",
      "font-size:16px;font-weight:bold;color:#fff;text-shadow:none",
    ),
    textNode2 = makeText(
      "",
      "font-size:12px;font-weight:bold;color:rgba(255,255,255,0.85);text-shadow:none",
    );
  (container.appendChild(textNode), container.appendChild(textNode2));
  var body = dialogPanel.body;
  (body.classList.add("dark_opts"), (body.style.maxHeight = "60vh"));
  var trElement = makeEl("tr", {
    class: "span1 app_dialog_close_option",
    style:
      "color:#fff;background-color:transparent;text-shadow:none;border-top:1px solid rgba(255,255,255,0.1)",
  });
  (trElement.appendChild(makeEl("span", { style: "color:#fff;text-shadow:none", html: "关闭" })),
    (trElement.onclick = function () {
      dialogPanel.isOpen() && dialogPanel.close();
    }),
    body.appendChild(trElement));
  var value3 = null,
    value4 = null;
  dialogPanel.onClose(function () {
    (clearTimeout(value3), value4 && "function" == typeof value4.abort && value4.abort());
  });
  var items = [
    {
      title: "播放歌曲",
      onclick: function () {
        dialogPanel.isOpen() &&
          (state.playlist.playIndex != value.index
            ? (sendWs({ type: "play", index: value.index }), dialogPanel.close())
            : dialogPanel.close());
      },
    },
  ];
  (readUnisoundAvailable() &&
    state.isNewUnisound &&
    "local_" !== String(musicInfo.itemId).substring(0, 6) &&
    (0 == musicInfo.itemType || 1 == musicInfo.itemType) &&
    (items.push({
      title: "收藏歌曲",
      onclick: function () {
        readUnisoundAvailable() &&
          showAppConfirm("确定要收藏[" + getTrackTitle(musicInfo) + "]吗？", function () {
            readUnisoundAvailable() &&
              (sendToUnisound({
                type: "api",
                data: { type: "collect", music_info: musicInfo },
              }),
              dialogPanel.close());
          });
      },
    }),
    items.push({
      title: "取消收藏",
      onclick: function () {
        readUnisoundAvailable() &&
          showAppConfirm("确定要取消收藏[" + getTrackTitle(musicInfo) + "]吗？", function () {
            readUnisoundAvailable() &&
              (sendToUnisound({
                type: "api",
                data: { type: "cancel_collect", music_info: musicInfo },
              }),
              dialogPanel.close());
          });
      },
    })),
    items.push({
      title: "歌曲信息",
      onclick: function () {
        var items2 = ["歌曲名称：" + options.name, "歌手名称：" + options.artist],
          items3 = (options.id || "").split(","),
          optionItem =
            {
              qq: "QQ音乐",
              netease: "网易云音乐",
              kuwo: "酷我音乐",
              kugou: "酷狗音乐",
              migu: "咪咕音乐",
            }[items3[1]] || items3[1];
        if (
          (items2.push(
            '歌曲ID：<a style="color:#7ab8ff" target="_blank" href="' +
              options.link +
              '">' +
              items3[0] +
              "</a>",
          ),
          items2.push("歌曲来源：" + optionItem),
          items2.push("------歌词------"),
          "string" == typeof options.lrc)
        )
          for (
            var items4 = options.lrc.match(/(\[\d{1,3}:\d{1,2}.\d{1,3}\])(.*)/g) || [], index = 0;
            index < items4.length;
            index++
          )
            items2.push(items4[index]);
        createTextWindow("歌曲信息", items2.join("\r\n"));
      },
    }));
  var callback = function (message) {
    if (dialogPanel.isOpen() && message)
      if (1 == message.code || message === musicInfo) {
        (1 == message.code ? (options = message.data) : items.pop(),
          message.data || (message.data = {}),
          (textNode.innerHTML = message.data.name || message.title || message.album || ""),
          (textNode2.innerHTML = message.data.artist || message.artist || ""),
          (image.src = message.data.pic || ""));
        for (var index = 0; index < items.length; index++)
          (function (value5, value6) {
            if (value5) {
              var trElement2 = makeEl("tr", {
                class: "span1",
                style: "color:#fff;background-color:transparent;text-shadow:none",
              });
              ((trElement2.onclick = function () {
                dialogPanel.isOpen() && value5.onclick();
              }),
                trElement2.appendChild(
                  makeEl("span", {
                    style: "color:#fff;text-shadow:none",
                    html: value5.title,
                  }),
                ),
                body.insertBefore(trElement2, trElement),
                value6 < items.length - 1 &&
                  body.insertBefore(makeEl("hr", { class: "hr" }), trElement));
            }
          })(items[index], index);
      } else
        ((textNode.innerHTML = "获取歌曲信息失败！"),
          (value3 = setTimeout(function () {
            callback(musicInfo);
          }, 1e3)));
  };
  "local_" !== String(state.musicId).substring(0, 6)
    ? state.playlist.playIndex == value.index &&
      state.apiMusicInfo &&
      state.apiMusicInfo.id === state.musicId
      ? callback({ code: 1, data: state.apiMusicInfo })
      : (musicInfo && 2 == musicInfo.ItemType) ||
        (window.jQuery &&
          (value4 = window.jQuery.ajax({
            type: "POST",
            url: R1Config.musicApiUrl,
            data: { info: musicInfo.itemId, music_info: JSON.stringify(musicInfo) },
            dataType: "jsonp",
            success: callback,
            error: function () {
              dialogPanel.isOpen() &&
                ((textNode.innerHTML = "获取歌曲信息失败！"),
                (value3 = setTimeout(function () {
                  callback(musicInfo);
                }, 1e3)));
            },
          })))
    : callback(musicInfo);
}
function handleMessage(message) {
  if (message.type_id && state.callbacks[message.type_id]) {
    try {
      state.callbacks[message.type_id](message);
    } catch (error) {}
    delete state.callbacks[message.type_id];
  }
  var unisoundSkipCheck = state.unisoundSkipCheck;
  if (
    !unisoundSkipCheck ||
    !unisoundNoticeCurrent(unisoundSkipCheck.notice, unisoundSkipCheck.socket) ||
    (message.type_id !== unisoundSkipCheck.id && "get_info" !== message.type)
  )
    if ("rksmbd_state" !== message.type_id) {
      if ("dsp_bass_state" !== message.type_id) {
        if ("wm_size" !== message.type_id)
          if ("sends" !== (type = message.type)) {
            if ("get_info" === type) {
              var value = readDeviceInfoResponse(message);
              if (!value) return;
              var flowNotice = ui.flowNotice;
              return (
                !loginFlowActive() &&
                  flowNotice &&
                  "unisound" === flowNotice.kind &&
                  "initializing" === flowNotice.phase &&
                  unisoundNoticeCurrent(flowNotice, flowNotice.socket) &&
                  ((state.reload = !1), clearFlowNotice("unisound")),
                clearTimeout(timers.unisoundInit),
                clearTimeout(timers.unisoundInitBackup),
                (timers.unisoundInit = timers.unisoundInitBackup = -1),
                confirmEchoVersion(value),
                state.initState || state.initState1
                  ? (removeEl($("#Skip_Waiting")), void renderHomePage(value))
                  : void updatePlayerState(value)
              );
            }
            if ("list" !== type)
              if ("get_eq_config" !== type)
                if ("login_state" !== type)
                  if ("Unisound" !== type)
                    if ("BT_Device" !== type)
                      if ("BT_enable" !== type && "BT_disable" !== type)
                        if ("max_vol" !== type)
                          if ("Auto_restart_device" !== type)
                            if (
                              "set_Auto_restart_device_open" !== type &&
                              "set_Auto_restart_device_time" !== type
                            )
                              if ("play_local_music" !== type) {
                                if ("reboot_echo" === type)
                                  return "switch_player" === message.type_id
                                    ? void handleSwitchPlayer(message)
                                    : void showAppAlert("已重启EchoService！");
                                if ("switch_player" !== type) {
                                  if (
                                    (("set_dev_name" !== type && "rec_dev_name" !== type) ||
                                      runShell("getprop net.hostname && netcfg", "get_hostname"),
                                    "shell" === type)
                                  ) {
                                    var typeId = message.type_id;
                                    if ("reboot_adbd" === typeId)
                                      return void showAppAlert("已重启adbd！");
                                    if ("query" === typeId)
                                      return void setSystemInfoV1(message.data);
                                    if ("useless_services_detection" === typeId)
                                      return void detectUnusableServices(message.data);
                                    if ("hide_useless_services" === typeId) {
                                      var hideUselessServicesElement = $("#hide_useless_services");
                                      return void (
                                        hideUselessServicesElement &&
                                        ((hideUselessServicesElement.value = "已禁用无用的服务！"),
                                        (hideUselessServicesElement.disabled = !0),
                                        setTimeout(function () {
                                          runShell(
                                            "/system/bin/pm list packages",
                                            "useless_services_detection",
                                          );
                                        }, 2e3))
                                      );
                                    }
                                    if ("get_hostname" === typeId)
                                      return void handleHostnameUpdate(message);
                                    if ("ps" === typeId)
                                      return void handleProcessList(
                                        200 == message.code ? message.data : null,
                                      );
                                    if ("ping_r1service" === typeId)
                                      return void handlePingResponse(message);
                                    if ("set_date" === typeId)
                                      return (
                                        showAppAlert("已校准音箱时间！"),
                                        void runShell(
                                          "date & ping -w 1 r1service.wxfsq.com",
                                          "ping_r1service",
                                        )
                                      );
                                    if ("reboot_xiaoaiservice" === typeId)
                                      return void runShell(
                                        "Am broadcast -a android.intent.action.BOOT_COMPLETED -n com.xiaomi.xiaoailite/.ai.BootReceiver&am broadcast -a android.intent.action.BOOT_COMPLETED -n com.duoqin.ai/com.xiaofei.BootReceiver",
                                      );
                                    if ("activation_xiaoai" === typeId)
                                      return void runShell(
                                        "am broadcast -a android.intent.action.BOOT_COMPLETED -n com.xiaomi.xiaoailite/.ai.BootReceiver&am broadcast -a android.intent.action.BOOT_COMPLETED -n com.xiaomi.xiaoailite/com.taobao.accs.EventReceiver",
                                      );
                                    if ("detect_xiaoai" === typeId) {
                                      var text = String(message.data || "");
                                      return (
                                        (text.indexOf("com.xiaomi.xiaoailite") > -1 ||
                                          text.indexOf("com.duoqin.ai") > -1) &&
                                          (state.unisoundInfo.is_xiaoai_exists ||
                                            ((state.unisoundInfo.is_xiaoai_exists = !0),
                                            state.unisoundInfo &&
                                              (state.unisoundInfo.is_xiaoai_exists = !0))),
                                        void updateButtonVisibility()
                                      );
                                    }
                                  }
                                  if ("modify_color" !== message.type_id)
                                    if ("get_device_info" !== message.type_id) {
                                      if (
                                        "Get_MiPlay_Diag" !== message.type &&
                                        "Get_MiPlay_Paired_Diag" !== message.type &&
                                        "Get_MiPlay_Remote_Diag" !== message.type &&
                                        "Get_Lan_Devices" !== message.type &&
                                        "Set_MiPlay_Sync_Delay" !== message.type &&
                                        "Set_MiPlay_Remote_Sync_Delay" !== message.type &&
                                        "Set_MiPlay_Tuning" !== message.type &&
                                        "Set_MiPlay_Remote_Tuning" !== message.type &&
                                        "Set_MiPlay_Remote_Capture" !== message.type &&
                                        "Set_MiPlay_Capture_Latency" !== message.type &&
                                        "Set_MiPlay_Channel" !== message.type &&
                                        "Set_MiPlay_Remote_Channel" !== message.type &&
                                        "Set_MiPlay_Open" !== message.type &&
                                        "Set_MiPlay_Group" !== message.type &&
                                        "Set_MiPlay_Group_Auto" !== message.type &&
                                        "Set_MiPlay_Remote_Role" !== message.type &&
                                        message.type_id
                                      ) {
                                        var serializedData,
                                          textElement = $("#text"),
                                          successTip = getSuccessTip(message.type_id);
                                        if (
                                          "send_message" === type &&
                                          200 == message.code &&
                                          "sendMessage_ok" === message.data &&
                                          null == successTip
                                        )
                                          return;
                                        serializedData =
                                          200 == message.code
                                            ? null != successTip
                                              ? successTip
                                              : "object" == typeof message.data &&
                                                  null !== message.data
                                                ? JSON.stringify(message.data)
                                                : message.data
                                            : "object" == typeof message.msg && null !== message.msg
                                              ? JSON.stringify(message.msg)
                                              : message.msg;
                                        var value2 = "[" + message.type_id + "]:" + serializedData;
                                        (textElement && (textElement.value = value2),
                                          createTextWindow(
                                            message.type_id,
                                            String(serializedData),
                                          ));
                                      }
                                    } else setSystemInfoV2(message.data);
                                  else showAppAlert("已保存！");
                                } else handleSwitchPlayer(message);
                              } else {
                                var textElement2 = $("#text");
                                if (200 != message.code) {
                                  var value3 = "[播放本地音乐]:" + message.msg;
                                  (textElement2 && (textElement2.value = value3),
                                    showAppAlert(value3));
                                } else
                                  textElement2 &&
                                    (textElement2.value = "[播放本地音乐]:" + message.data);
                              }
                            else requestAutoRestart();
                          else 200 == message.code && createAutoRestartPanel(message.data);
                        else
                          200 == message.code &&
                            ui.volumeRange &&
                            ui.volumeLabel &&
                            ((ui.volumeRange.max = message.data),
                            (ui.volumeLabel.innerHTML =
                              " " + ui.volumeRange.value + "/" + ui.volumeRange.max));
                      else ui.btEnableBtn && (ui.btEnableBtn.wait = !1);
                    else refreshBluetoothDevices(message.data);
                  else handleUnisoundMessage(message);
                else handleLoginState(message.data);
              else refreshAudioEffects(JSON.parse(message.data));
            else updatePlaylist(JSON.parse(message.data));
          } else {
            if (200 != message.code) return;
            if ("device_info" === message.type_id) {
              for (var message2 = null, index = 0; index < message.data.length; index++)
                "get_device_info" === message.data[index].type_id &&
                  (message2 = message.data[index]);
              return void (message2 && setSystemInfoV2(message2.data, message.data));
            }
            for (var index2 = 0; index2 < message.data.length; index2++)
              handleMessage(message.data[index2]);
          }
        else if (ui.screen && ui.screen.controller) {
          var value4 = /(\d+)x(\d+)/.exec(message.data);
          value4 && ui.screen.controller.setTargetResolution(value4[1], value4[2]);
        }
      } else
        for (var items = message.data.split("\r\n"), index3 = 1; index3 < items.length; index3++) {
          var settingsParts = items[index3].split(":"),
            value5 = settingsParts.shift(),
            text2 = settingsParts.join(":").replace(/^\s+|\s+$/g, "");
          if ("route0feture" === value5) {
            var dspBassSwitchElement = $("#dsp_bass_switch");
            dspBassSwitchElement && (dspBassSwitchElement.checked = 1 == text2);
          } else if ("pram" === value5) {
            var type;
            (type = $("#dsp_bass_text")) &&
              (type.innerHTML =
                "DSP低音增强(" + (text2.indexOf(">data3") > -1 ? "生效中" : "未生效") + ")：");
          }
        }
    } else {
      var itemItem = message.data.split("\r\n")[1] || 0;
      if (-1 != itemItem) {
        var rksmbdElement = $("#rksmbd");
        rksmbdElement &&
          (rksmbdElement.setAttribute("state", itemItem),
          (rksmbdElement.value = 1 == itemItem ? "关闭smb服务" : "打开smb服务"),
          (rksmbdElement.style.display = ""));
      }
    }
}
function handleSwitchPlayer(message) {
  if (200 == message.code) {
    var switchPlayerElement = $("#switch_player");
    "reboot_echo" !== message.type
      ? switchPlayerElement &&
        (2 == message.data.player
          ? (switchPlayerElement.setAttribute("PlayerType", 2),
            (switchPlayerElement.value = "切换MediaPlayer播放器"))
          : (switchPlayerElement.setAttribute("PlayerType", 1),
            (switchPlayerElement.value = "切换ExoPlayer播放器")),
        sendWs({ type: "reboot_echo", type_id: "switch_player" }))
      : switchPlayerElement &&
        showAppAlert(
          "已切换为" +
            (2 == switchPlayerElement.getAttribute("PlayerType") ? "ExoPlayer" : "MediaPlayer") +
            "播放器！",
        );
  } else showAppAlert("切换失败！" + message.msg);
}
function handleHostnameUpdate(message) {
  if (
    !loginFlowActive() &&
    (state.initState && ((state.initState = !1), sendWs({ type: "get_info" })), message.data)
  ) {
    var items = message.data.split("\r\n");
    if (!(items.length < 2)) {
      state.hostname = items[1];
      for (var index = 0; index < items.length; index++)
        if (items[index].indexOf("wlan0") > -1)
          for (var items2 = items[index].split(" "), index2 = 0; index2 < items2.length; index2++) {
            var itemItem = items2[index2].split("/")[0];
            items2[index2] && IP_PATTERN.test(itemItem) && (state.localIp = itemItem);
          }
      (state.hostname &&
        (updateDeviceList({
          hostname: state.hostname,
          ip: state.localIp || R1Config.parseDeviceAddress(state.ip).host,
          dev_name: state.info.device_name,
          url: location.href.split("?")[0],
        }),
        localStorage.setItem("current_hostname", state.hostname),
        clearTimeout(timers.background),
        (timers.background = setTimeout(function () {
          var item = localStorage.getItem(state.hostname + "_background");
          (item ? setBackgroundCss(item) : restoreBackground(), updateStatusBar());
        }, 50)),
        (state.deviceTag = "[" + state.hostname.substr(-4) + "]")),
        document.title.substr(-6) !== state.deviceTag &&
          -1 === document.title.indexOf("正在获取") &&
          ("]" === document.title.substr(-1)
            ? (document.title =
                document.title.substr(0, document.title.length - 6) + state.deviceTag)
            : (document.title += state.deviceTag),
          setPageTitle(document.title)));
    }
  }
}
function handlePingResponse(message) {
  if (200 == message.code) {
    state.pingTime = Date.now();
    for (
      var payload = message.data || "", items = payload.split("\r\n"), index = 0;
      index < items.length;
      index++
    )
      if (items[index] && items[index].indexOf("CST") > -1) {
        var date = new Date(items[index] + " +0800");
        isNaN(date.getTime()) || (state.deviceDate = date);
        break;
      }
    var unixTimeText = state.deviceDate
        ? formatUnixTime(parseInt(state.deviceDate.getTime() / 1e3, 10))
        : "",
      deviceTimeElement = $("#device_time");
    (deviceTimeElement && (deviceTimeElement.innerHTML = "音箱时间：" + unixTimeText),
      (state.pingResult = payload.indexOf("icmp_seq=1") > -1 ? 1 : 0));
  } else state.pingResult = message.code;
}
function handleProcessList(text) {
  var cleanupProcessElement = $("#Cleanup_process");
  if (text) {
    for (
      var items = text.split("\r\n").slice(2), items2 = [], index = 0;
      index < items.length;
      index++
    ) {
      var items3 = items[index].split(" ").filter(function (item) {
        return "" !== item;
      });
      items3.length && /\S+\.\S+/.test(items3[items3.length - 1]) && items2.push(items3);
    }
    for (
      var items4 = [
          "com.android.bluetooth",
          "com.vipercn.viper4android_v2",
          "com.audlabs.viperfx",
          "com.phicomm.speaker.launcher",
          "com.phicomm.speaker.systemtool",
          "com.phicomm.speaker.netctl",
          "com.phicomm.speaker.device",
          "com.phicomm.speaker.player",
          "com.droidlogic.mediacenter",
          "com.waxrain.airplaydmr",
          "com.xiaomi.xiaoailite",
          "james.dsp",
          "com.duoqin.ai",
        ],
        items5 = [],
        index2 = 0;
      index2 < items2.length;
      index2++
    ) {
      for (
        var items2ItemItem = items2[index2][items2[index2].length - 1], isEnabled = !1, index3 = 0;
        index3 < items4.length;
        index3++
      )
        if (items2ItemItem.indexOf(items4[index3]) > -1) {
          isEnabled = !0;
          break;
        }
      isEnabled ||
        items2ItemItem.indexOf(":") > -1 ||
        (items5.push("am force-stop " + items2ItemItem),
        isEchoVer(1855) || runShell("am force-stop " + items2ItemItem));
    }
    (items5.length && isEchoVer(1855) && sendWs({ type: "shell1", shells: items5 }),
      cleanupProcessElement &&
        ((cleanupProcessElement.value = items5.length
          ? "已清理[" + items5.length + "]个进程！"
          : "已清理！"),
        setTimeout(function () {
          ((cleanupProcessElement.disabled = !1), (cleanupProcessElement.value = "清理进程"));
        }, 1e3)));
  } else
    cleanupProcessElement &&
      ((cleanupProcessElement.value = "已清理！"),
      setTimeout(function () {
        ((cleanupProcessElement.disabled = !1), (cleanupProcessElement.value = "清理进程"));
      }, 1e3));
}
function getSuccessTip(value) {
  if (state.tips_data && null != state.tips_data[value]) return state.tips_data[value];
  for (var index = 0; index < BUTTON_DEFINITIONS.length; index++) {
    var bUTTONDEFINITIONSItem = BUTTON_DEFINITIONS[index];
    if (bUTTONDEFINITIONSItem[0] === value) {
      var succ = bUTTONDEFINITIONSItem[1].succ;
      if (Array.isArray(succ)) {
        var tips = bUTTONDEFINITIONSItem[1].tips;
        if (tips && Array.isArray(tips)) {
          var value2 = tips.indexOf(value);
          if (value2 >= 0 && value2 < succ.length) return succ[value2];
        }
        return succ[0];
      }
      return succ;
    }
  }
  return null;
}
function unwrapMiPlayRemoteDiag(message) {
  if (!message || !message.data || !message.data.diag) return null;
  try {
    var parsedData = JSON.parse(message.data.diag);
    return parsedData.data || parsedData;
  } catch (error) {
    return null;
  }
}
function isMiPlayDiagFresh(value) {
  var numericValue = value ? parseInt(value.diag_age_ms, 10) : NaN;
  return !isNaN(numericValue) && numericValue >= 0 && numericValue <= 5e3;
}
function isMiPlayDiagRunning(value) {
  return !(
    !value ||
    2 != value.miplay_state ||
    !value.playback_active ||
    !1 === value.miplay_open ||
    0 === value.miplay_open
  );
}
function isMiPlayTimelineValid(value) {
  return !(
    !isMiPlayDiagRunning(value) ||
    !isMiPlayDiagFresh(value) ||
    "sender_clock" !== value.mode ||
    value.front_pts_missing ||
    isNaN(parseInt(value.error_us, 10))
  );
}
function getMiPlayPendingText(value) {
  var numericValue =
      value && null != value.raw_pending_ms ? parseInt(value.raw_pending_ms, 10) : NaN,
    numericValue2 =
      value && null != value.output_latency_ms ? parseInt(value.output_latency_ms, 10) : NaN;
  return !value ||
    ("fusion_opensl_refill" !== value.latency_model &&
      "fusion_normalized_head" !== value.latency_model)
    ? isNaN(numericValue)
      ? isNaN(numericValue2)
        ? "-"
        : numericValue2 + " ms（仅平滑估算）"
      : numericValue +
        " ms（实时" +
        (isNaN(numericValue2) ? "" : "；平滑 " + numericValue2 + " ms") +
        "）"
    : isNaN(numericValue)
      ? "-"
      : numericValue + " ms（原生已排队）";
}
function isMiPlayPhaseSchema(value) {
  return !(
    !value ||
    !(
      "block_phase_us" in value ||
      "block_phase_valid" in value ||
      "latency_model" in value ||
      "render_rate_ppm" in value
    )
  );
}
function miPlayBlockPhaseMicros(value) {
  if (!isMiPlayTimelineValid(value)) return null;
  if (isMiPlayPhaseSchema(value)) {
    if (
      1 != value.block_phase_valid ||
      null == value.block_phase_us ||
      "" === value.block_phase_us ||
      null == value.block_at_ms ||
      null == value.diag_elapsed_ms
    )
      return null;
    var numericValue = Number(value.block_phase_us),
      numericValue2 = Number(value.block_at_ms),
      numericValue3 = Number(value.diag_elapsed_ms),
      value2 = numericValue3 - numericValue2 + parseInt(value.diag_age_ms, 10);
    return !isFinite(numericValue) ||
      !isFinite(numericValue2) ||
      !isFinite(numericValue3) ||
      numericValue2 <= 0 ||
      numericValue3 < numericValue2 ||
      value2 > 5e3
      ? null
      : numericValue;
  }
  var numericValue4 = parseInt(value.block_error_us, 10),
    numericValue5 = parseInt(value.block_pending_us, 10);
  return isNaN(numericValue4) || isNaN(numericValue5) ? null : numericValue4 + numericValue5;
}
function getMiPlayPairDelta(value, value2) {
  if (!isMiPlayTimelineValid(value) || !isMiPlayTimelineValid(value2)) return null;
  var numericValue = parseInt(value.diag_age_ms, 10),
    numericValue2 = parseInt(value2.diag_age_ms, 10);
  if (Math.abs(numericValue - numericValue2) > 500) return null;
  var isMiPlayPhaseSchema2 = isMiPlayPhaseSchema(value),
    isMiPlayPhaseSchema3 = isMiPlayPhaseSchema(value2);
  if (isMiPlayPhaseSchema2 !== isMiPlayPhaseSchema3) return null;
  if (isMiPlayPhaseSchema2 && value.latency_model !== value2.latency_model) return null;
  var value3 = miPlayBlockPhaseMicros(value),
    value4 = miPlayBlockPhaseMicros(value2);
  if (null == value3 || null == value4)
    return isMiPlayPhaseSchema2 || isMiPlayPhaseSchema3
      ? null
      : parseInt(value.error_us, 10) - parseInt(value2.error_us, 10);
  if (isMiPlayPhaseSchema2) {
    var value5 = Number(value.diag_elapsed_ms) - Number(value.block_at_ms) + numericValue,
      value6 = Number(value2.diag_elapsed_ms) - Number(value2.block_at_ms) + numericValue2;
    if (Math.abs(value5 - value6) > 500) return null;
  }
  return value3 - value4;
}
var miPlayAdvDialog = null;
function createMiPlayAdvDialog() {
  if (miPlayAdvDialog && miPlayAdvDialog.isOpen()) miPlayAdvDialog.close();
  else {
    var dialogPanel = createDialogPanel("MiPlay 高级设置", {
      transparent: !0,
      width: "92vw",
    });
    ((miPlayAdvDialog = dialogPanel), (dialogPanel.wrap.id = "miplay_adv_wrap"));
    var text = "color:#fff;font-size:13px;line-height:1.6;text-align:left",
      container = makeEl("div", {
        style: text + ";display:flex;gap:6px;align-items:center;margin:4px 0 8px",
      });
    container.appendChild(makeText("目标音箱："));
    var select = makeEl("select", {
      style: "flex:1;color:#fff;background:#333;border:1px solid #555;",
    });
    (select.appendChild(makeEl("option", { value: "local", html: "本机" })),
      (state.info.miplay_discovered || "")
        .split(",")
        .filter(function (text2) {
          return text2.trim();
        })
        .forEach(function (text2) {
          select.appendChild(makeEl("option", { value: text2.trim(), html: text2.trim() }));
        }));
    var input = makeEl("input", {
      type: "text",
      placeholder: "或手动输入IP",
      style: "flex:1;color:#fff;background:#333;border:1px solid #555;padding:5px;font-size:12px",
    });
    (container.appendChild(select),
      container.appendChild(input),
      dialogPanel.body.appendChild(container),
      (select.onchange = function () {
        ((input.value = ""), refreshDiagnostics());
      }),
      (input.onchange = function () {
        refreshDiagnostics();
      }));
    var container2 = makeEl("div", {
      style: text + ";font-weight:bold;margin:6px 0 4px",
      html: "实时指标：",
    });
    dialogPanel.body.appendChild(container2);
    var container3 = makeEl("div", {
      style:
        "background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:8px;font-size:12px;font-family:Consolas,Monaco,monospace;line-height:1.8;margin-bottom:10px;white-space:pre-wrap;color:#fff;text-shadow:none",
    });
    ((container3.textContent = "加载中..."), dialogPanel.body.appendChild(container3));
    var isEnabled = !1,
      index = 0,
      value = null,
      isEnabled2 = !1;
    setDebugControls(null);
    var container4 = makeEl("div", {
      style: text + ";font-weight:bold;margin:6px 0 4px",
      html: "声道切换：",
    });
    dialogPanel.body.appendChild(container4);
    var container5 = makeEl("div", {
        style: "display:flex;justify-content:center;gap:6px;margin-bottom:10px",
      }),
      items = [],
      value2 = null,
      value3 = getTargetIp(),
      isEnabled3 = !1,
      isEnabled4 = !0,
      index2 = 0,
      diagnosticRequestId = 0;
    ([
      ["仅左", 1],
      ["立体声", 0],
      ["仅右", 2],
    ].forEach(function (item) {
      var input7 = makeEl("input", {
        type: "button",
        class: "btn",
        value: item[0],
        disabled: !0,
        style: "flex:1;font-size:12px;padding:8px",
        onclick: function () {
          if (!input7.disabled) {
            var targetIp = getTargetIp(),
              value4 = ++index2;
            ((isEnabled3 = !0),
              updateChannelButtons(),
              sendWs(
                targetIp
                  ? {
                      type: "Set_MiPlay_Remote_Channel",
                      ip: targetIp,
                      mode: item[1],
                      channel: item[1],
                    }
                  : { type: "Set_MiPlay_Channel", mode: item[1] },
                function (value5) {
                  if (isDialogCurrent() && getTargetIp() === targetIp && index2 === value4)
                    return value5 && 200 == value5.code
                      ? void requestDiagnostics(targetIp, function (value6) {
                          isDialogCurrent() &&
                            getTargetIp() === targetIp &&
                            index2 === value4 &&
                            ((isEnabled3 = !1),
                            (value2 = parseChannel(value6)),
                            updateChannelButtons(),
                            value2 === item[1]
                              ? showAppAlert((targetIp ? "远程" : "") + "已切换为" + item[0] + "！")
                              : showAppAlert("声道回读未确认，请检查目标音箱或稍后重试。"),
                            refreshDiagnostics());
                        })
                      : ((isEnabled3 = !1),
                        updateChannelButtons(),
                        void showAppAlert(
                          (targetIp ? "远程" : "") +
                            "设置失败：" +
                            (value5 && value5.msg ? value5.msg : "音箱无响应"),
                        ));
                },
              ));
          }
        },
      });
      (items.push({ mode: item[1], button: input7 }), container5.appendChild(input7));
    }),
      dialogPanel.body.appendChild(container5));
    var container6 = makeEl("div", {
      style: text + ";text-align:center;color:#90caf9;cursor:pointer;margin:8px 0 4px",
      html: "▶ 延迟参数（高级，运行中生效并持久化）",
    });
    dialogPanel.body.appendChild(container6);
    var container7 = makeEl("div", {
      style: "display:none;margin:0 0 8px;text-align:center",
    });
    (dialogPanel.body.appendChild(container7),
      (container6.onclick = function () {
        var value4 = "none" !== container7.style.display;
        ((container7.style.display = value4 ? "none" : "block"),
          (container6.innerHTML = value4
            ? "▶ 延迟参数（高级，运行中生效并持久化）"
            : "▼ 延迟参数（高级，运行中生效并持久化）"));
      }));
    var container8 = makeEl("div", {
      style: text + ";text-align:center;font-weight:bold;margin:6px 0 4px",
      html: "同步延迟微调（0ms 为校准基准）：",
    });
    container7.appendChild(container8);
    var container9 = makeEl("div", {
        style:
          "display:flex;flex-wrap:wrap;justify-content:center;gap:6px;align-items:center;margin-bottom:6px",
      }),
      input2 = makeEl("input", {
        type: "number",
        min: -500,
        max: 500,
        step: 1,
        value: 0,
        style:
          "width:90px;text-align:center;color:#fff;background:#333;border:1px solid #555;padding:5px",
        title: "正值晚播，负值早播，单位毫秒",
      });
    (container9.appendChild(input2), container9.appendChild(makeText("ms")));
    var container10 = makeEl("div", {
        style: text + ";text-align:center;font-size:12px;margin-bottom:8px",
        html: "0ms 使用已校准的同步基准。正值在此基础上晚播，负值早播；建议先每次调 5ms，再用 1ms 微调。应用时会短暂重新对齐。",
      }),
      input3 = makeEl("input", {
        type: "button",
        class: "btn",
        value: "应用同步补偿",
        onclick: function () {
          setDelay("" === input2.value ? NaN : Number(input2.value));
        },
      });
    (container9.appendChild(input3), container7.appendChild(container9));
    var container11 = makeEl("div", {
      style: "display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-bottom:6px",
    });
    ([-5, -1, 1, 5].forEach(function (item) {
      container11.appendChild(
        makeEl("input", {
          type: "button",
          class: "btn",
          value: (item > 0 ? "+" : "") + item + "ms",
          onclick: function () {
            input3.disabled || setDelay(("" === input2.value ? NaN : Number(input2.value)) + item);
          },
        }),
      );
    }),
      container11.appendChild(
        makeEl("input", {
          type: "button",
          class: "btn",
          value: "补偿归零",
          onclick: function () {
            input3.disabled || setDelay(0);
          },
        }),
      ),
      container7.appendChild(container11),
      container7.appendChild(container10));
    var container12 = makeEl("div", {
      style:
        "display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-bottom:6px;align-items:center",
    });
    container12.appendChild(makeText("队列水位:"));
    var input4 = makeEl("input", {
      type: "number",
      min: 400,
      max: 1500,
      style:
        "width:90px;text-align:center;color:#fff;background:#333;border:1px solid #555;padding:5px;font-size:12px",
    });
    container12.appendChild(input4);
    var input5 = makeEl("input", {
      type: "button",
      class: "btn",
      value: "应用",
      style: "font-size:12px;padding:5px 10px",
      onclick: function () {
        var numericValue = parseInt(input4.value, 10);
        if (isNaN(numericValue)) showAppAlert("请填写队列水位！");
        else {
          var targetIp = getTargetIp();
          targetIp
            ? sendWs(
                { type: "Set_MiPlay_Remote_Tuning", ip: targetIp, queue_target_ms: numericValue },
                function (value4) {
                  isDialogCurrent() &&
                    (showAppAlert(
                      value4 && 200 == value4.code
                        ? "远程参数已应用！"
                        : "远程应用失败（检查音箱在线）！",
                    ),
                    refreshDiagnostics());
                },
              )
            : sendWs(
                { type: "Set_MiPlay_Tuning", queue_target_ms: numericValue },
                function (value4) {
                  isDialogCurrent() &&
                    (showAppAlert(value4 && 200 == value4.code ? "参数已应用！" : "应用失败！"),
                    refreshDiagnostics());
                },
              );
        }
      },
    });
    (container12.appendChild(input5), container7.appendChild(container12));
    var container13 = makeEl("div", {
        style: "display:flex;justify-content:center;gap:6px;margin-bottom:10px;align-items:center",
      }),
      input6 = makeEl("input", {
        type: "button",
        class: "btn",
        value: "♻ 重置队列水位为默认 800ms",
        style: "flex:1;font-size:12px;padding:8px",
        onclick: function () {
          showAppConfirm("将当前目标音箱的延迟参数重置为默认值？", function () {
            var targetIp = getTargetIp();
            targetIp
              ? sendWs(
                  {
                    type: "Set_MiPlay_Remote_Tuning",
                    ip: targetIp,
                    queue_target_ms: 800,
                  },
                  function (value4) {
                    isDialogCurrent() &&
                      (showAppAlert(
                        value4 && 200 == value4.code ? "远程队列水位已重置！" : "远程重置失败！",
                      ),
                      refreshDiagnostics());
                  },
                )
              : sendWs({ type: "Set_MiPlay_Tuning", queue_target_ms: 800 }, function (value4) {
                  isDialogCurrent() &&
                    (showAppAlert(value4 && 200 == value4.code ? "队列水位已重置！" : "重置失败！"),
                    refreshDiagnostics());
                });
          });
        },
      });
    (container13.appendChild(input6),
      container7.appendChild(container13),
      dialogPanel.onClose(function () {
        (clearTimeout(value),
          index++,
          diagnosticRequestId++,
          index2++,
          miPlayAdvDialog === dialogPanel && (miPlayAdvDialog = null));
      }),
      refreshDiagnostics(),
      refreshDevices());
  }
  function isDialogCurrent() {
    return dialogPanel.isOpen() && document.getElementById("miplay_adv_wrap") === dialogPanel.wrap;
  }
  function getTargetIp() {
    var text2 = input.value.trim();
    return text2 || ("local" === select.value ? null : select.value);
  }
  function setDebugControls(value4) {
    ((isEnabled =
      !!value4 &&
      ("boolean" == typeof value4.debug_enabled
        ? value4.debug_enabled
        : !0 !== value4.release_build)),
      (container2.style.display = isEnabled ? "" : "none"),
      (container3.style.display = isEnabled ? "" : "none"),
      clearTimeout(value),
      isEnabled && scheduleRefresh());
  }
  function parseRemoteDiagnostics(message) {
    if (!message || !message.data || !message.data.diag) return null;
    try {
      var parsedData = JSON.parse(message.data.diag);
      return parsedData.data || parsedData;
    } catch (error) {
      return null;
    }
  }
  function requestDiagnostics(value4, value5) {
    isDialogCurrent() &&
      (value4
        ? sendWs({ type: "Get_MiPlay_Remote_Diag", ip: value4 }, function (value6) {
            isDialogCurrent() && value5(parseRemoteDiagnostics(value6));
          })
        : sendWs({ type: "Get_MiPlay_Diag" }, function (message) {
            isDialogCurrent() && value5(message && message.data ? message.data : null);
          }));
  }
  function renderDiagnostics(value4, value5, value6, value7, value8) {
    if (!value6 && value4) {
      if (
        (setDebugControls(value4),
        (function (value10) {
          if (value3 !== getTargetIp() || isEnabled3 || isEnabled4) return;
          ((value2 = parseChannel(value10)), updateChannelButtons());
        })(value4),
        isEnabled)
      ) {
        var numericValue = parseInt(value4.error_us, 10),
          numericValue2 = isMiPlayTimelineValid(value4) ? numericValue : null,
          numericValue3 = parseInt(value4.diag_age_ms, 10),
          isMiPlayDiagFresh2 = isMiPlayDiagFresh(value4),
          isMiPlayDiagRunning2 = isMiPlayDiagRunning(value4),
          miPlayPendingText =
            isMiPlayDiagFresh2 && isMiPlayDiagRunning2
              ? getMiPlayPendingText(value4)
              : "--（非实时/未运行）",
          value9 = isMiPlayPhaseSchema(value4) ? miPlayBlockPhaseMicros(value4) : null,
          numericValue4 = null != value4.render_rate_ppm ? Number(value4.render_rate_ppm) : NaN,
          diagnosticLines = [
            "模式: " +
              (value4.mode || "-") +
              "    播放: " +
              (isMiPlayDiagFresh2 && isMiPlayDiagRunning2
                ? "播放中"
                : !1 === value4.miplay_open || 0 === value4.miplay_open
                  ? "已关闭"
                  : isMiPlayDiagFresh2
                    ? 2 == value4.miplay_state
                      ? "对齐/暂停"
                      : "空闲"
                    : "快照过期/无实时数据"),
            "时间线误差: " +
              (null == numericValue2
                ? "--（等待运行中的实时 sender_clock）"
                : (numericValue2 / 1e3).toFixed(1) + " ms"),
            "参考相位残差: " +
              ("fusion_normalized_head" !== value4.latency_model || null == value9
                ? "--（无同基准计量）"
                : (value9 / 1e3).toFixed(1) + " ms（已扣除回调参考，不是双箱声学差）"),
            "渲染速率修正: " +
              (isMiPlayDiagFresh2 && isMiPlayDiagRunning2 && isFinite(numericValue4)
                ? numericValue4 + " ppm"
                : "--"),
            "PCM 队列: " +
              (isMiPlayDiagFresh2 && isMiPlayDiagRunning2 && null != value4.buffered_ms
                ? value4.buffered_ms
                : "--") +
              " ms",
            "输出端 pending: " + miPlayPendingText,
            "队列水位目标: " + (value4.queue_target_ms || 800) + " ms",
            "同步延迟补偿: " +
              (null != value4.sync_delay_ms
                ? value4.sync_delay_ms + " ms（正值晚播，负值早播）"
                : "旧固件不支持"),
            "声道: " + ["立体声", "仅左", "仅右"][value4.channel || 0],
            "快照: " +
              (isMiPlayDiagFresh2
                ? numericValue3 + " ms 前"
                : numericValue3 >= 0
                  ? "已过期 " + numericValue3 + " ms"
                  : "暂无实时快照"),
          ];
        ("fusion_opensl_refill" !== value4.latency_model &&
          "fusion_normalized_head" !== value4.latency_model) ||
          (diagnosticLines.push(
            "回调调度窗口: " +
              value4.scheduling_horizon_ms +
              " ms（不是实际出声延迟）    输出块: " +
              value4.output_callback_frames +
              " 帧",
          ),
          null != value4.resume_reserve_ms &&
            diagnosticLines.push(
              "同步起播/恢复余量: " + value4.resume_reserve_ms + " ms（对齐后仍保留的 PCM）",
            ),
          diagnosticLines.push(
            "原生缓冲容量: " +
              value4.native_buffer_frames +
              " 帧    补缓冲相位: " +
              (value4.refill_phase_locked ? "已锁定" : "对齐中"),
          ));
        var miPlayPairDelta = getMiPlayPairDelta(value4, value5);
        (null != miPlayPairDelta
          ? diagnosticLines.push(
              (isMiPlayPhaseSchema(value4) ? "台间传输相位估算: " : "台间误差（旧固件估算）: ") +
                (miPlayPairDelta / 1e3).toFixed(1) +
                " ms（本轮实时，本箱相对" +
                (value7 ? "本机" : "目标") +
                "）",
            )
          : value8 &&
            diagnosticLines.push(
              "台间传输相位估算: --（等待本轮双箱运行中、有效且新鲜的同模型数据）",
            ),
          diagnosticLines.push(
            "说明: 传输相位为写入时的预计呈现估算，不是声学测量，不能证明实际出声同步。",
          ),
          (container3.textContent = diagnosticLines.join("\n")));
      }
    } else container3.textContent = "目标音箱不可达（检查 IP / 是否同网段）";
  }
  function scheduleRefresh() {
    (clearTimeout(value),
      isEnabled && isDialogCurrent() && (value = setTimeout(refreshDevices, 2e3)));
  }
  function refreshDevices() {
    isDialogCurrent() &&
      (sendWs({ type: "Get_Lan_Devices" }, function (message) {
        if (isDialogCurrent() && message && message.data && message.data.devices) {
          for (
            var devices = message.data.devices, options = {}, index3 = 0;
            index3 < select.options.length;
            index3++
          )
            options[select.options[index3].value] = !0;
          for (var key in devices)
            if (Object.prototype.hasOwnProperty.call(devices, key) && !options[key]) {
              var text2 = String(devices[key] || key),
                value4 = text2.indexOf("@");
              (value4 > -1 && (text2 = text2.slice(value4 + 1)),
                select.appendChild(
                  makeEl("option", { value: key, html: text2 + " (" + key + ")" }),
                ));
            }
        }
      }),
      (function (value4) {
        if (isEnabled && !isEnabled2) {
          isEnabled2 = !0;
          var callback = function () {
              ((isEnabled2 = !1), "function" == typeof value4 && value4());
            },
            callback2 = function (value6, value7) {
              return value6 === index && getTargetIp() === value7 && isDialogCurrent();
            },
            targetIp = getTargetIp(),
            value5 = ++index,
            targetIp2 = targetIp;
          if (!targetIp2 && !(targetIp2 = state.info.miplay_group_peer || ""))
            for (var index3 = 0; index3 < select.options.length; index3++)
              if ("local" !== select.options[index3].value) {
                targetIp2 = select.options[index3].value;
                break;
              }
          targetIp2
            ? sendWs({ type: "Get_MiPlay_Paired_Diag", ip: targetIp2 }, function (message) {
                if (callback2(value5, targetIp)) {
                  var payload = message && message.data ? message.data : null,
                    local = payload ? payload.local : null,
                    remote = payload ? payload.remote : null;
                  (targetIp
                    ? renderDiagnostics(remote, local, !remote, !0, !0)
                    : renderDiagnostics(local, remote, !local, !1, !0),
                    callback());
                } else callback();
              })
            : requestDiagnostics(null, function (value6) {
                callback2(value5, targetIp)
                  ? (renderDiagnostics(value6, null, !value6, !1, !1), callback())
                  : callback();
              });
        } else "function" == typeof value4 && value4();
      })(scheduleRefresh));
  }
  function parseChannel(value4) {
    return value4 && /^[012]$/.test(String(value4.channel)) ? Number(value4.channel) : null;
  }
  function updateChannelButtons() {
    items.forEach(function (item) {
      item.button.disabled = isEnabled3 || isEnabled4 || item.mode === value2;
    });
  }
  function setDelay(value4) {
    if (!isFinite(value4) || Math.floor(value4) !== value4 || value4 < -500 || value4 > 500)
      showAppAlert("请输入 -500 到 500 的整数毫秒值！");
    else {
      var targetIp = getTargetIp();
      ((input2.value = value4), (input3.disabled = !0));
      var options = {
        type: targetIp ? "Set_MiPlay_Remote_Sync_Delay" : "Set_MiPlay_Sync_Delay",
        sync_delay_ms: value4,
      };
      (targetIp && (options.ip = targetIp),
        sendWs(
          options,
          function (value5) {
            if (isDialogCurrent())
              return value5 && 200 == value5.code
                ? void requestDiagnostics(targetIp, function (value6) {
                    ((input3.disabled = !1),
                      value6 && Number(value6.sync_delay_ms) === value4
                        ? getTargetIp() === targetIp &&
                          ((input2.value = value4),
                          (container10.textContent =
                            "已保存并确认 " +
                            value4 +
                            "ms（正值晚播，负值早播）。音频将重新对齐；以听感判断，不按参考残差自动校准。"))
                        : showAppAlert("同步补偿回读未确认，请检查目标音箱。"));
                  })
                : ((input3.disabled = !1),
                  void showAppAlert(
                    "同步补偿设置失败：" +
                      (value5 && value5.msg ? value5.msg : "音箱无响应/旧固件不支持"),
                  ));
          },
          1e4,
        ));
    }
  }
  function refreshDiagnostics() {
    if (isDialogCurrent()) {
      (setDebugControls(null), index++);
      var targetIp = getTargetIp(),
        value4 = ++diagnosticRequestId;
      (value3 !== targetIp && ((value3 = targetIp), (value2 = null), (isEnabled3 = !1), index2++),
        (isEnabled4 = !0),
        updateChannelButtons());
      var callback = function (value5) {
        isDialogCurrent() &&
          getTargetIp() === targetIp &&
          diagnosticRequestId === value4 &&
          ((isEnabled4 = !1),
          (value2 = parseChannel(value5)),
          updateChannelButtons(),
          value5 &&
            (setDebugControls(value5),
            (input4.value = value5.queue_target_ms || 800),
            null != value5.sync_delay_ms
              ? ((input2.value = value5.sync_delay_ms), (input3.disabled = !1))
              : ((input2.value = 0),
                (input3.disabled = !0),
                (container10.textContent = "目标固件不支持同步补偿，请先更新 EchoService。"))));
      };
      targetIp
        ? sendWs({ type: "Get_MiPlay_Remote_Diag", ip: targetIp }, function (value5) {
            var value6 = null;
            try {
              value6 = parseRemoteDiagnostics(value5);
            } catch (error) {}
            callback(value6);
          })
        : sendWs({ type: "Get_MiPlay_Diag" }, function (message) {
            callback(message && message.data ? message.data : null);
          });
    }
  }
}
var MUSIC_SEARCH_SOURCES = [
    { key: "qq", name: "QQ音乐" },
    { key: "kuwo", name: "酷我" },
    { key: "netease", name: "网易云" },
  ],
  MUSIC_SEARCH_API = R1Config.musicApiUrl,
  MUSIC_SEARCH_STATE = {
    kw: "",
    source: "qq",
    page: 0,
    list: [],
    hasMore: !0,
    status: "输入关键词搜索",
  },
  MUSIC_SEARCH_CANCEL = null,
  MUSIC_SEARCH_ICONS = {
    play: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
    add: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3zM3 16h7v-2H3v2z"/></svg>',
    go: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
  },
  musicSearchDialog = null;
function createMusicSearchDialog() {
  if (musicSearchDialog && musicSearchDialog.isOpen()) musicSearchDialog.close();
  else if ((MUSIC_SEARCH_CANCEL && MUSIC_SEARCH_CANCEL(), hasMusicQueueCapability())) {
    var value = musicQueueContext(),
      mUSICSEARCHSTATE = MUSIC_SEARCH_STATE,
      source = mUSICSEARCHSTATE.source,
      index = 0,
      isEnabled = !1,
      value2 = null,
      isEnabled2 = !1,
      isEnabled3 = !1,
      status = mUSICSEARCHSTATE.status,
      dialogPanel = createDialogPanel("搜索音乐", { transparent: !0, width: "92vw" });
    ((musicSearchDialog = dialogPanel), (dialogPanel.wrap.id = "music_search_wrap"));
    var value3 = null;
    (dialogPanel.onClose(closeSearch),
      (MUSIC_SEARCH_CANCEL = closeSearch),
      "undefined" != typeof MutationObserver &&
        (value3 = new MutationObserver(function () {
          (dialogPanel.isOpen() &&
            document.getElementById("music_search_wrap") === dialogPanel.wrap) ||
            closeSearch();
        })).observe(dialogPanel.host, { childList: !0, subtree: !0 }));
    var text =
        "border:none;border-radius:14px;padding:6px 10px;font-size:12px;color:#fff;cursor:pointer;flex-shrink:0",
      text2 =
        "border:none;border-radius:50%;width:30px;height:30px;color:#fff;cursor:pointer;background:rgba(255,255,255,0.15);flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;padding:0;outline:none",
      container = makeEl("div", {
        style: "display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap",
      }),
      items = [];
    MUSIC_SEARCH_SOURCES.forEach(function (item) {
      var button4 = makeEl("button", {
        type: "button",
        class: "app_btn",
        text: item.name,
        style: text,
        onclick: function () {
          source !== item.key && ((source = item.key), resetSearch(), updateSourceButtons());
        },
      });
      (items.push({ key: item.key, el: button4 }), container.appendChild(button4));
    });
    var container2 = makeEl("div", {
        class: "music_search_pair",
        style:
          "display:flex;flex:1 1 160px;min-width:0;gap:6px;align-items:center;flex-wrap:nowrap",
      }),
      input = makeEl("input", {
        type: "text",
        placeholder: "歌名 / 歌手",
        style:
          "color:#fff;background:transparent;border:1px solid #fff;border-radius:8px;padding:7px 10px;font-size:13px;outline:none;flex:1;min-width:0;width:0;box-sizing:border-box",
      }),
      button = makeEl("button", {
        type: "button",
        class: "app_btn",
        html: MUSIC_SEARCH_ICONS.go,
        title: "搜索",
        style: text2 + ";background:var(--primary-blue)",
      });
    (container2.appendChild(input),
      container2.appendChild(button),
      container.appendChild(container2),
      dialogPanel.body.appendChild(container));
    var container3 = makeEl("div", {
      role: "status",
      "aria-live": "polite",
      style: "font-size:12px;color:rgba(255,255,255,0.65);margin:2px 0 6px;min-height:16px",
    });
    dialogPanel.body.appendChild(container3);
    var resultsContainer = makeEl("div", {
      "aria-busy": "false",
      style: "max-height:44vh;overflow-y:auto",
    });
    dialogPanel.body.appendChild(resultsContainer);
    var container4 = makeEl("div", { style: "display:flex;gap:8px;margin-top:8px" }),
      button2 = makeEl("button", {
        type: "button",
        class: "app_btn",
        text: "全部播放",
        style: text + ";flex:1;background:var(--primary-blue)",
      }),
      button3 = makeEl("button", {
        type: "button",
        class: "app_btn",
        text: "加载更多",
        style: text + ";flex:1;background:rgba(255,255,255,0.15)",
      });
    (container4.appendChild(button2),
      container4.appendChild(button3),
      dialogPanel.body.appendChild(container4),
      (input.oninput = resetSearch),
      (button.onclick = function () {
        searchPage(1);
      }),
      (input.onkeydown = function (value4) {
        "Enter" === value4.key && searchPage(1);
      }),
      (button3.onclick = function () {
        isEnabled ||
          !1 === mUSICSEARCHSTATE.hasMore ||
          mUSICSEARCHSTATE.page < 1 ||
          input.value.trim() !== mUSICSEARCHSTATE.kw ||
          source !== mUSICSEARCHSTATE.source ||
          searchPage(mUSICSEARCHSTATE.page + 1);
      }),
      (button2.onclick = function () {
        isSearchCurrent(index) &&
          (mUSICSEARCHSTATE.list.length
            ? (sendAction(4, 15, -1, buildPlaylistPayload(mUSICSEARCHSTATE.list, 0)),
              setSearchStatus("全部播放（" + mUSICSEARCHSTATE.list.length + " 首）"),
              refreshPlaylist())
            : setSearchStatus("先搜索"));
      }),
      (input.value = mUSICSEARCHSTATE.kw),
      updateSourceButtons(),
      (container3.textContent = mUSICSEARCHSTATE.status),
      updateSearchActions(),
      mUSICSEARCHSTATE.list.length && renderSearchResults());
  }
  function cancelSearch() {
    (index++,
      value2 && value2.abort(),
      (value2 = null),
      isEnabled && (mUSICSEARCHSTATE.status = status),
      (isEnabled = !1),
      (isEnabled3 = !1));
  }
  function closeSearch() {
    isEnabled2 ||
      ((isEnabled2 = !0),
      cancelSearch(),
      value3 && value3.disconnect(),
      musicSearchDialog === dialogPanel && (musicSearchDialog = null),
      MUSIC_SEARCH_CANCEL === closeSearch && (MUSIC_SEARCH_CANCEL = null));
  }
  function isSearchCurrent(value4) {
    return (
      (dialogPanel.isOpen() &&
        document.getElementById("music_search_wrap") === dialogPanel.wrap &&
        isMusicQueueContextCurrent(value)) ||
        closeSearch(),
      !isEnabled2 && value4 === index
    );
  }
  function updateSourceButtons() {
    items.forEach(function (item) {
      item.el.style.background =
        item.key === source ? "var(--primary-blue)" : "rgba(255,255,255,0.12)";
    });
  }
  function updateSearchActions() {
    ((button3.disabled =
      isEnabled ||
      !1 === mUSICSEARCHSTATE.hasMore ||
      mUSICSEARCHSTATE.page < 1 ||
      input.value.trim() !== mUSICSEARCHSTATE.kw ||
      source !== mUSICSEARCHSTATE.source),
      (button3.textContent = isEnabled3
        ? "加载中…"
        : !1 === mUSICSEARCHSTATE.hasMore
          ? "没有更多结果"
          : "加载更多"),
      resultsContainer.setAttribute("aria-busy", isEnabled ? "true" : "false"));
  }
  function resetSearch() {
    (cancelSearch(), (container3.textContent = mUSICSEARCHSTATE.status), updateSearchActions());
  }
  function buildTrackPayload(value4) {
    var options = {
      itemId: value4.id || "",
      title: value4.name || "",
      artist: value4.artist || "",
      album: "",
      albumUrl: value4.pic || "",
      itemType: 0,
    };
    return (
      readUnisoundAvailable() ||
        (options.url = R1Config.musicApiUrl + "?url=" + encodeURIComponent(value4.id || "")),
      options
    );
  }
  function buildPlaylistPayload(value4, value5) {
    return JSON.stringify({
      curItemId: value4[value5] ? value4[value5].id : "",
      index: value5,
      itemList: value4.map(buildTrackPayload),
    });
  }
  function refreshPlaylist() {
    (setTimeout(function () {
      isMusicQueueContextCurrent(value) && sendWs({ type: "list" });
    }, 800),
      setTimeout(function () {
        isMusicQueueContextCurrent(value) && sendWs({ type: "list" });
      }, 2e3));
  }
  function setSearchStatus(text3) {
    ((mUSICSEARCHSTATE.status = text3), (container3.textContent = text3));
  }
  function renderSearchResults() {
    ((resultsContainer.innerHTML = ""),
      mUSICSEARCHSTATE.list.length
        ? mUSICSEARCHSTATE.list.forEach(function (item, index2) {
            var container5 = makeEl("div", {
                style:
                  "display:flex;align-items:center;gap:8px;padding:8px 4px;border-bottom:1px solid rgba(255,255,255,0.08)",
              }),
              container6 = makeEl("div", {
                style: "flex:1;min-width:0;text-align:left",
              });
            (container6.appendChild(
              makeEl("div", {
                style:
                  "font-size:13px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
                text: index2 + 1 + ". " + (item.name || ""),
              }),
            ),
              container6.appendChild(
                makeEl("div", {
                  style:
                    "font-size:11px;color:rgba(255,255,255,0.55);overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
                  text: item.artist || "",
                }),
              ),
              container5.appendChild(container6),
              container5.appendChild(
                makeEl("button", {
                  type: "button",
                  class: "app_btn",
                  html: MUSIC_SEARCH_ICONS.play,
                  title: "播放",
                  style: text2,
                  onclick: function () {
                    isSearchCurrent(index) &&
                      (sendAction(4, 15, -1, buildPlaylistPayload([item], 0)),
                      setSearchStatus("已播放：" + (item.name || "")),
                      refreshPlaylist());
                  },
                }),
              ),
              container5.appendChild(
                makeEl("button", {
                  type: "button",
                  class: "app_btn",
                  html: MUSIC_SEARCH_ICONS.next,
                  title: "下一首播放",
                  style: text2,
                  onclick: function () {
                    isSearchCurrent(index) &&
                      (sendAction(4, 27, -1, JSON.stringify(buildTrackPayload(item))),
                      setSearchStatus("下一首播放：" + (item.name || "")),
                      refreshPlaylist());
                  },
                }),
              ),
              container5.appendChild(
                makeEl("button", {
                  type: "button",
                  class: "app_btn",
                  html: MUSIC_SEARCH_ICONS.add,
                  title: "加入队列末尾",
                  style: text2,
                  onclick: function () {
                    if (isSearchCurrent(index)) {
                      var text3 = "";
                      (state.info &&
                        state.info.music_info &&
                        state.info.music_info.id &&
                        (text3 = state.info.music_info.id),
                        sendAction(
                          4,
                          19,
                          -1,
                          JSON.stringify({
                            curItemId: text3,
                            pageIndex: 1,
                            itemList: [buildTrackPayload(item)],
                          }),
                        ),
                        setSearchStatus("已加入队列末尾：" + (item.name || "")),
                        refreshPlaylist());
                    }
                  },
                }),
              ),
              resultsContainer.appendChild(container5));
          })
        : resultsContainer.appendChild(
            makeEl("div", {
              style: "font-size:12px;color:rgba(255,255,255,0.5);padding:10px 0",
              text: "无结果",
            }),
          ));
  }
  function searchPage(pageNumber) {
    if (isSearchCurrent(index)) {
      var text3 = input.value.trim(),
        source2 = source;
      if (!text3)
        return (cancelSearch(), setSearchStatus("输入关键词"), void updateSearchActions());
      if (!(
        pageNumber > 1 &&
        (isEnabled ||
          mUSICSEARCHSTATE.page < 1 ||
          text3 !== mUSICSEARCHSTATE.kw ||
          source2 !== mUSICSEARCHSTATE.source ||
          pageNumber !== mUSICSEARCHSTATE.page + 1)
      )) {
        cancelSearch();
        var index2 = index;
        ((status = mUSICSEARCHSTATE.status), (isEnabled = !0), (isEnabled3 = pageNumber > 1));
        var itemCount = mUSICSEARCHSTATE.list.length,
          scrollTop = resultsContainer.scrollTop,
          abortControllerInstance =
            "undefined" != typeof AbortController ? new AbortController() : null;
        ((value2 = abortControllerInstance),
          setSearchStatus(pageNumber > 1 ? "正在加载第 " + pageNumber + " 页…" : "搜索中..."),
          updateSearchActions(),
          Promise.resolve()
            .then(function () {
              return isSearchCurrent(index2)
                ? fetch(
                    MUSIC_SEARCH_API +
                      "?keyword=" +
                      encodeURIComponent(text3) +
                      "&source=" +
                      source2 +
                      "&page=" +
                      pageNumber,
                    abortControllerInstance ? { signal: abortControllerInstance.signal } : void 0,
                  )
                : null;
            })
            .then(function (result) {
              return isSearchCurrent(index2) ? result.json() : null;
            })
            .then(function (message) {
              if (isSearchCurrent(index2)) {
                if (
                  !message ||
                  1 != message.code ||
                  !message.data ||
                  !Array.isArray(message.data.list)
                )
                  throw new Error("接口返回异常");
                var list = message.data.list;
                if (
                  ((mUSICSEARCHSTATE.list =
                    1 === pageNumber ? list.slice(0) : mUSICSEARCHSTATE.list.concat(list)),
                  (mUSICSEARCHSTATE.kw = text3),
                  (mUSICSEARCHSTATE.source = source2),
                  (mUSICSEARCHSTATE.page = pageNumber),
                  (mUSICSEARCHSTATE.hasMore = list.length > 0),
                  (isEnabled = !1),
                  (isEnabled3 = !1),
                  (value2 = null),
                  renderSearchResults(),
                  pageNumber > 1)
                ) {
                  var childrenItem = resultsContainer.children[itemCount];
                  if (childrenItem) {
                    var bounds = childrenItem.getBoundingClientRect(),
                      bounds2 = resultsContainer.getBoundingClientRect();
                    ((resultsContainer.scrollTop += bounds.top - bounds2.top),
                      childrenItem.classList.add("search_result_new"));
                  } else resultsContainer.scrollTop = scrollTop;
                  setSearchStatus(
                    list.length
                      ? "已新增 " + list.length + " 首，共 " + mUSICSEARCHSTATE.list.length + " 首"
                      : "没有更多结果，共 " + mUSICSEARCHSTATE.list.length + " 首",
                  );
                } else
                  ((resultsContainer.scrollTop = 0),
                    setSearchStatus(
                      "共 " +
                        mUSICSEARCHSTATE.list.length +
                        " 首（第 " +
                        message.data.page +
                        " 页/每页 " +
                        message.data.page_size +
                        "）",
                    ));
                updateSearchActions();
              }
            })
            .catch(function (error) {
              isSearchCurrent(index2) &&
                ((isEnabled = !1),
                (value2 = null),
                (isEnabled3 = !1),
                setSearchStatus("搜索失败：" + (error && error.message ? error.message : error)),
                updateSearchActions());
            }));
      }
    }
  }
}
function renderHomePage(value) {
  if (
    (null != value.ver && (state.ver = value.ver),
    confirmEchoVersion(value),
    (state.info = value),
    updateUnisoundAvailability(value),
    !loginFlowActive())
  ) {
    if (state.reload) return (clearFlowNotice(), void location.reload());
    if (state.initState)
      return (
        (document.title = "正在获取设备信息。。。"),
        setPageTitle(document.title),
        showFlowNotice("connection", "正在初始化", "连接音箱成功，正在获取设备信息，请稍候。"),
        void runShell("getprop net.hostname && netcfg", "get_hostname")
      );
    ((state.initState1 = !1),
      hideDisconnectedActions(),
      clearFlowNotice(),
      (document.title = "R1音箱控制页面" + state.deviceTag),
      setPageTitle(document.title),
      (ui.textsPanel = buildTextsPanel(value)),
      ui.container.appendChild(ui.textsPanel));
    var bluetoothPanel = buildBluetoothPanel();
    (bluetoothPanel && ui.container.appendChild(bluetoothPanel),
      buildDeviceInfoPanel(),
      isEchoVer(1821) && buildSoundEffectsPanel(),
      isEchoVer(1e3) && buildScreenPanel(),
      (ui.musicPanel = buildMusicPanel(value)),
      ui.container.appendChild(ui.musicPanel),
      ui.container.appendChild(buildVolumePanel(value)));
    var playlistPanel = buildPlaylistPanel();
    (playlistPanel && document.body.appendChild(playlistPanel),
      buildPageSwitcher(),
      buildButtons(),
      (state.renderedUnisoundVersion = state.uVer),
      (state.unisoundVersionReloading = !1),
      sendWs({ type: "max_vol" }),
      updateButtonVisibility(),
      updateVersionFooter(),
      ui.container.appendChild(ui.buttonsPanel),
      startInfoRefresh(),
      sendWs({ type: "get_eq_config" }),
      runShell(
        'echo route0feture: $(getprop persist.route0feture) && echo pram: $(tinymix -D 2 "DSP Firmware PRAM")',
        "dsp_bass_state",
      ),
      navigator.userAgent.indexOf("Firefox") > -1 &&
        insertStyle("input[type=range]{vertical-align:middle}"),
      window.plus &&
        (plus.key.setVolumeButtonEnabled(!1),
        plus.key.addEventListener("volumeupbutton", function () {
          adjustVolume(1);
        }),
        plus.key.addEventListener("volumedownbutton", function () {
          adjustVolume(-1);
        }),
        updateStatusBar(),
        initPlusFeatures()));
    var item = localStorage.getItem(state.hostname + "_page");
    if (item && "index" !== item) {
      var value2 = $("#btn_page_" + item);
      value2 && navigateToPage(value2);
    }
    if (
      (updatePlayerState(state.info),
      (localStorage.getItem("web_ver1") != state.version.web ||
        (window.plus && state.version.app > plus.runtime.versionCode) ||
        state.version.echo > state.ver ||
        (state.isNewUnisound && state.version.unisound > state.uVer)) &&
        (setTimeout(openVersionInfo, 2e3), localStorage.setItem("web_ver1", state.version.web)),
      isEchoVer(1855))
    ) {
      var items = [{ type: "send_to_unisound", data: { type: "get_info" } }];
      (state.isNewUnisound &&
        items.push({
          type: "send_to_unisound",
          data: { type: "api", data: { type: "info" } },
        }),
        sendWs({ type: "sends", list: items }));
    } else
      (state.isNewUnisound &&
        setTimeout(function () {
          sendToUnisound({ type: "api", data: { type: "info" } });
        }, 2e3),
        sendToUnisound({ type: "get_info" }));
    window.onpopstate = function () {
      var item2 = localStorage.getItem(state.hostname + "_page");
      if (item2 && "index" !== item2) {
        var value3 = $("#btn_page_" + item2);
        value3 && navigateToPage(value3);
      }
    };
  }
}
function adjustVolume(value) {
  if (ui.volumeRange && ui.volumeLabel) {
    var value2 = parseInt(ui.volumeRange.value, 10) + value;
    value2 > ui.volumeRange.max ||
      value2 < 0 ||
      ((ui.volumeRange.value = value2),
      clearTimeout(ui.volumeRange._pressTimer),
      (state.mousePressed = !0),
      (ui.volumeRange._pressTimer = setTimeout(function () {
        state.mousePressed = !1;
      }, 600)),
      (ui.volumeLabel.innerHTML = "   " + value2 + "/" + ui.volumeRange.max),
      sendWs({ type: "set_vol", vol: value2 }),
      sendWs({ type: "get_info" }));
  }
}
function buildPageSwitcher() {
  ((ui.switchButtons = makeEl("div")), (state.pageList = []));
  for (
    var items = [
        ["音乐", "music", 1e3],
        ["屏幕", "screen", 1e3],
        ["音效", "sound_effects", 1822],
        ["蓝牙", "bluetooth", 1847],
        ["设备信息", "device_info", 1822],
      ],
      index = 0;
    index < items.length;
    index++
  ) {
    var itemItemItem = items[index][0],
      itemItemItem2 = items[index][1];
    isEchoVer(items[index][2]) &&
      (function (value, value2) {
        var button = makeButton(value, function () {
          navigateToPage(this);
        });
        ((button.id = "btn_page_" + value2),
          button.setAttribute("data", value),
          state.pageList.push([value, value2, button.id]),
          ui.switchButtons.appendChild(button));
      })(itemItemItem, itemItemItem2);
  }
  location.href.indexOf("type=1") > -1
    ? ((ui.switchButtons.style.margin = "20px auto"),
      ui.textsPanel.parentNode.insertBefore(ui.switchButtons, ui.textsPanel))
    : ui.volumeRange &&
      ui.volumeRange.parentElement &&
      ui.volumeRange.parentElement.parentNode &&
      ui.volumeRange.parentElement.parentNode.insertBefore(
        ui.switchButtons,
        ui.volumeRange.parentElement,
      );
}
function buildButtons() {
  ((ui.buttonsPanel = makeEl("div")), (ui.buttons = []));
  for (var index = 0; index < BUTTON_DEFINITIONS.length; index++)
    (function (value) {
      var bUTTONDEFINITIONSItemItem = BUTTON_DEFINITIONS[value][0],
        bUTTONDEFINITIONSItemItem2 = BUTTON_DEFINITIONS[value][1],
        minVer =
          null != bUTTONDEFINITIONSItemItem2.min_ver
            ? bUTTONDEFINITIONSItemItem2.min_ver
            : state.ver,
        maxVer =
          null != bUTTONDEFINITIONSItemItem2.max_ver
            ? bUTTONDEFINITIONSItemItem2.max_ver
            : state.ver,
        value2 =
          null != bUTTONDEFINITIONSItemItem2.min_uver ||
          null != bUTTONDEFINITIONSItemItem2.max_uver,
        minUver =
          null != bUTTONDEFINITIONSItemItem2.min_uver
            ? bUTTONDEFINITIONSItemItem2.min_uver
            : state.uVer,
        maxUver =
          null != bUTTONDEFINITIONSItemItem2.max_uver
            ? bUTTONDEFINITIONSItemItem2.max_uver
            : state.uVer,
        isUnisound =
          null != bUTTONDEFINITIONSItemItem2.is_unisound
            ? bUTTONDEFINITIONSItemItem2.is_unisound
            : state.unisoundAvailable;
      if (
        isEchoVer(minVer) &&
        state.ver - 1 < maxVer + 2 &&
        (!value2 || (isUnisoundVer(minUver) && state.uVer - 1 < maxUver + 2)) &&
        isUnisound === state.unisoundAvailable
      ) {
        var button = makeButton(bUTTONDEFINITIONSItemItem, function () {
          handleButtonClick(this);
        });
        ((button.id = "btn_" + value),
          button.setAttribute("data", JSON.stringify(bUTTONDEFINITIONSItemItem2)),
          bUTTONDEFINITIONSItemItem2.hide && (button.style.display = "none"),
          ui.buttons.push(button),
          ui.buttonsPanel.appendChild(button));
      }
    })(index);
}
function handleButtonClick(element) {
  ((element.disabled = !0),
    setTimeout(function () {
      element.disabled = !1;
    }, 1e3));
  var parsedData = JSON.parse(element.getAttribute("data")),
    inputElement = $("#input");
  if (1 != parsedData.type && 3 != parsedData.type)
    if (2 != parsedData.type)
      if (-1 != parsedData.type) {
        "打开氛围灯" === element.value &&
          isEchoVer(1500) &&
          setTimeout(function () {
            sendAction(4, 67, 0, null);
          }, 500);
        var callback = function () {
          sendConfiguredAction(parsedData);
        };
        "小讯收藏" === element.value || "喜欢的歌" === element.value || "个性电台" === element.value
          ? showAppConfirm("点播" + element.value + "？", callback)
          : showAppConfirm(element.value + "？", callback);
      } else onItemClick(element, parsedData, inputElement);
    else onToggleClick(element, parsedData, inputElement);
  else onInputClick(element, parsedData, inputElement);
}
function onInputClick(input, value, input2) {
  if ("" !== input2.value && "设置氛围灯光颜色" === input.value) {
    var numericValue = parseInt(input2.value, 10);
    isNaN(numericValue) || (0 === numericValue && -1 === input2.value.toLowerCase().indexOf("0x"))
      ? ((input2.value = ""), (value.err = "请输入正确的十六进制颜色！"))
      : (input2.value = numericValue);
  }
  if (!input2.value) {
    var currentValueTip = getCurrentValueTip(input.value);
    if ((currentValueTip && (value.err = currentValueTip + "\r\n" + value.err), value.err)) {
      var textElement = $("#text");
      return (
        textElement && (textElement.value = "[" + input.value + "]:" + value.err),
        void createTextWindow(input.value, value.err, function () {
          input2.focus();
        })
      );
    }
  }
  var items = value.input.split(".");
  if (items.length > 1) {
    for (var items2 = [], index = 0; index < items.length; index++)
      0 === index
        ? ((items2[index] = value.param[items[index]]),
          "object" != typeof items2[index] && (items2[index] = JSON.parse(items2[index])))
        : (items2[index] = items2[index - 1][items[index]]);
    var value2 = items.length - 1;
    (items2[value2]
      ? (items2[value2 - 1][items[value2]] += input2.value)
      : (items2[value2 - 1][items[value2]] = input2.value),
      (value.param[items[0]] = items2[0]));
  } else
    value.param[value.input]
      ? (value.param[value.input] += input2.value)
      : (value.param[value.input] = input2.value);
  var callback = function () {
    var parsedData = JSON.parse(JSON.stringify(value.param));
    "执行shell" !== input.value && (input2.value = "");
    var textElement2 = $("#text");
    (textElement2 && (textElement2.value = "[" + input.value + "]:请稍候。。。"),
      (parsedData.type_id = input.value),
      (parsedData.type = value.ws_type),
      sendWs(parsedData));
  };
  "执行指令" !== input.value
    ? callback()
    : showAppConfirm("确定要执行以下指令吗？\r\n" + input2.value, callback);
}
function getCurrentValueTip(value) {
  var info = state.info;
  if ("修改小讯唤醒词" === value)
    return "当前小讯唤醒词为：\r\n" + (info.main_wakeup_word || []).concat("小讯小讯").join("\r\n");
  if ("修改设备名" === value)
    return null != info.device_name ? "当前设备名为：" + info.device_name : null;
  if ("设置氛围灯亮度" === value)
    return null != info.music_light_luma ? "当前亮度为：" + info.music_light_luma : null;
  if ("设置颜色渐变速度" === value)
    return null != info.music_light_chroma ? "当前渐变速度为：" + info.music_light_chroma : null;
  if ("设置氛围灯光颜色" === value) {
    if (null != info.music_light_color) {
      for (var text = info.music_light_color.toString(16); text.length < 6;) text = "0" + text;
      return "当前灯光颜色为：0x" + text.toUpperCase();
    }
    return null;
  }
  if ("修改小爱唤醒词" === value) {
    var wakeupXiaoaiWord = state.unisoundInfo.Wakeup_Xiaoai_Word;
    return wakeupXiaoaiWord && wakeupXiaoaiWord.length
      ? "当前小爱唤醒词为：\r\n" + wakeupXiaoaiWord
      : null;
  }
  return null;
}
function onToggleClick(input, value, input2) {
  var value2 = value.title.indexOf(input.value);
  if ((-1 === value2 && (value2 = 0), 0 == value.state[0] || 2 == value.state[0])) {
    var tipItem = value.tips ? value.tips[value2] : input.value,
      callback = function () {
        var options = {};
        for (var key in value.param[value2])
          Object.prototype.hasOwnProperty.call(value.param[value2], key) &&
            (options[key] = value.param[value2][key]);
        ((options.type = value.ws_type),
          value.tips &&
            ((options.type_id = value.tips[value2]),
            state.tips_data || (state.tips_data = {}),
            (state.tips_data[options.type_id] = value.succ ? value.succ[value2] : null)),
          sendWs(options));
      };
    0 != value.state[0] || "info.music_light_mode" !== value.state[1]
      ? showAppConfirm(tipItem + "？", callback)
      : callback();
  } else if (1 == value.state[0]) {
    if ("" === input2.value && value.err) {
      var textElement = $("#text");
      return void (
        textElement && (textElement.value = "[" + input.value + "]:" + value.err[value2])
      );
    }
    sendWs(
      JSON.parse(
        JSON.stringify(value.param[value2]).replace(
          "${" + value.input[value2] + "}",
          input2.value[value2],
        ),
      ),
    );
  }
  sendWs({ type: "get_info" });
}
function onItemClick(input, value, input2) {
  var itemType = value.itemType;
  if ("set_background" !== itemType)
    if ("miplay_group" !== itemType)
      if ("miplay_adv" !== itemType)
        if (
          ("reboot_unisound" === itemType &&
            showAppConfirm("确定要重启小讯吗？", function () {
              var value7 = showFlowNotice("unisound", "重启小讯", "正在重启小讯，请稍候。"),
                socket = state.ws;
              ((state.unisoundSkipCheck = null),
                runShell("/system/bin/am force-stop com.phicomm.speaker.device"),
                setTimeout(function () {
                  socket === state.ws &&
                    socket &&
                    socket.readyState === WebSocket.OPEN &&
                    (runShell("/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity"),
                    setTimeout(function () {
                      ui.flowNotice === value7 &&
                        socket === state.ws &&
                        (clearFlowNotice("unisound"), showAppAlert("重启完毕！"));
                    }, 1e4));
                }, 3e3));
            }),
          "reboot" !== itemType)
        )
          if ("open_net_config" !== itemType) {
            if ("upload_page" === itemType) {
              var url = new URL(R1Config.deviceHttpUrl(state.ip, "upload"), location.href),
                text = "",
                value2 = null,
                text2 = "",
                numericValue = 0;
              try {
                ((text2 = getBackgroundData()),
                  (numericValue = Number(
                    localStorage.getItem(state.hostname + "_BackgroundBlur") || "0",
                  )));
              } catch (error) {}
              if (
                (("string" != typeof text2 || text2.length > 2097152) && (text2 = ""),
                text2 &&
                  !/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(text2))
              )
                try {
                  var url2 = new URL(text2);
                  (!/^https?:$/.test(url2.protocol) ||
                    url2.username ||
                    url2.password ||
                    /\.svg$/i.test(url2.pathname) ||
                    /[\x00-\x20<>]/.test(text2)) &&
                    (text2 = "");
                } catch (_) {
                  text2 = "";
                }
              numericValue = isFinite(numericValue) ? Math.max(0, Math.min(60, numericValue)) : 0;
              try {
                var bytes = new Uint8Array(16);
                window.crypto.getRandomValues(bytes);
                for (var index = 0; index < bytes.length; index++)
                  text += ("0" + bytes[index].toString(16)).slice(-2);
                url.hash =
                  "echo-upload-background=" +
                  encodeURIComponent(JSON.stringify({ nonce: text, origin: location.origin }));
              } catch (error) {}
              var value3 = Date.now() + 15e3,
                value4 = null;
              function cleanupUploadHandshake() {
                (window.removeEventListener("message", handleUploadMessage),
                  window.removeEventListener("pagehide", cleanupUploadHandshake),
                  null !== value4 && clearTimeout(value4),
                  (value4 = null));
              }
              function handleUploadMessage(message) {
                var payload = message.data;
                if (
                  value2 &&
                  message.source === value2 &&
                  message.origin === url.origin &&
                  payload &&
                  "echo-upload-background-ready" === payload.type &&
                  payload.nonce === text
                ) {
                  cleanupUploadHandshake();
                  try {
                    value2.postMessage(
                      {
                        type: "echo-upload-background",
                        nonce: text,
                        image: text2,
                        blur: numericValue,
                      },
                      url.origin,
                    );
                  } catch (error) {}
                }
              }
              (window.addEventListener("message", handleUploadMessage),
                window.addEventListener("pagehide", cleanupUploadHandshake));
              try {
                32 === text.length && (value2 = window.open(url.href, "_blank"));
              } catch (error) {}
              return value2
                ? void (value4 = setTimeout(function value7() {
                    value2.closed || Date.now() >= value3
                      ? cleanupUploadHandshake()
                      : (value4 = setTimeout(value7, 500));
                  }, 500))
                : (cleanupUploadHandshake(),
                  (url.hash = ""),
                  showAppAlert(
                    "新窗口被阻止或不支持背景同步，将在当前页面打开上传页，使用上传页默认背景。",
                  ),
                  void (location.href = url.href));
            }
            if ("connect_page" === itemType)
              return -1 === location.href.indexOf(state.controlHost)
                ? void (location.href = R1Config.assetUrl("?no_auto_connect"))
                : (history.replaceState(null, "", location.pathname + "?no_auto_connect"),
                  void history.go(0));
            if ("Voice_time_reporting" !== itemType)
              if ("Auto_restart_device" !== itemType)
                if ("modify_color" !== itemType)
                  if ("xiaoai_settings" !== itemType)
                    if ("reboot_xiaoaiservice" !== itemType)
                      if ("activation_xiaoai" !== itemType) {
                        if ("play_local_music" === itemType) {
                          var value5 = input2.value || "/sdcard/music/",
                            value6 = "播放[" + value5 + "]目录下的音乐？";
                          return (
                            2 != state.info.Current_PlayerType ||
                              state.info.Support_Flac ||
                              (value6 +=
                                "\r\n提示：当前ExoPlayer播放器未安装flac支持库，flac格式音乐将无法正常播放！"),
                            void showAppConfirm(value6, function () {
                              sendWs({
                                type: "play_local_music",
                                path: value5,
                                play: !0,
                              });
                            })
                          );
                        }
                        "reboot_adbd" !== itemType
                          ? "reboot_echo" !== itemType
                            ? "get_song_list" !== itemType || openSongListWindow()
                            : showAppConfirm("确定要重启EchoService吗？", function () {
                                sendWs({ type: "reboot_echo" });
                              })
                          : showAppConfirm("确定要重启adbd吗？", function () {
                              runShell(
                                "stop adbd && start adbd && echo 1 || echo 0",
                                "reboot_adbd",
                              );
                            });
                      } else
                        showAppConfirm("确定要激活小爱吗？", function () {
                          ((input.value = "正在获取激活id，请稍候。。。"),
                            (input.disabled = !0),
                            sendToUnisound({
                              type: "api",
                              data: { type: "get_xiaoai_id" },
                            }));
                        });
                    else
                      showAppConfirm("确定要重启小爱服务吗？", function () {
                        (runShell(
                          "am force-stop com.xiaomi.xiaoailite&am force-stop com.duoqin.ai",
                          "reboot_xiaoaiservice",
                        ),
                          showAppAlert("已发送指令！"));
                      });
                  else
                    showAppConfirm(
                      "确定要打开小爱设置页面吗？\r\n打开后会导致音箱卡顿！\r\n建议在设置前禁用麦克风！",
                      function () {
                        (runShell(
                          "am start -n com.xiaomi.xiaoailite/.presenter.info.PersonalInfoActivity&am start -n com.duoqin.ai/.MainActivity",
                        ),
                          showAppAlert("已打开，请前往屏幕页面查看！"));
                      },
                    );
                else createColorPicker();
              else openAutoRestartPanel();
            else openVoiceTimeReportingPanel();
          } else
            showAppConfirm("确定要打开配网模式吗？\r\n打开后网页控制将断开！", function () {
              (sendAction(262144, 1),
                sendToUnisound({
                  type: "NetworkConfigOutputEvent",
                  status: 1,
                }),
                showAppAlert("已打开！\r\n请使用配网工具进行配网！"),
                (location.href = R1Config.assetUrl("pages/wifi/")));
            });
        else
          showAppConfirm("确定要重启音箱吗？", function () {
            (isEchoVer(1847)
              ? sendWs({ type: "reboot" })
              : runShell("stop adbd&&start adbd&&adb reboot"),
              showAppAlert("已发送重启请求！"));
          });
      else createMiPlayAdvDialog();
    else createMiPlayGroupDialog();
  else createSetBackgroundPage();
}
function sendConfiguredAction(value) {
  var options = {};
  for (var key in value.param)
    Object.prototype.hasOwnProperty.call(value.param, key) && (options[key] = value.param[key]);
  ((options.type = value.ws_type),
    65536 == options.what &&
      1 == options.arg2 &&
      state.isNewUnisound &&
      isUnisoundVer(1849) &&
      5 == state.unisoundInfo.DeviceStatus &&
      sendToUnisound({ type: "UpdateDeviceStatus", status: 0 }),
    sendWs(options));
}
function updateButtonVisibility() {
  if (ui.buttons.length)
    for (var index = 0; index < ui.buttons.length; index++) {
      var buttonItem = ui.buttons[index];
      if ("1" !== buttonItem.getAttribute("skip")) {
        var parsedData = JSON.parse(buttonItem.getAttribute("data"));
        if (2 != parsedData.type || (0 != parsedData.state[0] && 2 != parsedData.state[0]))
          (3 == parsedData.type || parsedData.state) &&
            (buttonItem.style.display = arrIncludes(
              parsedData.state[1] || [],
              getNestedValue(parsedData.state[0]),
            )
              ? ""
              : "none");
        else {
          for (
            var items = [], value = -1, index2 = 0;
            index2 < parsedData.state[2].length;
            index2++
          ) {
            Array.isArray(parsedData.state[2][index2])
              ? (items = items.concat(parsedData.state[2][index2]))
              : items.push(parsedData.state[2][index2]);
            for (var index3 = 0; index3 < items.length; index3++)
              if (items[index3] == getNestedValue(parsedData.state[1])) {
                value = index2;
                break;
              }
            if (-1 !== value) break;
          }
          if (-1 === value) {
            buttonItem.style.display = "none";
            continue;
          }
          (2 == parsedData.state[0]
            ? (buttonItem.style.display =
                getNestedValue(parsedData.state[3][0]) == parsedData.state[3][1] ? "" : "none")
            : (buttonItem.style.display = ""),
            (buttonItem.value = parsedData.title[value]));
        }
      }
    }
}
function getNestedValue(text) {
  for (var items = text.split("."), state2 = state, index = 0; index < items.length; index++) {
    if (null == state2) return;
    state2 = state2[items[index]];
  }
  return state2;
}
function navigateToPage(element) {
  state.currentPage = element;
  var data = element.getAttribute("data");
  element.value !== data ? showPage("index") : showPage(element.id.substr(9));
  for (var buttonElement = $$(".btn"), index = 0; index < buttonElement.length; index++)
    "btn_page" === buttonElement[index].id.substr(0, 8) &&
      buttonElement[index].id !== element.id &&
      (buttonElement[index].value = buttonElement[index].getAttribute("data"));
  element.value !== data
    ? (element.value = data)
    : (element.value = data.length > 2 ? "返回首页" : "首页");
}
function hideAllPages(value) {
  for (
    var value2 = ["index"].concat(
        state.pageList.map(function (item) {
          return item[1];
        }),
      ),
      index = 0;
    index < value2.length;
    index++
  ) {
    var value2Item = value2[index];
    if (value2Item !== value) {
      var options = {
        index: hideIndex,
        music: hideMusic,
        screen: hideScreen,
        sound_effects: hideSoundEffects,
        device_info: hideDeviceInfo,
        bluetooth: hideBluetooth,
      };
      options[value2Item] && options[value2Item]();
    }
  }
}
function showPage(value) {
  ((state.loginIntent || state.loginSession) && (hideLogin(), clearQrCache(), startInfoRefresh()),
    hideAllPages(value));
  for (
    var value2 = ["index"].concat(
        state.pageList.map(function (item) {
          return item[1];
        }),
      ),
      index = 0;
    index < value2.length;
    index++
  ) {
    var value2Item = value2[index];
    if (value2Item === value) {
      var options = {
        index: unhideIndex,
        music: unhideMusic,
        screen: unhideScreen,
        sound_effects: unhideSoundEffects,
        device_info: unhideDeviceInfo,
        bluetooth: unhideBluetooth,
      };
      (options[value2Item] && options[value2Item](),
        localStorage.setItem(state.hostname + "_page", value2Item));
    }
  }
}
function unhideIndex() {
  ((document.title = "R1音箱控制页面" + state.deviceTag),
    setPageTitle(document.title),
    ui.textsPanel && (ui.textsPanel.style.display = "block"),
    ui.buttonsPanel && (ui.buttonsPanel.style.display = "block"));
}
function hideIndex() {
  (ui.textsPanel && (ui.textsPanel.style.display = "none"),
    ui.buttonsPanel && (ui.buttonsPanel.style.display = "none"));
}
function unhideMusic() {
  (startLyrics(),
    ui.applyLyricsModeHeight &&
      ui.musicLyrics &&
      "block" === ui.musicLyrics.style.display &&
      (setTimeout(ui.applyLyricsModeHeight, 0),
      setTimeout(ui.applyLyricsModeHeight, 200),
      setTimeout(ui.applyLyricsModeHeight, 600)),
    (document.title = "R1音箱音乐页面" + state.deviceTag),
    setPageTitle(document.title),
    ui.pageTitle &&
      (ui.pageTitle.onclick = function () {
        ((state.titleDisplayUntil = Date.now() + 2e3),
          setPageTitle(
            state.musicInfo && state.musicInfo.artist
              ? state.musicInfo.title + "-" + state.musicInfo.artist
              : (state.musicInfo ? state.musicInfo.title : "") || "",
          ),
          (document.title = state.deviceTag + (ui.pageTitle ? ui.pageTitle.innerHTML : "")));
      }),
    ui.musicPanel && (ui.musicPanel.style.display = "block"),
    hidePlaylistOverlay(),
    null != ui.musicBackgroundFrame && cancelAnimationFrame(ui.musicBackgroundFrame),
    (ui.musicBackgroundFrame = requestAnimationFrame(function () {
      ((ui.musicBackgroundFrame = null), updateCoverBackground());
    })));
}
function hideMusic() {
  (null != ui.musicBackgroundFrame && cancelAnimationFrame(ui.musicBackgroundFrame),
    (ui.musicBackgroundFrame = null),
    state.lrcFullscreen && exitFullscreenLrc(),
    stopLyrics(),
    ui.pageTitle && (ui.pageTitle.onclick = function () {}),
    ui.musicPanel && (ui.musicPanel.style.display = "none"),
    hidePlaylistOverlay(),
    restoreBackground());
}
function startLyrics() {
  ((state.titleDisplayUntil = Date.now() + 1e3),
    stopLyrics(),
    (timers.lyricsForce = setTimeout(function () {
      ((timers.lyricsForce = null), -1 !== timers.lyrics && updateLyrics(!0));
    }, 1e3)),
    (timers.lyrics = setInterval(function () {
      updateLyrics(!1);
    }, 100)));
}
function stopLyrics() {
  (clearTimeout(timers.lyricsForce),
    (timers.lyricsForce = null),
    clearInterval(timers.lyrics),
    (timers.lyrics = -1));
}
function startInfoRefresh(value) {
  (stopInfoRefresh(),
    (timers.infoRefresh = setInterval(function () {
      state.ws && sendWs({ type: "get_info" });
    }, value || 1e3)));
}
function stopInfoRefresh() {
  (clearInterval(timers.infoRefresh), (timers.infoRefresh = -1));
}
function updateTtsSpeaker(value) {
  sendWs({
    type: "send_message",
    type_id: "修改发音人",
    what: 65536,
    arg1: 0,
    arg2: 2,
    obj: value,
  });
}
function setMusicSource(value) {
  sendWs({
    type: "send_message",
    type_id: "修改音乐源",
    what: 65536,
    arg1: 0,
    arg2: 4,
    obj: value,
  });
}
var speakerRestoreTimer = -1,
  screenFrameUrl = null,
  screenFrameImage = null,
  screenFrameEpoch = 0,
  screenFrameLoad = null,
  screenFramePendingBlob = null;
function releaseScreenFrameLoad(value) {
  ((value.image.onload = value.image.onerror = null),
    value.url && (URL.revokeObjectURL(value.url), (value.url = null)));
}
function clearScreenFrameUrl() {
  (screenFrameEpoch++, (screenFramePendingBlob = null));
  var screenFrameLoad2 = screenFrameLoad;
  ((screenFrameLoad = null),
    screenFrameLoad2 &&
      (releaseScreenFrameLoad(screenFrameLoad2), (screenFrameLoad2.image.src = "")),
    screenFrameImage &&
      ((screenFrameImage.style.visibility = "hidden"), (screenFrameImage.src = "")),
    screenFrameUrl && URL.revokeObjectURL(screenFrameUrl),
    (screenFrameUrl = null),
    (screenFrameImage = null));
}
function setScreenFrame(value) {
  var screenImgElement = $("#screen_img");
  if (
    screenImgElement &&
    ui.screen &&
    "none" !== ui.screen.style.display &&
    state.ws &&
    state.ws.readyState === WebSocket.OPEN
  )
    if (
      (!screenFrameLoad ||
        (screenFrameLoad.socket === state.ws && screenFrameLoad.target === screenImgElement) ||
        clearScreenFrameUrl(),
      screenFrameLoad)
    )
      screenFramePendingBlob = value;
    else {
      var options = {
        image: new Image(),
        target: screenImgElement,
        socket: state.ws,
        epoch: screenFrameEpoch,
        url: null,
        decoding: !1,
      };
      ((screenFrameLoad = options),
        (options.image.onload = function () {
          if (screenFrameLoad === options && !options.decoding)
            if (((options.decoding = !0), "function" == typeof options.image.decode))
              try {
                options.image.decode().then(
                  function () {
                    commitScreenFrame(!0);
                  },
                  function () {
                    commitScreenFrame(!1);
                  },
                );
              } catch (error) {
                commitScreenFrame(!1);
              }
            else commitScreenFrame(!0);
        }),
        (options.image.onerror = function () {
          commitScreenFrame(!1);
        }));
      try {
        ((options.url = URL.createObjectURL(value)), (options.image.src = options.url));
      } catch (error) {
        commitScreenFrame(!1);
      }
    }
  else clearScreenFrameUrl();
  function commitScreenFrame(value2) {
    if (screenFrameLoad === options && options.epoch === screenFrameEpoch)
      if (
        options.socket === state.ws &&
        options.socket.readyState === WebSocket.OPEN &&
        $("#screen_img") === screenImgElement &&
        ui.screen &&
        "none" !== ui.screen.style.display
      ) {
        if (value2) {
          var screenFrameUrl2 = screenFrameUrl;
          ("function" == typeof updateScreenStageSize &&
            updateScreenStageSize(options.image.naturalWidth, options.image.naturalHeight),
            (screenFrameUrl = options.url),
            (screenFrameImage = screenImgElement),
            (screenImgElement.src = options.url),
            (screenImgElement.style.visibility = "visible"),
            (options.url = null),
            screenFrameUrl2 && URL.revokeObjectURL(screenFrameUrl2));
        }
        (releaseScreenFrameLoad(options), (screenFrameLoad = null));
        var screenFramePendingBlob2 = screenFramePendingBlob;
        ((screenFramePendingBlob = null),
          screenFramePendingBlob2 && setScreenFrame(screenFramePendingBlob2));
      } else clearScreenFrameUrl();
  }
}
function cleanupSpeakerConnection(value) {
  (cancelWsCallbacks(value),
    value === state.ws &&
      (clearFlowNotice(),
      (state.unisoundSkipCheck = null),
      showRebootEchoButton(!1),
      stopLyrics(),
      ui.screen && ui.screen.controller && ui.screen.controller.cancelGestures(),
      resetEchoVersionConfirmation(),
      resetUnisoundAvailability(),
      clearTimeout(speakerRestoreTimer),
      (speakerRestoreTimer = -1),
      clearInterval(timers.ping),
      (timers.ping = -1),
      stopInfoRefresh(),
      stopBluetoothRefresh(),
      clearScreenFrameUrl()));
}
function showConnectionNotice(value, value2, value3, value4) {
  var value5 = showFlowNotice("connection", value, value2);
  value5.cancelLabel = "取消连接";
  var socket = state.ws && state.ws.readyState === WebSocket.CONNECTING;
  return (
    !value3 ||
      socket ||
      value5.retryButton ||
      value5.actions.appendChild(
        (value5.retryButton = makeFlowButton("立即连接", function () {
          ui.flowNotice !== value5 ||
            (state.ws && state.ws.readyState === WebSocket.CONNECTING) ||
            (clearTimeout(timers.connect),
            (timers.connect = -1),
            state.ws &&
              state.ws.readyState !== WebSocket.CLOSED &&
              ((state.ws.onclose = function () {}),
              state.ws.close(),
              cleanupSpeakerConnection(state.ws),
              (state.ws = null)),
            value3());
        })),
      ),
    value4 &&
      !value5.cancelButton &&
      value5.actions.appendChild(
        (value5.cancelButton = makeFlowButton(value5.cancelLabel, function () {
          ui.flowNotice === value5 &&
            (clearTimeout(timers.connect),
            (timers.connect = -1),
            state.ws &&
              state.ws.readyState === WebSocket.CONNECTING &&
              ((state.ws.onclose = function () {}),
              state.ws.close(),
              cleanupSpeakerConnection(state.ws),
              (state.ws = null)),
            clearFlowNotice("connection"),
            ui.main && (ui.main.onclick = function () {}),
            setPageTitle("已" + value5.cancelLabel + "，可手动重新连接音箱。"),
            showDisconnectedActions(value3 || connectSpeaker));
        })),
      ),
    value5.cancelButton && (value5.cancelButton.value = value5.cancelLabel),
    value5.retryButton &&
      ((value5.retryButton.style.background = "var(--primary-blue)"),
      (value5.retryButton.style.display = socket ? "none" : "")),
    value4 &&
      (value5.host.onclick = function (event) {
        (event.target !== value5.host && event.target !== value5.host.content) ||
          value5.cancelButton.onclick();
      }),
    value5
  );
}
function connectSpeaker() {
  if (!state.ws || state.ws.readyState !== WebSocket.CONNECTING) {
    if (
      (hideDisconnectedActions(),
      resetEchoVersionConfirmation(),
      resetUnisoundAvailability(),
      state.ver < 1 && (state.ver = 1e3),
      ui.pageTitle && "" === ui.pageTitle.innerHTML && setPageTitle("请稍后。。。"),
      ui.main && (ui.main.onclick = function () {}),
      clearTimeout(timers.connect),
      (timers.connect = -1),
      urlParams.del(["no_auto_connect", "connect_ip", "connect_id"]),
      !state.ip)
    ) {
      var storedR1Endpoint =
        localStorage.getItem("r1_endpoint") ||
        localStorage.getItem("ip") ||
        localStorage.getItem("hostname") ||
        "";
      if (storedR1Endpoint) {
        try {
          state.ip = R1Config.parseDeviceAddress(storedR1Endpoint).address;
        } catch (error) {
          /* 忽略旧的无效地址，保留连接页供用户修正。 */
        }
      }
    }
    if (!state.ip) {
      var host = location.host;
      (-1 === host.indexOf(":") &&
        (IP_PATTERN.test(host) || HOSTNAME_PATTERN.test(host.toLowerCase())) &&
        (host += ":8080"),
        (state.ip = host));
    }
    if (location.host.indexOf(state.controlHost) > -1) {
      var options = { connect_ip: state.ip };
      (null != state.connectId && (options.connect_id = state.connectId), urlParams.put(options));
    }
    (state.ws && state.ws.readyState !== WebSocket.CLOSED) ||
      ((state.ws = createWebSocket(R1Config.parseDeviceAddress(state.ip).url)),
      setPageTitle("正在连接音箱，请稍候。。。"),
      showConnectionNotice(
        "正在连接音箱",
        "正在连接 " + state.ip + "，请稍候。",
        connectSpeaker,
        !0,
      ));
    var socket = state.ws;
    socket &&
      ((socket.onopen = function () {
        if (socket === state.ws) {
          if (state.ip) {
            localStorage.setItem("r1_endpoint", state.ip);
            var host2 = R1Config.parseDeviceAddress(state.ip).host;
            IP_PATTERN.test(host2)
              ? (localStorage.setItem("ip", host2), localStorage.removeItem("hostname"))
              : HOSTNAME_PATTERN.test(host2.toLowerCase()) &&
                (localStorage.setItem("hostname", host2), localStorage.removeItem("ip"));
          }
          if (loginFlowActive())
            return (
              !ui.flowNotice ||
                ("connection" !== ui.flowNotice.kind && "unisound" !== ui.flowNotice.kind) ||
                clearFlowNotice(),
              showRebootEchoButton(!1),
              (state.reload = !1),
              void resumeLoginConnection()
            );
          if (state.initState) {
            ((state.connectInitialized = !0), showRebootEchoButton(!0));
            var value = showFlowNotice(
              "connection",
              "正在初始化",
              "连接音箱成功，正在等待设备初始化，请稍候。",
            );
            (setPageTitle("连接音箱成功，正在初始化。。。"),
              setTimeout(function () {
                socket === state.ws &&
                  socket.readyState === WebSocket.OPEN &&
                  runShell("date & ping -w 1 r1service.wxfsq.com", "ping_r1service");
              }, 600),
              -1 === timers.unisoundInit &&
                isEchoVer(1825) &&
                (timers.unisoundInit = setTimeout(function () {
                  socket !== state.ws ||
                    ui.flowNotice !== value ||
                    loginFlowActive() ||
                    ((state.reload = !0), addRecoveryButtons(value.actions));
                }, 6e3)),
              runShell("/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity"),
              resumeLoginConnection() || sendWs({ type: "get_info" }));
          } else
            (clearFlowNotice("connection"),
              setPageTitle("已恢复连接！"),
              resumeLoginConnection() ||
                (ui.musicPanel && "block" === ui.musicPanel.style.display && startLyrics(),
                clearTimeout(speakerRestoreTimer),
                (speakerRestoreTimer = setTimeout(function () {
                  if (
                    ((speakerRestoreTimer = -1),
                    socket === state.ws &&
                      socket.readyState === WebSocket.OPEN &&
                      !loginFlowActive() &&
                      (state.currentPage || (state.currentPage = $("#btn_page_music")),
                      state.currentPage))
                  ) {
                    var data = state.currentPage.getAttribute("data");
                    data === state.currentPage.value
                      ? setPageTitle("R1音箱控制页面" + state.deviceTag)
                      : ((state.currentPage.value = data), navigateToPage(state.currentPage));
                  }
                }, 1e3)),
                startInfoRefresh()));
        }
      }),
      (socket.onclose = function (value) {
        if ((cleanupSpeakerConnection(socket), socket === state.ws))
          if ((pauseLoginConnection(), 1006 === value.code)) {
            var value2 = showConnectionNotice(
              "连接已断开",
              "与音箱断开连接，1 秒后自动重试。音箱重启时请稍候。",
              connectSpeaker,
              !0,
            );
            (setPageTitle("与音箱断开连接，1秒后尝试重新连接。。。"),
              clearTimeout(timers.connect),
              (timers.connect = setTimeout(function () {
                ui.flowNotice === value2 && connectSpeaker();
              }, 1e3)));
          } else
            showConnectionNotice(
              "连接已关闭",
              "与音箱的连接已关闭，可重试连接。",
              connectSpeaker,
              !0,
            );
      }),
      (socket.onerror = function () {}),
      (socket.onmessage = function (message) {
        socket === state.ws &&
          socket.readyState === WebSocket.OPEN &&
          ("string" == typeof message.data
            ? (state.connectInitialized &&
                ((state.connectInitialized = !1), showRebootEchoButton(!1)),
              handleMessage(JSON.parse(message.data)))
            : ui.screen && "none" !== ui.screen.style.display
              ? setScreenFrame(message.data)
              : (clearScreenFrameUrl(), stopScreenCapture()));
      }));
  }
}
function showRebootEchoButton(value) {
  (clearTimeout(timers.rebootEcho),
    removeEl($("#RebootEcho_btn")),
    value &&
      !loginFlowActive() &&
      (timers.rebootEcho = setTimeout(function () {
        if (!loginFlowActive()) {
          var value2 = makeFlowButton("重启echo", function () {
            ((this.value = "重启中。。。"), (this.disabled = !0), sendWs({ type: "reboot_echo" }));
          });
          value2.id = "RebootEcho_btn";
          var flowNotice = ui.flowNotice;
          flowNotice && "connection" === flowNotice.kind && flowNotice.actions.appendChild(value2);
        }
      }, 3e3)));
}
function openVersionInfo() {
  (createTextWindow(null, getVersionInfo()), ui.popup && (ui.popup._versionInfo = !0));
}
function closeVersionInfoWindow() {
  for (var index = popupRenderHosts.length - 1; index >= 0; index--) {
    var popupRenderHostItem = popupRenderHosts[index];
    popupRenderHostItem._versionInfo &&
      popupRenderHostItem._popupOpen &&
      closePopupAnimated(popupRenderHostItem);
  }
}
function getVersionInfo() {
  var value,
    xiaoaiVercode = state.unisoundInfo.xiaoai_vercode;
  if ("number" == typeof xiaoaiVercode && xiaoaiVercode > 0) {
    var text = String(xiaoaiVercode);
    value =
      xiaoaiVercode > 1e5
        ? "小爱Lite版本：" + text.substring(1).replace(/(\d{3})(?=\d)/g, "$1.")
        : "多亲小爱版本：" + text[0] + "." + text[1] + "." + text.substring(2);
  }
  var text2 =
      !state.isNewUnisound || state.uVer < 1001
        ? "未知"
        : state.uVer.toString().split("").join("."),
    items = [],
    value2 = "new_EchoService版本：" + state.ver.toString().split("").join(".");
  (state.version.echo > state.ver &&
    (value2 += " <a href=\"javascript:app_down('echo');\">下载新版本</a>"),
    items.push(value2),
    items.push("new_EchoService编译时间：" + formatBuildTimestamp(getConfirmedBuildTimestamp())));
  var value3,
    value4 = "new_Unisound版本：" + text2;
  (state.isNewUnisound &&
    state.version.unisound > state.uVer &&
    (value4 += " <a href=\"javascript:app_down('unisound');\">下载新版本</a>"),
    items.push(value4),
    items.push("WEB页面版本：" + state.version.web.toString().split("").join(".")),
    value && items.push(value),
    window.plus
      ? ((value3 = "APP版本：" + plus.runtime.version),
        state.version.app > plus.runtime.versionCode &&
          (value3 += ' <a href="javascript:app_down();">下载新版本</a>'))
      : (value3 =
          '<a href="javascript:app_down();">点击下载R1音箱控制器_' +
          state.version.app.toString().split("").join(".") +
          ".apk</a>"),
    items.push(value3),
    items.push("--------------------"),
    items.push("提示："),
    items.push("双击音量条或标题可解锁音量调节！"),
    items.push("双击封面可切换多行滚动歌词！"),
    items.push("禁用无用的服务可降低资源占用！"),
    items.push("--------------------"),
    items.push("---WEB更新日志---"));
  for (var items2 = [], index = CHANGELOG.length - 1; index >= 0; index--)
    items2.push(CHANGELOG[index]);
  return (items.push(items2.join("\r\n")), items.join("\r\n"));
}
function app_down(value) {
  var echo;
  if (
    (echo =
      "echo" === value
        ? state.downids.echo
        : "unisound" === value
          ? state.downids.unisound
          : state.downids.app)
  )
    if (window.plus) {
      var value2 = plus.webview.create();
      value2.overrideUrlLoading({ mode: "reject" }, function (value3) {
        plus.runtime.openURL(value3.url);
      });
      var request = new plus.net.XMLHttpRequest();
      (request.open("GET", state.downurl + echo),
        request.setRequestHeader("user-Agent", "Mozilla/5.0"),
        (request.onreadystatechange = function () {
          4 === request.readyState &&
            200 === request.status &&
            (value2.loadData(request.responseText, { baseURL: state.downurl + echo }),
            value2.show());
        }),
        request.send());
    } else location.href = "https://r1.wxfsq.com/lanzou.php?id=" + echo;
  else showAppAlert("暂无下载地址");
}
function updateDeviceList(device) {
  for (
    var parsedData = JSON.parse(localStorage.getItem("device_list") || "[]"), value = -1, index = 0;
    index < parsedData.length;
    index++
  )
    if (parsedData[index].hostname === device.hostname) {
      value = index;
      break;
    }
  if (-1 !== value)
    for (var key in device)
      Object.prototype.hasOwnProperty.call(device, key) &&
        null != device[key] &&
        device[key] !== parsedData[value][key] &&
        (parsedData[value][key] = device[key]);
  else parsedData.push(device);
  localStorage.setItem("device_list", JSON.stringify(parsedData));
}
function handleIpInput(input) {
  var text = input && null != input.value ? String(input.value) : "",
    deviceListElement = $("#device_list"),
    getIpBtnElement = $("#get_ip_btn");
  if (deviceListElement) {
    for (var index = 0; index < deviceListElement.length; index++) {
      var hostname = deviceListElement[index].getAttribute("hostname"),
        text2 = hostname ? String(hostname).toLowerCase() : "",
        itemItem = text.split(":")[0];
      if (
        itemItem.toLowerCase() === text2 ||
        itemItem === deviceListElement[index].getAttribute("ip")
      ) {
        ((deviceListElement[index].selected = !0),
          (state.hostname = hostname),
          setBackgroundCss(
            localStorage.getItem(state.hostname + "_background") || DEFAULT_BACKGROUND,
          ),
          updateStatusBar());
        var deviceSid = deviceListElement[index].getAttribute("device_sid");
        getIpBtnElement &&
          getIpBtnElement.style &&
          (getIpBtnElement.setAttribute("device_sid", deviceSid || ""),
          (getIpBtnElement.style.display = deviceSid ? "inline-block" : "none"));
        var connectId = deviceListElement[index].getAttribute("connect_id");
        return void input.setAttribute(
          "connect_id",
          "undefined" === connectId ? "" : connectId || "",
        );
      }
    }
    (getIpBtnElement && getIpBtnElement.style && (getIpBtnElement.style.display = "none"),
      (deviceListElement.value = ""),
      setBackgroundCss(DEFAULT_BACKGROUND),
      updateStatusBar());
  } else getIpBtnElement && getIpBtnElement.style && (getIpBtnElement.style.display = "none");
}
function renderConnectPage() {
  ((document.title = "R1音箱连接页面"),
    setPageTitle("请输入音箱IP进行连接！"),
    ui.pageTitle &&
      (ui.pageTitle.ondblclick = function () {
        ((this.ondblclick = function () {}), loadConsole());
      }));
  var customIpPageElement = makeEl("div", { id: "custom_ip_page" }),
    storedR1Endpoint =
      localStorage.getItem("r1_endpoint") ||
      localStorage.getItem("ip") ||
      localStorage.getItem("hostname") ||
      "";
  -1 != state.connectIp && (storedR1Endpoint = state.connectIp);
  var value = null;
  state.controlHost.indexOf("r1.wxfsq.com") > -1 &&
    window.jQuery &&
    window.jQuery.ajax({
      async: !1,
      type: "POST",
      url: "./ip",
      data: { type: "list" },
      dataType: "json",
      success: function (value3) {
        1 == value3.code && (value = value3.list);
      },
    });
  var element = null;
  if (value) {
    (setPageTitle("请选择或输入音箱IP进行连接！"),
      customIpPageElement.appendChild(makeText("设备：")),
      (element = makeEl("select", {
        id: "device_list",
        style:
          "display:block;margin:10px auto;width:70%;height:50px;font-size:16px;border-radius:15px",
      })));
    for (var index = 0; index < value.length; index++)
      (function (value3, value4) {
        var option = makeEl("option", { value: value4, html: value3.dev_name || value3.hostname });
        (option.setAttribute("hostname", value3.hostname),
          option.setAttribute("ip", value3.ip || ""),
          option.setAttribute("device_sid", value3.device_sid || ""),
          option.setAttribute("connect_id", value3.device_msid || ""),
          element.appendChild(option));
        var text = storedR1Endpoint ? String(storedR1Endpoint).toLowerCase() : "",
          text2 = value3.hostname ? String(value3.hostname).toLowerCase() : "";
        (value3.ip === storedR1Endpoint ||
          text2 === text ||
          (null != state.connectId && state.connectId === value3.device_msid)) &&
          (storedR1Endpoint = value3.ip || value3.hostname);
      })(value[index], index);
    ((element.value = ""),
      (element.onchange = function () {
        var inputElement2 = $("#input");
        if (inputElement2) {
          var receiverItem = this[parseInt(this.value, 10)];
          receiverItem &&
            ((inputElement2.value = receiverItem.getAttribute("ip")
              ? receiverItem.getAttribute("ip")
              : receiverItem.getAttribute("hostname")),
            inputElement2.setAttribute("connect_id", receiverItem.getAttribute("connect_id") || ""),
            handleIpInput(inputElement2));
        }
      }),
      customIpPageElement.appendChild(element));
  } else state.connectId = null;
  customIpPageElement.appendChild(makeText("IP、主机名或 WebSocket 地址："));
  var inputElement = makeEl("input", { type: "text", id: "input" });
  ((inputElement.oninput = function () {
    handleIpInput(this);
  }),
    customIpPageElement.appendChild(inputElement),
    customIpPageElement.appendChild(
      makeButton("连接音箱", function () {
        testSpeakerConnection();
      }),
    ),
    customIpPageElement.appendChild(
      makeButton(
        "获取IP并连接",
        function () {
          fetchAndConnectIp();
        },
        { id: "get_ip_btn", style: "display:none" },
      ),
    ));
  var button = makeButton(
      "切换设备名连接",
      function () {
        showAppConfirm("切换后将使用设备名连接音箱，是否继续？", function () {
          (localStorage.setItem("ip_connect", !1), location.reload());
        });
      },
      { style: "display:none" },
    ),
    container = makeEl("div");
  (container.appendChild(button),
    customIpPageElement.appendChild(container),
    customIpPageElement.appendChild(
      makeButton("进入新UI", function () {
        location.href = R1Config.assetUrl("pages/modern/") + "?" + Date.now();
      }),
    ),
    customIpPageElement.appendChild(
      makeButton("进入配网页面", function () {
        location.href = R1Config.assetUrl("pages/wifi/") + "?" + Date.now();
      }),
    ),
    window.plus &&
      (customIpPageElement.appendChild(
        makeButton("进入ADB控制台", function () {
          openAdb();
        }),
      ),
      customIpPageElement.appendChild(
        makeButton("进入设备扫描控制台", function () {
          openDeviceScan();
        }),
      )),
    customIpPageElement.appendChild(makeDiv("height:10px")),
    ui.container && ui.container.appendChild(customIpPageElement));
  var validAddress = false;
  try {
    validAddress = !!R1Config.parseDeviceAddress(storedR1Endpoint);
  } catch (error) {}
  if (validAddress) {
    if (
      ((inputElement.value = storedR1Endpoint), -1 === location.href.indexOf("no_auto_connect"))
    ) {
      var value2,
        callback = function () {
          if (ui.flowNotice === value2) {
            ui.main && (ui.main.onclick = function () {});
            var getIpBtnElement = $("#get_ip_btn");
            getIpBtnElement && "none" !== getIpBtnElement.style.display
              ? fetchAndConnectIp()
              : testSpeakerConnection();
          }
        };
      ((value2 = showConnectionNotice(
        "自动连接上次设备",
        "2 秒后自动连接 " + storedR1Endpoint + "，也可以立即连接或取消。",
        callback,
        !0,
      )),
        (timers.connect = setTimeout(callback, 2e3)));
    }
  } else
    value && element && "" === element.value && ((element.value = 0), fireEvent(element, "change"));
  (inputElement.value ? handleIpInput(inputElement) : setBackgroundCss(DEFAULT_BACKGROUND),
    updateStatusBar());
}
function fetchAndConnectIp() {
  testSpeakerConnection();
}
function testSpeakerConnection() {
  (state.ws && state.ws.readyState === WebSocket.CONNECTING) ||
    (ui.main && (ui.main.onclick = function () {}),
    clearTimeout(timers.connect),
    (timers.connect = -1),
    requestAndConnect(attemptSpeakerConnection));
}
function attemptSpeakerConnection(value) {
  if (!state.ws || state.ws.readyState !== WebSocket.CONNECTING) {
    hideDisconnectedActions();
    var inputElement = $("#input");
    if (inputElement) {
      var endpoint;
      try {
        endpoint = R1Config.parseDeviceAddress(inputElement.value);
      } catch (error) {
        showAppAlert(error.message);
        return;
      }
      var host = endpoint.host;
      state.ip = endpoint.address;
      var isMatch = IP_PATTERN.test(host);
      state.ws &&
        (clearTimeout(timers.connectTimeout),
        (timers.connectTimeout = -1),
        (state.ws.onclose = function () {}),
        state.ws.close(),
        cleanupSpeakerConnection(state.ws),
        (state.ws = null));
      ui.main && (ui.main.onclick = function () {});
      setPageTitle("请稍候，正在连接音箱。。。");
      state.ws = createWebSocket(endpoint.url);
      if (!state.ws) return;
      var socket = state.ws;
      (showConnectionNotice(
        "正在连接音箱",
        "正在连接 " + state.ip + "，请稍候。",
        testSpeakerConnection,
        "取消连接",
      ),
        (state.ws.onopen = function () {
          if (state.ws === socket) {
            var inputElement2 = $("#input");
            ((state.connectId =
              (inputElement2 && inputElement2.getAttribute("connect_id")) || null),
              clearTimeout(timers.connectTimeout),
              (state.testConnectState = !0),
              (state.connectInitialized = !0),
              loginFlowActive() ||
                (showFlowNotice(
                  "connection",
                  "正在初始化",
                  "连接音箱成功，正在等待设备初始化，请稍候。",
                ),
                showRebootEchoButton(!0),
                setPageTitle("连接音箱成功，正在初始化。。。")),
              localStorage.setItem("r1_endpoint", endpoint.address),
              isMatch
                ? (localStorage.removeItem("hostname"), localStorage.setItem("ip", host))
                : (localStorage.removeItem("ip"), localStorage.setItem("hostname", host)),
              initLogin(),
              connectSpeaker(),
              sendWs({ type: "get_info" }),
              removeEl($("#custom_ip_page")));
          }
        }),
        (state.ws.onclose = function (value2) {
          state.ws === socket &&
            (clearTimeout(timers.connectTimeout),
            (state.testConnectState = !0),
            1006 === value2.code &&
              (cleanupSpeakerConnection(state.ws),
              clearFlowNotice("connection"),
              setPageTitle("请输入音箱IP进行连接！"),
              showAppAlert(
                "连接音箱失败，请确保已安装new_EchoService到音箱！\n请检查音箱IP是否正确或重启音箱再试！",
              )));
        }),
        clearTimeout(timers.connectTimeout),
        (timers.connectTimeout = setTimeout(function () {
          state.ws !== socket ||
            state.testConnectState ||
            (clearFlowNotice("connection"),
            setPageTitle("请输入音箱IP进行连接！"),
            state.ws &&
              ((state.ws.onclose = function () {}),
              state.ws.close(),
              cleanupSpeakerConnection(state.ws)),
            showAppAlert(
              "连接音箱超时，请确保已安装new_EchoService到音箱！\n请检查音箱IP是否正确或重启音箱再试！",
            ));
        }, 25e3)));
    } else showAppAlert("请先输入音箱IP！");
  }
}
function createWebSocket(url) {
  try {
    return new WebSocket(url);
  } catch (error) {
    showAppAlert(
      "连接失败：" +
        error.message +
        ("https:" === location.protocol && /^ws:/.test(url)
          ? "\n可改用 wss:// 代理地址；页面将保留 HTTPS。"
          : ""),
    );
  }
}
var permissionStatus = null,
  currentPermission = "unknown";
function isLocalHostAccess() {
  var hostname = location.hostname;
  return (
    !!hostname &&
    (!!IP_PATTERN.test(hostname) ||
      !!HOSTNAME_PATTERN.test(hostname.toLowerCase()) ||
      "localhost" === hostname ||
      0 === hostname.indexOf("127."))
  );
}
function initLocalNetworkPermission() {
  if (isLocalHostAccess()) currentPermission = "granted";
  else {
    var value = urlParams.get("noCheckPermission");
    if (
      (!value || 1 != value.noCheckPermission) &&
      navigator.permissions &&
      navigator.permissions.query
    )
      try {
        var value2 = navigator.permissions.query({ name: "local-network-access" });
        value2 &&
          "function" == typeof value2.then &&
          value2.then(
            function (result) {
              ((permissionStatus = result),
                applyPermissionState(result.state),
                (result.onchange = function () {
                  applyPermissionState(result.state);
                }));
            },
            function () {},
          );
      } catch (error) {}
  }
}
function applyPermissionState(value) {
  ((currentPermission = value),
    "denied" === value &&
      (urlParams.put({ no_auto_connect: 1 }),
      showAppAlert(
        '⚠️ 本地网络访问权限已被拒绝。\n\n要连接R1音箱，请按以下步骤手动开启：\n1. 点击地址栏左侧的锁图标\n2. 找到"本地网络访问"\n3. 设置为"允许"\n\n更改后页面将自动恢复连接功能。',
      )));
}
function requestAndConnect(onConnect) {
  try {
    var input = $("#input");
    if (/^wss:/.test(R1Config.parseDeviceAddress(input ? input.value : state.ip).url)) {
      onConnect();
      return;
    }
  } catch (error) {
    /* 地址校验由连接入口显示。 */
  }
  "granted" !== currentPermission
    ? "prompt" !== currentPermission
      ? "denied" !== currentPermission
        ? onConnect()
        : onConnect(!0)
      : showAppConfirm(
          '即将连接R1音箱，浏览器将请求"本地网络访问"权限。\n\n请在弹出的权限提示中点击"允许"。',
          function () {
            onConnect();
          },
        )
    : onConnect();
}
function ScreenController(element, value) {
  if (!element || "IMG" !== element.tagName) throw new Error("需要 img 元素");
  ((value = value || {}),
    (this.img = element),
    (this.longPressDelay = value.longPressDelay || 500),
    (this.moveThreshold = value.moveThreshold || 8),
    (this.targetResolution = value.targetResolution || { width: 720, height: 480 }),
    (this.touches = {}),
    (this.mouseActive = !1),
    (this.mouseState = null),
    (this._ignoreMouseUntil = 0),
    (this._lastInputSource = ""),
    (this._rightMouseIntent = !1),
    (this._wheelTime = 0));
  var receiver = this;
  ((this._onPointerDown = function (value2) {
    receiver.onPointerDown(value2);
  }),
    (this._onTouchStart = function (value2) {
      receiver.onTouchStart(value2);
    }),
    (this._onTouchMove = function (value2) {
      receiver.onTouchMove(value2);
    }),
    (this._onTouchEnd = function (value2) {
      receiver.onTouchEnd(value2);
    }),
    (this._onTouchCancel = function (value2) {
      receiver.onTouchCancel(value2);
    }),
    (this._onMouseDown = function (value2) {
      receiver.onMouseDown(value2);
    }),
    (this._onMouseMove = function (value2) {
      receiver.onMouseMove(value2);
    }),
    (this._onMouseUp = function (value2) {
      receiver.onMouseUp(value2);
    }),
    (this._onWheel = function (value2) {
      receiver.onWheel(value2);
    }),
    (this._onContextMenu = function (value2) {
      receiver.onContextMenu(value2);
    }),
    this.initEvents());
}
function NotificationManager() {
  ((this.notificationId = 1001),
    (this.channelId = "MUSIC_PLAYER_CHANNEL"),
    (this.channelName = "R1音箱控制器"),
    (this.currentNotification = null),
    (this.mediaSession = null),
    (this.musicId = null),
    (this.timer = 0),
    (this.pic = { url: "", bitmap: null }),
    this.cancelNotification(),
    this.createChannel());
}
function OkHttpImageFetcher() {
  ((this.connectTimeout = 1e4),
    (this.readTimeout = 1e4),
    (this.writeTimeout = 1e4),
    (this.ClientBuilder = plus.android.importClass("dc.squareup.okhttp3.OkHttpClient$Builder")),
    (this.RequestBuilder = plus.android.importClass("dc.squareup.okhttp3.Request$Builder")),
    (this.TimeUnit = plus.android.importClass("java.util.concurrent.TimeUnit")),
    (this.BitmapFactory = plus.android.importClass("android.graphics.BitmapFactory")),
    (this.Handler = plus.android.importClass("android.os.Handler")),
    (this.Looper = plus.android.importClass("android.os.Looper")));
  try {
    var strictModeClass = plus.android.importClass("android.os.StrictMode"),
      strictModeThreadPolicyClass = plus.android.importClass("android.os.StrictMode$ThreadPolicy");
    strictModeClass.setThreadPolicy(new strictModeThreadPolicyClass.Builder().permitAll().build());
  } catch (error) {}
}
function compressImageToDataUrl(value, value2, value3, value4, value5) {
  var reader = new FileReader();
  ((reader.onload = function (event) {
    var image = new Image();
    ((image.onload = function () {
      var canvas = document.createElement("canvas"),
        drawingContext = canvas.getContext("2d"),
        width = image.width,
        height = image.height;
      ((width > 1920 || height > 1920) &&
        (width > height
          ? ((width = 1920), (height = Math.round((1920 * image.height) / image.width)))
          : ((height = 1920), (width = Math.round((1920 * image.width) / image.height)))),
        (canvas.width = width),
        (canvas.height = height),
        drawingContext.drawImage(image, 0, 0, width, height));
      var value6 = canvas.toDataURL("image/jpeg", value2),
        value7 = Math.round(0.75 * value6.length);
      value7 > value3 && value4 > 1 && value2 > 0.1
        ? compressImageToDataUrl(value, value2 - 0.1, value3, value4 - 1, value5)
        : value5(value6, value7);
    }),
      (image.onerror = function () {
        value5(null, 0);
      }),
      (image.src = event.target.result));
  }),
    (reader.onerror = function () {
      value5(null, 0);
    }),
    reader.readAsDataURL(value));
}
function createSetBackgroundPage() {
  var dialogPanel = createDialogPanel("设置背景图片"),
    body = dialogPanel.body;
  ((body.style.color = "#fff"),
    body.appendChild(makeDiv("height:10px")),
    body.appendChild(makeText("上传图片：")));
  var input = makeEl("input", {
    type: "file",
    accept: "image/*",
    style: "height:30px;width:180px",
  });
  (body.appendChild(input),
    body.appendChild(makeDiv("height:5px")),
    body.appendChild(makeText("图片地址：")));
  var input2 = makeEl("input", { type: "text", style: "height:30px;width:180px" });
  (body.appendChild(input2), body.appendChild(makeDiv("height:5px")));
  var container = makeEl("div");
  container.appendChild(makeText("背景模糊："));
  var item = localStorage.getItem(state.hostname + "_BackgroundBlur");
  (null != item && "" !== item) || (item = 0);
  var backgroundBlurElement = makeEl("input", {
    id: "BackgroundBlur",
    type: "range",
    min: 0,
    step: 1,
    max: 60,
    style: "width:130px",
    value: item,
  });
  container.appendChild(backgroundBlurElement);
  var textNode = makeText(item + "px");
  ((textNode.id = "BackgroundBlurText"),
    container.appendChild(textNode),
    backgroundBlurElement.addEventListener("input", function () {
      var value = this.value;
      (localStorage.setItem(state.hostname + "_BackgroundBlur", value),
        (textNode.innerHTML = value + "px"),
        ui.background && (ui.background.style.filter = "blur(" + value + "px)"),
        updateStatusBar());
    }),
    body.appendChild(container),
    body.appendChild(makeDiv("height:5px")));
  var button = makeButton(
    "设置背景图片",
    function () {
      var receiver = this;
      input.value
        ? showAppConfirm("确定要设置新的背景吗？", function () {
            var fileItem = input.files[0];
            fileItem &&
              ((receiver.disabled = !0),
              (receiver.value = "正在处理。。。"),
              compressImageToDataUrl(fileItem, 1, 1048576, 10, function (value, value2) {
                (dialogPanel.isOpen() &&
                  ((receiver.disabled = !1), (receiver.value = "设置背景图片")),
                  value
                    ? (applyBackground(value), dialogPanel.close())
                    : dialogPanel.isOpen() && showAppAlert("抱歉，图片过大，请手动压缩后再上传！"));
              }));
          })
        : input2.value
          ? showAppConfirm("确定要设置新的背景吗？", function () {
              (applyBackground(input2.value), dialogPanel.close());
            })
          : showAppAlert("请先选择图片文件或输入图片地址！");
    },
    { style: "margin:5px;padding:10px 23px" },
  );
  (body.appendChild(button),
    body.appendChild(makeEl("div")),
    body.appendChild(
      makeButton(
        "恢复默认背景",
        function () {
          showAppConfirm("确定要恢复默认背景吗？", function () {
            (applyBackground(""), dialogPanel.close());
          });
        },
        { style: "margin:5px;padding:10px 23px" },
      ),
    ),
    body.appendChild(makeEl("div")),
    body.appendChild(
      makeButton(
        "查看当前背景",
        function () {
          var backgroundData = getBackgroundData();
          backgroundData
            ? showAppAlert(
                "当前背景：自定义\n" +
                  (backgroundData.length > 120
                    ? backgroundData.substring(0, 120) + "..."
                    : backgroundData),
              )
            : showAppAlert("当前背景：默认");
        },
        { style: "margin:5px;padding:10px 23px" },
      ),
    ),
    body.appendChild(makeDiv("height:10px")));
}
function initPlusFeatures() {
  if (window.plus && !window._plusReady) {
    ((window._plusReady = !0),
      updateVersionFooter(),
      plus.webview
        .currentWebview()
        .overrideUrlLoading({ mode: "allow", match: ".*wxfsq.*|.*:8080.*" }, function (value2) {
          if (/(jq|qm)\.qq\.com/.test(value2.url)) {
            var value3 = plus.webview.create(value2.url);
            value3.onloaded = function () {
              setTimeout(function () {
                value3.close();
              }, 2e3);
            };
          } else plus.runtime.openURL(value2.url);
        }));
    try {
      var contextClass = plus.android.importClass("android.content.Context"),
        intentClass = plus.android.importClass("android.content.Intent"),
        settingsClass = plus.android.importClass("android.provider.Settings"),
        uriClass = plus.android.importClass("android.net.Uri"),
        value = plus.android.runtimeMainActivity(),
        systemService = value.getSystemService(contextClass.POWER_SERVICE);
      "2" === localStorage.getItem("power") ||
        systemService.isIgnoringBatteryOptimizations(value.getPackageName()) ||
        plus.nativeUI.confirm(
          "是否允许软件后台运行？",
          function (value2) {
            if (0 === value2.index) {
              var intentClassInstance = new intentClass(
                settingsClass.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
              );
              (intentClassInstance.setData(uriClass.parse("package:" + value.getPackageName())),
                value.startActivity(intentClassInstance));
            } else 1 === value2.index && localStorage.setItem("power", "2");
          },
          {
            title: "请求忽略电池优化",
            buttons: ["允许", "拒绝"],
            verticalAlign: "center",
          },
        );
    } catch (error) {}
    try {
      state.notificationManager = new NotificationManager();
    } catch (error) {}
    var callback = function () {
      var notificationManager = state.notificationManager;
      if (notificationManager) {
        var mediaSession = notificationManager.mediaSession;
        if (
          ((notificationManager.mediaSession = null),
          notificationManager.cancelNotification(),
          mediaSession)
        )
          try {
            mediaSession.release();
          } catch (error) {}
      }
    };
    try {
      ((plus.android.runtimeMainActivity().onDestroy = callback),
        document.addEventListener(
          "pause",
          function () {
            plus.webview.all().length <= 1 && callback();
          },
          !1,
        ),
        plus.key.addEventListener(
          "backbutton",
          function () {
            (callback(), plus.runtime.quit());
          },
          !1,
        ));
    } catch (error) {}
    updateStatusBar();
  }
}
function loadConsole() {
  if (!$("#console_script")) {
    var consoleScriptElement = makeEl("script", {
      id: "console_script",
      src: R1Config.assetUrl("assets/vendor/vconsole/vconsole.min.js"),
      onload: function () {
        try {
          window.mVConsole = new window.VConsole();
        } catch (error) {}
      },
      onerror: function () {
        var script = makeEl("script", {
          src: "https://unpkg.com/vconsole@latest/dist/vconsole.min.js",
          onload: function () {
            try {
              window.mVConsole = new window.VConsole();
            } catch (error) {}
          },
        });
        document.head.appendChild(script);
      },
    });
    document.head.appendChild(consoleScriptElement);
  }
}
function addNoReferrer() {
  var metaElement = document.createElement("meta");
  ((metaElement.name = "referrer"),
    (metaElement.content = "never"),
    document.head.appendChild(metaElement));
}
function loadJQuery() {
  if (window.jQuery)
    try {
      window.jQuery.noConflict();
    } catch (error) {}
  else {
    var callback = function () {
        if ((addNoReferrer(), window.jQuery && window.jQuery.noConflict))
          try {
            window.jQuery.noConflict();
          } catch (error) {}
      },
      script = makeEl("script", {
        src: R1Config.assetUrl("assets/vendor/jquery/jquery-3.6.0.min.js"),
        onload: callback,
        onerror: function () {
          var script2 = makeEl("script", {
            src: "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js",
            onload: callback,
          });
          document.head.appendChild(script2);
        },
      });
    document.head.appendChild(script);
  }
}
function load() {
  if (!document.body.contains(ui.main)) {
    window.addEventListener("message", function (message) {
      switch (message.data.type) {
        case "save_config":
          for (var key in message.data.config)
            Object.prototype.hasOwnProperty.call(message.data.config, key) &&
              localStorage.setItem(key, message.data.config[key]);
          (localStorage.setItem("config_time", Date.now()),
            message.source.postMessage({ type: "save_config_success" }, message.origin));
          break;
        case "get_config":
          for (
            var options = {}, value2 = Object.keys(localStorage), index = 0;
            index < value2.length;
            index++
          )
            options[value2[index]] = localStorage.getItem(value2[index]);
          message.source.postMessage({ type: "save_config", config: options }, message.origin);
          break;
        case "update_config":
          message.data.time > (localStorage.getItem("config_time") || 0) &&
            message.source.postMessage({ type: "get_config" }, message.origin);
          break;
        case "save_config_success":
          window.save_config_success && window.save_config_success();
      }
    });
    var value = getparam("type");
    if (value && "message" === value.type) window.onload = function () {};
    else {
      initLocalNetworkPermission();
      var elementsByTagName = document.getElementsByTagName("h3");
      (elementsByTagName.length > 0 && (elementsByTagName[0].innerHTML = "页面加载中。。"),
        (ui.main = makeEl("div", { style: "height:100%" })),
        (ui.container = makeEl("div", {
          id: "divs",
          style: "text-align:center;display:block;margin:0 auto",
        })),
        (ui.pageTitle = makeEl("h3")),
        (ui.popup = createPopupHost({ open: !1 })),
        (ui.background = makeEl("div", {
          id: "background_div",
          style: "z-index:-1;position:fixed;left:0;top:0;width:100%;height:100%",
        })),
        document.body.appendChild(ui.main));
      var statusBarElement = makeEl("div", { id: "StatusBar", style: "display:none" });
      ((ui.statusBar = statusBarElement),
        ui.main.appendChild(statusBarElement),
        addNoReferrer(),
        location.href.indexOf("debug") > -1 && loadConsole(),
        ui.main.appendChild(ui.container),
        (ui.container.innerHTML = ""),
        ui.container.appendChild(makeEl("div", { class: "scroll-container" }, ui.pageTitle)),
        initLogin(),
        ui.container.appendChild(ui.loginPanel),
        loadJQuery());
      var verDivElement = makeEl("div", {
        id: "ver_div",
        style: "position:absolute;right:5px",
        html: '<a href="javascript:app_down();">下载APP</a>',
      });
      (ui.main.appendChild(verDivElement),
        updateVersionFooter(),
        ui.main.appendChild(makeEl("div", { style: "height:18px" })));
    }
  }
}
((ScreenController.prototype.setTargetResolution = function (value, value2) {
  this.targetResolution = { width: value, height: value2 };
}),
  (ScreenController.prototype.destroy = function () {
    var image = this.img;
    (image.removeEventListener("pointerdown", this._onPointerDown),
      image.removeEventListener("touchstart", this._onTouchStart),
      image.removeEventListener("touchmove", this._onTouchMove),
      image.removeEventListener("touchend", this._onTouchEnd),
      image.removeEventListener("touchcancel", this._onTouchCancel),
      image.removeEventListener("mousedown", this._onMouseDown),
      image.removeEventListener("wheel", this._onWheel),
      image.removeEventListener("contextmenu", this._onContextMenu),
      this.cancelGestures());
  }),
  (ScreenController.prototype.cancelGestures = function () {
    for (var value = Object.keys(this.touches), index = 0; index < value.length; index++)
      clearTimeout(this.touches[value[index]].longPressTimer);
    (this.mouseState && clearTimeout(this.mouseState.longPressTimer),
      (this.touches = {}),
      (this.mouseActive = !1),
      (this.mouseState = null),
      (this._rightMouseIntent = !1),
      document.removeEventListener("mousemove", this._onMouseMove),
      document.removeEventListener("mouseup", this._onMouseUp));
  }),
  (ScreenController.prototype.eventInputSource = function (event) {
    return (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) ||
      "touch" === event.pointerType
      ? "touch"
      : event.pointerType || "";
  }),
  (ScreenController.prototype.onPointerDown = function (value) {
    var value2 = this.eventInputSource(value);
    (value2 && (this._lastInputSource = value2),
      (this._rightMouseIntent =
        "mouse" === value2 && 2 === value.button && 0 === Object.keys(this.touches).length));
  }),
  (ScreenController.prototype.isTouchMouseEvent = function (event) {
    return (
      "touch" === event.pointerType ||
      (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) ||
      Object.keys(this.touches).length > 0 ||
      Date.now() < this._ignoreMouseUntil
    );
  }),
  (ScreenController.prototype.toNormalized = function (value, value2) {
    var bounds = this.img.getBoundingClientRect(),
      value3 = Math.max(0, Math.min(bounds.width, value - bounds.left)),
      value4 = Math.max(0, Math.min(bounds.height, value2 - bounds.top));
    return {
      nx: bounds.width > 0 ? value3 / bounds.width : 0,
      ny: bounds.height > 0 ? value4 / bounds.height : 0,
    };
  }),
  (ScreenController.prototype.toDevice = function (value, value2) {
    return {
      x: Math.round(value * this.targetResolution.width),
      y: Math.round(value2 * this.targetResolution.height),
    };
  }),
  (ScreenController.prototype.emit = function (value) {
    "function" == typeof sendAdbInput && sendAdbInput(value);
  }),
  (ScreenController.prototype.onTouchStart = function (event) {
    (!1 !== event.cancelable && event.preventDefault(),
      (this._ignoreMouseUntil = Date.now() + 800),
      (this._lastInputSource = "touch"),
      (this._rightMouseIntent = !1),
      this.mouseState &&
        (clearTimeout(this.mouseState.longPressTimer),
        (this.mouseActive = !1),
        (this.mouseState = null),
        document.removeEventListener("mousemove", this._onMouseMove),
        document.removeEventListener("mouseup", this._onMouseUp)));
    for (var index = 0; index < event.changedTouches.length; index++)
      this.touches[event.changedTouches[index].identifier] ||
        function (event2) {
          var value = this.toNormalized(event2.clientX, event2.clientY),
            options = {
              id: event2.identifier,
              startX: event2.clientX,
              startY: event2.clientY,
              startTime: Date.now(),
              hasMoved: !1,
              longPressed: !1,
              longPressTimer: null,
              startDev: this.toDevice(value.nx, value.ny),
            };
          ((options.longPressTimer = setTimeout(function () {
            options.hasMoved || (options.longPressed = !0);
          }, this.longPressDelay)),
            (this.touches[event2.identifier] = options));
        }.call(this, event.changedTouches[index]);
  }),
  (ScreenController.prototype.onTouchMove = function (event) {
    (!1 !== event.cancelable && event.preventDefault(),
      (this._ignoreMouseUntil = Date.now() + 800),
      (this._lastInputSource = "touch"),
      (this._rightMouseIntent = !1));
    for (var index = 0; index < event.changedTouches.length; index++) {
      var changedToucheItem = event.changedTouches[index],
        toucheItem = this.touches[changedToucheItem.identifier];
      if (toucheItem) {
        var value = changedToucheItem.clientX - toucheItem.startX,
          value2 = changedToucheItem.clientY - toucheItem.startY;
        !toucheItem.hasMoved &&
          Math.sqrt(value * value + value2 * value2) > this.moveThreshold &&
          ((toucheItem.hasMoved = !0), clearTimeout(toucheItem.longPressTimer));
      }
    }
  }),
  (ScreenController.prototype.onTouchEnd = function (event) {
    (!1 !== event.cancelable && event.preventDefault(),
      (this._ignoreMouseUntil = Date.now() + 800),
      (this._lastInputSource = "touch"),
      (this._rightMouseIntent = !1));
    for (var index = 0; index < event.changedTouches.length; index++) {
      var changedToucheItem = event.changedTouches[index],
        toucheItem = this.touches[changedToucheItem.identifier];
      if (toucheItem) {
        clearTimeout(toucheItem.longPressTimer);
        var value = this.toNormalized(changedToucheItem.clientX, changedToucheItem.clientY),
          point = this.toDevice(value.nx, value.ny),
          value2 = Date.now() - toucheItem.startTime;
        (toucheItem.hasMoved
          ? this.emit(
              "swipe " +
                toucheItem.startDev.x +
                " " +
                toucheItem.startDev.y +
                " " +
                point.x +
                " " +
                point.y +
                " " +
                Math.max(50, Math.min(1e3, value2)),
            )
          : toucheItem.longPressed || value2 >= this.longPressDelay
            ? this.emit(
                "swipe " +
                  toucheItem.startDev.x +
                  " " +
                  toucheItem.startDev.y +
                  " " +
                  toucheItem.startDev.x +
                  " " +
                  toucheItem.startDev.y +
                  " " +
                  Math.max(value2, this.longPressDelay),
              )
            : this.emit("tap " + point.x + " " + point.y),
          delete this.touches[changedToucheItem.identifier]);
      }
    }
  }),
  (ScreenController.prototype.onTouchCancel = function (event) {
    (!1 !== event.cancelable && event.preventDefault(),
      (this._ignoreMouseUntil = Date.now() + 800),
      (this._lastInputSource = "touch"),
      (this._rightMouseIntent = !1));
    for (var index = 0; index < event.changedTouches.length; index++) {
      var identifier = event.changedTouches[index].identifier;
      (this.touches[identifier] && clearTimeout(this.touches[identifier].longPressTimer),
        delete this.touches[identifier]);
    }
  }),
  (ScreenController.prototype.onMouseDown = function (event) {
    var value = this.eventInputSource(event);
    if ((value && (this._lastInputSource = value), 2 !== event.button)) {
      if (
        ((this._rightMouseIntent = !1),
        0 === event.button && !this.mouseActive && !this.isTouchMouseEvent(event))
      ) {
        event.preventDefault();
        var value2 = this.toNormalized(event.clientX, event.clientY);
        this.mouseActive = !0;
        var options = {
            startX: event.clientX,
            startY: event.clientY,
            startTime: Date.now(),
            hasMoved: !1,
            longPressed: !1,
            longPressTimer: null,
            startDev: this.toDevice(value2.nx, value2.ny),
          },
          receiver = this;
        ((options.longPressTimer = setTimeout(function () {
          receiver.mouseState !== options || options.hasMoved || (options.longPressed = !0);
        }, this.longPressDelay)),
          (this.mouseState = options),
          document.addEventListener("mousemove", this._onMouseMove),
          document.addEventListener("mouseup", this._onMouseUp));
      }
    } else
      this._rightMouseIntent =
        0 === Object.keys(this.touches).length &&
        ("mouse" === value ||
          (!value && "touch" !== this._lastInputSource && "pen" !== this._lastInputSource));
  }),
  (ScreenController.prototype.onMouseMove = function (event) {
    if (this.mouseActive && this.mouseState) {
      var mouseState = this.mouseState,
        value = event.clientX - mouseState.startX,
        value2 = event.clientY - mouseState.startY;
      !mouseState.hasMoved &&
        Math.sqrt(value * value + value2 * value2) > this.moveThreshold &&
        ((mouseState.hasMoved = !0), clearTimeout(mouseState.longPressTimer));
    }
  }),
  (ScreenController.prototype.onMouseUp = function (event) {
    if (this.mouseActive && this.mouseState && 0 === event.button) {
      var mouseState = this.mouseState;
      clearTimeout(mouseState.longPressTimer);
      var value = this.toNormalized(event.clientX, event.clientY),
        point = this.toDevice(value.nx, value.ny),
        value2 = Date.now() - mouseState.startTime;
      (mouseState.hasMoved
        ? this.emit(
            "swipe " +
              mouseState.startDev.x +
              " " +
              mouseState.startDev.y +
              " " +
              point.x +
              " " +
              point.y +
              " " +
              Math.max(50, Math.min(1e3, value2)),
          )
        : mouseState.longPressed || value2 >= this.longPressDelay
          ? this.emit(
              "swipe " +
                mouseState.startDev.x +
                " " +
                mouseState.startDev.y +
                " " +
                mouseState.startDev.x +
                " " +
                mouseState.startDev.y +
                " " +
                Math.max(value2, this.longPressDelay),
            )
          : this.emit("tap " + point.x + " " + point.y),
        (this.mouseActive = !1),
        (this.mouseState = null),
        document.removeEventListener("mousemove", this._onMouseMove),
        document.removeEventListener("mouseup", this._onMouseUp));
    }
  }),
  (ScreenController.prototype.onWheel = function (event) {
    if ((event.preventDefault(), !(Date.now() - this._wheelTime <= 100))) {
      this._wheelTime = Date.now();
      var value = this.toNormalized(event.clientX, event.clientY),
        point = this.toDevice(value.nx, value.ny),
        value2 = point.y - (event.deltaY > 0 ? 100 : -100);
      this.emit("swipe " + point.x + " " + point.y + " " + point.x + " " + value2 + " 100");
    }
  }),
  (ScreenController.prototype.onContextMenu = function (event) {
    !1 !== event.cancelable && event.preventDefault();
    var value = this.eventInputSource(event),
      rightMouseIntent = this._rightMouseIntent;
    ((this._rightMouseIntent = !1),
      ("touch" !== value && "pen" !== value) || (this._lastInputSource = value),
      !rightMouseIntent ||
        2 !== event.button ||
        (value && "mouse" !== value) ||
        Object.keys(this.touches).length > 0 ||
        this.emit("keyevent KEYCODE_BACK"));
  }),
  (ScreenController.prototype.initEvents = function () {
    var image = this.img;
    (image.addEventListener("pointerdown", this._onPointerDown),
      image.addEventListener("touchstart", this._onTouchStart, { passive: !1 }),
      image.addEventListener("touchmove", this._onTouchMove, { passive: !1 }),
      image.addEventListener("touchend", this._onTouchEnd, { passive: !1 }),
      image.addEventListener("touchcancel", this._onTouchCancel, { passive: !1 }),
      image.addEventListener("mousedown", this._onMouseDown),
      image.addEventListener("wheel", this._onWheel, { passive: !1 }),
      image.addEventListener("contextmenu", this._onContextMenu));
  }),
  (NotificationManager.prototype.createChannel = function () {
    try {
      var value = plus.android.runtimeMainActivity(),
        buildClass = plus.android.importClass("android.os.Build"),
        contextClass = plus.android.importClass("android.content.Context"),
        notificationManagerClass = plus.android.importClass("android.app.NotificationManager"),
        notificationChannelClass = plus.android.importClass("android.app.NotificationChannel"),
        mediaSessionClass = plus.android.importClass("android.media.session.MediaSession");
      if (buildClass.VERSION.SDK_INT <= 29) return;
      ((this.mediaSession = new mediaSessionClass(value.getApplicationContext(), "MusicSession")),
        this.mediaSession.setFlags(
          mediaSessionClass.FLAG_HANDLES_MEDIA_BUTTONS |
            mediaSessionClass.FLAG_HANDLES_TRANSPORT_CONTROLS,
        ));
      var notificationChannelClassInstance = new notificationChannelClass(
        this.channelId,
        this.channelName,
        notificationManagerClass.IMPORTANCE_LOW,
      );
      (notificationChannelClassInstance.setShowBadge(!1),
        notificationChannelClassInstance.setLockscreenVisibility(1),
        value
          .getSystemService(contextClass.NOTIFICATION_SERVICE)
          .createNotificationChannel(notificationChannelClassInstance));
    } catch (error) {
      window.console && console.error;
    }
  }),
  (NotificationManager.prototype.build = function (value) {
    try {
      var value2 = plus.android.runtimeMainActivity(),
        pendingIntentClass = plus.android.importClass("android.app.PendingIntent"),
        intentClass = plus.android.importClass("android.content.Intent"),
        notificationClass = plus.android.importClass("android.app.Notification"),
        notificationMediaStyleClass = plus.android.importClass(
          "android.app.Notification$MediaStyle",
        ),
        intentClassInstance = new intentClass(value2, value2.getClass());
      (intentClassInstance.setAction(intentClass.ACTION_MAIN),
        intentClassInstance.addCategory(intentClass.CATEGORY_LAUNCHER),
        intentClassInstance.setFlags(intentClass.FLAG_ACTIVITY_SINGLE_TOP));
      var activity = pendingIntentClass.getActivity(
          value2,
          0,
          intentClassInstance,
          pendingIntentClass.FLAG_IMMUTABLE,
        ),
        builderInstance = new notificationClass.Builder(value2, this.channelId);
      return (
        plus.android.importClass(builderInstance),
        plus.android.importClass(value2.getResources()),
        builderInstance
          .setContentTitle(value || "R1音箱控制器")
          .setSmallIcon(
            value2.getResources().getIdentifier("icon", "drawable", value2.getPackageName()),
          )
          .setContentIntent(activity)
          .setOngoing(!0)
          .setStyle(
            new notificationMediaStyleClass()
              .setShowActionsInCompactView([])
              .setMediaSession(this.mediaSession.getSessionToken()),
          )
          .setVisibility(notificationClass.VISIBILITY_PUBLIC)
          .setPriority(notificationClass.PRIORITY_LOW),
        builderInstance.build()
      );
    } catch (error) {
      return (window.console && console.error, null);
    }
  }),
  (NotificationManager.prototype.updateNotification = function (track, value) {
    if (this.mediaSession) {
      track = track || {};
      try {
        var value2 = plus.android.runtimeMainActivity(),
          contextClass = plus.android.importClass("android.content.Context"),
          systemService = value2.getSystemService(contextClass.NOTIFICATION_SERVICE);
        if ((plus.android.importClass(systemService), !this.currentNotification)) {
          var value3 = this.build();
          if (!value3) return;
          this.currentNotification = value3;
        }
        this.musicId = track.id || "";
        var playbackStateClass = plus.android.importClass("android.media.session.PlaybackState"),
          mediaMetadataClass = plus.android.importClass("android.media.MediaMetadata"),
          builderInstance = new mediaMetadataClass.Builder(),
          builderInstance2 = new playbackStateClass.Builder(),
          currentLrcIndex = window.current_lrc_index || 0,
          lyricItem = state.lyrics[currentLrcIndex];
        if (
          (lyricItem && 2 === lyricItem.length && track.title
            ? (builderInstance.putString(
                mediaMetadataClass.METADATA_KEY_TITLE,
                lyricItem[1] || "-",
              ),
              builderInstance.putString(
                mediaMetadataClass.METADATA_KEY_ARTIST,
                (track.title || "") + "-" + (track.artist || ""),
              ))
            : (builderInstance.putString(
                mediaMetadataClass.METADATA_KEY_TITLE,
                track.title || "R1音箱控制器",
              ),
              builderInstance.putString(
                mediaMetadataClass.METADATA_KEY_ARTIST,
                track.artist || "",
              )),
          builderInstance.putString(mediaMetadataClass.METADATA_KEY_ALBUM, track.album || ""),
          state.apiMusicInfo && this.musicId === state.apiMusicInfo.id)
        )
          try {
            if (this.pic.url !== state.apiMusicInfo.pic) {
              this.pic = { url: state.apiMusicInfo.pic, bitmap: null };
              var receiver = this;
              new OkHttpImageFetcher().fetchAsync(this.pic.url, function (value4) {
                value4 &&
                  ((receiver.pic.bitmap = value4), receiver.updateNotification(track, value));
              });
            }
            this.pic.bitmap &&
              builderInstance.putBitmap(mediaMetadataClass.METADATA_KEY_ART, this.pic.bitmap);
          } catch (error) {
            window.console && console.error;
          }
        (builderInstance.putLong(
          mediaMetadataClass.METADATA_KEY_DURATION,
          parseInt(track.duration || 0, 10),
        ),
          this.mediaSession.setMetadata(builderInstance.build()),
          builderInstance2.setActions(
            playbackStateClass.ACTION_PLAY |
              playbackStateClass.ACTION_PAUSE |
              playbackStateClass.ACTION_SKIP_TO_NEXT |
              playbackStateClass.ACTION_SKIP_TO_PREVIOUS |
              playbackStateClass.ACTION_STOP,
          ),
          builderInstance2.setState(
            value ? playbackStateClass.STATE_PLAYING : playbackStateClass.STATE_PAUSED,
            parseInt(track.position || 0, 10),
            value ? 1 : 0,
          ),
          this.mediaSession.setPlaybackState(builderInstance2.build()),
          this.mediaSession.setActive(!0),
          systemService.notify(this.notificationId, this.currentNotification));
      } catch (error) {
        window.console && console.error;
      }
    }
  }),
  (NotificationManager.prototype.cancelNotification = function () {
    if (this.mediaSession)
      try {
        var value = plus.android.runtimeMainActivity(),
          contextClass = plus.android.importClass("android.content.Context");
        (value.getSystemService(contextClass.NOTIFICATION_SERVICE).cancel(this.notificationId),
          (this.currentNotification = null),
          this.mediaSession.setActive(!1));
      } catch (error) {
        window.console && console.error;
      }
  }),
  (OkHttpImageFetcher.prototype.handler = function () {
    return new this.Handler(this.Looper.getMainLooper());
  }),
  (OkHttpImageFetcher.prototype.fetchAsync = function (value, value2) {
    var receiver = this;
    try {
      var clientBuilderInstance = new this.ClientBuilder();
      (plus.android.invoke(
        clientBuilderInstance,
        "connectTimeout",
        this.connectTimeout,
        this.TimeUnit.MILLISECONDS,
      ),
        plus.android.invoke(
          clientBuilderInstance,
          "readTimeout",
          this.readTimeout,
          this.TimeUnit.MILLISECONDS,
        ));
      var buildResult = plus.android.invoke(clientBuilderInstance, "build"),
        requestBuilderInstance = new this.RequestBuilder();
      (plus.android.invoke(requestBuilderInstance, "url", value),
        plus.android.invoke(requestBuilderInstance, "get"));
      var newCallResult = plus.android.invoke(
          buildResult,
          "newCall",
          plus.android.invoke(requestBuilderInstance, "build"),
        ),
        value3 = plus.android.implements("dc.squareup.okhttp3.Callback", {
          onFailure: function (value4, value5) {
            receiver.handler().post(
              plus.android.implements("java.lang.Runnable", {
                run: function () {
                  value2 && value2(null, value5.toString());
                },
              }),
            );
          },
          onResponse: function (value4, value5) {
            try {
              if (!plus.android.invoke(value5, "isSuccessful"))
                throw new Error("HTTP " + plus.android.invoke(value5, "code"));
              var bodyResult = plus.android.invoke(value5, "body"),
                byteStreamResult = plus.android.invoke(bodyResult, "byteStream"),
                value6 = receiver.BitmapFactory.decodeStream(byteStreamResult);
              (plus.android.invoke(byteStreamResult, "close"),
                plus.android.invoke(bodyResult, "close"),
                receiver.handler().post(
                  plus.android.implements("java.lang.Runnable", {
                    run: function () {
                      value2 && value2(value6, null);
                    },
                  }),
                ));
            } catch (error) {
              receiver.handler().post(
                plus.android.implements("java.lang.Runnable", {
                  run: function () {
                    value2 && value2(null, error.message);
                  },
                }),
              );
            }
          },
        });
      plus.android.invoke(newCallResult, "enqueue", value3);
    } catch (error) {
      value2 && value2(null, error.message);
    }
  }),
  (function () {
    var options = {};
    function debounce(callback, delayMs) {
      var timeoutId;
      return function () {
        var args = arguments,
          receiver = this;
        (clearTimeout(timeoutId),
          (timeoutId = setTimeout(function () {
            callback.apply(receiver, args);
          }, delayMs)));
      };
    }
    function destroyMarquee(container) {
      var id = container.id || "default",
        optionItem = options[id];
      if (optionItem) {
        (optionItem.rafId && (cancelAnimationFrame(optionItem.rafId), optionItem.destroy()),
          (container._marqueeChecked = null),
          container.removeEventListener("mouseenter", optionItem.pause),
          container.removeEventListener("mouseleave", optionItem.resume),
          optionItem.observer && optionItem.observer.disconnect());
        var scrollWrapperElement = container.querySelector(".scroll-wrapper");
        if (scrollWrapperElement) {
          var headingElement = scrollWrapperElement.querySelector("h3:not(.clone)");
          (headingElement && container.appendChild(headingElement),
            container.removeChild(scrollWrapperElement));
        }
        (container.classList.remove("scrolling"), delete options[id]);
      }
    }
    function createMarquee(container) {
      var headingElement = container.querySelector("h3:not(.clone)");
      if (headingElement) {
        var options2 = {
          text: headingElement.textContent,
          width: container.clientWidth,
          textWidth: headingElement.scrollWidth,
        };
        container._marqueeChecked = options2;
        var mutationObserverInstance = new MutationObserver(function () {
          if (headingElement.textContent !== options2.text) {
            mutationObserverInstance.disconnect();
            var h3CloneElement = container.querySelector("h3.clone");
            (h3CloneElement && (h3CloneElement.textContent = headingElement.textContent),
              setTimeout(function () {
                ((container._marqueeChecked = null),
                  destroyMarquee(container),
                  createMarquee(container));
              }, 10));
          }
        });
        mutationObserverInstance.observe(headingElement, {
          childList: !0,
          characterData: !0,
          subtree: !0,
        });
        var index = 0,
          callback = function () {
            if ((index++, !options[container.id || "default"])) {
              var clientWidth = container.clientWidth,
                scrollWidth = headingElement.scrollWidth,
                offsetWidth = headingElement.offsetWidth;
              clientWidth <= 0 || offsetWidth <= 0
                ? index < 20 && setTimeout(callback, 100)
                : scrollWidth > clientWidth &&
                  (function (element, value, value2) {
                    if (!value.querySelectorAll("*").length) {
                      var scrollWrapperElement = element.querySelector(".scroll-wrapper");
                      (scrollWrapperElement
                        ? (scrollWrapperElement.innerHTML = "")
                        : (((scrollWrapperElement = document.createElement("div")).className =
                            "scroll-wrapper"),
                          element.appendChild(scrollWrapperElement)),
                        scrollWrapperElement.appendChild(value));
                      var scrollGapElement = scrollWrapperElement.querySelector(".scroll-gap");
                      (scrollGapElement ||
                        (((scrollGapElement = document.createElement("span")).className =
                          "scroll-gap"),
                        (scrollGapElement.innerHTML = "&nbsp;&nbsp;&nbsp;")),
                        scrollWrapperElement.appendChild(scrollGapElement));
                      var h3CloneElement = scrollWrapperElement.querySelector("h3.clone");
                      (h3CloneElement ||
                        (h3CloneElement = value.cloneNode(!0)).classList.add("clone"),
                        scrollWrapperElement.appendChild(h3CloneElement),
                        scrollWrapperElement.offsetWidth);
                      var offsetWidth2 = value.offsetWidth,
                        offsetWidth3 = scrollGapElement.offsetWidth;
                      if (!(offsetWidth2 <= 0 || offsetWidth3 <= 0)) {
                        var value3 = offsetWidth2 + offsetWidth3;
                        element.classList.add("scrolling");
                        var frameId,
                          numericValue = 0,
                          isEnabled = !1,
                          value4 = null,
                          isEnabled2 = !1,
                          callback2 = function (value5) {
                            if (!isEnabled2 && !isEnabled) {
                              if (null === value4)
                                return (
                                  (value4 = value5),
                                  void (frameId = requestAnimationFrame(callback2))
                                );
                              var value6 = Math.min(value5 - value4, 100);
                              for (numericValue -= (80 * value6) / 1e3; numericValue <= -value3;)
                                numericValue += value3;
                              ((scrollWrapperElement.style.transform =
                                "translateX(" + numericValue + "px)"),
                                (value4 = value5),
                                (frameId = requestAnimationFrame(callback2)));
                            }
                          },
                          callback3 = function () {
                            isEnabled ||
                              isEnabled2 ||
                              ((isEnabled = !0),
                              frameId && (cancelAnimationFrame(frameId), (frameId = null)),
                              (value4 = null));
                          },
                          callback4 = function () {
                            isEnabled &&
                              !isEnabled2 &&
                              ((isEnabled = !1),
                              (value4 = null),
                              (frameId = requestAnimationFrame(callback2)));
                          };
                        (element.addEventListener("mouseenter", callback3),
                          element.addEventListener("mouseleave", callback4),
                          (frameId = requestAnimationFrame(callback2)),
                          (options[element.id || "default"] = {
                            rafId: frameId,
                            pause: callback3,
                            resume: callback4,
                            clone: h3CloneElement,
                            observer: value2,
                            destroy: function () {
                              isEnabled2 = !0;
                            },
                          }));
                      }
                    }
                  })(container, headingElement, mutationObserverInstance);
            }
          };
        callback();
      }
    }
    function refreshMarquees() {
      for (
        var scrollContainerElement = document.querySelectorAll(".scroll-container"), index = 0;
        index < scrollContainerElement.length;
        index++
      ) {
        scrollContainerElement[index].id || (scrollContainerElement[index].id = "scroll_" + index);
        var headingElement = scrollContainerElement[index].querySelector("h3:not(.clone)"),
          marqueeChecked = scrollContainerElement[index]._marqueeChecked;
        (marqueeChecked &&
          headingElement &&
          marqueeChecked.text === headingElement.textContent &&
          marqueeChecked.width === scrollContainerElement[index].clientWidth &&
          marqueeChecked.textWidth === headingElement.scrollWidth) ||
          (destroyMarquee(scrollContainerElement[index]),
          createMarquee(scrollContainerElement[index]));
      }
    }
    (window.addEventListener("resize", debounce(refreshMarquees, 200)),
      window.addEventListener("orientationchange", debounce(refreshMarquees, 300)),
      document.addEventListener("visibilitychange", function () {
        document.hidden || (refreshMarquees(), resumeLoginConnection());
      }),
      window.addEventListener("pagehide", pauseLoginConnection),
      window.addEventListener("pageshow", function (event) {
        event.persisted && resumeLoginConnection();
      }),
      "loading" === document.readyState
        ? document.addEventListener("DOMContentLoaded", refreshMarquees)
        : refreshMarquees(),
      window.addEventListener("load", function () {
        setTimeout(refreshMarquees, 300);
      }),
      (window.startScroll = refreshMarquees),
      (window.stopScroll = function () {
        for (
          var scrollContainerElement = document.querySelectorAll(".scroll-container"), index = 0;
          index < scrollContainerElement.length;
          index++
        )
          destroyMarquee(scrollContainerElement[index]);
      }));
  })(),
  (timers.load = setTimeout(load, 1500)),
  (window.onload = function () {
    (clearTimeout(timers.load), (timers.load = null));
    var value = urlParams.all();
    Object.keys(value).length > 0 && urlParams.set(value);
    var elementsByTagName = document.getElementsByTagName("h3");
    elementsByTagName.length > 0 && (elementsByTagName[0].innerHTML = "页面加载中。。。");
    var storedCoverBackgroundOpen = localStorage.getItem("Cover_background_open");
    ((state.coverBackgroundEnabled =
      null === storedCoverBackgroundOpen ||
      "" === storedCoverBackgroundOpen ||
      "true" === storedCoverBackgroundOpen),
      setTimeout(function () {
        (updateStatusBar(),
          removeEl($("#temp_div")),
          ui.background && document.body.appendChild(ui.background),
          (document.body.style.backgroundColor = "rgba(0,0,0,0.8)"));
        var dEFAULTBACKGROUND = DEFAULT_BACKGROUND;
        if (
          -1 === location.href.indexOf("noimg") &&
          -1 === location.href.indexOf(state.controlHost)
        ) {
          state.hostname = localStorage.getItem("current_hostname") || "";
          var item = localStorage.getItem(state.hostname + "_background");
          item && (dEFAULTBACKGROUND = item);
        }
        if (
          (setBackgroundCss(dEFAULTBACKGROUND),
          document.body.classList.remove("body"),
          setPageTitle("R1音箱控制页面"),
          ui.pageTitle)
        ) {
          var clientHeight = ui.pageTitle.clientHeight;
          ui.pageTitle.style.minHeight = (clientHeight < 60 ? clientHeight : 27) + "px";
        }
        var value2 = urlParams.get(["connect_ip", "connect_id", "no_auto_connect", "ver", "u_ver"]);
        (value2 && Object.prototype.hasOwnProperty.call(value2, "u_ver") && urlParams.del("u_ver"),
          value2 &&
            !value2.no_auto_connect &&
            (value2.connect_id && (state.connectId = value2.connect_id),
            value2.connect_ip &&
              (function () {
                try {
                  state.connectIp = R1Config.parseDeviceAddress(value2.connect_ip).address;
                } catch (error) {
                  state.connectIp = -1;
                }
              })(),
            value2.ver && ((state.ver = value2.ver), urlParams.del("ver"))),
          window.custom_ip ? renderConnectPage() : connectSpeaker(),
          window.plus &&
            plus.runtime.versionCode > 127 &&
            plus.webview.getLaunchWebview().isVisible() &&
            plus.webview.getLaunchWebview().hide());
      }, 100));
  }),
  load(),
  document.addEventListener("plusready", initPlusFeatures),
  Object.assign(window, {
    App: { state: state, ui: ui, timers: timers },
    dlna: openDlna,
    mdns: openMdns,
    adb: openAdb,
    device_scan_index: openDeviceScan,
    load: load,
    custom_ip_page: renderConnectPage,
    init: connectSpeaker,
    _test_connect: attemptSpeakerConnection,
    test_connect: testSpeakerConnection,
    get_ip: fetchAndConnectIp,
    message: handleMessage,
    index: renderHomePage,
    update_info: updatePlayerState,
    update_lrc: updateLyrics,
    update_list: updatePlaylist,
    update_btn_state: updateButtonVisibility,
    update_sound_effects: refreshAudioEffects,
    update_bluetooth_data: refreshBluetoothDevices,
    update_unisound_info: updateUnisoundInfo,
    create_text_window: createTextWindow,
    open_version_info: openVersionInfo,
    create_color_selection: createColorPicker,
    create_music_info_window: createMusicInfoWindow,
    create_song_list_window: openSongListWindow,
    create_Voice_time_reporting: openVoiceTimeReportingPanel,
    create_Auto_restart_device: openAutoRestartPanel,
    create_set_background_page: createSetBackgroundPage,
    get_music_title: getTrackTitle,
    send_music_cmd: executeMusicCommand,
    update_music_info: fetchTrackInfo,
    load_device_info: loadDeviceInfo,
    update_device_info: updateDeviceInfo,
    create_bluetooth_device_config: createBluetoothConfigDialog,
    set_h3: setPageTitle,
    update_StatusBar: updateStatusBar,
    set_background: applyBackground,
    Restore_background: restoreBackground,
    set_background_css: setBackgroundCss,
    musicpic_background: updateCoverBackground,
    get_ver: getVersionInfo,
    app_down: app_down,
    click: handleButtonClick,
    send: sendConfiguredAction,
    sendMessage: sendConfiguredAction,
    ws_send: sendWs,
    wsSend: sendWs,
    sendMsg: sendAction,
    sendToU: sendToUnisound,
    sendShell: runShell,
    switch_page: navigateToPage,
    hide_page: hideAllPages,
    unhide_page: showPage,
    unhide_index: unhideIndex,
    hide_index: hideIndex,
    unhide_music: unhideMusic,
    hide_music: hideMusic,
    unhide_screen: unhideScreen,
    hide_screen: hideScreen,
    unhide_sound_effects: unhideSoundEffects,
    hide_sound_effects: hideSoundEffects,
    unhide_device_info: unhideDeviceInfo,
    hide_device_info: hideDeviceInfo,
    unhide_bluetooth: unhideBluetooth,
    hide_bluetooth: hideBluetooth,
    unhide_login: unhideLogin,
    hide_login: hideLogin,
    getparam: getparam,
    putparam: putparam,
    delparam: delparam,
    update_TtsSpeaker: updateTtsSpeaker,
    set_music_source: setMusicSource,
    ScreenController: ScreenController,
    NotificationManager: NotificationManager,
    OkHttpImageFetcher: OkHttpImageFetcher,
    initLocalNetworkPermission: initLocalNetworkPermission,
    requestAndConnect: requestAndConnect,
    sendAdbInput: sendAdbInput,
    handleIpInput: handleIpInput,
  }));
