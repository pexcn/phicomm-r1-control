/**
 * R1 应用外壳：导航 / 顶栏 / 弹层路由 / 迷你播放条 / 启动流程
 * 页面实现分别在 music-panel.js 与 device-panel.js（挂载到 window.R1Panels）。
 */
(function (global) {
  "use strict";

  var h = R1UI.h,
    Icon = R1UI.Icon,
    Button = R1UI.Button,
    IconBtn = R1UI.IconBtn;
  var QQAvatar = R1UI.QQAvatar;
  var Pill = R1UI.Pill,
    Chip = R1UI.Chip,
    Modal = R1UI.Modal,
    Empty = R1UI.Empty;
  var Input = R1UI.Input,
    Row = R1UI.Row,
    Spinner = R1UI.Spinner;
  var ToastHost = R1UI.ToastHost,
    ConfirmHost = R1UI.ConfirmHost;
  var useState = React.useState,
    useEffect = React.useEffect;
  var r1Core = R1Core;
  var r1Panels = R1Panels || (global.R1Panels = {});

  var NAV = [
    { key: "music", label: "音乐", icon: "music" },
    { key: "screen", label: "屏幕", icon: "monitor" },
    { key: "sound", label: "音效", icon: "sliders" },
    { key: "bluetooth", label: "蓝牙", icon: "bluetooth" },
    { key: "device", label: "设备", icon: "cpu" },
  ];

  var TITLES = {
    music: "音乐",
    screen: "屏幕",
    sound: "音效",
    bluetooth: "蓝牙",
    device: "设备",
  };

  /* 弹层注册表：type → { 标题, 内容组件, 尺寸, 是否居中 } */
  function sheetConfig(type) {
    var r1Panels2 = R1Panels || {};
    var map = {
      connect: {
        title: "连接 R1 音箱",
        sub: "输入设备地址，或扫描局域网设备",
        Comp: ConnectSheet,
        center: true,
      },
      source: {
        title: "音乐源",
        sub: "切换点播与歌单使用的音源",
        Comp: r1Panels2.SourceSheet,
        center: true,
      },
      light: {
        title: "氛围灯设置",
        sub: "效果 / 亮度 / 渐变速度 / 颜色",
        Comp: r1Panels2.LightSheet,
        center: true,
      },
      tts: {
        title: "选择发音人",
        sub: "设备朗读文本时使用的声音",
        Comp: r1Panels2.TtsSpeakerSheet,
        center: true,
      },
      login: {
        title: "扫码登录",
        sub: "登录音乐账号后可同步歌单与收藏",
        Comp: r1Panels2.LoginSheet,
        size: "wide",
      },
      local: {
        title: "本地音乐",
        sub: "设备本地存储的音频文件",
        Comp: r1Panels2.LocalMusicSheet,
        size: "wide",
      },
      memo: {
        title: "备忘与闹钟",
        sub: "管理设备上的提醒事项",
        Comp: r1Panels2.MemoSheet,
        size: "wide",
      },
      voice: { title: "语音报时", sub: "整点报时与语音设置", Comp: r1Panels2.VoiceSheet },
      restart: { title: "自动重启", sub: "设备定时自检与重启策略", Comp: r1Panels2.RestartSheet },
      advanced: {
        title: "高级工具",
        sub: "DLNA / mDNS / ADB / 配网 / 小爱",
        Comp: r1Panels2.AdvancedSheet,
        size: "wide",
      },
      adb: {
        title: "ADB 控制台",
        sub: "在设备上执行 Shell 命令",
        Comp: r1Panels2.AdbSheet,
        size: "wide",
      },
      settings: {
        title: "设置",
        sub: "外观与使用偏好",
        Comp: r1Panels2.SettingsSheet,
        center: true,
      },
      about: { title: "关于", sub: "版本信息", Comp: r1Panels2.AboutSheet, center: true },
    };
    return map[type] || null;
  }

  /* =====================================================================
   * 连接弹层
   * =================================================================== */
  function ConnectSheet() {
    var store = r1Core.useStore();
    var ipState = useState(""),
      ip = ipState[0],
      setIp = ipState[1];
    var scan = store.scan || { running: false, devices: [], scanned: 0, total: 0 };
    var isHttps = location.protocol === "https:";

    function doConnect(target) {
      var text = String(target != null ? target : ip).trim();
      if (!text) {
        r1Core.toast("请输入设备地址", "err");
        return;
      }
      r1Core.connectTo(text);
    }

    return h(
      "div",
      null,
      h(
        "div",
        { style: { display: "flex", gap: "10px", marginBottom: "14px" } },
        h(Input, {
          value: ip,
          onChange: setIp,
          placeholder: "IP、主机名或 wss://代理地址",
          onKeyDown: function (value) {
            if (value.key === "Enter") doConnect();
          },
        }),
        h(
          Button,
          {
            variant: "primary",
            loading: store.connecting && !store.connected,
            onClick: function () {
              doConnect();
            },
          },
          "连接",
        ),
      ),

      store.connected
        ? h(
            "div",
            { className: "rows", style: { marginBottom: "14px" } },
            h(Row, {
              icon: "wifi",
              accent: true,
              title: "已连接 " + (R1WS.getConnectIp ? R1WS.getConnectIp() : store.lastIp),
              sub: "控制页面已就绪",
              end: h(
                Button,
                {
                  size: "sm",
                  variant: "ghost",
                  onClick: function () {
                    r1Core.disconnect();
                  },
                },
                "断开",
              ),
            }),
          )
        : null,

      /* 局域网扫描 */
      h(
        "div",
        { style: { marginBottom: "14px" } },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" } },
          h(
            Button,
            {
              size: "sm",
              icon: "signal",
              variant: scan.running ? "soft" : "ghost",
              onClick: function () {
                scan.running ? r1Core.stopScan() : r1Core.startScan();
              },
            },
            scan.running ? "停止扫描" : "扫描局域网设备",
          ),
          scan.running
            ? h(
                "span",
                { className: "hint" },
                "已探测 " + scan.scanned + (scan.total ? " / " + scan.total : ""),
              )
            : null,
        ),
        scan.running
          ? h(
              "div",
              { className: "progress-outer", style: { marginBottom: "10px" } },
              h("div", {
                className: "progress-inner",
                style: {
                  width: (scan.total ? Math.round((scan.scanned / scan.total) * 100) : 8) + "%",
                },
              }),
            )
          : null,
        scan.devices.length
          ? h(
              "div",
              { className: "rows" },
              scan.devices.map(function (item, index) {
                return h(Row, {
                  key: index,
                  icon: "wifi",
                  accent: !!item.isR1,
                  title: item.name || "未知设备",
                  sub:
                    item.ip +
                    (item.port ? ":" + item.port : "") +
                    (item.model ? " · " + item.model : ""),
                  onClick: function () {
                    doConnect(item.ip);
                  },
                  end: h(Icon, { name: "chevronR" }),
                });
              }),
            )
          : null,
      ),

      /* 连接历史 */
      store.history && store.history.length
        ? h(
            "div",
            null,
            h("div", { className: "card-title", style: { marginBottom: "8px" } }, "最近连接"),
            h(
              "div",
              { className: "rows" },
              store.history.map(function (item) {
                return h(Row, {
                  key: item.ip,
                  icon: "clock",
                  title: item.ip,
                  sub: new Date(item.time).toLocaleString(),
                  onClick: function () {
                    doConnect(item.ip);
                  },
                  end: h(Icon, { name: "chevronR" }),
                });
              }),
            ),
          )
        : h(
            "div",
            { className: "hint" },
            "不知道 IP？可以先点上面的「扫描局域网设备」，或查看路由器后台的设备列表。",
          ),

      isHttps ? h("div", { className: "divider" }) : null,
      isHttps
        ? h(
            "div",
            { className: "hint" },
            "HTTPS 页面可填写 wss:// 代理地址。直连音箱需要浏览器支持并允许本地网络访问。",
          )
        : null,
    );
  }

  /* =====================================================================
   * 迷你播放条（手机/小平板、非音乐页时显示）
   * =================================================================== */
  function MiniPlayer() {
    var store = r1Core.useStore();
    var sState = useState({
      title: "",
      artist: "",
      cover: "",
      playing: false,
      progress: 0,
      duration: 0,
    });
    var sStateItem = sState[0],
      setS = sState[1];

    r1Core.useR1Event("music_info", function (info) {
      if (!info) return;
      setS(function (previous) {
        return {
          title: info.title || previous.title,
          artist: info.artist || previous.artist,
          cover: info.cover || info.albumUrl || previous.cover,
          playing:
            info.playing !== undefined
              ? !!info.playing
              : info.play_state !== undefined
                ? !!info.play_state
                : previous.playing,
          progress:
            info.position !== undefined
              ? info.position / 1000
              : info.progress !== undefined
                ? info.progress > 10000
                  ? info.progress / 1000
                  : info.progress
                : previous.progress,
          duration:
            info.duration !== undefined
              ? info.duration > 10000
                ? Math.floor(info.duration / 1000)
                : info.duration
              : previous.duration,
        };
      });
    });

    if (!store.connected || !sStateItem.title || store.route === "music") return null;

    var pct = sStateItem.duration
      ? Math.min(100, (sStateItem.progress / sStateItem.duration) * 100)
      : 0;

    return h(
      "div",
      { className: "mini" },
      h(
        "div",
        {
          className: "mini-art",
          style: sStateItem.cover ? { backgroundImage: "url(" + sStateItem.cover + ")" } : null,
        },
        sStateItem.cover ? null : h(Icon, { name: "music" }),
      ),
      h(
        "div",
        {
          className: "mini-main",
          onClick: function () {
            r1Core.goRoute("music");
          },
        },
        h("div", { className: "mini-title" }, sStateItem.title),
        h("div", { className: "mini-artist" }, sStateItem.artist || "R1 音箱"),
      ),
      h(
        "button",
        {
          className: "btn icon sm ghost",
          title: "上一首",
          onClick: function (event) {
            event.stopPropagation();
            try {
              R1WS.musicControl("prev");
            } catch (error) {}
          },
        },
        h(Icon, { name: "prev" }),
      ),
      h(
        "button",
        {
          className: "btn icon sm primary",
          title: sStateItem.playing ? "暂停" : "播放",
          onClick: function (event) {
            event.stopPropagation();
            try {
              sStateItem.playing ? R1WS.musicPause() : R1WS.musicResume();
            } catch (error) {}
            setS(Object.assign({}, sStateItem, { playing: !sStateItem.playing }));
          },
        },
        h(Icon, { name: sStateItem.playing ? "pause" : "play" }),
      ),
      h(
        "button",
        {
          className: "btn icon sm ghost",
          title: "下一首",
          onClick: function (event) {
            event.stopPropagation();
            try {
              R1WS.musicControl("next");
            } catch (error) {}
          },
        },
        h(Icon, { name: "next" }),
      ),
      h("div", { className: "mini-line", style: { width: pct + "%" } }),
    );
  }

  /* =====================================================================
   * 应用外壳
   * =================================================================== */
  function App() {
    var store = r1Core.useStore();

    useEffect(function () {
      r1Core.boot();
    }, []);

    /* 没有历史 IP：直接弹连接；有历史但 7 秒没连上：也弹连接 */
    useEffect(function () {
      if (r1Core.getState().lastIp) {
        var timeoutId = setTimeout(function () {
          if (!r1Core.getState().connected) r1Core.openSheet("connect");
        }, 7000);
        return function () {
          clearTimeout(timeoutId);
        };
      }
      var t2 = setTimeout(function () {
        if (!r1Core.getState().connected) r1Core.openSheet("connect");
      }, 600);
      return function () {
        clearTimeout(t2);
      };
    }, []);

    function connPill() {
      if (store.connected)
        return h(
          Pill,
          { tone: "ok", dot: true },
          R1WS.getConnectIp ? R1WS.getConnectIp() : "已连接",
        );
      if (store.connecting) return h(Pill, { tone: "warn", dot: true, pulse: true }, "连接中…");
      return h(Pill, { tone: "err", dot: true }, "未连接");
    }

    function pageContent() {
      var comp = {
        music: r1Panels.MusicPanel,
        screen: r1Panels.ScreenPanel,
        sound: r1Panels.SoundPanel,
        bluetooth: r1Panels.BluetoothPanel,
        device: r1Panels.DevicePanel,
      }[store.route];
      if (comp) return h(comp);
      return h(
        "div",
        { className: "page-inner narrow" },
        h(
          "div",
          { className: "card pad-lg" },
          h(Empty, {
            icon: "sparkle",
            title: "页面正在加载",
            desc: "如果长时间没有出现，请刷新页面重试。",
            action: h(
              Button,
              {
                variant: "primary",
                onClick: function () {
                  location.reload();
                },
              },
              "刷新",
            ),
          }),
        ),
      );
    }

    var sheet = store.sheet;
    var config = sheet ? sheetConfig(sheet.type) : null;

    return h(
      React.Fragment,
      null,
      /* ---- 网页自定义背景层（设置 → 高级工具 → 自定义背景） ---- */
      store.customBg
        ? h(
            "div",
            { className: "app-bg-layer" },
            h("div", {
              className: "app-bg-image",
              style: { backgroundImage: "url(" + store.customBg + ")" },
            }),
            h("div", { className: "app-bg-overlay" }),
          )
        : null,

      h(
        "div",
        { className: "app" + (store.customBg ? " app-layout-bg" : "") },

        /* ---- 左侧导航（≥900px） ---- */
        h(
          "nav",
          { className: "rail" },
          h("div", { className: "rail-logo" }, h(QQAvatar, { fallback: "R1" })),
          h(
            "div",
            { className: "rail-nav" },
            NAV.map(function (item) {
              return h(
                "button",
                {
                  key: item.key,
                  className: "rail-item" + (store.route === item.key ? " on" : ""),
                  onClick: function () {
                    r1Core.goRoute(item.key);
                  },
                  title: item.label,
                },
                h(Icon, { name: item.icon }),
                h("span", { className: "lbl" }, item.label),
              );
            }),
          ),
          h(
            "div",
            { className: "rail-foot" },
            h(
              "button",
              {
                className: "rail-item" + (sheet && sheet.type === "settings" ? " on" : ""),
                onClick: function () {
                  r1Core.openSheet("settings");
                },
                title: "设置",
              },
              h(Icon, { name: "settings" }),
              h("span", { className: "lbl" }, "设置"),
            ),
          ),
        ),

        /* ---- 主区 ---- */
        h(
          "div",
          { className: "main" },
          h(
            "header",
            { className: "topbar" },
            h(
              "div",
              { style: { minWidth: 0 } },
              h("div", { className: "topbar-title" }, TITLES[store.route] || "R1"),
            ),
            h("div", { className: "topbar-spacer" }),
            h(
              "div",
              { className: "topbar-actions" },
              store.connected
                ? null
                : h(
                    Button,
                    {
                      size: "sm",
                      variant: "soft",
                      icon: "link",
                      onClick: function () {
                        r1Core.openSheet("connect");
                      },
                    },
                    "连接",
                  ),
              connPill(),
              h(IconBtn, {
                icon: "settings",
                title: "设置",
                onClick: function () {
                  r1Core.openSheet("settings");
                },
              }),
            ),
          ),
          /* 音乐页用 page-music：容器锁定，播放器自己管高度（见 player-fix.css） */
          h(
            "main",
            {
              className: "page" + (store.route === "music" ? " page-music" : ""),
              key: store.route,
            },
            pageContent(),
          ),
        ),

        h(MiniPlayer),

        /* ---- 底部标签（<900px） ---- */
        h(
          "nav",
          { className: "tabbar" },
          NAV.map(function (item) {
            return h(
              "button",
              {
                key: item.key,
                className: "tabbar-item" + (store.route === item.key ? " on" : ""),
                onClick: function () {
                  r1Core.goRoute(item.key);
                },
              },
              h(Icon, { name: item.icon }),
              h("span", { className: "lbl" }, item.label),
            );
          }),
        ),

        /* ---- 弹层 ---- */
        config
          ? h(
              Modal,
              {
                open: true,
                title: config.title,
                sub: config.sub,
                size: config.size,
                center: config.center,
                onClose: r1Core.closeSheet,
              },
              config.Comp
                ? h(config.Comp, { payload: sheet.payload })
                : h(Empty, {
                    icon: "sparkle",
                    title: "模块加载中",
                    desc: "该功能模块未成功加载，请刷新页面。",
                  }),
            )
          : null,

        h(ToastHost),
        h(ConfirmHost),
      ),
    );
  }

  global.R1App = App;

  if (document.getElementById("root")) {
    ReactDOM.createRoot(document.getElementById("root")).render(h(App));
  }
})(window);
