/**
 * R1 自绘组件库（无 antd 依赖）
 * 覆盖：图标 / 按钮 / 药丸 / 分段 / 开关 / 滑杆 / 输入 / 列表行 / 卡片 /
 *       空态 / 加载 / 模态（桌面居中、手机底部抽屉）/ 轻提示 / 确认框
 * 全部基于 React UMD 的 createElement，无需编译。
 */
(function (global) {
  "use strict";

  var h = React.createElement;
  var useState = React.useState,
    useEffect = React.useEffect;
  var useRef = React.useRef,
    useCallback = React.useCallback;
  var useMemo = React.useMemo;

  /* ---------- 图标 ----------
   * 统一使用原版 iconify-icon Web Component（iPhone 兼容性最好），
   * name → iconify 图标名映射见 ICONIFY_MAP；
   * CDN 加载失败（window.iconifyIcon 未定义）时自动回退内联 SVG，离线也能用。 */
  var ICONIFY_MAP = {
    music: "mdi:music-note",
    monitor: "mdi:monitor",
    sliders: "mdi:tune-vertical",
    bluetooth: "mdi:bluetooth",
    cpu: "mdi:chip",
    info: "mdi:information-outline",
    grid: "mdi:view-grid-outline",
    play: "mdi:play",
    pause: "mdi:pause",
    prev: "mdi:skip-previous",
    next: "mdi:skip-next",
    repeat: "mdi:repeat",
    repeatOne: "mdi:repeat-one",
    shuffle: "mdi:shuffle-variant",
    heart: "mdi:heart-outline",
    heartFill: "mdi:heart",
    volume: "mdi:volume-high",
    volumeLow: "mdi:volume-medium",
    volumeMute: "mdi:volume-off",
    list: "mdi:format-list-bulleted",
    search: "mdi:magnify",
    mic: "mdi:microphone",
    sun: "mdi:white-balance-sunny",
    moon: "mdi:weather-night",
    settings: "mdi:cog",
    download: "mdi:download",
    upload: "mdi:upload",
    close: "mdi:close",
    back: "mdi:arrow-left",
    chevronL: "mdi:chevron-left",
    chevronR: "mdi:chevron-right",
    chevronD: "mdi:chevron-down",
    chevronU: "mdi:chevron-up",
    check: "mdi:check",
    plus: "mdi:plus",
    minus: "mdi:minus",
    trash: "mdi:trash-can-outline",
    refresh: "mdi:refresh",
    external: "mdi:open-in-new",
    send: "mdi:send",
    wifi: "mdi:wifi",
    smartphone: "mdi:cellphone",
    hdd: "mdi:harddisk",
    terminal: "mdi:console-line",
    keyboard: "mdi:keyboard",
    lightbulb: "mdi:lightbulb-on-outline",
    image: "mdi:image-outline",
    camera: "mdi:camera-outline",
    qrcode: "mdi:qrcode",
    link: "mdi:link-variant",
    power: "mdi:power",
    signal: "mdi:signal",
    box: "mdi:package-variant-closed",
    note: "mdi:note-text-outline",
    user: "mdi:account-outline",
    star: "mdi:star-outline",
    clock: "mdi:clock-outline",
    file: "mdi:file-outline",
    folder: "mdi:folder-outline",
    alert: "mdi:alert-circle-outline",
    loader: "mdi:loading",
    sparkle: "mdi:creation",
    more: "mdi:dots-horizontal",
    globe: "mdi:web",
  };
  function iconifyReady() {
    try {
      return !!(
        window.customElements &&
        window.customElements.get &&
        window.customElements.get("iconify-icon")
      );
    } catch (e) {
      return false;
    }
  }

  function Icon(props) {
    var name = props.name;
    var cls = "ico" + (props.className ? " " + props.className : "");
    var size = props.size || undefined;

    /* 首选：iconify Web Component（与旧版页面同一套图标引擎） */
    if (ICONIFY_MAP[name] && iconifyReady()) {
      return h("iconify-icon", {
        className: cls,
        icon: ICONIFY_MAP[name],
        width: size,
        height: size,
        "aria-hidden": "true",
        onClick: props.onClick,
      });
    }

    /* 兜底：内联 SVG（CDN 失败 / 离线时仍然有图标可用） */
    var def = (global.ICON && global.ICON[name]) || null;
    if (!def) return h("span", { className: cls, style: { width: size, height: size } });
    var paths = def.p.map(function (d, i) {
      return h("path", { key: i, d: d, fill: def.fill ? "currentColor" : "none" });
    });
    return h(
      "svg",
      {
        className: cls,
        viewBox: "0 0 24 24",
        width: size,
        height: size,
        fill: "none",
        stroke: def.fill ? "none" : "currentColor",
        strokeWidth: props.strokeWidth || 1.8,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
        onClick: props.onClick,
      },
      paths,
    );
  }

  /* ---------- 按钮 ---------- */
  function Button(props) {
    var cls =
      "btn" +
      (props.variant ? " " + props.variant : "") +
      (props.size ? " " + props.size : "") +
      (props.block ? " block" : "") +
      (props.iconOnly ? " icon" : "") +
      (props.className ? " " + props.className : "");
    return h(
      "button",
      {
        type: props.type || "button",
        className: cls,
        disabled: props.disabled,
        style: props.style,
        title: props.title,
        onClick: props.onClick,
        onPointerDown: props.onPointerDown,
        onPointerUp: props.onPointerUp,
      },
      props.loading
        ? h("span", { className: "spinner spin-inline" }, h(Icon, { name: "loader" }))
        : props.icon
          ? h(Icon, { name: props.icon })
          : null,
      props.children,
    );
  }

  function IconBtn(props) {
    return h(Button, {
      variant: props.variant,
      size: props.size || "sm",
      iconOnly: true,
      icon: props.icon,
      title: props.title,
      onClick: props.onClick,
      disabled: props.disabled,
      className: props.className,
    });
  }

  /* ---------- 药丸 / 标签 / 分段 ---------- */
  function Pill(props) {
    return h(
      "span",
      {
        className:
          "pill" +
          (props.tone ? " " + props.tone : "") +
          (props.className ? " " + props.className : ""),
      },
      props.dot ? h("i", { className: "dot" + (props.pulse ? " pulse" : "") }) : null,
      props.children,
    );
  }

  function Chip(props) {
    return h(
      "button",
      {
        type: "button",
        className:
          "chip" + (props.on ? " on" : "") + (props.className ? " " + props.className : ""),
        onClick: props.onClick,
        disabled: props.disabled,
        title: props.title,
      },
      props.icon ? h(Icon, { name: props.icon }) : null,
      props.children,
    );
  }

  function Seg(props) {
    return h(
      "div",
      { className: "seg" + (props.className ? " " + props.className : "") },
      (props.items || []).map(function (it) {
        return h(
          "button",
          {
            type: "button",
            key: it.key,
            className: "seg-item" + (props.value === it.key ? " on" : ""),
            onClick: function () {
              props.onChange && props.onChange(it.key);
            },
          },
          it.icon ? h(Icon, { name: it.icon }) : null,
          it.label,
        );
      }),
    );
  }

  /* ---------- 开关 ---------- */
  function Switch(props) {
    return h(
      "button",
      {
        type: "button",
        className: "switch" + (props.on ? " on" : ""),
        role: "switch",
        "aria-checked": !!props.on,
        disabled: props.disabled,
        title: props.title,
        onClick: function (e) {
          props.onChange && props.onChange(!props.on, e);
        },
      },
      h("span", { className: "knob" }),
    );
  }

  /* ---------- 滑杆 ---------- */
  /* onChange 拖动中实时回调；onCommit 松手/键盘结束时回调（用于发设备指令） */
  function Slider(props) {
    var min = props.min != null ? props.min : 0;
    var max = props.max != null ? props.max : 100;
    var step = props.step != null ? props.step : 1;
    var val = Number(props.value) || 0;
    var pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    var ref = useRef(null);

    var commit = useCallback(
      function () {
        if (props.onCommit) props.onCommit(Number(ref.current.value));
      },
      [props.onCommit],
    );

    return h(
      "div",
      { className: "slider" + (props.className ? " " + props.className : "") },
      props.left || null,
      h(
        "div",
        { className: "track-wrap" },
        h("input", {
          ref: ref,
          type: "range",
          min: min,
          max: max,
          step: step,
          value: val,
          style: { "--p": pct },
          disabled: props.disabled,
          "aria-label": props.label,
          onChange: function (e) {
            props.onChange && props.onChange(Number(e.target.value));
          },
          onPointerUp: commit,
          onKeyUp: commit,
          onBlur: commit,
        }),
      ),
      props.showValue !== false
        ? h(
            "span",
            { className: "val" },
            props.format ? props.format(val) : props.suffix ? val + props.suffix : String(val),
          )
        : null,
      props.right || null,
    );
  }

  /* ---------- 输入 ---------- */
  function Input(props) {
    var cls = "input" + (props.className ? " " + props.className : "");
    var common = {
      className: cls,
      value: props.value,
      placeholder: props.placeholder,
      disabled: props.disabled,
      style: props.style,
      onChange: function (e) {
        props.onChange && props.onChange(e.target.value);
      },
      onKeyDown: props.onKeyDown,
      autoFocus: props.autoFocus,
      inputMode: props.inputMode,
      ref: props.inputRef,
      min: props.min,
      max: props.max,
      type: props.type,
    };
    if (props.textarea) return h("textarea", Object.assign({}, common, { rows: props.rows || 4 }));
    return h("input", common);
  }

  function Field(props) {
    return h(
      "div",
      { className: "field" },
      props.label ? h("label", null, props.label) : null,
      props.children,
    );
  }

  function SearchBar(props) {
    return h(
      "div",
      { className: "searchbar" },
      h(Icon, { name: "search" }),
      h("input", {
        className: "input",
        value: props.value,
        placeholder: props.placeholder || "搜索",
        onChange: function (e) {
          props.onChange(e.target.value);
        },
        onKeyDown: function (e) {
          if (e.key === "Enter" && props.onEnter) props.onEnter();
        },
      }),
      props.value
        ? h(
            "button",
            {
              type: "button",
              className: "s-clear",
              onClick: function () {
                props.onChange("");
              },
            },
            h(Icon, { name: "close" }),
          )
        : null,
    );
  }

  /* ---------- 卡片 / 行 ---------- */
  function Card(props) {
    return h(
      "section",
      {
        className:
          "card " +
          (props.className || "") +
          (props.tight ? " tight" : "") +
          (props.padLg ? " pad-lg" : ""),
        style: props.style,
      },
      props.title
        ? h(
            "h3",
            { className: "card-title" },
            props.icon ? h(Icon, { name: props.icon, className: "ico" }) : null,
            props.title,
            props.extra,
          )
        : null,
      props.children,
    );
  }

  function Row(props) {
    return h(
      "div",
      {
        className:
          "row" + (props.onClick ? " tap" : "") + (props.className ? " " + props.className : ""),
        onClick: props.onClick,
      },
      props.icon
        ? h(
            "div",
            { className: "row-ico" + (props.accent ? " accent" : "") },
            h(Icon, { name: props.icon }),
          )
        : props.left || null,
      h(
        "div",
        { className: "row-main" },
        h("div", { className: "row-title" }, props.title),
        props.sub ? h("div", { className: "row-sub" }, props.sub) : null,
      ),
      h("div", { className: "row-end" }, props.end),
    );
  }

  function Empty(props) {
    return h(
      "div",
      { className: "empty" },
      h(Icon, { name: props.icon || "sparkle" }),
      h("div", { className: "t" }, props.title || "暂无内容"),
      props.desc ? h("div", { className: "s" }, props.desc) : null,
      props.action || null,
    );
  }

  function Spinner(props) {
    return h(
      "span",
      { className: "spinner spin-inline" + (props.className ? " " + props.className : "") },
      h(Icon, { name: "loader" }),
    );
  }

  function Progress(props) {
    var v = Math.max(0, Math.min(100, Number(props.value) || 0));
    return h(
      "div",
      { className: "progress-outer" + (props.className ? " " + props.className : "") },
      h("div", { className: "progress-inner", style: { width: v + "%" } }),
    );
  }

  /* ---------- 动画卸载 ---------- */
  function usePresence(open, ms) {
    var _s = useState(open),
      shown = _s[0],
      setShown = _s[1];
    var _c = useState(false),
      closing = _c[0],
      setClosing = _c[1];
    useEffect(
      function () {
        if (open) {
          setClosing(false);
          setShown(true);
          return;
        }
        setClosing(true);
        var t = setTimeout(function () {
          setShown(false);
        }, ms || 200);
        return function () {
          clearTimeout(t);
        };
      },
      [open, ms],
    );
    return { shown: shown, closing: closing };
  }

  /* ---------- 模态 ---------- */
  function Modal(props) {
    var pres = usePresence(props.open, 190);
    useEffect(
      function () {
        if (!props.open) return;
        function onKey(e) {
          if (e.key === "Escape" && props.closeOnEsc !== false) props.onClose && props.onClose();
        }
        window.addEventListener("keydown", onKey);
        return function () {
          window.removeEventListener("keydown", onKey);
        };
      },
      [props.open, props.onClose],
    );

    if (!pres.shown) return null;

    var widthCls = props.size === "xwide" ? " xwide" : props.size === "wide" ? " wide" : "";
    return h(
      "div",
      {
        className: "overlay" + (pres.closing ? " out" : "") + (props.center ? " center" : ""),
        onPointerDown: function (e) {
          if (e.target === e.currentTarget && props.closeOnMask !== false)
            props.onClose && props.onClose();
        },
      },
      h(
        "div",
        { className: "modal" + widthCls, role: "dialog", "aria-modal": "true" },
        h(
          "div",
          { className: "modal-head" },
          h(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            h("div", { className: "m-title" }, props.title),
            props.sub ? h("div", { className: "m-sub" }, props.sub) : null,
          ),
          h(IconBtn, { icon: "close", title: "关闭", onClick: props.onClose }),
        ),
        h("div", { className: "modal-body" }, props.children),
        props.footer ? h("div", { className: "modal-foot" }, props.footer) : null,
      ),
    );
  }

  /* ---------- 轻提示 ---------- */
  var toastListeners = [];
  function toast(msg, type, ms) {
    var id = Date.now() + Math.random();
    toastListeners.forEach(function (fn) {
      fn({ id: id, msg: msg, type: type || "info" });
    });
    setTimeout(function () {
      toastListeners.forEach(function (fn) {
        fn({ id: id, done: true });
      });
    }, ms || 2400);
  }
  toast.ok = function (m, ms) {
    toast(m, "ok", ms);
  };
  toast.err = function (m, ms) {
    toast(m, "err", ms);
  };

  function ToastHost() {
    var _s = useState([]),
      items = _s[0],
      setItems = _s[1];
    useEffect(function () {
      var fn = function (t) {
        setItems(function (prev) {
          if (t.done)
            return prev
              .filter(function (x) {
                return x.id !== t.id;
              })
              .concat(
                prev
                  .filter(function (x) {
                    return x.id === t.id;
                  })
                  .map(function (x) {
                    return Object.assign({}, x, { out: true });
                  }),
              );
          return prev.concat([t]);
        });
        if (t.done) {
          setTimeout(function () {
            setItems(function (prev) {
              return prev.filter(function (x) {
                return x.id !== t.id;
              });
            });
          }, 220);
        }
      };
      toastListeners.push(fn);
      return function () {
        toastListeners = toastListeners.filter(function (x) {
          return x !== fn;
        });
      };
    }, []);

    var iconOf = { ok: "check", err: "alert", info: "info" };
    return h(
      "div",
      { className: "toast-wrap" },
      items.map(function (t) {
        return h(
          "div",
          { key: t.id, className: "toast " + (t.type || "info") + (t.out ? " out" : "") },
          h(Icon, { name: iconOf[t.type] || "info" }),
          t.msg,
        );
      }),
    );
  }

  /* ---------- 确认框（危险操作统一走这里，不用气泡） ---------- */
  var confirmResolvers = [];
  function confirmAsk(opt) {
    return new Promise(function (resolve) {
      confirmResolvers.push({ resolve: resolve, opt: opt });
    });
  }

  function ConfirmHost() {
    var _s = useState(null),
      cur = _s[0],
      setCur = _s[1];
    useEffect(
      function () {
        var t = setInterval(function () {
          if (confirmResolvers.length && !cur) {
            var item = confirmResolvers.shift();
            setCur(item);
          }
        }, 60);
        return function () {
          clearInterval(t);
        };
      },
      [cur],
    );

    function done(v) {
      if (cur) {
        cur.resolve(v);
      }
      setCur(null);
    }

    if (!cur) return null;
    var opt = cur.opt || {};
    return h(
      Modal,
      {
        open: true,
        center: true,
        title: opt.title || "请确认",
        onClose: function () {
          done(false);
        },
        footer: [
          h(
            Button,
            {
              key: "c",
              variant: "ghost",
              onClick: function () {
                done(false);
              },
            },
            opt.cancelText || "取消",
          ),
          h(
            Button,
            {
              key: "o",
              variant: opt.danger === false ? "primary" : "danger",
              onClick: function () {
                done(true);
              },
            },
            opt.okText || "确认",
          ),
        ],
      },
      h(
        "p",
        { style: { margin: 0, fontSize: 15, lineHeight: 1.65, color: "var(--t2)" } },
        opt.desc || "该操作可能有影响，确认后继续。",
      ),
    );
  }

  /* ---------- QQ 音乐登录头像 ----------
   * 登录后 apiInfo.userid 即 QQ 号，用腾讯官方头像接口取图。
   * 刷新后设备上报有延迟，先用 localStorage 缓存的 QQ 号（r1_qq_avatar）；
   * 多镜像依次重试，全部失败或未登录时渲染 fallback。 */
  function QQAvatar(props) {
    var st = (global.R1Core && global.R1Core.useStore()) || { apiInfo: {} };
    var api = st.apiInfo || {};
    var uin = "";
    if (Number(api.qqmusic_login_state) === 1 && api.userid) uin = String(api.userid);
    if (!uin) {
      try {
        uin = localStorage.getItem("r1_qq_avatar") || "";
      } catch (e) {}
    }
    var MIRRORS = [
      { base: "https://q1.qlogo.cn/g?b=qq&nk=", tail: "&s=100" },
      { base: "https://q2.qlogo.cn/g?b=qq&nk=", tail: "&s=100" },
      { base: "https://q.qlogo.cn/headimg_dl?dst_uin=", tail: "&spec=100" },
    ];
    var _idx = useState(0),
      idx = _idx[0],
      setIdx = _idx[1];
    var _seen = useState(uin),
      seenUin = _seen[0],
      setSeenUin = _seen[1];
    if (uin !== seenUin) {
      setSeenUin(uin);
      setIdx(0);
    }
    var url = uin && idx < MIRRORS.length ? MIRRORS[idx].base + uin + MIRRORS[idx].tail : "";
    if (url) {
      return h("img", {
        key: url,
        src: url,
        alt: "QQ 头像",
        style: {
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "inherit",
          display: "block",
        },
        onError: function () {
          setIdx(idx + 1);
        },
      });
    }
    return props.fallback || null;
  }

  /* ---------- 页面标题 ---------- */
  function PageHead(props) {
    return h(
      "div",
      { className: "page-head" },
      h(
        "div",
        { className: "h-main" },
        h("h1", { className: "page-title" }, props.title),
        props.desc ? h("div", { className: "page-desc" }, props.desc) : null,
      ),
      props.actions ? h("div", { className: "h-actions" }, props.actions) : null,
    );
  }

  global.R1UI = {
    h: h,
    Icon: Icon,
    Button: Button,
    IconBtn: IconBtn,
    Pill: Pill,
    Chip: Chip,
    Seg: Seg,
    Switch: Switch,
    Slider: Slider,
    Input: Input,
    Field: Field,
    SearchBar: SearchBar,
    Card: Card,
    Row: Row,
    Empty: Empty,
    Spinner: Spinner,
    Progress: Progress,
    Modal: Modal,
    ToastHost: ToastHost,
    ConfirmHost: ConfirmHost,
    toast: toast,
    confirm: confirmAsk,
    PageHead: PageHead,
    usePresence: usePresence,
    QQAvatar: QQAvatar,
  };
})(window);
