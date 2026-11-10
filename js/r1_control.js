var DEFAULT_CONTROL_HOST = "r1.wxfsq.com",
  IP_PATTERN =
    /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])(\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])){3}$/,
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
    var e = "undefined" != typeof ver ? parseInt(ver, 10) : 0;
    return !!isNaN(e) || e >= 1882;
  } catch (e) {
    return !0;
  }
}
function readGlobal(e, t) {
  try {
    if (void 0 !== window[e]) return window[e];
  } catch (e) {}
  try {
    var i = new Function(
      "return typeof " + e + ' !== "undefined" ? ' + e + " : undefined;",
    )();
    if (void 0 !== i) return i;
  } catch (e) {}
  return t;
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
    controlHost:
      readGlobal("control_host", DEFAULT_CONTROL_HOST) || DEFAULT_CONTROL_HOST,
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
    downurl:
      readGlobal("downurl", "https://xfdown.lanzouq.com/") ||
      "https://xfdown.lanzouq.com/",
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
function padZero(e, t) {
  for (var i = String(e); i.length < t;) i = "0" + i;
  return i;
}
function flatten(e) {
  for (var t = [], i = 0; i < e.length; i++)
    if (Array.isArray(e[i]))
      for (var n = flatten(e[i]), a = 0; a < n.length; a++) t.push(n[a]);
    else t.push(e[i]);
  return t;
}
function arrIncludes(e, t) {
  if (!e) return !1;
  for (var i = 0; i < e.length; i++) if (e[i] === t) return !0;
  return !1;
}
function removeEl(e) {
  e && e.parentNode && e.parentNode.removeChild(e);
}
function fireEvent(e, t) {
  try {
    var i = document.createEvent("HTMLEvents");
    (i.initEvent(t, !0, !0), e.dispatchEvent(i));
  } catch (i) {
    try {
      e.fireEvent("on" + t);
    } catch (e) {}
  }
}
function $(e, t) {
  return (t || document).querySelector(e);
}
function $$(e, t) {
  return Array.prototype.slice.call((t || document).querySelectorAll(e));
}
function makeEl(e, t) {
  var i = Array.prototype.slice.call(arguments, 2),
    n = document.createElement(e);
  if (t)
    for (var a in t)
      if (Object.prototype.hasOwnProperty.call(t, a)) {
        var o = t[a];
        if (void 0 !== o)
          if ("style" === a && "object" == typeof o)
            for (var s in o)
              Object.prototype.hasOwnProperty.call(o, s) && (n.style[s] = o[s]);
          else
            "class" === a || "className" === a
              ? (n.className = o)
              : "html" === a
                ? (n.innerHTML = o)
                : "text" === a
                  ? (n.textContent = o)
                  : 0 === a.indexOf("on") && "function" == typeof o
                    ? (n[a.toLowerCase()] = o)
                    : a in n
                      ? (n[a] = o)
                      : n.setAttribute(a, o);
      }
  var r = String(n.type || "").toLowerCase();
  ("button" === e ||
    ("input" === e && /^(button|submit|reset)$/.test(r)) ||
    (t &&
      "function" == typeof t.onclick &&
      !/^(input|select|textarea)$/.test(e))) &&
    n.classList.add("app_btn");
  for (var l = flatten(i), u = 0; u < l.length; u++) {
    var c = l[u];
    null != c &&
      !1 !== c &&
      n.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return n;
}
function makeButton(e, t, i) {
  var n = { type: "button", value: e, className: "btn", onclick: t };
  if (i)
    for (var a in i)
      Object.prototype.hasOwnProperty.call(i, a) && (n[a] = i[a]);
  return makeEl("input", n);
}
function makeText(e, t, i = {}) {
  return makeEl("text", {
    innerHTML: null == e ? "" : e,
    style: t || "",
    ...i,
  });
}
function makeDiv(e, t = {}) {
  return makeEl("div", { style: e || "", ...t });
}
function isEchoVer(e) {
  var t = Number(state.ver),
    i = Number(e);
  return isFinite(t) && isFinite(i) && t >= i;
}
function formatBuildTimestamp(e) {
  if (
    "number" != typeof e ||
    !isFinite(e) ||
    e <= 0 ||
    Math.floor(e) !== e ||
    e > 86399999712e5
  )
    return "未知";
  var t = new Date(e + 288e5);
  if (!isFinite(t.getTime()) || t.getUTCFullYear() > 9999) return "未知";
  function i(e, t) {
    for (var i = String(e); i.length < t;) i = "0" + i;
    return i;
  }
  return (
    i(t.getUTCFullYear(), 4) +
    "-" +
    i(t.getUTCMonth() + 1, 2) +
    "-" +
    i(t.getUTCDate(), 2) +
    " " +
    i(t.getUTCHours(), 2) +
    ":" +
    i(t.getUTCMinutes(), 2) +
    ":" +
    i(t.getUTCSeconds(), 2) +
    "." +
    i(t.getUTCMilliseconds(), 3) +
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
  var e = $("#ver_div");
  if (e) {
    var t =
        null != state.confirmedEchoVersion &&
        Number(state.ver) === state.confirmedEchoVersion &&
        state.confirmedEchoIp === state.ip &&
        state.confirmedEchoWs === state.ws &&
        state.ws &&
        state.ws.readyState === WebSocket.OPEN,
      i = t
        ? '<a href="javascript:openVersionInfo();">版本号：' +
          state.confirmedEchoVersion +
          "</a>"
        : '<a href="javascript:app_down();">下载APP</a>';
    (window.plus &&
      (state.version && state.version.app > plus.runtime.versionCode
        ? (i =
            '<a href="javascript:app_down();">APP有更新：' +
            state.version.app.toString().split("").join(".") +
            "</a>")
        : t || (i = "")),
      e.innerHTML !== i &&
        ((e.innerHTML = i),
        ui.applyLyricsModeHeight && ui.applyLyricsModeHeight()),
      e.title && (e.title = ""));
  }
}
function hasMusicQueueCapability() {
  var e = state.confirmedEchoVersion;
  return (
    "number" == typeof e &&
    isFinite(e) &&
    e >= 1887 &&
    Number(state.ver) === e &&
    state.confirmedEchoIp === state.ip &&
    state.confirmedEchoWs === state.ws &&
    !!state.ws &&
    state.ws.readyState === WebSocket.OPEN
  );
}
function musicQueueContext() {
  return { epoch: state.musicCapabilityEpoch, ip: state.ip, ws: state.ws };
}
function isMusicQueueContextCurrent(e) {
  return (
    hasMusicQueueCapability() &&
    e.epoch === state.musicCapabilityEpoch &&
    e.ip === state.ip &&
    e.ws === state.ws
  );
}
function confirmEchoVersion(e) {
  var t = e && e.ver,
    i =
      "number" == typeof t || ("string" == typeof t && "" !== t.trim())
        ? Number(t)
        : NaN;
  isFinite(i) || (i = null);
  var n =
      e && "未知" !== formatBuildTimestamp(e.build_timestamp)
        ? e.build_timestamp
        : null,
    a =
      state.confirmedEchoVersion !== i ||
      state.confirmedEchoIp !== state.ip ||
      state.confirmedEchoWs !== state.ws ||
      state.confirmedEchoBuildTimestamp !== n;
  ((state.confirmedEchoVersion === i &&
    state.confirmedEchoIp === state.ip &&
    state.confirmedEchoWs === state.ws) ||
    (state.musicCapabilityEpoch = (state.musicCapabilityEpoch || 0) + 1),
    (state.confirmedEchoVersion = i),
    (state.confirmedEchoIp = state.ip),
    (state.confirmedEchoWs = state.ws),
    (state.confirmedEchoBuildTimestamp = n),
    a &&
      "function" == typeof closeVersionInfoWindow &&
      closeVersionInfoWindow(),
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
  var e = hasMusicQueueCapability(),
    t = $("#music_btn_search");
  if (
    (t && (t.style.display = e ? "inline-flex" : "none"),
    ui.playlistTable && ui.playlistTable._queueCapability !== e)
  ) {
    ui.playlistTable._queueCapability = e;
    for (
      var i = ui.playlistTable.querySelectorAll(".drag_handle"), n = 0;
      n < i.length;
      n++
    )
      i[n].style.display = e ? "inline-flex" : "none";
  }
  e ||
    ("function" == typeof attachQueueRowDrag &&
      (attachQueueRowDrag.active &&
        attachQueueRowDrag.active.cancel &&
        attachQueueRowDrag.active.cancel(),
      (attachQueueRowDrag.pending = null)),
    "function" == typeof MUSIC_SEARCH_CANCEL &&
      (MUSIC_SEARCH_CANCEL(),
      $("#music_search_wrap") &&
        ui.popup &&
        ui.popup.onclose &&
        ui.popup.onclose()));
}
function isUnisoundVer(e) {
  var t = Number(state.uVer);
  return isFinite(t) && t > 1e3 && t + 1 > e;
}
var urlParams = {
  all: function () {
    var e = {},
      t = location.search.replace(/^\?/, "");
    if (!t) return e;
    for (var i = t.split("&"), n = 0; n < i.length; n++)
      if (i[n]) {
        var a = i[n].split("=");
        e[decodeURIComponent(a[0])] =
          a.length > 1 ? decodeURIComponent(a[1]) : null;
      }
    return e;
  },
  get: function (e) {
    for (
      var t = Array.isArray(e) ? e : [e],
        i = urlParams.all(),
        n = {},
        a = 0,
        o = 0;
      o < t.length;
      o++
    )
      Object.prototype.hasOwnProperty.call(i, t[o]) &&
        ((n[t[o]] = i[t[o]]), a++);
    return a ? n : null;
  },
  put: function (e) {
    var t = urlParams.all();
    for (var i in e)
      Object.prototype.hasOwnProperty.call(e, i) && (t[i] = e[i]);
    urlParams.set(t);
  },
  del: function (e) {
    for (
      var t = urlParams.all(), i = Array.isArray(e) ? e : [e], n = 0;
      n < i.length;
      n++
    )
      delete t[i[n]];
    urlParams.set(t);
  },
  set: function (e) {
    for (var t = [], i = Object.keys(e), n = 0; n < i.length; n++) {
      var a = e[i[n]];
      void 0 !== a &&
        t.push(
          null === a
            ? encodeURIComponent(i[n])
            : encodeURIComponent(i[n]) + "=" + encodeURIComponent(a),
        );
    }
    history.replaceState(null, "", location.pathname + (t.length ? "?" + t.join("&") : ""));
  },
};
function getparam(e) {
  return urlParams.get(e);
}
function putparam(e) {
  urlParams.put(e);
}
function delparam(e) {
  urlParams.del(e);
}
var wsCallbackSequence = 0;
function sendWs(e, t, i) {
  var n,
    a,
    o = state.ws,
    s = "function" == typeof t,
    r = !1;
  function l(e) {
    r ||
      ((r = !0),
      clearTimeout(a),
      n && state.callbacks[n] === l && delete state.callbacks[n],
      s &&
        setTimeout(function () {
          t(e);
        }, 0));
  }
  if (!o || o.readyState !== WebSocket.OPEN) return (l(!1), !1);
  try {
    if (
      ("string" == typeof e && (e = JSON.parse(e)),
      "send_message" === e.type &&
        4 === Number(e.what) &&
        -1 !== [27, 28, 29].indexOf(Number(e.arg1)) &&
        !hasMusicQueueCapability())
    )
      return (l(!1), !1);
    var u = {};
    for (var c in e)
      Object.prototype.hasOwnProperty.call(e, c) && (u[c] = e[c]);
    if (s) {
      if (
        ((n =
          u.type_id || u.type + "_" + Date.now() + "_" + ++wsCallbackSequence),
        state.callbacks[n])
      )
        return (l(!1), !1);
      u.type_id = n;
    }
    var d = JSON.stringify(u);
    return (
      s &&
        ((l.ws = o),
        (state.callbacks[n] = l),
        (a = setTimeout(function () {
          l(!1);
        }, i || 6e3))),
      o.send(d),
      !0
    );
  } catch (e) {
    return (l(!1), !1);
  }
}
function cancelWsCallbacks(e) {
  var t = [];
  for (var i in state.callbacks)
    Object.prototype.hasOwnProperty.call(state.callbacks, i) &&
      state.callbacks[i].ws === e &&
      t.push(state.callbacks[i]);
  for (var n = 0; n < t.length; n++) t[n](!1);
}
function sendAction(e, t, i, n, a) {
  var o = { type: "send_message", what: e, arg1: t, arg2: i, obj: n };
  if (a)
    for (var s in a)
      Object.prototype.hasOwnProperty.call(a, s) && (o[s] = a[s]);
  sendWs(o);
}
function sendToUnisound(e) {
  sendWs({ type: "send_to_unisound", data: e });
}
function runShell(e, t) {
  var i = { type: "shell", shell: e };
  (t && (i.type_id = t), sendWs(i));
}
function msToTime(e) {
  var t = Math.floor(e / 1e3);
  return padZero(Math.floor(t / 60), 2) + ":" + padZero(t % 60, 2);
}
function formatUnixTime(e) {
  var t = new Date(1e3 * parseInt(e, 10));
  return isNaN(t.getTime())
    ? ""
    : t.getFullYear() +
        "-" +
        padZero(t.getMonth() + 1, 2) +
        "-" +
        padZero(t.getDate(), 2) +
        " " +
        padZero(t.getHours(), 2) +
        ":" +
        padZero(t.getMinutes(), 2) +
        ":" +
        padZero(t.getSeconds(), 2);
}
function formatDuration(e, t) {
  var i = Math.floor(e / 864e5),
    n = Math.floor((e % 864e5) / 36e5),
    a = Math.floor((e % 36e5) / 6e4),
    o = Math.floor((e % 6e4) / 1e3);
  if (t) return i + " 天 " + n + " 小时 " + a + " 分钟 " + o + " 秒";
  var s = [];
  return (
    i && s.push(i + " 天"),
    (n || i) && s.push(n + " 小时"),
    (a || n || i) && s.push(a + " 分钟"),
    s.push(o + " 秒"),
    s.join(" ")
  );
}
function timeToMs(e) {
  var t = e.split(":");
  return isNaN(t[0]) ? e : 6e4 * parseInt(t[0], 10) + 1e3 * parseFloat(t[1]);
}
function setPageTitle(e) {
  ui.pageTitle &&
    ((e = String(null == e ? "" : e)),
    (ui.pageTitle._pageTitleText === e &&
      ui.pageTitle._pageTitleHtml === ui.pageTitle.innerHTML) ||
      ui.pageTitle.innerHTML === e ||
      ((ui.pageTitle.innerHTML = e),
      (ui.pageTitle._pageTitleText = e),
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
function safeBackgroundUrl(e) {
  return !(e = String(e || "").trim()) || /[\u0000-\u0020\u007f"'<>\\]/.test(e)
    ? ""
    : /^https?:\/\/[^/]+/i.test(e) ||
        /^data:image\/(?:png|jpe?g|gif|webp|bmp|avif|x-icon);base64,[a-z0-9+/=]+$/i.test(
          e,
        )
      ? e
      : "";
}
function backgroundImageUrl(e) {
  var t = /^url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s()]+))\s*\)$/i.exec(e || "");
  return t ? safeBackgroundUrl(t[1] || t[2] || t[3]) : "";
}
function parseBackgroundCss(e) {
  var t = document.createElement("div").style;
  t.cssText = String(e || "");
  var i = {},
    n = t.getPropertyValue("background-image"),
    a = backgroundImageUrl(n),
    o = /url\s*\(/i.test(n) && !a;
  (BACKGROUND_PROPS.forEach(function (e) {
    var n = t.getPropertyValue(e);
    n &&
      !/expression\s*\(|javascript\s*:|[{}<>]/i.test(n) &&
      (!/url\s*\(/i.test(n) || ("background-image" === e && a)) &&
      (i[e] = n);
  }),
    o && delete i["background-image"]);
  var s = t.getPropertyValue("background");
  return (
    Object.keys(i).length ||
      !s ||
      /url\s*\(|expression\s*\(|javascript\s*:|[{}<>]/i.test(s) ||
      (i.background = s),
    { props: i, url: a }
  );
}
function animateCoverOpacity(e, t, i, n, a, o) {
  null != e._opacityFrame && cancelAnimationFrame(e._opacityFrame);
  var s,
    r = (e._opacitySequence = (e._opacitySequence || 0) + 1);
  ((e.style.transition = "none"),
    (e.style.opacity = String(t)),
    (e._opacityDuration = n),
    (e._opacityFrame = requestAnimationFrame(function l(u) {
      if (e._opacitySequence === r)
        if (a()) {
          null == s && (s = u);
          var c = "number" == typeof u ? Math.min(1, (u - s) / n) : 1,
            d = c * c * (3 - 2 * c);
          ((e.style.opacity = String(t + (i - t) * d)),
            c < 1
              ? (e._opacityFrame = requestAnimationFrame(l))
              : ((e._opacityFrame = null), o && o()));
        } else e._opacityFrame = null;
    })));
}
function cancelBackgroundLayers(e, t, i) {
  var n = e && e._backgroundLayers;
  if (n) {
    var a = i && !t && n.incoming && n.fading;
    (n.sequence++,
      a ||
        (n.incoming &&
          (null != n.incoming._opacityFrame &&
            cancelAnimationFrame(n.incoming._opacityFrame),
          (n.incoming._opacitySequence =
            (n.incoming._opacitySequence || 0) + 1)),
        (n.fading = !1),
        clearTimeout(n.timer),
        null != n.frame && cancelAnimationFrame(n.frame),
        (n.timer = n.frame = null)),
      (n.pendingReady = null),
      n.loader && (n.loader.onload = n.loader.onerror = null),
      (n.loader = null),
      (n.requestedKey = ""),
      t &&
        ([n.current, n.incoming].forEach(function (t) {
          t && t.parentNode === e && e.removeChild(t);
        }),
        (n.current = n.incoming = null),
        (n.url = "")));
  }
}
function settleBackgroundLayers(e, t) {
  t.incoming &&
    ((t.incoming.style.transition = "none"),
    (t.incoming.style.opacity = "1"),
    t.current && t.current.parentNode === e && e.removeChild(t.current),
    (t.current = t.incoming),
    (t.incoming = null));
}
function applyHomeBackgroundBlur(e, t) {
  var i = Math.max(0, Math.min(60, parseInt(t, 10) || 0)),
    n = Math.ceil((160 * i) / 50);
  ((e.style.left = e.style.top = -n + "px"),
    (e.style.width = e.style.height =
      n ? "calc(100% + " + 2 * n + "px)" : "100%"),
    (e.style.backgroundAttachment = "scroll"),
    (e.style.filter = e.style.webkitFilter = i ? "blur(" + i + "px)" : ""));
}
function transitionBackground(e, t, i) {
  if (e) {
    i = i || {};
    var n = e._backgroundLayers;
    n ||
      (n = e._backgroundLayers =
        { sequence: 0, current: null, incoming: null, url: "" });
    var a =
      (i.mode || "") +
      ":" +
      JSON.stringify(t.props) +
      ":" +
      (null == i.blur ? "" : i.blur);
    if (
      n.requestedKey !== a ||
      n.hostname !== state.hostname ||
      (n.guard && !n.guard())
    ) {
      cancelBackgroundLayers(e, !1, !0);
      var o = n.sequence,
        s = state.hostname;
      if (
        ((n.hostname = s),
        (n.requestedKey = a),
        (n.background = t),
        (n.cover = !!i.cover),
        (n.guard = i.guard),
        t.url)
      ) {
        var r = new Image();
        ((n.loader = r),
          (r.onload = function () {
            if (l())
              if (
                ((r.onload = r.onerror = null), "function" == typeof r.decode)
              )
                try {
                  Promise.resolve(r.decode()).then(u, c);
                } catch (e) {
                  c();
                }
              else u();
          }),
          (r.onerror = c),
          (r.src = t.url));
      } else u();
    }
  }
  function l() {
    return (
      e._backgroundLayers === n &&
      n.sequence === o &&
      state.hostname === s &&
      !1 !== e.isConnected &&
      (!i.guard || i.guard())
    );
  }
  function u() {
    if (l()) {
      n.loader = null;
      var a =
        i.cover &&
        ((n.incoming && !n.incoming._coverBackground) ||
          (n.current && !n.current._coverBackground));
      if (
        (a &&
          (n.incoming &&
            (null != n.incoming._opacityFrame &&
              cancelAnimationFrame(n.incoming._opacityFrame),
            (n.incoming._opacitySequence =
              (n.incoming._opacitySequence || 0) + 1)),
          clearTimeout(n.timer),
          null != n.frame && cancelAnimationFrame(n.frame),
          (n.timer = n.frame = null),
          (n.fading = !1),
          (n.pendingReady = null)),
        n.incoming && n.fading)
      )
        n.pendingReady = u;
      else {
        settleBackgroundLayers(e, n);
        var o = document.createElement("div");
        if (
          ((o.className = "background_image_layer"),
          (o._backgroundUrl = t.url),
          (o._coverBackground = !!i.cover),
          (o._homeBackground = e === ui.background && !i.cover && !!t.url),
          Object.keys(t.props).forEach(function (e) {
            o.style.setProperty(e, t.props[e]);
          }),
          i.cover &&
            ((o.style.width = o.style.height = "120%"),
            (o.style.transform = "translate(-8%,-5%)")),
          null != i.blur)
        )
          o.style.filter = o.style.webkitFilter = i.blur
            ? "blur(" + i.blur + "px)" + (i.cover ? " brightness(0.9)" : "")
            : "";
        else if (e === ui.background) {
          var r = Math.max(
            0,
            Math.min(
              60,
              parseInt(
                localStorage.getItem(state.hostname + "_BackgroundBlur"),
                10,
              ) || 0,
            ),
          );
          o.style.filter = o.style.webkitFilter = r ? "blur(" + r + "px)" : "";
        }
        o._homeBackground &&
          applyHomeBackgroundBlur(o, null == i.blur ? r : i.blur);
        var c =
          "function" == typeof prefersReducedDialogMotion &&
          prefersReducedDialogMotion();
        if (
          ((o.style.transition = c || a ? "none" : "opacity 0.2s ease"),
          (o.style.opacity = !n.current || c || a ? "1" : "0"),
          e.appendChild(o),
          (e.style.backgroundImage = "none"),
          e === ui.background &&
            ((e.style.width = e.style.height = "100%"),
            (e.style.overflow = o._homeBackground ? "hidden" : "")),
          (e.style.transform = e.style.filter = e.style.webkitFilter = ""),
          (n.url = t.url),
          !n.current || c || a)
        )
          return (
            n.current && n.current.parentNode === e && e.removeChild(n.current),
            (n.current = o),
            a &&
              !c &&
              ((o.style.transform = "translate(-8%,-5%) scale(1.04)"),
              o.offsetWidth,
              (o.style.transition = "transform 0.2s ease"),
              (n.frame = requestAnimationFrame(function () {
                l() &&
                  n.current === o &&
                  !n.incoming &&
                  ((n.frame = null),
                  (o.style.transform = "translate(-8%,-5%)"));
              }))),
            void (i.onReady && i.onReady())
          );
        ((n.incoming = o),
          o.offsetWidth,
          (n.frame = requestAnimationFrame(function () {
            l() &&
              n.incoming === o &&
              ((n.frame = null),
              (n.fading = !0),
              animateCoverOpacity(
                o,
                0,
                1,
                200,
                function () {
                  return (
                    e._backgroundLayers === n &&
                    n.incoming === o &&
                    state.hostname === s &&
                    !1 !== e.isConnected
                  );
                },
                function () {
                  (i.onReady && l() && i.onReady(),
                    (n.timer = setTimeout(function () {
                      if (
                        e._backgroundLayers === n &&
                        n.incoming === o &&
                        state.hostname === s &&
                        !1 !== e.isConnected
                      ) {
                        ((n.timer = null),
                          (n.fading = !1),
                          settleBackgroundLayers(e, n));
                        var t = n.pendingReady;
                        ((n.pendingReady = null), t && t());
                      }
                    }, 20)));
                },
              ));
          })));
      }
    }
  }
  function c() {
    l() &&
      ((r.onload = r.onerror = null),
      (n.loader = null),
      (n.requestedKey = ""),
      n.fading || settleBackgroundLayers(e, n),
      i.onError && i.onError());
  }
}
function setBackgroundCss(e, t) {
  var i =
    "#background_div" === (t = t || "#background_div")
      ? ui.background
      : document.getElementById(t.replace(/^#/, ""));
  i &&
    (i === ui.background && (state.coverBackgroundApplied = !1),
    transitionBackground(i, parseBackgroundCss(e), {
      mode: "stored",
      guard: function () {
        return "#background_div" !== t || ui.background === i;
      },
      onReady: function () {
        i === ui.background && updateStatusBar();
      },
      onError: function () {
        setBackgroundCss(DEFAULT_BACKGROUND, t);
      },
    }),
    i === ui.background &&
      state.lrcFullscreen &&
      "function" == typeof updateFullscreenBg &&
      updateFullscreenBg(!0));
}
function restoreBackground() {
  (setBackgroundCss(
    localStorage.getItem(state.hostname + "_background") || DEFAULT_BACKGROUND,
  ),
    ui.main &&
      (ui.main.classList &&
        ui.main.classList.contains("mask") &&
        ui.main.classList.remove("mask"),
      ui.main.style &&
        ((ui.main.style.backdropFilter = ""),
        (ui.main.style.webkitBackdropFilter = ""))),
    ui.qualitySelect &&
      ui.qualitySelect.style &&
      (ui.qualitySelect.style.backdropFilter = ""),
    updateStatusBar());
}
function applyBackground(e) {
  var t,
    i = $("#text");
  if ("" === e)
    ((t = DEFAULT_BACKGROUND),
      localStorage.removeItem(state.hostname + "_background"),
      i && (i.value = "已恢复默认背景！"));
  else {
    if (!(e = safeBackgroundUrl(e)))
      return void (i && (i.value = "背景图片地址无效！"));
    ((t = 'background: url("' + e + '") center top / cover no-repeat fixed;'),
      localStorage.setItem(state.hostname + "_background", t),
      i && (i.value = "设置背景图片成功！"));
  }
  (setBackgroundCss(t),
    updateStatusBar(),
    setTimeout(function () {
      showAppAlert(i ? i.value : "");
    }, 600));
}
function supportsBackdropFilter() {
  return (
    CSS.supports("backdrop-filter", "blur(10px)") ||
    CSS.supports("-webkit-backdrop-filter", "blur(10px)")
  );
}
function findTextColor(e) {
  if (/^(rgb|RGB)/.test(e))
    return resBgColor(e.replace(/(?:\(|\)|rgb|RGB)*/g, "").split(","));
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(e)) return !1;
  var t = e.toLowerCase();
  if (4 === t.length) {
    for (var i = "#", n = 1; n < 4; n++) i += t[n] + t[n];
    t = i;
  }
  for (var a = [], o = 1; o < 7; o += 2)
    a.push(parseInt("0x" + t.slice(o, o + 2), 16));
  return resBgColor(a);
}
function resBgColor(e) {
  return 0.213 * e[0] + 0.715 * e[1] + 0.072 * e[2] > 127.5
    ? "#000000"
    : "#ffffff";
}
function getBackgroundData() {
  var e = ui.background,
    t = e && e._backgroundLayers;
  if (t) {
    var i =
      t.incoming && "1" === t.incoming.style.opacity ? t.incoming : t.current;
    return (i && i._backgroundUrl) || "";
  }
  return e ? backgroundImageUrl(e.style.backgroundImage) : "";
}
function getBackgroundColorAt(e) {
  var t = getBackgroundData();
  if (t) {
    var i = new Image();
    ((i.src = t),
      (i.onload = function () {
        var t = document.createElement("canvas");
        ((t.width = this.width), (t.height = this.height));
        var n = t.getContext("2d");
        n.drawImage(i, 0, 0);
        for (
          var a = n.getImageData(parseInt(t.width / 2, 10), 10, 1, 1).data,
            o = "",
            s = 0;
          s < 3;
          s++
        )
          o += padZero(a[s].toString(16), 2);
        e("#" + o);
      }));
  } else {
    for (
      var n = document.body.style.backgroundColor,
        a = n.substr(4, n.length - 1).split(","),
        o = "",
        s = 0;
      s < a.length;
      s++
    )
      o += padZero(parseInt(a[s], 10).toString(16), 2);
    e("#" + o);
  }
}
function updateStatusBar() {
  if (ui.main && ui.background && ui.container) {
    var e = Math.max(
      0,
      Math.min(
        60,
        parseInt(
          localStorage.getItem(state.hostname + "_BackgroundBlur"),
          10,
        ) || 0,
      ),
    );
    ui.background.style.filter = ui.background.style.webkitFilter = "";
    var t = ui.background._backgroundLayers;
    t &&
      [t.current, t.incoming].forEach(function (t) {
        t && t._homeBackground
          ? applyHomeBackgroundBlur(t, e)
          : t &&
            !t._coverBackground &&
            (t.style.filter = t.style.webkitFilter =
              e ? "blur(" + e + "px)" : "");
      });
    if (window.plus) {
      var i = $("#StatusBar");
      if (i)
        if (plus.navigator.isImmersedStatusbar()) {
          ((i.style.height =
            parseInt(plus.navigator.getStatusbarHeight() / 2, 10) + 10 + "px"),
            (i.style.display = "block"));
          try {
            var n = plus.android.importClass("android.graphics.Color");
            plus.android.importClass("android.view.Window");
            var a = plus.android.runtimeMainActivity().getWindow(),
              o = plus.android.importClass("android.view.WindowManager"),
              s = plus.android.importClass("android.view.View");
            (a.clearFlags(
              o.LayoutParams.FLAG_TRANSLUCENT_STATUS |
                o.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION,
            ),
              a
                .getDecorView()
                .setSystemUiVisibility(
                  s.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                    s.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                    s.SYSTEM_UI_FLAG_LAYOUT_STABLE,
                ),
              a.addFlags(o.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS),
              a.setNavigationBarColor(n.TRANSPARENT),
              plus.navigator.hideSystemNavigation());
          } catch (e) {}
        } else
          ((i.style.display = "none"),
            getBackgroundColorAt(function (e) {
              (plus.navigator.setStatusBarBackground(e),
                plus.navigator.setStatusBarStyle(
                  "#000000" === findTextColor(e) ? "dark" : "light",
                ));
            }));
    }
    ((ui.main.style =
      "position:fixed;z-index:1;left:0;top:0;width:100%;height:100%;overflow:auto;background-color:rgba(var(--mask-color),0);"),
      (ui.container.style.width = "99%"),
      ui.qualitySelect &&
        ui.qualitySelect.style &&
        (ui.qualitySelect.style.backdropFilter = ""),
      ui.main.classList &&
        ui.main.classList.contains("mask") &&
        ui.main.classList.remove("mask"));
  }
}
function setCookie(e, t, i) {
  var n = new Date();
  (n.setTime(n.getTime() + 1e3 * i),
    (document.cookie = e + "=" + t + "; expires=" + n.toGMTString()));
}
function getCookie(e) {
  for (
    var t = e + "=", i = document.cookie.split(";"), n = 0;
    n < i.length;
    n++
  ) {
    var a = i[n].replace(/^\s+|\s+$/g, "");
    if (0 === a.indexOf(t)) return a.substring(t.length);
  }
  return "";
}
function insertStyle(e) {
  var t = makeEl("style", { type: "text/css" });
  (t.appendChild(document.createTextNode(e)), document.head.appendChild(t));
}
function goPage(e) {
  location.href = "./" + e + "?" + Date.now();
}
function openDlna() {
  goPage("dlna.html");
}
function openMdns() {
  goPage("mdns.html");
}
function openAdb() {
  var e = new URL(location.href);
  ((e = new URL(R1Config.assetUrl("adb/"))),
    (e.search = "?" + Date.now()),
    window.plus
      ? plus.webview.create(e.href).show()
      : (location.href = e.href));
}
function openDeviceScan() {
  goPage("device_scan.html");
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
  } catch (e) {
    return !1;
  }
}
function retainPopupLayer(e) {
  (-1 === popupRenderHosts.indexOf(e) && popupRenderHosts.push(e),
    popupRenderHosts.forEach(function (e, t) {
      e.style.zIndex = 9998 + 2 * t;
    }));
}
function releasePopupLayer(e) {
  var t = popupRenderHosts.indexOf(e);
  (-1 !== t && popupRenderHosts.splice(t, 1),
    popupRenderHosts.forEach(function (e, t) {
      e.style.zIndex = 9998 + 2 * t;
    }));
}
function createPopupHost(e) {
  var t = makeEl("div", {
    class: "popup2 app_popup_host",
    style:
      "text-align:center;display:" +
      (!1 === (e = e || {}).open ? "none" : "block"),
  });
  if (
    ((t._popupBlur = makeEl("div", { class: "app_popup_blur" })),
    !1 === e.blur &&
      (t._popupBlur.style.backdropFilter =
        t._popupBlur.style.webkitBackdropFilter =
          "none"),
    (t._popupDim = makeEl("div", { class: "app_popup_dim" })),
    (t.content = t._popupContent =
      makeEl("div", { class: "app_popup_content" })),
    t.appendChild(t._popupBlur),
    t.appendChild(t._popupDim),
    t.appendChild(t.content),
    (t._popupOpen = !1 !== e.open),
    (t._popupCleanups = []),
    t.addEventListener)
  ) {
    function i(e) {
      (t._popupOpen &&
        popupRenderHosts
          .filter(function (e) {
            return e._popupOpen;
          })
          .slice(-1)[0] === t) ||
        (e.preventDefault(), e.stopImmediatePropagation());
    }
    ["click", "pointerdown", "keydown", "submit", "focusin"].forEach(
      function (e) {
        t.addEventListener(e, i, !0);
      },
    );
  }
  return (
    (t.onclose = function () {
      return closePopupAnimated(t);
    }),
    (t.onclick = function (e) {
      (e.target !== t && e.target !== t.content) || t.onclose();
    }),
    document.body.appendChild(t),
    t._popupOpen && retainPopupLayer(t),
    t
  );
}
function showFlowNotice(e, t, i) {
  var n = ui.flowNotice;
  if (!n || !n.host._popupOpen || n.kind !== e || n.title.textContent !== t) {
    clearFlowNotice();
    var a = createPopupHost({ blur: !1 });
    ((a.onclose = function () {
      return !1;
    }),
      (a.onclick = function () {}));
    var o = makeEl("div", {
        class: "app_dialog_wrap app_flow_wrap",
        style:
          "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:max-content;min-width:min(280px,92vw);max-width:92vw;z-index:2",
      }),
      s = makeEl("div", {
        class: "app_dialog_panel",
        role: "dialog",
        "aria-modal": "true",
        style:
          "background:transparent;border-radius:15px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.5);max-height:80vh;display:flex;flex-direction:column;-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.12)",
      }),
      r = makeEl("div", {
        style:
          "background:var(--primary-blue);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0",
      }),
      l = makeEl("h3", {
        style:
          "font-size:16px;color:#fff;margin:0;text-shadow:none;font-weight:600;text-align:left;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
      });
    r.appendChild(l);
    var u = makeEl("div", {
        style: "flex:1;overflow-x:hidden;overflow-y:auto;padding:15px 20px",
      }),
      c = makeEl("div", {
        role: "status",
        "aria-live": "polite",
        style:
          "font-size:13px;line-height:1.6;white-space:pre-line;word-break:break-all;color:#fff;text-align:left;text-shadow:none;max-width:560px",
      }),
      d = makeEl("div", {
        class: "app_flow_actions",
        style: "display:flex;gap:10px;margin-top:15px",
      });
    (u.appendChild(c),
      u.appendChild(d),
      s.appendChild(r),
      s.appendChild(u),
      o.appendChild(s),
      a.content.appendChild(o),
      (a._popupSurface = s),
      (n = ui.flowNotice =
        { kind: e, host: a, panel: s, title: l, message: c, actions: d }),
      dialogContentMotion(s, !1));
  }
  return (
    n.title.textContent !== t && (n.title.textContent = t),
    n.message.textContent !== i && (n.message.textContent = i),
    n
  );
}
function makeFlowButton(e, t, i) {
  var n = createAppDialogButton(e, "normal", t);
  return (
    i &&
      Object.keys(i).forEach(function (e) {
        n[e] = i[e];
      }),
    Object.defineProperty(n, "value", {
      get: function () {
        return n.textContent;
      },
      set: function (e) {
        n.textContent = e;
      },
    }),
    n
  );
}
function clearFlowNotice(e) {
  var t = ui.flowNotice;
  (e && t && t.kind !== e) ||
    ((!e || "unisound" === e || (t && "unisound" === t.kind)) &&
      (clearTimeout(timers.loginState),
      clearTimeout(timers.unisoundInit),
      clearTimeout(timers.unisoundInitBackup),
      (timers.loginState =
        timers.unisoundInit =
        timers.unisoundInitBackup =
          -1)),
    t &&
      ((ui.flowNotice = null),
      state.unisoundSkipCheck &&
        state.unisoundSkipCheck.notice === t &&
        (clearTimeout(state.unisoundSkipCheck.timer),
        (state.unisoundSkipCheck = null)),
      closePopupAnimated(t.host)));
}
function ensurePopupHost() {
  return (
    (ui.popup &&
      ui.popup._popupContent &&
      ui.popup._popupOpen &&
      !ui.popup._appDialogExit) ||
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
function registerPopupCleanup(e, t) {
  return (
    e && e._popupOpen && "function" == typeof t && e._popupCleanups.push(t),
    e
  );
}
function restoreAnimatedDialog(e) {
  var t = e._appDialogExit;
  (t &&
    (clearTimeout(t.timer),
    (e._appDialogExit = null),
    (e.style.pointerEvents = t.pointerEvents),
    (e.inert = t.inert),
    null === t.ariaHidden
      ? e.removeAttribute("aria-hidden")
      : e.setAttribute("aria-hidden", t.ariaHidden),
    t.ids.forEach(function (e) {
      e.node.id = e.id;
    }),
    t.controls.forEach(function (e) {
      (void 0 !== e.disabled && (e.node.disabled = e.disabled),
        (e.visual || []).forEach(function (t) {
          e.node.style.setProperty
            ? e.node.style.setProperty(t.name, t.value, t.priority)
            : (e.node.style[t.name] = t.value);
        }),
        null === e.ariaDisabled
          ? e.node.removeAttribute("aria-disabled")
          : e.node.setAttribute("aria-disabled", e.ariaDisabled),
        null === e.tabIndex
          ? e.node.removeAttribute("tabindex")
          : e.node.setAttribute("tabindex", e.tabIndex));
    })),
    e.classList.remove(
      "app_dialog_outgoing",
      "app_dlg_out",
      "app_backdrop_out",
      "app_surface_out",
      "app_content_out",
      "app_content_in",
    ),
    e._popupLightExit ||
      Array.prototype.slice.call(e.children).forEach(restoreAnimatedDialog));
}
function dialogContentMotion(e, t) {
  if (e) {
    var i =
      e.classList.contains("app_dialog_panel") ||
      e.classList.contains("music_list_div")
        ? e
        : e.querySelector(".app_dialog_panel");
    i &&
      (i.classList.remove("app_content_in", "app_content_out"),
      i.offsetWidth,
      i.classList.add(t ? "app_content_out" : "app_content_in"));
  }
}
function enterAnimatedDialog(e, t) {
  e &&
    (restoreAnimatedDialog(e),
    e._popupDim && e._popupDim.classList.remove("app_backdrop_out"),
    dialogContentMotion(t || e._popupSurface || e, !1));
}
function reopenPopupHost(e) {
  return e && e._popupContent
    ? (ui.popup !== e &&
        ui.popup &&
        ui.popup._popupOpen &&
        closePopupAnimated(ui.popup),
      enterAnimatedDialog(e),
      (e._popupOpen = !0),
      (e.style.display = "block"),
      e.parentNode !== document.body && document.body.appendChild(e),
      releasePopupLayer(e),
      retainPopupLayer(e),
      (ui.popup = e),
      e)
    : ensurePopupHost();
}
function dismissAnimatedDialog(e, t, i) {
  if (((i = i || {}), !e || e._appDialogExit)) return !1;
  var n = {
    timer: null,
    pointerEvents: e.style.pointerEvents || "",
    inert: !!e.inert,
    ariaHidden: e.getAttribute("aria-hidden"),
    ids: [],
    controls: [],
  };
  ((e._appDialogExit = n),
    (e.style.pointerEvents = "none"),
    (e.inert = !0),
    e.setAttribute("aria-hidden", "true"),
    e._popupLightExit ||
      Array.prototype.slice
        .call(
          e.querySelectorAll("button,input,select,textarea,a[href],[tabindex]"),
        )
        .forEach(function (e) {
          var t = {
            node: e,
            disabled: "disabled" in e ? e.disabled : void 0,
            ariaDisabled: e.getAttribute("aria-disabled"),
            tabIndex: e.getAttribute("tabindex"),
            visual: [],
          };
          if (
            "undefined" != typeof window &&
            "function" == typeof window.getComputedStyle
          ) {
            var i = window.getComputedStyle(e);
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
            ].forEach(function (n) {
              t.visual.push({
                name: n,
                value: e.style.getPropertyValue(n),
                priority: e.style.getPropertyPriority(n),
                frozen: i.getPropertyValue(n),
              });
            });
          }
          n.controls.push(t);
        }),
    n.controls.forEach(function (e) {
      var t = e.node;
      (e.visual.forEach(function (e) {
        t.style.setProperty(e.name, e.frozen, "important");
      }),
        "disabled" in t && (t.disabled = !0),
        t.setAttribute("aria-disabled", "true"),
        t.setAttribute("tabindex", "-1"));
    }),
    !e._appDialogGuard &&
      e.addEventListener &&
      ((e._appDialogGuard = function (t) {
        e._appDialogExit && (t.preventDefault(), t.stopImmediatePropagation());
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
      ].forEach(function (t) {
        e.addEventListener(t, e._appDialogGuard, !0);
      })),
    e.classList.add("app_dialog_outgoing"),
    dialogContentMotion(i.surface || e, !0),
    e._popupDim && e._popupDim.classList.add("app_backdrop_out"),
    i.releaseIds &&
      [e]
        .concat(Array.prototype.slice.call(e.querySelectorAll("[id]")))
        .forEach(function (e) {
          e.id && (n.ids.push({ node: e, id: e.id }), e.removeAttribute("id"));
        }));
  try {
    document.activeElement &&
      e.contains(document.activeElement) &&
      document.activeElement.blur();
  } catch (e) {}
  function a() {
    e._appDialogExit === n &&
      (i.keepNode ? (e.style.display = "none") : e.remove(),
      i.onFinish && i.onFinish());
  }
  return (
    prefersReducedDialogMotion()
      ? a()
      : (n.timer = setTimeout(a, APP_DIALOG_EXIT_MS)),
    t && t(),
    !0
  );
}
function closePopupAnimated(e) {
  if (!e || !e._popupContent || !e._popupOpen || e._appDialogExit) return !1;
  ((e._popupOpen = !1),
    ui.popup === e &&
      (ui.popup =
        popupRenderHosts
          .filter(function (t) {
            return t._popupOpen && t !== e && t._sharedPopup;
          })
          .slice(-1)[0] || e));
  var t = e.call;
  e.call = null;
  var i,
    n = e._popupCleanups.splice(0);
  if (
    (dismissAnimatedDialog(e, null, {
      keepNode: !!e._popupKeepNode,
      releaseIds: !e._popupKeepNode,
      surface: e._popupSurface,
      onFinish: function () {
        releasePopupLayer(e);
      },
    }),
    n.concat("function" == typeof t ? [t] : []).forEach(function (e) {
      try {
        e();
      } catch (e) {
        i || (i = e);
      }
    }),
    i)
  )
    throw i;
  return !0;
}
function preparePopupDialog() {
  return ui.popup &&
    ui.popup._popupOpen &&
    (ui.popup.content.children.length || ui.popup.call)
    ? (closePopupAnimated(ui.popup), (ui.popup = createPopupHost()), ui.popup)
    : ensurePopupHost();
}
function createDialogPanel(e, t) {
  var i =
    (t = t || {}).host || (t.stack ? createPopupHost() : preparePopupDialog());
  ((i._sharedPopup = !0), (ui.popup = i));
  var n = makeEl("div", {
    class: "app_dialog_wrap",
    style:
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:auto;min-width:90%;max-width:92vw;z-index:2",
  });
  i.content.appendChild(n);
  var a =
    "background:transparent;border-radius:15px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.5);max-height:80vh;display:flex;flex-direction:column;";
  ((a +=
    "-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.12);"),
    t.width && (a += "width:" + t.width + ";"));
  var o = makeEl("div", { class: "app_dialog_panel", style: a }),
    s = makeEl("div", {
      style:
        "background:var(--primary-blue);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0",
    }),
    r = makeEl("h3", {
      style:
        "font-size:16px;color:#fff;margin:0;text-shadow:none;font-weight:600;text-align:left;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
      html: e || "",
    });
  s.appendChild(r);
  var l = makeEl("button", {
    type: "button",
    html: "✕",
    class: "app_btn app_dialog_close app_dialog_close_icon",
    style:
      "border:none;background:none;color:#fff;font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;outline:none;flex-shrink:0;transition:transform 0.2s",
    onclick: function () {
      closePopupAnimated(i);
    },
  });
  (s.appendChild(l), o.appendChild(s));
  var u = "flex:1;overflow-x:hidden;overflow-y:auto;";
  ((u += t.noPadding ? "" : "padding:15px 20px;"),
    t.bodyStyle && (u += t.bodyStyle));
  var c = makeEl("div", { style: u });
  (o.appendChild(c), n.appendChild(o), dialogContentMotion(o, !1));
  var d = {
    wrap: n,
    panel: o,
    header: s,
    body: c,
    title: r,
    closeBtn: l,
    host: i,
    close: function () {
      return closePopupAnimated(i);
    },
    onClose: function (e) {
      return (registerPopupCleanup(i, e), d);
    },
    isOpen: function () {
      return !!i._popupOpen && !i._appDialogExit;
    },
  };
  return d;
}
function createTextWindow(e, t, i) {
  var n = createDialogPanel(e || "提示", { noPadding: !0 });
  (n.wrap.classList.add("app_prompt_wrap"),
    (ui.textWindow = n.wrap),
    (n.title.style.fontSize = "15px"),
    (n.title.title = e || "提示"),
    (n.body.style.backgroundColor = "rgba(0,0,0,0.25)"),
    (n.body.style.color = "#fff"),
    (n.body.style.maxWidth = "90vw"),
    (n.body.style.maxHeight = "60vh"));
  var a = makeEl("div", {
      id: "text_window_text",
      style: "color:#fff;text-align:left;margin:10px 20px;text-shadow:none",
    }),
    o = String(t).split("\r\n");
  ((a.innerHTML = o
    .map(function (e) {
      return "<text>" + e + "</text><br>";
    })
    .join("")),
    n.body.appendChild(a),
    n.panel.appendChild(
      makeEl("span", {
        class: "app_btn app_dialog_close_option",
        style:
          "display:block;text-align:center;padding:10px;color:#fff;cursor:pointer;border-top:1px solid rgba(255,255,255,0.1)",
        html: "确认",
        onclick: n.close,
      }),
    ),
    (n.closeBtn.onclick = n.close),
    (n.host.call = i),
    dialogContentMotion(n.panel, !1));
}
function createColorPicker() {
  if (ui.colorPicker)
    ui.colorPicker._dialog.isOpen() ||
      reopenPopupHost(ui.colorPicker._dialog.host);
  else {
    var e = createDialogPanel("设置氛围灯颜色");
    ((ui.colorPicker = e.wrap), (ui.colorPicker._dialog = e));
    var t = e.body;
    ((t.style.color = "#fff"),
      t.appendChild(makeDiv("height:10px")),
      t.appendChild(makeText("选择颜色：")),
      t.appendChild(
        makeEl("input", {
          id: "color_selection",
          type: "color",
          style: "width:200px;height:120px",
          onchange: function () {
            var e = $("#color_value");
            e && (e.value = this.value.toUpperCase());
          },
        }),
      ),
      t.appendChild(makeDiv("height:10px")),
      t.appendChild(makeText("颜色值：")),
      t.appendChild(
        makeEl("input", {
          id: "color_value",
          type: "text",
          style: "height:40px;width:136px",
          onchange: function () {
            var e = $("#color_selection");
            e && (e.value = this.value.toUpperCase());
          },
        }),
      ),
      t.appendChild(makeDiv("height:10px")),
      t.appendChild(
        makeButton("保存", function () {
          if (e.isOpen()) {
            var t = e.body.querySelector("#color_value").value;
            if (!/^#[0-9a-fA-F]{6}$/.test(t))
              return showAppAlert("颜色值错误！请输入 #RRGGBB 格式的颜色。");
            (sendWs({
              type: "send_message",
              type_id: "modify_color",
              what: 4,
              arg1: 70,
              arg2: parseInt(t.slice(1), 16),
            }),
              e.close());
          }
        }),
      ));
  }
  if (null != state.info.music_light_color) {
    for (var i = state.info.music_light_color.toString(16); i.length < 6;)
      i = "0" + i;
    var n = "#" + i.toUpperCase(),
      a = ui.colorPicker._dialog.body.querySelector("#color_selection");
    a && (a.value = n);
    var o = ui.colorPicker._dialog.body.querySelector("#color_value");
    o && (o.value = n);
  }
}
var appDialogStack = [];
function updateAppDialogLayers() {
  popupRenderHosts.forEach(function (e, t) {
    e.style.zIndex = 9998 + 2 * t;
  });
}
function createAppDialogButton(e, t, i) {
  var n = {
    normal:
      "flex:1;border:none;border-radius:8px;padding:9px 0;font-size:13px;color:#fff;cursor:pointer;background:rgba(255,255,255,0.15)",
    primary:
      "flex:1;border:none;border-radius:8px;padding:9px 0;font-size:13px;color:#fff;cursor:pointer;background:var(--primary-blue)",
    danger:
      "flex:1;border:none;border-radius:8px;padding:9px 0;font-size:13px;color:#fff;cursor:pointer;background:rgba(230,80,80,0.9)",
  };
  return makeEl("button", {
    type: "button",
    text: e || "确定",
    class: "app_btn",
    style: n[t] || n.normal,
    onclick: i,
  });
}
function showAppDialog(e) {
  var t = (e = e || {}).width || "78vw",
    i = createPopupHost({ blur: !1 }),
    n = i._popupDim,
    a = makeEl("div", {
      class: "app_dialog_wrap app_prompt_wrap",
      style:
        "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:" +
        t +
        ";z-index:2",
    }),
    o = makeEl("div", {
      class: "app_dialog_panel",
      style:
        "background:transparent;border-radius:15px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.5);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.12);max-height:70vh;display:flex;flex-direction:column",
    }),
    s = makeEl("div", {
      style:
        "background:var(--primary-blue);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0",
    });
  s.appendChild(
    makeEl("h3", {
      style:
        "font-size:15px;color:#fff;margin:0;text-shadow:none;font-weight:600;text-align:left;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
      text: e.title || "提示",
    }),
  );
  var r = makeEl("button", {
    type: "button",
    text: "✕",
    class: "app_btn app_dialog_close app_dialog_close_icon",
    style:
      "border:none;background:none;color:#fff;font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;outline:none;border-radius:50%",
  });
  s.appendChild(r);
  var l = makeEl("div", {
    style: "flex:1;overflow-x:hidden;overflow-y:auto;padding:12px 16px",
  });
  (o.appendChild(s), o.appendChild(l), a.appendChild(o));
  var u = !1,
    c = null,
    d = { host: i, backdrop: n, wrap: a };
  function p() {
    return (
      appDialogStack[appDialogStack.length - 1] === d &&
      popupRenderHosts
        .filter(function (e) {
          return e._popupOpen;
        })
        .slice(-1)[0] === i
    );
  }
  function m(t) {
    if (u) return !1;
    ((u = !0), clearTimeout(c), closePopupAnimated(i));
    var n = appDialogStack.indexOf(d);
    return (
      -1 !== n && appDialogStack.splice(n, 1),
      updateAppDialogLayers(),
      !t && e.onCancel && e.onCancel(),
      !0
    );
  }
  function f(e) {
    if (!u && p())
      if (e.cancel) m();
      else {
        var t = h ? h.value : void 0;
        m(!0) && e.onClick && e.onClick(t);
      }
  }
  ((r.onclick = function () {
    p() && m();
  }),
    (n.onclick = function () {
      p() && m();
    }));
  var h = null,
    g = null != e.text ? e.text : e.message;
  (null != g &&
    "" !== g &&
    l.appendChild(
      makeEl("div", {
        style:
          "color:#fff;font-size:13px;padding:2px 0 12px;text-align:left;line-height:1.6;word-break:break-all;white-space:pre-line",
        text: g,
      }),
    ),
    e.input &&
      ((h = makeEl("input", {
        type: e.input.type || "text",
        value: null == e.input.value ? "" : e.input.value,
        placeholder: e.input.placeholder || "",
        style:
          "width:100%;box-sizing:border-box;color:#fff;background:#333;border:1px solid #555;border-radius:8px;padding:8px 10px;font-size:13px;outline:none;margin-bottom:12px",
      })),
      l.appendChild(h),
      (c = setTimeout(function () {
        if (!u && p())
          try {
            h.focus();
          } catch (e) {}
      }, 80))));
  var v = makeEl("div", { style: "display:flex;gap:10px" }),
    y =
      e.buttons && e.buttons.length
        ? e.buttons
        : [{ text: "确定", style: "primary" }],
    _ = y.filter(function (e) {
      return !e.cancel;
    }),
    b = _[_.length - 1];
  return (
    _.concat(
      y.filter(function (e) {
        return e.cancel;
      }),
    ).forEach(function (e) {
      v.appendChild(
        createAppDialogButton(e.text, e.style, function () {
          f(e);
        }),
      );
    }),
    l.appendChild(v),
    h &&
      (h.onkeydown = function (e) {
        "Enter" === e.key &&
          !e.isComposing &&
          229 !== e.keyCode &&
          b &&
          !u &&
          p() &&
          (e.preventDefault(), e.stopPropagation(), f(b));
      }),
    appDialogStack.push(d),
    updateAppDialogLayers(),
    (i.onclick = function (e) {
      (e.target !== i && e.target !== i.content) || !p() || m();
    }),
    (i.onclose = function () {
      return !!p() && m();
    }),
    i.content.appendChild(a),
    dialogContentMotion(o, !1),
    {
      host: i,
      wrap: a,
      panel: o,
      close: m,
      input: function () {
        return h ? h.value : void 0;
      },
    }
  );
}
function showAppAlert(e, t, i) {
  return showAppDialog({
    message: e,
    text: (i = i || {}).text,
    title: i.title,
    width: i.width,
    onCancel: i.onCancel,
    buttons: [
      { text: i.okText || "确定", style: i.style || "primary", onClick: t },
    ],
  });
}
function showAppConfirm(e, t, i) {
  return showAppDialog({
    message: e,
    text: (i = i || {}).text,
    title: i.title,
    width: i.width,
    onCancel: i.onCancel,
    buttons: [
      { text: i.okText || "确定", style: i.style || "primary", onClick: t },
      { text: i.cancelText || "取消", style: "normal", cancel: !0 },
    ],
  });
}
function showAppPrompt(e, t, i, n) {
  return showAppDialog({
    message: e,
    text: (n = n || {}).text,
    title: n.title,
    width: n.width,
    onCancel: n.onCancel,
    input: {
      value: null == t ? "" : t,
      placeholder: n.placeholder || "",
      type: n.inputType || "text",
    },
    buttons: [
      { text: n.okText || "确定", style: n.style || "primary", onClick: i },
      { text: n.cancelText || "取消", style: "normal", cancel: !0 },
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
  [
    "我的歌单",
    { type: -1, min_ver: 1600, min_uver: 1800, itemType: "get_song_list" },
  ],
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
      tips: [
        "打开已允许的蓝牙、DLNA、AirPlay、MiPlay服务",
        "断开当前投放并退出连接模式",
      ],
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
      state: [
        2,
        "unisoundInfo.Wakeup_Xiaoai",
        [!1, !0],
        ["unisoundInfo.is_xiaoai_exists", !0],
      ],
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
  [
    "设置语音报时",
    { type: -1, itemType: "Voice_time_reporting", min_uver: 1832 },
  ],
  [
    "设置自动重启",
    { type: -1, itemType: "Auto_restart_device", min_ver: 1848 },
  ],
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
function buildTextsPanel(e) {
  var t = makeEl("div");
  if (
    (t.appendChild(makeText("信息：")),
    t.appendChild(makeEl("textarea", { id: "text", readOnly: !0 })),
    t.appendChild(makeEl("br")),
    t.appendChild(makeText("输入：")),
    t.appendChild(makeEl("input", { type: "search", id: "input" })),
    isEchoVer(1600) && isUnisoundVer(1700))
  ) {
    var i = makeEl("div");
    i.appendChild(makeText("发音人:"));
    var n = makeEl("select", { id: "tts_speaker" });
    n.onchange = function () {
      updateTtsSpeaker(this.value);
    };
    for (
      var a = [
          ["萱萱", "SWEET"],
          ["小雯", "FEMALE"],
          ["糖糖", "CHILDREN"],
          ["玲玲", "LZL"],
          ["小峰", "MALE"],
          ["天天", "TIANTIAN"],
        ],
        o = 0;
      o < a.length;
      o++
    ) {
      var s = makeEl("option", { value: a[o][1], html: a[o][0] });
      (a[o][1] === e.ttsModelType && (s.selected = !0), n.appendChild(s));
    }
    (i.appendChild(n), i.appendChild(makeText("音乐源:")));
    var r = makeEl("select", { id: "music_source" });
    r.onchange = function () {
      setMusicSource(this.value);
    };
    for (
      var l = [
          ["QQ音乐", "qq"],
          ["酷我音乐", "kuwo"],
          ["网易云音乐", "netease"],
        ],
        u = 0;
      u < l.length;
      u++
    ) {
      var c = makeEl("option", { value: l[u][1], html: l[u][0] });
      (l[u][1] === e.music_source && (c.selected = !0), r.appendChild(c));
    }
    (i.appendChild(r), t.appendChild(i));
  }
  return t;
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
function updatePlayButtonIcon(e, t) {
  e &&
    e.getAttribute("data-status") !== t &&
    (e.setAttribute("data-status", t),
    "pause" === t
      ? ((e.innerHTML = MUSIC_ICONS.pause),
        e.setAttribute("title", "暂停"),
        e.setAttribute("data", "pause"),
        e.classList.add("playing"),
        e.classList.remove("buffering"))
      : "buffer" === t
        ? ((e.innerHTML = MUSIC_ICONS.buffer),
          e.setAttribute("title", "缓冲中"),
          e.setAttribute("data", "buffer"),
          e.classList.remove("playing"),
          e.classList.add("buffering"))
        : "loading" === t
          ? ((e.innerHTML = MUSIC_ICONS.loading),
            e.setAttribute("title", "加载中"),
            e.setAttribute("data", "loading"),
            e.classList.remove("playing"),
            e.classList.add("buffering"))
          : ((e.innerHTML = MUSIC_ICONS.play),
            e.setAttribute("title", "播放"),
            e.setAttribute("data", "play"),
            e.classList.remove("playing"),
            e.classList.remove("buffering")));
}
function updatePlayModeIcon(e, t) {
  if (e) {
    var i = 2 == t ? 2 : 3 == t ? 3 : 1;
    e._renderedPlayMode !== i &&
      ((e._renderedPlayMode = i),
      2 == t
        ? ((e.innerHTML = MUSIC_ICONS.sequential),
          e.setAttribute("title", "顺序播放"))
        : 3 == t
          ? ((e.innerHTML = MUSIC_ICONS.repeatOne),
            e.setAttribute("title", "单曲循环"))
          : ((e.innerHTML = MUSIC_ICONS.shuffle),
            e.setAttribute("title", "随机播放")));
  }
}
function onDoubleTap(e, t) {
  var i = 0;
  e.addEventListener("click", function (e) {
    var n = Date.now();
    n - i < 400 ? ((i = 0), t(e)) : (i = n);
  });
}
function buildMusicPanel(e) {
  var t = makeEl("div", {
    id: "music_root",
    style:
      "display:none;max-width:" +
      (window.screen && window.screen.width >= 768 ? "580" : "520") +
      "px;margin:0 auto;padding:0 14px 12px;box-sizing:border-box",
  });
  ui.musicPanel = t;
  var i = makeEl("div", {
    style:
      "position:relative;width:100%;height:240px;display:flex;justify-content:center;align-items:center;margin:0 0 15px;box-sizing:border-box",
  });
  t.appendChild(i);
  var n = makeEl("img", {
    id: "music_pic",
    src: R1Config.assetUrl("pic/nopic.jpg"),
    style:
      "display:block;width:240px;height:240px;border-radius:50%;object-fit:cover;border:4px solid rgba(var(--mask-color),0.25);box-shadow:0 6px 24px rgba(0,0,0,0.35);-webkit-animation:img 30s linear infinite;animation:img 30s linear infinite;animation-play-state:paused;user-select:none;-webkit-user-drag:none",
    draggable: "false",
  });
  ((n.nopic = R1Config.assetUrl("pic/nopic.jpg")),
    (n.onload = function () {
      updateCoverBackground();
    }),
    (n.onerror = function () {
      this !== ui.musicPic ||
        this._coverPending ||
        this._coverLoading ||
        (restoreCoverBackground(),
        this.src !== this.nopic && (this.src = this.nopic));
    }),
    (ui.musicPic = n),
    i.appendChild(n));
  var a = makeEl("div", {
    id: "music_lrc",
    style:
      "display:none;width:100%;height:100%;overflow:hidden;position:relative",
  });
  ((ui.musicLyrics = a), i.appendChild(a));
  var o = null,
    s = function () {
      null === o &&
        (o = requestAnimationFrame(function () {
          if (
            ((o = null),
            !(
              state.lrcFullscreen ||
              !t.parentNode ||
              "none" === t.style.display ||
              (ui.musicPanel && ui.musicPanel !== t)
            ))
          ) {
            var e = state.lyricsPending,
              n =
                e &&
                e.musicId === state.musicId &&
                e.hostname === state.hostname &&
                e.socket === state.ws,
              s = 240;
            if (
              "block" === a.style.display &&
              (n ||
                ("function" == typeof hasRealLyrics &&
                  hasRealLyrics() &&
                  state.lyricTiming.length > 0))
            ) {
              var r = ui.main,
                l = r ? r.clientHeight : window.innerHeight,
                u = r ? r.getBoundingClientRect().top : 0,
                c = r ? r.scrollTop : window.pageYOffset || 0,
                d = i.getBoundingClientRect().top - u + c,
                p = t.getBoundingClientRect().height - i.offsetHeight,
                m = 0;
              function f(e) {
                return parseFloat(e) || 0;
              }
              function h(e, t) {
                if (!e || !t) return 0;
                for (var i = !1, n = 0, a = 0; a < e.children.length; a++) {
                  var o = e.children[a];
                  if (o !== t) {
                    if (i) {
                      var s = getComputedStyle(o);
                      "none" !== s.display &&
                        "absolute" !== s.position &&
                        "fixed" !== s.position &&
                        (n +=
                          o.getBoundingClientRect().height +
                          f(s.marginTop) +
                          f(s.marginBottom));
                    }
                  } else i = !0;
                }
                return n;
              }
              var g = ui.container;
              ((m += h(g, t)),
                r && g && (m += h(r, g)),
                g && (m += f(getComputedStyle(g).paddingBottom)),
                r && (m += f(getComputedStyle(r).paddingBottom)),
                (s = Math.max(240, l - d - p - m - 20)));
            }
            var v = Math.floor(s) + "px";
            i.style.height !== v && (i.style.height = v);
          }
        }));
    };
  ((ui.applyLyricsModeHeight = s),
    onDoubleTap(n, function () {
      if (state.musicInfo) {
        var e = getTrackTitle(state.musicInfo);
        (setPageTitle(e), (document.title = state.deviceTag + e));
      }
      ((n.style.display = "none"),
        (a.style.display = "block"),
        setTimeout(s, 20),
        updateLyrics(!0),
        localStorage.setItem(state.hostname + "_lrc_mode", 1));
    }),
    onDoubleTap(a, function () {
      state.lrcFullscreen
        ? exitFullscreenLrc()
        : ((a.style.display = "none"),
          (n.style.display = "block"),
          s(),
          localStorage.setItem(state.hostname + "_lrc_mode", 0));
    }),
    0 != localStorage.getItem(state.hostname + "_lrc_mode") &&
      ((n.style.display = "none"),
      (a.style.display = "block"),
      setTimeout(s, 0),
      setTimeout(s, 150),
      setTimeout(s, 400),
      setTimeout(s, 900)));
  var r = makeEl("div", {
    style:
      "display:flex;align-items:center;justify-content:center;margin:6px 0",
  });
  t.appendChild(r);
  var l = makeEl("div", {
    style:
      "flex:0 0 48px;width:48px;text-align:center;color:var(--white);font-variant-numeric:tabular-nums;font-family:Consolas,Monaco,monospace;line-height:1.2",
  });
  ((ui.musicTimeCurrent = makeText("00:00")),
    l.appendChild(ui.musicTimeCurrent),
    r.appendChild(l));
  var u = makeEl("div", { style: "flex:1 1 auto;padding:0 8px;min-width:0" }),
    c = makeEl("input", {
      id: "music_time",
      type: "range",
      min: 0,
      step: 1,
      max: 0,
      value: 0,
      style: "width:100%;pointer-events:auto;cursor:pointer",
    });
  if (((ui.musicTimeRange = c), isEchoVer(1827))) {
    var d = function () {
        (state.seekSession && !state.seekSession.committed) || beginMusicSeek();
      },
      p = function () {
        commitMusicSeek();
      };
    (["pointerdown", "mousedown", "touchstart"].forEach(function (e) {
      c.addEventListener(e, d);
    }),
      c.addEventListener("input", function () {
        previewMusicSeek(c.value);
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
      ].forEach(function (e) {
        c.addEventListener(e, p);
      }),
      ["pointerup", "mouseup", "touchend"].forEach(function (e) {
        document.addEventListener(e, function () {
          ui.musicTimeRange === c && p();
        });
      }));
  }
  (u.appendChild(c), r.appendChild(u));
  var m = makeEl("div", {
    style:
      "flex:0 0 48px;width:48px;text-align:center;color:var(--white);font-variant-numeric:tabular-nums;font-family:Consolas,Monaco,monospace;line-height:1.2",
  });
  ((ui.musicTimeTotal = makeText("00:00")),
    m.appendChild(ui.musicTimeTotal),
    r.appendChild(m),
    (ui.qualityPanel = makeEl("div", {
      id: "quality_div",
      style:
        "display:none;text-align:center;margin:2px 0 8px;color:rgba(255,255,255,0.7);text-shadow:var(--white-shadow)",
    })),
    ui.qualityPanel.appendChild(makeText("音质：", "")),
    (ui.qualitySelect = makeEl("select", {
      id: "switch_quality",
      style:
        "margin:5px 5px 0px 0px;min-width: 60px;height: 25px;backdrop-filter: none;",
    })),
    (ui.qualitySelect.onchange = function () {
      sendWs({ type: "switch_quality", quality: this.value });
    }));
  for (
    var f = [
        ["Hi-Res", 3],
        ["无损", 2],
        ["超品", 1],
        ["高品", 0],
      ],
      h = 0;
    h < f.length;
    h++
  ) {
    var g = makeEl("option", { value: f[h][1], html: f[h][0] });
    (f[h][1] == e.ExoPlayer_Quality && (g.selected = !0),
      ui.qualitySelect.appendChild(g));
  }
  (1 != state.info.Support_Flac &&
    ui.qualitySelect.length > 2 &&
    ((ui.qualitySelect[0].style.display = "none"),
    (ui.qualitySelect[1].style.display = "none"),
    (ui.qualitySelect[2].selected = !0)),
    ui.qualityPanel.appendChild(ui.qualitySelect),
    (ui.qualityLabel = makeText("", "")),
    ui.qualityPanel.appendChild(ui.qualityLabel),
    t.appendChild(ui.qualityPanel),
    2 == e.Current_PlayerType &&
      isEchoVer(1863) &&
      (ui.qualityPanel.style.display = "block"));
  var v = makeEl("div", {
    style:
      "display:flex;justify-content:center;align-items:center;margin:14px 0 10px",
  });
  t.appendChild(v);
  var y = makeEl("button", {
    id: "music_btn_prev",
    type: "button",
    data: "prev",
    html: MUSIC_ICONS.prev,
    title: "上一首",
    style:
      "width:64px;height:50px;margin:0 16px;border:none;border-radius:25px;background:rgba(255,255,255,0.1);color:var(--white);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;outline:none;transition:background 0.15s",
    onclick: function () {
      var e = parseInt(this.getAttribute("time") || Date.now(), 10);
      Date.now() - e < 0 ||
        (this.setAttribute("time", Date.now() + 500),
        executeMusicCommand(this));
    },
  });
  v.appendChild(y);
  var _ = makeEl("button", {
    id: "music_btn_play",
    type: "button",
    data: "play",
    html: MUSIC_ICONS.play,
    title: "播放",
    style:
      "width:88px;height:58px;margin:0 16px;border:none;border-radius:29px;background:var(--primary-blue);color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;outline:none;box-shadow:0 4px 16px rgba(53,145,234,0.5);transition:transform 0.1s",
    onclick: function () {
      var e = parseInt(this.getAttribute("time") || Date.now(), 10);
      Date.now() - e < 0 ||
        (this.setAttribute("time", Date.now() + 500),
        executeMusicCommand(this));
    },
  });
  v.appendChild(_);
  var b = makeEl("button", {
    id: "music_btn_next",
    type: "button",
    data: "next",
    html: MUSIC_ICONS.next,
    title: "下一首",
    style:
      "width:64px;height:50px;margin:0 16px;border:none;border-radius:25px;background:rgba(255,255,255,0.1);color:var(--white);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;outline:none;transition:background 0.15s",
    onclick: function () {
      var e = parseInt(this.getAttribute("time") || Date.now(), 10);
      Date.now() - e < 0 ||
        (this.setAttribute("time", Date.now() + 500),
        executeMusicCommand(this));
    },
  });
  v.appendChild(b);
  var k = makeEl("div", {
    class: "music_aux_controls",
    style:
      "display:flex;justify-content:center;align-items:center;flex-wrap:wrap;margin:6px 0 0px",
  });
  t.appendChild(k);
  var w =
      "width:56px;height:40px;margin:6px 8px;border:none;border-radius:20px;background:rgba(255,255,255,0.08);color:var(--white);cursor:pointer;align-items:center;justify-content:center;padding:0;outline:none;transition:background 0.15s",
    C = makeEl("button", {
      id: "music_btn_collect",
      type: "button",
      data: "collect",
      html: MUSIC_ICONS.collect,
      title: "收藏",
      hidden: !0,
      style: w + ";display:none",
      onclick: function () {
        executeMusicCommand(this);
      },
    });
  k.appendChild(C);
  var x = makeEl("button", {
    id: "music_btn_cancel_collect",
    type: "button",
    data: "cancel_collect",
    html: MUSIC_ICONS.cancelCollect,
    title: "取消收藏",
    hidden: !0,
    style: w + ";display:none",
    onclick: function () {
      executeMusicCommand(this);
    },
  });
  k.appendChild(x);
  var T = makeEl("button", {
    id: "music_btn_playmode",
    type: "button",
    data: "playmode",
    mode: "1",
    html: MUSIC_ICONS.shuffle,
    title: "随机播放",
    style: w + ";display:inline-flex",
    onclick: function () {
      for (
        var e = [
            ["随机播放", 1],
            ["顺序播放", 2],
            ["单曲循环", 3],
          ],
          t = (parseInt(this.getAttribute("mode"), 10) % 3) + 1,
          i = e[0],
          n = 0;
        n < e.length;
        n++
      )
        e[n][1] === t && (i = e[n]);
      (this.setAttribute("mode", i[1]),
        updatePlayModeIcon(this, i[1]),
        sendWs({ type: "set_play_mode", mode: i[1] }),
        sendWs({ type: "get_info" }));
    },
  });
  k.appendChild(T);
  var S = makeEl("button", {
    id: "music_btn_background",
    type: "button",
    html: state.coverBackgroundEnabled
      ? MUSIC_ICONS.background
      : MUSIC_ICONS.backgroundOff,
    title: state.coverBackgroundEnabled ? "关闭封面背景" : "打开封面背景",
    style: w + ";display:inline-flex",
    onclick: function () {
      var e = state.coverBackgroundEnabled
          ? "确定要关闭封面背景吗？"
          : "确定要打开封面背景吗？\r\n提示：打开后可能会导致页面卡顿！",
        t = this;
      showAppConfirm(e, function () {
        ((state.coverBackgroundEnabled = !state.coverBackgroundEnabled),
          localStorage.setItem(
            "Cover_background_open",
            state.coverBackgroundEnabled,
          ),
          (t.innerHTML = state.coverBackgroundEnabled
            ? MUSIC_ICONS.background
            : MUSIC_ICONS.backgroundOff),
          t.setAttribute(
            "title",
            state.coverBackgroundEnabled ? "关闭封面背景" : "打开封面背景",
          ),
          state.coverBackgroundEnabled
            ? updateCoverBackground()
            : restoreBackground());
      });
    },
  });
  k.appendChild(S);
  var E = makeEl("button", {
    id: "music_btn_fullscreen",
    type: "button",
    html: MUSIC_ICONS.fullscreen,
    title: "全屏歌词",
    style: w + ";display:inline-flex",
    onclick: function () {
      toggleFullscreenLrc();
    },
  });
  k.appendChild(E);
  var I = makeEl("button", {
    id: "music_btn_list",
    type: "button",
    html: MUSIC_ICONS.list,
    title: "播放列表",
    style: w + ";display:inline-flex",
    onclick: function () {
      showPlaylistOverlay();
    },
  });
  k.appendChild(I);
  var P = makeEl("button", {
    id: "music_btn_search",
    type: "button",
    html: MUSIC_ICONS.search,
    title: "搜索音乐（需 EchoService 1887+）",
    style:
      w + ";display:" + (hasMusicQueueCapability() ? "inline-flex" : "none"),
    onclick: function () {
      hasMusicQueueCapability() &&
        "function" == typeof createMusicSearchDialog &&
        createMusicSearchDialog();
    },
  });
  (k.appendChild(P), updatePlayModeIcon(T, e.play_mode || 1));
  var A = window.innerWidth + ":" + window.innerHeight,
    L = function () {
      var e = window.innerWidth + ":" + window.innerHeight;
      e !== A &&
        ((A = e),
        setTimeout(function () {
          (s(),
            state.lrcFullscreen && updateFullscreenTitle(),
            state.lrcFullscreen && ui.fullscreenLrc
              ? ((ui.fullscreenLrc._lyrics = null), updateLyrics(!0))
              : ui.musicLyrics &&
                "block" === ui.musicLyrics.style.display &&
                ((ui.musicLyrics._lyrics = null), updateLyrics(!0)));
        }, 150));
    };
  if (
    (window.addEventListener("resize", L),
    window.addEventListener("orientationchange", L),
    "function" == typeof ResizeObserver)
  ) {
    var M = new ResizeObserver(function () {
      ui.musicPanel === t ? s() : M.disconnect();
    });
    ([r, ui.qualityPanel, v, k].forEach(function (e) {
      M.observe(e);
    }),
      ui.main &&
        Array.prototype.slice.call(ui.main.children).forEach(function (e) {
          e !== ui.container && M.observe(e);
        }));
  }
  return t;
}
function createFullscreenLrcOverlay() {
  if (!ui.fullscreenOverlay) {
    var e = makeEl("div", { id: "lrc_fullscreen_overlay" });
    ui.fullscreenOverlay = e;
    var t = makeEl("div", { id: "lrc_fullscreen_bg" });
    if (((ui.fullscreenBg = t), e.appendChild(t), window.plus))
      try {
        var i = Math.floor(plus.navigator.getStatusbarHeight() / 2);
        i > 0 &&
          e.appendChild(
            makeEl("div", {
              style:
                "height:" +
                i +
                "px;flex-shrink:0;position:relative;z-index:2;pointer-events:none",
            }),
          );
      } catch (e) {}
    var n = makeEl("div", { id: "lrc_fullscreen_header" }),
      a = makeEl("img", {
        id: "lrc_fullscreen_cover",
        src: "",
        onerror: function () {
          this.style.visibility = "hidden";
        },
      });
    ((ui.fullscreenCover = a), n.appendChild(a));
    var o = makeEl("div", { id: "lrc_fullscreen_info" });
    ui.fullscreenTitleEl = makeEl("div", {
      id: "lrc_fullscreen_title",
      html: "",
    });
    var s = makeEl("div", { id: "lrc_fullscreen_meta" });
    ((ui.fullscreenArtistEl = makeEl("span", {
      id: "lrc_fullscreen_artist",
      html: "",
    })),
      (ui.fullscreenTimeEl = makeEl("span", {
        id: "lrc_fs_time",
        html: "00:00 / 00:00",
      })),
      s.appendChild(ui.fullscreenArtistEl),
      s.appendChild(ui.fullscreenTimeEl),
      o.appendChild(ui.fullscreenTitleEl),
      o.appendChild(s),
      n.appendChild(o));
    var r = makeEl("div", { id: "lrc_fullscreen_btns" }),
      l = makeEl("button", {
        id: "lrc_fullscreen_play",
        type: "button",
        html: MUSIC_ICONS.play,
        title: "播放",
        onclick: function () {
          if (
            !state.musicInfo ||
            (6 != state.musicInfo.state && 10 != state.musicInfo.state)
          ) {
            var e = parseInt(this.getAttribute("time") || "0", 10);
            if (!(Date.now() - e < 0)) {
              this.setAttribute("time", Date.now() + 600);
              var t = isPlayingState();
              if (
                ((state.info.play_state = !t),
                (state.fullscreenPlayProtectUntil = Date.now() + 2e3),
                t)
              ) {
                ((this.innerHTML = MUSIC_ICONS.play),
                  this.classList.remove("playing"),
                  this.setAttribute("data", "play"),
                  sendAction(4, 2, -1, !0));
                var i = $("#music_btn_play");
                i &&
                  (i.setAttribute("data", "play"),
                  i.classList.remove("playing"),
                  updatePlayButtonIcon(i, "play"));
              } else {
                ((this.innerHTML = MUSIC_ICONS.pause),
                  this.classList.add("playing"),
                  this.setAttribute("data", "pause"),
                  0 == state.info.play_type &&
                  (!state.playlist.playList ||
                    state.playlist.playList.length < 1) &&
                  state.info.Recoverable_music
                    ? sendAction(4, 24, 1, !0)
                    : sendAction(4, 3, -1, !0));
                var n = $("#music_btn_play");
                n &&
                  (n.setAttribute("data", "pause"),
                  n.classList.add("playing"),
                  updatePlayButtonIcon(n, "pause"));
              }
              sendWs({ type: "get_info" });
            }
          }
        },
      });
    ((ui.fullscreenPlayBtn = l), r.appendChild(l));
    var u = makeEl("button", {
      id: "lrc_fullscreen_next",
      type: "button",
      html: MUSIC_ICONS.next,
      title: "下一首",
      onclick: function () {
        var e = parseInt(this.getAttribute("time") || "0", 10);
        Date.now() - e < 0 ||
          (this.setAttribute("time", Date.now() + 500),
          sendWs({ type: "next" }),
          sendWs({ type: "get_info" }));
      },
    });
    ((ui.fullscreenNextBtn = u),
      r.appendChild(u),
      r.appendChild(
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
      n.appendChild(r),
      e.appendChild(n));
    var c = makeEl("div", { id: "lrc_fullscreen_content" });
    ((ui.fullscreenLrc = c), e.appendChild(c), document.body.appendChild(e));
  }
}
function syncFullscreenControls() {
  if (state.lrcFullscreen) {
    ui.fullscreenPlayBtn &&
      (!state.musicInfo ||
      (6 != state.musicInfo.state && 10 != state.musicInfo.state)
        ? state.fullscreenPlayProtectUntil &&
          Date.now() < state.fullscreenPlayProtectUntil
          ? (ui.fullscreenPlayBtn.disabled = !1)
          : ((ui.fullscreenPlayBtn.disabled = !1),
            updatePlayButtonIcon(
              ui.fullscreenPlayBtn,
              isPlayingState() ? "pause" : "play",
            ))
        : ((ui.fullscreenPlayBtn.disabled = !0),
          updatePlayButtonIcon(
            ui.fullscreenPlayBtn,
            6 == state.musicInfo.state ? "buffer" : "loading",
          )));
    var e = state.lyricTiming[2] ? parseInt(state.lyricTiming[2], 10) : 0,
      t = state.lyricTiming[1] ? parseInt(state.lyricTiming[1], 10) : 0;
    ui.fullscreenTimeEl &&
      (ui.fullscreenTimeEl.innerHTML = msToTime(t) + " / " + msToTime(e));
  }
}
function isPlayingState() {
  var e = state.info.play_state;
  return !0 === e || 1 === e || "true" === e || "1" === e;
}
function updateFullscreenBg(e) {
  if (ui.fullscreenBg && state.lrcFullscreen) {
    var t = ui.fullscreenBg,
      i = ui.fullscreenOverlay,
      n = ui.musicPic,
      a = n && n._coverRequest,
      o =
        !e &&
        state.coverBackgroundEnabled &&
        n &&
        (n._coverPending || n._coverLoading),
      s = t._backgroundLayers;
    if (o && s && s.hostname === state.hostname && (s.current || s.incoming))
      t.style.display = "block";
    else {
      var r,
        l =
          !e &&
          state.coverBackgroundEnabled &&
          ui.musicPic &&
          ui.musicPic.complete &&
          0 !== ui.musicPic.naturalWidth &&
          ui.musicPic.src &&
          -1 === ui.musicPic.src.indexOf("nopic") &&
          ui.musicPic._failedBackgroundCover !== ui.musicPic.src
            ? safeBackgroundUrl(ui.musicPic.src)
            : "",
        u = l ? "cover" : "stored",
        c =
          "cover" === u
            ? 50
            : Math.max(
                0,
                Math.min(
                  60,
                  parseInt(
                    localStorage.getItem(state.hostname + "_BackgroundBlur"),
                    10,
                  ) || 0,
                ),
              );
      if (l)
        r = {
          url: l,
          props: {
            "background-image": 'url("' + l + '")',
            "background-size": "cover",
            "background-position": "center",
            "background-repeat": "no-repeat",
            "background-attachment": "fixed",
          },
        };
      else {
        var d = ui.background && ui.background._backgroundLayers,
          p =
            d &&
            d.hostname === state.hostname &&
            (d.incoming && "1" === d.incoming.style.opacity
              ? d.incoming
              : d.current);
        if (
          !d ||
          d.hostname !== state.hostname ||
          !d.requestedKey ||
          d.cover ||
          (d.guard && !d.guard())
        ) {
          if (p && !p._coverBackground) {
            var m = {};
            (BACKGROUND_PROPS.forEach(function (e) {
              var t = p.style.getPropertyValue(e);
              t && (m[e] = t);
            }),
              Object.keys(m).length ||
                (m.background = p.style.getPropertyValue("background")),
              (r = { url: p._backgroundUrl || "", props: m }));
          }
        } else r = d.background;
        r ||
          (r = parseBackgroundCss(
            localStorage.getItem(state.hostname + "_background") ||
              DEFAULT_BACKGROUND,
          ));
      }
      ((t.style.display = "block"),
        (i.style.background = "#10243a"),
        transitionBackground(t, r, {
          mode: u,
          cover: "cover" === u,
          blur: c,
          guard: function () {
            return (
              ui.fullscreenBg === t &&
              ui.fullscreenOverlay === i &&
              state.lrcFullscreen &&
              ("cover" !== u ||
                (state.coverBackgroundEnabled &&
                  ui.musicPic === n &&
                  n.src === l &&
                  n._coverRequest === a &&
                  (!o || state.coverBackgroundApplied)))
            );
          },
          onError: function () {
            "cover" === u && o
              ? updateFullscreenBg(!0)
              : "cover" === u
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
    (ui.fullscreenOverlay._closeSequence =
      (ui.fullscreenOverlay._closeSequence || 0) + 1),
    (state.lrcFullscreen = !0),
    ui.musicPic && (ui.musicPic.style.display = "none"),
    ui.musicLyrics &&
      ((ui.musicLyrics.style.display = "block"),
      (ui.musicLyrics.innerHTML = ""),
      (ui.musicLyrics._lyrics = null)),
    localStorage.setItem(state.hostname + "_lrc_mode", 1),
    ui.fullscreenLrc &&
      ((ui.fullscreenLrc.innerHTML = ""), (ui.fullscreenLrc._lyrics = null)),
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
        var e = $("#lrc_fullscreen_header"),
          t = e ? e.offsetHeight : 90,
          i = $("#lrc_fullscreen_content");
        (i && (i.style.paddingBottom = t + "px"),
          $(".music_lrc_div") && ($(".music_lrc_div").style.bottom = t + "px"),
          updateLyrics(!0),
          window.plus
            ? plus.navigator.setFullscreen(!0)
            : document.documentElement.requestFullscreen());
      });
    }));
}
function exitFullscreenLrc() {
  var e = ui.fullscreenOverlay,
    t = ui.fullscreenBg,
    i = state.hostname;
  clearTimeout(e._closeTimer);
  var n = (e._closeSequence = (e._closeSequence || 0) + 1);
  (cancelBackgroundLayers(t, !1),
    (state.lrcFullscreen = !1),
    ui.fullscreenCover &&
      (clearTimeout(ui.fullscreenCover._coverTimer),
      (ui.fullscreenCover._coverRequest =
        (ui.fullscreenCover._coverRequest || 0) + 1),
      (ui.fullscreenCover._requestedCover = ""),
      (ui.fullscreenCover.style.opacity = "1")),
    [ui.fullscreenTitleEl, ui.fullscreenArtistEl].forEach(function (e) {
      e &&
        ((e._marqueeSequence = (e._marqueeSequence || 0) + 1),
        (e._marqueeText = null),
        null != e._marqueeRaf && cancelAnimationFrame(e._marqueeRaf),
        null != e._marqueeStartFrame &&
          cancelAnimationFrame(e._marqueeStartFrame),
        clearTimeout(e._marqueeStartTimer),
        (e._marqueeRaf = e._marqueeStartFrame = e._marqueeStartTimer = null));
    }),
    window.plus ? plus.navigator.setFullscreen(!1) : document.exitFullscreen(),
    e.classList.remove("active"),
    (e._closeTimer = setTimeout(function () {
      if (
        ui.fullscreenOverlay === e &&
        e._closeSequence === n &&
        !state.lrcFullscreen &&
        state.hostname === i
      ) {
        ((e._closeTimer = null),
          (e.style.display = "none"),
          cancelBackgroundLayers(t, !0),
          t && (t.style.backgroundImage = ""),
          ui.fullscreenLrc &&
            ((ui.fullscreenLrc.innerHTML = ""),
            (ui.fullscreenLrc._lyrics = null)));
        var a = $("#lrc_fullscreen_content");
        (a && (a.style.paddingBottom = ""),
          ui.musicLyrics &&
            ((ui.musicLyrics.innerHTML = ""), (ui.musicLyrics._lyrics = null)),
          setTimeout(function () {
            ui.fullscreenOverlay !== e ||
              e._closeSequence !== n ||
              state.lrcFullscreen ||
              state.hostname !== i ||
              updateLyrics(!0);
          }, 30));
      }
    }, 200)));
}
function toggleFullscreenLrc() {
  state.lrcFullscreen ? exitFullscreenLrc() : enterFullscreenLrc();
}
function setFullscreenMarquee(e, t) {
  if (e && e._marqueeText !== t) {
    e._marqueeText = t;
    var i = (e._marqueeSequence = (e._marqueeSequence || 0) + 1);
    if (
      (null != e._marqueeStartFrame &&
        cancelAnimationFrame(e._marqueeStartFrame),
      clearTimeout(e._marqueeStartTimer),
      (e._marqueeStartFrame = e._marqueeStartTimer = null),
      e._marqueeRaf &&
        (cancelAnimationFrame(e._marqueeRaf), (e._marqueeRaf = null)),
      (e.innerHTML = ""),
      t)
    ) {
      var n = makeEl("span", { class: "marquee-wrapper" });
      (n.appendChild(makeEl("span", { class: "marquee-text", html: t })),
        e.appendChild(n));
      var a = function () {
        if (((e._marqueeStartTimer = null), o() && e.offsetWidth)) {
          var i = e.clientWidth,
            a = n.scrollWidth;
          if (!(a <= i + 2)) {
            n.appendChild(
              makeEl("span", {
                class: "marquee-text",
                html: t,
                style: "padding-left:60px",
              }),
            );
            var s = 0,
              r = null,
              l = a + 60,
              u = function (t) {
                if (o()) {
                  if (null === r)
                    return (
                      (r = t),
                      void (e._marqueeRaf = requestAnimationFrame(u))
                    );
                  var i = Math.min(t - r, 100);
                  ((s -= (40 * i) / 1e3) <= -l && (s += l),
                    (n.style.transform = "translateX(" + s + "px)"),
                    (r = t),
                    (e._marqueeRaf = requestAnimationFrame(u)));
                }
              };
            e._marqueeRaf = requestAnimationFrame(u);
          }
        }
      };
      e._marqueeStartFrame = requestAnimationFrame(function () {
        o() &&
          (e._marqueeStartFrame = requestAnimationFrame(function () {
            ((e._marqueeStartFrame = null),
              o() && (e._marqueeStartTimer = setTimeout(a, 60)));
          }));
      });
    }
  }
  function o() {
    return e._marqueeSequence === i && state.lrcFullscreen;
  }
}
function updateFullscreenTitle() {
  if (ui.fullscreenTitleEl && state.lrcFullscreen) {
    var e = (state.musicInfo && state.musicInfo.title) || "",
      t =
        (state.musicInfo &&
          (state.musicInfo.artist || state.musicInfo.arist)) ||
        "";
    if (
      (setFullscreenMarquee(ui.fullscreenTitleEl, e || "歌词"),
      setFullscreenMarquee(ui.fullscreenArtistEl, t),
      ui.fullscreenCover)
    ) {
      var i = ui.musicPic && ui.musicPic.src;
      if (i && -1 === i.indexOf("nopic")) {
        var n = ui.fullscreenCover;
        if (
          n.src !== i &&
          n._requestedCover !== i &&
          !ui.musicPic._coverPending &&
          !ui.musicPic._coverLoading
        ) {
          ((n._requestedCover = i),
            (n._coverRequest = (n._coverRequest || 0) + 1));
          var a = n._coverRequest;
          transitionCoverImage(n, i, function () {
            return (
              ui.fullscreenCover === n &&
              n._coverRequest === a &&
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
  return state.lrcFullscreen && ui.fullscreenLrc
    ? ui.fullscreenLrc
    : ui.musicLyrics;
}
function buildPlaylistPanel() {
  var e = createPopupHost({ open: !1 });
  ((e.id = "list_overlay"),
    (e._sharedPopup = !0),
    (e._popupDim.style.backgroundColor = "rgba(0,0,0,0.35)"),
    e.content.classList.add("app_playlist_content"),
    (ui.playlistOverlay = e));
  var t = makeEl("div", {
    id: "list_div",
    class: "music_list_div app_playlist_panel",
  });
  ((ui.playlistPanel = t),
    (e._popupKeepNode = !0),
    (e._popupLightExit = !0),
    (e._popupSurface = t),
    e.content.appendChild(t));
  var i = makeEl("div", { id: "list_header" }),
    n = makeText("播放列表[0]");
  return (
    (n.id = "list_title"),
    (n.title = "点击定位到当前播放歌曲"),
    (n.style.cursor = "pointer"),
    (n.onclick = function () {
      if (e._popupOpen && !e._appDialogExit) {
        var t = state.playlist && state.playlist.playIndex;
        if (t > -1 && ui.playlistContainer && ui.playlistTable) {
          var i = ui.playlistTable.getElementsByTagName("tr")[t];
          i &&
            (ui.playlistContainer.scrollTop =
              i.offsetTop -
              (ui.playlistContainer.clientHeight - i.offsetHeight) / 2);
        }
      }
    }),
    i.appendChild(n),
    i.appendChild(
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
    t.appendChild(i),
    (ui.playlistContainer = makeEl("div", { id: "list_container" })),
    t.appendChild(ui.playlistContainer),
    (ui.playlistTable = makeEl("table", {
      id: "playlist_table",
      border: "0",
      cellspacing: "0",
      cellpadding: "0",
      style:
        "width:100%;color:var(--white);text-shadow:var(--white-shadow);margin:0 auto",
    })),
    ui.playlistContainer.appendChild(ui.playlistTable),
    e
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
  playlistPollTimer &&
    (clearInterval(playlistPollTimer), (playlistPollTimer = null));
}
function showPlaylistOverlay() {
  if (ui.playlistOverlay) {
    clearTimeout(playlistScrollTimer);
    var e = ui.playlistOverlay._popupOpen;
    (enterAnimatedDialog(ui.playlistOverlay, ui.playlistPanel),
      (ui.playlistOverlay._popupOpen = !0),
      e || registerPopupCleanup(ui.playlistOverlay, cleanupPlaylistOverlay),
      (ui.playlistOverlay.style.display = "block"),
      releasePopupLayer(ui.playlistOverlay),
      retainPopupLayer(ui.playlistOverlay),
      (ui.popup = ui.playlistOverlay),
      ui.playlistDirty &&
        state.playlist &&
        Array.isArray(state.playlist.playList) &&
        updatePlaylist(state.playlist),
      startPlaylistPolling());
    var t = state.playlist && state.playlist.playIndex;
    t > -1 &&
      ui.playlistTable &&
      ui.playlistContainer &&
      (playlistScrollTimer = setTimeout(function () {
        playlistScrollTimer = null;
        var e = ui.playlistTable.getElementsByTagName("tr")[t];
        if (e) {
          var i = e.offsetTop,
            n = e.offsetHeight,
            a = ui.playlistContainer.clientHeight,
            o = i - Math.max(0, (a - n) / 2);
          (o < 0 && (o = 0), (ui.playlistContainer.scrollTop = o));
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
    var e =
      "function" == typeof attachQueueRowDrag && attachQueueRowDrag.active;
    e && e.cancel && e.cancel();
  }
}
function hidePlaylistOverlay() {
  return closePopupAnimated(ui.playlistOverlay);
}
function findTableRow(e) {
  for (var t = e.target; t && "tr" !== t.localName;) t = t.parentElement;
  return t;
}
function buildVolumePanel(e) {
  var t = makeEl("div"),
    i = makeText("音量："),
    n = makeDiv("min-width:50px;display:inline-block");
  (n.appendChild(i), t.appendChild(n));
  var a = makeEl("input", {
    type: "range",
    min: 0,
    step: 1,
    max: e.vol,
    value: e.vol,
  });
  ui.volumeRange = a;
  var o = function (e) {
    (clearTimeout(a._enableTimer),
      (a.style.pointerEvents = "auto"),
      (a._enableTimer = setTimeout(function () {
        a.style.pointerEvents = "none";
      }, e || 3e3)));
  };
  ((a.style.pointerEvents = "none"),
    i.addEventListener("click", function () {
      o(3e3);
    }),
    a.addEventListener("input", function () {
      (o(3e3),
        clearTimeout(a._pressTimer),
        (state.mousePressed = !0),
        (a._pressTimer = setTimeout(function () {
          state.mousePressed = !1;
        }, 600)),
        ui.volumeLabel &&
          (ui.volumeLabel.innerHTML = "   " + a.value + "/" + a.max),
        sendWs({ type: "set_vol", vol: a.value }),
        sendWs({ type: "get_info" }));
    }),
    t.appendChild(a),
    (ui.volumeLabel = makeText(" " + a.value + "/" + a.max)));
  var s = makeDiv("width:30px;display:inline-block");
  return (
    s.appendChild(ui.volumeLabel),
    t.appendChild(s),
    t.addEventListener("dblclick", function () {
      o(3e3);
    }),
    t
  );
}
function buildBluetoothPanel() {
  if (!isEchoVer(1847)) return null;
  var e = makeEl("div", { id: "bluetooth", style: "display:none" });
  ui.bluetooth = e;
  var t = makeEl("input", {
    type: "button",
    className: "btn",
    value: "打开蓝牙适配器",
    disabled: !0,
  });
  ((t.wait = !1),
    (t.enable = -1),
    (t.onclick = function () {
      0 === t.enable
        ? ((t.wait = !0),
          (t.disabled = !0),
          (t.value = "正在打开。。。"),
          sendWs({ type: "BT_enable" }))
        : 1 === t.enable &&
          ((t.wait = !0),
          (t.disabled = !0),
          (t.value = "正在关闭。。。"),
          sendWs({ type: "BT_disable" }));
    }),
    (ui.btEnableBtn = t),
    e.appendChild(t));
  var i = makeEl("input", {
    type: "button",
    className: "btn",
    value: "打开蓝牙可发现",
    disabled: !0,
  });
  ((i.onclick = function () {
    (sendWs({
      type: "BT_setScanMode",
      mode: state.info.Service_Normally_Open
        ? 23 == i.ScanMode
          ? 21
          : 23
        : 23 == i.ScanMode
          ? 20
          : 23,
    }),
      sendWs({ type: "BT_Device" }));
  }),
    (ui.btDiscoverBtn = i),
    e.appendChild(i));
  var n = makeEl("input", {
    type: "button",
    className: "btn",
    value: "扫描蓝牙设备",
    disabled: !0,
  });
  ((n.onclick = function () {
    (sendWs({ type: "BT_StartScan" }), sendWs({ type: "BT_Device" }));
  }),
    (ui.btScanBtn = n),
    e.appendChild(n),
    (ui.btWrapper = makeEl("div", {
      style: "max-width:600px;margin:10px auto;border-radius:15px",
    })),
    ui.btWrapper.classList.add("mask"),
    ui.btWrapper.appendChild(makeDiv("height:15px")));
  var a = makeEl("div"),
    o = makeText(
      "蓝牙列表",
      "color:var(--white);text-shadow:var(--white-shadow);font-size:15px",
    );
  ((o.id = "bluetooth_list_title"), a.appendChild(o));
  var s = makeText(
    "\t▼",
    "font-size:13px;color:var(--white);text-shadow:var(--white-shadow)",
  );
  ((s.id = "bluetooth_list_ico"),
    a.appendChild(s),
    (a.onclick = function () {
      var e = $("#bluetooth_list_occupancy");
      "none" === ui.btListContainer.style.display
        ? (e && (e.style.display = "none"),
          (ui.btListContainer.style.display = "block"),
          (s.innerHTML = "\t▼"))
        : (e && (e.style.display = "block"),
          (ui.btListContainer.style.display = "none"),
          (s.innerHTML = "\t▲"));
    }),
    ui.btWrapper.appendChild(a),
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
      style:
        "width:100%;color:var(--white);text-shadow:var(--white-shadow);margin:0 auto",
    })),
    ui.btListContainer.appendChild(ui.btTable),
    ui.btTable.appendChild(makeEl("hr", { size: 1, className: "hr1" })));
  var r = makeEl("div"),
    l = makeText(
      "已配对的设备[0]",
      "color:var(--white);text-shadow:var(--white-shadow);font-size:13px",
    );
  ((l.id = "bluetooth_pairing_title"),
    r.appendChild(l),
    ui.btTable.appendChild(r),
    (ui.btPairedList = makeEl("div")),
    ui.btTable.appendChild(ui.btPairedList),
    ui.btTable.appendChild(makeEl("hr", { size: 1, className: "hr1" })));
  var u = makeEl("div"),
    c = makeText(
      "扫描到的设备[0]",
      "color:var(--white);text-shadow:var(--white-shadow);font-size:13px",
    );
  return (
    (c.id = "bluetooth_scan_title"),
    u.appendChild(c),
    ui.btTable.appendChild(u),
    (ui.btScannedList = makeEl("div")),
    ui.btTable.appendChild(ui.btScannedList),
    ui.btTable.appendChild(makeEl("hr", { size: 1, className: "hr1" })),
    e.appendChild(ui.btWrapper),
    e
  );
}
function updateScreenStageSize(e, t) {
  if (e > 0 && t > 0 && ui.screenStage) {
    var i = t / e;
    ui.screenStage._ratio !== i &&
      ((ui.screenStage._ratio = i),
      (ui.screenStage.style.paddingBottom = 100 * i + "%"));
  }
}
function buildScreenPanel() {
  var e = makeEl("div", { id: "screen_div", style: "display:none" });
  ui.screen = e;
  var t = makeEl("div", { style: "width:100%;max-width:720px;margin:0 auto" }),
    i = makeEl("div", {
      id: "screen_stage",
      style:
        "position:relative;height:0;overflow:hidden;background:#111;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none",
    });
  ((ui.screenStage = i), updateScreenStageSize(720, 480));
  var n = makeEl("img", {
    id: "screen_img",
    draggable: !1,
    style:
      "position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;visibility:hidden;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none",
  });
  (n.setAttribute("_width", 0),
    n.setAttribute("_height", 0),
    (n.onload = function () {
      if (
        ui.screen &&
        "none" !== ui.screen.style.display &&
        this.getAttribute("src")
      ) {
        var e = this.naturalWidth,
          t = this.naturalHeight;
        e > 0 &&
          t > 0 &&
          (updateScreenStageSize(e, t),
          (this.getAttribute("_width") == e &&
            this.getAttribute("_height") == t) ||
            (this.setAttribute("_width", e),
            this.setAttribute("_height", t),
            runShell("wm size", "wm_size")));
      }
    }),
    (ui.screenImage = n),
    i.appendChild(n),
    t.appendChild(i),
    e.appendChild(t),
    e.appendChild(makeEl("br")));
  for (
    var a = [
        ["返回", 4],
        ["输入", -1, "input"],
        ["删除", 67],
      ],
      o = 0;
    o < a.length;
    o++
  )
    (function (t) {
      var i = makeButton(t[0], function () {
        if ("input" === t[2]) {
          ((this.disabled = !0), stopScreenCapture());
          var e = this,
            i = function () {
              ((e.disabled = !1),
                setTimeout(function () {
                  ui.screen &&
                    "none" !== ui.screen.style.display &&
                    startScreenCapture();
                }, 500));
            };
          setTimeout(function () {
            showAppPrompt(
              "请输入内容！",
              "",
              function (e) {
                (i(), null != e && sendTextInput(e));
              },
              { placeholder: "输入要发送的文字", onCancel: i },
            );
          }, 600);
        } else sendKeyEvent(t[1]);
      });
      ("input" === t[2] && (i.id = "input_text_btn"), e.appendChild(i));
    })(a[o]);
  (e.appendChild(makeEl("br")),
    e.appendChild(
      makeButton("重置分辨率", function () {
        ((this.disabled = !0), (this.value = "已重置分辨率为720x480！"));
        var e = this;
        (setTimeout(function () {
          ((e.value = "重置分辨率"), (e.disabled = !1));
        }, 1e3),
          runShell("wm size 720x480"));
      }),
    ),
    e.appendChild(
      makeButton("重置系统语言", function () {
        ((this.disabled = !0),
          (this.value = "已重置系统语言为中文，重启音箱后生效！"),
          showAppAlert(this.value));
        var e = this;
        (setTimeout(function () {
          ((e.value = "重置系统语言"), (e.disabled = !1));
        }, 1e3),
          runShell(
            "setprop persist.sys.language zh && setprop persist.sys.country CN",
          ));
      }),
    ),
    ui.container && ui.container.appendChild(e));
}
function sendTextInput(e) {
  var t = e.split(""),
    i = function () {
      for (var e = "", n = 0; n < 2 || t.length > 0; n++) {
        var a = t.shift();
        if (null == a || "" === a) break;
        e += a;
      }
      e && (sendAdbInput("text " + e), setTimeout(i, 100));
    };
  i();
}
function sendKeyEvent(e) {
  sendAdbInput("keyevent " + e);
}
function sendAdbInput(e) {
  sendWs({ type: "input", input: e });
}
function startScreenCapture() {
  (sendWs({ type: "start_screencap", interval: 100 }),
    (document.onkeydown = function (e) {
      var t = { 13: 23, 37: 21, 38: 19, 39: 22, 40: 20 };
      if (t[e.keyCode]) return (sendKeyEvent(t[e.keyCode]), !1);
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
      (ui.screenImage.setAttribute("_width", 0),
      ui.screenImage.setAttribute("_height", 0)),
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
  var e = makeEl("div", {
    id: "sound_effects",
    style: "display:none;max-width:600px;margin:10px auto;border-radius:15px",
  });
  (e.classList.add("mask"),
    (ui.soundEffects = e),
    e.appendChild(makeDiv("height:15px")),
    (ui.eqsBox = makeEl("div")),
    (ui.bassBox = makeEl("div")),
    (ui.loudnessBox = makeEl("div")),
    (ui.speakerVolBox = makeEl("div")),
    (ui.presetBox = makeEl("div")),
    e.appendChild(makeText("EQ：")),
    e.appendChild(
      makeEl("input", {
        type: "checkbox",
        id: "eq_switch",
        onclick: function () {
          (sendWs({ type: "set_eq_enable", enable: this.checked }),
            sendWs({ type: "get_eq_config" }));
        },
      }),
    ),
    e.appendChild(ui.eqsBox),
    e.appendChild(makeText("低音：")),
    e.appendChild(
      makeEl("input", {
        type: "checkbox",
        id: "bass_switch",
        onclick: function () {
          (sendWs({ type: "set_bass_enable", enable: this.checked }),
            sendWs({ type: "get_eq_config" }));
        },
      }),
    ),
    e.appendChild(ui.bassBox),
    e.appendChild(makeText("响度：")),
    e.appendChild(
      makeEl("input", {
        type: "checkbox",
        id: "loudness_switch",
        onclick: function () {
          (sendWs({ type: "set_loudness_enable", enable: this.checked }),
            sendWs({ type: "get_eq_config" }));
        },
      }),
    ),
    e.appendChild(ui.loudnessBox),
    isEchoVer(1876) &&
      (e.appendChild(makeText("扬声器音量：")),
      e.appendChild(ui.speakerVolBox)));
  var t = makeText("DSP低音增强：");
  ((t.id = "dsp_bass_text"),
    e.appendChild(t),
    e.appendChild(
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
    e.appendChild(ui.presetBox),
    e.appendChild(makeDiv("height:15px")),
    ui.container && ui.container.appendChild(e));
}
function refreshAudioEffects(e) {
  state.soundEffectsData = e;
  var t = e.eq,
    i = e.bass,
    n = e.loudness,
    a = e.Mixer,
    o = $("#eq_switch"),
    s = $("#bass_switch"),
    r = $("#loudness_switch");
  (o && (o.checked = !0 === t.sound_effects_eq_enable),
    s && (s.checked = !0 === i.sound_effects_bass_enable),
    r && (r.checked = !0 === n.sound_effects_loudness_enable),
    renderEqBands(t),
    renderBassControl(i),
    renderLoudnessControl(n),
    renderSpeakerVolume(a),
    renderEqPreset(t));
}
function renderEqBands(e) {
  if (ui.eqsBox)
    for (
      var t = "" !== ui.eqsBox.innerHTML,
        i = e.Bands,
        n = {
          6e4: "低频",
          23e4: "中低",
          91e4: "中频",
          36e5: "中高",
          14e6: "高频",
        },
        a = 0;
      a < i.list.length;
      a++
    )
      (function (e) {
        var a, o;
        if (t) ((a = $("#band_" + e.Band)), (o = $("#band_text_" + e.Band)));
        else {
          var s = makeDiv("width:80px;display:inline-block");
          (s.appendChild(makeText((n[e.Frequency] || e.Frequency) + "：")),
            ui.eqsBox.appendChild(s),
            ((a = makeEl("input", {
              type: "range",
              min: parseInt(i.minBandLevel / 100, 10),
              max: parseInt(i.maxBandLevel / 100, 10),
            })).id = "band_" + e.Band),
            a.setAttribute("Band", e.Band),
            a.addEventListener("input", function () {
              var e = $("#band_text_" + this.getAttribute("Band"));
              (e && (e.innerHTML = "   " + this.value + "dB"),
                sendWs({
                  type: "set_eq_bandlevel",
                  band: this.getAttribute("Band"),
                  level: 100 * this.value,
                }),
                sendWs({ type: "get_eq_config" }));
            }),
            ui.eqsBox.appendChild(a),
            ((o = makeText("")).id = "band_text_" + e.Band));
          var r = makeDiv("width:50px;display:inline-block");
          (r.appendChild(o),
            ui.eqsBox.appendChild(r),
            ui.eqsBox.appendChild(makeEl("div")));
        }
        (!state.mousePressed &&
          a &&
          (a.value = parseInt(e.BandLevel / 100, 10)),
          o && (o.innerHTML = "   " + e.BandLevel / 100 + "dB"));
      })(i.list[a]);
}
function renderBassControl(e) {
  if (ui.bassBox) {
    var t, i;
    if ("" !== ui.bassBox.innerHTML)
      ((t = $("#bass_value")), (i = $("#bass_text_value")));
    else {
      var n = makeDiv("width:80px;display:inline-block");
      (n.appendChild(makeText("低音增强：")),
        ui.bassBox.appendChild(n),
        ((t = makeEl("input", { type: "range", min: 0, max: 100 })).id =
          "bass_value"),
        t.addEventListener("input", function () {
          var e = $("#bass_text_value");
          (e && (e.innerHTML = "   " + t.value + "%"),
            sendWs({ type: "set_bass_strength", strength: 10 * t.value }),
            sendWs({ type: "get_eq_config" }));
        }),
        ui.bassBox.appendChild(t),
        ((i = makeText("")).id = "bass_text_value"));
      var a = makeDiv("width:50px;display:inline-block");
      (a.appendChild(i), ui.bassBox.appendChild(a));
    }
    (!state.mousePressed && t && (t.value = e.Current_Strength / 10),
      i && (i.innerHTML = "   " + e.Current_Strength / 10 + "%"));
  }
}
function renderLoudnessControl(e) {
  if (ui.loudnessBox) {
    var t, i;
    if ("" !== ui.loudnessBox.innerHTML)
      ((t = $("#loudness_value")), (i = $("#loudness_text_value")));
    else {
      var n = makeDiv("width:80px;display:inline-block");
      (n.appendChild(makeText("响度控制：")),
        ui.loudnessBox.appendChild(n),
        ((t = makeEl("input", { type: "range", min: -3e3, max: 3e3 })).id =
          "loudness_value"),
        t.addEventListener("input", function () {
          var e = $("#loudness_text_value");
          (e && (e.innerHTML = "   " + t.value / 100 + "dB"),
            sendWs({ type: "set_loudness_gain", gain: t.value }),
            sendWs({ type: "get_sq_config" }));
        }),
        ui.loudnessBox.appendChild(t),
        ((i = makeText("")).id = "loudness_text_value"));
      var a = makeDiv("width:50px;display:inline-block");
      (a.appendChild(i), ui.loudnessBox.appendChild(a));
    }
    (!state.mousePressed && t && (t.value = e.Current_Gain),
      i && (i.innerHTML = "   " + e.Current_Gain / 100 + "dB"));
  }
}
function renderSpeakerVolume(e) {
  if (isEchoVer(1876) && ui.speakerVolBox) {
    var t = 231;
    if (!("" !== ui.speakerVolBox.innerHTML)) {
      var i = makeDiv("width:80px;display:inline-block");
      (i.appendChild(makeText("中低音：")), ui.speakerVolBox.appendChild(i));
      var n,
        a = makeEl("input", { type: "range", min: 211, max: 251, value: t });
      ((a.id = "bass_vol_value"),
        a.addEventListener("input", function () {
          var e = $("#bass_vol_text_value");
          (e && (e.innerHTML = "   " + (a.value - t) + "dB"),
            clearTimeout(n),
            (n = setTimeout(function () {
              sendWs({
                type: "sends",
                list: [
                  {
                    type: "setMixerValue",
                    controlName: "DAC Digital Volume L",
                    value: a.value,
                  },
                  { type: "get_eq_config" },
                ],
              });
            }, 100)));
        }),
        ui.speakerVolBox.appendChild(a));
      var o = makeText("");
      o.id = "bass_vol_text_value";
      var s = makeDiv("width:50px;display:inline-block");
      (s.appendChild(o),
        ui.speakerVolBox.appendChild(s),
        ui.speakerVolBox.appendChild(makeEl("div")));
      var r = makeDiv("width:80px;display:inline-block");
      (r.appendChild(makeText("高音：")), ui.speakerVolBox.appendChild(r));
      var l,
        u = makeEl("input", { type: "range", min: 211, max: 251, value: t });
      ((u.id = "high_vol_value"),
        u.addEventListener("input", function () {
          var e = $("#high_vol_text_value");
          (e && (e.innerHTML = "   " + (u.value - t) + "dB"),
            clearTimeout(l),
            (l = setTimeout(function () {
              sendWs({
                type: "sends",
                list: [
                  {
                    type: "setMixerValue",
                    controlName: "DAC Digital Volume R",
                    value: u.value,
                  },
                  { type: "get_eq_config" },
                ],
              });
            }, 100)));
        }),
        ui.speakerVolBox.appendChild(u));
      var c = makeText("");
      c.id = "high_vol_text_value";
      var d = makeDiv("width:50px;display:inline-block");
      (d.appendChild(c), ui.speakerVolBox.appendChild(d));
    }
    var p = $("#bass_vol_value"),
      m = $("#high_vol_value"),
      f = $("#bass_vol_text_value"),
      h = $("#high_vol_text_value");
    e &&
      p &&
      m &&
      f &&
      h &&
      (state.mousePressed ||
        ((p.value = e["DAC Digital Volume L"] || p.value),
        (m.value = e["DAC Digital Volume R"] || m.value)),
      (f.innerHTML = "   " + (p.value - t) + "dB"),
      (h.innerHTML = "   " + (m.value - t) + "dB"));
  }
}
function renderEqPreset(e) {
  if (ui.presetBox) {
    var t = "" !== ui.presetBox.innerHTML,
      i = e.Preset_list.slice(0),
      n = e.Current_Preset;
    i.length > 0 && -1 == n && i.unshift({ Preset: -1, Name: "Custom" });
    var a = {
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
    if (t) {
      var o = $("#preset_list");
      if (!o) return;
      if (!updateCustomPresets())
        for (var s = 0; s < o.length; s++)
          if (o[s].value == n) {
            o[s].selected = !0;
            break;
          }
    } else {
      var r = makeDiv("display:inline-block");
      (r.appendChild(makeText("预设EQ：")), ui.presetBox.appendChild(r));
      var l = makeEl("select", {
        id: "preset_list",
        style: "backdrop-filter:none",
      });
      l.onchange = function () {
        if (-2 == parseInt(this.value, 10))
          for (
            var e = this.options[this.selectedIndex],
              t = JSON.parse(e.getAttribute("bands")),
              i = 0;
            i < t.length;
            i++
          )
            sendWs({
              type: "set_eq_bandlevel",
              band: t[i].Band,
              level: t[i].BandLevel,
            });
        else
          -1 != parseInt(this.value, 10) &&
            sendWs({ type: "set_eq_preset", preset: this.value });
        sendWs({ type: "get_eq_config" });
      };
      var u = makeEl("option", {
        value: -1,
        html: a.Custom,
        style: "display:none",
      });
      (u.value == n && (u.selected = !0), l.appendChild(u));
      for (var c = 0; c < i.length; c++)
        if (!(i[c].Preset < 0)) {
          var d = makeEl("option", {
            value: i[c].Preset,
            html: a[i[c].Name] || i[c].Name,
          });
          (d.value == n && (d.selected = !0), l.appendChild(d));
        }
      (ui.presetBox.appendChild(l),
        ui.presetBox.appendChild(
          makeButton("保存EQ", function () {
            showAppPrompt(
              "请输入要保存的EQ名称！",
              "",
              function (e) {
                e && p(e);
              },
              { placeholder: "EQ 名称" },
            );
          }),
        ));
      var p = function (e) {
        for (
          var t = "自定义[" + e + "]",
            i = JSON.parse(localStorage.getItem("custom_eqs") || "[]"),
            n = {
              name: t,
              bands: JSON.stringify(state.soundEffectsData.eq.Bands.list),
            },
            a = -1,
            o = 0;
          o < i.length;
          o++
        )
          if (i[o].name === n.name) {
            a = o;
            break;
          }
        (-1 !== a ? (i[a] = n) : i.push(n),
          localStorage.setItem("custom_eqs", JSON.stringify(i)),
          showAppAlert("已保存！"),
          updateCustomPresets());
      };
      updateCustomPresets();
    }
  }
}
function updateCustomPresets() {
  var e = !1,
    t = JSON.parse(localStorage.getItem("custom_eqs") || "[]"),
    i = $("#preset_list");
  if (!i) return !1;
  for (var n = 0; n < t.length; n++) {
    for (var a = t[n], o = null, s = 0; s < i.length; s++)
      if (i[s].innerText === a.name) {
        o = i[s];
        break;
      }
    (o
      ? o.getAttribute("bands") !== a.bands && o.setAttribute("bands", a.bands)
      : ((o = makeEl("option", { value: -2, html: a.name })).setAttribute(
          "bands",
          a.bands,
        ),
        i.appendChild(o)),
      o.getAttribute("bands") ===
        JSON.stringify(state.soundEffectsData.eq.Bands.list) &&
        ((o.selected = !0), (e = !0)));
  }
  return e;
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
  (ui.soundEffects && (ui.soundEffects.style.display = "none"),
    stopSoundEffectsRefresh());
}
function getTrackTitle(e) {
  return e
    ? e.title
      ? e.artist
        ? e.title + "-" + e.artist
        : e.album
          ? e.title + "-" + e.album
          : e.title
      : e.album || ""
    : "";
}
function getReportedUnisoundVersion(e) {
  var t = e && e.u_ver,
    i =
      "number" == typeof t || ("string" == typeof t && "" !== t.trim())
        ? Number(t)
        : NaN;
  return isFinite(i) && Math.floor(i) === i && i > 1e3 ? i : -1;
}
function readUnisoundAvailable() {
  var e = state.unisoundDeviceInfo;
  if (
    !e ||
    e.ip !== state.ip ||
    e.ws !== state.ws ||
    !state.ws ||
    state.ws.readyState !== WebSocket.OPEN
  )
    return !1;
  var t = e.info.Unisound;
  return (
    e.info.u_ver > 1e3 &&
    (null == t || !0 === t || 1 === t || "true" === t || "1" === t)
  );
}
function updateUnisoundAvailability(e) {
  var t = state.uVer,
    i = getReportedUnisoundVersion(e);
  ((state.uVer = i),
    (state.unisoundDeviceInfo = {
      ip: state.ip,
      ws: state.ws,
      info: { Unisound: e.Unisound, u_ver: i },
    }),
    (state.unisoundAvailable = readUnisoundAvailable()),
    (state.isNewUnisound = state.unisoundAvailable),
    t !== i &&
      "function" == typeof closeVersionInfoWindow &&
      closeVersionInfoWindow(),
    updateMusicCollectionButtons(e));
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
function updateMusicCollectionButtons(e) {
  var t =
    readUnisoundAvailable() &&
    Number(state.unisoundDeviceInfo.info.u_ver) >= 1700 &&
    (0 == e.play_type || 1 == e.play_type) &&
    e.music_info &&
    (0 == e.music_info.ItemType || 1 == e.music_info.ItemType);
  (["#music_btn_collect", "#music_btn_cancel_collect"].forEach(function (e) {
    var i = $(e);
    i && ((i.hidden = !t), (i.style.display = t ? "inline-flex" : "none"));
  }),
    ui.applyLyricsModeHeight && ui.applyLyricsModeHeight());
}
function executeMusicCommand(e) {
  var t = e.getAttribute("data");
  if (("collect" !== t && "cancel_collect" !== t) || readUnisoundAvailable()) {
    if ("prev" === t) sendWs({ type: "prev" });
    else if ("next" === t) sendWs({ type: "next" });
    else if ("pause" === t) sendAction(4, 2, -1, !0);
    else if ("play" === t) {
      var i = state.playlist && state.playlist.playList;
      0 == state.info.play_type &&
      (!i || i.length < 1) &&
      !state.info.play_state &&
      state.info.Recoverable_music
        ? sendAction(4, 24, 1, !0)
        : sendAction(4, 3, -1, !0);
    } else
      "collect" === t
        ? showAppConfirm(
            "确定要收藏[" + getTrackTitle(state.musicInfo) + "]吗？",
            function () {
              readUnisoundAvailable() &&
                sendToUnisound({
                  type: "api",
                  data: { type: "collect", music_info: state.musicInfo },
                });
            },
          )
        : "cancel_collect" === t &&
          showAppConfirm(
            "确定要取消收藏[" + getTrackTitle(state.musicInfo) + "]吗？",
            function () {
              readUnisoundAvailable() &&
                sendToUnisound({
                  type: "api",
                  data: { type: "cancel_collect", music_info: state.musicInfo },
                });
            },
          );
    sendWs({ type: "get_info" });
  }
}
function transitionCoverImage(e, t, i, n) {
  clearTimeout(e._coverTimer);
  var a =
    "function" == typeof prefersReducedDialogMotion &&
    prefersReducedDialogMotion();
  ((e.style.transition = "opacity 0.18s ease"),
    (e.style.opacity = a ? "1" : "0"),
    (e._coverTimer = setTimeout(
      function () {
        i() &&
          ((e._coverTimer = null),
          n && n(),
          (e.src = t),
          (e.style.opacity = "1"));
      },
      a ? 0 : 180,
    )));
}
function updateMusicCover(e) {
  var t = ui.musicPic;
  if (t && (e = e || t.nopic) && t._requestedCover !== e) {
    (waitMusicCover(),
      (t._coverPending = !1),
      (t._coverLoading = e !== t.nopic),
      (t._requestedCover = e),
      e === t.nopic && restoreCoverBackground());
    var i = t._coverRequest;
    (clearTimeout(t._coverTimer), (t.style.opacity = "1"));
    var n = new Image();
    ((n.onload = function () {
      a(e);
    }),
      (n.onerror = function () {
        t === ui.musicPic &&
          t._coverRequest === i &&
          ((t._coverLoading = !1), restoreCoverBackground(), a(t.nopic || e));
      }),
      (n.src = e));
  }
  function a(n) {
    if (
      t === ui.musicPic &&
      t._coverRequest === i &&
      (transitionCoverImage(
        t,
        n,
        function () {
          return t === ui.musicPic && t._coverRequest === i;
        },
        function () {
          ((t._coverLoading = !1),
            n === e && n !== t.nopic && (t._failedBackgroundCover = ""));
        },
      ),
      state.lrcFullscreen && ui.fullscreenCover && n !== t.nopic)
    ) {
      var a = ui.fullscreenCover;
      ((a._requestedCover = n), (a._coverRequest = (a._coverRequest || 0) + 1));
      var o = a._coverRequest;
      transitionCoverImage(
        a,
        n,
        function () {
          return (
            ui.fullscreenCover === a &&
            a._coverRequest === o &&
            t._coverRequest === i &&
            state.lrcFullscreen
          );
        },
        function () {
          a.style.visibility = "visible";
        },
      );
    }
  }
}
function waitMusicCover() {
  var e = ui.musicPic;
  e &&
    ((e._coverRequest = (e._coverRequest || 0) + 1),
    (e._requestedCover = ""),
    (e._coverPending = !0),
    (e._coverLoading = !1),
    clearTimeout(e._coverTimer),
    (e.style.opacity = "1"),
    ui.fullscreenCover &&
      (clearTimeout(ui.fullscreenCover._coverTimer),
      (ui.fullscreenCover._coverRequest =
        (ui.fullscreenCover._coverRequest || 0) + 1),
      (ui.fullscreenCover._requestedCover = ""),
      (ui.fullscreenCover.style.opacity = "1")),
    [ui.background, ui.fullscreenBg].forEach(function (e) {
      var t = e && e._backgroundLayers;
      t &&
        t.cover &&
        (cancelBackgroundLayers(e, !1, !0),
        t.fading ||
          (t.incoming &&
            (t.incoming.parentNode === e && e.removeChild(t.incoming),
            (t.incoming = null))));
    }));
}
function restoreCoverBackground() {
  state.coverBackgroundEnabled &&
    (ui.musicPic && (ui.musicPic._failedBackgroundCover = ui.musicPic.src),
    restoreBackground());
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
    var e = safeBackgroundUrl(ui.musicPic.src);
    if (
      !e ||
      e.indexOf("nopic") > -1 ||
      (ui.musicPic.complete && 0 === ui.musicPic.naturalWidth) ||
      ui.musicPic._failedBackgroundCover === e
    )
      restoreCoverBackground();
    else if (ui.musicPic.complete) {
      var t = ui.background,
        i = ui.musicPic,
        n = i._coverRequest;
      ((state.coverBackgroundApplied = !0),
        transitionBackground(
          t,
          {
            url: e,
            props: {
              "background-image": 'url("' + e + '")',
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
                ui.background === t &&
                ui.musicPic === i &&
                i.src === e &&
                i._coverRequest === n &&
                !i._coverPending &&
                !i._coverLoading &&
                state.coverBackgroundApplied &&
                state.coverBackgroundEnabled &&
                ui.musicPanel &&
                "block" === ui.musicPanel.style.display
              );
            },
            onReady: function () {
              var e =
                state.apiMusicInfo && state.apiMusicInfo.mask
                  ? state.apiMusicInfo.mask
                  : "rgba(var(--mask-color),0.1);";
              (ui.main.classList &&
                !ui.main.classList.contains("mask") &&
                ui.main.classList.add("mask"),
                (ui.main.style =
                  "position:fixed;z-index:1;left:0;top:0;width:100%;height:100%;overflow:auto;background-color:" +
                  e +
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
  return (
    !!state.lyrics.length &&
    (1 !== state.lyrics.length || -1 !== state.lyrics[0][0])
  );
}
function lyricsWaiting() {
  var e = state.lyricsPending;
  return (
    !!e &&
    e.musicId === state.musicId &&
    e.hostname === state.hostname &&
    e.socket === state.ws
  );
}
function showLrcPlaceholder(e) {
  var t = getLrcParent();
  if (
    t &&
    (!ui.musicLyrics ||
      "block" === ui.musicLyrics.style.display ||
      state.lrcFullscreen) &&
    !(
      (hasRealLyrics() && t.querySelector(".music_lrc_div")) ||
      (t._placeholderText === e && t.querySelector(".lrc_placeholder"))
    )
  ) {
    ((t.innerHTML = ""), (t._lyrics = null), (t._placeholderText = e));
    var i = makeEl("div", {
      class: "lrc_placeholder",
      style:
        "width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;user-select:none",
    });
    (i
      .appendChild(makeEl("h3", { class: "lrc", style: "margin:0" }))
      .appendChild(makeEl("span", { class: "lrc-inner", html: e })),
      t.appendChild(i),
      ui.applyLyricsModeHeight && setTimeout(ui.applyLyricsModeHeight, 0));
  }
}
function updateLyrics(e, t) {
  if (lyricsWaiting())
    return (syncProgressBar(), void showLrcPlaceholder("正在加载歌词…"));
  if (!state.lyricTiming.length)
    return (
      ui.musicTimeRange && (setMusicProgress(0, 0), (state.lastLyricTime = -1)),
      void showLrcPlaceholder("暂无播放")
    );
  var i = state.titleDisplayUntil - Date.now() > 0,
    n = ui.musicPic && "running" !== ui.musicPic.style.webkitAnimationPlayState,
    a = -1 === state.lyricTiming[0];
  if (e || a || !(i || (n && !state.timeLocked))) {
    var o = function () {
      renderLyricsFrame(e);
    };
    t ? waitAndRender(o) : o();
  } else syncProgressBar();
}
function syncProgressBar() {
  if (!(state.lyricTiming.length < 2) && ui.musicTimeRange) {
    var e = parseInt(state.lyricTiming[2], 10) || 0,
      t = parseInt(state.lyricTiming[1], 10) || 0;
    (!state.timeLocked &&
      -1 !== state.lyricTiming[0] &&
      state.info &&
      state.info.play_state &&
      ((t += Math.max(0, Date.now() - state.lyricTiming[0])),
      e > 0 && (t = Math.min(e, t))),
      setMusicProgress(e, t));
  }
}
function seekSessionCurrent(e) {
  return (
    e &&
    e.musicId === state.musicId &&
    e.hostname === state.hostname &&
    e.socket === state.ws
  );
}
function clearMusicSeek() {
  var e = state.seekSession;
  (e && clearTimeout(e.timer),
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
function previewMusicSeek(e) {
  (seekSessionCurrent(state.seekSession) && !state.seekSession.committed) ||
    beginMusicSeek();
  var t = state.seekSession;
  ((t.position = Math.max(0, parseInt(e, 10) || 0)),
    (state.lyricTiming = [
      -1,
      t.position,
      state.musicInfo ? state.musicInfo.duration : 0,
    ]),
    setMusicProgress(state.lyricTiming[2], t.position),
    updateLyrics(!0));
}
function commitMusicSeek() {
  var e = state.seekSession;
  seekSessionCurrent(e)
    ? e.committed ||
      (null !== e.position
        ? ((e.committed = !0),
          (e.started = Date.now()),
          (e.until = e.started + 900),
          (state.timeLocked = !1),
          (state.lyricTiming[0] =
            state.info && state.info.play_state ? e.started : -1),
          sendWs({ type: "set_position", position: e.position }),
          sendWs({ type: "get_info" }),
          (e.timer = setTimeout(function () {
            if (state.seekSession === e) {
              var t = seekSessionCurrent(e);
              (clearMusicSeek(), t && sendWs({ type: "get_info" }));
            }
          }, 900)),
          updateLyrics(!0))
        : clearMusicSeek())
    : clearMusicSeek();
}
function acceptMusicSeekPosition(e) {
  var t = state.seekSession;
  if (!t) return !0;
  if (!seekSessionCurrent(t)) return (clearMusicSeek(), !0);
  if (!t.committed) return !1;
  var i = state.info && state.info.play_state ? Date.now() - t.started : 0;
  return (
    (Math.abs(Number(e.position) - t.position - i) <= 1500 ||
      Date.now() >= t.until) &&
    (clearMusicSeek(), !0)
  );
}
function setMusicProgress(e, t) {
  var i = ui.musicTimeRange;
  if (i) {
    (i.max !== String(e) && (i.max = e),
      i.value !== String(t) && (i.value = t));
    var n = msToTime(e),
      a = msToTime(t);
    (ui.musicTimeTotal &&
      ui.musicTimeTotal.textContent !== n &&
      (ui.musicTimeTotal.textContent = n),
      ui.musicTimeCurrent &&
        ui.musicTimeCurrent.textContent !== a &&
        (ui.musicTimeCurrent.textContent = a));
  }
}
function waitAndRender(e) {
  var t = Date.now(),
    i = state.musicId,
    n = state.hostname,
    a = state.ws,
    o = function () {
      state.musicId === i &&
        state.hostname === n &&
        state.ws === a &&
        (Date.now() - t > 1e3
          ? e()
          : state.lyricTiming[2] < 1 || !state.lyrics.length
            ? setTimeout(o, 50)
            : e());
    };
  o();
}
function renderLyricsFrame(e) {
  var t = computePlaybackTime();
  if ((updateProgressFromTime(t), hasRealLyrics())) renderActiveLyric(t, e);
  else {
    var i = state.lyrics.length ? state.lyrics[0][1] : "";
    showLrcPlaceholder("暂无歌词" === i || "♪ MiPlay ♪" === i ? i : "暂无播放");
  }
  (notifyMediaSession(), syncFullscreenControls());
}
function computePlaybackTime() {
  var e =
    -1 !== state.lyricTiming[0]
      ? parseInt(state.lyricTiming[1], 10) + (Date.now() - state.lyricTiming[0])
      : parseInt(state.lyricTiming[1], 10);
  return (
    isNaN(e) && (e = 0),
    e < state.lastLyricTime &&
      state.lastLyricTime - e < 1e3 &&
      (e = state.lastLyricTime),
    (state.lastLyricTime = e),
    e
  );
}
function updateProgressFromTime(e) {
  ui.musicPanel &&
    "block" === ui.musicPanel.style.display &&
    !state.timeLocked &&
    state.lyricTiming[2] &&
    ui.musicTimeRange &&
    setMusicProgress(parseInt(state.lyricTiming[2], 10) || 0, e);
}
function renderActiveLyric(e, t) {
  e += 280;
  var i = locateActiveLyric(state.lyrics, e),
    n = i.allIndex,
    a = i.visibleIndex,
    o = i.visible;
  ((window.current_lrc_index = n), null === a && (a = o.length - 1));
  var s = getLrcParent();
  if (
    ((ui.musicLyrics && "block" === ui.musicLyrics.style.display) ||
      state.lrcFullscreen) &&
    s
  ) {
    (s.querySelector(".music_lrc_div") && s._lyrics === state.lyrics) ||
      buildLyricsDom(o);
    var r = s.querySelector(".music_lrc_div"),
      l = r ? r.getElementsByTagName("h3") : null;
    if (
      (l && l.length > o.length && (o.length < 2 && (a = 1), (a += 1)),
      l && l[a])
    ) {
      var u = state.lyrics[n],
        c = String(u && "" !== u[1]);
      (l[a].getAttribute("current") !== c && l[a].setAttribute("current", c),
        -1 === l[a].className.indexOf("current_lrc") &&
          (clearOldHighlights(l[a]), l[a].classList.add("current_lrc")));
      var d = state.seekSession,
        p = d && s._scrolledSeek !== d;
      (s._scrolledLyrics !== state.lyrics ||
        s._scrolledLrcDiv !== r ||
        s._scrolledLrcIndex !== a ||
        p) &&
        (scrollToActive(r, l, a),
        (s._scrolledLyrics = state.lyrics),
        (s._scrolledLrcDiv = r),
        (s._scrolledLrcIndex = a),
        (s._scrolledSeek = d),
        (state.lastScrolledLrcIndex = a));
    }
  } else {
    var m = state.lyrics[n];
    m &&
      m[1] &&
      -1 != m[0] &&
      ui.pageTitle &&
      ui.pageTitle.innerHTML !== m[1] &&
      setPageTitle(m[1]);
  }
}
function locateActiveLyric(e, t) {
  for (var i = null, n = null, a = [], o = e.length - 1, s = 0; s <= o; s++) {
    var r = e[s],
      l = parseInt(r[0], 10);
    (l > t
      ? null === i && (i = s > 0 ? s - 1 : s)
      : s === o && null === i && (i = s),
      "" !== r[1] &&
        (l > t && null === n && (n = a.length > 0 ? a.length - 1 : 0),
        a.push(r)));
  }
  return { allIndex: i, visibleIndex: n, visible: a };
}
function buildLyricsDom(e) {
  var t = getLrcParent();
  if (t) {
    window.innerWidth;
    var i,
      n = $("#lrc_fullscreen_header"),
      a = n ? n.offsetHeight : 90,
      o = a;
    i = state.lrcFullscreen
      ? makeEl("div", {
          style:
            "position:absolute;left:0;top:0;right:0;bottom:" +
            o +
            "px;overflow-x:hidden;overflow-y:auto;box-sizing:border-box",
          class: "music_lrc_div",
        })
      : makeEl("div", {
          style:
            "width:100%;height:100%;overflow-x:hidden;overflow-y:auto;box-sizing:border-box",
          class: "music_lrc_div",
        });
    var s = t.clientHeight || 224,
      r = e.length < 3 ? 3 - e.length : 1,
      l = function (e, t) {
        var i = makeEl("h3", { class: "lrc" + (t ? " " + t : "") });
        return (
          i.appendChild(makeEl("span", { class: "lrc-inner", html: e })),
          i
        );
      };
    if (!state.lrcFullscreen && 50 * (r + e.length + 1) < s) {
      for (
        var u =
            null != window.current_lrc_index ? window.current_lrc_index : -1,
          c = u >= 0 && state.lyrics[u] ? state.lyrics[u] : null,
          d = 0;
        d < e.length;
        d++
      ) {
        var p = e[d],
          m = c && p[0] === c[0] && p[1] === c[1],
          f = l(p[1], m ? "current_lrc" : "");
        (m && f.setAttribute("current", "true"), i.appendChild(f));
      }
      i.classList.add("lrc-center");
    } else {
      for (var h = 0; h < r; h++)
        i.appendChild(
          makeEl("h3", { class: "lrc", style: "height:20px;margin:0" }),
        );
      for (var g = 0; g < e.length; g++) i.appendChild(l(e[g][1]));
      if (
        (i.appendChild(makeEl("h3", { class: "lrc", style: "margin:0" })),
        state.lrcFullscreen)
      ) {
        var v = 0;
        if (window.plus)
          try {
            v = Math.floor(plus.navigator.getStatusbarHeight() / 2);
          } catch (e) {}
        var y = window.innerHeight - a - a - v;
        y < 100 && (y = 500);
        var _ = Math.floor(y / 2);
        ((i.style.paddingTop = _ + "px"), (i.style.paddingBottom = _ + "px"));
      } else ((i.style.paddingTop = "12px"), (i.style.paddingBottom = "12px"));
    }
    ((t.innerHTML = ""),
      (t._placeholderText = null),
      t.appendChild(i),
      (t._lyrics = state.lyrics),
      ui.applyLyricsModeHeight &&
        (setTimeout(ui.applyLyricsModeHeight, 0),
        setTimeout(ui.applyLyricsModeHeight, 150)));
  }
}
function clearOldHighlights(e) {
  for (
    var t = document.querySelectorAll(".lrc_shrink"), i = 0;
    i < t.length;
    i++
  )
    t[i].classList.remove("lrc_shrink");
  for (
    var n = document.querySelectorAll('.current_lrc, h3.lrc[current="true"]'),
      a = 0;
    a < n.length;
    a++
  )
    (e && n[a] === e) ||
      (n[a].classList.add("lrc_shrink"),
      n[a].classList.remove("current_lrc"),
      n[a].setAttribute("current", "false"));
}
function scrollToActive(e, t, i) {
  if (e && t && t[i]) {
    var n = e.getBoundingClientRect(),
      a = t[i].getBoundingClientRect(),
      o = e.clientHeight,
      s = a.height,
      r = a.top - n.top + e.scrollTop + s / 2 - o / 2;
    if (state.lrcFullscreen) r += n.top + o / 2 - window.innerHeight / 2;
    (r < 0 && (r = 0),
      window.jQuery
        ? window.jQuery(e).stop().animate({ scrollTop: r }, 400)
        : (e.scrollTop = r));
  }
}
function notifyMediaSession() {
  if (state.notificationManager && 1 == state.info.play_type) {
    state.notificationManager.timer ||
      (state.notificationManager.timer = setTimeout(function () {
        var e = $("#music_btn_play");
        (state.notificationManager.updateNotification(
          1 == state.info.play_type ? state.musicInfo : null,
          e && "pause" === e.getAttribute("data"),
        ),
          (state.notificationManager.timer = 0));
      }, 500));
  }
}
function updatePlaylist(e) {
  if (e && Array.isArray(e.playList)) {
    var t = attachQueueRowDrag.pending;
    if (t) {
      var i = queueListSignature(e.playList);
      if (i === t.expected || Date.now() >= t.until)
        attachQueueRowDrag.pending = null;
      else {
        if (i === t.before) return;
        attachQueueRowDrag.pending = null;
      }
    }
    if (
      ((state.playlist = e),
      !ui.playlistOverlay ||
        (ui.playlistOverlay._popupOpen && !ui.playlistOverlay._appDialogExit))
    ) {
      var n = $("#list_title");
      (n &&
        (n.textContent =
          "播放列表[" +
          (e.playList.length ? Number(e.playIndex) + 1 : 0) +
          "/" +
          e.playList.length +
          "]"),
        attachQueueRowDrag.active || renderPlaylistItems(e));
    } else ui.playlistDirty = !0;
  }
}
function queueListSignature(e) {
  return JSON.stringify(
    e.map(function (e) {
      return e.itemId || "";
    }),
  );
}
function renderPlaylistItems(e) {
  if (ui.playlistTable && !attachQueueRowDrag.active)
    if (
      !ui.playlistOverlay ||
      (ui.playlistOverlay._popupOpen && !ui.playlistOverlay._appDialogExit)
    ) {
      ui.playlistDirty = !1;
      var t = ui.playlistTable,
        i = Array.prototype.slice.call(t.getElementsByTagName("tr")),
        n = Object.create(null);
      i.forEach(function (e) {
        var t = e.getAttribute("itemId");
        null !== t && (n[t] || (n[t] = []), n[t].push(e));
      });
      var a = new Set();
      (e.playList.forEach(function (i, o) {
        var s = n[i.itemId || ""],
          r = s && s.length ? s.shift() : null;
        (r && r._queue) ||
          buildQueueRowContent((r = makeEl("tr", { class: "span" })));
        var l = t.getElementsByTagName("tr")[o] || null;
        (l !== r && t.insertBefore(r, l),
          (r._song = i),
          r.setAttribute("index", o),
          r.setAttribute("itemId", i.itemId || ""));
        var u = i.title || i.album || "",
          c = i.artist || "";
        (r._queue.title.textContent !== u && (r._queue.title.textContent = u),
          r._queue.artist.textContent !== c &&
            (r._queue.artist.textContent = c),
          (r.style.borderBottom =
            o < e.playList.length - 1
              ? "1px solid rgba(255,255,255,0.1)"
              : "none"),
          (r._queue.handle.style.display = hasMusicQueueCapability()
            ? "inline-flex"
            : "none"),
          setQueueRowPlaying(r, Number(e.playIndex) === o),
          a.add(r));
      }),
        i.forEach(function (e) {
          !a.has(e) && e.parentNode && e.parentNode.removeChild(e);
        }));
      for (var o = t.getElementsByTagName("hr"); o.length;)
        o[0].parentNode.removeChild(o[0]);
    } else ui.playlistDirty = !0;
}
function setQueueRowPlaying(e, t) {
  e.getAttribute("playing") !== (t ? "true" : "false") &&
    ((e._queue.icon.style.display = t ? "inline-flex" : "none"),
    (e._queue.play.style.display = t ? "none" : "inline-flex"),
    e.setAttribute("playing", t ? "true" : "false"));
}
function queueRowAction(e, t) {
  return function (i) {
    i && i.stopPropagation();
    for (var n = t || this; n && "tr" !== n.localName;) n = n.parentElement;
    if (
      n &&
      !attachQueueRowDrag.active &&
      (!ui.playlistOverlay ||
        (ui.playlistOverlay._popupOpen && !ui.playlistOverlay._appDialogExit))
    ) {
      var a = Number(n.getAttribute("index"));
      if (isFinite(a) && !(a < 0)) {
        var o = e(a, n._song);
        Array.isArray(o) && sendAction(o[0], o[1], o[2], o[3]);
      }
    }
  };
}
function buildQueueRowContent(e) {
  e.style.cssText =
    "display:flex;align-items:center;text-align:left;box-sizing:border-box;width:100%;padding:8px 8px 8px 12px;text-shadow:none;";
  var t = makeEl("span", {
      style: "flex:1;min-width:0;overflow:hidden;text-align:left",
    }),
    i = makeEl("div", {
      style:
        "display:flex;align-items:center;min-width:0;gap:3px;text-align:left",
    }),
    n = makeEl("span", {
      class: "q_playing_icon",
      html: MUSIC_ICONS.playing,
      title: "正在播放",
      style: "display:none;flex-shrink:0;align-items:center",
    }),
    a = makeEl("span", {
      style:
        "min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:#fff;text-shadow:none",
    }),
    o = makeEl("div", {
      style:
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:rgba(255,255,255,0.6);text-shadow:none",
    });
  (i.appendChild(n),
    i.appendChild(a),
    t.appendChild(i),
    t.appendChild(o),
    e.appendChild(t));
  var s = makeEl("span", {
      style:
        "display:inline-flex;align-items:center;gap:6px;flex-shrink:0;margin-left:8px",
    }),
    r =
      "border:none;border-radius:50%;width:30px;height:30px;color:#fff;cursor:pointer;background:rgba(255,255,255,0.15);flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;padding:0;margin:0;outline:none;",
    l = makeEl("button", {
      type: "button",
      class: "app_btn",
      "data-qact": "play",
      html: MUSIC_ICONS.playSm,
      title: "播放这首",
      style: r,
    });
  l.onclick = queueRowAction(function (e) {
    return [4, 11, -1, e];
  }, l);
  var u = makeEl("button", {
    type: "button",
    class: "app_btn",
    "data-qact": "more",
    html: MUSIC_ICONS.more,
    title: "更多操作",
    style: r,
  });
  u.onclick = queueRowAction(function (e, t) {
    showQueueRowMenu(e, t, state.playlist.playList.length);
  }, u);
  var c = makeEl("button", {
    type: "button",
    class: "drag_handle app_btn",
    html: MUSIC_ICONS.drag,
    title: "点击调整位置，长按拖动",
    style: r + "touch-action:none;cursor:grab",
  });
  ((c.onclick = queueRowAction(function (e, t) {
    (c._suppressClickUntil && Date.now() < c._suppressClickUntil) ||
      showQueueMoveDialog(e, t, state.playlist.playList.length);
  }, c)),
    s.appendChild(l),
    s.appendChild(u),
    s.appendChild(c),
    e.appendChild(s),
    (e._queue = { title: a, artist: o, icon: n, play: l, handle: c }),
    attachQueueRowDrag(e, c));
}
function buildFixedDialog(e, t) {
  var i = createDialogPanel(e, {
    host: createPopupHost({ blur: !1 }),
    width: t,
    bodyStyle: "padding:10px 14px",
  });
  return (
    (i.wrap.style.minWidth = "0"),
    (i.wrap.style.width = t),
    (i.panel.style.maxHeight = "70vh"),
    (i.title.style.fontSize = "15px"),
    i.body.classList.add("app_menu_items"),
    i
  );
}
function showQueueRowMenu(e, t, i) {
  var n = musicQueueContext(),
    a = buildFixedDialog("《" + getTrackTitle(t) + "》", "70vw");
  function o(e, t, i, n) {
    a.body.appendChild(
      makeEl("button", {
        type: "button",
        class: "app_btn",
        html:
          '<span style="width:16px;flex-shrink:0;display:inline-flex;justify-content:center;align-items:center">' +
          e +
          '</span><span style="flex:1;color:#fff;font-size:14px;line-height:16px;text-align:left">' +
          t +
          "</span>",
        style:
          "display:flex;align-items:center;gap:10px;width:100%;border:none;background:none;color:#fff;font-size:14px;cursor:pointer;padding:12px 6px;text-align:left;outline:none;border-bottom:1px solid rgba(255,255,255,0.08)",
        onclick: function () {
          a.isOpen() &&
            popupRenderHosts
              .filter(function (e) {
                return e._popupOpen;
              })
              .slice(-1)[0] === a.host &&
            (n || a.close(), i());
        },
      }),
    );
  }
  (hasMusicQueueCapability() &&
    e !== state.playlist.playIndex &&
    o(MUSIC_ICONS.trash, "从队列删除", function () {
      isMusicQueueContextCurrent(n) && confirmQueueRemove(e, t);
    }),
    state.info &&
      state.info.music_info &&
      state.info.music_info.id &&
      o(
        MUSIC_ICONS.list,
        "歌曲信息",
        function () {
          createMusicInfoWindow({ index: e, music_info: t }, { stack: !0 });
        },
        !0,
      ));
}
function showQueueMoveDialog(e, t, i) {
  if (hasMusicQueueCapability()) {
    var n = musicQueueContext(),
      a = buildFixedDialog("《" + getTrackTitle(t) + "》移动", "70vw"),
      o = state.playlist && state.playlist.playIndex;
    (e !== o &&
      s(MUSIC_SEARCH_ICONS.next, "下一首播放", function () {
        sendAction(
          4,
          27,
          -1,
          JSON.stringify({
            itemId: t.itemId,
            title: t.title || t.album || "",
            artist: t.artist || "",
            itemType: t.itemType || 0,
            url: t.url || "",
          }),
        );
      }),
      e > 0 &&
        (s(MUSIC_ICONS.up, "置顶", function () {
          sendAction(4, 28, -1, JSON.stringify({ from: e, to: 0 }));
        }),
        s(MUSIC_ICONS.up, "上移一位", function () {
          sendAction(4, 28, -1, JSON.stringify({ from: e, to: e - 1 }));
        })),
      e < i - 1 &&
        (s(MUSIC_ICONS.down, "下移一位", function () {
          sendAction(4, 28, -1, JSON.stringify({ from: e, to: e + 1 }));
        }),
        s(MUSIC_ICONS.down, "移到最后", function () {
          sendAction(4, 28, -1, JSON.stringify({ from: e, to: i - 1 }));
        })));
  }
  function s(e, t, i) {
    a.body.appendChild(
      makeEl("button", {
        type: "button",
        class: "app_btn",
        html:
          '<span style="width:16px;flex-shrink:0;display:inline-flex;justify-content:center;align-items:center">' +
          e +
          '</span><span style="flex:1;color:#fff;font-size:14px;line-height:16px;text-align:left">' +
          t +
          "</span>",
        style:
          "display:flex;align-items:center;gap:10px;width:100%;border:none;background:none;color:#fff;font-size:14px;cursor:pointer;padding:12px 6px;text-align:left;outline:none;border-bottom:1px solid rgba(255,255,255,0.08)",
        onclick: function () {
          (a.close(), isMusicQueueContextCurrent(n) && i());
        },
      }),
    );
  }
}
function confirmQueueRemove(e, t) {
  if (hasMusicQueueCapability()) {
    var i = musicQueueContext(),
      n = buildFixedDialog("删除确认", "78vw");
    (n.wrap.classList.add("app_prompt_wrap"),
      n.body.appendChild(
        makeEl("div", {
          style:
            "color:#fff;font-size:13px;padding:4px 0 14px;text-align:left;line-height:1.6",
          text: "从队列删除《" + getTrackTitle(t) + "》？",
        }),
      ));
    var a = makeEl("div", { style: "display:flex;gap:10px" }),
      o = makeEl("button", {
        type: "button",
        text: "取消",
        class: "app_btn",
        style:
          "flex:1;border:none;border-radius:8px;padding:9px 0;font-size:13px;color:#fff;cursor:pointer;background:rgba(255,255,255,0.15)",
      }),
      s = makeEl("button", {
        type: "button",
        text: "删除",
        class: "app_btn",
        style:
          "flex:1;border:none;border-radius:8px;padding:9px 0;font-size:13px;color:#fff;cursor:pointer;background:rgba(230,80,80,0.9)",
      });
    ((o.onclick = function () {
      n.close();
    }),
      (s.onclick = function () {
        (n.close(),
          isMusicQueueContextCurrent(i) &&
            sendAction(4, 29, -1, JSON.stringify({ index: e })));
      }),
      a.appendChild(s),
      a.appendChild(o),
      n.body.appendChild(a));
  }
}
function attachQueueRowDrag(e, t) {
  var i = null;
  function n(n, a, l) {
    if (
      hasMusicQueueCapability() &&
      !attachQueueRowDrag.active &&
      !attachQueueRowDrag.pending &&
      (!ui.playlistOverlay ||
        (ui.playlistOverlay._popupOpen &&
          !ui.playlistOverlay._appDialogExit)) &&
      (null == n.button || 0 === n.button)
    ) {
      (n.cancelable && n.preventDefault(), n.stopPropagation());
      var h = e.getBoundingClientRect();
      ((i = {
        pointerId: l,
        y: a,
        startY: a,
        grabOffset: a - h.top,
        height: h.height,
        from: Number(e.getAttribute("index")),
        list: state.playlist.playList.slice(),
        playing: Number(state.playlist.playIndex),
        centers: Array.prototype.map.call(
          e.parentNode.getElementsByTagName("tr"),
          function (e) {
            var t = e.getBoundingClientRect();
            return t.top + t.height / 2 + ui.playlistContainer.scrollTop;
          },
        ),
        context: musicQueueContext(),
        dragging: !1,
        timer: null,
        frame: null,
        cleanups: [],
        cancel: u,
      }),
        (attachQueueRowDrag.active = i),
        window.PointerEvent
          ? (g(document, "pointermove", d, { passive: !1 }),
            g(document, "pointerup", p),
            g(document, "pointercancel", u))
          : "touchstart" === n.type
            ? (g(document, "touchmove", f, { passive: !1 }),
              g(document, "touchend", r),
              g(document, "touchcancel", u))
            : (g(document, "mousemove", m), g(document, "mouseup", r)),
        g(window, "blur", u),
        g(document, "keydown", c),
        (i.timer = setTimeout(function () {
          i &&
            e.parentNode &&
            (isMusicQueueContextCurrent(i.context)
              ? ((i.dragging = !0),
                (attachQueueRowDrag.dragging = !0),
                (e.style.opacity = "0.6"),
                (e.style.position = "relative"),
                (e.style.zIndex = "2"),
                (e.style.transition = "none"),
                (e.style.boxShadow = "0 6px 18px rgba(0,0,0,0.4)"),
                (t.style.cursor = "grabbing"),
                navigator.vibrate && navigator.vibrate(30),
                o(),
                (i.frame = requestAnimationFrame(s)))
              : u());
        }, 400)));
    }
    function g(e, t, n, a) {
      (e.addEventListener(t, n, a),
        i.cleanups.push(function () {
          e.removeEventListener(t, n, a);
        }));
    }
  }
  function a(e, n) {
    i &&
      (isMusicQueueContextCurrent(i.context)
        ? ((i.y = n),
          i.dragging
            ? (e.cancelable && e.preventDefault(), o())
            : Math.abs(n - i.startY) > 8 &&
              ((t._suppressClickUntil = Date.now() + 600), u()))
        : u());
  }
  function o() {
    if (i && i.dragging && e.parentNode) {
      for (
        var t = e.parentNode,
          n = Array.prototype.slice
            .call(t.getElementsByTagName("tr"))
            .filter(function (t) {
              return t !== e;
            }),
          a =
            i.y - i.grabOffset + i.height / 2 + ui.playlistContainer.scrollTop,
          o = Number(e.getAttribute("index")),
          s = o;
        s > 0 && a <= i.centers[s - 1];
      )
        s--;
      for (; s < n.length && a >= i.centers[s + 1];) s++;
      (s !== o &&
        (t.insertBefore(e, n[s] || null),
        reindexQueueRows(),
        navigator.vibrate && navigator.vibrate(15)),
        (e.style.transform = ""));
      var r = e.getBoundingClientRect();
      e.style.transform = "translateY(" + (i.y - i.grabOffset - r.top) + "px)";
    }
  }
  function s() {
    if (i && i.dragging)
      if (isMusicQueueContextCurrent(i.context)) {
        var e = ui.playlistContainer;
        if (e) {
          var t = e.getBoundingClientRect(),
            n = i.y < t.top + 40 ? -8 : i.y > t.bottom - 40 ? 8 : 0;
          n && ((e.scrollTop += n), o());
        }
        i.frame = requestAnimationFrame(s);
      } else u();
  }
  function r() {
    if (i) {
      var n = i,
        a = Number(e.getAttribute("index")),
        o = queueListSignature(state.playlist.playList),
        s = queueListSignature(n.list);
      if ((l(), isMusicQueueContextCurrent(n.context))) {
        if (n.dragging)
          if (
            ((t._suppressClickUntil = Date.now() + 600),
            (attachQueueRowDrag.lastDragEnd = Date.now()),
            o === s)
          )
            if (a !== n.from) {
              var r = n.list.slice(),
                u = r.splice(n.from, 1)[0];
              r.splice(a, 0, u);
              var c = Number(state.playlist.playIndex);
              c === n.from
                ? (c = a)
                : n.from < c && a >= c
                  ? c--
                  : n.from > c && a <= c && c++;
              var d = {
                before: s,
                expected: queueListSignature(r),
                until: Date.now() + 3e3,
              };
              ((attachQueueRowDrag.pending = d),
                (state.playlist = Object.assign({}, state.playlist, {
                  playList: r,
                  playIndex: c,
                })),
                renderPlaylistItems(state.playlist),
                sendAction(4, 28, -1, JSON.stringify({ from: n.from, to: a })),
                setTimeout(function () {
                  sendWs({ type: "list" });
                }, 100),
                setTimeout(function () {
                  attachQueueRowDrag.pending === d &&
                    ((attachQueueRowDrag.pending = null),
                    sendWs({ type: "list" }));
                }, 3e3));
            } else renderPlaylistItems(state.playlist);
          else renderPlaylistItems(state.playlist);
      } else renderPlaylistItems(state.playlist);
    }
  }
  function l() {
    i &&
      (clearTimeout(i.timer),
      null != i.frame && cancelAnimationFrame(i.frame),
      i.cleanups.forEach(function (e) {
        e();
      }),
      (i = null),
      (attachQueueRowDrag.active = null),
      (attachQueueRowDrag.dragging = !1),
      (e.style.opacity = ""),
      (e.style.position = ""),
      (e.style.zIndex = ""),
      (e.style.transition = ""),
      (e.style.transform = ""),
      (e.style.boxShadow = ""),
      (t.style.cursor = "grab"));
  }
  function u() {
    if (i) {
      var e = i.dragging;
      (l(),
        e && (t._suppressClickUntil = Date.now() + 600),
        renderPlaylistItems(state.playlist));
    }
  }
  function c(e) {
    "Escape" === e.key && u();
  }
  function d(e) {
    i && e.pointerId === i.pointerId && a(e, e.clientY);
  }
  function p(e) {
    i && e.pointerId === i.pointerId && r();
  }
  function m(e) {
    a(e, e.clientY);
  }
  function f(e) {
    1 === e.touches.length ? a(e, e.touches[0].clientY) : u();
  }
  (window.PointerEvent
    ? t.addEventListener("pointerdown", function (e) {
        !1 !== e.isPrimary && n(e, e.clientY, e.pointerId);
      })
    : (t.addEventListener("mousedown", function (e) {
        n(e, e.clientY, null);
      }),
      t.addEventListener(
        "touchstart",
        function (e) {
          1 === e.touches.length && n(e, e.touches[0].clientY, null);
        },
        { passive: !1 },
      )),
    t.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    }),
    (t._cancelQueueDrag = u));
}
function reindexQueueRows() {
  for (
    var e = ui.playlistTable.getElementsByTagName("tr"), t = 0;
    t < e.length;
    t++
  )
    e[t].setAttribute("index", t);
}
function fetchTrackInfo() {
  if (1 == state.info.play_type) {
    var e = state.musicId,
      t = state.hostname,
      i = state.ws;
    setTimeout(function () {
      sendWs({ type: "list" });
    }, 100);
    var n,
      a = function (t) {
        if (s() && (1 != t.code || (t.data && t.data.id === e))) {
          if (((state.lyricsPending = null), 1 == t.code)) {
            var i = getTrackTitle(state.musicInfo) + "\t";
            if (
              (ui.musicPanel &&
                "block" === ui.musicPanel.style.display &&
                ((state.titleDisplayUntil = Date.now() + 1e3),
                setPageTitle(i),
                (document.title = state.deviceTag + i)),
              !(
                state.apiMusicInfo !== t.data ||
                (ui.musicPic && ui.musicPic._coverPending)
              ))
            )
              return;
            ((state.apiMusicInfo = t.data),
              t.update && t.update > 0
                ? (localStorage.removeItem("musicinfo"),
                  clearTimeout(timers.trackInfo),
                  (timers.trackInfo = setTimeout(
                    fetchTrackInfo,
                    parseInt(t.update, 10),
                  )))
                : localStorage.setItem("musicinfo", JSON.stringify(t)),
              updateMusicCover(
                state.apiMusicInfo.pic || state.musicInfo.albumUrl,
              ),
              updateFullscreenTitle());
            var n = state.apiMusicInfo.lrc;
            try {
              n = n.replace(/\[/g, "\r\n[").replace(/\r\n\r\n/g, "\r\n");
            } catch (e) {}
            var a = (n || "").match(/(\[\d{1,3}:\d{1,2}.\d{1,3}\])(.*)/g) || [],
              o = state.lyrics;
            state.lyrics = [];
            for (var r = 0; r < a.length; r++) {
              var l = a[r],
                u = l.match(/(\[\d{1,3}:\d{1,2}.\d{1,3}\])/g);
              if (u)
                for (
                  var c = u[u.length - 1],
                    d = l
                      .substring(l.indexOf(c) + c.length)
                      .replace(/^\s+|\s+$/g, ""),
                    p = 0;
                  p < u.length;
                  p++
                ) {
                  var m = u[p],
                    f = timeToMs(m.substr(1, m.length - 2));
                  isNaN(f) || state.lyrics.push([f, d]);
                }
            }
            (state.lyrics.length
              ? state.lyrics.sort(function (e, t) {
                  return e[0] - t[0];
                })
              : (state.lyrics = [[-1, "暂无歌词"]]),
              JSON.stringify(o) === JSON.stringify(state.lyrics) &&
                (state.lyrics = o));
          } else
            (ui.musicPic &&
              ui.musicPic._coverPending &&
              updateMusicCover(ui.musicPic.nopic),
              (state.lyrics = [[-1, "暂无歌词"]]));
          (state.musicInfo &&
            !state.lyricTiming.length &&
            (state.lyricTiming = [-1, 0, 0]),
            updateLyrics(!0));
        }
      },
      o = JSON.parse(localStorage.getItem("musicinfo") || "[]");
    if (1 != o.code || o.data.id !== state.musicId) {
      if (state.musicInfo)
        if (window.jQuery)
          ((n =
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
              data: n,
              dataType: "jsonp",
              success: a,
              error: function () {
                s() &&
                  ((state.lyricsPending = null),
                  (state.lyrics = [[-1, "暂无歌词"]]),
                  ui.musicPic &&
                    ui.musicPic._coverPending &&
                    updateMusicCover(ui.musicPic.nopic),
                  updateLyrics(!0));
              },
            }));
    } else a(o);
  }
  function s() {
    return (
      state.musicId === e &&
      state.hostname === t &&
      state.ws === i &&
      1 == state.info.play_type &&
      state.musicInfo
    );
  }
}
function updatePlayerState(e) {
  if (
    (confirmEchoVersion(e),
    updateUnisoundAvailability(e),
    null == state.renderedUnisoundVersion ||
      state.renderedUnisoundVersion === state.uVer)
  ) {
    for (var t = $$("input[type=range]"), i = 0; i < t.length; i++)
      ((t[i].onmousedown = function () {
        state.mousePressed = !0;
      }),
        (t[i].onmouseup = function () {
          state.mousePressed = !1;
        }));
    if (null == e.ver || state.ver == e.ver) {
      if (
        ((state.info = e),
        (state.playType == e.play_type && 4 != e.play_type) ||
          (clearMusicSeek(),
          (state.lyricTiming = [-1, 0, 0]),
          (state.lastLyricTime = 0),
          ui.musicTimeRange &&
            (setMusicProgress(0, 0), (ui.musicTimeRange.disabled = !0))),
        updateVersionFooter(),
        isEchoVer(1835))
      ) {
        var n = $("#disable_unisound");
        if (n)
          if (e.Unisound) {
            if (
              ((n.value = "禁用小讯"),
              (state.unisoundRetryCount[0] = 0),
              !state.unisoundAvailable)
            ) {
              if (state.unisoundRetryCount[1] > 6)
                return void location.reload();
              state.unisoundRetryCount[0]++;
            }
          } else if (
            ((n.value = "启用小讯"),
            (state.unisoundRetryCount[1] = 0),
            state.unisoundAvailable)
          ) {
            if (state.unisoundRetryCount[0] > 6) return void location.reload();
            state.unisoundRetryCount[0]++;
          }
      }
      if (isEchoVer(1856)) {
        var a = $("#switch_player");
        a &&
          (2 == state.info.PlayerType
            ? (a.setAttribute("PlayerType", 2),
              (a.value = "切换MediaPlayer播放器"))
            : (a.setAttribute("PlayerType", 1),
              (a.value = "切换ExoPlayer播放器")));
      }
      if (
        (!state.mousePressed &&
          ui.volumeRange &&
          (ui.volumeRange.value = e.vol),
        ui.volumeRange && ui.volumeLabel)
      ) {
        var o = "   " + ui.volumeRange.value + "/" + ui.volumeRange.max;
        ui.volumeLabel.innerHTML !== o && (ui.volumeLabel.innerHTML = o);
      }
      var s = $("#tts_speaker");
      if (s)
        for (var r = 0; r < s.length; r++)
          s[r].value === e.ttsModelType && (s[r].selected = !0);
      if ((updateButtonVisibility(), isEchoVer(1600))) {
        if (isUnisoundVer(1600)) {
          var l = $("#music_source");
          if (l)
            for (var u = 0; u < l.length; u++)
              l[u].value === e.music_source && (l[u].selected = !0);
        }
        for (
          var c = [
              ["随机播放", 1],
              ["顺序播放", 2],
              ["单曲循环", 3],
            ],
            d = c[0],
            p = 0;
          p < c.length;
          p++
        )
          c[p][1] == e.play_mode && (d = c[p]);
        var m = $("#music_btn_playmode");
        m && (m.setAttribute("mode", d[1]), updatePlayModeIcon(m, d[1]));
      }
      if (ui.musicPanel && "none" === ui.musicPanel.style.display)
        state.notificationManager &&
          state.notificationManager.cancelNotification();
      else {
        var f = state.musicInfo;
        if (
          e.music_info &&
          "object" == typeof e.music_info &&
          !Array.isArray(e.music_info)
        ) {
          var h = JSON.parse(JSON.stringify(e.music_info));
          (delete h.Current_MusicData, (state.musicInfo = h));
        } else state.musicInfo = null;
        if (
          2 == e.play_type ||
          3 == e.play_type ||
          4 == e.play_type ||
          5 == e.play_type
        ) {
          var g =
              2 == e.play_type
                ? "DLNA模式"
                : 3 == e.play_type
                  ? "AirPlay模式"
                  : 4 == e.play_type
                    ? "蓝牙模式"
                    : "MiPlay模式",
            v = state.musicInfo ? getTrackTitle(state.musicInfo) : "";
          v
            ? (setPageTitle("[" + g + "]" + v),
              (document.title = state.deviceTag + "[" + g + "]" + v))
            : (setPageTitle(g), (document.title = state.deviceTag + g));
        } else
          !state.musicInfo &&
            f &&
            1 != e.play_type &&
            (setPageTitle("R1音箱音乐页面" + state.deviceTag),
            (document.title =
              state.deviceTag + "R1音箱音乐页面" + state.deviceTag));
        (updateMusicControls(e),
          (state.musicInfo && 1 == e.play_type) || (state.lyricsPending = null),
          state.musicInfo && updateMusicTrackInfo(e),
          5 == e.play_type &&
            (ui.musicPic &&
              state.musicInfo &&
              state.musicInfo.albumUrl &&
              updateMusicCover(state.musicInfo.albumUrl),
            "function" == typeof updateFullscreenTitle &&
              updateFullscreenTitle(),
            (state.musicInfo && state.musicInfo.duration > 0) ||
              (state.lyricTiming = [-1, 0, 0]),
            (state.lyrics.length && "♪ MiPlay ♪" === state.lyrics[0][1]) ||
              ((state.lyrics = [[-1, "♪ MiPlay ♪"]]), updateLyrics(!0))));
        var y = $("#music_btn_play"),
          _ = document.querySelector(".music_lrc_div");
        !state.musicInfo ||
        (6 != state.musicInfo.state && 10 != state.musicInfo.state)
          ? e.play_state
            ? (_ && (_.style.pointerEvents = "none"),
              ui.musicPic &&
                (ui.musicPic.style.webkitAnimationPlayState = "running"),
              y && ((y.disabled = !1), updatePlayButtonIcon(y, "pause")))
            : (_ && (_.style.pointerEvents = ""),
              ui.musicPic &&
                (ui.musicPic.style.webkitAnimationPlayState = "paused"),
              y && ((y.disabled = !1), updatePlayButtonIcon(y, "play")))
          : y &&
            ((y.disabled = !0),
            updatePlayButtonIcon(
              y,
              6 == state.musicInfo.state ? "buffer" : "loading",
            ));
        var b =
          state.musicInfo &&
          (6 == state.musicInfo.state || 10 == state.musicInfo.state);
        if (
          (e.play_state || b
            ? (_ && (_.style.pointerEvents = "none"),
              ui.musicPic &&
                (ui.musicPic.style.webkitAnimationPlayState = "running"))
            : (_ && (_.style.pointerEvents = ""),
              ui.musicPic &&
                (ui.musicPic.style.webkitAnimationPlayState = "paused")),
          0 != state.playType && 0 == e.play_type && null != state.musicId)
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
          var k = $("#list_title");
          (k && (k.innerHTML = "播放列表[0]"),
            (document.title = "R1音箱音乐页面" + state.deviceTag),
            setPageTitle(document.title),
            ui.musicPic &&
              ((ui.musicPic._coverTrack = null),
              updateMusicCover(ui.musicPic.nopic)),
            ui.musicLyrics && (ui.musicLyrics.innerHTML = ""),
            updateFullscreenTitle());
        }
        (!state.coverBackgroundEnabled &&
          state.coverBackgroundApplied &&
          (restoreBackground(), (state.coverBackgroundApplied = !1)),
          syncFullscreenControls(),
          (state.playType = e.play_type));
      }
    } else location.reload();
  } else
    state.unisoundVersionReloading ||
      ((state.unisoundVersionReloading = !0), location.reload());
}
function updateMusicControls(e) {
  updateMusicCollectionButtons(e);
  var t = $("#music_btn_prev"),
    i = $("#music_btn_next"),
    n = $("#music_btn_play"),
    a = $("#music_btn_playmode");
  if (t) {
    if (
      (2 == e.play_type || 3 == e.play_type
        ? ((t.disabled = !0), (i.disabled = !0))
        : ((t.disabled = !1), (i.disabled = !1)),
      a &&
        (a.style.display =
          0 == e.play_type || 1 == e.play_type ? "inline-flex" : "none"),
      !state.musicInfo)
    ) {
      a && (a.style.display = "none");
      var o = $("#music_btn_collect"),
        s = $("#music_btn_cancel_collect"),
        r = $("#music_btn_list");
      return (
        o && (o.style.display = "none"),
        s && (s.style.display = "none"),
        r && (r.style.display = "none"),
        ui.qualityPanel && (ui.qualityPanel.style.display = "none"),
        ui.qualitySelect && (ui.qualitySelect.style.display = "none"),
        ui.qualityLabel && (ui.qualityLabel.style.display = "none"),
        (t.disabled = !0),
        (i.disabled = !0),
        void (
          n &&
          ((n.disabled = !1),
          n.setAttribute("data", "play"),
          n.classList.remove("playing"),
          updatePlayButtonIcon(n, "play"))
        )
      );
    }
    var l = 0 == e.play_type || 1 == e.play_type,
      u = $("#music_btn_list");
    (u && (u.style.display = l ? "inline-flex" : "none"),
      a && (a.style.display = l ? "inline-flex" : "none"));
    var c = ui.qualityPanel,
      d = ui.qualitySelect,
      p = ui.qualityLabel;
    if (
      (c && (c.style.display = l ? "block" : "none"),
      d && (d.style.display = l ? "" : "none"),
      p && (p.style.display = l ? "" : "none"),
      state.musicInfo &&
        void 0 !== state.musicInfo.arist &&
        (state.musicInfo.artist = state.musicInfo.arist),
      isEchoVer(1863) && 2 == state.info.PlayerType && updateQualityInfo(),
      state.musicInfo && n)
    )
      return 6 == state.musicInfo.state || 10 == state.musicInfo.state
        ? (n.setAttribute("data", "play"),
          n.classList.remove("playing"),
          (n.disabled = !0),
          void updatePlayButtonIcon(
            n,
            6 == state.musicInfo.state ? "buffer" : "loading",
          ))
        : void (e.play_state
            ? (n.setAttribute("data", "pause"),
              n.classList.add("playing"),
              (n.disabled = !1),
              updatePlayButtonIcon(n, "pause"))
            : (n.setAttribute("data", "play"),
              n.classList.remove("playing"),
              (n.disabled = !1),
              updatePlayButtonIcon(n, "play")));
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
function describeAudioFormat(e, t, i) {
  if (!e) return "";
  var n = [];
  if (!1 !== i) {
    var a,
      o = "";
    ("audio/vorbis" === e.sampleMimeType
      ? (o = "[OGG]")
      : "audio/mp4a-latm" === e.sampleMimeType
        ? (o = "[M4A]")
        : "audio/mpeg" === e.sampleMimeType && (o = "[MP3]"),
      (a =
        e.bitrate > 32e4
          ? e.sampleRate > 44100 && e.pcmEncoding > 3
            ? "Hi-Res"
            : "无损"
          : e.bitrate > 256e3
            ? "超品"
            : e.bitrate > 128e3
              ? "高品"
              : e.bitrate < 128e3
                ? "低品"
                : "标准"),
      n.push(a + o));
  }
  var s = PCM_BIT_MAP[e.pcmEncoding],
    r = 0;
  if (t > 0) r = parseInt(t / 1e3, 10);
  else if (e.bitrate > 0 && "audio/flac" !== e.sampleMimeType) {
    (s &&
      "audio/raw" === e.sampleMimeType &&
      s * e.sampleRate * e.channelCount === e.bitrate) ||
      (r = parseInt(e.bitrate / 1e3, 10));
  }
  return (
    r > 0 && n.push(r + "Kbps"),
    s && n.push(s + "Bit"),
    e.sampleRate > 0 && n.push(e.sampleRate / 1e3 + "kHz"),
    n.join(" ")
  );
}
function updateQualityInfo() {
  if (
    (ui.applyLyricsModeHeight && ui.applyLyricsModeHeight(), ui.qualitySelect)
  ) {
    var e = state.info.ExoPlayer_Quality;
    if (ui.qualitySelect.length > 2) {
      var t = state.info.Support_Flac ? "" : "none";
      ((ui.qualitySelect[0].style.display = t),
        (ui.qualitySelect[1].style.display = t));
    }
    e > 1 && !state.info.Support_Flac && (e = 1);
    for (var i = 0; i < ui.qualitySelect.length; i++)
      ui.qualitySelect[i].value == e && (ui.qualitySelect[i].selected = !0);
    var n = state.info.music_info
      ? state.info.music_info.Current_MusicData
      : null;
    if (
      (JSON.stringify(n) !== JSON.stringify(state.currentMusicData) &&
        ((state.currentMusicData = n),
        n &&
          state.musicInfo &&
          null != state.musicInfo.id &&
          "local_" === String(state.musicInfo.id).substring(0, 6) &&
          fetchTrackInfo()),
      !n)
    )
      return (
        ui.qualityLabel && (ui.qualityLabel.innerHTML = ""),
        void (ui.qualityPanel && (ui.qualityPanel.style.display = "none"))
      );
    var a,
      o = n.api_data,
      s = o && "string" == typeof o.quality ? o.quality : null,
      r = o && "number" == typeof o.br ? o.br : 0;
    (s
      ? ((a = "当前：" + s),
        n.Format && (a += " " + describeAudioFormat(n.Format, r, !1)))
      : (a = n.Format ? describeAudioFormat(n.Format, r, !0) : ""),
      (ui.qualitySelect.style.display = o ? "" : "none"),
      ui.qualityPanel && (ui.qualityPanel.style.display = "block"),
      ui.qualityLabel &&
        a !== ui.qualityLabel.innerHTML &&
        (ui.qualityLabel.innerHTML = a));
  }
}
function updateMusicTrackInfo(e) {
  var t = state.musicInfo,
    i =
      2 == e.play_type
        ? encodeURIComponent(t.title + "-" + t.artist + "-" + t.albumUrl)
        : t.id;
  if (
    (state.musicId !== t.id && 2 != e.play_type) ||
    (2 == e.play_type && i !== state.musicId) ||
    4 == e.play_type
  ) {
    var n;
    if (
      ((state.lyricTiming = [
        -1,
        Math.max(0, parseInt(t.position, 10) || 0),
        Math.max(0, parseInt(t.duration, 10) || 0),
      ]),
      (state.lyrics = [[-1, "暂无歌词"]]),
      (state.musicId = i),
      (state.lyricsPending =
        1 == e.play_type
          ? { musicId: i, hostname: state.hostname, socket: state.ws }
          : null),
      ui.musicLyrics &&
        ((ui.musicLyrics.innerHTML = ""),
        (ui.musicLyrics._placeholderText = null)),
      updateLyrics(!0),
      state.currentMusicData &&
        state.currentMusicData.api_data &&
        state.currentMusicData.api_data.info &&
        state.currentMusicData.id == state.musicId &&
        (n = state.currentMusicData.api_data.info.pic),
      ui.musicPic)
    ) {
      var a = JSON.stringify([e.play_type, i, t.title, t.artist]);
      (ui.musicPic._coverTrack !== a &&
        (waitMusicCover(), (ui.musicPic._coverTrack = a)),
        (n || t.albumUrl) && updateMusicCover(n || t.albumUrl));
    }
    updateFullscreenTitle();
    var o = getTrackTitle(t);
    (o &&
      (2 == e.play_type
        ? setPageTitle("[DLNA模式]" + o)
        : 3 == e.play_type
          ? setPageTitle("[AirPlay模式]" + o)
          : 4 == e.play_type
            ? setPageTitle("蓝牙模式[" + o + "]")
            : 5 == e.play_type
              ? setPageTitle("[MiPlay模式]" + o)
              : setPageTitle(o),
      (document.title =
        state.deviceTag + (ui.pageTitle ? ui.pageTitle.innerHTML : "")),
      updateFullscreenTitle()),
      fetchTrackInfo());
  } else
    ui.playlistTable &&
      ui.playlistTable.getElementsByTagName("tr").length < 1 &&
      fetchTrackInfo();
  var s = acceptMusicSeekPosition(t);
  if (!state.timeLocked && s) {
    var r = 4 == e.play_type ? 0 : Math.max(0, parseInt(t.duration, 10) || 0),
      l = r > 0 ? Math.max(0, parseInt(t.position, 10) || 0) : 0;
    ((state.lyricTiming[0] = e.play_state && r > 0 ? Date.now() : -1),
      (state.lyricTiming[1] = l),
      (state.lyricTiming[2] = r),
      ui.musicTimeRange &&
        (setMusicProgress(r, l), (ui.musicTimeRange.disabled = r < 1)));
  } else
    !state.timeLocked &&
      state.seekSession &&
      state.seekSession.committed &&
      !e.play_state &&
      -1 !== state.lyricTiming[0] &&
      ((state.lyricTiming[1] += Math.max(0, Date.now() - state.lyricTiming[0])),
      (state.lyricTiming[0] = -1));
  if (
    state.titleDisplayUntil - Date.now() > 0 &&
    ui.musicPanel &&
    "block" === ui.musicPanel.style.display
  ) {
    var u = getTrackTitle(t);
    u &&
      (2 == e.play_type
        ? setPageTitle("[DLNA模式]" + u)
        : 3 == e.play_type
          ? setPageTitle("[AirPlay模式]" + u)
          : 4 == e.play_type
            ? setPageTitle("蓝牙模式[" + u + "]")
            : 5 == e.play_type
              ? setPageTitle("[MiPlay模式]" + u)
              : setPageTitle(u),
      (document.title =
        state.deviceTag + (ui.pageTitle ? ui.pageTitle.innerHTML : "")),
      updateFullscreenTitle());
  }
}
function buildDeviceInfoPanel() {
  if (isEchoVer(1825) || (state.ver < 1823 && state.ver > 1800)) {
    var e = makeEl("div", { id: "device_info", style: "display:none" });
    ((ui.deviceInfo = e), ui.container && ui.container.appendChild(e));
    var t = makeEl("div", {
      style: "max-width:600px;margin:10px auto;border-radius:15px",
    });
    if (
      (t.classList.add("mask"),
      e.appendChild(t),
      t.appendChild(makeDiv("height:15px")),
      state.isNewUnisound && isUnisoundVer(1800) && isEchoVer(1825))
    ) {
      t.appendChild(
        makeText(
          "登录信息：<br>",
          "color:var(--white);text-shadow:var(--white-shadow)",
        ),
      );
      var i = makeText(
        "",
        "color:var(--white);text-shadow:var(--white-shadow)",
      );
      ((i.id = "user_info_text"),
        t.appendChild(i),
        t.appendChild(makeEl("br")),
        t.appendChild(
          makeText(
            "<br>授权信息：<br>",
            "color:var(--white);text-shadow:var(--white-shadow)",
          ),
        ));
      var n = makeText(
        "",
        "color:var(--white);text-shadow:var(--white-shadow)",
      );
      ((n.id = "sq_info_text"), t.appendChild(n), t.appendChild(makeEl("br")));
    }
    var a =
      state.isNewUnisound && isUnisoundVer(1800) && isEchoVer(1825)
        ? "<br>系统信息：<br>"
        : "系统信息：<br>";
    t.appendChild(
      makeText(a, "color:var(--white);text-shadow:var(--white-shadow)"),
    );
    var o = makeText("", "color:var(--white);text-shadow:var(--white-shadow)");
    ((o.id = "state_info_text"),
      t.appendChild(o),
      t.appendChild(makeEl("br")),
      t.appendChild(makeDiv("height:15px")),
      state.isNewUnisound &&
        isUnisoundVer(1822) &&
        isEchoVer(1825) &&
        buildBenchmarkSection(e),
      state.isNewUnisound &&
        isUnisoundVer(1800) &&
        isEchoVer(1825) &&
        buildLoginActions(e),
      buildDeviceActions(e));
  }
}
function buildBenchmarkSection(e) {
  var t = makeEl("div", {
    style: "max-width:600px;margin:10px auto;border-radius:15px",
  });
  (t.classList.add("mask"), t.appendChild(makeDiv("height:15px")));
  var i = makeEl("div"),
    n = makeDiv("");
  (n.appendChild(makeText("唤醒灵敏度")), i.appendChild(n));
  var a = makeDiv("width:50px;display:inline-block");
  (a.appendChild(makeText("低")), i.appendChild(a));
  var o = makeEl("input", {
    type: "range",
    min: 0,
    step: 10,
    max: 300,
    value: 0,
    disabled: !0,
  });
  ((o.maxValue = 300), (o.style.pointerEvents = "none"));
  var s = function (e) {
    (clearTimeout(o._disableTimer),
      (o.style.pointerEvents = "auto"),
      (o._disableTimer = setTimeout(function () {
        o.style.pointerEvents = "none";
      }, e || 3e3)));
  };
  (n.firstChild.addEventListener("click", function () {
    s(3e3);
  }),
    o.addEventListener("input", function () {
      (s(3e3), clearTimeout(timers.wakeupBenchmark));
      var e = this.max - this.value;
      timers.wakeupBenchmark = setTimeout(function () {
        isUnisoundVer(1848)
          ? sendToUnisound({
              type: "User_Wakeup_Benchmark",
              User_Wakeup_Benchmark: e / 100,
            })
          : sendToUnisound({
              type: "Main_Wakeup_Benchmark",
              Benchmark: e / 100,
            });
      }, 100);
    }),
    i.appendChild(o));
  var r = makeDiv("width:50px;display:inline-block");
  if (
    (r.appendChild(makeText("高")),
    i.appendChild(r),
    i.addEventListener("dblclick", function () {
      s(3e3);
    }),
    (ui.wakeupBenchmark = o),
    t.appendChild(i),
    isUnisoundVer(1822) && isEchoVer(1828))
  ) {
    var l = makeEl("div"),
      u = makeDiv("");
    (u.appendChild(makeText("最大录音时间")), l.appendChild(u));
    var c = makeDiv("width:50px;display:inline-block");
    (c.appendChild(makeText("当前：")), l.appendChild(c));
    var d = makeEl("input", {
      type: "range",
      min: 2,
      step: 1,
      max: 10,
      value: 1,
      disabled: !0,
    });
    d.style.pointerEvents = "none";
    var p = function (e) {
      (clearTimeout(d._disableTimer),
        (d.style.pointerEvents = "auto"),
        (d._disableTimer = setTimeout(function () {
          d.style.pointerEvents = "none";
        }, e || 3e3)));
    };
    (d.addEventListener("input", function () {
      (p(3e3),
        clearTimeout(timers.asrDuration),
        (timers.asrDuration = setTimeout(function () {
          (ui.asrMaxDurationLabel &&
            (ui.asrMaxDurationLabel.innerHTML = d.value + "秒"),
            sendToUnisound({
              type: "asrMaxDuration",
              Duration: 1e3 * parseInt(d.value, 10),
            }));
        }, 100)));
    }),
      l.appendChild(d));
    var m = makeText("未知"),
      f = makeDiv("width:50px;display:inline-block");
    (f.appendChild(m),
      l.appendChild(f),
      l.addEventListener("dblclick", function () {
        p(3e3);
      }),
      (ui.asrMaxDuration = d),
      (ui.asrMaxDurationLabel = m),
      t.appendChild(l));
  }
  (t.appendChild(makeDiv("height:15px")), e.appendChild(t));
}
function buildLoginActions(e) {
  (e.appendChild(
    makeButton("刷新授权", function () {
      updateDeviceInfo();
    }),
  ),
    e.appendChild(
      makeButton("重登录QQ音乐", function () {
        switchLoginApp("qqmusic", "QQ音乐");
      }),
    ),
    isUnisoundVer(1844) &&
      e.appendChild(
        makeButton("重登录酷我音乐", function () {
          switchLoginApp("kuwo", "酷我音乐");
        }),
      ),
    e.appendChild(
      makeButton("重登录网易云音乐", function () {
        switchLoginApp("netease", "网易云音乐");
      }),
    ),
    e.appendChild(
      makeButton("退出登录", function () {
        showAppConfirm("确定要退出登录吗？", function () {
          (hideLogin(), clearQrCache(), sendToUnisound({ type: "exit_login" }));
        });
      }),
    ));
}
function switchLoginApp(e, t) {
  showAppConfirm("确定要重新登录" + t + "？", function () {
    (hideLogin(),
      (state.loginMode = "music"),
      (state.loginApp = e),
      hideAllPages(),
      stopInfoRefresh(),
      unhideLogin());
  });
}
function buildDeviceActions(e) {
  e.appendChild(
    makeButton(
      "清理进程",
      function () {
        ((this.disabled = !0),
          (this.value = "请稍候。。。"),
          runShell("ps", "ps"));
      },
      { id: "Cleanup_process" },
    ),
  );
  var t = makeButton("开始/退出休眠", function () {
    this.disabled = !0;
    var e = this;
    setTimeout(function () {
      e.disabled = !1;
    }, 2e3);
    var t = this.dormancyState,
      i = this.value,
      n =
        ((e = this),
        function () {
          1 == t
            ? sendAction(256, 1, -1, !0)
            : 0 == t && sendAction(256, 2, -1, !0);
        });
    -1 !== t ? showAppConfirm("确定要" + i + "吗？", n) : n();
  });
  if (
    ((t.id = "dormancy_btn"),
    (t.style.display = "none"),
    (t.dormancyState = -1),
    (ui.dormancyBtn = t),
    e.appendChild(t),
    isUnisoundVer(1840))
  ) {
    var i = makeButton("启用/禁用麦克风", function () {
      this.disabled = !0;
      var e = this;
      setTimeout(function () {
        e.disabled = !1;
      }, 2e3);
      var t = this.wakeupState,
        i = function () {
          1 == t
            ? sendToUnisound({ type: "stop_wakeup" })
            : 0 == t && sendToUnisound({ type: "enter_wakeup" });
        };
      -1 !== t
        ? showAppConfirm(
            "确定要" +
              (0 == t ? "启用" : "禁用") +
              "麦克风吗？\r\n提示：此功能为临时开关！",
            i,
          )
        : i();
    });
    ((i.id = "Wakeup_set_btn"),
      (i.style.display = "none"),
      (i.wakeupState = -1),
      (ui.wakeupBtn = i),
      e.appendChild(i));
  }
  var n = makeButton("无可禁用的无用服务", function () {
    ((this.disabled = !0),
      (this.value = "请稍候。。。"),
      this.setAttribute("wait", Date.now() + 3e4));
    for (var e = [], t = 0; t < state.unusableServices.length; t++)
      e.push("/system/bin/pm hide " + state.unusableServices[t]);
    runShell(e.join(" && "), "hide_useless_services");
  });
  if (
    ((n.id = "hide_useless_services"),
    (n.disabled = !0),
    n.setAttribute("wait", 0),
    e.appendChild(n),
    isEchoVer(1835))
  ) {
    var a = makeButton(
      state.unisoundAvailable ? "禁用小讯" : "启用小讯",
      function () {
        var e = this;
        showAppConfirm("确定要" + this.value + "吗？", function () {
          ((e.disabled = !0),
            setTimeout(function () {
              e.disabled = !1;
            }, 1e3),
            "禁用小讯" === e.value
              ? runShell("/system/bin/pm hide com.phicomm.speaker.device")
              : runShell("/system/bin/pm unhide com.phicomm.speaker.device"));
        });
      },
    );
    ((a.id = "disable_unisound"), e.appendChild(a));
  }
  if (
    (state.unisoundAvailable &&
      e.appendChild(
        makeButton("清除小讯数据", function () {
          showAppConfirm(
            "确定要清除小讯数据吗？\r\n清除后需重新扫码登录才能使用！",
            function () {
              showAppConfirm("真的要清除小讯数据吗？", function () {
                (runShell("/system/bin/pm clear com.phicomm.speaker.device"),
                  setTimeout(function () {
                    (runShell(
                      "/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity",
                    ),
                      showAppAlert("清除完毕，稍候请重新扫码登录！"));
                  }, 3e3));
              });
            },
          );
        }),
      ),
    isUnisoundVer(1825) && isEchoVer(1841))
  ) {
    var o = makeButton("打开/关闭蓝牙提示音", function () {
      this.disabled = !0;
      var e = this;
      (setTimeout(function () {
        e.disabled = !1;
      }, 1e3),
        1 == e.toneState
          ? sendToUnisound({ type: "Set_Bluetooth_prompt_tone", enable: !1 })
          : 0 == e.toneState &&
            sendToUnisound({ type: "Set_Bluetooth_prompt_tone", enable: !0 }),
        sendToUnisound({ type: "get_info" }));
    });
    ((o.id = "Bluetooth_prompt_tone_btn"),
      (o.style.display = "none"),
      (o.toneState = -1),
      (ui.btToneBtn = o),
      e.appendChild(o));
  }
  if (isUnisoundVer(1824)) {
    var s = makeButton("打开/关闭提交播放记录", function () {
      this.disabled = !0;
      var e = this;
      (setTimeout(function () {
        e.disabled = !1;
      }, 1e3),
        1 == e.recordState
          ? sendToUnisound({ type: "Submit_Play_Record", enable: !1 })
          : 0 == e.recordState &&
            sendToUnisound({ type: "Submit_Play_Record", enable: !0 }),
        sendToUnisound({ type: "get_info" }));
    });
    ((s.id = "Submit_Play_Record_btn"),
      (s.style.display = "none"),
      (s.recordState = -1),
      (ui.submitRecordBtn = s),
      e.appendChild(s));
  }
  if (state.isNewUnisound && isUnisoundVer(1820) && isEchoVer(1815)) {
    var r = makeButton("无可清除的闹铃/提醒", function () {
      var e = this;
      showAppConfirm("确定要清除吗？", function () {
        ((e.disabled = !0),
          (e.value = "请稍候。。。"),
          isUnisoundVer(1840)
            ? sendToUnisound({ type: "delall_memo" })
            : sendToUnisound({ type: "del_memo", data: state.memoList }),
          e.setAttribute("wait", Date.now() + 3e4));
      });
    });
    ((r.id = "clear_memo"),
      (r.disabled = !0),
      r.setAttribute("wait", 0),
      e.appendChild(r));
  }
  if (isEchoVer(1856)) {
    var l = makeButton(
      2 == state.info.PlayerType
        ? "切换MediaPlayer播放器"
        : "切换ExoPlayer播放器",
      function () {
        var e = this.getAttribute("PlayerType"),
          t = "2" === e ? 1 : 2;
        showAppConfirm(
          "确定要切换为" +
            ("2" === e ? "MediaPlayer播放器" : "ExoPlayer播放器") +
            "吗？",
          function () {
            sendWs({ type: "switch_player", player: t });
          },
        );
      },
    );
    ((l.id = "switch_player"), e.appendChild(l));
  }
  var u = makeButton("打开/关闭smb服务", function () {
    var e = this,
      t = e.getAttribute("state") || 0;
    showAppConfirm("确定要" + e.value + "吗？", function () {
      (e.setAttribute("state", "1" === t ? 0 : 1),
        (t = e.getAttribute("state") || 0),
        (e.value = "1" === t ? "关闭smb服务" : "打开smb服务"),
        runShell(
          "setprop sys.rksmbd.start " + t + " && getprop sys.rksmbd.start",
          "rksmbd_state",
        ),
        showAppAlert(
          "1" === t
            ? "已打开smbd服务！\r\n用户名: root\r\n密码: 123456"
            : "已关闭smbd服务！",
        ));
    });
  });
  ((u.id = "rksmbd"),
    (u.style.display = "none"),
    e.appendChild(u),
    runShell(
      '[ "$(getenforce)" = "Enforcing" ] && echo -1 || getprop sys.rksmbd.start',
      "rksmbd_state",
    ));
}
function updateDeviceInfo() {
  var e = Date.now();
  (e > state.deviceInfoLastFetch &&
    state.isNewUnisound &&
    ((state.deviceInfoLastFetch = e + 5e3),
    sendToUnisound({ type: "api", data: { type: "info" } })),
    -1 === timers.deviceInfo &&
      ((timers.deviceInfo = 1), updateDeviceInfoWorker(), updateSystemInfo()));
}
function updateDeviceInfoWorker() {
  if (-1 !== timers.deviceInfo)
    if (isEchoVer(1855)) {
      var e = [
        {
          type: "shell",
          type_id: "useless_services_detection",
          shell: "/system/bin/pm list packages",
        },
      ];
      (state.isNewUnisound &&
        isUnisoundVer(1820) &&
        (e.push({ type: "send_to_unisound", data: { type: "get_memo" } }),
        e.push({ type: "send_to_unisound", data: { type: "get_info" } })),
        sendWs({ type: "sends", list: e }));
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
function setSystemInfoV2(e, t) {
  (setTimeout(function () {
    -1 !== timers.deviceInfo && updateSystemInfo();
  }, 1e3),
    updateDeviceInfoWorker());
  var i = $("#state_info_text");
  if (i) {
    for (
      var n = e.meminfo.split("\r\n"), a = -1, o = -1, s = -1, r = 0;
      r < n.length;
      r++
    ) {
      var l = n[r].split(":");
      if (
        ("MemTotal" === l[0]
          ? (a = parseInt(l[1], 10))
          : "MemFree" === l[0]
            ? (o = parseInt(l[1], 10))
            : "Cached" === l[0] && (s = parseInt(l[1], 10)),
        -1 !== a && -1 !== o && -1 !== s)
      )
        break;
    }
    for (var u = e.cpu.split("\r\n"), c = "0-0", d = 0; d < u.length; d++)
      if (0 === u[d].indexOf("online:")) {
        c = u[d].split(":")[1].replace(/^\s+|\s+$/g, "");
        break;
      }
    for (var p = 0, m = 0; m < e.availableProcessors; m++)
      for (
        var f = (e["cpu" + m] || "").split("\r\n"), h = 0;
        h < f.length;
        h++
      ) {
        var g = f[h].split(":");
        if ("scaling_cur_freq" === g[0]) {
          var v = parseInt(g[1], 10);
          v > p && (p = v);
        }
      }
    var y = "MediaPlayer";
    2 == state.info.Current_PlayerType &&
      ((y = "ExoPlayer"),
      state.info.Support_Flac &&
        (isEchoVer(1864)
          ? (y += "[FLAC]")
          : isEchoVer(1863)
            ? (y += "[FFmpeg]")
            : isEchoVer(1856) && (y += "[FLAC]")));
    var _ = "",
      b = "";
    if (t)
      for (var k = 0; k < t.length; k++) {
        if ("cpu_temp" === t[k].type_id && t[k].data) {
          var w = String(t[k].data).split("\r\n");
          w[1] && (_ = w[1]);
        }
        if ("date" === t[k].type_id && t[k].data) {
          var C = String(t[k].data).split("\r\n");
          C[1] && (b = C[1]);
        }
      }
    if (b) {
      var x = new Date(b + " +0800");
      isNaN(x.getTime()) || (state.deviceDate = x);
    }
    var T =
      "设备名称：" +
      (state.info.device_name
        ? state.info.device_name + "(" + state.hostname + ")"
        : state.hostname);
    ((T += "<br>固件版本：" + e.incremental),
      (T += "<br>设备IP：" + state.localIp),
      isEchoVer(1856) &&
        ((T += "<br>当前播放器：" + y),
        2 == state.info.Current_PlayerType &&
          "string" == typeof state.info.ExoPlayer_Version &&
          (T += "<br>ExoPlayer版本：" + state.info.ExoPlayer_Version)),
      (T +=
        "<br>CPU使用率[" +
        c +
        "]：(" +
        (p / 1e6).toFixed(2) +
        "Ghz)" +
        parseInt(e.cpuinfo[3], 10) +
        "%"),
      _ && (T += " " + Math.round(_) + "℃"),
      (T +=
        "<br>可用/全部：" +
        parseInt((o + s) / 1024, 10) +
        "MB/" +
        parseInt(a / 1024, 10) +
        "MB"),
      (T += "<br>系统已运行：" + formatDuration(e.elapsedRealtime)),
      state.deviceDate &&
        (T +=
          "<br>音箱当前时间：" +
          formatUnixTime(parseInt(state.deviceDate.getTime() / 1e3, 10))),
      (T +=
        "<br>信息更新时间：" + formatUnixTime(parseInt(Date.now() / 1e3, 10))),
      (i.innerHTML = T));
  }
}
function setSystemInfoV1(e) {
  (setTimeout(function () {
    -1 !== timers.deviceInfo && updateSystemInfo();
  }, 1e3),
    updateDeviceInfoWorker());
  var t = $("#state_info_text");
  if (t) {
    for (
      var i = e.split("\r\n"), n = -1, a = -1, o = -1, s = 0, r = 0;
      r < i.length;
      r++
    ) {
      var l = i[r].split(":");
      if (
        ("MemTotal" === l[0]
          ? (n = parseInt(l[1], 10))
          : "MemFree" === l[0]
            ? (a = parseInt(l[1], 10))
            : "Cached" === l[0] && (o = parseInt(l[1], 10)),
        -1 !== n && -1 !== a && -1 !== o)
      ) {
        s = r + 1;
        break;
      }
    }
    for (var u = null, c = 0, d = null, p = s; p < i.length; p++) {
      0 === i[p].indexOf("btime ") && (u = i[p].substring(6));
      var m = i[p].split(":"),
        f = m.shift();
      if ("incremental" === f) c = m.join(":");
      else if ("date" === f && (d = m.join(":"))) {
        var h = new Date(d + " +0800");
        isNaN(h.getTime()) || (state.deviceDate = h);
      }
    }
    var g =
      "设备名称：" +
      (state.info.device_name
        ? state.info.device_name + "(" + state.hostname + ")"
        : state.hostname);
    ((g += "<br>固件版本：" + c),
      (g += "<br>设备IP：" + state.localIp),
      (g +=
        "<br>可用/全部：" +
        parseInt((a + o) / 1024, 10) +
        "MB/" +
        parseInt(n / 1024, 10) +
        "MB"),
      (g += "<br>系统已运行：" + formatDuration(Date.now() - 1e3 * u)),
      (g +=
        "<br>信息更新时间：" + formatUnixTime(parseInt(Date.now() / 1e3, 10))),
      (t.innerHTML = g));
  }
}
function detectUnusableServices(e) {
  state.unusableServices = [];
  for (
    var t =
        "com.phicomm.speaker.airskill,com.android.providers.telephony,com.phicomm.speaker.productiontest,com.android.externalstorage,com.android.providers.downloads,com.android.certinstaller,com.phicomm.speaker.bugreport,com.android.inputdevices,com.android.server.telecom,com.android.keychain,com.phicomm.speaker.otaservice,com.android.proxyhandler,com.phicomm.speaker.ijetty,com.android.vpndialogs,com.android.location.fused,com.phicomm.speaker.exceptionreporter".split(
          ",",
        ),
      i = 0;
    i < t.length;
    i++
  )
    e.indexOf(t[i]) > -1 && state.unusableServices.push(t[i]);
  var n = $("#hide_useless_services");
  n &&
    (state.unusableServices.length > 0
      ? Date.now() > parseInt(n.getAttribute("wait"), 10) &&
        ((n.value = "禁用[" + state.unusableServices.length + "]个无用的服务"),
        (n.style.display = ""),
        (n.disabled = !1))
      : ((n.value = "无可禁用的无用服务"), (n.disabled = !0)));
}
function handleMemoInfo(e) {
  if (e.data) {
    var t = $("#clear_memo");
    if (t) {
      if ("del_memo" === e.type || "delall_memo" === e.type) {
        var i = state.memoList.length - e.data.length;
        t.value = "已清除" + (i < 1 ? "" : i + "个") + "闹铃/提醒！";
      }
      (e.data.length > 0
        ? Date.now() > parseInt(t.getAttribute("wait"), 10) &&
          ((t.style.display = ""),
          (t.disabled = !1),
          (t.value = "清除" + e.data.length + "个闹铃/提醒"))
        : setTimeout(function () {
            var e = $("#clear_memo");
            e && ((e.value = "无可清除的闹铃/提醒"), (e.disabled = !0));
          }, 1e3),
        (state.memoList = e.data));
    }
  }
}
function loadDeviceInfo() {
  var e = $("#user_info_text"),
    t = $("#sq_info_text"),
    i = state.deviceInfoCache.api_info;
  if (i)
    if (200 == i.code) {
      var n = i.data.nameValuePairs || i.data,
        a = n.device_info.nameValuePairs || n.device_info,
        o = n.user_info.nameValuePairs || n.user_info;
      if (e) {
        var s = "用户：" + o.nick + "(" + o.userid + ")";
        ((s +=
          "<br>QQ音乐：" +
          (1 == o.qqmusic_login_state ? "已登录(" + o.userid + ")" : "未登录")),
          isUnisoundVer(1844) &&
            (s +=
              "<br>酷我音乐：" +
              (1 == o.kuwo_login_state && o.kuwo_uid
                ? "已登录(" + o.kuwo_uid + ")"
                : "未登录")),
          (s +=
            "<br>网易云音乐：" +
            (1 == o.netease_login_state && o.netease_uid
              ? "已登录(" + o.netease_uid + ")"
              : o.netease_login_info || "未登录")),
          (s +=
            "<br>最后登录时间：" +
            (o.login_time ? formatUnixTime(o.login_time) : "未知")),
          (e.innerHTML = s));
      }
      if (t) {
        var r = "公网IP：" + a.ip;
        ((r += "<br>设备SN：" + a.sn), (r += "<br>设备MAC：" + a.mac));
        var l = "未授权",
          u = parseInt(Date.now() / 1e3, 10);
        ((1 != a.sq_type && 2 != a.sq_type && 3 != a.sq_type) ||
          (u > a.sq_expire_time && 3 != a.sq_type
            ? (l =
                2 == a.sq_type
                  ? "试用已过期<br>过期时间：" +
                    formatUnixTime(a.sq_expire_time)
                  : "已过期<br>过期时间：" + formatUnixTime(a.sq_expire_time))
            : 2 == a.sq_type
              ? (l =
                  "试用授权<br>到期时间：" + formatUnixTime(a.sq_expire_time))
              : ((l = "已授权<br>到期时间："),
                (l +=
                  3 == a.sq_type
                    ? a.sq_expire_time_text || "永久"
                    : formatUnixTime(a.sq_expire_time)))),
          (r += "<br>授权状态：" + l),
          (t.innerHTML = r));
      }
      (urlParams.del(["connect_id", "connect_ip"]),
        location.host.indexOf(state.controlHost) > -1 &&
          urlParams.put({ connect_id: a.device_msid, connect_ip: state.ip }),
        updateDeviceList({
          hostname: state.hostname,
          ip: state.ip.substring(0, state.ip.indexOf(":")),
          dev_name: state.info.device_name,
          url: location.href.split("?")[0],
          device_sid: a.device_sid,
          device_msid: a.device_msid,
        }));
    } else e && (e.innerHTML = i.msg + "(" + i.code + ")");
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
    var e = [ui.btScanBtn, ui.btDiscoverBtn, ui.btEnableBtn], t = 0;
    t < e.length;
    t++
  )
    e[t] && (e[t].disabled = !0);
  ((ui.btLastHash = ""),
    ui.btEnableBtn && (ui.btEnableBtn.enable = -1),
    ui.btPairedList && (ui.btPairedList.innerHTML = ""),
    ui.btScannedList && (ui.btScannedList.innerHTML = ""),
    stopBluetoothRefresh(),
    ui.bluetooth && (ui.bluetooth.style.display = "none"));
}
function refreshBluetoothDevices(e) {
  if (ui.btPairedList) {
    var t = bluetoothDataHash(e);
    if (ui.btLastHash !== t) {
      ui.btLastHash = t;
      var i = ui.btListContainer ? ui.btListContainer.scrollTop : 0;
      ((ui.btPairedList.innerHTML = ""), (ui.btScannedList.innerHTML = ""));
      var n = $("#bluetooth_pairing_title"),
        a = $("#bluetooth_scan_title");
      if (
        (n && (n.innerHTML = "已配对的设备[0]"),
        a && (a.innerHTML = "扫描到的设备[0]"),
        ui.btScanBtn &&
          (e.Scanning
            ? ((ui.btScanBtn.disabled = !0),
              (ui.btScanBtn.value = "扫描中。。。"))
            : ((ui.btScanBtn.disabled = !1),
              (ui.btScanBtn.value = "扫描蓝牙设备"))),
        !e.Enabled)
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
        state.info.Service_Normally_Open &&
          sendWs({ type: "BT_setScanMode", mode: 21 })),
        ui.btDiscoverBtn &&
          ((ui.btDiscoverBtn.disabled = !1),
          (ui.btDiscoverBtn.ScanMode = e.ScanMode),
          (ui.btDiscoverBtn.value =
            23 == e.ScanMode ? "关闭蓝牙可发现" : "打开蓝牙可发现")));
      for (
        var o = e.Bonded_Devices || [],
          s = e.Scan_Devices || [],
          r = e.ConnectedDevice || "",
          l = e.A2dp_ConnectedDevices || [],
          u = e.A2dpSink_ConnectedDevices || [],
          c = 0;
        c < o.length;
        c++
      )
        ((o[c].A2dpConnect = arrIncludes(l, o[c].Address)),
          (o[c].A2dpSinkConnect = arrIncludes(u, o[c].Address)),
          classifyBluetoothDevice(o[c]));
      for (var d = 0; d < s.length; d++) classifyBluetoothDevice(s[d]);
      renderBluetoothList(ui.btPairedList, o, r, n, "已配对的设备");
      for (var p = [], m = 0; m < s.length; m++) {
        for (var f = !1, h = 0; h < o.length; h++)
          if (o[h].Address === s[m].Address) {
            f = !0;
            break;
          }
        f || p.push(s[m]);
      }
      (renderBluetoothList(ui.btScannedList, p, r, a, "扫描到的设备"),
        ui.btListContainer && i > 0 && (ui.btListContainer.scrollTop = i));
    }
  }
}
function bluetoothDataHash(e) {
  var t = [];
  (t.push(e.Scanning ? 1 : 0),
    t.push(e.Enabled ? 1 : 0),
    t.push(e.ScanMode || 0),
    t.push(e.ConnectedDevice || ""));
  for (var i = e.Bonded_Devices || [], n = 0; n < i.length; n++) {
    var a = i[n];
    t.push(a.Address || "", a.Name || "", a.BondState || 0);
  }
  t.push("|");
  for (var o = e.Scan_Devices || [], s = 0; s < o.length; s++) {
    var r = o[s];
    t.push(r.Address || "", r.Name || "");
  }
  t.push("|");
  for (var l = e.A2dp_ConnectedDevices || [], u = 0; u < l.length; u++)
    t.push(l[u]);
  for (var c = e.A2dpSink_ConnectedDevices || [], d = 0; d < c.length; d++)
    t.push(c[d]);
  return t.join(",");
}
function classifyBluetoothDevice(e) {
  var t = e.BluetoothClass || 0,
    i = 7936 & t,
    n = 16769024 & t;
  e.Service = n;
  ((e.DeviceType =
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
    }[i] || ""),
    (e.A2dpSink = !!(262144 & n || n)),
    (e.A2dp = !!(524288 & n)));
}
function renderBluetoothList(e, t, i, n, a) {
  for (
    var o = document.createDocumentFragment(), s = 0, r = 0;
    r < t.length;
    r++
  ) {
    var l = t[r],
      u = makeEl("tr", { class: "span" });
    (u.setAttribute(
      "Connected",
      (l.Address === i && (l.A2dpConnect || l.A2dpSinkConnect)) ||
        l.A2dpConnect ||
        l.A2dpSinkConnect,
    ),
      "true" == u.getAttribute("Connected") &&
        u.appendChild(makeEl("span", { html: "[已连接]" })),
      u.setAttribute("data", JSON.stringify(l)),
      (function (e) {
        e.onclick = function () {
          createBluetoothConfigDialog(e);
        };
      })(u),
      u.appendChild(makeEl("span", { html: getBluetoothDeviceTitle(l) })),
      o.appendChild(u),
      s++,
      r < t.length - 1 &&
        o.appendChild(
          makeEl("hr", {
            class: "hr",
            style: "width:80%;background-color:rgba(255,255,255,0.1)",
          }),
        ));
  }
  (e.appendChild(o), n && (n.innerHTML = a + "[" + s + "]"));
}
function getBluetoothDeviceTitle(e) {
  var t = 11 == e.BondState ? "[配对中]" : "";
  return (
    "UNCATEGORIZED" !== e.DeviceType &&
      (t +=
        {
          COMPUTER: "💻",
          PHONE: "📱",
          AUDIO_VIDEO: "🎧",
          PERIPHERAL: "[外围设备]",
        }[e.DeviceType] || e.DeviceType),
    t + (e.name || e.Name || e.Address)
  );
}
var miPlayGroupDialog = null;
function createMiPlayGroupDialog() {
  if (miPlayGroupDialog && miPlayGroupDialog.isOpen())
    miPlayGroupDialog.close();
  else {
    var e = createDialogPanel("MiPlay 立体声组合", {
      transparent: !0,
      width: "92vw",
    });
    ((miPlayGroupDialog = e), (e.wrap.id = "miplay_group_wrap"));
    var t = "color:#fff;font-size:13px;line-height:1.5;text-align:left",
      i = makeEl("div", { style: t + ";margin:4px 0 8px" });
    e.body.appendChild(i);
    var n = makeEl("input", {
      type: "button",
      class: "btn",
      value: "🔗 一键组队（自动发现副机）",
      style:
        "width:100%;margin-bottom:10px;padding:10px;font-size:14px;font-weight:bold",
    });
    e.body.appendChild(n);
    var a = makeEl("div", {
      style: t + ";font-weight:bold;margin:6px 0 4px",
      html: "发现的音箱：",
    });
    e.body.appendChild(a);
    var o = makeEl("div", { style: "margin:0 0 10px" });
    e.body.appendChild(o);
    var s = makeEl("div", {
      style: t + ";color:#90caf9;cursor:pointer;margin:8px 0 4px",
      html: "▶ 高级手动配置",
    });
    e.body.appendChild(s);
    var r = makeEl("div", { style: "display:none;margin:0 0 8px" });
    e.body.appendChild(r);
    var l = makeEl("div", { style: "display:flex;gap:6px;margin-bottom:8px" }),
      u = [
        ["关闭", 0],
        ["主机(左)", 1],
        ["副机(右)", 2],
      ];
    (u.forEach(function (e) {
      var t = makeEl("input", {
        type: "button",
        class: "btn",
        value: e[0],
        style: "flex:1;font-size:12px",
      });
      (t.setAttribute("data-role", e[1]), l.appendChild(t));
    }),
      r.appendChild(l));
    var c = makeEl("div", {
      style: "display:flex;gap:6px;margin-bottom:6px;align-items:center",
    });
    c.appendChild(makeText("对端IP:"));
    var d = makeEl("input", {
      type: "text",
      placeholder: "对端音箱IP",
      style: "flex:1;color:#fff;font-size:12px",
    });
    (c.appendChild(d), r.appendChild(c));
    var p = makeEl("div", {
      style: "display:flex;gap:6px;margin-bottom:6px;align-items:center",
    });
    p.appendChild(makeText("远程声道:"));
    var m = makeEl("input", {
        type: "text",
        placeholder: "副机IP",
        style: "flex:1;color:#fff;font-size:12px",
      }),
      f = makeEl("select", {
        style:
          "flex:1;color:#fff;background:#333;border:1px solid #555;padding:4px",
      });
    [
      ["立体声", 0],
      ["仅左", 1],
      ["仅右", 2],
    ].forEach(function (e) {
      var t = makeEl("option", { value: e[1], html: e[0] });
      f.appendChild(t);
    });
    var h = makeEl("input", {
      type: "button",
      class: "btn",
      value: "设置",
      style: "font-size:12px;padding:4px 8px",
    });
    (p.appendChild(m),
      p.appendChild(f),
      p.appendChild(h),
      r.appendChild(p),
      e.body.appendChild(
        makeEl("input", {
          type: "button",
          class: "btn",
          value: "🔄 刷新",
          style: "width:100%;margin-bottom:4px;font-size:12px",
          onclick: function () {
            (sendWs({ type: "get_info" }), setTimeout(v, 600));
          },
        }),
      ),
      (s.onclick = function () {
        var e = "none" !== r.style.display;
        ((r.style.display = e ? "none" : "block"),
          (s.innerHTML = e ? "▶ 高级手动配置" : "▼ 高级手动配置"));
      }),
      (n.onclick = function () {
        showAppConfirm(
          "确定一键组队？\n本机将设为主机(左)，自动发现的音箱设为副机(右)。",
          function () {
            (e.isOpen() &&
              document.getElementById("miplay_group_wrap") === e.wrap &&
              ((n.value = "⏳ 组队中..."), (n.disabled = !0)),
              sendWs({ type: "Set_MiPlay_Group_Auto" }),
              setTimeout(function () {
                (e.isOpen() &&
                  document.getElementById("miplay_group_wrap") === e.wrap &&
                  ((n.value = "🔗 一键组队（自动发现副机）"),
                  (n.disabled = !1)),
                  sendWs({ type: "get_info" }),
                  setTimeout(v, 600));
              }, 1500));
          },
        );
      }),
      (h.onclick = function () {
        var e = m.value.trim();
        if (e) {
          var t = f.value;
          (sendWs({
            type: "Set_MiPlay_Remote_Channel",
            ip: e,
            channel: parseInt(t),
          }),
            setTimeout(function () {
              showAppAlert("声道设置已发送！");
            }, 500));
        } else showAppAlert("请填写副机IP！");
      }),
      u.forEach(function (e) {
        l.querySelectorAll("input").forEach(function (t) {
          parseInt(t.getAttribute("data-role"), 10) === e[1] &&
            (t.onclick = function () {
              var t = d.value.trim();
              0 === e[1] || t
                ? showAppConfirm("确定设置为【" + e[0] + "】？", function () {
                    (sendWs({ type: "Set_MiPlay_Group", role: e[1], peer: t }),
                      setTimeout(function () {
                        (sendWs({ type: "get_info" }), v());
                      }, 800));
                  })
                : showAppAlert("请先填写对端音箱IP！");
            });
        });
      }),
      sendWs({ type: "get_info" }),
      setTimeout(v, 500));
    var g = setInterval(function () {
      e.isOpen() && document.getElementById("miplay_group_wrap") === e.wrap
        ? (sendWs({ type: "get_info" }), setTimeout(v, 300))
        : clearInterval(g);
    }, 5e3);
    e.onClose(function () {
      (clearInterval(g), miPlayGroupDialog === e && (miPlayGroupDialog = null));
    });
  }
  function v() {
    if (e.isOpen() && document.getElementById("miplay_group_wrap") === e.wrap) {
      var t = parseInt(state.info.miplay_group_role || 0, 10),
        n = state.info.miplay_group_peer || "",
        a = (state.info.miplay_discovered || "")
          .split(",")
          .filter(function (e) {
            return e.trim();
          }),
        s = 2 == state.info.miplay_state;
      "" === d.value && (d.value = n);
      var l = 1 === t ? "主机(左)" : 2 === t ? "副机(右)" : "未启用",
        u = s ? "投送中" : "待机";
      if (
        ((i.innerHTML =
          "<b>当前角色：</b>" +
          l +
          "（" +
          u +
          "）" +
          (n ? " | 对端：" + n : "") +
          '<br><span style="color:#90caf9">组合后请设置本机声道：主机=仅左，副机=仅右</span>' +
          r.querySelectorAll("input[data-role]").forEach(function (e) {
            var i = parseInt(e.getAttribute("data-role"), 10) === t;
            (e.setAttribute("data-active", i ? "1" : "0"),
              (e.style.background = i ? "rgba(255,255,255,0.85)" : ""),
              (e.style.color = i ? "#1565c0" : "#fff"));
          })),
        0 === a.length)
      )
        o.innerHTML =
          '<span style="color:#999;font-size:12px">暂未发现其他音箱（确保对方也开启了组合功能）</span>';
      else {
        var c = "";
        (a.forEach(function (e) {
          var t = e.trim();
          c +=
            '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;background:rgba(255,255,255,0.08);border-radius:8px;padding:6px 8px"><span style="flex:1">📡 ' +
            t +
            "</span><select style=\"color:#fff;background:#333;border:1px solid #555;padding:2px 4px;font-size:12px\" onchange=\"sendWs({type:'Set_MiPlay_Remote_Channel',ip:'" +
            t +
            '\',channel:parseInt(this.value)})"><option value="0">立体声</option><option value="1">仅左</option><option value="2">仅右</option></select></div>';
        }),
          (o.innerHTML = c));
      }
    }
  }
}
function createBluetoothConfigDialog(e) {
  var t = e.getAttribute("data");
  if (t) {
    var i = JSON.parse(t),
      n = e.getAttribute("Connected"),
      a = createDialogPanel(getBluetoothDeviceTitle(i), { noPadding: !0 }),
      o = a.body;
    o.appendChild(
      makeEl("div", {
        style:
          "background:#f5f5f5;padding:10px 16px;color:#666;font-size:12px;border-bottom:1px solid #eee",
        html: "MAC：" + i.Address,
      }),
    );
    var s = makeEl("div", {
      class: "dark_opts",
      style: "background:rgba(0,0,0,0.25)",
    });
    o.appendChild(s);
    var r = function (e, t, i) {
      var n = makeEl("tr", {
        class: "span1",
        style: "color:#fff;background-color:transparent;text-shadow:none",
      });
      (i
        ? n.setAttribute("none", "true")
        : (n.onclick = function () {
            a.isOpen() && (a.close(), t.call(this));
          }),
        n.appendChild(makeEl("span", { html: e })),
        s.appendChild(n));
    };
    12 == i.BondState
      ? ("true" == n &&
          r("断开设备", function () {
            (i.A2dpConnect
              ? sendWs({ type: "BT_Disconnect_A2dp_Device", mac: i.Address })
              : i.A2dpSinkConnect &&
                sendWs({
                  type: "BT_Disconnect_A2dpSink_Device",
                  mac: i.Address,
                }),
              sendWs({ type: "BT_Device" }));
          }),
        i.A2dpSink &&
          r("推送音频", function () {
            (sendWs({ type: "BT_Connect_A2dp_Device", mac: i.Address }),
              sendWs({ type: "BT_Device" }));
          }),
        i.A2dp &&
          r("连接设备", function () {
            (sendWs({ type: "BT_Connect_A2dpSink_Device", mac: i.Address }),
              sendWs({ type: "BT_Device" }));
          }),
        r("取消配对", function () {
          (sendWs({ type: "BT_removeBond", mac: i.Address }),
            sendWs({ type: "BT_Device" }));
        }))
      : i.A2dpSink || i.A2dp
        ? r("配对", function () {
            (sendWs({ type: "BT_createBond", mac: i.Address }),
              sendWs({ type: "BT_Device" }));
          })
        : r("不支持连接此设备！", function () {}, !0);
  }
}
var voiceReportingSession = null,
  voiceReportingGeneration = 0,
  autoRestartSession = null,
  autoRestartGeneration = 0;
function requestVoiceTimeReporting() {
  sendToUnisound({ type: "Voice_time_reporting" });
}
function openVoiceTimeReportingPanel(e) {
  if (
    ((e = e ||
      state.voiceReportingData || {
        Time_reporting_list: [],
        Time_reporting_open: !1,
        Whole_point_prompt: "",
        Half_dot_prompt: "",
      }),
    (state.radioReportList = e.Time_reporting_list || []),
    ui.voiceReportingPanel)
  )
    ui.voiceReportingDialog.isOpen() || reopenPopupHost(ui.voiceReportingHost);
  else {
    var t = createDialogPanel("设置语音报时");
    ((ui.voiceReportingPanel = t.wrap),
      (ui.voiceReportingHost = t.host),
      (ui.voiceReportingDialog = t));
    var i = t.body;
    ((i.style.color = "#fff"),
      i.appendChild(makeDiv("height:10px")),
      i.appendChild(
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
      i.appendChild(makeText("语音报时")),
      i.appendChild(
        makeEl("input", {
          type: "checkbox",
          id: "Half_an_hour_switch",
          onclick: function () {
            for (
              var e = this.checked, t = 0;
              t < state.radioReportList.length;
              t++
            )
              state.radioReportList[t] > 0 &&
                (state.radioReportList[t] = e ? 3 : 1);
            sendToUnisound({
              type: "set_Time_reporting_list",
              list: state.radioReportList,
            });
          },
        }),
      ),
      i.appendChild(makeText("半点报时")),
      isUnisoundVer(1833) &&
        (i.appendChild(
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
        i.appendChild(makeText("12小时制"))),
      i.appendChild(makeDiv("height:10px")));
    for (var n = 0; n < 24; n++)
      (n > 0 && n % 4 == 0 && i.appendChild(makeDiv("height:10px")),
        (function (e) {
          var t = makeEl("input", {
            type: "checkbox",
            id: "time_reporting_" + e,
          });
          ((t.onclick = function () {
            var t = i.querySelector("#Half_an_hour_switch");
            ((state.radioReportList[e] = this.checked
              ? t && t.checked
                ? 3
                : 1
              : 0),
              sendToUnisound({
                type: "set_Time_reporting_list",
                list: state.radioReportList,
              }));
          }),
            i.appendChild(t));
        })(n),
        i.appendChild(makeText(n + "点")));
    (i.appendChild(makeDiv("height:10px")),
      i.appendChild(makeText("整点提示：")),
      i.appendChild(
        makeEl("input", {
          type: "text",
          id: "Whole_point_prompt",
          style: "height:40px;width:150px",
        }),
      ),
      i.appendChild(
        makeButton(
          "保存",
          function () {
            if (t.isOpen()) {
              var e = i.querySelector("#Whole_point_prompt").value;
              if (e && -1 === e.indexOf("[hour]"))
                return showAppAlert("请添加[hour]字段！");
              sendToUnisound({ type: "set_Whole_point_prompt", prompt: e });
            }
          },
          { style: "padding:6px 12px;margin:2px" },
        ),
      ),
      i.appendChild(makeDiv("height:10px")),
      i.appendChild(makeText("半点提示：")),
      i.appendChild(
        makeEl("input", {
          type: "text",
          id: "Half_dot_prompt",
          style: "height:40px;width:150px",
        }),
      ),
      i.appendChild(
        makeButton(
          "保存",
          function () {
            if (t.isOpen()) {
              var e = i.querySelector("#Half_dot_prompt").value;
              if (e && -1 === e.indexOf("[hour]"))
                return showAppAlert("请添加[hour]字段！");
              sendToUnisound({ type: "set_Half_dot_prompt", prompt: e });
            }
          },
          { style: "padding:6px 12px;margin:2px" },
        ),
      ));
  }
  if (
    !voiceReportingSession ||
    voiceReportingSession.dlg !== ui.voiceReportingDialog
  ) {
    var a = {
      dlg: ui.voiceReportingDialog,
      generation: ++voiceReportingGeneration,
    };
    ((voiceReportingSession = a),
      a.dlg.onClose(function () {
        voiceReportingSession === a &&
          ((voiceReportingSession = null), voiceReportingGeneration++);
      }));
  }
  return (
    createVoiceTimeReportingPanel(e),
    requestVoiceTimeReporting(),
    ui.voiceReportingDialog
  );
}
function createVoiceTimeReportingPanel(e) {
  if (e) {
    ((state.voiceReportingData = e),
      (state.radioReportList = e.Time_reporting_list || []));
    var t = voiceReportingSession;
    if (t && t.generation === voiceReportingGeneration && t.dlg.isOpen()) {
      var i = t.dlg.body;
      i.querySelector("#time_reporting_switch").checked = e.Time_reporting_open;
      for (var n = !1, a = 0; a < state.radioReportList.length; a++)
        state.radioReportList[a] > 1 && (n = !0);
      i.querySelector("#Half_an_hour_switch").checked = n;
      for (var o = 0; o < state.radioReportList.length; o++) {
        var s = i.querySelector("#time_reporting_" + o);
        s && (s.checked = state.radioReportList[o] > 0);
      }
      if (isUnisoundVer(1833)) {
        var r = i.querySelector("#Time_reporting_12h_switch");
        r && (r.checked = e.Time_reporting_12h);
      }
      ((i.querySelector("#Whole_point_prompt").value = e.Whole_point_prompt),
        (i.querySelector("#Half_dot_prompt").value = e.Half_dot_prompt));
    }
  }
}
function requestAutoRestart() {
  sendWs({ type: "Auto_restart_device" });
}
function openAutoRestartPanel(e) {
  if (
    ((e = e ||
      state.autoRestartData || {
        Auto_restart_device_time: [0, 0],
        Auto_restart_device_open: !1,
      }),
    (state.autoRestartTimes = e.Auto_restart_device_time),
    ui.autoRestartPanel)
  )
    ui.autoRestartDialog.isOpen() || reopenPopupHost(ui.autoRestartHost);
  else {
    var t = createDialogPanel("设置自动重启");
    ((ui.autoRestartPanel = t.wrap),
      (ui.autoRestartHost = t.host),
      (ui.autoRestartDialog = t));
    var i = t.body;
    ((i.style.color = "#fff"),
      i.appendChild(
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
      i.appendChild(makeText("开关")),
      i.appendChild(makeDiv("height:10px")),
      i.appendChild(makeText("每天")),
      i.appendChild(
        makeEl("input", {
          type: "time",
          id: "Auto_restart_device_time",
          onchange: function () {
            if (this.value) {
              var e = this.value.split(":");
              sendWs({
                type: "set_Auto_restart_device_time",
                times: JSON.stringify([parseInt(e[0], 10), parseInt(e[1], 10)]),
              });
            }
          },
        }),
      ),
      i.appendChild(makeText("自动重启")));
  }
  if (!autoRestartSession || autoRestartSession.dlg !== ui.autoRestartDialog) {
    var n = { dlg: ui.autoRestartDialog, generation: ++autoRestartGeneration };
    ((autoRestartSession = n),
      n.dlg.onClose(function () {
        autoRestartSession === n &&
          ((autoRestartSession = null), autoRestartGeneration++);
      }));
  }
  return (
    createAutoRestartPanel(e),
    requestAutoRestart(),
    ui.autoRestartDialog
  );
}
function createAutoRestartPanel(e) {
  if (e) {
    ((state.autoRestartData = e),
      (state.autoRestartTimes = e.Auto_restart_device_time));
    var t = autoRestartSession;
    if (t && t.generation === autoRestartGeneration && t.dlg.isOpen()) {
      var i = t.dlg.body;
      i.querySelector("#Auto_restart_device_switch").checked =
        e.Auto_restart_device_open;
      var n = state.autoRestartTimes || [0, 0];
      i.querySelector("#Auto_restart_device_time").value =
        padZero(n[0], 2) + ":" + padZero(n[1], 2);
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
    var e = makeEl("div");
    (e.appendChild(
      makeButton("刷新二维码", function () {
        updateQrcode();
      }),
    ),
      e.appendChild(
        makeButton("重启小讯", function () {
          var e = this;
          ((e.value = "重启中。。。"),
            runShell("/system/bin/am force-stop com.phicomm.speaker.device"),
            setTimeout(function () {
              (runShell(
                "/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity",
              ),
                setTimeout(function () {
                  ((e.value = "重启小讯"), showAppAlert("重启完毕！"));
                }, 1e4));
            }, 3e3));
        }),
      ),
      e.appendChild(
        makeButton(
          "校准音箱时间",
          function () {
            var e = this;
            ((e.value = "正在校准。。。"),
              setTimeout(function () {
                e.value = "校准音箱时间";
              }, 2e3),
              runShell(
                "settings put global auto_time 0 & sleep 1 & settings put global ntp_server ntp1.aliyun.com & settings put global auto_time 1",
                "set_date",
              ));
          },
          { id: "rtime" },
        ),
      ),
      ui.loginPanel.appendChild(e),
      ui.loginPanel.appendChild(makeDiv("height:10px")));
  }
}
function showDisconnectedActions(e) {
  var t = $("#custom_ip_page");
  if (t && "none" !== t.style.display) hideDisconnectedActions();
  else {
    var i = ui.disconnectedActions;
    if (!i) {
      (i = ui.disconnectedActions =
        makeEl("div", {
          id: "connection_actions",
          style: "text-align:center;margin:20px auto;max-width:440px",
        })).appendChild(
        makeEl("div", {
          text: "连接已取消，可重新连接音箱或刷新页面。",
          style: "color:#fff;font-size:14px;margin-bottom:15px",
        }),
      );
      var n = makeEl("div", {
        class: "app_flow_actions",
        style: "display:flex;gap:10px",
      });
      (n.appendChild(
        makeFlowButton("重新连接", function () {
          i === ui.disconnectedActions &&
            "none" !== i.style.display &&
            (hideDisconnectedActions(), i._retry());
        }),
      ),
        n.appendChild(
          makeFlowButton("刷新页面", function () {
            location.reload();
          }),
        ),
        i.appendChild(n));
    }
    ((i._retry = e),
      ui.container &&
        i.parentNode !== ui.container &&
        ui.container.appendChild(i),
      (i.style.display = "block"));
  }
}
function hideDisconnectedActions() {
  ui.disconnectedActions && (ui.disconnectedActions.style.display = "none");
}
function unhideLogin(e) {
  if ((clearLoginFlowNotices(), loginSessionCurrent(state.loginSession)))
    return (invalidateLoginIntent(), void resumeLoginConnection());
  if (!loginIntentCurrent(state.loginIntent)) {
    (invalidateLoginIntent(),
      initLogin(),
      stopQrStateRefresh(),
      removeEl($("#login_selection_div")));
    for (var t = $$("#pwd_login_div"), i = 0; i < t.length; i++) removeEl(t[i]);
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
      var n = makeEl("div", {
        id: "login_selection_div",
        style: "text-align:center",
      });
      return (
        ui.container.appendChild(n),
        n.appendChild(makeEl("h3", { html: "登录酷我音乐" })),
        n.appendChild(
          makeButton("QQ登录", function () {
            (hideLogin(), (state.loginApp = "kuwo_qq"), unhideLogin());
          }),
        ),
        void n.appendChild(
          makeButton("密码登录", function () {
            (hideLogin(), (state.loginApp = "kuwo_pwd"), unhideLogin());
          }),
        )
      );
    }
    var a =
      "speaker" === state.loginMode && "qqmusic" === state.loginApp
        ? "音箱尚未登录，本次将使用手机QQ扫码登录音箱账号，是否继续？"
        : {
            qqmusic: "本次登录将会使用QQ互联登录您的QQ音乐账号，是否继续？",
            netease: "本次登录将会使用QQ互联登录您的网易云音乐账号，是否继续？",
            kuwo_qq: "本次登录将会使用QQ互联登录您的酷我音乐账号，是否继续？",
            kuwo_pwd: "本次将会登录您的酷我音乐账号，是否继续？",
          }[state.loginApp];
    if (a) {
      e && (a = e + "\n\n" + a);
      var o = {
        app: state.loginApp,
        mode: state.loginMode,
        device: loginDeviceKey(),
        dialog: null,
      };
      state.loginIntent = o;
      var s = showAppConfirm(
        a,
        function () {
          if (loginIntentCurrent(o)) {
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
            loginIntentCurrent(o) &&
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
      state.loginIntent === o && (o.dialog = s);
    }
  }
}
function buildPasswordLogin() {
  var e = makeEl("div", { id: "pwd_login_div" });
  (e.appendChild(ui.qrcodeMessage), e.appendChild(makeEl("div")));
  var t = makeEl("div");
  (e.appendChild(t),
    e.appendChild(ui.qrcode),
    ui.container.appendChild(e),
    (ui.qrcodeMessage.innerHTML = "<h3>登录酷我音乐</h3><h3></h3>"),
    t.appendChild(makeText("账号：")));
  var i = makeEl("input", { type: "text", id: "username", className: "input" });
  (t.appendChild(i),
    t.appendChild(makeEl("div")),
    t.appendChild(makeText("密码：")));
  var n = makeEl("input", {
    type: "password",
    id: "password",
    className: "input",
  });
  (t.appendChild(n),
    t.appendChild(makeEl("div")),
    t.appendChild(
      makeButton(
        "登录",
        function () {
          var e = state.loginSession;
          loginSessionCurrent(e) &&
            loginConnected() &&
            ((this.disabled = !0),
            (this.value = "登录中。。。"),
            queueLoginRequest(
              e,
              { type: "login_kuwo", username: i.value, password: n.value },
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
function loginSessionCurrent(e) {
  return (
    !!e &&
    e === state.loginSession &&
    e.app === state.loginApp &&
    e.device === loginDeviceKey()
  );
}
function loginIntentCurrent(e) {
  return (
    !!e &&
    e === state.loginIntent &&
    e.app === state.loginApp &&
    e.mode === state.loginMode &&
    e.device === loginDeviceKey()
  );
}
function loginFlowActive() {
  return (
    loginIntentCurrent(state.loginIntent) ||
    loginSessionCurrent(state.loginSession)
  );
}
function invalidateLoginIntent() {
  var e = state.loginIntent;
  ((state.loginIntent = null), e && e.dialog && e.dialog.close(!0));
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
      var e = ["qrcode_state", "qrcode_data", "qrcode_app", "qrcode_cache"],
        t = 0;
      t < e.length;
      t++
    )
      localStorage.removeItem(e[t]);
  } catch (e) {}
}
function setLoginMessage(e, t) {
  if (ui.qrcodeMessage) {
    var i = ui.qrcodeMessage.getElementsByTagName("h3");
    i[null == t ? 1 : t] && (i[null == t ? 1 : t].innerText = e);
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
  var e = state.loginSession;
  (e &&
    e.restartPending &&
    ((state.loginRecoveryDevice = e.device),
    (e.restartPending = !1),
    recoverLoginService()),
    clearLoginTimers(),
    (state.loginSession = null),
    (state.qrLoaded = !1),
    ui.qrcode &&
      ((ui.qrcode.onload = null),
      (ui.qrcode.onerror = null),
      (ui.qrcode.qrsig = "")),
    ui.loginPanel && (ui.loginPanel.style.display = "none"),
    removeEl($("#login_selection_div")));
  for (var t = $$("#pwd_login_div"), i = 0; i < t.length; i++) removeEl(t[i]);
  ui.switchButtons && (ui.switchButtons.style.display = "");
}
function loadQrcode() {
  var e = { qqmusic: 100497308, netease: 100495085, kuwo_qq: 100243533 };
  state.loginParams.pt_3rd_aid = e[state.loginApp] || e.qqmusic;
  var t = null;
  try {
    t = JSON.parse(localStorage.getItem("qrcode_cache"));
  } catch (e) {}
  (clearQrCache(),
    t &&
    t.app === state.loginApp &&
    t.device === loginDeviceKey() &&
    "number" == typeof t.time &&
    Date.now() >= t.time &&
    Date.now() - t.time < 12e4 &&
    validQrData(t.data)
      ? (beginQrSession(), updateQrCodeData(t.data, t.time))
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
    (!loginSessionCurrent(state.loginSession) ||
      "done" !== state.loginSession.stage) &&
    ui.qrcode &&
    ui.loginPanel &&
    "none" !== ui.loginPanel.style.display
  ) {
    clearQrCache();
    var e = { qqmusic: 100497308, netease: 100495085, kuwo_qq: 100243533 };
    ((state.loginParams.pt_3rd_aid = e[state.loginApp] || e.qqmusic),
      beginQrSession(),
      requestQrcode(state.loginSession));
  }
}
function requestQrcode(e) {
  loginSessionCurrent(e) &&
    (loginConnected()
      ? ((e.stage = "loading"),
        clearTimeout(timers.qrLoad),
        (timers.qrLoad = setTimeout(function () {
          loginSessionCurrent(e) &&
            "loading" === e.stage &&
            ((e.stage = "error"),
            clearQrCache(),
            setLoginMessage(
              "二维码加载超时，请点击刷新二维码！音箱时间：" +
                (state.deviceDate
                  ? formatUnixTime(
                      parseInt(state.deviceDate.getTime() / 1e3, 10),
                    )
                  : ""),
              0,
            ));
        }, 3e4)),
        sendToUnisound({ type: "get_qrcode", login_param: state.loginParams }))
      : setLoginMessage("连接已断开，恢复连接后将重新获取二维码", 0));
}
function validQrData(e) {
  return !!(
    e &&
    "string" == typeof e.image &&
    e.image &&
    e.cookies &&
    "string" == typeof e.cookies.qrsig &&
    e.cookies.qrsig
  );
}
function loginReplyMatches(e, t) {
  if (!loginSessionCurrent(t) || !e) return !1;
  if (e.qrcode_app && e.qrcode_app !== t.app) return !1;
  if (e.login_param && e.login_param.pt_3rd_aid != state.loginParams.pt_3rd_aid)
    return !1;
  var i = e.qrsig || (e.cookies && e.cookies.qrsig);
  return !i || !ui.qrcode.qrsig || i === ui.qrcode.qrsig;
}
function startQrStateRefresh() {
  stopQrStateRefresh();
  var e = state.loginSession;
  if (
    loginSessionCurrent(e) &&
    "polling" === e.stage &&
    ui.qrcode.qrsig &&
    loginConnected()
  ) {
    setLoginMessage("等待二维码状态返回。。。");
    var t = function () {
      if (loginSessionCurrent(e) && "polling" === e.stage && loginConnected()) {
        var t = state.qrUpdateTime < 0 ? e.pollStarted : state.qrUpdateTime;
        (Date.now() - t >= 15e3 &&
          setLoginMessage("二维码状态暂未返回，正在重试；可点击刷新二维码"),
          (state.qrLastUpdateTime = Date.now()),
          sendToUnisound({
            type: "qrcode_state",
            qrsig: ui.qrcode.qrsig,
            login_param: state.loginParams,
          }));
      }
    };
    (t(), (timers.qrState = setInterval(t, 2e3)));
  }
}
function stopQrStateRefresh() {
  (clearInterval(timers.qrState), (timers.qrState = -1));
}
function updateQrCodeData(e, t) {
  var i = state.loginSession;
  if (
    loginSessionCurrent(i) &&
    "loading" === i.stage &&
    loginReplyMatches(e, i)
  )
    if (validQrData(e)) {
      (clearTimeout(timers.qrLoad),
        (timers.qrLoad = -1),
        (i.stage = "polling"),
        (i.pollStarted = Date.now()),
        (state.qrState = 0),
        (state.qrLoaded = !0),
        (ui.qrcode.style.cssText = "margin:10px auto;position:relative"),
        (ui.qrcode.qrsig = e.cookies.qrsig),
        (ui.qrcode.onerror = function () {
          loginSessionCurrent(i) &&
            "polling" === i.stage &&
            setLoginMessage("二维码图片加载失败，请点击刷新二维码", 0);
        }),
        setLoginMessage(
          "请使用手机QQ扫码" +
            ("speaker" === state.loginMode ? "登录音箱账号！" : "登录！"),
          0,
        ),
        (ui.qrcode.src = e.image));
      try {
        localStorage.setItem(
          "qrcode_cache",
          JSON.stringify({
            app: i.app,
            device: i.device,
            time: t || Date.now(),
            data: e,
          }),
        );
      } catch (e) {}
      startQrStateRefresh();
    } else setLoginMessage("二维码返回数据异常，请刷新二维码", 0);
}
function queueLoginRequest(e, t, i) {
  loginSessionCurrent(e) &&
    ((e.request = t),
    (e.nextStage = i),
    (e.stage = "pending"),
    clearTimeout(timers.login),
    (timers.login = setTimeout(function () {
      flushLoginRequest(e);
    }, 1e3)));
}
function flushLoginRequest(e) {
  if (loginSessionCurrent(e) && "pending" === e.stage && e.request)
    if (loginConnected()) {
      var t = e.request;
      ((e.request = null),
        (e.stage = e.nextStage),
        setLoginMessage(
          "submit" === e.stage
            ? "正在提交登录数据。。。"
            : "正在登录，请稍候。。。",
        ),
        sendToUnisound(t),
        watchLoginResult(e));
    } else setLoginMessage("连接已断开，恢复连接后继续提交登录");
}
function watchLoginResult(e) {
  (clearTimeout(timers.loginResult),
    (timers.loginResult = setTimeout(function () {
      !loginSessionCurrent(e) ||
        ("auth" !== e.stage && "submit" !== e.stage) ||
        ("kuwo_pwd" !== e.app
          ? setLoginMessage(
              "登录结果暂未返回，请等待；若长时间无响应，请刷新二维码后重试",
            )
          : loginFailed(e, "登录结果暂未返回，可手动重试密码登录"));
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
    runShell(
      "/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity",
    ));
}
function resumeLoginConnection() {
  recoverLoginService();
  var e = state.loginSession;
  return (
    !!loginSessionCurrent(e) &&
    (setPageTitle("R1音箱登录页面"),
    "loading" === e.stage
      ? requestQrcode(e)
      : "polling" === e.stage
        ? startQrStateRefresh()
        : "pending" === e.stage
          ? flushLoginRequest(e)
          : "done" === e.stage
            ? "music" === state.loginMode && "qqmusic" !== e.app
              ? restartMusicLogin(e)
              : sendToUnisound({ type: "login_state" })
            : ("auth" !== e.stage && "submit" !== e.stage) ||
              (setLoginMessage(
                "连接已恢复，等待登录结果；如无响应请刷新二维码重试",
              ),
              sendToUnisound({ type: "login_state" }),
              watchLoginResult(e)),
    !0)
  );
}
function updateQrState(e) {
  var t = state.loginSession;
  if (
    loginSessionCurrent(t) &&
    "polling" === t.stage &&
    loginReplyMatches(e, t)
  ) {
    var i = e && e.qrcode_state,
      n = i && i[i.call];
    if (i && Array.isArray(n) && null != i.code) {
      state.qrUpdateTime = Date.now();
      var a = n[4] || "";
      if (66 != i.code && 67 != i.code && 0 != i.code)
        return (
          stopQrStateRefresh(),
          (t.stage = "error"),
          (state.qrLoaded = !1),
          clearQrCache(),
          void setLoginMessage(a || "二维码已失效，请刷新二维码")
        );
      if (0 == i.code) {
        var o = i.location && i.location.cookies;
        if (!o || "string" != typeof o.p_uin)
          return void setLoginMessage("扫码结果缺少账号信息，正在重新查询");
        (stopQrStateRefresh(), (state.qrState = 1), clearQrCache());
        var s = parseQQNumber(o.p_uin);
        (setLoginMessage("扫码登录QQ：" + (n[5] || "") + "(" + s + ")", 0),
          (ui.qrcode.onerror = null),
          (ui.qrcode.style.cssText =
            "margin:10px auto;position:relative;border-radius:100%;height:120px"),
          (ui.qrcode.src =
            "https://q1.qlogo.cn/g?b=qq&nk=" +
            encodeURIComponent(s) +
            "&s=100"));
        (queueLoginRequest(
          t,
          {
            type: {
              qqmusic: "login",
              netease: "login_netease_music",
              kuwo_qq: "login_kuwo_music",
            }[t.app],
            qrcode_state: i,
          },
          "auth",
        ),
          (a = "正在查询用户信息，请稍候。。。"));
      }
      setLoginMessage(a);
    }
  }
}
function parseQQNumber(e) {
  e = e.substr(1);
  for (var t = 0; t < e.length; t++) if (0 != e[t]) return e.substr(t);
  return e;
}
function loginFailed(e, t) {
  if (loginSessionCurrent(e)) {
    (clearLoginTimers(),
      clearQrCache(),
      (e.stage = "kuwo_pwd" === e.app ? "password" : "error"),
      (e.request = null));
    var i = $("#pwd_login_btn");
    ("kuwo_pwd" === e.app && i && ((i.disabled = !1), (i.value = "登录")),
      (state.qrLoaded = !1),
      setLoginMessage(t));
  }
}
function handleQQLogin(e) {
  var t = state.loginSession;
  loginSessionCurrent(t) &&
    "qqmusic" === t.app &&
    "auth" === t.stage &&
    (clearTimeout(timers.loginResult),
    1 == e.code && 1 == e.login_state
      ? ((t.stage = "done"),
        clearQrCache(),
        sendToUnisound({ type: "login_state" }),
        showAppAlert("登录成功,欢迎" + e.nick + "[" + e.userid + "]"))
      : loginFailed(
          t,
          e.login_msg || e.msg || "音箱账号登录失败，请刷新二维码后重试",
        ));
}
function finishMusicLogin(e, t) {
  loginSessionCurrent(e) &&
    "submit" === e.stage &&
    (clearTimeout(timers.loginResult),
    200 == t.code
      ? ((e.stage = "done"),
        (e.restartPending = !0),
        clearQrCache(),
        setLoginMessage("数据已提交，正在重启小讯。。。"),
        runShell("/system/bin/am force-stop com.phicomm.speaker.device"),
        (timers.login = setTimeout(function () {
          restartMusicLogin(e);
        }, 3e3)))
      : loginFailed(e, "数据提交失败！" + (t.msg || "请刷新二维码后重试")));
}
function restartMusicLogin(e) {
  loginSessionCurrent(e) &&
    "done" === e.stage &&
    loginConnected() &&
    (e.restartPending &&
      ((e.restartPending = !1),
      runShell(
        "/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity",
      ),
      sendAction(
        65536,
        3,
        0,
        '{"type":"login_state","code":1,"login_state":"0"}',
      )),
    (timers.login = setTimeout(function () {
      loginSessionCurrent(e) && location.reload();
    }, 1e3)));
}
function handleNeteaseLogin(e, t) {
  var i = state.loginSession;
  if (loginSessionCurrent(i) && "netease" === i.app)
    if (1 !== t) {
      if ("auth" === i.stage)
        if (
          (clearTimeout(timers.loginResult),
          1 == e.code && e.data && 200 == e.data.code && e.data.profile)
        ) {
          var n = e.data.profile;
          (n.avatarUrl && (ui.qrcode.src = n.avatarUrl),
            setLoginMessage(
              "网易云音乐登录成功！用户：" +
                n.nickname +
                "[" +
                n.userId +
                "]，正在提交登录数据。。。",
            ),
            queueLoginRequest(
              i,
              {
                type: "api",
                data: { type: "login_netease_music", data: e.data },
              },
              "submit",
            ));
        } else
          loginFailed(
            i,
            "网易云音乐登录失败！" + (e.msg || "请刷新二维码后重试"),
          );
    } else finishMusicLogin(i, e);
}
function handleKuwoLogin(e, t) {
  var i = state.loginSession;
  if (loginSessionCurrent(i) && ("kuwo_qq" === i.app || "kuwo_pwd" === i.app))
    if (1 !== t) {
      if ("auth" === i.stage)
        if (
          (clearTimeout(timers.loginResult),
          1 == e.code && e.data && "succ" === e.data.result && e.data.userInfo)
        ) {
          var n = e.data.userInfo;
          (n.pic && (ui.qrcode.src = n.pic),
            setLoginMessage(
              "酷我音乐登录成功！用户：" +
                n.nickName +
                "[" +
                n.uid +
                "]，正在提交登录数据。。。",
            ),
            queueLoginRequest(
              i,
              { type: "api", data: { type: "login_kuwo_music", data: e.data } },
              "submit",
            ));
        } else loginFailed(i, "酷我音乐登录失败！" + (e.msg || "请重试"));
    } else finishMusicLogin(i, e);
}
function unisoundNoticeCurrent(e, t) {
  return (
    !!e &&
    e === ui.flowNotice &&
    !!e.host.parentNode &&
    t === state.ws &&
    loginConnected()
  );
}
function readDeviceInfoResponse(e) {
  if (!e || "get_info" !== e.type || 200 !== e.code) return null;
  var t;
  try {
    t = JSON.parse(e.data);
  } catch (e) {
    return null;
  }
  return t && "object" == typeof t && !Array.isArray(t) ? t : null;
}
function checkUnisoundSkip(e, t, i) {
  if (!(
    !unisoundNoticeCurrent(e, t) ||
    (state.unisoundSkipCheck && state.unisoundSkipCheck.pending)
  )) {
    (clearTimeout(timers.loginState),
      clearTimeout(timers.unisoundInitBackup),
      (timers.loginState = timers.unisoundInitBackup = -1));
    var n = e.panel.offsetWidth;
    (n > 0 &&
      e.panel.parentNode.style.setProperty("width", n + "px", "important"),
      (i.disabled = !0),
      (i.value = "跳过等待"),
      (e.message.textContent =
        "已发送跳过指令，等待音箱同步状态后检查，请稍候。"),
      (state.unisoundSkipSequence = (state.unisoundSkipSequence || 0) + 1));
    var a = (state.unisoundSkipCheck = {
      notice: e,
      socket: t,
      button: i,
      pending: !0,
      id: "unisound_skip_" + Date.now() + "_" + state.unisoundSkipSequence,
    });
    a.timer = setTimeout(function () {
      ((a.timer = null),
        state.unisoundSkipCheck === a &&
          unisoundNoticeCurrent(e, t) &&
          ((e.message.textContent = "正在检查音箱初始化状态，请稍候。"),
          sendWs(
            { type: "get_info", type_id: a.id },
            function (n) {
              if (
                state.unisoundSkipCheck === a &&
                unisoundNoticeCurrent(e, t)
              ) {
                if (
                  ((a.pending = !1),
                  !(n && n.type_id === a.id ? readDeviceInfoResponse(n) : null))
                )
                  return (
                    (i.disabled = !1),
                    (i.value = "重试跳过"),
                    void (e.message.textContent =
                      n && "login_state" === n.type
                        ? "音箱仍未通过初始化，请稍候或重试跳过。"
                        : "检查初始化状态失败，请重试跳过。")
                  );
                ((state.unisoundSkipCheck = null),
                  (state.reload = !1),
                  clearFlowNotice("unisound"),
                  handleMessage(n),
                  state.initState || state.initState1 || startInfoRefresh());
              }
            },
            6e3,
          )));
    }, 1e3);
  }
}
function handleLoginState(e) {
  if (
    (clearTimeout(timers.loginState), (timers.loginState = -1), 1 == e.code)
  ) {
    var t = state.unisoundSkipCheck;
    if (
      !t ||
      !unisoundNoticeCurrent(t.notice, t.socket) ||
      (0 != e.login_state && 1 != e.login_state)
    ) {
      1 == e.login_state && clearFlowNotice("unisound");
      var i = state.loginSession;
      if (loginSessionCurrent(i) && "music" === state.loginMode)
        "qqmusic" === i.app &&
          "done" === i.stage &&
          1 == e.login_state &&
          (hideLogin(), clearQrCache(), location.reload());
      else if (!loginFlowActive() || 1 == e.login_state)
        if (0 == e.login_state) {
          (clearTimeout(timers.unisoundInit),
            (timers.unisoundInit = -1),
            runShell(
              "/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity",
            ));
          var n = showFlowNotice(
              "unisound",
              "小讯初始化",
              "等待小讯初始化。。。(请确保您当前安装的new_Unisound版本是1.8或以上！)",
            ),
            a = state.ws;
          if (
            ((n.phase = "initializing"),
            (n.socket = a),
            !n.actions.querySelector("#Skip_Waiting"))
          ) {
            var o = makeFlowButton("跳过等待", function () {
              unisoundNoticeCurrent(n, a) &&
                !this.disabled &&
                (sendAction(
                  65536,
                  3,
                  0,
                  '{"type":"login_state","code":1,"login_state":"1"}',
                ),
                checkUnisoundSkip(n, a, this));
            });
            ((o.id = "Skip_Waiting"),
              (o.style.background = "var(--primary-blue)"),
              n.actions.appendChild(o));
          }
          ((timers.loginState = setTimeout(function () {
            unisoundNoticeCurrent(n, a) && sendWs({ type: "get_info" });
          }, 1e3)),
            -1 === timers.unisoundInitBackup &&
              (timers.unisoundInitBackup = setTimeout(function () {
                unisoundNoticeCurrent(n, a) &&
                  ((state.reload = !0), addRecoveryButtons(n.actions));
              }, 6e3)));
        } else if (1 == e.login_state) {
          var s = !state.initState;
          if ((i && 1 === state.qrState && clearQrCache(), hideLogin(), s))
            return void location.reload();
          (unhideIndex(), sendWs({ type: "get_info" }));
        } else if (-4 == e.login_state) {
          (clearTimeout(timers.unisoundInit),
            clearTimeout(timers.unisoundInitBackup),
            (timers.unisoundInit = -1),
            (timers.unisoundInitBackup = -1));
          var r = updatePingStatus(e),
            l = state.ws;
          ((timers.loginState = setTimeout(function () {
            unisoundNoticeCurrent(r, l) &&
              sendToUnisound({ type: "login_state" });
          }, 1e3)),
            addRtimeButton(r.actions));
        } else {
          if (
            (clearTimeout(timers.unisoundInit),
            clearTimeout(timers.unisoundInitBackup),
            (timers.unisoundInit = -1),
            (timers.unisoundInitBackup = -1),
            String(e.login_msg || "").indexOf("授权") > -1)
          )
            return void addRecoveryButtons(
              showFlowNotice("unisound", "小讯授权失败", e.login_msg).actions,
              !0,
            );
          if (loginSessionCurrent(i)) return;
          (clearFlowNotice("unisound"),
            (state.loginMode = "speaker"),
            (state.loginApp = "qqmusic"),
            unhideLogin(e.login_msg));
        }
    }
  }
}
function updatePingStatus(e) {
  var t = String(state.pingTime).substring(0, 10),
    i =
      1 == state.pingResult
        ? "成功(" + t + ")"
        : 0 == state.pingResult
          ? "失败(" + t + ")"
          : "等待(" + t + ")",
    n = state.deviceDate
      ? formatUnixTime(parseInt(state.deviceDate.getTime() / 1e3, 10))
      : "",
    a = showFlowNotice(
      "unisound",
      "音箱时间校准",
      (e.login_msg || "请校准音箱时间") +
        "\n音箱时间：" +
        n +
        "\n测试PING授权服务器：" +
        i,
    );
  return (
    runShell("date & ping -w 1 r1service.wxfsq.com", "ping_r1service"),
    a
  );
}
function addRtimeButton(e) {
  var t = ui.flowNotice,
    i = state.ws;
  unisoundNoticeCurrent(t, i) &&
    e === t.actions &&
    !e.querySelector("#rtime") &&
    e.appendChild(
      makeFlowButton(
        "校准音箱时间",
        function () {
          if (unisoundNoticeCurrent(t, i)) {
            var n = this;
            ((n.value = "正在校准。。。"),
              setTimeout(function () {
                unisoundNoticeCurrent(t, i) &&
                  n.parentNode === e &&
                  (n.value = "校准音箱时间");
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
function addRecoveryButtons(e, t) {
  var i = ui.flowNotice,
    n = state.ws;
  unisoundNoticeCurrent(i, n) &&
    e === i.actions &&
    (t && (i.recoveryLoginState = !0),
    e.querySelector("#unisound_restart") ||
      e.appendChild(
        makeFlowButton(
          "重启小讯",
          function () {
            if (unisoundNoticeCurrent(i, n)) {
              ((state.unisoundSkipCheck = null), (this.value = "重启中。。。"));
              var e = showFlowNotice("unisound", "重启小讯", "重启中。。。");
              (runShell("/system/bin/am force-stop com.phicomm.speaker.device"),
                setTimeout(function () {
                  n === state.ws &&
                    loginConnected() &&
                    (runShell(
                      "/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity",
                    ),
                    unisoundNoticeCurrent(e, n) &&
                      (i.recoveryLoginState &&
                        sendAction(
                          65536,
                          3,
                          0,
                          '{"type":"login_state","code":1,"login_state":"0"}',
                        ),
                      setTimeout(function () {
                        unisoundNoticeCurrent(e, n) &&
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
    e.querySelector("#speaker_restart") ||
      e.appendChild(
        makeFlowButton(
          "重启音箱",
          function () {
            if (unisoundNoticeCurrent(i, n)) {
              this.value = "重启中。。。";
              var e = showFlowNotice("unisound", "重启音箱", "重启中。。。");
              (runShell("stop adbd&&start adbd&&adb reboot"),
                setTimeout(function () {
                  unisoundNoticeCurrent(e, n) &&
                    (showAppAlert("重启完毕！"), location.reload());
                }, 1e4));
            }
          },
          { id: "speaker_restart" },
        ),
      ),
    addRtimeButton(e));
}
function handleUnisoundMessage(e) {
  var t;
  try {
    t = JSON.parse(e.data.data);
  } catch (e) {
    return;
  }
  if (t) {
    var i = t.type;
    if ("get_qrcode" !== i)
      if ("qrcode_state" !== i)
        if ("login" !== i)
          if ("login_netease_music" !== i)
            if ("login_kuwo_music" !== i)
              if ("api" !== i) {
                if ("login_kuwo" === i) {
                  var n = state.loginSession,
                    a = $("#pwd_login_btn");
                  if (
                    !a ||
                    !loginSessionCurrent(n) ||
                    "kuwo_pwd" !== n.app ||
                    "auth" !== n.stage
                  )
                    return;
                  return 1 == t.code && t.data && "succ" === t.data.result
                    ? void handleKuwoLogin(t, 0)
                    : (clearTimeout(timers.loginResult),
                      (n.stage = "password"),
                      (a.disabled = !1),
                      (a.value = "登录"),
                      void setLoginMessage(
                        t.msg ||
                          (t.data && t.data.msg) ||
                          "酷我音乐登录失败，请重试",
                      ));
                }
                if (1 == t.code || 2 == t.code)
                  if (((state.tests = t), "login_state" !== i)) {
                    if ("exit_login" === i)
                      return (
                        hideLogin(),
                        clearQrCache(),
                        showAppAlert("已退出登录！"),
                        void location.reload()
                      );
                    if (
                      "get_memo" !== i &&
                      "add_memo" !== i &&
                      "update_memo" !== i &&
                      "del_memo" !== i &&
                      "delall_memo" !== i
                    )
                      if (
                        "Main_Wakeup_Benchmark" !== i &&
                        "User_Wakeup_Benchmark" !== i
                      )
                        if ("get_info" !== i)
                          if ("asrMaxDuration" !== i) {
                            if ("Voice_time_reporting" !== i)
                              return "set_Time_reporting" === i ||
                                "set_Whole_point_prompt" === i ||
                                "set_Half_dot_prompt" === i
                                ? (requestVoiceTimeReporting(),
                                  void (
                                    ("set_Whole_point_prompt" !== i &&
                                      "set_Half_dot_prompt" !== i) ||
                                    showAppAlert("已保存！")
                                  ))
                                : void (
                                    "Submit_Play_Record" !== i &&
                                    "is_xiaoai" !== i &&
                                    setTimeout(function () {
                                      sendToUnisound({ type: "get_info" });
                                    }, 500)
                                  );
                            createVoiceTimeReportingPanel(t);
                          } else updateAsrMaxDuration(t);
                        else updateUnisoundInfo(t);
                      else updateWakeupBenchmark(t);
                    else handleMemoInfo(t);
                  } else handleLoginState(t);
              } else
                void 0 === t.data
                  ? handleApiResponse(t, 0)
                  : "object" != typeof t.data
                    ? handleApiResponse(t, 1)
                    : handleApiResponse(t, 2);
            else handleKuwoLogin(t, 0);
          else handleNeteaseLogin(t, 0);
        else handleQQLogin(t);
      else updateQrState(t.data);
    else
      1 == t.code || 2 == t.code
        ? updateQrCodeData(t.data)
        : loginSessionCurrent(state.loginSession) &&
          "loading" === state.loginSession.stage &&
          loginFailed(
            state.loginSession,
            t.msg || "二维码获取失败，请刷新二维码",
          );
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
function updateUnisoundInfo(e) {
  if (1 == e.code && ((state.unisoundInfo = e.data), state.isNewUnisound)) {
    var t = e.data;
    if (
      (ui.dormancyBtn && (ui.dormancyBtn.style.display = ""),
      ui.wakeupBtn && (ui.wakeupBtn.style.display = ""),
      ui.wakeupBtn &&
        (t.isIdle
          ? ((ui.wakeupBtn.wakeupState = 0),
            (ui.wakeupBtn.value = "当前：已禁用麦克风"),
            (ui.wakeupBtn.style.backgroundColor = "rgba(238,0,0,1)"))
          : ((ui.wakeupBtn.wakeupState = 1),
            (ui.wakeupBtn.value = "当前：已启用麦克风"),
            (ui.wakeupBtn.style.backgroundColor = ""))),
      ui.dormancyBtn &&
        (isUnisoundVer(1849)
          ? 5 == t.DeviceStatus
            ? ((ui.dormancyBtn.value = "退出休眠"),
              (ui.dormancyBtn.dormancyState = 1),
              (ui.dormancyBtn.style.backgroundColor = "rgba(238,0,0,1)"),
              ui.wakeupBtn &&
                ((ui.wakeupBtn.disabled = !0),
                (ui.wakeupBtn.style.backgroundColor = "")))
            : ((ui.dormancyBtn.value = "开始休眠"),
              (ui.dormancyBtn.dormancyState = 0),
              (ui.dormancyBtn.style.backgroundColor = ""),
              ui.wakeupBtn && (ui.wakeupBtn.disabled = !1))
          : ((ui.dormancyBtn.value = t.isIdle ? "退出休眠" : "开始休眠"),
            (ui.dormancyBtn.dormancyState = t.isIdle ? 1 : 0))),
      ui.submitRecordBtn &&
        ((ui.submitRecordBtn.style.display = ""),
        (ui.submitRecordBtn.value = t.Submit_Play_Record
          ? "点击关闭提交播放记录"
          : "点击打开提交播放记录"),
        (ui.submitRecordBtn.recordState = t.Submit_Play_Record ? 1 : 0)),
      ui.btToneBtn &&
        ((ui.btToneBtn.style.display = ""),
        (ui.btToneBtn.value = t.Bluetooth_prompt_tone
          ? "点击关闭蓝牙提示音"
          : "点击打开蓝牙提示音"),
        (ui.btToneBtn.toneState = t.Bluetooth_prompt_tone ? 1 : 0)),
      isUnisoundVer(1848) && state.unisoundInfo.Wakeup_Benchmark)
    ) {
      var i = {};
      for (var n in state.unisoundInfo.Wakeup_Benchmark)
        i[n] = state.unisoundInfo.Wakeup_Benchmark[n];
      ((i.code = 1), updateWakeupBenchmark(i));
    } else if (state.unisoundInfo.Main_Wakeup_Benchmark) {
      var a = {};
      for (var o in state.unisoundInfo.Main_Wakeup_Benchmark)
        a[o] = state.unisoundInfo.Main_Wakeup_Benchmark[o];
      ((a.code = 1), updateWakeupBenchmark(a));
    }
    if (state.unisoundInfo.asrMaxDuration) {
      var s = {};
      for (var r in state.unisoundInfo.asrMaxDuration)
        s[r] = state.unisoundInfo.asrMaxDuration[r];
      ((s.code = 1), updateAsrMaxDuration(s));
    }
    updateButtonVisibility();
  }
}
function updateWakeupBenchmark(e) {
  if (1 == e.code) {
    var t = ui.wakeupBenchmark;
    t &&
      (isUnisoundVer(1848) && state.isNewUnisound
        ? ((t.disabled = !1),
          (t.min = 0),
          (t.max = 100 * (t.maxValue / 100 - e.Default_Main_WakeupBenchmark)),
          (t.value = t.max - 100 * parseFloat(e.User_WakeupBenchmark)))
        : isUnisoundVer(1822) &&
          state.isNewUnisound &&
          ((t.disabled = !1),
          (t.min = 100 * parseFloat(e.Default_Main_WakeupBenchmark)),
          (t.max = t.maxValue),
          (t.value = t.max - 100 * parseFloat(e.Main_WakeupBenchmark))));
  }
}
function updateAsrMaxDuration(e) {
  if (1 == e.code && isUnisoundVer(1822) && state.isNewUnisound) {
    var t = ui.asrMaxDuration,
      i = ui.asrMaxDurationLabel;
    t &&
      ((t.disabled = !1),
      (t.max = parseInt(e.Default_asrMaxDuration, 10) / 1e3),
      (t.value = parseInt(e.asrMaxDuration, 10) / 1e3),
      i && (i.innerHTML = parseInt(e.asrMaxDuration, 10) / 1e3 + "秒"));
  }
}
function handleApiResponse(e, t) {
  if (e)
    if (1 == e.login_state) {
      var i;
      try {
        if (1 === t) {
          var n = JSON.parse(e.data);
          i = n && (n.nameValuePairs || n);
        } else 2 === t && (i = e.data);
      } catch (e) {
        return;
      }
      i &&
        ("info" === i.type
          ? ((state.deviceInfoCache.api_info = i), loadDeviceInfo())
          : "login_netease_music" === i.type
            ? handleNeteaseLogin(i, 1)
            : "collect" === i.type || "cancel_collect" === i.type
              ? showAppAlert(i.msg)
              : "get_song_list" === i.type
                ? handleSongListResponse(i)
                : "login_kuwo_music" === i.type && handleKuwoLogin(i, 1));
    } else {
      var a = state.loginSession;
      loginSessionCurrent(a) &&
        "submit" === a.stage &&
        loginFailed(
          a,
          "数据提交失败！" + (e.login_msg || e.msg || "音箱账号未登录"),
        );
      var o = $("#user_info_text");
      o && (o.innerHTML = e.login_msg + "(" + e.login_state + ")");
    }
}
var songListSession = null,
  songListGeneration = 0,
  songListRequest = null,
  songListAmbiguousSocket = null;
function songListSessionCurrent(e) {
  return (
    !!e &&
    e === songListSession &&
    e.generation === songListGeneration &&
    e.socket === state.ws &&
    e.source === state.info.music_source &&
    e.dlg.isOpen()
  );
}
function requestSongList(e) {
  if (songListSessionCurrent(e))
    if (
      (songListRequest &&
        songListRequest.socket !== state.ws &&
        (clearTimeout(songListRequest.timer), (songListRequest = null)),
      songListRequest)
    )
      e.waiting = !0;
    else {
      e.waiting = !1;
      var t = { session: e, socket: state.ws, source: e.source, timer: null };
      ((songListRequest = t),
        (t.timer = setTimeout(function () {
          if (songListRequest === t) {
            ((songListRequest = null),
              (songListAmbiguousSocket = t.socket),
              songListSessionCurrent(t.session) &&
                (t.session.dlg.title.innerHTML =
                  "获取歌单超时，请重新打开重试"));
            var e = songListSession;
            songListSessionCurrent(e) && e.waiting && requestSongList(e);
          }
        }, 1e4)),
        sendToUnisound({
          type: "api",
          data: { type: "get_song_list", music_source: e.source },
        }));
    }
}
function handleSongListResponse(e) {
  var t = songListRequest;
  (t && (clearTimeout(t.timer), (songListRequest = null)),
    (t && t.socket !== state.ws) ||
      (state.tempSongList || (state.tempSongList = {}),
      (state.tempSongList.music_source = t
        ? t.source
        : state.info.music_source),
      200 == e.code
        ? ((state.tempSongList.time = Date.now()),
          (state.tempSongList.data = e))
        : (state.tempSongList.time = -1)),
    t &&
      songListAmbiguousSocket !== t.socket &&
      renderSongListWindow(e, t.session));
  var i = songListSession;
  songListSessionCurrent(i) && i.waiting && requestSongList(i);
}
function openSongListWindow(e) {
  if (songListSessionCurrent(songListSession))
    return (e && renderSongListWindow(e, songListSession), songListSession.dlg);
  var t = createDialogPanel("我的歌单", { noPadding: !0 }),
    i = {
      dlg: t,
      generation: ++songListGeneration,
      socket: state.ws,
      source: state.info.music_source,
      timer: null,
      waiting: !1,
    };
  ((songListSession = i),
    t.onClose(function () {
      (clearTimeout(i.timer),
        songListSession === i &&
          ((songListSession = null), songListGeneration++));
    }));
  var n = makeEl("div", {
    id: "song_list_div",
    class: "song_list_panel",
    style: "background:transparent;text-align:left;color:#fff",
  });
  ((n.onclick = function (e) {
    if (t.isOpen()) {
      clearTimeout(timers.listClick);
      for (
        var i = e.target;
        i && (!i.classList || !i.classList.contains("click"));
      )
        i = i.parentElement;
      if (i) {
        var n = i.getAttribute("data-id") || "",
          a = i.getAttribute("data-title") || "";
        n &&
          showAppConfirm("点播歌单[" + a + "]？", function () {
            (sendAction(65536, 0, 9, String(n)), t.close());
            var e = $("#btn_page_music");
            e && navigateToPage(e);
          });
      }
    }
  }),
    t.body.appendChild(n));
  var a = t.title;
  if (((a.id = "song_list_title"), (a.innerHTML = "正在加载歌单列表。。。"), e))
    renderSongListWindow(e, i);
  else {
    var o = state.tempSongList;
    o && o.time > 0 && Date.now() - o.time < 6e5 && o.music_source === i.source
      ? (i.timer = setTimeout(function () {
          renderSongListWindow(o.data, i);
        }, 200))
      : requestSongList(i);
  }
  return t;
}
function renderSongListWindow(e, t) {
  if (((t = t || songListSession), e && songListSessionCurrent(t))) {
    var i = t.dlg.body.querySelector("#song_list_div"),
      n = t.dlg.title;
    if (i)
      if (((i.innerHTML = ""), 200 == e.code)) {
        var a = e.data;
        n.innerHTML = a.title;
        for (var o = Object.keys(a.data), s = 0; s < o.length; s++) {
          var r = a.data[o[s]].list;
          (i.appendChild(makeDiv("height:5px")),
            i.appendChild(
              makeText(
                a.data[o[s]].title + "[" + r.length + "]",
                "font-size:16px;color:#fff;margin-left:5px;text-shadow:none",
              ),
            ),
            i.appendChild(makeDiv("height:5px")));
          for (var l = 0; l < r.length; l++) {
            var u = r[l],
              c = makeEl("div", {
                class: "click",
                style:
                  "background-color:rgba(255,255,255,0.15);color:#fff;border-bottom:1px solid rgba(255,255,255,0.1);padding:8px 12px;margin:0",
                "data-id": String(u.id || ""),
                "data-title": String(u.title || ""),
              });
            c.appendChild(
              makeEl("img", {
                src: u.pic,
                style:
                  "border-radius:10%;margin:0 10px 0 5px;height:66px;width:66px",
              }),
            );
            var d = makeEl("div", {
              style:
                "margin-right:5px;display:flex;justify-content:center;align-items:flex-start;flex-direction:column",
            });
            (c.appendChild(d),
              i.appendChild(c),
              d.appendChild(
                makeText(u.title, "font-size:16px;color:#fff;text-align:left"),
              ),
              d.appendChild(
                makeText(
                  u.content,
                  "font-size:12px;color:rgba(255,255,255,0.6);text-align:left",
                ),
              ));
          }
        }
      } else n.innerHTML = e.msg;
  }
}
function createMusicInfoWindow(e, t) {
  var i = e.music_info,
    n = {},
    a = createDialogPanel("", { noPadding: !0, stack: !(!t || !t.stack) }),
    o = a.header;
  ((o.style.justifyContent = "center"),
    o.removeChild(a.title),
    o.removeChild(a.closeBtn));
  var s = makeEl("img", {
    style: "border-radius:10%;height:66px;margin:0 12px 0 5px",
  });
  o.appendChild(s);
  var r = makeEl("div", {
    style:
      "margin:0;display:flex;justify-content:center;align-items:flex-start;flex-direction:column;word-break:break-all",
  });
  o.appendChild(r);
  var l = makeText(
      "正在获取歌曲信息，请稍候。。。",
      "font-size:16px;font-weight:bold;color:#fff;text-shadow:none",
    ),
    u = makeText(
      "",
      "font-size:12px;font-weight:bold;color:rgba(255,255,255,0.85);text-shadow:none",
    );
  (r.appendChild(l), r.appendChild(u));
  var c = a.body;
  (c.classList.add("dark_opts"), (c.style.maxHeight = "60vh"));
  var d = makeEl("tr", {
    class: "span1 app_dialog_close_option",
    style:
      "color:#fff;background-color:transparent;text-shadow:none;border-top:1px solid rgba(255,255,255,0.1)",
  });
  (d.appendChild(
    makeEl("span", { style: "color:#fff;text-shadow:none", html: "关闭" }),
  ),
    (d.onclick = function () {
      a.isOpen() && a.close();
    }),
    c.appendChild(d));
  var p = null,
    m = null;
  a.onClose(function () {
    (clearTimeout(p), m && "function" == typeof m.abort && m.abort());
  });
  var f = [
    {
      title: "播放歌曲",
      onclick: function () {
        a.isOpen() &&
          (state.playlist.playIndex != e.index
            ? (sendWs({ type: "play", index: e.index }), a.close())
            : a.close());
      },
    },
  ];
  (readUnisoundAvailable() &&
    state.isNewUnisound &&
    "local_" !== String(i.itemId).substring(0, 6) &&
    (0 == i.itemType || 1 == i.itemType) &&
    (f.push({
      title: "收藏歌曲",
      onclick: function () {
        readUnisoundAvailable() &&
          showAppConfirm(
            "确定要收藏[" + getTrackTitle(i) + "]吗？",
            function () {
              readUnisoundAvailable() &&
                (sendToUnisound({
                  type: "api",
                  data: { type: "collect", music_info: i },
                }),
                a.close());
            },
          );
      },
    }),
    f.push({
      title: "取消收藏",
      onclick: function () {
        readUnisoundAvailable() &&
          showAppConfirm(
            "确定要取消收藏[" + getTrackTitle(i) + "]吗？",
            function () {
              readUnisoundAvailable() &&
                (sendToUnisound({
                  type: "api",
                  data: { type: "cancel_collect", music_info: i },
                }),
                a.close());
            },
          );
      },
    })),
    f.push({
      title: "歌曲信息",
      onclick: function () {
        var e = ["歌曲名称：" + n.name, "歌手名称：" + n.artist],
          t = (n.id || "").split(","),
          i =
            {
              qq: "QQ音乐",
              netease: "网易云音乐",
              kuwo: "酷我音乐",
              kugou: "酷狗音乐",
              migu: "咪咕音乐",
            }[t[1]] || t[1];
        if (
          (e.push(
            '歌曲ID：<a style="color:#7ab8ff" target="_blank" href="' +
              n.link +
              '">' +
              t[0] +
              "</a>",
          ),
          e.push("歌曲来源：" + i),
          e.push("------歌词------"),
          "string" == typeof n.lrc)
        )
          for (
            var a = n.lrc.match(/(\[\d{1,3}:\d{1,2}.\d{1,3}\])(.*)/g) || [],
              o = 0;
            o < a.length;
            o++
          )
            e.push(a[o]);
        createTextWindow("歌曲信息", e.join("\r\n"));
      },
    }));
  var h = function (e) {
    if (a.isOpen() && e)
      if (1 == e.code || e === i) {
        (1 == e.code ? (n = e.data) : f.pop(),
          e.data || (e.data = {}),
          (l.innerHTML = e.data.name || e.title || e.album || ""),
          (u.innerHTML = e.data.artist || e.artist || ""),
          (s.src = e.data.pic || ""));
        for (var t = 0; t < f.length; t++)
          (function (e, t) {
            if (e) {
              var i = makeEl("tr", {
                class: "span1",
                style:
                  "color:#fff;background-color:transparent;text-shadow:none",
              });
              ((i.onclick = function () {
                a.isOpen() && e.onclick();
              }),
                i.appendChild(
                  makeEl("span", {
                    style: "color:#fff;text-shadow:none",
                    html: e.title,
                  }),
                ),
                c.insertBefore(i, d),
                t < f.length - 1 &&
                  c.insertBefore(makeEl("hr", { class: "hr" }), d));
            }
          })(f[t], t);
      } else
        ((l.innerHTML = "获取歌曲信息失败！"),
          (p = setTimeout(function () {
            h(i);
          }, 1e3)));
  };
  "local_" !== String(state.musicId).substring(0, 6)
    ? state.playlist.playIndex == e.index &&
      state.apiMusicInfo &&
      state.apiMusicInfo.id === state.musicId
      ? h({ code: 1, data: state.apiMusicInfo })
      : (i && 2 == i.ItemType) ||
        (window.jQuery &&
          (m = window.jQuery.ajax({
            type: "POST",
            url: R1Config.musicApiUrl,
            data: { info: i.itemId, music_info: JSON.stringify(i) },
            dataType: "jsonp",
            success: h,
            error: function () {
              a.isOpen() &&
                ((l.innerHTML = "获取歌曲信息失败！"),
                (p = setTimeout(function () {
                  h(i);
                }, 1e3)));
            },
          })))
    : h(i);
}
function handleMessage(e) {
  if (e.type_id && state.callbacks[e.type_id]) {
    try {
      state.callbacks[e.type_id](e);
    } catch (e) {}
    delete state.callbacks[e.type_id];
  }
  var t = state.unisoundSkipCheck;
  if (
    !t ||
    !unisoundNoticeCurrent(t.notice, t.socket) ||
    (e.type_id !== t.id && "get_info" !== e.type)
  )
    if ("rksmbd_state" !== e.type_id) {
      if ("dsp_bass_state" !== e.type_id) {
        if ("wm_size" !== e.type_id)
          if ("sends" !== (C = e.type)) {
            if ("get_info" === C) {
              var i = readDeviceInfoResponse(e);
              if (!i) return;
              var n = ui.flowNotice;
              return (
                !loginFlowActive() &&
                  n &&
                  "unisound" === n.kind &&
                  "initializing" === n.phase &&
                  unisoundNoticeCurrent(n, n.socket) &&
                  ((state.reload = !1), clearFlowNotice("unisound")),
                clearTimeout(timers.unisoundInit),
                clearTimeout(timers.unisoundInitBackup),
                (timers.unisoundInit = timers.unisoundInitBackup = -1),
                confirmEchoVersion(i),
                state.initState || state.initState1
                  ? (removeEl($("#Skip_Waiting")), void renderHomePage(i))
                  : void updatePlayerState(i)
              );
            }
            if ("list" !== C)
              if ("get_eq_config" !== C)
                if ("login_state" !== C)
                  if ("Unisound" !== C)
                    if ("BT_Device" !== C)
                      if ("BT_enable" !== C && "BT_disable" !== C)
                        if ("max_vol" !== C)
                          if ("Auto_restart_device" !== C)
                            if (
                              "set_Auto_restart_device_open" !== C &&
                              "set_Auto_restart_device_time" !== C
                            )
                              if ("play_local_music" !== C) {
                                if ("reboot_echo" === C)
                                  return "switch_player" === e.type_id
                                    ? void handleSwitchPlayer(e)
                                    : void showAppAlert("已重启EchoService！");
                                if ("switch_player" !== C) {
                                  if (
                                    (("set_dev_name" !== C &&
                                      "rec_dev_name" !== C) ||
                                      runShell(
                                        "getprop net.hostname && netcfg",
                                        "get_hostname",
                                      ),
                                    "shell" === C)
                                  ) {
                                    var a = e.type_id;
                                    if ("reboot_adbd" === a)
                                      return void showAppAlert("已重启adbd！");
                                    if ("query" === a)
                                      return void setSystemInfoV1(e.data);
                                    if ("useless_services_detection" === a)
                                      return void detectUnusableServices(
                                        e.data,
                                      );
                                    if ("hide_useless_services" === a) {
                                      var o = $("#hide_useless_services");
                                      return void (
                                        o &&
                                        ((o.value = "已禁用无用的服务！"),
                                        (o.disabled = !0),
                                        setTimeout(function () {
                                          runShell(
                                            "/system/bin/pm list packages",
                                            "useless_services_detection",
                                          );
                                        }, 2e3))
                                      );
                                    }
                                    if ("get_hostname" === a)
                                      return void handleHostnameUpdate(e);
                                    if ("ps" === a)
                                      return void handleProcessList(
                                        200 == e.code ? e.data : null,
                                      );
                                    if ("ping_r1service" === a)
                                      return void handlePingResponse(e);
                                    if ("set_date" === a)
                                      return (
                                        showAppAlert("已校准音箱时间！"),
                                        void runShell(
                                          "date & ping -w 1 r1service.wxfsq.com",
                                          "ping_r1service",
                                        )
                                      );
                                    if ("reboot_xiaoaiservice" === a)
                                      return void runShell(
                                        "Am broadcast -a android.intent.action.BOOT_COMPLETED -n com.xiaomi.xiaoailite/.ai.BootReceiver&am broadcast -a android.intent.action.BOOT_COMPLETED -n com.duoqin.ai/com.xiaofei.BootReceiver",
                                      );
                                    if ("activation_xiaoai" === a)
                                      return void runShell(
                                        "am broadcast -a android.intent.action.BOOT_COMPLETED -n com.xiaomi.xiaoailite/.ai.BootReceiver&am broadcast -a android.intent.action.BOOT_COMPLETED -n com.xiaomi.xiaoailite/com.taobao.accs.EventReceiver",
                                      );
                                    if ("detect_xiaoai" === a) {
                                      var s = String(e.data || "");
                                      return (
                                        (s.indexOf("com.xiaomi.xiaoailite") >
                                          -1 ||
                                          s.indexOf("com.duoqin.ai") > -1) &&
                                          (state.unisoundInfo
                                            .is_xiaoai_exists ||
                                            ((state.unisoundInfo.is_xiaoai_exists =
                                              !0),
                                            state.unisoundInfo &&
                                              (state.unisoundInfo.is_xiaoai_exists =
                                                !0))),
                                        void updateButtonVisibility()
                                      );
                                    }
                                  }
                                  if ("modify_color" !== e.type_id)
                                    if ("get_device_info" !== e.type_id) {
                                      if (
                                        "Get_MiPlay_Diag" !== e.type &&
                                        "Get_MiPlay_Paired_Diag" !== e.type &&
                                        "Get_MiPlay_Remote_Diag" !== e.type &&
                                        "Get_Lan_Devices" !== e.type &&
                                        "Set_MiPlay_Sync_Delay" !== e.type &&
                                        "Set_MiPlay_Remote_Sync_Delay" !==
                                          e.type &&
                                        "Set_MiPlay_Tuning" !== e.type &&
                                        "Set_MiPlay_Remote_Tuning" !== e.type &&
                                        "Set_MiPlay_Remote_Capture" !==
                                          e.type &&
                                        "Set_MiPlay_Capture_Latency" !==
                                          e.type &&
                                        "Set_MiPlay_Channel" !== e.type &&
                                        "Set_MiPlay_Remote_Channel" !==
                                          e.type &&
                                        "Set_MiPlay_Open" !== e.type &&
                                        "Set_MiPlay_Group" !== e.type &&
                                        "Set_MiPlay_Group_Auto" !== e.type &&
                                        "Set_MiPlay_Remote_Role" !== e.type &&
                                        e.type_id
                                      ) {
                                        var r,
                                          l = $("#text"),
                                          u = getSuccessTip(e.type_id);
                                        if (
                                          "send_message" === C &&
                                          200 == e.code &&
                                          "sendMessage_ok" === e.data &&
                                          null == u
                                        )
                                          return;
                                        r =
                                          200 == e.code
                                            ? null != u
                                              ? u
                                              : "object" == typeof e.data &&
                                                  null !== e.data
                                                ? JSON.stringify(e.data)
                                                : e.data
                                            : "object" == typeof e.msg &&
                                                null !== e.msg
                                              ? JSON.stringify(e.msg)
                                              : e.msg;
                                        var c = "[" + e.type_id + "]:" + r;
                                        (l && (l.value = c),
                                          createTextWindow(
                                            e.type_id,
                                            String(r),
                                          ));
                                      }
                                    } else setSystemInfoV2(e.data);
                                  else showAppAlert("已保存！");
                                } else handleSwitchPlayer(e);
                              } else {
                                var d = $("#text");
                                if (200 != e.code) {
                                  var p = "[播放本地音乐]:" + e.msg;
                                  (d && (d.value = p), showAppAlert(p));
                                } else
                                  d && (d.value = "[播放本地音乐]:" + e.data);
                              }
                            else requestAutoRestart();
                          else 200 == e.code && createAutoRestartPanel(e.data);
                        else
                          200 == e.code &&
                            ui.volumeRange &&
                            ui.volumeLabel &&
                            ((ui.volumeRange.max = e.data),
                            (ui.volumeLabel.innerHTML =
                              " " +
                              ui.volumeRange.value +
                              "/" +
                              ui.volumeRange.max));
                      else ui.btEnableBtn && (ui.btEnableBtn.wait = !1);
                    else refreshBluetoothDevices(e.data);
                  else handleUnisoundMessage(e);
                else handleLoginState(e.data);
              else refreshAudioEffects(JSON.parse(e.data));
            else updatePlaylist(JSON.parse(e.data));
          } else {
            if (200 != e.code) return;
            if ("device_info" === e.type_id) {
              for (var m = null, f = 0; f < e.data.length; f++)
                "get_device_info" === e.data[f].type_id && (m = e.data[f]);
              return void (m && setSystemInfoV2(m.data, e.data));
            }
            for (var h = 0; h < e.data.length; h++) handleMessage(e.data[h]);
          }
        else if (ui.screen && ui.screen.controller) {
          var g = /(\d+)x(\d+)/.exec(e.data);
          g && ui.screen.controller.setTargetResolution(g[1], g[2]);
        }
      } else
        for (var v = e.data.split("\r\n"), y = 1; y < v.length; y++) {
          var _ = v[y].split(":"),
            b = _.shift(),
            k = _.join(":").replace(/^\s+|\s+$/g, "");
          if ("route0feture" === b) {
            var w = $("#dsp_bass_switch");
            w && (w.checked = 1 == k);
          } else if ("pram" === b) {
            var C;
            (C = $("#dsp_bass_text")) &&
              (C.innerHTML =
                "DSP低音增强(" +
                (k.indexOf(">data3") > -1 ? "生效中" : "未生效") +
                ")：");
          }
        }
    } else {
      var x = e.data.split("\r\n")[1] || 0;
      if (-1 != x) {
        var T = $("#rksmbd");
        T &&
          (T.setAttribute("state", x),
          (T.value = 1 == x ? "关闭smb服务" : "打开smb服务"),
          (T.style.display = ""));
      }
    }
}
function handleSwitchPlayer(e) {
  if (200 == e.code) {
    var t = $("#switch_player");
    "reboot_echo" !== e.type
      ? t &&
        (2 == e.data.player
          ? (t.setAttribute("PlayerType", 2),
            (t.value = "切换MediaPlayer播放器"))
          : (t.setAttribute("PlayerType", 1),
            (t.value = "切换ExoPlayer播放器")),
        sendWs({ type: "reboot_echo", type_id: "switch_player" }))
      : t &&
        showAppAlert(
          "已切换为" +
            (2 == t.getAttribute("PlayerType") ? "ExoPlayer" : "MediaPlayer") +
            "播放器！",
        );
  } else showAppAlert("切换失败！" + e.msg);
}
function handleHostnameUpdate(e) {
  if (
    !loginFlowActive() &&
    (state.initState && ((state.initState = !1), sendWs({ type: "get_info" })),
    e.data)
  ) {
    var t = e.data.split("\r\n");
    if (!(t.length < 2)) {
      state.hostname = t[1];
      for (var i = 0; i < t.length; i++)
        if (t[i].indexOf("wlan0") > -1)
          for (var n = t[i].split(" "), a = 0; a < n.length; a++) {
            var o = n[a].split("/")[0];
            n[a] &&
              IP_PATTERN.test(o) &&
              ((state.localIp = o), (state.ip = o + ":8080"));
          }
      (state.hostname &&
        (updateDeviceList({
          hostname: state.hostname,
          ip: state.ip.substring(0, state.ip.indexOf(":")),
          dev_name: state.info.device_name,
          url: location.href.split("?")[0],
        }),
        localStorage.setItem("current_hostname", state.hostname),
        clearTimeout(timers.background),
        (timers.background = setTimeout(function () {
          var e = localStorage.getItem(state.hostname + "_background");
          (e ? setBackgroundCss(e) : restoreBackground(), updateStatusBar());
        }, 50)),
        (state.deviceTag = "[" + state.hostname.substr(-4) + "]")),
        document.title.substr(-6) !== state.deviceTag &&
          -1 === document.title.indexOf("正在获取") &&
          ("]" === document.title.substr(-1)
            ? (document.title =
                document.title.substr(0, document.title.length - 6) +
                state.deviceTag)
            : (document.title += state.deviceTag),
          setPageTitle(document.title)));
    }
  }
}
function handlePingResponse(e) {
  if (200 == e.code) {
    state.pingTime = Date.now();
    for (var t = e.data || "", i = t.split("\r\n"), n = 0; n < i.length; n++)
      if (i[n] && i[n].indexOf("CST") > -1) {
        var a = new Date(i[n] + " +0800");
        isNaN(a.getTime()) || (state.deviceDate = a);
        break;
      }
    var o = state.deviceDate
        ? formatUnixTime(parseInt(state.deviceDate.getTime() / 1e3, 10))
        : "",
      s = $("#device_time");
    (s && (s.innerHTML = "音箱时间：" + o),
      (state.pingResult = t.indexOf("icmp_seq=1") > -1 ? 1 : 0));
  } else state.pingResult = e.code;
}
function handleProcessList(e) {
  var t = $("#Cleanup_process");
  if (e) {
    for (var i = e.split("\r\n").slice(2), n = [], a = 0; a < i.length; a++) {
      var o = i[a].split(" ").filter(function (e) {
        return "" !== e;
      });
      o.length && /\S+\.\S+/.test(o[o.length - 1]) && n.push(o);
    }
    for (
      var s = [
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
        r = [],
        l = 0;
      l < n.length;
      l++
    ) {
      for (var u = n[l][n[l].length - 1], c = !1, d = 0; d < s.length; d++)
        if (u.indexOf(s[d]) > -1) {
          c = !0;
          break;
        }
      c ||
        u.indexOf(":") > -1 ||
        (r.push("am force-stop " + u),
        isEchoVer(1855) || runShell("am force-stop " + u));
    }
    (r.length && isEchoVer(1855) && sendWs({ type: "shell1", shells: r }),
      t &&
        ((t.value = r.length ? "已清理[" + r.length + "]个进程！" : "已清理！"),
        setTimeout(function () {
          ((t.disabled = !1), (t.value = "清理进程"));
        }, 1e3)));
  } else
    t &&
      ((t.value = "已清理！"),
      setTimeout(function () {
        ((t.disabled = !1), (t.value = "清理进程"));
      }, 1e3));
}
function getSuccessTip(e) {
  if (state.tips_data && null != state.tips_data[e]) return state.tips_data[e];
  for (var t = 0; t < BUTTON_DEFINITIONS.length; t++) {
    var i = BUTTON_DEFINITIONS[t];
    if (i[0] === e) {
      var n = i[1].succ;
      if (Array.isArray(n)) {
        var a = i[1].tips;
        if (a && Array.isArray(a)) {
          var o = a.indexOf(e);
          if (o >= 0 && o < n.length) return n[o];
        }
        return n[0];
      }
      return n;
    }
  }
  return null;
}
function unwrapMiPlayRemoteDiag(e) {
  if (!e || !e.data || !e.data.diag) return null;
  try {
    var t = JSON.parse(e.data.diag);
    return t.data || t;
  } catch (e) {
    return null;
  }
}
function isMiPlayDiagFresh(e) {
  var t = e ? parseInt(e.diag_age_ms, 10) : NaN;
  return !isNaN(t) && t >= 0 && t <= 5e3;
}
function isMiPlayDiagRunning(e) {
  return !(
    !e ||
    2 != e.miplay_state ||
    !e.playback_active ||
    !1 === e.miplay_open ||
    0 === e.miplay_open
  );
}
function isMiPlayTimelineValid(e) {
  return !(
    !isMiPlayDiagRunning(e) ||
    !isMiPlayDiagFresh(e) ||
    "sender_clock" !== e.mode ||
    e.front_pts_missing ||
    isNaN(parseInt(e.error_us, 10))
  );
}
function getMiPlayPendingText(e) {
  var t = e && null != e.raw_pending_ms ? parseInt(e.raw_pending_ms, 10) : NaN,
    i =
      e && null != e.output_latency_ms
        ? parseInt(e.output_latency_ms, 10)
        : NaN;
  return !e ||
    ("fusion_opensl_refill" !== e.latency_model &&
      "fusion_normalized_head" !== e.latency_model)
    ? isNaN(t)
      ? isNaN(i)
        ? "-"
        : i + " ms（仅平滑估算）"
      : t + " ms（实时" + (isNaN(i) ? "" : "；平滑 " + i + " ms") + "）"
    : isNaN(t)
      ? "-"
      : t + " ms（原生已排队）";
}
function isMiPlayPhaseSchema(e) {
  return !(
    !e ||
    !(
      "block_phase_us" in e ||
      "block_phase_valid" in e ||
      "latency_model" in e ||
      "render_rate_ppm" in e
    )
  );
}
function miPlayBlockPhaseMicros(e) {
  if (!isMiPlayTimelineValid(e)) return null;
  if (isMiPlayPhaseSchema(e)) {
    if (
      1 != e.block_phase_valid ||
      null == e.block_phase_us ||
      "" === e.block_phase_us ||
      null == e.block_at_ms ||
      null == e.diag_elapsed_ms
    )
      return null;
    var t = Number(e.block_phase_us),
      i = Number(e.block_at_ms),
      n = Number(e.diag_elapsed_ms),
      a = n - i + parseInt(e.diag_age_ms, 10);
    return !isFinite(t) ||
      !isFinite(i) ||
      !isFinite(n) ||
      i <= 0 ||
      n < i ||
      a > 5e3
      ? null
      : t;
  }
  var o = parseInt(e.block_error_us, 10),
    s = parseInt(e.block_pending_us, 10);
  return isNaN(o) || isNaN(s) ? null : o + s;
}
function getMiPlayPairDelta(e, t) {
  if (!isMiPlayTimelineValid(e) || !isMiPlayTimelineValid(t)) return null;
  var i = parseInt(e.diag_age_ms, 10),
    n = parseInt(t.diag_age_ms, 10);
  if (Math.abs(i - n) > 500) return null;
  var a = isMiPlayPhaseSchema(e),
    o = isMiPlayPhaseSchema(t);
  if (a !== o) return null;
  if (a && e.latency_model !== t.latency_model) return null;
  var s = miPlayBlockPhaseMicros(e),
    r = miPlayBlockPhaseMicros(t);
  if (null == s || null == r)
    return a || o ? null : parseInt(e.error_us, 10) - parseInt(t.error_us, 10);
  if (a) {
    var l = Number(e.diag_elapsed_ms) - Number(e.block_at_ms) + i,
      u = Number(t.diag_elapsed_ms) - Number(t.block_at_ms) + n;
    if (Math.abs(l - u) > 500) return null;
  }
  return s - r;
}
var miPlayAdvDialog = null;
function createMiPlayAdvDialog() {
  if (miPlayAdvDialog && miPlayAdvDialog.isOpen()) miPlayAdvDialog.close();
  else {
    var e = createDialogPanel("MiPlay 高级设置", {
      transparent: !0,
      width: "92vw",
    });
    ((miPlayAdvDialog = e), (e.wrap.id = "miplay_adv_wrap"));
    var t = "color:#fff;font-size:13px;line-height:1.6;text-align:left",
      i = makeEl("div", {
        style: t + ";display:flex;gap:6px;align-items:center;margin:4px 0 8px",
      });
    i.appendChild(makeText("目标音箱："));
    var n = makeEl("select", {
      style: "flex:1;color:#fff;background:#333;border:1px solid #555;",
    });
    (n.appendChild(makeEl("option", { value: "local", html: "本机" })),
      (state.info.miplay_discovered || "")
        .split(",")
        .filter(function (e) {
          return e.trim();
        })
        .forEach(function (e) {
          n.appendChild(makeEl("option", { value: e.trim(), html: e.trim() }));
        }));
    var a = makeEl("input", {
      type: "text",
      placeholder: "或手动输入IP",
      style:
        "flex:1;color:#fff;background:#333;border:1px solid #555;padding:5px;font-size:12px",
    });
    (i.appendChild(n),
      i.appendChild(a),
      e.body.appendChild(i),
      (n.onchange = function () {
        ((a.value = ""), z());
      }),
      (a.onchange = function () {
        z();
      }));
    var o = makeEl("div", {
      style: t + ";font-weight:bold;margin:6px 0 4px",
      html: "实时指标：",
    });
    e.body.appendChild(o);
    var s = makeEl("div", {
      style:
        "background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:8px;font-size:12px;font-family:Consolas,Monaco,monospace;line-height:1.8;margin-bottom:10px;white-space:pre-wrap;color:#fff;text-shadow:none",
    });
    ((s.textContent = "加载中..."), e.body.appendChild(s));
    var r = !1,
      l = 0,
      u = null,
      c = !1;
    R(null);
    var d = makeEl("div", {
      style: t + ";font-weight:bold;margin:6px 0 4px",
      html: "声道切换：",
    });
    e.body.appendChild(d);
    var p = makeEl("div", {
        style: "display:flex;justify-content:center;gap:6px;margin-bottom:10px",
      }),
      m = [],
      f = null,
      h = D(),
      g = !1,
      v = !0,
      y = 0,
      _ = 0;
    ([
      ["仅左", 1],
      ["立体声", 0],
      ["仅右", 2],
    ].forEach(function (e) {
      var t = makeEl("input", {
        type: "button",
        class: "btn",
        value: e[0],
        disabled: !0,
        style: "flex:1;font-size:12px;padding:8px",
        onclick: function () {
          if (!t.disabled) {
            var i = D(),
              n = ++y;
            ((g = !0),
              W(),
              sendWs(
                i
                  ? {
                      type: "Set_MiPlay_Remote_Channel",
                      ip: i,
                      mode: e[1],
                      channel: e[1],
                    }
                  : { type: "Set_MiPlay_Channel", mode: e[1] },
                function (t) {
                  if (B() && D() === i && y === n)
                    return t && 200 == t.code
                      ? void q(i, function (t) {
                          B() &&
                            D() === i &&
                            y === n &&
                            ((g = !1),
                            (f = H(t)),
                            W(),
                            f === e[1]
                              ? showAppAlert(
                                  (i ? "远程" : "") + "已切换为" + e[0] + "！",
                                )
                              : showAppAlert(
                                  "声道回读未确认，请检查目标音箱或稍后重试。",
                                ),
                            z());
                        })
                      : ((g = !1),
                        W(),
                        void showAppAlert(
                          (i ? "远程" : "") +
                            "设置失败：" +
                            (t && t.msg ? t.msg : "音箱无响应"),
                        ));
                },
              ));
          }
        },
      });
      (m.push({ mode: e[1], button: t }), p.appendChild(t));
    }),
      e.body.appendChild(p));
    var b = makeEl("div", {
      style:
        t + ";text-align:center;color:#90caf9;cursor:pointer;margin:8px 0 4px",
      html: "▶ 延迟参数（高级，运行中生效并持久化）",
    });
    e.body.appendChild(b);
    var k = makeEl("div", {
      style: "display:none;margin:0 0 8px;text-align:center",
    });
    (e.body.appendChild(k),
      (b.onclick = function () {
        var e = "none" !== k.style.display;
        ((k.style.display = e ? "none" : "block"),
          (b.innerHTML = e
            ? "▶ 延迟参数（高级，运行中生效并持久化）"
            : "▼ 延迟参数（高级，运行中生效并持久化）"));
      }));
    var w = makeEl("div", {
      style: t + ";text-align:center;font-weight:bold;margin:6px 0 4px",
      html: "同步延迟微调（0ms 为校准基准）：",
    });
    k.appendChild(w);
    var C = makeEl("div", {
        style:
          "display:flex;flex-wrap:wrap;justify-content:center;gap:6px;align-items:center;margin-bottom:6px",
      }),
      x = makeEl("input", {
        type: "number",
        min: -500,
        max: 500,
        step: 1,
        value: 0,
        style:
          "width:90px;text-align:center;color:#fff;background:#333;border:1px solid #555;padding:5px",
        title: "正值晚播，负值早播，单位毫秒",
      });
    (C.appendChild(x), C.appendChild(makeText("ms")));
    var T = makeEl("div", {
        style: t + ";text-align:center;font-size:12px;margin-bottom:8px",
        html: "0ms 使用已校准的同步基准。正值在此基础上晚播，负值早播；建议先每次调 5ms，再用 1ms 微调。应用时会短暂重新对齐。",
      }),
      S = makeEl("input", {
        type: "button",
        class: "btn",
        value: "应用同步补偿",
        onclick: function () {
          V("" === x.value ? NaN : Number(x.value));
        },
      });
    (C.appendChild(S), k.appendChild(C));
    var E = makeEl("div", {
      style:
        "display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-bottom:6px",
    });
    ([-5, -1, 1, 5].forEach(function (e) {
      E.appendChild(
        makeEl("input", {
          type: "button",
          class: "btn",
          value: (e > 0 ? "+" : "") + e + "ms",
          onclick: function () {
            S.disabled || V(("" === x.value ? NaN : Number(x.value)) + e);
          },
        }),
      );
    }),
      E.appendChild(
        makeEl("input", {
          type: "button",
          class: "btn",
          value: "补偿归零",
          onclick: function () {
            S.disabled || V(0);
          },
        }),
      ),
      k.appendChild(E),
      k.appendChild(T));
    var I = makeEl("div", {
      style:
        "display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-bottom:6px;align-items:center",
    });
    I.appendChild(makeText("队列水位:"));
    var P = makeEl("input", {
      type: "number",
      min: 400,
      max: 1500,
      style:
        "width:90px;text-align:center;color:#fff;background:#333;border:1px solid #555;padding:5px;font-size:12px",
    });
    I.appendChild(P);
    var A = makeEl("input", {
      type: "button",
      class: "btn",
      value: "应用",
      style: "font-size:12px;padding:5px 10px",
      onclick: function () {
        var e = parseInt(P.value, 10);
        if (isNaN(e)) showAppAlert("请填写队列水位！");
        else {
          var t = D();
          t
            ? sendWs(
                { type: "Set_MiPlay_Remote_Tuning", ip: t, queue_target_ms: e },
                function (e) {
                  B() &&
                    (showAppAlert(
                      e && 200 == e.code
                        ? "远程参数已应用！"
                        : "远程应用失败（检查音箱在线）！",
                    ),
                    z());
                },
              )
            : sendWs(
                { type: "Set_MiPlay_Tuning", queue_target_ms: e },
                function (e) {
                  B() &&
                    (showAppAlert(
                      e && 200 == e.code ? "参数已应用！" : "应用失败！",
                    ),
                    z());
                },
              );
        }
      },
    });
    (I.appendChild(A), k.appendChild(I));
    var L = makeEl("div", {
        style:
          "display:flex;justify-content:center;gap:6px;margin-bottom:10px;align-items:center",
      }),
      M = makeEl("input", {
        type: "button",
        class: "btn",
        value: "♻ 重置队列水位为默认 800ms",
        style: "flex:1;font-size:12px;padding:8px",
        onclick: function () {
          showAppConfirm("将当前目标音箱的延迟参数重置为默认值？", function () {
            var e = D();
            e
              ? sendWs(
                  {
                    type: "Set_MiPlay_Remote_Tuning",
                    ip: e,
                    queue_target_ms: 800,
                  },
                  function (e) {
                    B() &&
                      (showAppAlert(
                        e && 200 == e.code
                          ? "远程队列水位已重置！"
                          : "远程重置失败！",
                      ),
                      z());
                  },
                )
              : sendWs(
                  { type: "Set_MiPlay_Tuning", queue_target_ms: 800 },
                  function (e) {
                    B() &&
                      (showAppAlert(
                        e && 200 == e.code ? "队列水位已重置！" : "重置失败！",
                      ),
                      z());
                  },
                );
          });
        },
      });
    (L.appendChild(M),
      k.appendChild(L),
      e.onClose(function () {
        (clearTimeout(u),
          l++,
          _++,
          y++,
          miPlayAdvDialog === e && (miPlayAdvDialog = null));
      }),
      z(),
      F());
  }
  function B() {
    return e.isOpen() && document.getElementById("miplay_adv_wrap") === e.wrap;
  }
  function D() {
    var e = a.value.trim();
    return e || ("local" === n.value ? null : n.value);
  }
  function R(e) {
    ((r =
      !!e &&
      ("boolean" == typeof e.debug_enabled
        ? e.debug_enabled
        : !0 !== e.release_build)),
      (o.style.display = r ? "" : "none"),
      (s.style.display = r ? "" : "none"),
      clearTimeout(u),
      r && U());
  }
  function N(e) {
    if (!e || !e.data || !e.data.diag) return null;
    try {
      var t = JSON.parse(e.data.diag);
      return t.data || t;
    } catch (e) {
      return null;
    }
  }
  function q(e, t) {
    B() &&
      (e
        ? sendWs({ type: "Get_MiPlay_Remote_Diag", ip: e }, function (e) {
            B() && t(N(e));
          })
        : sendWs({ type: "Get_MiPlay_Diag" }, function (e) {
            B() && t(e && e.data ? e.data : null);
          }));
  }
  function O(e, t, i, n, a) {
    if (!i && e) {
      if (
        (R(e),
        (function (e) {
          if (h !== D() || g || v) return;
          ((f = H(e)), W());
        })(e),
        r)
      ) {
        var o = parseInt(e.error_us, 10),
          l = isMiPlayTimelineValid(e) ? o : null,
          u = parseInt(e.diag_age_ms, 10),
          c = isMiPlayDiagFresh(e),
          d = isMiPlayDiagRunning(e),
          p = c && d ? getMiPlayPendingText(e) : "--（非实时/未运行）",
          m = isMiPlayPhaseSchema(e) ? miPlayBlockPhaseMicros(e) : null,
          y = null != e.render_rate_ppm ? Number(e.render_rate_ppm) : NaN,
          _ = [
            "模式: " +
              (e.mode || "-") +
              "    播放: " +
              (c && d
                ? "播放中"
                : !1 === e.miplay_open || 0 === e.miplay_open
                  ? "已关闭"
                  : c
                    ? 2 == e.miplay_state
                      ? "对齐/暂停"
                      : "空闲"
                    : "快照过期/无实时数据"),
            "时间线误差: " +
              (null == l
                ? "--（等待运行中的实时 sender_clock）"
                : (l / 1e3).toFixed(1) + " ms"),
            "参考相位残差: " +
              ("fusion_normalized_head" !== e.latency_model || null == m
                ? "--（无同基准计量）"
                : (m / 1e3).toFixed(1) +
                  " ms（已扣除回调参考，不是双箱声学差）"),
            "渲染速率修正: " + (c && d && isFinite(y) ? y + " ppm" : "--"),
            "PCM 队列: " +
              (c && d && null != e.buffered_ms ? e.buffered_ms : "--") +
              " ms",
            "输出端 pending: " + p,
            "队列水位目标: " + (e.queue_target_ms || 800) + " ms",
            "同步延迟补偿: " +
              (null != e.sync_delay_ms
                ? e.sync_delay_ms + " ms（正值晚播，负值早播）"
                : "旧固件不支持"),
            "声道: " + ["立体声", "仅左", "仅右"][e.channel || 0],
            "快照: " +
              (c
                ? u + " ms 前"
                : u >= 0
                  ? "已过期 " + u + " ms"
                  : "暂无实时快照"),
          ];
        ("fusion_opensl_refill" !== e.latency_model &&
          "fusion_normalized_head" !== e.latency_model) ||
          (_.push(
            "回调调度窗口: " +
              e.scheduling_horizon_ms +
              " ms（不是实际出声延迟）    输出块: " +
              e.output_callback_frames +
              " 帧",
          ),
          null != e.resume_reserve_ms &&
            _.push(
              "同步起播/恢复余量: " +
                e.resume_reserve_ms +
                " ms（对齐后仍保留的 PCM）",
            ),
          _.push(
            "原生缓冲容量: " +
              e.native_buffer_frames +
              " 帧    补缓冲相位: " +
              (e.refill_phase_locked ? "已锁定" : "对齐中"),
          ));
        var b = getMiPlayPairDelta(e, t);
        (null != b
          ? _.push(
              (isMiPlayPhaseSchema(e)
                ? "台间传输相位估算: "
                : "台间误差（旧固件估算）: ") +
                (b / 1e3).toFixed(1) +
                " ms（本轮实时，本箱相对" +
                (n ? "本机" : "目标") +
                "）",
            )
          : a &&
            _.push(
              "台间传输相位估算: --（等待本轮双箱运行中、有效且新鲜的同模型数据）",
            ),
          _.push(
            "说明: 传输相位为写入时的预计呈现估算，不是声学测量，不能证明实际出声同步。",
          ),
          (s.textContent = _.join("\n")));
      }
    } else s.textContent = "目标音箱不可达（检查 IP / 是否同网段）";
  }
  function U() {
    (clearTimeout(u), r && B() && (u = setTimeout(F, 2e3)));
  }
  function F() {
    B() &&
      (sendWs({ type: "Get_Lan_Devices" }, function (e) {
        if (B() && e && e.data && e.data.devices) {
          for (var t = e.data.devices, i = {}, a = 0; a < n.options.length; a++)
            i[n.options[a].value] = !0;
          for (var o in t)
            if (Object.prototype.hasOwnProperty.call(t, o) && !i[o]) {
              var s = String(t[o] || o),
                r = s.indexOf("@");
              (r > -1 && (s = s.slice(r + 1)),
                n.appendChild(
                  makeEl("option", { value: o, html: s + " (" + o + ")" }),
                ));
            }
        }
      }),
      (function (e) {
        if (r && !c) {
          c = !0;
          var t = function () {
              ((c = !1), "function" == typeof e && e());
            },
            i = function (e, t) {
              return e === l && D() === t && B();
            },
            a = D(),
            o = ++l,
            s = a;
          if (!s && !(s = state.info.miplay_group_peer || ""))
            for (var u = 0; u < n.options.length; u++)
              if ("local" !== n.options[u].value) {
                s = n.options[u].value;
                break;
              }
          s
            ? sendWs({ type: "Get_MiPlay_Paired_Diag", ip: s }, function (e) {
                if (i(o, a)) {
                  var n = e && e.data ? e.data : null,
                    s = n ? n.local : null,
                    r = n ? n.remote : null;
                  (a ? O(r, s, !r, !0, !0) : O(s, r, !s, !1, !0), t());
                } else t();
              })
            : q(null, function (e) {
                i(o, a) ? (O(e, null, !e, !1, !1), t()) : t();
              });
        } else "function" == typeof e && e();
      })(U));
  }
  function H(e) {
    return e && /^[012]$/.test(String(e.channel)) ? Number(e.channel) : null;
  }
  function W() {
    m.forEach(function (e) {
      e.button.disabled = g || v || e.mode === f;
    });
  }
  function V(e) {
    if (!isFinite(e) || Math.floor(e) !== e || e < -500 || e > 500)
      showAppAlert("请输入 -500 到 500 的整数毫秒值！");
    else {
      var t = D();
      ((x.value = e), (S.disabled = !0));
      var i = {
        type: t ? "Set_MiPlay_Remote_Sync_Delay" : "Set_MiPlay_Sync_Delay",
        sync_delay_ms: e,
      };
      (t && (i.ip = t),
        sendWs(
          i,
          function (i) {
            if (B())
              return i && 200 == i.code
                ? void q(t, function (i) {
                    ((S.disabled = !1),
                      i && Number(i.sync_delay_ms) === e
                        ? D() === t &&
                          ((x.value = e),
                          (T.textContent =
                            "已保存并确认 " +
                            e +
                            "ms（正值晚播，负值早播）。音频将重新对齐；以听感判断，不按参考残差自动校准。"))
                        : showAppAlert("同步补偿回读未确认，请检查目标音箱。"));
                  })
                : ((S.disabled = !1),
                  void showAppAlert(
                    "同步补偿设置失败：" +
                      (i && i.msg ? i.msg : "音箱无响应/旧固件不支持"),
                  ));
          },
          1e4,
        ));
    }
  }
  function z() {
    if (B()) {
      (R(null), l++);
      var e = D(),
        t = ++_;
      (h !== e && ((h = e), (f = null), (g = !1), y++), (v = !0), W());
      var i = function (i) {
        B() &&
          D() === e &&
          _ === t &&
          ((v = !1),
          (f = H(i)),
          W(),
          i &&
            (R(i),
            (P.value = i.queue_target_ms || 800),
            null != i.sync_delay_ms
              ? ((x.value = i.sync_delay_ms), (S.disabled = !1))
              : ((x.value = 0),
                (S.disabled = !0),
                (T.textContent =
                  "目标固件不支持同步补偿，请先更新 EchoService。"))));
      };
      e
        ? sendWs({ type: "Get_MiPlay_Remote_Diag", ip: e }, function (e) {
            var t = null;
            try {
              t = N(e);
            } catch (e) {}
            i(t);
          })
        : sendWs({ type: "Get_MiPlay_Diag" }, function (e) {
            i(e && e.data ? e.data : null);
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
  if (musicSearchDialog && musicSearchDialog.isOpen())
    musicSearchDialog.close();
  else if (
    (MUSIC_SEARCH_CANCEL && MUSIC_SEARCH_CANCEL(), hasMusicQueueCapability())
  ) {
    var e = musicQueueContext(),
      t = MUSIC_SEARCH_STATE,
      i = t.source,
      n = 0,
      a = !1,
      o = null,
      s = !1,
      r = !1,
      l = t.status,
      u = createDialogPanel("搜索音乐", { transparent: !0, width: "92vw" });
    ((musicSearchDialog = u), (u.wrap.id = "music_search_wrap"));
    var c = null;
    (u.onClose(x),
      (MUSIC_SEARCH_CANCEL = x),
      "undefined" != typeof MutationObserver &&
        (c = new MutationObserver(function () {
          (u.isOpen() &&
            document.getElementById("music_search_wrap") === u.wrap) ||
            x();
        })).observe(u.host, { childList: !0, subtree: !0 }));
    var d =
        "border:none;border-radius:14px;padding:6px 10px;font-size:12px;color:#fff;cursor:pointer;flex-shrink:0",
      p =
        "border:none;border-radius:50%;width:30px;height:30px;color:#fff;cursor:pointer;background:rgba(255,255,255,0.15);flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;padding:0;outline:none",
      m = makeEl("div", {
        style:
          "display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap",
      }),
      f = [];
    MUSIC_SEARCH_SOURCES.forEach(function (e) {
      var t = makeEl("button", {
        type: "button",
        class: "app_btn",
        text: e.name,
        style: d,
        onclick: function () {
          i !== e.key && ((i = e.key), I(), S());
        },
      });
      (f.push({ key: e.key, el: t }), m.appendChild(t));
    });
    var h = makeEl("div", {
        class: "music_search_pair",
        style:
          "display:flex;flex:1 1 160px;min-width:0;gap:6px;align-items:center;flex-wrap:nowrap",
      }),
      g = makeEl("input", {
        type: "text",
        placeholder: "歌名 / 歌手",
        style:
          "color:#fff;background:transparent;border:1px solid #fff;border-radius:8px;padding:7px 10px;font-size:13px;outline:none;flex:1;min-width:0;width:0;box-sizing:border-box",
      }),
      v = makeEl("button", {
        type: "button",
        class: "app_btn",
        html: MUSIC_SEARCH_ICONS.go,
        title: "搜索",
        style: p + ";background:var(--primary-blue)",
      });
    (h.appendChild(g),
      h.appendChild(v),
      m.appendChild(h),
      u.body.appendChild(m));
    var y = makeEl("div", {
      role: "status",
      "aria-live": "polite",
      style:
        "font-size:12px;color:rgba(255,255,255,0.65);margin:2px 0 6px;min-height:16px",
    });
    u.body.appendChild(y);
    var _ = makeEl("div", {
      "aria-busy": "false",
      style: "max-height:44vh;overflow-y:auto",
    });
    u.body.appendChild(_);
    var b = makeEl("div", { style: "display:flex;gap:8px;margin-top:8px" }),
      k = makeEl("button", {
        type: "button",
        class: "app_btn",
        text: "全部播放",
        style: d + ";flex:1;background:var(--primary-blue)",
      }),
      w = makeEl("button", {
        type: "button",
        class: "app_btn",
        text: "加载更多",
        style: d + ";flex:1;background:rgba(255,255,255,0.15)",
      });
    (b.appendChild(k),
      b.appendChild(w),
      u.body.appendChild(b),
      (g.oninput = I),
      (v.onclick = function () {
        D(1);
      }),
      (g.onkeydown = function (e) {
        "Enter" === e.key && D(1);
      }),
      (w.onclick = function () {
        a ||
          !1 === t.hasMore ||
          t.page < 1 ||
          g.value.trim() !== t.kw ||
          i !== t.source ||
          D(t.page + 1);
      }),
      (k.onclick = function () {
        T(n) &&
          (t.list.length
            ? (sendAction(4, 15, -1, A(t.list, 0)),
              M("全部播放（" + t.list.length + " 首）"),
              L())
            : M("先搜索"));
      }),
      (g.value = t.kw),
      S(),
      (y.textContent = t.status),
      E(),
      t.list.length && B());
  }
  function C() {
    (n++, o && o.abort(), (o = null), a && (t.status = l), (a = !1), (r = !1));
  }
  function x() {
    s ||
      ((s = !0),
      C(),
      c && c.disconnect(),
      musicSearchDialog === u && (musicSearchDialog = null),
      MUSIC_SEARCH_CANCEL === x && (MUSIC_SEARCH_CANCEL = null));
  }
  function T(t) {
    return (
      (u.isOpen() &&
        document.getElementById("music_search_wrap") === u.wrap &&
        isMusicQueueContextCurrent(e)) ||
        x(),
      !s && t === n
    );
  }
  function S() {
    f.forEach(function (e) {
      e.el.style.background =
        e.key === i ? "var(--primary-blue)" : "rgba(255,255,255,0.12)";
    });
  }
  function E() {
    ((w.disabled =
      a ||
      !1 === t.hasMore ||
      t.page < 1 ||
      g.value.trim() !== t.kw ||
      i !== t.source),
      (w.textContent = r
        ? "加载中…"
        : !1 === t.hasMore
          ? "没有更多结果"
          : "加载更多"),
      _.setAttribute("aria-busy", a ? "true" : "false"));
  }
  function I() {
    (C(), (y.textContent = t.status), E());
  }
  function P(e) {
    var t = {
      itemId: e.id || "",
      title: e.name || "",
      artist: e.artist || "",
      album: "",
      albumUrl: e.pic || "",
      itemType: 0,
    };
    return (
      readUnisoundAvailable() ||
        (t.url =
          R1Config.musicApiUrl + "?url=" + encodeURIComponent(e.id || "")),
      t
    );
  }
  function A(e, t) {
    return JSON.stringify({
      curItemId: e[t] ? e[t].id : "",
      index: t,
      itemList: e.map(P),
    });
  }
  function L() {
    (setTimeout(function () {
      isMusicQueueContextCurrent(e) && sendWs({ type: "list" });
    }, 800),
      setTimeout(function () {
        isMusicQueueContextCurrent(e) && sendWs({ type: "list" });
      }, 2e3));
  }
  function M(e) {
    ((t.status = e), (y.textContent = e));
  }
  function B() {
    ((_.innerHTML = ""),
      t.list.length
        ? t.list.forEach(function (e, t) {
            var i = makeEl("div", {
                style:
                  "display:flex;align-items:center;gap:8px;padding:8px 4px;border-bottom:1px solid rgba(255,255,255,0.08)",
              }),
              a = makeEl("div", {
                style: "flex:1;min-width:0;text-align:left",
              });
            (a.appendChild(
              makeEl("div", {
                style:
                  "font-size:13px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
                text: t + 1 + ". " + (e.name || ""),
              }),
            ),
              a.appendChild(
                makeEl("div", {
                  style:
                    "font-size:11px;color:rgba(255,255,255,0.55);overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
                  text: e.artist || "",
                }),
              ),
              i.appendChild(a),
              i.appendChild(
                makeEl("button", {
                  type: "button",
                  class: "app_btn",
                  html: MUSIC_SEARCH_ICONS.play,
                  title: "播放",
                  style: p,
                  onclick: function () {
                    T(n) &&
                      (sendAction(4, 15, -1, A([e], 0)),
                      M("已播放：" + (e.name || "")),
                      L());
                  },
                }),
              ),
              i.appendChild(
                makeEl("button", {
                  type: "button",
                  class: "app_btn",
                  html: MUSIC_SEARCH_ICONS.next,
                  title: "下一首播放",
                  style: p,
                  onclick: function () {
                    T(n) &&
                      (sendAction(4, 27, -1, JSON.stringify(P(e))),
                      M("下一首播放：" + (e.name || "")),
                      L());
                  },
                }),
              ),
              i.appendChild(
                makeEl("button", {
                  type: "button",
                  class: "app_btn",
                  html: MUSIC_SEARCH_ICONS.add,
                  title: "加入队列末尾",
                  style: p,
                  onclick: function () {
                    if (T(n)) {
                      var t = "";
                      (state.info &&
                        state.info.music_info &&
                        state.info.music_info.id &&
                        (t = state.info.music_info.id),
                        sendAction(
                          4,
                          19,
                          -1,
                          JSON.stringify({
                            curItemId: t,
                            pageIndex: 1,
                            itemList: [P(e)],
                          }),
                        ),
                        M("已加入队列末尾：" + (e.name || "")),
                        L());
                    }
                  },
                }),
              ),
              _.appendChild(i));
          })
        : _.appendChild(
            makeEl("div", {
              style:
                "font-size:12px;color:rgba(255,255,255,0.5);padding:10px 0",
              text: "无结果",
            }),
          ));
  }
  function D(e) {
    if (T(n)) {
      var s = g.value.trim(),
        u = i;
      if (!s) return (C(), M("输入关键词"), void E());
      if (!(
        e > 1 &&
        (a || t.page < 1 || s !== t.kw || u !== t.source || e !== t.page + 1)
      )) {
        C();
        var c = n;
        ((l = t.status), (a = !0), (r = e > 1));
        var d = t.list.length,
          p = _.scrollTop,
          m =
            "undefined" != typeof AbortController
              ? new AbortController()
              : null;
        ((o = m),
          M(e > 1 ? "正在加载第 " + e + " 页…" : "搜索中..."),
          E(),
          Promise.resolve()
            .then(function () {
              return T(c)
                ? fetch(
                    MUSIC_SEARCH_API +
                      "?keyword=" +
                      encodeURIComponent(s) +
                      "&source=" +
                      u +
                      "&page=" +
                      e,
                    m ? { signal: m.signal } : void 0,
                  )
                : null;
            })
            .then(function (e) {
              return T(c) ? e.json() : null;
            })
            .then(function (i) {
              if (T(c)) {
                if (!i || 1 != i.code || !i.data || !Array.isArray(i.data.list))
                  throw new Error("接口返回异常");
                var n = i.data.list;
                if (
                  ((t.list = 1 === e ? n.slice(0) : t.list.concat(n)),
                  (t.kw = s),
                  (t.source = u),
                  (t.page = e),
                  (t.hasMore = n.length > 0),
                  (a = !1),
                  (r = !1),
                  (o = null),
                  B(),
                  e > 1)
                ) {
                  var l = _.children[d];
                  if (l) {
                    var m = l.getBoundingClientRect(),
                      f = _.getBoundingClientRect();
                    ((_.scrollTop += m.top - f.top),
                      l.classList.add("search_result_new"));
                  } else _.scrollTop = p;
                  M(
                    n.length
                      ? "已新增 " +
                          n.length +
                          " 首，共 " +
                          t.list.length +
                          " 首"
                      : "没有更多结果，共 " + t.list.length + " 首",
                  );
                } else
                  ((_.scrollTop = 0),
                    M(
                      "共 " +
                        t.list.length +
                        " 首（第 " +
                        i.data.page +
                        " 页/每页 " +
                        i.data.page_size +
                        "）",
                    ));
                E();
              }
            })
            .catch(function (e) {
              T(c) &&
                ((a = !1),
                (o = null),
                (r = !1),
                M("搜索失败：" + (e && e.message ? e.message : e)),
                E());
            }));
      }
    }
  }
}
function renderHomePage(e) {
  if (
    (null != e.ver && (state.ver = e.ver),
    confirmEchoVersion(e),
    (state.info = e),
    updateUnisoundAvailability(e),
    !loginFlowActive())
  ) {
    if (state.reload) return (clearFlowNotice(), void location.reload());
    if (state.initState)
      return (
        (document.title = "正在获取设备信息。。。"),
        setPageTitle(document.title),
        showFlowNotice(
          "connection",
          "正在初始化",
          "连接音箱成功，正在获取设备信息，请稍候。",
        ),
        void runShell("getprop net.hostname && netcfg", "get_hostname")
      );
    ((state.initState1 = !1),
      hideDisconnectedActions(),
      clearFlowNotice(),
      (document.title = "R1音箱控制页面" + state.deviceTag),
      setPageTitle(document.title),
      (ui.textsPanel = buildTextsPanel(e)),
      ui.container.appendChild(ui.textsPanel));
    var t = buildBluetoothPanel();
    (t && ui.container.appendChild(t),
      buildDeviceInfoPanel(),
      isEchoVer(1821) && buildSoundEffectsPanel(),
      isEchoVer(1e3) && buildScreenPanel(),
      (ui.musicPanel = buildMusicPanel(e)),
      ui.container.appendChild(ui.musicPanel),
      ui.container.appendChild(buildVolumePanel(e)));
    var i = buildPlaylistPanel();
    (i && document.body.appendChild(i),
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
    var n = localStorage.getItem(state.hostname + "_page");
    if (n && "index" !== n) {
      var a = $("#btn_page_" + n);
      a && navigateToPage(a);
    }
    if (
      (updatePlayerState(state.info),
      (localStorage.getItem("web_ver1") != state.version.web ||
        (window.plus && state.version.app > plus.runtime.versionCode) ||
        state.version.echo > state.ver ||
        (state.isNewUnisound && state.version.unisound > state.uVer)) &&
        (setTimeout(openVersionInfo, 2e3),
        localStorage.setItem("web_ver1", state.version.web)),
      isEchoVer(1855))
    ) {
      var o = [{ type: "send_to_unisound", data: { type: "get_info" } }];
      (state.isNewUnisound &&
        o.push({
          type: "send_to_unisound",
          data: { type: "api", data: { type: "info" } },
        }),
        sendWs({ type: "sends", list: o }));
    } else
      (state.isNewUnisound &&
        setTimeout(function () {
          sendToUnisound({ type: "api", data: { type: "info" } });
        }, 2e3),
        sendToUnisound({ type: "get_info" }));
    window.onpopstate = function () {
      var e = localStorage.getItem(state.hostname + "_page");
      if (e && "index" !== e) {
        var t = $("#btn_page_" + e);
        t && navigateToPage(t);
      }
    };
  }
}
function adjustVolume(e) {
  if (ui.volumeRange && ui.volumeLabel) {
    var t = parseInt(ui.volumeRange.value, 10) + e;
    t > ui.volumeRange.max ||
      t < 0 ||
      ((ui.volumeRange.value = t),
      clearTimeout(ui.volumeRange._pressTimer),
      (state.mousePressed = !0),
      (ui.volumeRange._pressTimer = setTimeout(function () {
        state.mousePressed = !1;
      }, 600)),
      (ui.volumeLabel.innerHTML = "   " + t + "/" + ui.volumeRange.max),
      sendWs({ type: "set_vol", vol: t }),
      sendWs({ type: "get_info" }));
  }
}
function buildPageSwitcher() {
  ((ui.switchButtons = makeEl("div")), (state.pageList = []));
  for (
    var e = [
        ["音乐", "music", 1e3],
        ["屏幕", "screen", 1e3],
        ["音效", "sound_effects", 1822],
        ["蓝牙", "bluetooth", 1847],
        ["设备信息", "device_info", 1822],
      ],
      t = 0;
    t < e.length;
    t++
  ) {
    var i = e[t][0],
      n = e[t][1];
    isEchoVer(e[t][2]) &&
      (function (e, t) {
        var i = makeButton(e, function () {
          navigateToPage(this);
        });
        ((i.id = "btn_page_" + t),
          i.setAttribute("data", e),
          state.pageList.push([e, t, i.id]),
          ui.switchButtons.appendChild(i));
      })(i, n);
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
  for (var e = 0; e < BUTTON_DEFINITIONS.length; e++)
    (function (e) {
      var t = BUTTON_DEFINITIONS[e][0],
        i = BUTTON_DEFINITIONS[e][1],
        n = null != i.min_ver ? i.min_ver : state.ver,
        a = null != i.max_ver ? i.max_ver : state.ver,
        o = null != i.min_uver || null != i.max_uver,
        s = null != i.min_uver ? i.min_uver : state.uVer,
        r = null != i.max_uver ? i.max_uver : state.uVer,
        l = null != i.is_unisound ? i.is_unisound : state.unisoundAvailable;
      if (
        isEchoVer(n) &&
        state.ver - 1 < a + 2 &&
        (!o || (isUnisoundVer(s) && state.uVer - 1 < r + 2)) &&
        l === state.unisoundAvailable
      ) {
        var u = makeButton(t, function () {
          handleButtonClick(this);
        });
        ((u.id = "btn_" + e),
          u.setAttribute("data", JSON.stringify(i)),
          i.hide && (u.style.display = "none"),
          ui.buttons.push(u),
          ui.buttonsPanel.appendChild(u));
      }
    })(e);
}
function handleButtonClick(e) {
  ((e.disabled = !0),
    setTimeout(function () {
      e.disabled = !1;
    }, 1e3));
  var t = JSON.parse(e.getAttribute("data")),
    i = $("#input");
  if (1 != t.type && 3 != t.type)
    if (2 != t.type)
      if (-1 != t.type) {
        "打开氛围灯" === e.value &&
          isEchoVer(1500) &&
          setTimeout(function () {
            sendAction(4, 67, 0, null);
          }, 500);
        var n = function () {
          sendConfiguredAction(t);
        };
        "小讯收藏" === e.value ||
        "喜欢的歌" === e.value ||
        "个性电台" === e.value
          ? showAppConfirm("点播" + e.value + "？", n)
          : showAppConfirm(e.value + "？", n);
      } else onItemClick(e, t, i);
    else onToggleClick(e, t, i);
  else onInputClick(e, t, i);
}
function onInputClick(e, t, i) {
  if ("" !== i.value && "设置氛围灯光颜色" === e.value) {
    var n = parseInt(i.value, 10);
    isNaN(n) || (0 === n && -1 === i.value.toLowerCase().indexOf("0x"))
      ? ((i.value = ""), (t.err = "请输入正确的十六进制颜色！"))
      : (i.value = n);
  }
  if (!i.value) {
    var a = getCurrentValueTip(e.value);
    if ((a && (t.err = a + "\r\n" + t.err), t.err)) {
      var o = $("#text");
      return (
        o && (o.value = "[" + e.value + "]:" + t.err),
        void createTextWindow(e.value, t.err, function () {
          i.focus();
        })
      );
    }
  }
  var s = t.input.split(".");
  if (s.length > 1) {
    for (var r = [], l = 0; l < s.length; l++)
      0 === l
        ? ((r[l] = t.param[s[l]]),
          "object" != typeof r[l] && (r[l] = JSON.parse(r[l])))
        : (r[l] = r[l - 1][s[l]]);
    var u = s.length - 1;
    (r[u] ? (r[u - 1][s[u]] += i.value) : (r[u - 1][s[u]] = i.value),
      (t.param[s[0]] = r[0]));
  } else
    t.param[t.input]
      ? (t.param[t.input] += i.value)
      : (t.param[t.input] = i.value);
  var c = function () {
    var n = JSON.parse(JSON.stringify(t.param));
    "执行shell" !== e.value && (i.value = "");
    var a = $("#text");
    (a && (a.value = "[" + e.value + "]:请稍候。。。"),
      (n.type_id = e.value),
      (n.type = t.ws_type),
      sendWs(n));
  };
  "执行指令" !== e.value
    ? c()
    : showAppConfirm("确定要执行以下指令吗？\r\n" + i.value, c);
}
function getCurrentValueTip(e) {
  var t = state.info;
  if ("修改小讯唤醒词" === e)
    return (
      "当前小讯唤醒词为：\r\n" +
      (t.main_wakeup_word || []).concat("小讯小讯").join("\r\n")
    );
  if ("修改设备名" === e)
    return null != t.device_name ? "当前设备名为：" + t.device_name : null;
  if ("设置氛围灯亮度" === e)
    return null != t.music_light_luma
      ? "当前亮度为：" + t.music_light_luma
      : null;
  if ("设置颜色渐变速度" === e)
    return null != t.music_light_chroma
      ? "当前渐变速度为：" + t.music_light_chroma
      : null;
  if ("设置氛围灯光颜色" === e) {
    if (null != t.music_light_color) {
      for (var i = t.music_light_color.toString(16); i.length < 6;) i = "0" + i;
      return "当前灯光颜色为：0x" + i.toUpperCase();
    }
    return null;
  }
  if ("修改小爱唤醒词" === e) {
    var n = state.unisoundInfo.Wakeup_Xiaoai_Word;
    return n && n.length ? "当前小爱唤醒词为：\r\n" + n : null;
  }
  return null;
}
function onToggleClick(e, t, i) {
  var n = t.title.indexOf(e.value);
  if ((-1 === n && (n = 0), 0 == t.state[0] || 2 == t.state[0])) {
    var a = t.tips ? t.tips[n] : e.value,
      o = function () {
        var e = {};
        for (var i in t.param[n])
          Object.prototype.hasOwnProperty.call(t.param[n], i) &&
            (e[i] = t.param[n][i]);
        ((e.type = t.ws_type),
          t.tips &&
            ((e.type_id = t.tips[n]),
            state.tips_data || (state.tips_data = {}),
            (state.tips_data[e.type_id] = t.succ ? t.succ[n] : null)),
          sendWs(e));
      };
    0 != t.state[0] || "info.music_light_mode" !== t.state[1]
      ? showAppConfirm(a + "？", o)
      : o();
  } else if (1 == t.state[0]) {
    if ("" === i.value && t.err) {
      var s = $("#text");
      return void (s && (s.value = "[" + e.value + "]:" + t.err[n]));
    }
    sendWs(
      JSON.parse(
        JSON.stringify(t.param[n]).replace("${" + t.input[n] + "}", i.value[n]),
      ),
    );
  }
  sendWs({ type: "get_info" });
}
function onItemClick(e, t, i) {
  var n = t.itemType;
  if ("set_background" !== n)
    if ("miplay_group" !== n)
      if ("miplay_adv" !== n)
        if (
          ("reboot_unisound" === n &&
            showAppConfirm("确定要重启小讯吗？", function () {
              var e = showFlowNotice(
                  "unisound",
                  "重启小讯",
                  "正在重启小讯，请稍候。",
                ),
                t = state.ws;
              ((state.unisoundSkipCheck = null),
                runShell(
                  "/system/bin/am force-stop com.phicomm.speaker.device",
                ),
                setTimeout(function () {
                  t === state.ws &&
                    t &&
                    t.readyState === WebSocket.OPEN &&
                    (runShell(
                      "/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity",
                    ),
                    setTimeout(function () {
                      ui.flowNotice === e &&
                        t === state.ws &&
                        (clearFlowNotice("unisound"),
                        showAppAlert("重启完毕！"));
                    }, 1e4));
                }, 3e3));
            }),
          "reboot" !== n)
        )
          if ("open_net_config" !== n) {
            if ("upload_page" === n) {
              var a = new URL(
                  location.href.indexOf(state.controlHost) > -1
                    ? "http://" + state.ip + "/upload"
                    : "/upload",
                  location.href,
                ),
                o = "",
                s = null,
                r = "",
                l = 0;
              try {
                ((r = getBackgroundData()),
                  (l = Number(
                    localStorage.getItem(state.hostname + "_BackgroundBlur") ||
                      "0",
                  )));
              } catch (y) {}
              if (
                (("string" != typeof r || r.length > 2097152) && (r = ""),
                r &&
                  !/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(
                    r,
                  ))
              )
                try {
                  var u = new URL(r);
                  (!/^https?:$/.test(u.protocol) ||
                    u.username ||
                    u.password ||
                    /\.svg$/i.test(u.pathname) ||
                    /[\x00-\x20<>]/.test(r)) &&
                    (r = "");
                } catch (_) {
                  r = "";
                }
              l = isFinite(l) ? Math.max(0, Math.min(60, l)) : 0;
              try {
                var c = new Uint8Array(16);
                window.crypto.getRandomValues(c);
                for (var d = 0; d < c.length; d++)
                  o += ("0" + c[d].toString(16)).slice(-2);
                a.hash =
                  "echo-upload-background=" +
                  encodeURIComponent(
                    JSON.stringify({ nonce: o, origin: location.origin }),
                  );
              } catch (b) {}
              var p = Date.now() + 15e3,
                m = null;
              function f() {
                (window.removeEventListener("message", h),
                  window.removeEventListener("pagehide", f),
                  null !== m && clearTimeout(m),
                  (m = null));
              }
              function h(e) {
                var t = e.data;
                if (
                  s &&
                  e.source === s &&
                  e.origin === a.origin &&
                  t &&
                  "echo-upload-background-ready" === t.type &&
                  t.nonce === o
                ) {
                  f();
                  try {
                    s.postMessage(
                      {
                        type: "echo-upload-background",
                        nonce: o,
                        image: r,
                        blur: l,
                      },
                      a.origin,
                    );
                  } catch (e) {}
                }
              }
              (window.addEventListener("message", h),
                window.addEventListener("pagehide", f));
              try {
                32 === o.length && (s = window.open(a.href, "_blank"));
              } catch (k) {}
              return s
                ? void (m = setTimeout(function e() {
                    s.closed || Date.now() >= p
                      ? f()
                      : (m = setTimeout(e, 500));
                  }, 500))
                : (f(),
                  (a.hash = ""),
                  showAppAlert(
                    "新窗口被阻止或不支持背景同步，将在当前页面打开上传页，使用上传页默认背景。",
                  ),
                  void (location.href = a.href));
            }
            if ("connect_page" === n)
              return -1 === location.href.indexOf(state.controlHost)
                ? void (location.href =
                    R1Config.assetUrl("?no_auto_connect"))
                : (history.replaceState(null, "", location.pathname + "?no_auto_connect"),
                  void history.go(0));
            if ("Voice_time_reporting" !== n)
              if ("Auto_restart_device" !== n)
                if ("modify_color" !== n)
                  if ("xiaoai_settings" !== n)
                    if ("reboot_xiaoaiservice" !== n)
                      if ("activation_xiaoai" !== n) {
                        if ("play_local_music" === n) {
                          var g = i.value || "/sdcard/music/",
                            v = "播放[" + g + "]目录下的音乐？";
                          return (
                            2 != state.info.Current_PlayerType ||
                              state.info.Support_Flac ||
                              (v +=
                                "\r\n提示：当前ExoPlayer播放器未安装flac支持库，flac格式音乐将无法正常播放！"),
                            void showAppConfirm(v, function () {
                              sendWs({
                                type: "play_local_music",
                                path: g,
                                play: !0,
                              });
                            })
                          );
                        }
                        "reboot_adbd" !== n
                          ? "reboot_echo" !== n
                            ? "get_song_list" !== n || openSongListWindow()
                            : showAppConfirm(
                                "确定要重启EchoService吗？",
                                function () {
                                  sendWs({ type: "reboot_echo" });
                                },
                              )
                          : showAppConfirm("确定要重启adbd吗？", function () {
                              runShell(
                                "stop adbd && start adbd && echo 1 || echo 0",
                                "reboot_adbd",
                              );
                            });
                      } else
                        showAppConfirm("确定要激活小爱吗？", function () {
                          ((e.value = "正在获取激活id，请稍候。。。"),
                            (e.disabled = !0),
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
            showAppConfirm(
              "确定要打开配网模式吗？\r\n打开后网页控制将断开！",
              function () {
                (sendAction(262144, 1),
                  sendToUnisound({
                    type: "NetworkConfigOutputEvent",
                    status: 1,
                  }),
                  showAppAlert("已打开！\r\n请使用配网工具进行配网！"),
                  (location.href =
                    R1Config.assetUrl("config_wifi/")));
              },
            );
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
function sendConfiguredAction(e) {
  var t = {};
  for (var i in e.param)
    Object.prototype.hasOwnProperty.call(e.param, i) && (t[i] = e.param[i]);
  ((t.type = e.ws_type),
    65536 == t.what &&
      1 == t.arg2 &&
      state.isNewUnisound &&
      isUnisoundVer(1849) &&
      5 == state.unisoundInfo.DeviceStatus &&
      sendToUnisound({ type: "UpdateDeviceStatus", status: 0 }),
    sendWs(t));
}
function updateButtonVisibility() {
  if (ui.buttons.length)
    for (var e = 0; e < ui.buttons.length; e++) {
      var t = ui.buttons[e];
      if ("1" !== t.getAttribute("skip")) {
        var i = JSON.parse(t.getAttribute("data"));
        if (2 != i.type || (0 != i.state[0] && 2 != i.state[0]))
          (3 == i.type || i.state) &&
            (t.style.display = arrIncludes(
              i.state[1] || [],
              getNestedValue(i.state[0]),
            )
              ? ""
              : "none");
        else {
          for (var n = [], a = -1, o = 0; o < i.state[2].length; o++) {
            Array.isArray(i.state[2][o])
              ? (n = n.concat(i.state[2][o]))
              : n.push(i.state[2][o]);
            for (var s = 0; s < n.length; s++)
              if (n[s] == getNestedValue(i.state[1])) {
                a = o;
                break;
              }
            if (-1 !== a) break;
          }
          if (-1 === a) {
            t.style.display = "none";
            continue;
          }
          (2 == i.state[0]
            ? (t.style.display =
                getNestedValue(i.state[3][0]) == i.state[3][1] ? "" : "none")
            : (t.style.display = ""),
            (t.value = i.title[a]));
        }
      }
    }
}
function getNestedValue(e) {
  for (var t = e.split("."), i = state, n = 0; n < t.length; n++) {
    if (null == i) return;
    i = i[t[n]];
  }
  return i;
}
function navigateToPage(e) {
  state.currentPage = e;
  var t = e.getAttribute("data");
  e.value !== t ? showPage("index") : showPage(e.id.substr(9));
  for (var i = $$(".btn"), n = 0; n < i.length; n++)
    "btn_page" === i[n].id.substr(0, 8) &&
      i[n].id !== e.id &&
      (i[n].value = i[n].getAttribute("data"));
  e.value !== t
    ? (e.value = t)
    : (e.value = t.length > 2 ? "返回首页" : "首页");
}
function hideAllPages(e) {
  for (
    var t = ["index"].concat(
        state.pageList.map(function (e) {
          return e[1];
        }),
      ),
      i = 0;
    i < t.length;
    i++
  ) {
    var n = t[i];
    if (n !== e) {
      var a = {
        index: hideIndex,
        music: hideMusic,
        screen: hideScreen,
        sound_effects: hideSoundEffects,
        device_info: hideDeviceInfo,
        bluetooth: hideBluetooth,
      };
      a[n] && a[n]();
    }
  }
}
function showPage(e) {
  ((state.loginIntent || state.loginSession) &&
    (hideLogin(), clearQrCache(), startInfoRefresh()),
    hideAllPages(e));
  for (
    var t = ["index"].concat(
        state.pageList.map(function (e) {
          return e[1];
        }),
      ),
      i = 0;
    i < t.length;
    i++
  ) {
    var n = t[i];
    if (n === e) {
      var a = {
        index: unhideIndex,
        music: unhideMusic,
        screen: unhideScreen,
        sound_effects: unhideSoundEffects,
        device_info: unhideDeviceInfo,
        bluetooth: unhideBluetooth,
      };
      (a[n] && a[n](), localStorage.setItem(state.hostname + "_page", n));
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
          (document.title =
            state.deviceTag + (ui.pageTitle ? ui.pageTitle.innerHTML : "")));
      }),
    ui.musicPanel && (ui.musicPanel.style.display = "block"),
    hidePlaylistOverlay(),
    null != ui.musicBackgroundFrame &&
      cancelAnimationFrame(ui.musicBackgroundFrame),
    (ui.musicBackgroundFrame = requestAnimationFrame(function () {
      ((ui.musicBackgroundFrame = null), updateCoverBackground());
    })));
}
function hideMusic() {
  (null != ui.musicBackgroundFrame &&
    cancelAnimationFrame(ui.musicBackgroundFrame),
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
function startInfoRefresh(e) {
  (stopInfoRefresh(),
    (timers.infoRefresh = setInterval(function () {
      state.ws && sendWs({ type: "get_info" });
    }, e || 1e3)));
}
function stopInfoRefresh() {
  (clearInterval(timers.infoRefresh), (timers.infoRefresh = -1));
}
function updateTtsSpeaker(e) {
  sendWs({
    type: "send_message",
    type_id: "修改发音人",
    what: 65536,
    arg1: 0,
    arg2: 2,
    obj: e,
  });
}
function setMusicSource(e) {
  sendWs({
    type: "send_message",
    type_id: "修改音乐源",
    what: 65536,
    arg1: 0,
    arg2: 4,
    obj: e,
  });
}
var speakerRestoreTimer = -1,
  screenFrameUrl = null,
  screenFrameImage = null,
  screenFrameEpoch = 0,
  screenFrameLoad = null,
  screenFramePendingBlob = null;
function releaseScreenFrameLoad(e) {
  ((e.image.onload = e.image.onerror = null),
    e.url && (URL.revokeObjectURL(e.url), (e.url = null)));
}
function clearScreenFrameUrl() {
  (screenFrameEpoch++, (screenFramePendingBlob = null));
  var e = screenFrameLoad;
  ((screenFrameLoad = null),
    e && (releaseScreenFrameLoad(e), (e.image.src = "")),
    screenFrameImage &&
      ((screenFrameImage.style.visibility = "hidden"),
      (screenFrameImage.src = "")),
    screenFrameUrl && URL.revokeObjectURL(screenFrameUrl),
    (screenFrameUrl = null),
    (screenFrameImage = null));
}
function setScreenFrame(e) {
  var t = $("#screen_img");
  if (
    t &&
    ui.screen &&
    "none" !== ui.screen.style.display &&
    state.ws &&
    state.ws.readyState === WebSocket.OPEN
  )
    if (
      (!screenFrameLoad ||
        (screenFrameLoad.socket === state.ws && screenFrameLoad.target === t) ||
        clearScreenFrameUrl(),
      screenFrameLoad)
    )
      screenFramePendingBlob = e;
    else {
      var i = {
        image: new Image(),
        target: t,
        socket: state.ws,
        epoch: screenFrameEpoch,
        url: null,
        decoding: !1,
      };
      ((screenFrameLoad = i),
        (i.image.onload = function () {
          if (screenFrameLoad === i && !i.decoding)
            if (((i.decoding = !0), "function" == typeof i.image.decode))
              try {
                i.image.decode().then(
                  function () {
                    n(!0);
                  },
                  function () {
                    n(!1);
                  },
                );
              } catch (e) {
                n(!1);
              }
            else n(!0);
        }),
        (i.image.onerror = function () {
          n(!1);
        }));
      try {
        ((i.url = URL.createObjectURL(e)), (i.image.src = i.url));
      } catch (e) {
        n(!1);
      }
    }
  else clearScreenFrameUrl();
  function n(e) {
    if (screenFrameLoad === i && i.epoch === screenFrameEpoch)
      if (
        i.socket === state.ws &&
        i.socket.readyState === WebSocket.OPEN &&
        $("#screen_img") === t &&
        ui.screen &&
        "none" !== ui.screen.style.display
      ) {
        if (e) {
          var n = screenFrameUrl;
          ("function" == typeof updateScreenStageSize &&
            updateScreenStageSize(i.image.naturalWidth, i.image.naturalHeight),
            (screenFrameUrl = i.url),
            (screenFrameImage = t),
            (t.src = i.url),
            (t.style.visibility = "visible"),
            (i.url = null),
            n && URL.revokeObjectURL(n));
        }
        (releaseScreenFrameLoad(i), (screenFrameLoad = null));
        var a = screenFramePendingBlob;
        ((screenFramePendingBlob = null), a && setScreenFrame(a));
      } else clearScreenFrameUrl();
  }
}
function cleanupSpeakerConnection(e) {
  (cancelWsCallbacks(e),
    e === state.ws &&
      (clearFlowNotice(),
      (state.unisoundSkipCheck = null),
      showRebootEchoButton(!1),
      stopLyrics(),
      ui.screen &&
        ui.screen.controller &&
        ui.screen.controller.cancelGestures(),
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
function showConnectionNotice(e, t, i, n) {
  var a = showFlowNotice("connection", e, t);
  a.cancelLabel = "取消连接";
  var o = state.ws && state.ws.readyState === WebSocket.CONNECTING;
  return (
    !i ||
      o ||
      a.retryButton ||
      a.actions.appendChild(
        (a.retryButton = makeFlowButton("立即连接", function () {
          ui.flowNotice !== a ||
            (state.ws && state.ws.readyState === WebSocket.CONNECTING) ||
            (clearTimeout(timers.connect),
            (timers.connect = -1),
            state.ws &&
              state.ws.readyState !== WebSocket.CLOSED &&
              ((state.ws.onclose = function () {}),
              state.ws.close(),
              cleanupSpeakerConnection(state.ws),
              (state.ws = null)),
            i());
        })),
      ),
    n &&
      !a.cancelButton &&
      a.actions.appendChild(
        (a.cancelButton = makeFlowButton(a.cancelLabel, function () {
          ui.flowNotice === a &&
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
            setPageTitle("已" + a.cancelLabel + "，可手动重新连接音箱。"),
            showDisconnectedActions(i || connectSpeaker));
        })),
      ),
    a.cancelButton && (a.cancelButton.value = a.cancelLabel),
    a.retryButton &&
      ((a.retryButton.style.background = "var(--primary-blue)"),
      (a.retryButton.style.display = o ? "none" : "")),
    n &&
      (a.host.onclick = function (e) {
        (e.target !== a.host && e.target !== a.host.content) ||
          a.cancelButton.onclick();
      }),
    a
  );
}
function connectSpeaker() {
  if (!state.ws || state.ws.readyState !== WebSocket.CONNECTING) {
    if (
      (hideDisconnectedActions(),
      resetEchoVersionConfirmation(),
      resetUnisoundAvailability(),
      state.ver < 1 && (state.ver = 1e3),
      ui.pageTitle &&
        "" === ui.pageTitle.innerHTML &&
        setPageTitle("请稍后。。。"),
      ui.main && (ui.main.onclick = function () {}),
      clearTimeout(timers.connect),
      (timers.connect = -1),
      urlParams.del(["no_auto_connect", "connect_ip", "connect_id"]),
      !state.ip)
    ) {
      var e =
        localStorage.getItem("ip") || localStorage.getItem("hostname") || "";
      if (e) {
        var t = e.split(":")[0];
        (IP_PATTERN.test(t) || HOSTNAME_PATTERN.test(t.toLowerCase())) &&
          (state.ip = e.indexOf(":") > -1 ? e : e + ":8080");
      }
    }
    if (!state.ip) {
      var i = location.host;
      (-1 === i.indexOf(":") &&
        (IP_PATTERN.test(i) || HOSTNAME_PATTERN.test(i.toLowerCase())) &&
        (i += ":8080"),
        (state.ip = i));
    }
    if (location.host.indexOf(state.controlHost) > -1) {
      var n = { connect_ip: state.ip };
      (null != state.connectId && (n.connect_id = state.connectId),
        urlParams.put(n));
    }
    (state.ws && state.ws.readyState !== WebSocket.CLOSED) ||
      ((state.ws = createWebSocket("ws://" + state.ip)),
      setPageTitle("正在连接音箱，请稍候。。。"),
      showConnectionNotice(
        "正在连接音箱",
        "正在连接 " + state.ip + "，请稍候。",
        connectSpeaker,
        !0,
      ));
    var a = state.ws;
    a &&
      ((a.onopen = function () {
        if (a === state.ws) {
          if (state.ip) {
            var e = state.ip.split(":")[0];
            IP_PATTERN.test(e)
              ? (localStorage.setItem("ip", e),
                localStorage.removeItem("hostname"))
              : HOSTNAME_PATTERN.test(e.toLowerCase()) &&
                (localStorage.setItem("hostname", e),
                localStorage.removeItem("ip"));
          }
          if (loginFlowActive())
            return (
              !ui.flowNotice ||
                ("connection" !== ui.flowNotice.kind &&
                  "unisound" !== ui.flowNotice.kind) ||
                clearFlowNotice(),
              showRebootEchoButton(!1),
              (state.reload = !1),
              void resumeLoginConnection()
            );
          if (state.initState) {
            ((state.connectInitialized = !0), showRebootEchoButton(!0));
            var t = showFlowNotice(
              "connection",
              "正在初始化",
              "连接音箱成功，正在等待设备初始化，请稍候。",
            );
            (setPageTitle("连接音箱成功，正在初始化。。。"),
              setTimeout(function () {
                a === state.ws &&
                  a.readyState === WebSocket.OPEN &&
                  runShell(
                    "date & ping -w 1 r1service.wxfsq.com",
                    "ping_r1service",
                  );
              }, 600),
              -1 === timers.unisoundInit &&
                isEchoVer(1825) &&
                (timers.unisoundInit = setTimeout(function () {
                  a !== state.ws ||
                    ui.flowNotice !== t ||
                    loginFlowActive() ||
                    ((state.reload = !0), addRecoveryButtons(t.actions));
                }, 6e3)),
              runShell(
                "/system/bin/am start com.phicomm.speaker.device/.ui.MainActivity",
              ),
              resumeLoginConnection() || sendWs({ type: "get_info" }));
          } else
            (clearFlowNotice("connection"),
              setPageTitle("已恢复连接！"),
              resumeLoginConnection() ||
                (ui.musicPanel &&
                  "block" === ui.musicPanel.style.display &&
                  startLyrics(),
                clearTimeout(speakerRestoreTimer),
                (speakerRestoreTimer = setTimeout(function () {
                  if (
                    ((speakerRestoreTimer = -1),
                    a === state.ws &&
                      a.readyState === WebSocket.OPEN &&
                      !loginFlowActive() &&
                      (state.currentPage ||
                        (state.currentPage = $("#btn_page_music")),
                      state.currentPage))
                  ) {
                    var e = state.currentPage.getAttribute("data");
                    e === state.currentPage.value
                      ? setPageTitle("R1音箱控制页面" + state.deviceTag)
                      : ((state.currentPage.value = e),
                        navigateToPage(state.currentPage));
                  }
                }, 1e3)),
                startInfoRefresh()));
        }
      }),
      (a.onclose = function (e) {
        if ((cleanupSpeakerConnection(a), a === state.ws))
          if ((pauseLoginConnection(), 1006 === e.code)) {
            var t = showConnectionNotice(
              "连接已断开",
              "与音箱断开连接，1 秒后自动重试。音箱重启时请稍候。",
              connectSpeaker,
              !0,
            );
            (setPageTitle("与音箱断开连接，1秒后尝试重新连接。。。"),
              clearTimeout(timers.connect),
              (timers.connect = setTimeout(function () {
                ui.flowNotice === t && connectSpeaker();
              }, 1e3)));
          } else
            showConnectionNotice(
              "连接已关闭",
              "与音箱的连接已关闭，可重试连接。",
              connectSpeaker,
              !0,
            );
      }),
      (a.onerror = function () {}),
      (a.onmessage = function (e) {
        a === state.ws &&
          a.readyState === WebSocket.OPEN &&
          ("string" == typeof e.data
            ? (state.connectInitialized &&
                ((state.connectInitialized = !1), showRebootEchoButton(!1)),
              handleMessage(JSON.parse(e.data)))
            : ui.screen && "none" !== ui.screen.style.display
              ? setScreenFrame(e.data)
              : (clearScreenFrameUrl(), stopScreenCapture()));
      }));
  }
}
function showRebootEchoButton(e) {
  (clearTimeout(timers.rebootEcho),
    removeEl($("#RebootEcho_btn")),
    e &&
      !loginFlowActive() &&
      (timers.rebootEcho = setTimeout(function () {
        if (!loginFlowActive()) {
          var e = makeFlowButton("重启echo", function () {
            ((this.value = "重启中。。。"),
              (this.disabled = !0),
              sendWs({ type: "reboot_echo" }));
          });
          e.id = "RebootEcho_btn";
          var t = ui.flowNotice;
          t && "connection" === t.kind && t.actions.appendChild(e);
        }
      }, 3e3)));
}
function openVersionInfo() {
  (createTextWindow(null, getVersionInfo()),
    ui.popup && (ui.popup._versionInfo = !0));
}
function closeVersionInfoWindow() {
  for (var e = popupRenderHosts.length - 1; e >= 0; e--) {
    var t = popupRenderHosts[e];
    t._versionInfo && t._popupOpen && closePopupAnimated(t);
  }
}
function getVersionInfo() {
  var e,
    t = state.unisoundInfo.xiaoai_vercode;
  if ("number" == typeof t && t > 0) {
    var i = String(t);
    e =
      t > 1e5
        ? "小爱Lite版本：" + i.substring(1).replace(/(\d{3})(?=\d)/g, "$1.")
        : "多亲小爱版本：" + i[0] + "." + i[1] + "." + i.substring(2);
  }
  var n =
      !state.isNewUnisound || state.uVer < 1001
        ? "未知"
        : state.uVer.toString().split("").join("."),
    a = [],
    o = "new_EchoService版本：" + state.ver.toString().split("").join(".");
  (state.version.echo > state.ver &&
    (o += " <a href=\"javascript:app_down('echo');\">下载新版本</a>"),
    a.push(o),
    a.push(
      "new_EchoService编译时间：" +
        formatBuildTimestamp(getConfirmedBuildTimestamp()),
    ));
  var s,
    r = "new_Unisound版本：" + n;
  (state.isNewUnisound &&
    state.version.unisound > state.uVer &&
    (r += " <a href=\"javascript:app_down('unisound');\">下载新版本</a>"),
    a.push(r),
    a.push("WEB页面版本：" + state.version.web.toString().split("").join(".")),
    e && a.push(e),
    window.plus
      ? ((s = "APP版本：" + plus.runtime.version),
        state.version.app > plus.runtime.versionCode &&
          (s += ' <a href="javascript:app_down();">下载新版本</a>'))
      : (s =
          '<a href="javascript:app_down();">点击下载R1音箱控制器_' +
          state.version.app.toString().split("").join(".") +
          ".apk</a>"),
    a.push(s),
    a.push("--------------------"),
    a.push("提示："),
    a.push("双击音量条或标题可解锁音量调节！"),
    a.push("双击封面可切换多行滚动歌词！"),
    a.push("禁用无用的服务可降低资源占用！"),
    a.push("--------------------"),
    a.push("---WEB更新日志---"));
  for (var l = [], u = CHANGELOG.length - 1; u >= 0; u--) l.push(CHANGELOG[u]);
  return (a.push(l.join("\r\n")), a.join("\r\n"));
}
function app_down(e) {
  var t;
  if (
    (t =
      "echo" === e
        ? state.downids.echo
        : "unisound" === e
          ? state.downids.unisound
          : state.downids.app)
  )
    if (window.plus) {
      var i = plus.webview.create();
      i.overrideUrlLoading({ mode: "reject" }, function (e) {
        plus.runtime.openURL(e.url);
      });
      var n = new plus.net.XMLHttpRequest();
      (n.open("GET", state.downurl + t),
        n.setRequestHeader("user-Agent", "Mozilla/5.0"),
        (n.onreadystatechange = function () {
          4 === n.readyState &&
            200 === n.status &&
            (i.loadData(n.responseText, { baseURL: state.downurl + t }),
            i.show());
        }),
        n.send());
    } else location.href = "https://r1.wxfsq.com/lanzou.php?id=" + t;
  else showAppAlert("暂无下载地址");
}
function updateDeviceList(e) {
  for (
    var t = JSON.parse(localStorage.getItem("device_list") || "[]"),
      i = -1,
      n = 0;
    n < t.length;
    n++
  )
    if (t[n].hostname === e.hostname) {
      i = n;
      break;
    }
  if (-1 !== i)
    for (var a in e)
      Object.prototype.hasOwnProperty.call(e, a) &&
        null != e[a] &&
        e[a] !== t[i][a] &&
        (t[i][a] = e[a]);
  else t.push(e);
  localStorage.setItem("device_list", JSON.stringify(t));
}
function handleIpInput(e) {
  var t = e && null != e.value ? String(e.value) : "",
    i = $("#device_list"),
    n = $("#get_ip_btn");
  if (i) {
    for (var a = 0; a < i.length; a++) {
      var o = i[a].getAttribute("hostname"),
        s = o ? String(o).toLowerCase() : "",
        r = t.split(":")[0];
      if (r.toLowerCase() === s || r === i[a].getAttribute("ip")) {
        ((i[a].selected = !0),
          (state.hostname = o),
          setBackgroundCss(
            localStorage.getItem(state.hostname + "_background") ||
              DEFAULT_BACKGROUND,
          ),
          updateStatusBar());
        var l = i[a].getAttribute("device_sid");
        n &&
          n.style &&
          (n.setAttribute("device_sid", l || ""),
          (n.style.display = l ? "inline-block" : "none"));
        var u = i[a].getAttribute("connect_id");
        return void e.setAttribute(
          "connect_id",
          "undefined" === u ? "" : u || "",
        );
      }
    }
    (n && n.style && (n.style.display = "none"),
      (i.value = ""),
      setBackgroundCss(DEFAULT_BACKGROUND),
      updateStatusBar());
  } else n && n.style && (n.style.display = "none");
}
function renderConnectPage() {
  ((document.title = "R1音箱连接页面"),
    setPageTitle("请输入音箱IP进行连接！"),
    ui.pageTitle &&
      (ui.pageTitle.ondblclick = function () {
        ((this.ondblclick = function () {}), loadConsole());
      }));
  var e = makeEl("div", { id: "custom_ip_page" }),
    t = localStorage.getItem("ip") || localStorage.getItem("hostname") || "";
  (-1 != state.connectIp && (t = state.connectIp),
    t && t.indexOf(":") > -1 && (t = t.substring(0, t.indexOf(":"))));
  var i = null;
  state.controlHost.indexOf("r1.wxfsq.com") > -1 &&
    window.jQuery &&
    window.jQuery.ajax({
      async: !1,
      type: "POST",
      url: "./ip",
      data: { type: "list" },
      dataType: "json",
      success: function (e) {
        1 == e.code && (i = e.list);
      },
    });
  var n = null;
  if (i) {
    (setPageTitle("请选择或输入音箱IP进行连接！"),
      e.appendChild(makeText("设备：")),
      (n = makeEl("select", {
        id: "device_list",
        style:
          "display:block;margin:10px auto;width:70%;height:50px;font-size:16px;border-radius:15px",
      })));
    for (var a = 0; a < i.length; a++)
      (function (e, i) {
        var a = makeEl("option", { value: i, html: e.dev_name || e.hostname });
        (a.setAttribute("hostname", e.hostname),
          a.setAttribute("ip", e.ip || ""),
          a.setAttribute("device_sid", e.device_sid || ""),
          a.setAttribute("connect_id", e.device_msid || ""),
          n.appendChild(a));
        var o = t ? String(t).toLowerCase() : "",
          s = e.hostname ? String(e.hostname).toLowerCase() : "";
        (e.ip === t ||
          s === o ||
          (null != state.connectId && state.connectId === e.device_msid)) &&
          (t = e.ip || e.hostname);
      })(i[a], a);
    ((n.value = ""),
      (n.onchange = function () {
        var e = $("#input");
        if (e) {
          var t = this[parseInt(this.value, 10)];
          t &&
            ((e.value = t.getAttribute("ip")
              ? t.getAttribute("ip")
              : t.getAttribute("hostname")),
            e.setAttribute("connect_id", t.getAttribute("connect_id") || ""),
            handleIpInput(e));
        }
      }),
      e.appendChild(n));
  } else state.connectId = null;
  e.appendChild(makeText("IP(不需要输入端口)："));
  var o = makeEl("input", { type: "text", id: "input" });
  ((o.oninput = function () {
    handleIpInput(this);
  }),
    e.appendChild(o),
    e.appendChild(
      makeButton("连接音箱", function () {
        testSpeakerConnection();
      }),
    ),
    e.appendChild(
      makeButton(
        "获取IP并连接",
        function () {
          fetchAndConnectIp();
        },
        { id: "get_ip_btn", style: "display:none" },
      ),
    ));
  var s = makeButton(
      "切换设备名连接",
      function () {
        showAppConfirm("切换后将使用设备名连接音箱，是否继续？", function () {
          (localStorage.setItem("ip_connect", !1), location.reload());
        });
      },
      { style: "display:none" },
    ),
    r = makeEl("div");
  (r.appendChild(s),
    e.appendChild(r),
    e.appendChild(
      makeButton("进入新UI", function () {
        location.href = "./newui/?" + Date.now();
      }),
    ),
    e.appendChild(
      makeButton("进入配网页面", function () {
        location.href = "./config_wifi/?" + Date.now();
      }),
    ),
    window.plus &&
      (e.appendChild(
        makeButton("进入ADB控制台", function () {
          openAdb();
        }),
      ),
      e.appendChild(
        makeButton("进入设备扫描控制台", function () {
          openDeviceScan();
        }),
      )),
    e.appendChild(makeDiv("height:10px")),
    ui.container && ui.container.appendChild(e));
  var l = t ? String(t).toLowerCase() : "";
  if (t && (IP_PATTERN.test(t) || HOSTNAME_PATTERN.test(l))) {
    if (((o.value = t), -1 === location.href.indexOf("no_auto_connect"))) {
      var u,
        c = function () {
          if (ui.flowNotice === u) {
            ui.main && (ui.main.onclick = function () {});
            var e = $("#get_ip_btn");
            e && "none" !== e.style.display
              ? fetchAndConnectIp()
              : testSpeakerConnection();
          }
        };
      ((u = showConnectionNotice(
        "自动连接上次设备",
        "2 秒后自动连接 " + t + "，也可以立即连接或取消。",
        c,
        !0,
      )),
        (timers.connect = setTimeout(c, 2e3)));
    }
  } else i && n && "" === n.value && ((n.value = 0), fireEvent(n, "change"));
  (o.value ? handleIpInput(o) : setBackgroundCss(DEFAULT_BACKGROUND),
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
function attemptSpeakerConnection(e) {
  if (!state.ws || state.ws.readyState !== WebSocket.CONNECTING) {
    hideDisconnectedActions();
    var t = $("#input");
    if (t) {
      var i = (null == t.value ? "" : String(t.value)).replace(
        /^\s+|\s+$/g,
        "",
      );
      if (
        (i.indexOf("://") > -1 && (i = i.substring(i.indexOf("://") + 3)),
        i.indexOf(":") > -1 &&
          /\d+\.\d+\.\d+\.\d+/.test(i) &&
          (i = i.substring(0, i.indexOf(":"))),
        (i = i.replace(/\/.*$/, "")),
        (state.ip = i),
        state.ip)
      )
        if (
          IP_PATTERN.test(state.ip) ||
          HOSTNAME_PATTERN.test(state.ip.toLowerCase())
        ) {
          var n = IP_PATTERN.test(state.ip);
          if (
            (state.ws &&
              (clearTimeout(timers.connectTimeout),
              (timers.connectTimeout = -1),
              (state.ws.onclose = function () {}),
              state.ws.close(),
              cleanupSpeakerConnection(state.ws),
              (state.ws = null)),
            ui.main && (ui.main.onclick = function () {}),
            setPageTitle("请稍候，正在连接音箱。。。"),
            (state.ip = state.ip + ":8080"),
            e && -1 === location.search.indexOf("no_jump"))
          )
            return (
              showConnectionNotice(
                "正在跳转音箱",
                "正在打开 " + state.ip + "，请稍候。",
                null,
                "取消连接",
              ),
              void setTimeout(function () {
                (n
                  ? (localStorage.removeItem("hostname"),
                    localStorage.setItem("ip", i))
                  : (localStorage.removeItem("ip"),
                    localStorage.setItem("hostname", i)),
                  (location.href = "http://" + state.ip + "/?no_jump"));
              }, 100)
            );
          state.ws = createWebSocket("ws://" + state.ip);
          var a = state.ws;
          (showConnectionNotice(
            "正在连接音箱",
            "正在连接 " + state.ip + "，请稍候。",
            testSpeakerConnection,
            "取消连接",
          ),
            (state.ws.onopen = function () {
              if (state.ws === a) {
                var e = $("#input");
                ((state.connectId =
                  (e && e.getAttribute("connect_id")) || null),
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
                  n
                    ? (localStorage.removeItem("hostname"),
                      localStorage.setItem("ip", i))
                    : (localStorage.removeItem("ip"),
                      localStorage.setItem("hostname", i)),
                  initLogin(),
                  connectSpeaker(),
                  sendWs({ type: "get_info" }),
                  removeEl($("#custom_ip_page")));
              }
            }),
            (state.ws.onclose = function (e) {
              state.ws === a &&
                (clearTimeout(timers.connectTimeout),
                (state.testConnectState = !0),
                1006 === e.code &&
                  (cleanupSpeakerConnection(state.ws),
                  clearFlowNotice("connection"),
                  setPageTitle("请输入音箱IP进行连接！"),
                  showAppAlert(
                    "连接音箱失败，请确保已安装new_EchoService到音箱！\n请检查音箱IP是否正确或重启音箱再试！",
                  )));
            }),
            clearTimeout(timers.connectTimeout),
            (timers.connectTimeout = setTimeout(function () {
              state.ws !== a ||
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
        } else
          showAppAlert("请输入正确的IP！\n例如：192.168.1.100（不需要加端口）");
      else showAppAlert("请输入正确的IP！");
    } else showAppAlert("请先输入音箱IP！");
  }
}
function createWebSocket(e) {
  try {
    return new WebSocket(e);
  } catch (t) {
    "https:" === location.protocol &&
      urlParams.put({ connect_ip: e.substring(5), noCheckPermission: 1 });
  }
}
var permissionStatus = null,
  currentPermission = "unknown";
function isLocalHostAccess() {
  var e = location.hostname;
  return (
    !!e &&
    (!!IP_PATTERN.test(e) ||
      !!HOSTNAME_PATTERN.test(e.toLowerCase()) ||
      "localhost" === e ||
      0 === e.indexOf("127."))
  );
}
function initLocalNetworkPermission() {
  if (isLocalHostAccess()) currentPermission = "granted";
  else {
    var e = urlParams.get("noCheckPermission");
    if (
      (!e || 1 != e.noCheckPermission) &&
      navigator.permissions &&
      navigator.permissions.query
    )
      try {
        var t = navigator.permissions.query({ name: "local-network-access" });
        t &&
          "function" == typeof t.then &&
          t.then(
            function (e) {
              ((permissionStatus = e),
                applyPermissionState(e.state),
                (e.onchange = function () {
                  applyPermissionState(e.state);
                }));
            },
            function () {},
          );
      } catch (e) {}
  }
}
function applyPermissionState(e) {
  ((currentPermission = e),
    "denied" === e &&
      (urlParams.put({ no_auto_connect: 1 }),
      showAppAlert(
        '⚠️ 本地网络访问权限已被拒绝。\n\n要连接R1音箱，请按以下步骤手动开启：\n1. 点击地址栏左侧的锁图标\n2. 找到"本地网络访问"\n3. 设置为"允许"\n\n更改后页面将自动恢复连接功能。',
      )));
}
function requestAndConnect(e) {
  "granted" !== currentPermission
    ? "prompt" !== currentPermission
      ? "denied" !== currentPermission
        ? e()
        : e(!0)
      : showAppConfirm(
          '即将连接R1音箱，浏览器将请求"本地网络访问"权限。\n\n请在弹出的权限提示中点击"允许"。',
          function () {
            e();
          },
        )
    : e();
}
function ScreenController(e, t) {
  if (!e || "IMG" !== e.tagName) throw new Error("需要 img 元素");
  ((t = t || {}),
    (this.img = e),
    (this.longPressDelay = t.longPressDelay || 500),
    (this.moveThreshold = t.moveThreshold || 8),
    (this.targetResolution = t.targetResolution || { width: 720, height: 480 }),
    (this.touches = {}),
    (this.mouseActive = !1),
    (this.mouseState = null),
    (this._ignoreMouseUntil = 0),
    (this._lastInputSource = ""),
    (this._rightMouseIntent = !1),
    (this._wheelTime = 0));
  var i = this;
  ((this._onPointerDown = function (e) {
    i.onPointerDown(e);
  }),
    (this._onTouchStart = function (e) {
      i.onTouchStart(e);
    }),
    (this._onTouchMove = function (e) {
      i.onTouchMove(e);
    }),
    (this._onTouchEnd = function (e) {
      i.onTouchEnd(e);
    }),
    (this._onTouchCancel = function (e) {
      i.onTouchCancel(e);
    }),
    (this._onMouseDown = function (e) {
      i.onMouseDown(e);
    }),
    (this._onMouseMove = function (e) {
      i.onMouseMove(e);
    }),
    (this._onMouseUp = function (e) {
      i.onMouseUp(e);
    }),
    (this._onWheel = function (e) {
      i.onWheel(e);
    }),
    (this._onContextMenu = function (e) {
      i.onContextMenu(e);
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
    (this.ClientBuilder = plus.android.importClass(
      "dc.squareup.okhttp3.OkHttpClient$Builder",
    )),
    (this.RequestBuilder = plus.android.importClass(
      "dc.squareup.okhttp3.Request$Builder",
    )),
    (this.TimeUnit = plus.android.importClass("java.util.concurrent.TimeUnit")),
    (this.BitmapFactory = plus.android.importClass(
      "android.graphics.BitmapFactory",
    )),
    (this.Handler = plus.android.importClass("android.os.Handler")),
    (this.Looper = plus.android.importClass("android.os.Looper")));
  try {
    var e = plus.android.importClass("android.os.StrictMode"),
      t = plus.android.importClass("android.os.StrictMode$ThreadPolicy");
    e.setThreadPolicy(new t.Builder().permitAll().build());
  } catch (e) {}
}
function compressImageToDataUrl(e, t, i, n, a) {
  var o = new FileReader();
  ((o.onload = function (o) {
    var s = new Image();
    ((s.onload = function () {
      var o = document.createElement("canvas"),
        r = o.getContext("2d"),
        l = s.width,
        u = s.height;
      ((l > 1920 || u > 1920) &&
        (l > u
          ? ((l = 1920), (u = Math.round((1920 * s.height) / s.width)))
          : ((u = 1920), (l = Math.round((1920 * s.width) / s.height)))),
        (o.width = l),
        (o.height = u),
        r.drawImage(s, 0, 0, l, u));
      var c = o.toDataURL("image/jpeg", t),
        d = Math.round(0.75 * c.length);
      d > i && n > 1 && t > 0.1
        ? compressImageToDataUrl(e, t - 0.1, i, n - 1, a)
        : a(c, d);
    }),
      (s.onerror = function () {
        a(null, 0);
      }),
      (s.src = o.target.result));
  }),
    (o.onerror = function () {
      a(null, 0);
    }),
    o.readAsDataURL(e));
}
function createSetBackgroundPage() {
  var e = createDialogPanel("设置背景图片"),
    t = e.body;
  ((t.style.color = "#fff"),
    t.appendChild(makeDiv("height:10px")),
    t.appendChild(makeText("上传图片：")));
  var i = makeEl("input", {
    type: "file",
    accept: "image/*",
    style: "height:30px;width:180px",
  });
  (t.appendChild(i),
    t.appendChild(makeDiv("height:5px")),
    t.appendChild(makeText("图片地址：")));
  var n = makeEl("input", { type: "text", style: "height:30px;width:180px" });
  (t.appendChild(n), t.appendChild(makeDiv("height:5px")));
  var a = makeEl("div");
  a.appendChild(makeText("背景模糊："));
  var o = localStorage.getItem(state.hostname + "_BackgroundBlur");
  (null != o && "" !== o) || (o = 0);
  var s = makeEl("input", {
    id: "BackgroundBlur",
    type: "range",
    min: 0,
    step: 1,
    max: 60,
    style: "width:130px",
    value: o,
  });
  a.appendChild(s);
  var r = makeText(o + "px");
  ((r.id = "BackgroundBlurText"),
    a.appendChild(r),
    s.addEventListener("input", function () {
      var e = this.value;
      (localStorage.setItem(state.hostname + "_BackgroundBlur", e),
        (r.innerHTML = e + "px"),
        ui.background && (ui.background.style.filter = "blur(" + e + "px)"),
        updateStatusBar());
    }),
    t.appendChild(a),
    t.appendChild(makeDiv("height:5px")));
  var l = makeButton(
    "设置背景图片",
    function () {
      var t = this;
      i.value
        ? showAppConfirm("确定要设置新的背景吗？", function () {
            var n = i.files[0];
            n &&
              ((t.disabled = !0),
              (t.value = "正在处理。。。"),
              compressImageToDataUrl(n, 1, 1048576, 10, function (i, n) {
                (e.isOpen() && ((t.disabled = !1), (t.value = "设置背景图片")),
                  i
                    ? (applyBackground(i), e.close())
                    : e.isOpen() &&
                      showAppAlert("抱歉，图片过大，请手动压缩后再上传！"));
              }));
          })
        : n.value
          ? showAppConfirm("确定要设置新的背景吗？", function () {
              (applyBackground(n.value), e.close());
            })
          : showAppAlert("请先选择图片文件或输入图片地址！");
    },
    { style: "margin:5px;padding:10px 23px" },
  );
  (t.appendChild(l),
    t.appendChild(makeEl("div")),
    t.appendChild(
      makeButton(
        "恢复默认背景",
        function () {
          showAppConfirm("确定要恢复默认背景吗？", function () {
            (applyBackground(""), e.close());
          });
        },
        { style: "margin:5px;padding:10px 23px" },
      ),
    ),
    t.appendChild(makeEl("div")),
    t.appendChild(
      makeButton(
        "查看当前背景",
        function () {
          var e = getBackgroundData();
          e
            ? showAppAlert(
                "当前背景：自定义\n" +
                  (e.length > 120 ? e.substring(0, 120) + "..." : e),
              )
            : showAppAlert("当前背景：默认");
        },
        { style: "margin:5px;padding:10px 23px" },
      ),
    ),
    t.appendChild(makeDiv("height:10px")));
}
function initPlusFeatures() {
  if (window.plus && !window._plusReady) {
    ((window._plusReady = !0),
      updateVersionFooter(),
      plus.webview
        .currentWebview()
        .overrideUrlLoading(
          { mode: "allow", match: ".*wxfsq.*|.*:8080.*" },
          function (e) {
            if (/(jq|qm)\.qq\.com/.test(e.url)) {
              var t = plus.webview.create(e.url);
              t.onloaded = function () {
                setTimeout(function () {
                  t.close();
                }, 2e3);
              };
            } else plus.runtime.openURL(e.url);
          },
        ));
    try {
      var e = plus.android.importClass("android.content.Context"),
        t = plus.android.importClass("android.content.Intent"),
        i = plus.android.importClass("android.provider.Settings"),
        n = plus.android.importClass("android.net.Uri"),
        a = plus.android.runtimeMainActivity(),
        o = a.getSystemService(e.POWER_SERVICE);
      "2" === localStorage.getItem("power") ||
        o.isIgnoringBatteryOptimizations(a.getPackageName()) ||
        plus.nativeUI.confirm(
          "是否允许软件后台运行？",
          function (e) {
            if (0 === e.index) {
              var o = new t(i.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
              (o.setData(n.parse("package:" + a.getPackageName())),
                a.startActivity(o));
            } else 1 === e.index && localStorage.setItem("power", "2");
          },
          {
            title: "请求忽略电池优化",
            buttons: ["允许", "拒绝"],
            verticalAlign: "center",
          },
        );
    } catch (e) {}
    try {
      state.notificationManager = new NotificationManager();
    } catch (e) {}
    var s = function () {
      var e = state.notificationManager;
      if (e) {
        var t = e.mediaSession;
        if (((e.mediaSession = null), e.cancelNotification(), t))
          try {
            t.release();
          } catch (e) {}
      }
    };
    try {
      ((plus.android.runtimeMainActivity().onDestroy = s),
        document.addEventListener(
          "pause",
          function () {
            plus.webview.all().length <= 1 && s();
          },
          !1,
        ),
        plus.key.addEventListener(
          "backbutton",
          function () {
            (s(), plus.runtime.quit());
          },
          !1,
        ));
    } catch (e) {}
    updateStatusBar();
  }
}
function loadConsole() {
  if (!$("#console_script")) {
    var e = makeEl("script", {
      id: "console_script",
      src: R1Config.assetUrl("js/vconsole.min.js"),
      onload: function () {
        try {
          window.mVConsole = new window.VConsole();
        } catch (e) {}
      },
      onerror: function () {
        var e = makeEl("script", {
          src: "https://unpkg.com/vconsole@latest/dist/vconsole.min.js",
          onload: function () {
            try {
              window.mVConsole = new window.VConsole();
            } catch (e) {}
          },
        });
        document.head.appendChild(e);
      },
    });
    document.head.appendChild(e);
  }
}
function addNoReferrer() {
  var e = document.createElement("meta");
  ((e.name = "referrer"), (e.content = "never"), document.head.appendChild(e));
}
function loadJQuery() {
  if (window.jQuery)
    try {
      window.jQuery.noConflict();
    } catch (e) {}
  else {
    var e = function () {
        if ((addNoReferrer(), window.jQuery && window.jQuery.noConflict))
          try {
            window.jQuery.noConflict();
          } catch (e) {}
      },
      t = makeEl("script", {
        src: R1Config.assetUrl("jquery-3.6.0.min.js"),
        onload: e,
        onerror: function () {
          var t = makeEl("script", {
            src: "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js",
            onload: e,
          });
          document.head.appendChild(t);
        },
      });
    document.head.appendChild(t);
  }
}
function load() {
  if (!document.body.contains(ui.main)) {
    window.addEventListener("message", function (e) {
      switch (e.data.type) {
        case "save_config":
          for (var t in e.data.config)
            Object.prototype.hasOwnProperty.call(e.data.config, t) &&
              localStorage.setItem(t, e.data.config[t]);
          (localStorage.setItem("config_time", Date.now()),
            e.source.postMessage({ type: "save_config_success" }, e.origin));
          break;
        case "get_config":
          for (
            var i = {}, n = Object.keys(localStorage), a = 0;
            a < n.length;
            a++
          )
            i[n[a]] = localStorage.getItem(n[a]);
          e.source.postMessage({ type: "save_config", config: i }, e.origin);
          break;
        case "update_config":
          e.data.time > (localStorage.getItem("config_time") || 0) &&
            e.source.postMessage({ type: "get_config" }, e.origin);
          break;
        case "save_config_success":
          window.save_config_success && window.save_config_success();
      }
    });
    var e = getparam("type");
    if (e && "message" === e.type) window.onload = function () {};
    else {
      initLocalNetworkPermission();
      var t = document.getElementsByTagName("h3");
      (t.length > 0 && (t[0].innerHTML = "页面加载中。。"),
        (ui.main = makeEl("div", { style: "height:100%" })),
        (ui.container = makeEl("div", {
          id: "divs",
          style: "text-align:center;display:block;margin:0 auto",
        })),
        (ui.pageTitle = makeEl("h3")),
        (ui.popup = createPopupHost({ open: !1 })),
        (ui.background = makeEl("div", {
          id: "background_div",
          style:
            "z-index:-1;position:fixed;left:0;top:0;width:100%;height:100%",
        })),
        document.body.appendChild(ui.main));
      var i = makeEl("div", { id: "StatusBar", style: "display:none" });
      ((ui.statusBar = i),
        ui.main.appendChild(i),
        "string" == typeof baidu_hm_id
          ? ui.main.appendChild(
              makeEl("script", {
                src: "//hm.baidu.com/hm.js?" + baidu_hm_id,
                onload: addNoReferrer,
                onerror: addNoReferrer,
              }),
            )
          : addNoReferrer(),
        location.href.indexOf("debug") > -1 && loadConsole(),
        ui.main.appendChild(ui.container),
        (ui.container.innerHTML = ""),
        ui.container.appendChild(
          makeEl("div", { class: "scroll-container" }, ui.pageTitle),
        ),
        initLogin(),
        ui.container.appendChild(ui.loginPanel),
        loadJQuery());
      var n = makeEl("div", {
        id: "qun_div",
        style:
          window.screen.width > 800
            ? "position:absolute;left:5px;z-index:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40%"
            : "position:absolute;left:5px;z-index:1",
        html: '<a id="qun" target="_blank" href="https://jq.qq.com/?_wv=1027&k=hTbg34eR">交流群：772694950</a>',
      });
      if (
        (ui.main.appendChild(n),
        "string" == typeof beian && window.screen.width > 800)
      ) {
        var a = makeEl("div", { id: "beian_div", style: "position:relative" });
        (a.appendChild(
          makeEl("div", {
            style: "position:absolute;left:0;right:0;text-align:center",
            html:
              '<a target="_blank" href="https://beian.miit.gov.cn/">' +
              beian +
              "</a>",
          }),
        ),
          ui.main.appendChild(a));
      }
      var o = makeEl("div", {
        id: "ver_div",
        style: "position:absolute;right:5px",
        html: '<a href="javascript:app_down();">下载APP</a>',
      });
      (ui.main.appendChild(o),
        updateVersionFooter(),
        ui.main.appendChild(makeEl("div", { style: "height:18px" })));
    }
  }
}
((ScreenController.prototype.setTargetResolution = function (e, t) {
  this.targetResolution = { width: e, height: t };
}),
  (ScreenController.prototype.destroy = function () {
    var e = this.img;
    (e.removeEventListener("pointerdown", this._onPointerDown),
      e.removeEventListener("touchstart", this._onTouchStart),
      e.removeEventListener("touchmove", this._onTouchMove),
      e.removeEventListener("touchend", this._onTouchEnd),
      e.removeEventListener("touchcancel", this._onTouchCancel),
      e.removeEventListener("mousedown", this._onMouseDown),
      e.removeEventListener("wheel", this._onWheel),
      e.removeEventListener("contextmenu", this._onContextMenu),
      this.cancelGestures());
  }),
  (ScreenController.prototype.cancelGestures = function () {
    for (var e = Object.keys(this.touches), t = 0; t < e.length; t++)
      clearTimeout(this.touches[e[t]].longPressTimer);
    (this.mouseState && clearTimeout(this.mouseState.longPressTimer),
      (this.touches = {}),
      (this.mouseActive = !1),
      (this.mouseState = null),
      (this._rightMouseIntent = !1),
      document.removeEventListener("mousemove", this._onMouseMove),
      document.removeEventListener("mouseup", this._onMouseUp));
  }),
  (ScreenController.prototype.eventInputSource = function (e) {
    return (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) ||
      "touch" === e.pointerType
      ? "touch"
      : e.pointerType || "";
  }),
  (ScreenController.prototype.onPointerDown = function (e) {
    var t = this.eventInputSource(e);
    (t && (this._lastInputSource = t),
      (this._rightMouseIntent =
        "mouse" === t &&
        2 === e.button &&
        0 === Object.keys(this.touches).length));
  }),
  (ScreenController.prototype.isTouchMouseEvent = function (e) {
    return (
      "touch" === e.pointerType ||
      (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) ||
      Object.keys(this.touches).length > 0 ||
      Date.now() < this._ignoreMouseUntil
    );
  }),
  (ScreenController.prototype.toNormalized = function (e, t) {
    var i = this.img.getBoundingClientRect(),
      n = Math.max(0, Math.min(i.width, e - i.left)),
      a = Math.max(0, Math.min(i.height, t - i.top));
    return {
      nx: i.width > 0 ? n / i.width : 0,
      ny: i.height > 0 ? a / i.height : 0,
    };
  }),
  (ScreenController.prototype.toDevice = function (e, t) {
    return {
      x: Math.round(e * this.targetResolution.width),
      y: Math.round(t * this.targetResolution.height),
    };
  }),
  (ScreenController.prototype.emit = function (e) {
    "function" == typeof sendAdbInput && sendAdbInput(e);
  }),
  (ScreenController.prototype.onTouchStart = function (e) {
    (!1 !== e.cancelable && e.preventDefault(),
      (this._ignoreMouseUntil = Date.now() + 800),
      (this._lastInputSource = "touch"),
      (this._rightMouseIntent = !1),
      this.mouseState &&
        (clearTimeout(this.mouseState.longPressTimer),
        (this.mouseActive = !1),
        (this.mouseState = null),
        document.removeEventListener("mousemove", this._onMouseMove),
        document.removeEventListener("mouseup", this._onMouseUp)));
    for (var t = 0; t < e.changedTouches.length; t++)
      this.touches[e.changedTouches[t].identifier] ||
        function (e) {
          var t = this.toNormalized(e.clientX, e.clientY),
            i = {
              id: e.identifier,
              startX: e.clientX,
              startY: e.clientY,
              startTime: Date.now(),
              hasMoved: !1,
              longPressed: !1,
              longPressTimer: null,
              startDev: this.toDevice(t.nx, t.ny),
            };
          ((i.longPressTimer = setTimeout(function () {
            i.hasMoved || (i.longPressed = !0);
          }, this.longPressDelay)),
            (this.touches[e.identifier] = i));
        }.call(this, e.changedTouches[t]);
  }),
  (ScreenController.prototype.onTouchMove = function (e) {
    (!1 !== e.cancelable && e.preventDefault(),
      (this._ignoreMouseUntil = Date.now() + 800),
      (this._lastInputSource = "touch"),
      (this._rightMouseIntent = !1));
    for (var t = 0; t < e.changedTouches.length; t++) {
      var i = e.changedTouches[t],
        n = this.touches[i.identifier];
      if (n) {
        var a = i.clientX - n.startX,
          o = i.clientY - n.startY;
        !n.hasMoved &&
          Math.sqrt(a * a + o * o) > this.moveThreshold &&
          ((n.hasMoved = !0), clearTimeout(n.longPressTimer));
      }
    }
  }),
  (ScreenController.prototype.onTouchEnd = function (e) {
    (!1 !== e.cancelable && e.preventDefault(),
      (this._ignoreMouseUntil = Date.now() + 800),
      (this._lastInputSource = "touch"),
      (this._rightMouseIntent = !1));
    for (var t = 0; t < e.changedTouches.length; t++) {
      var i = e.changedTouches[t],
        n = this.touches[i.identifier];
      if (n) {
        clearTimeout(n.longPressTimer);
        var a = this.toNormalized(i.clientX, i.clientY),
          o = this.toDevice(a.nx, a.ny),
          s = Date.now() - n.startTime;
        (n.hasMoved
          ? this.emit(
              "swipe " +
                n.startDev.x +
                " " +
                n.startDev.y +
                " " +
                o.x +
                " " +
                o.y +
                " " +
                Math.max(50, Math.min(1e3, s)),
            )
          : n.longPressed || s >= this.longPressDelay
            ? this.emit(
                "swipe " +
                  n.startDev.x +
                  " " +
                  n.startDev.y +
                  " " +
                  n.startDev.x +
                  " " +
                  n.startDev.y +
                  " " +
                  Math.max(s, this.longPressDelay),
              )
            : this.emit("tap " + o.x + " " + o.y),
          delete this.touches[i.identifier]);
      }
    }
  }),
  (ScreenController.prototype.onTouchCancel = function (e) {
    (!1 !== e.cancelable && e.preventDefault(),
      (this._ignoreMouseUntil = Date.now() + 800),
      (this._lastInputSource = "touch"),
      (this._rightMouseIntent = !1));
    for (var t = 0; t < e.changedTouches.length; t++) {
      var i = e.changedTouches[t].identifier;
      (this.touches[i] && clearTimeout(this.touches[i].longPressTimer),
        delete this.touches[i]);
    }
  }),
  (ScreenController.prototype.onMouseDown = function (e) {
    var t = this.eventInputSource(e);
    if ((t && (this._lastInputSource = t), 2 !== e.button)) {
      if (
        ((this._rightMouseIntent = !1),
        0 === e.button && !this.mouseActive && !this.isTouchMouseEvent(e))
      ) {
        e.preventDefault();
        var i = this.toNormalized(e.clientX, e.clientY);
        this.mouseActive = !0;
        var n = {
            startX: e.clientX,
            startY: e.clientY,
            startTime: Date.now(),
            hasMoved: !1,
            longPressed: !1,
            longPressTimer: null,
            startDev: this.toDevice(i.nx, i.ny),
          },
          a = this;
        ((n.longPressTimer = setTimeout(function () {
          a.mouseState !== n || n.hasMoved || (n.longPressed = !0);
        }, this.longPressDelay)),
          (this.mouseState = n),
          document.addEventListener("mousemove", this._onMouseMove),
          document.addEventListener("mouseup", this._onMouseUp));
      }
    } else
      this._rightMouseIntent =
        0 === Object.keys(this.touches).length &&
        ("mouse" === t ||
          (!t &&
            "touch" !== this._lastInputSource &&
            "pen" !== this._lastInputSource));
  }),
  (ScreenController.prototype.onMouseMove = function (e) {
    if (this.mouseActive && this.mouseState) {
      var t = this.mouseState,
        i = e.clientX - t.startX,
        n = e.clientY - t.startY;
      !t.hasMoved &&
        Math.sqrt(i * i + n * n) > this.moveThreshold &&
        ((t.hasMoved = !0), clearTimeout(t.longPressTimer));
    }
  }),
  (ScreenController.prototype.onMouseUp = function (e) {
    if (this.mouseActive && this.mouseState && 0 === e.button) {
      var t = this.mouseState;
      clearTimeout(t.longPressTimer);
      var i = this.toNormalized(e.clientX, e.clientY),
        n = this.toDevice(i.nx, i.ny),
        a = Date.now() - t.startTime;
      (t.hasMoved
        ? this.emit(
            "swipe " +
              t.startDev.x +
              " " +
              t.startDev.y +
              " " +
              n.x +
              " " +
              n.y +
              " " +
              Math.max(50, Math.min(1e3, a)),
          )
        : t.longPressed || a >= this.longPressDelay
          ? this.emit(
              "swipe " +
                t.startDev.x +
                " " +
                t.startDev.y +
                " " +
                t.startDev.x +
                " " +
                t.startDev.y +
                " " +
                Math.max(a, this.longPressDelay),
            )
          : this.emit("tap " + n.x + " " + n.y),
        (this.mouseActive = !1),
        (this.mouseState = null),
        document.removeEventListener("mousemove", this._onMouseMove),
        document.removeEventListener("mouseup", this._onMouseUp));
    }
  }),
  (ScreenController.prototype.onWheel = function (e) {
    if ((e.preventDefault(), !(Date.now() - this._wheelTime <= 100))) {
      this._wheelTime = Date.now();
      var t = this.toNormalized(e.clientX, e.clientY),
        i = this.toDevice(t.nx, t.ny),
        n = i.y - (e.deltaY > 0 ? 100 : -100);
      this.emit("swipe " + i.x + " " + i.y + " " + i.x + " " + n + " 100");
    }
  }),
  (ScreenController.prototype.onContextMenu = function (e) {
    !1 !== e.cancelable && e.preventDefault();
    var t = this.eventInputSource(e),
      i = this._rightMouseIntent;
    ((this._rightMouseIntent = !1),
      ("touch" !== t && "pen" !== t) || (this._lastInputSource = t),
      !i ||
        2 !== e.button ||
        (t && "mouse" !== t) ||
        Object.keys(this.touches).length > 0 ||
        this.emit("keyevent KEYCODE_BACK"));
  }),
  (ScreenController.prototype.initEvents = function () {
    var e = this.img;
    (e.addEventListener("pointerdown", this._onPointerDown),
      e.addEventListener("touchstart", this._onTouchStart, { passive: !1 }),
      e.addEventListener("touchmove", this._onTouchMove, { passive: !1 }),
      e.addEventListener("touchend", this._onTouchEnd, { passive: !1 }),
      e.addEventListener("touchcancel", this._onTouchCancel, { passive: !1 }),
      e.addEventListener("mousedown", this._onMouseDown),
      e.addEventListener("wheel", this._onWheel, { passive: !1 }),
      e.addEventListener("contextmenu", this._onContextMenu));
  }),
  (NotificationManager.prototype.createChannel = function () {
    try {
      var e = plus.android.runtimeMainActivity(),
        t = plus.android.importClass("android.os.Build"),
        i = plus.android.importClass("android.content.Context"),
        n = plus.android.importClass("android.app.NotificationManager"),
        a = plus.android.importClass("android.app.NotificationChannel"),
        o = plus.android.importClass("android.media.session.MediaSession");
      if (t.VERSION.SDK_INT <= 29) return;
      ((this.mediaSession = new o(e.getApplicationContext(), "MusicSession")),
        this.mediaSession.setFlags(
          o.FLAG_HANDLES_MEDIA_BUTTONS | o.FLAG_HANDLES_TRANSPORT_CONTROLS,
        ));
      var s = new a(this.channelId, this.channelName, n.IMPORTANCE_LOW);
      (s.setShowBadge(!1),
        s.setLockscreenVisibility(1),
        e
          .getSystemService(i.NOTIFICATION_SERVICE)
          .createNotificationChannel(s));
    } catch (e) {
      window.console && console.error;
    }
  }),
  (NotificationManager.prototype.build = function (e) {
    try {
      var t = plus.android.runtimeMainActivity(),
        i = plus.android.importClass("android.app.PendingIntent"),
        n = plus.android.importClass("android.content.Intent"),
        a = plus.android.importClass("android.app.Notification"),
        o = plus.android.importClass("android.app.Notification$MediaStyle"),
        s = new n(t, t.getClass());
      (s.setAction(n.ACTION_MAIN),
        s.addCategory(n.CATEGORY_LAUNCHER),
        s.setFlags(n.FLAG_ACTIVITY_SINGLE_TOP));
      var r = i.getActivity(t, 0, s, i.FLAG_IMMUTABLE),
        l = new a.Builder(t, this.channelId);
      return (
        plus.android.importClass(l),
        plus.android.importClass(t.getResources()),
        l
          .setContentTitle(e || "R1音箱控制器")
          .setSmallIcon(
            t
              .getResources()
              .getIdentifier("icon", "drawable", t.getPackageName()),
          )
          .setContentIntent(r)
          .setOngoing(!0)
          .setStyle(
            new o()
              .setShowActionsInCompactView([])
              .setMediaSession(this.mediaSession.getSessionToken()),
          )
          .setVisibility(a.VISIBILITY_PUBLIC)
          .setPriority(a.PRIORITY_LOW),
        l.build()
      );
    } catch (e) {
      return (window.console && console.error, null);
    }
  }),
  (NotificationManager.prototype.updateNotification = function (e, t) {
    if (this.mediaSession) {
      e = e || {};
      try {
        var i = plus.android.runtimeMainActivity(),
          n = plus.android.importClass("android.content.Context"),
          a = i.getSystemService(n.NOTIFICATION_SERVICE);
        if ((plus.android.importClass(a), !this.currentNotification)) {
          var o = this.build();
          if (!o) return;
          this.currentNotification = o;
        }
        this.musicId = e.id || "";
        var s = plus.android.importClass("android.media.session.PlaybackState"),
          r = plus.android.importClass("android.media.MediaMetadata"),
          l = new r.Builder(),
          u = new s.Builder(),
          c = window.current_lrc_index || 0,
          d = state.lyrics[c];
        if (
          (d && 2 === d.length && e.title
            ? (l.putString(r.METADATA_KEY_TITLE, d[1] || "-"),
              l.putString(
                r.METADATA_KEY_ARTIST,
                (e.title || "") + "-" + (e.artist || ""),
              ))
            : (l.putString(r.METADATA_KEY_TITLE, e.title || "R1音箱控制器"),
              l.putString(r.METADATA_KEY_ARTIST, e.artist || "")),
          l.putString(r.METADATA_KEY_ALBUM, e.album || ""),
          state.apiMusicInfo && this.musicId === state.apiMusicInfo.id)
        )
          try {
            if (this.pic.url !== state.apiMusicInfo.pic) {
              this.pic = { url: state.apiMusicInfo.pic, bitmap: null };
              var p = this;
              new OkHttpImageFetcher().fetchAsync(this.pic.url, function (i) {
                i && ((p.pic.bitmap = i), p.updateNotification(e, t));
              });
            }
            this.pic.bitmap && l.putBitmap(r.METADATA_KEY_ART, this.pic.bitmap);
          } catch (e) {
            window.console && console.error;
          }
        (l.putLong(r.METADATA_KEY_DURATION, parseInt(e.duration || 0, 10)),
          this.mediaSession.setMetadata(l.build()),
          u.setActions(
            s.ACTION_PLAY |
              s.ACTION_PAUSE |
              s.ACTION_SKIP_TO_NEXT |
              s.ACTION_SKIP_TO_PREVIOUS |
              s.ACTION_STOP,
          ),
          u.setState(
            t ? s.STATE_PLAYING : s.STATE_PAUSED,
            parseInt(e.position || 0, 10),
            t ? 1 : 0,
          ),
          this.mediaSession.setPlaybackState(u.build()),
          this.mediaSession.setActive(!0),
          a.notify(this.notificationId, this.currentNotification));
      } catch (e) {
        window.console && console.error;
      }
    }
  }),
  (NotificationManager.prototype.cancelNotification = function () {
    if (this.mediaSession)
      try {
        var e = plus.android.runtimeMainActivity(),
          t = plus.android.importClass("android.content.Context");
        (e.getSystemService(t.NOTIFICATION_SERVICE).cancel(this.notificationId),
          (this.currentNotification = null),
          this.mediaSession.setActive(!1));
      } catch (e) {
        window.console && console.error;
      }
  }),
  (OkHttpImageFetcher.prototype.handler = function () {
    return new this.Handler(this.Looper.getMainLooper());
  }),
  (OkHttpImageFetcher.prototype.fetchAsync = function (e, t) {
    var i = this;
    try {
      var n = new this.ClientBuilder();
      (plus.android.invoke(
        n,
        "connectTimeout",
        this.connectTimeout,
        this.TimeUnit.MILLISECONDS,
      ),
        plus.android.invoke(
          n,
          "readTimeout",
          this.readTimeout,
          this.TimeUnit.MILLISECONDS,
        ));
      var a = plus.android.invoke(n, "build"),
        o = new this.RequestBuilder();
      (plus.android.invoke(o, "url", e), plus.android.invoke(o, "get"));
      var s = plus.android.invoke(
          a,
          "newCall",
          plus.android.invoke(o, "build"),
        ),
        r = plus.android.implements("dc.squareup.okhttp3.Callback", {
          onFailure: function (e, n) {
            i.handler().post(
              plus.android.implements("java.lang.Runnable", {
                run: function () {
                  t && t(null, n.toString());
                },
              }),
            );
          },
          onResponse: function (e, n) {
            try {
              if (!plus.android.invoke(n, "isSuccessful"))
                throw new Error("HTTP " + plus.android.invoke(n, "code"));
              var a = plus.android.invoke(n, "body"),
                o = plus.android.invoke(a, "byteStream"),
                s = i.BitmapFactory.decodeStream(o);
              (plus.android.invoke(o, "close"),
                plus.android.invoke(a, "close"),
                i.handler().post(
                  plus.android.implements("java.lang.Runnable", {
                    run: function () {
                      t && t(s, null);
                    },
                  }),
                ));
            } catch (e) {
              i.handler().post(
                plus.android.implements("java.lang.Runnable", {
                  run: function () {
                    t && t(null, e.message);
                  },
                }),
              );
            }
          },
        });
      plus.android.invoke(s, "enqueue", r);
    } catch (e) {
      t && t(null, e.message);
    }
  }),
  (function () {
    var e = {};
    function t(e, t) {
      var i;
      return function () {
        var n = arguments,
          a = this;
        (clearTimeout(i),
          (i = setTimeout(function () {
            e.apply(a, n);
          }, t)));
      };
    }
    function i(t) {
      var i = t.id || "default",
        n = e[i];
      if (n) {
        (n.rafId && (cancelAnimationFrame(n.rafId), n.destroy()),
          (t._marqueeChecked = null),
          t.removeEventListener("mouseenter", n.pause),
          t.removeEventListener("mouseleave", n.resume),
          n.observer && n.observer.disconnect());
        var a = t.querySelector(".scroll-wrapper");
        if (a) {
          var o = a.querySelector("h3:not(.clone)");
          (o && t.appendChild(o), t.removeChild(a));
        }
        (t.classList.remove("scrolling"), delete e[i]);
      }
    }
    function n(t) {
      var a = t.querySelector("h3:not(.clone)");
      if (a) {
        var o = {
          text: a.textContent,
          width: t.clientWidth,
          textWidth: a.scrollWidth,
        };
        t._marqueeChecked = o;
        var s = new MutationObserver(function () {
          if (a.textContent !== o.text) {
            s.disconnect();
            var e = t.querySelector("h3.clone");
            (e && (e.textContent = a.textContent),
              setTimeout(function () {
                ((t._marqueeChecked = null), i(t), n(t));
              }, 10));
          }
        });
        s.observe(a, { childList: !0, characterData: !0, subtree: !0 });
        var r = 0,
          l = function () {
            if ((r++, !e[t.id || "default"])) {
              var i = t.clientWidth,
                n = a.scrollWidth,
                o = a.offsetWidth;
              i <= 0 || o <= 0
                ? r < 20 && setTimeout(l, 100)
                : n > i &&
                  (function (t, i, n) {
                    if (!i.querySelectorAll("*").length) {
                      var a = t.querySelector(".scroll-wrapper");
                      (a
                        ? (a.innerHTML = "")
                        : (((a = document.createElement("div")).className =
                            "scroll-wrapper"),
                          t.appendChild(a)),
                        a.appendChild(i));
                      var o = a.querySelector(".scroll-gap");
                      (o ||
                        (((o = document.createElement("span")).className =
                          "scroll-gap"),
                        (o.innerHTML = "&nbsp;&nbsp;&nbsp;")),
                        a.appendChild(o));
                      var s = a.querySelector("h3.clone");
                      (s || (s = i.cloneNode(!0)).classList.add("clone"),
                        a.appendChild(s),
                        a.offsetWidth);
                      var r = i.offsetWidth,
                        l = o.offsetWidth;
                      if (!(r <= 0 || l <= 0)) {
                        var u = r + l;
                        t.classList.add("scrolling");
                        var c,
                          d = 0,
                          p = !1,
                          m = null,
                          f = !1,
                          h = function (e) {
                            if (!f && !p) {
                              if (null === m)
                                return (
                                  (m = e),
                                  void (c = requestAnimationFrame(h))
                                );
                              var t = Math.min(e - m, 100);
                              for (d -= (80 * t) / 1e3; d <= -u;) d += u;
                              ((a.style.transform = "translateX(" + d + "px)"),
                                (m = e),
                                (c = requestAnimationFrame(h)));
                            }
                          },
                          g = function () {
                            p ||
                              f ||
                              ((p = !0),
                              c && (cancelAnimationFrame(c), (c = null)),
                              (m = null));
                          },
                          v = function () {
                            p &&
                              !f &&
                              ((p = !1),
                              (m = null),
                              (c = requestAnimationFrame(h)));
                          };
                        (t.addEventListener("mouseenter", g),
                          t.addEventListener("mouseleave", v),
                          (c = requestAnimationFrame(h)),
                          (e[t.id || "default"] = {
                            rafId: c,
                            pause: g,
                            resume: v,
                            clone: s,
                            observer: n,
                            destroy: function () {
                              f = !0;
                            },
                          }));
                      }
                    }
                  })(t, a, s);
            }
          };
        l();
      }
    }
    function a() {
      for (
        var e = document.querySelectorAll(".scroll-container"), t = 0;
        t < e.length;
        t++
      ) {
        e[t].id || (e[t].id = "scroll_" + t);
        var a = e[t].querySelector("h3:not(.clone)"),
          o = e[t]._marqueeChecked;
        (o &&
          a &&
          o.text === a.textContent &&
          o.width === e[t].clientWidth &&
          o.textWidth === a.scrollWidth) ||
          (i(e[t]), n(e[t]));
      }
    }
    (window.addEventListener("resize", t(a, 200)),
      window.addEventListener("orientationchange", t(a, 300)),
      document.addEventListener("visibilitychange", function () {
        document.hidden || (a(), resumeLoginConnection());
      }),
      window.addEventListener("pagehide", pauseLoginConnection),
      window.addEventListener("pageshow", function (e) {
        e.persisted && resumeLoginConnection();
      }),
      "loading" === document.readyState
        ? document.addEventListener("DOMContentLoaded", a)
        : a(),
      window.addEventListener("load", function () {
        setTimeout(a, 300);
      }),
      (window.startScroll = a),
      (window.stopScroll = function () {
        for (
          var e = document.querySelectorAll(".scroll-container"), t = 0;
          t < e.length;
          t++
        )
          i(e[t]);
      }));
  })(),
  (timers.load = setTimeout(load, 1500)),
  (window.onload = function () {
    (clearTimeout(timers.load), (timers.load = null));
    var e = urlParams.all();
    Object.keys(e).length > 0 && urlParams.set(e);
    var t = document.getElementsByTagName("h3");
    t.length > 0 && (t[0].innerHTML = "页面加载中。。。");
    var i = localStorage.getItem("Cover_background_open");
    ((state.coverBackgroundEnabled = null === i || "" === i || "true" === i),
      setTimeout(function () {
        (updateStatusBar(),
          removeEl($("#temp_div")),
          ui.background && document.body.appendChild(ui.background),
          (document.body.style.backgroundColor = "rgba(0,0,0,0.8)"));
        var e = DEFAULT_BACKGROUND;
        if (
          -1 === location.href.indexOf("noimg") &&
          -1 === location.href.indexOf(state.controlHost)
        ) {
          state.hostname = localStorage.getItem("current_hostname") || "";
          var t = localStorage.getItem(state.hostname + "_background");
          t && (e = t);
        }
        if (
          (setBackgroundCss(e),
          document.body.classList.remove("body"),
          setPageTitle("R1音箱控制页面"),
          ui.pageTitle)
        ) {
          var i = ui.pageTitle.clientHeight;
          ui.pageTitle.style.minHeight = (i < 60 ? i : 27) + "px";
        }
        var n = urlParams.get([
          "connect_ip",
          "connect_id",
          "no_auto_connect",
          "ver",
          "u_ver",
        ]);
        (n &&
          Object.prototype.hasOwnProperty.call(n, "u_ver") &&
          urlParams.del("u_ver"),
          n &&
            !n.no_auto_connect &&
            (n.connect_id && (state.connectId = n.connect_id),
            n.connect_ip &&
              ((state.connectIp = n.connect_ip.split(":")[0] || ""),
              IP_PATTERN.test(state.connectIp) ||
                HOSTNAME_PATTERN.test(state.connectIp.toLowerCase()) ||
                (state.connectIp = -1)),
            n.ver && ((state.ver = n.ver), urlParams.del("ver"))),
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
