/**
 * R1 页面：音效 / 蓝牙 / 设备 + 弹层内容（登录、本地音乐、备忘、语音报时、
 *          自动重启、高级工具、设置、关于、音乐源、ADB 控制台）
 *
 * 设计取舍（为什么这么写）：
 *   1. 行为以 legacy/app.js（旧版 MUI 实现）为准：音量超过 18 二次确认、
 *      拖动期间忽略设备回包、蓝牙 1 秒轮询 + 开关防回弹、二维码 2 秒轮询等
 *      细节都直接移植，避免"新版改了行为"；
 *   2. 设备调用只用 ws.js 导出表里的方法（含通用 wsSend/executeShell），并统一
 *      包 try/catch —— 单条指令失败只提示，不拖垮整页；
 *   3. 弹层组件只渲染 Modal 的 body，标题/尺寸/关闭由 app.js 外壳负责；
 *   4. 连接状态、设备信息、服务开关走 R1Core 全局仓库；音量、EQ、蓝牙列表等
 *      高频状态留在组件内部，避免整页重绘；
 *   5. 所有 setInterval / setTimeout 在 useEffect 卸载时清理（延时任务统一走 useTimers）。
 */
(function (global) {
  "use strict";

  var h = R1UI.h,
    Icon = R1UI.Icon,
    Button = R1UI.Button,
    IconBtn = R1UI.IconBtn;
  var Pill = R1UI.Pill,
    Chip = R1UI.Chip,
    Seg = R1UI.Seg,
    Switch = R1UI.Switch;
  var Slider = R1UI.Slider,
    Input = R1UI.Input,
    Field = R1UI.Field;
  var Card = R1UI.Card,
    Row = R1UI.Row,
    Empty = R1UI.Empty;
  var SearchBar = R1UI.SearchBar,
    PageHead = R1UI.PageHead;
  var useState = React.useState,
    useEffect = React.useEffect,
    useRef = React.useRef;
  var C = R1Core;
  var toast = C.toast;

  var P = (global.R1Panels = global.R1Panels || {});

  var VOL_MAX = 30; /* 设备音量上限（原版 0~30） */
  var VOL_WARN = 18; /* 超过该值需要二次确认，原版即为此阈值 */

  /* EQ 频段显示名：设备返回的是 mHz（60000 = 60Hz） */
  var HZ_NAMES = {
    60000: "低频",
    230000: "中低",
    910000: "中频",
    3600000: "中高",
    14000000: "高频",
  };
  var PRESET_NAMES = {
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

  /* ================= 通用小工具 ================= */

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /* 所有设备调用的统一入口：失败只提示，不抛到渲染层 */
  function safe(fn, failMsg) {
    try {
      fn();
    } catch (e) {
      toast(failMsg || "设备通信失败：" + (e && e.message), "err");
    }
  }

  /* 值 → 展示字符串；对象直接渲染会触发 React 错误 #31，这里统一转字符串 */
  function text(v) {
    if (v === null || v === undefined || v === "") return "--";
    if (typeof v === "object") {
      try {
        return JSON.stringify(v);
      } catch (e) {
        return "[object]";
      }
    }
    return String(v);
  }

  /* 时间戳兼容秒/毫秒 */
  function fmtTs(v) {
    var t = Number(v);
    if (!t) return "--";
    if (t < 1e12) t = t * 1000;
    var d = new Date(t);
    return (
      d.getFullYear() +
      "-" +
      (d.getMonth() + 1) +
      "-" +
      d.getDate() +
      " " +
      ("0" + d.getHours()).slice(-2) +
      ":" +
      ("0" + d.getMinutes()).slice(-2)
    );
  }

  /* 三态开关值：设备未回包时用各自的默认值（与旧版一致：DLNA/AirPlay 默认开） */
  function flag(v, def) {
    return v === undefined || v === null ? !!def : !!v;
  }

  function presetLabel(name) {
    return PRESET_NAMES[name] || name || "未知";
  }

  /* 未连接页面：统一 Empty + 连接按钮 */
  function notConnectedPage(title, desc) {
    return h(
      "div",
      { className: "page-inner" },
      h(PageHead, { title: title, desc: desc }),
      h(
        "div",
        { className: "card pad-lg" },
        h(Empty, {
          icon: "link",
          title: "尚未连接设备",
          desc: "连接 R1 音箱后才能使用该页面。",
          action: h(
            Button,
            {
              variant: "primary",
              icon: "link",
              onClick: function () {
                C.openSheet("connect");
              },
            },
            "连接设备",
          ),
        }),
      ),
    );
  }

  /* 统计卡：label + value，value 一律走 text() 防御 */
  function Stat(label, value, small) {
    return h(
      "div",
      { className: "stat" },
      h("div", { className: "stat-label" }, label),
      h("div", { className: "stat-value" + (small ? " sm" : "") }, text(value)),
    );
  }

  /* 延时任务登记：弹层关闭 / 页面切走后不再触发 setState */
  function useTimers() {
    var ref = useRef([]);
    useEffect(function () {
      var list = ref.current;
      return function () {
        list.forEach(function (t) {
          clearTimeout(t);
        });
        ref.current = [];
      };
    }, []);
    return function (fn, ms) {
      var t = setTimeout(function () {
        ref.current = ref.current.filter(function (x) {
          return x !== t;
        });
        fn();
      }, ms);
      ref.current.push(t);
      return t;
    };
  }

  /* ================= 服务开关（设备页 / 蓝牙页共用） ================= */
  /* 切换后延时 requestServiceInfo：命令回包只代表"设备收到了"，
   * 真实状态要再拉一次，避免 UI 与设备不一致（旧版在结果事件里也是这么做的）。 */
  function ServiceSwitches() {
    var st = C.useStore();
    var info = st.deviceInfo || {};
    var later = useTimers();
    var refreshing = useRef(false);

    C.useR1Event("service_setting_result", function (res) {
      if (res && (res.code === 200 || res.code === "200")) toast("操作成功", "ok");
      else toast((res && res.msg) || "操作失败", "err");
    });

    function refresh() {
      if (refreshing.current) return;
      refreshing.current = true;
      later(function () {
        refreshing.current = false;
        safe(function () {
          R1WS.requestServiceInfo();
        });
      }, 800);
    }
    function toggle(send, label) {
      return function (v) {
        safe(function () {
          send(v);
        }, label + "设置失败");
        refresh();
      };
    }

    return h(
      "div",
      { className: "rows" },
      h(Row, {
        icon: "link",
        accent: true,
        title: "服务常开",
        sub: "保持 DLNA / AirPlay 等后台服务常驻",
        end: h(Switch, {
          on: flag(info.Service_Normally_Open, false),
          onChange: toggle(function (v) {
            R1WS.setServiceNormallyOpen(v);
          }, "服务常开"),
        }),
      }),
      h(Row, {
        icon: "wifi",
        title: "DLNA 投屏",
        sub: "允许手机投屏应用发现并推送媒体",
        end: h(Switch, {
          on: flag(info.dlna_open, true),
          onChange: toggle(function (v) {
            R1WS.setDlnaOpen(v);
          }, "DLNA"),
        }),
      }),
      h(Row, {
        icon: "smartphone",
        title: "AirPlay",
        sub: "允许 AirPlay 设备推送音频到音箱",
        end: h(Switch, {
          on: flag(info.airplay_open, true),
          onChange: toggle(function (v) {
            R1WS.setAirplayOpen(v);
          }, "AirPlay"),
        }),
      }),
    );
  }

  /* =====================================================================
   * 音效页
   * =================================================================== */
  function SoundPanel() {
    var st = C.useStore();
    var later = useTimers();

    var _vol = useState(15),
      volume = _vol[0],
      setVolume = _vol[1];
    var _bands = useState([]),
      bands = _bands[0],
      setBands = _bands[1];
    var _range = useState({ min: -1200, max: 1200 }),
      bandRange = _range[0],
      setBandRange = _range[1];
    var _presets = useState([]),
      presets = _presets[0],
      setPresets = _presets[1];
    var _cur = useState(-1),
      currentPreset = _cur[0],
      setCurrentPreset = _cur[1];
    var _eqOn = useState(true),
      eqOn = _eqOn[0],
      setEqOn = _eqOn[1];
    var _tone = useState(true),
      btTone = _tone[0],
      setBtTone = _tone[1];
    var _asr = useState(5),
      asr = _asr[0],
      setAsr = _asr[1];

    /* 音量拖动锁：拖动/回包静默期内忽略设备回包，否则旧值会把滑杆打回去 */
    var volDragRef = useRef(false);
    var volBaseRef = useRef(15); /* 本次拖动前的音量，用于判断是否"跨越"警告线 */
    var volWarnedRef = useRef(false); /* 本会话内已确认过一次就不再反复弹 */
    var volTimerRef = useRef(null);
    /* EQ：本地镜像保证 onCommit 时拿到最新频段；拖动期间同样忽略回包 */
    var bandsRef = useRef([]);
    var presetRef = useRef(-1);
    var eqDragRef = useRef(false);
    useEffect(
      function () {
        bandsRef.current = bands;
      },
      [bands],
    );
    useEffect(
      function () {
        presetRef.current = currentPreset;
      },
      [currentPreset],
    );

    /* ---------- 设备事件 ---------- */
    C.useR1Event("music_info", function (info) {
      if (!info || info.volume === undefined) return;
      if (volDragRef.current) return;
      setVolume(clamp(Math.round(Number(info.volume)) || 0, 0, VOL_MAX));
    });
    C.useR1Event("device_info", function (info) {
      if (!info) return;
      if (info.volume !== undefined && !volDragRef.current) {
        setVolume(clamp(Math.round(Number(info.volume)) || 0, 0, VOL_MAX));
      }
      if (info.asr_max_duration !== undefined) setAsr(Number(info.asr_max_duration) || 5);
      if (info.bluetooth_prompt_tone !== undefined) setBtTone(!!info.bluetooth_prompt_tone);
    });
    C.useR1Event("eq_config", function (data) {
      if (!data) return;
      var eq = data.eq || {};
      if (eq.Bands && Array.isArray(eq.Bands.list)) {
        if (!eqDragRef.current) {
          /* "标准(Normal)"预设：部分机型回包带非 0 增益，旧版直接按 0dB 平面显示 */
          var cur = null;
          if (eq.Preset_list && eq.Current_Preset !== undefined) {
            for (var i = 0; i < eq.Preset_list.length; i++) {
              if (eq.Preset_list[i].Preset === eq.Current_Preset) {
                cur = eq.Preset_list[i];
                break;
              }
            }
          }
          var isNormal = !!(cur && cur.Name === "Normal");
          var next = eq.Bands.list.map(function (b) {
            return { band: b.Band, freq: b.Frequency, level: isNormal ? 0 : b.BandLevel };
          });
          bandsRef.current = next;
          setBands(next);
        }
        if (eq.Bands.minBandLevel !== undefined) {
          setBandRange({ min: eq.Bands.minBandLevel, max: eq.Bands.maxBandLevel });
        }
      }
      if (eq.Preset_list) setPresets(eq.Preset_list);
      if (eq.Current_Preset !== undefined) {
        presetRef.current = eq.Current_Preset;
        setCurrentPreset(eq.Current_Preset);
      }
      if (eq.sound_effects_eq_enable !== undefined) setEqOn(eq.sound_effects_eq_enable == true);
    });

    /* ---------- 挂载请求 + EQ 轮询（卸载清理） ---------- */
    useEffect(
      function () {
        if (!st.connected) return;
        safe(function () {
          R1WS.requestDeviceInfo();
        });
        safe(function () {
          R1WS.requestEqConfig();
        });
        var t = setInterval(function () {
          safe(function () {
            R1WS.requestEqConfig();
          });
        }, 2000);
        return function () {
          clearInterval(t);
        };
      },
      [st.connected],
    );

    useEffect(function () {
      return function () {
        if (volTimerRef.current) clearTimeout(volTimerRef.current);
      };
    }, []);

    /* ---------- 音量 ---------- */
    function volHold() {
      volDragRef.current = true;
      if (volTimerRef.current) {
        clearTimeout(volTimerRef.current);
        volTimerRef.current = null;
      }
    }
    /* 松手后静默 1.5 秒：设备回包通常滞后 200~800ms，立即解锁会被旧值打回 */
    function volRelease() {
      if (volTimerRef.current) clearTimeout(volTimerRef.current);
      volTimerRef.current = setTimeout(function () {
        volDragRef.current = false;
        volTimerRef.current = null;
      }, 1500);
    }
    function volChange(v) {
      if (!volDragRef.current) volBaseRef.current = volume; /* 只记拖动起点 */
      volHold();
      setVolume(v);
    }
    function volCommit(v) {
      v = clamp(Math.round(v), 0, VOL_MAX);
      volHold();
      setVolume(v);
      /* 只有"从 ≤18 跨到 >18"才需要确认；已经在高音量区间调来调去不再打扰 */
      if (v > VOL_WARN && !volWarnedRef.current && volBaseRef.current <= VOL_WARN) {
        C.confirm({
          title: "音量提醒",
          desc: "音量超过 " + VOL_WARN + " 可能打扰他人，甚至损伤扬声器。确定继续吗？",
          okText: "继续调大",
          cancelText: "取消",
          danger: false,
        }).then(function (ok) {
          if (ok) {
            volWarnedRef.current = true;
            safe(function () {
              R1WS.setVolume(v);
            });
          } else {
            setVolume(volBaseRef.current);
          }
          volRelease();
        });
        return;
      }
      safe(function () {
        R1WS.setVolume(v);
      });
      volRelease();
    }
    function volStep(d) {
      volBaseRef.current = volume;
      volCommit(clamp(volume + d, 0, VOL_MAX));
    }
    function volMute() {
      volBaseRef.current = volume;
      volCommit(volume === 0 ? 15 : 0);
    }

    /* ---------- EQ ---------- */
    function sendEq(cfg) {
      safe(function () {
        R1WS.setEq(cfg);
      }, "均衡器指令发送失败");
    }

    function changeBand(i, level) {
      eqDragRef.current = true;
      var next = bandsRef.current.map(function (b, idx) {
        return idx === i ? { band: b.band, freq: b.freq, level: level } : b;
      });
      bandsRef.current = next;
      setBands(next);
    }
    function commitBand() {
      /* 全量下发频段（不带 preset），避免新预设曲线覆盖刚拖的增益 */
      /* 旧版协议：逐段 set_eq_bandlevel（Band 用设备频段号，level 为设备原值） */
      var bs = bandsRef.current;
      for (var bi = 0; bi < bs.length; bi++) {
        (function (bandNo, level, delay) {
          setTimeout(function () {
            try {
              R1WS.wsSend({ type: "set_eq_bandlevel", band: bandNo, level: level });
            } catch (e) {}
          }, delay);
        })(bs[bi].band, bs[bi].level, bi * 60);
      }
      if (presetRef.current !== -1) {
        presetRef.current = -1;
        setCurrentPreset(-1);
      }
      /* 短暂静默：等设备回包确认后再接受 eq_config */
      later(function () {
        eqDragRef.current = false;
      }, 500);
    }
    function applyPreset(id) {
      presetRef.current = id;
      setCurrentPreset(id);
      /* 旧版协议：独立 set_eq_preset 命令（set_eq JSON 负载设备不认，导致预设点击无效） */
      R1WS.wsSend({ type: "set_eq_preset", preset: id });
      /* 标准(Normal)：设备不一定立即回包，直接本地置 0dB，UI 立刻呈现平直曲线 */
      var target = null;
      for (var i = 0; i < presets.length; i++) {
        if (presets[i].Preset === id) {
          target = presets[i];
          break;
        }
      }
      if (target && target.Name === "Normal") {
        var next = bandsRef.current.map(function (b) {
          return { band: b.band, freq: b.freq, level: 0 };
        });
        bandsRef.current = next;
        setBands(next);
      }
      later(function () {
        safe(function () {
          R1WS.requestEqConfig();
        });
      }, 400);
    }
    function toggleEq(v) {
      setEqOn(v);
      /* 总开关沿用旧版 set_eq_enable（set_eq 负载里没有 enable 字段） */
      safe(function () {
        R1WS.wsSend({ type: "set_eq_enable", enable: v });
      }, "均衡器开关失败");
    }

    /* ---------- 语音 / 提示音 ---------- */
    function toggleTone(v) {
      setBtTone(v);
      safe(function () {
        R1WS.setBluetoothPromptTone(v);
      }, "蓝牙提示音设置失败");
      toast(v ? "已开启蓝牙提示音" : "已关闭蓝牙提示音", "ok");
    }
    function commitAsr(v) {
      var n = clamp(Math.round(v), 1, 30);
      setAsr(n);
      safe(function () {
        R1WS.setAsrMaxDuration(n);
      }, "识别时长设置失败");
    }

    if (!st.connected) return notConnectedPage("音效", "音量、均衡器与语音提示");

    var volPct = (volume / VOL_MAX) * 100;
    var desc =
      "音量 " +
      volume +
      " / " +
      VOL_MAX +
      " · " +
      (eqOn ? "均衡器已开启" : "均衡器已关闭") +
      " · 识别时长 " +
      asr +
      " 秒";

    return h(
      "div",
      { className: "page-inner" },
      h(PageHead, { title: "音效", desc: desc }),

      /* ===== 音量 ===== */
      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "音量控制", icon: "volume" },
          h(
            "div",
            { className: "vol-hero" },
            h(
              "div",
              { className: "vol-ring", style: { "--v": String(volPct) } },
              h("div", { className: "v-num" }, String(volume)),
              h("div", { className: "v-cap" }, "VOLUME"),
            ),
            h(
              "div",
              { className: "vol-body" },
              h(
                "div",
                { className: "hint" },
                "范围 0 – " + VOL_MAX + "，超过 " + VOL_WARN + " 需要二次确认",
              ),
              h(Slider, {
                value: volume,
                min: 0,
                max: VOL_MAX,
                step: 1,
                label: "音量",
                onChange: volChange,
                onCommit: volCommit,
              }),
              h(
                "div",
                { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
                h(
                  Button,
                  {
                    size: "sm",
                    variant: "ghost",
                    icon: "minus",
                    onClick: function () {
                      volStep(-1);
                    },
                  },
                  "减小",
                ),
                h(
                  Button,
                  {
                    size: "sm",
                    variant: "soft",
                    icon: volume === 0 ? "volume" : "volumeMute",
                    onClick: volMute,
                  },
                  volume === 0 ? "恢复 15" : "静音",
                ),
                h(
                  Button,
                  {
                    size: "sm",
                    variant: "ghost",
                    icon: "plus",
                    onClick: function () {
                      volStep(1);
                    },
                  },
                  "增大",
                ),
              ),
            ),
          ),
        ),
      ),

      /* ===== 均衡器 ===== */
      h(
        "div",
        { className: "section" },
        h(
          Card,
          {
            title: "均衡器",
            icon: "sliders",
            extra: h(
              "span",
              { style: { marginLeft: "auto", display: "inline-flex" } },
              h(Switch, { on: eqOn, onChange: toggleEq, title: "均衡器总开关" }),
            ),
          },
          !eqOn
            ? h("div", { className: "hint" }, "均衡器已关闭，开启后可调整各频段增益与预设。")
            : bands.length
              ? h(
                  "div",
                  { className: "eq-list" },
                  bands.map(function (b, i) {
                    var hz = b.freq || 0;
                    var name = HZ_NAMES[hz];
                    var db = b.level / 100;
                    return h(
                      "div",
                      { className: "eq-row", key: i },
                      h(
                        "div",
                        { className: "eq-band" },
                        h("div", { className: "b-freq" }, name || hz / 1000 + "Hz"),
                        h("div", { className: "b-sub" }, name ? hz / 1000 + " Hz" : ""),
                      ),
                      h(
                        "div",
                        { style: { flex: 1, minWidth: 0 } },
                        h(Slider, {
                          value: db,
                          min: bandRange.min / 100,
                          max: bandRange.max / 100,
                          step: 0.1,
                          showValue: false,
                          label: "频段 " + (name || i),
                          onChange: function (v) {
                            changeBand(i, Math.round(v * 100));
                          },
                          onCommit: commitBand,
                        }),
                      ),
                      h("span", { className: "val" }, (db > 0 ? "+" : "") + db.toFixed(1) + " dB"),
                    );
                  }),
                )
              : h(Empty, {
                  icon: "sliders",
                  title: "等待设备返回均衡器数据",
                  desc: "如果长时间空白，请确认设备连接后下拉刷新页面",
                }),

          eqOn && presets.length
            ? h(
                "div",
                { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 } },
                h(
                  Chip,
                  {
                    on: currentPreset === -1,
                    onClick: function () {
                      applyPreset(-1);
                    },
                  },
                  "自定义",
                ),
                presets.map(function (p) {
                  if (p.Preset < 0) return null;
                  return h(
                    Chip,
                    {
                      key: p.Preset,
                      on: currentPreset === p.Preset,
                      onClick: function () {
                        applyPreset(p.Preset);
                      },
                    },
                    presetLabel(p.Name),
                  );
                }),
              )
            : null,

          eqOn && bands.length ? h("div", { className: "divider" }) : null,
          eqOn && bands.length
            ? h(
                "div",
                { className: "hint" },
                '拖动滑杆可逐段调整增益；调整任意频段会自动切到"自定义"预设。',
              )
            : null,
        ),
      ),

      /* ===== 语音与提示音 ===== */
      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "语音与提示音", icon: "mic" },
          h(
            "div",
            { className: "rows" },
            h(Row, {
              icon: "bluetooth",
              accent: true,
              title: "蓝牙提示音",
              sub: "连接 / 断开蓝牙设备时播放语音提示",
              end: h(Switch, { on: btTone, onChange: toggleTone }),
            }),
            h(Row, {
              icon: "clock",
              title: "语音识别时长",
              sub: "单次唤醒后的最长识别时间：" + asr + " 秒",
              end: h(
                "div",
                { style: { width: "170px" } },
                h(Slider, {
                  value: asr,
                  min: 1,
                  max: 30,
                  step: 1,
                  showValue: false,
                  label: "语音识别时长",
                  onChange: function (v) {
                    setAsr(v);
                  },
                  onCommit: commitAsr,
                }),
              ),
            }),
          ),
        ),
      ),
    );
  }

  /* =====================================================================
   * 蓝牙页（移植旧版 BluetoothPanel：轮询 + 防回弹 + 分组展示）
   * =================================================================== */
  function BluetoothPanel() {
    var st = C.useStore();

    var _enabled = useState(false),
      enabled = _enabled[0],
      setEnabled = _enabled[1];
    var _wait = useState(false),
      wait = _wait[0],
      setWait = _wait[1];
    var _scanning = useState(false),
      scanning = _scanning[0],
      setScanning = _scanning[1];
    var _mode = useState(0),
      scanMode = _mode[0],
      setScanMode = _mode[1];
    var _bonded = useState([]),
      bonded = _bonded[0],
      setBonded = _bonded[1];
    var _scanned = useState([]),
      scanned = _scanned[0],
      setScanned = _scanned[1];
    var _addr = useState(""),
      connectedAddr = _addr[0],
      setConnectedAddr = _addr[1];
    var _a2dp = useState([]),
      a2dpList = _a2dp[0],
      setA2dpList = _a2dp[1];
    var _sink = useState([]),
      sinkList = _sink[0],
      setSinkList = _sink[1];

    /* 同步到 ref：事件回调里要读"最新的开关等待状态"，避免闭包拿到旧值 */
    var waitRef = useRef(false);
    var svcAlwaysRef = useRef(false);
    var waitTimerRef = useRef(null);
    var enableTimerRef = useRef(null);
    useEffect(
      function () {
        waitRef.current = wait;
      },
      [wait],
    );
    useEffect(
      function () {
        svcAlwaysRef.current = flag(st.deviceInfo && st.deviceInfo.Service_Normally_Open, false);
      },
      [st.deviceInfo],
    );

    /* ---------- 解析工具（原版 get_bluetooth_title / get_bluetooth_title_type） ---------- */
    function getDeviceType(btClass) {
      var major = btClass & 7936;
      var map = {
        256: "COMPUTER",
        512: "PHONE",
        768: "NETWORKING",
        1024: "AUDIO_VIDEO",
        1280: "PERIPHERAL",
        1536: "IMAGING",
        1792: "WEARABLE",
        2048: "TOY",
        7936: "UNCATEGORIZED",
      };
      return map[major] || "";
    }
    function deviceIcon(d) {
      /* 设备原始数据没有 DeviceType 字段，用 BluetoothClass 主类别推断 */
      var t = getDeviceType(d.BluetoothClass);
      if (t === "PHONE") return "smartphone";
      if (t === "COMPUTER") return "monitor";
      if (t === "PERIPHERAL") return "keyboard";
      if (t === "AUDIO_VIDEO") return "music";
      return "bluetooth";
    }
    function parseUuids(uuids) {
      var src = false,
        sink = false;
      if (uuids) {
        for (var i = 0; i < uuids.length; i++) {
          var u = (uuids[i] && uuids[i].mUuid) || uuids[i] || "";
          if (String(u).indexOf("110a-") > -1) src = true;
          if (String(u).indexOf("110b-") > -1) sink = true;
        }
      }
      return { audioSource: src, audioSink: sink };
    }
    function deviceTitle(d) {
      var t = "";
      if (d.BondState === 11) t += "[配对中] ";
      t += d.name || d.Name || "未知设备";
      return t;
    }
    function isConnected(d) {
      return !!(d.A2dpConnect || d.A2dpSinkConnect || d.Address === connectedAddr);
    }
    /* 信号格：rssi 越大越强，三格对应 theme.css 的 .bars i */
    function bars(rssi) {
      if (typeof rssi !== "number") return null;
      var lvl = rssi >= -60 ? 3 : rssi >= -75 ? 2 : rssi >= -85 ? 1 : 0;
      return h(
        "div",
        { className: "bars", title: rssi + " dBm" },
        h("i", { className: lvl >= 1 ? "on" : "" }),
        h("i", { className: lvl >= 2 ? "on" : "" }),
        h("i", { className: lvl >= 3 ? "on" : "" }),
      );
    }

    /* ---------- BT_Device 数据解析（原版 update_bluetooth_data） ---------- */
    function handleBtData(data) {
      if (!data) return;
      if (data.Scanning === true) setScanning(true);
      else if (data.Scanning === false) setScanning(false);

      if (!data.Enabled) {
        if (!waitRef.current) setEnabled(false);
        /* 蓝牙关闭时清空列表，避免残留上一轮结果 */
        setBonded([]);
        setScanned([]);
        setConnectedAddr("");
        setA2dpList([]);
        setSinkList([]);
        setScanning(false);
        return;
      }
      if (!waitRef.current) setEnabled(true);
      /* 原版：服务常开时自动把适配器置为可发现 */
      if (!waitRef.current && svcAlwaysRef.current) {
        safe(function () {
          R1WS.setBluetoothScanMode(21);
        });
      }
      if (data.ScanMode !== undefined) setScanMode(data.ScanMode);
      if (data.ConnectedDevice) setConnectedAddr(data.ConnectedDevice);
      if (data.A2dp_ConnectedDevices) setA2dpList(data.A2dp_ConnectedDevices);
      if (data.A2dpSink_ConnectedDevices) setSinkList(data.A2dpSink_ConnectedDevices);

      var a2dp = data.A2dp_ConnectedDevices || [];
      var sink = data.A2dpSink_ConnectedDevices || [];
      var bondedList = (data.Bonded_Devices || []).map(function (raw) {
        var d = Object.assign({}, raw); /* 不改写事件原始对象 */
        d.DeviceType = getDeviceType(d.BluetoothClass || 0);
        d.A2dpConnect = a2dp.indexOf(d.Address) > -1;
        d.A2dpSinkConnect = sink.indexOf(d.Address) > -1;
        d.rssi = d.rssi != null ? d.rssi : d.RSSI;
        return d;
      });
      /* 扫描列表去掉"已配对 + 自身重复" */
      var seen = {},
        inBonded = {};
      for (var i = 0; i < bondedList.length; i++) inBonded[bondedList[i].Address] = true;
      var scanList = [];
      var scanRaw = data.Scan_Devices || [];
      for (var j = 0; j < scanRaw.length; j++) {
        var s = Object.assign({}, scanRaw[j]);
        if (inBonded[s.Address] || seen[s.Address]) continue;
        seen[s.Address] = true;
        s.DeviceType = getDeviceType(s.BluetoothClass || 0);
        s.rssi = s.rssi != null ? s.rssi : s.RSSI;
        scanList.push(s);
      }
      setBonded(bondedList);
      setScanned(scanList);
    }

    /* ---------- 事件 ---------- */
    C.useR1Event("bluetooth_devices", handleBtData);
    C.useR1Event("bluetooth_state", function (info) {
      if (info && info.enabled !== undefined) setEnabled(!!info.enabled);
      if (enableTimerRef.current) clearTimeout(enableTimerRef.current);
      /* BT_enable/disable 回包只代表命令送达，适配器真正开关需要 2.5 秒左右：
       * 提前清 wait，下一次轮询的 Enabled:false 会把开关弹回去 */
      enableTimerRef.current = setTimeout(function () {
        enableTimerRef.current = null;
        setWait(false);
        waitRef.current = false;
        safe(function () {
          R1WS.requestBluetoothDevices();
        });
      }, 2500);
    });
    C.useR1Event("bluetooth_result", function (res) {
      if (res && res.code !== undefined && res.code !== 200 && res.code !== "200") {
        toast((res.msg || "蓝牙操作失败") + " [" + res.code + "]", "err");
      }
    });

    /* ---------- 1 秒轮询（卸载清理） ---------- */
    useEffect(
      function () {
        if (!st.connected) return;
        safe(function () {
          R1WS.requestBluetoothDevices();
        });
        var t = setInterval(function () {
          safe(function () {
            R1WS.requestBluetoothDevices();
          });
        }, 1000);
        return function () {
          clearInterval(t);
        };
      },
      [st.connected],
    );

    useEffect(function () {
      return function () {
        if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
        if (enableTimerRef.current) clearTimeout(enableTimerRef.current);
      };
    }, []);

    /* ---------- 操作 ---------- */
    function toggleBluetooth(v) {
      setWait(true);
      waitRef.current = true;
      safe(
        function () {
          R1WS.setBluetoothEnable(v);
        },
        (v ? "开启" : "关闭") + "蓝牙失败",
      );
      toast(v ? "正在开启蓝牙…" : "正在关闭蓝牙…", "info");
      if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
      /* 8 秒兜底：没收到响应也解锁，避免开关卡在 loading */
      waitTimerRef.current = setTimeout(function () {
        waitTimerRef.current = null;
        setWait(false);
        waitRef.current = false;
        safe(function () {
          R1WS.requestBluetoothDevices();
        });
      }, 8000);
    }
    function doScan() {
      safe(function () {
        R1WS.scanBluetooth();
      }, "扫描指令发送失败");
      toast("开始扫描附近的蓝牙设备…", "info", 1600);
    }
    function toggleDiscoverable(v) {
      /* 23 = 可被发现，20 = 不可被发现（原版取值） */
      safe(function () {
        R1WS.setBluetoothScanMode(v ? 23 : 20);
      }, "可发现模式切换失败");
    }
    function doConnect(d) {
      /* 方向语义（与设备协议一致）：
       * - 周边提供 110a（A2DP 音源服务，手机/电脑）→ connectA2dp，音箱作 sink 接收播放
       * - 周边提供 110b（A2DP sink 服务，耳机/蓝牙音箱）→ connectA2dpSink，音箱推音频给它 */
      var uuid = parseUuids(d.Uuids);
      if (uuid.audioSource) {
        safe(function () {
          R1WS.connectA2dp(d.Address);
        });
        toast("正在连接设备音频…", "info", 1600);
      } else if (uuid.audioSink) {
        safe(function () {
          R1WS.connectA2dpSink(d.Address);
        });
        toast("正在推送音频…", "info", 1600);
      }
      safe(function () {
        R1WS.requestBluetoothDevices();
      });
    }
    function doDisconnect(d) {
      if (d.A2dpConnect)
        safe(function () {
          R1WS.disconnectA2dp(d.Address);
        });
      else if (d.A2dpSinkConnect)
        safe(function () {
          R1WS.disconnectA2dpSink(d.Address);
        });
      safe(function () {
        R1WS.requestBluetoothDevices();
      });
      toast("正在断开…", "info", 1600);
    }
    function doForget(d) {
      C.confirm({
        title: "忘记该设备",
        desc: "将取消与「" + deviceTitle(d) + "」的配对关系，下次需要重新配对。",
        okText: "忘记设备",
        cancelText: "取消",
      }).then(function (ok) {
        if (!ok) return;
        safe(function () {
          R1WS.removeBond(d.Address);
        });
        safe(function () {
          R1WS.requestBluetoothDevices();
        });
        toast("已发送取消配对指令", "ok");
      });
    }
    function doPair(d) {
      safe(function () {
        R1WS.pairBluetooth(d.Address);
      });
      safe(function () {
        R1WS.requestBluetoothDevices();
      });
      toast("正在配对…", "info", 1600);
    }

    /* ---------- 设备卡片 ---------- */
    function devCard(d, paired) {
      var conn = isConnected(d);
      /* 连接能力判断：以设备广播的音频服务 UUID 为准（原数据的 A2dp/A2dpSink 标志
       * 依赖额外的服务状态信息，多数设备不会返回，导致所有手机/电脑都被判"不支持"。
       * 110a = 音源（手机/电脑可推音频给音箱），110b = sink（耳机等接收音箱音频） */
      var uuid = parseUuids(d.Uuids);
      var canLink = paired && uuid.audioSource;
      var canPush = paired && uuid.audioSink;
      var canPair = !paired && (uuid.audioSource || uuid.audioSink || d.BluetoothClass === 7936);
      var btns = [];
      if (conn) {
        /* 已连接：不放大红实心按钮抢视觉，用描边按钮 + meta 行绿点标识 */
        btns.push(
          h(
            Button,
            {
              key: "off",
              size: "sm",
              variant: "ghost",
              onClick: function () {
                doDisconnect(d);
              },
            },
            "断开",
          ),
        );
      } else if (paired) {
        if (canLink)
          btns.push(
            h(
              Button,
              {
                key: "link",
                size: "sm",
                variant: "primary",
                onClick: function () {
                  doConnect(d);
                },
              },
              "连接设备",
            ),
          );
        else if (canPush)
          btns.push(
            h(
              Button,
              {
                key: "push",
                size: "sm",
                variant: "primary",
                onClick: function () {
                  doConnect(d);
                },
              },
              "推送音频",
            ),
          );
        else
          btns.push(
            h(Button, { key: "no", size: "sm", variant: "ghost", disabled: true }, "不支持连接"),
          );
      } else {
        btns.push(
          h(
            Button,
            {
              key: "pair",
              size: "sm",
              variant: "primary",
              disabled: !canPair,
              onClick: function () {
                doPair(d);
              },
            },
            "配对",
          ),
        );
      }
      if (paired) {
        btns.push(
          h(
            Button,
            {
              key: "forget",
              size: "sm",
              variant: "ghost",
              icon: "trash",
              onClick: function () {
                doForget(d);
              },
            },
            "忘记",
          ),
        );
      }

      return h(
        "div",
        {
          className: "dev" + (conn ? " linked" : ""),
          key: (d.Address || "") + "-" + (paired ? "b" : "s"),
        },
        h("div", { className: "dev-ico" }, h(Icon, { name: deviceIcon(d) })),
        h(
          "div",
          { className: "dev-main" },
          h("div", { className: "dev-name" }, deviceTitle(d)),
          h(
            "div",
            { className: "dev-meta" },
            h("span", { className: "dev-addr" }, d.Address || "--"),
            bars(d.rssi),
            conn ? h(Pill, { tone: "ok", dot: true }, "已连接") : null,
          ),
        ),
        h("div", { className: "dev-actions" }, btns),
      );
    }

    if (!st.connected) return notConnectedPage("蓝牙", "连接手机、耳机等蓝牙音频设备");

    return h(
      "div",
      { className: "page-inner" },
      h(PageHead, {
        title: "蓝牙",
        desc: enabled
          ? scanning
            ? "蓝牙已开启 · 正在扫描…"
            : "蓝牙已开启 · 共 " + bonded.length + " 台已配对设备"
          : "蓝牙已关闭",
      }),

      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "蓝牙控制", icon: "bluetooth" },
          h(
            "div",
            { className: "rows" },
            h(Row, {
              icon: "bluetooth",
              accent: true,
              title: "蓝牙适配器",
              sub: wait ? "正在切换…" : enabled ? "已开启" : "已关闭",
              end: h(Switch, { on: enabled, disabled: wait, onChange: toggleBluetooth }),
            }),
            h(Row, {
              icon: "signal",
              title: "可被发现",
              sub: enabled
                ? scanMode === 23
                  ? "其他设备可以搜索到本机"
                  : "其他设备搜索不到本机"
                : "开启蓝牙后可设置",
              end: h(Switch, {
                on: scanMode === 23,
                disabled: !enabled,
                onChange: toggleDiscoverable,
              }),
            }),
            h(Row, {
              icon: "search",
              title: "扫描设备",
              sub: "搜索附近可连接的蓝牙设备",
              end: h(
                Button,
                {
                  size: "sm",
                  variant: "primary",
                  icon: "search",
                  disabled: !enabled,
                  loading: scanning,
                  onClick: doScan,
                },
                scanning ? "扫描中…" : "扫描设备",
              ),
            }),
          ),
        ),
      ),

      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "已配对设备 [" + bonded.length + "]", icon: "link" },
          bonded.length
            ? h(
                "div",
                { className: "dev-grid" },
                bonded.map(function (d) {
                  return devCard(d, true);
                }),
              )
            : h(Empty, {
                icon: "bluetooth",
                title: "暂无已配对设备",
                desc: "开启蓝牙后点击扫描，配对过的设备会出现在这里",
              }),
        ),
      ),

      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "附近设备 [" + scanned.length + "]", icon: "search" },
          !enabled
            ? h(Empty, {
                icon: "bluetooth",
                title: "蓝牙未开启",
                desc: "先打开蓝牙适配器，再扫描附近的设备",
              })
            : scanned.length
              ? h(
                  "div",
                  { className: "dev-grid" },
                  scanned.map(function (d) {
                    return devCard(d, false);
                  }),
                )
              : h(Empty, {
                  icon: "search",
                  title: scanning ? "正在扫描…" : "还没有发现设备",
                  desc: scanning ? "请稍候，扫描通常需要几秒钟" : '点击上方"扫描设备"开始搜索',
                }),
        ),
      ),

      h(
        "div",
        { className: "section" },
        h(Card, { title: "后台服务", icon: "power" }, h(ServiceSwitches)),
      ),
    );
  }

  /* =====================================================================
   * 设备页
   * =================================================================== */
  var TOOLS = [
    { icon: "qrcode", name: "账号登录", desc: "扫码登录音乐账号", sheet: "login" },
    { icon: "music", name: "音乐源", desc: "QQ / 网易云 / 酷我", sheet: "source" },
    { icon: "folder", name: "本地音乐", desc: "扫描并播放设备音频", sheet: "local" },
    { icon: "note", name: "备忘闹钟", desc: "提醒、闹钟与备忘", sheet: "memo" },
    { icon: "clock", name: "语音报时", desc: "整点 / 半点语音播报", sheet: "voice" },
    { icon: "refresh", name: "自动重启", desc: "定时自检与重启策略", sheet: "restart" },
    { icon: "sliders", name: "高级工具", desc: "DLNA / mDNS / 配网 / 小爱", sheet: "advanced" },
    { icon: "terminal", name: "ADB 控制台", desc: "在设备上执行 Shell", sheet: "adb" },
    { icon: "settings", name: "设置", desc: "外观与使用偏好", sheet: "settings" },
    { icon: "info", name: "关于", desc: "版本信息", sheet: "about" },
  ];

  function DevicePanel() {
    var st = C.useStore();
    var info = st.deviceInfo || {};
    var api = st.apiInfo || {};
    var later = useTimers();

    /* 授权状态（原版 sq_type 语义） */
    var sqType = Number(api.sq_type);
    var authStatus = "未授权";
    var now = Math.round(Date.now() / 1000);
    if (sqType === 1 || sqType === 2 || sqType === 3) {
      var expireTs = Number(api.sq_expire_time) || 0;
      if (now > expireTs && sqType !== 3) authStatus = sqType === 2 ? "试用已过期" : "已过期";
      else if (sqType === 2) authStatus = "试用授权";
      else if (sqType === 3) authStatus = "永久授权";
      else authStatus = "已授权";
    }
    var qqStatus =
      api.qqmusic_login_state === 1 ? "已登录（" + (api.userid || "") + "）" : "未登录";
    var neteaseStatus =
      api.netease_login_state === 1 && api.netease_uid
        ? "已登录（" + api.netease_uid + "）"
        : api.netease_login_info || "未登录";
    var kuwoStatus =
      api.kuwo_login_state === 1 && api.kuwo_uid ? "已登录（" + api.kuwo_uid + "）" : "未登录";

    var devName = info.dev_name || info.device_name || info.hostname || "R1 音箱";
    var ip =
      info.ip || api.ip || (R1WS.getConnectIp ? R1WS.getConnectIp() : "") || st.lastIp || "--";
    /* CPU：有使用率显示"xx% · 温度"，只有温度时显示"xx℃"（部分固件不回使用率） */
    var cpuText =
      info.cpu_usage !== undefined
        ? info.cpu_usage + "%" + (info.cpu_temp !== undefined ? " · " + info.cpu_temp + "℃" : "")
        : info.cpu_temp !== undefined
          ? info.cpu_temp + "℃"
          : undefined;
    var memText =
      info.mem_available !== undefined
        ? info.mem_available + " / " + (info.mem_total || "--")
        : undefined;

    function refresh() {
      safe(function () {
        R1WS.requestDeviceInfo(true);
      }, "刷新设备信息失败");
      safe(function () {
        R1WS.requestServiceInfo();
      });
      toast("已请求最新设备信息", "info", 1600);
    }
    function disconnectNow() {
      C.confirm({
        title: "断开连接",
        desc: "断开后将无法控制音箱，可随时重新连接。",
        okText: "断开",
        cancelText: "取消",
      }).then(function (ok) {
        if (ok) {
          C.disconnect();
          toast("已断开连接", "ok");
        }
      });
    }
    function reconnectNow() {
      C.confirm({
        title: "重新连接",
        desc: "将先断开当前连接，再重新连接 " + ip + "。",
        okText: "重连",
        cancelText: "取消",
        danger: false,
      }).then(function (ok) {
        if (!ok) return;
        C.disconnect();
        later(function () {
          C.connectTo(st.lastIp || ip);
        }, 300);
      });
    }
    function openTool(t) {
      C.openSheet(t.sheet);
    }

    if (!st.connected) return notConnectedPage("设备", "设备状态、服务开关与常用工具");

    return h(
      "div",
      { className: "page-inner" },
      h(PageHead, {
        title: "设备",
        desc: devName + " · " + ip,
        actions: h(
          Button,
          { size: "sm", variant: "soft", icon: "refresh", onClick: refresh },
          "刷新信息",
        ),
      }),

      /* ===== 设备头 ===== */
      h(
        "div",
        { className: "section" },
        h(
          "div",
          { className: "hero-card" },
          h("div", { className: "hero-avatar" }, h(R1UI.QQAvatar, { fallback: "R1" })),
          h(
            "div",
            { className: "hero-main" },
            h("div", { className: "hero-name" }, devName),
            h(
              "div",
              { className: "hero-sub" },
              h("span", { className: "mono" }, ip),
              h("span", null, "固件 " + text(info.firmware_ver)),
              h(Pill, { tone: "ok", dot: true, pulse: true }, "已连接"),
            ),
          ),
          h(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            h(
              Button,
              { size: "sm", variant: "ghost", icon: "refresh", onClick: reconnectNow },
              "重新连接",
            ),
            h(
              Button,
              { size: "sm", variant: "danger", icon: "power", onClick: disconnectNow },
              "断开连接",
            ),
          ),
        ),
      ),

      /* ===== 关键信息 ===== */
      h(
        "div",
        { className: "section" },
        h(
          "div",
          { className: "stat-grid" },
          Stat("固件版本", info.firmware_ver),
          Stat("设备 IP", ip),
          Stat("CPU", cpuText, true),
          Stat("内存", memText, true),
          Stat("已运行", info.uptime, true),
          Stat("设备时间", info.device_time, true),
          Stat("授权状态", authStatus, true),
          Stat("登录用户", api.nick ? api.nick + "（" + (api.userid || "") + "）" : null, true),
        ),
      ),

      /* ===== 登录与授权 ===== */
      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "登录与授权", icon: "user" },
          h(
            "div",
            { className: "rows" },
            h(Row, {
              icon: "user",
              accent: true,
              title: "用户",
              sub: api.nick ? api.nick + "（" + (api.userid || "") + "）" : "--",
            }),
            h(Row, { icon: "music", title: "QQ 音乐", sub: qqStatus }),
            h(Row, { icon: "music", title: "网易云音乐", sub: neteaseStatus }),
            h(Row, { icon: "music", title: "酷我音乐", sub: kuwoStatus }),
            h(Row, { icon: "clock", title: "最后登录", sub: text(api.login_time) }),
            h(Row, {
              icon: "star",
              title: "授权到期",
              sub: sqType === 3 ? api.sq_expire_time_text || "永久" : fmtTs(api.sq_expire_time),
            }),
          ),
          h("div", { className: "divider" }),
          h(
            "div",
            { className: "hint" },
            "公网 IP " + text(api.ip) + " · SN " + text(api.sn) + " · MAC " + text(api.mac),
          ),
        ),
      ),

      /* ===== 服务开关 ===== */
      h(
        "div",
        { className: "section" },
        h(Card, { title: "后台服务", icon: "link" }, h(ServiceSwitches)),
      ),

      /* ===== 常用工具 ===== */
      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "常用工具", icon: "grid" },
          h(
            "div",
            { className: "tools-grid" },
            TOOLS.map(function (t) {
              return h(
                "div",
                {
                  key: t.sheet,
                  className: "tool",
                  style: { cursor: "pointer" },
                  onClick: function () {
                    openTool(t);
                  },
                },
                h("div", { className: "t-ico" }, h(Icon, { name: t.icon })),
                h("div", { className: "t-name" }, t.name),
                h("div", { className: "t-desc" }, t.desc),
              );
            }),
            h(
              "div",
              {
                className: "tool",
                style: { cursor: "pointer" },
                onClick: function () {
                  safe(function () {
                    R1WS.openConfigWifi();
                  }, "配网页打开失败");
                },
              },
              h("div", { className: "t-ico" }, h(Icon, { name: "wifi" })),
              h("div", { className: "t-name" }, "配网"),
              h("div", { className: "t-desc" }, "重新配置音箱 Wi-Fi"),
            ),
          ),
        ),
      ),
    );
  }

  /* =====================================================================
   * 弹层：扫码登录
   * =================================================================== */
  /* 原版 get_uin：p_uin 形如 "o1234567890"，去掉前导 0 得到 QQ 号 */
  function getUin(uin) {
    if (!uin) return "";
    uin = String(uin).substr(1);
    for (var i = 0; i < uin.length; i++) {
      if (uin[i] != 0) return uin.substr(i);
    }
    return uin;
  }

  function LoginSheet(props) {
    var st = C.useStore();
    var later = useTimers();

    var _src = useState(1),
      src = _src[0],
      setSrc = _src[1];
    var _qr = useState(""),
      qrSrc = _qr[0],
      setQrSrc = _qr[1];
    var _sig = useState(""),
      qrsig = _sig[0],
      setQrsig = _sig[1];
    var _msg = useState("正在检测登录状态…"),
      msg = _msg[0],
      setMsg = _msg[1];
    var _sub = useState(""),
      sub = _sub[0],
      setSub = _sub[1];
    var _phase = useState("idle"),
      phase = _phase[0],
      setPhase = _phase[1];
    var _user = useState(null),
      user = _user[0],
      setUser = _user[1];
    var _loading = useState(false),
      loading = _loading[0],
      setLoading = _loading[1];

    var pollRef = useRef(null);
    var loginRef = useRef(null);
    var qrTimeoutRef = useRef(null);
    var qrsigRef = useRef("");
    var srcRef = useRef(1);
    var scannedRef = useRef(false);
    var autoRef = useRef(false);
    useEffect(
      function () {
        qrsigRef.current = qrsig;
      },
      [qrsig],
    );
    useEffect(
      function () {
        srcRef.current = src;
      },
      [src],
    );

    /* payload 可由调用方指定初始音源 */
    useEffect(function () {
      var p = props && props.payload;
      if (p && (p.source === 1 || p.source === 2 || p.source === 3)) {
        srcRef.current = p.source;
        setSrc(p.source);
      }
    }, []);

    function stopPolling() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    /* 原版 start_update_qrstate：立即查一次 + 每 2 秒轮询 */
    function startPolling() {
      stopPolling();
      setSub("等待二维码状态返回…");
      safe(function () {
        R1WS.pollQRCodeState(srcRef.current, qrsigRef.current);
      });
      pollRef.current = setInterval(function () {
        if (R1WS.isConnected && !R1WS.isConnected()) return;
        safe(function () {
          R1WS.pollQRCodeState(srcRef.current, qrsigRef.current);
        });
      }, 2000);
    }
    function clearQrTimeout() {
      if (qrTimeoutRef.current) {
        clearTimeout(qrTimeoutRef.current);
        qrTimeoutRef.current = null;
      }
    }
    /* 原版 update_qrcode：拿二维码 + 30 秒超时提示 */
    function refreshQR() {
      stopPolling();
      scannedRef.current = false;
      setQrSrc("");
      setQrsig("");
      qrsigRef.current = "";
      setPhase("qrcode");
      setLoading(true);
      setMsg("正在加载二维码，请稍候…");
      setSub("第一次加载可能较慢，请耐心等待");
      clearQrTimeout();
      qrTimeoutRef.current = setTimeout(function () {
        qrTimeoutRef.current = null;
        setLoading(false);
        setMsg("二维码加载超时，请点击刷新二维码");
        setSub("多次超时可尝试重启小讯后再刷新");
      }, 30000);
      safe(function () {
        R1WS.requestQRCode(srcRef.current);
      }, "获取二维码失败");
    }
    function autoQR() {
      if (autoRef.current) return;
      autoRef.current = true;
      refreshQR();
    }

    /* ---------- 事件 ---------- */
    C.useR1Event("qrcode", function (data) {
      if (!data) return;
      clearQrTimeout();
      setLoading(false);
      setQrSrc(data.image || "");
      var sig = (data.cookies && data.cookies.qrsig) || "";
      qrsigRef.current = sig;
      setQrsig(sig);
      setMsg("请使用手机 QQ 扫码授权登录");
      setSub("也可在手机 QQ 内打开本页面地址，长按二维码图片扫码");
      startPolling();
    });

    C.useR1Event("qrcode_state", function (data) {
      if (!data) return;
      if (scannedRef.current) return;
      var qs = data.qrcode_state;
      if (!qs) return;
      var code = qs.code;
      var call = qs[qs.call];
      var callMsg = call ? call[4] : "";
      /* 0=已确认 66=待扫码 67=已扫码待确认，其余视为失效 */
      if ((code != 66 && code != 67) || data.code == 0) stopPolling();
      if (code == 0) {
        scannedRef.current = true;
        var uin = "";
        try {
          uin = getUin(qs.location.cookies.p_uin);
        } catch (e) {}
        var nick = call ? call[5] : "";
        /* 扫码成功即缓存 QQ 号：设备上报 api_info 的时机不稳定，
         * 头像组件在拿到上报前先用这个缓存显示头像 */
        try {
          if (uin) localStorage.setItem("r1_qq_avatar", uin);
        } catch (e) {}
        setMsg("扫码成功：" + nick + (uin ? "（" + uin + "）" : ""));
        setSub("正在提交登录信息…");
        if (loginRef.current) clearTimeout(loginRef.current);
        loginRef.current = setTimeout(function () {
          loginRef.current = null;
          safe(function () {
            R1WS.loginByQRState(qs, srcRef.current);
          });
        }, 1000);
      } else if (code == 66) {
        setSub("等待扫码…");
      } else if (code == 67) {
        setSub("已扫码，请在手机上确认…");
      } else {
        stopPolling();
        setMsg(callMsg || "二维码已失效，请刷新");
        setSub("");
      }
    });

    /* 登录状态：普通消息与 Unisound 通道各回一个事件名，两条都监听（旧版即如此） */
    function onLoginState(data) {
      if (!data || data.code != 1) return;
      var ls = data.login_state;
      if (ls == 1) {
        stopPolling();
        setPhase("success");
        setMsg("登录成功");
        setSub("");
        safe(function () {
          R1WS.requestDeviceInfo(true);
        });
      } else if (ls == 0) {
        setPhase("idle");
        setMsg("等待小讯初始化…");
        setSub("请确保设备上的 new_Unisound 版本为 1.8 或以上");
        later(function () {
          safe(function () {
            R1WS.requestLoginState();
          });
        }, 1000);
      } else if (ls == -4) {
        setMsg(data.login_msg || "授权失败");
        setSub("可先校准音箱时间，再刷新二维码");
        autoQR();
      } else {
        autoQR(); /* 未登录：自动拉起一次二维码 */
      }
    }
    C.useR1Event("login_state", onLoginState);
    C.useR1Event("unisound_login_state", onLoginState);

    /* 登录结果（Unisound 与 API 两条通道） */
    function onLoginResult(data) {
      if (!data) return;
      var loginState = data.login_state;
      var nick = data.nick,
        userid = data.userid,
        loginMsg = data.login_msg;
      if (data.data && typeof data.data === "object") {
        if (loginState === undefined && data.data.login_state !== undefined)
          loginState = data.data.login_state;
        if (!nick && data.data.nick) nick = data.data.nick;
        if (!userid && data.data.userid) userid = data.data.userid;
        if (!loginMsg && data.data.login_msg) loginMsg = data.data.login_msg;
      }
      if (data.code !== undefined && data.code != 1 && data.code != 200 && data.code !== "200") {
        setMsg(loginMsg || "登录失败");
        toast(loginMsg || "登录失败", "err");
        return;
      }
      if (loginState === undefined || loginState == 1 || loginState == "1") {
        stopPolling();
        setPhase("success");
        setUser({ nick: nick || "", userid: userid || "" });
        setMsg("登录成功，欢迎 " + (nick || "") + (userid ? "[" + userid + "]" : ""));
        setSub("");
        safe(function () {
          R1WS.requestLoginState();
        });
        later(function () {
          safe(function () {
            R1WS.requestDeviceInfo(true);
          });
        }, 1000);
      } else {
        setMsg(loginMsg || "登录失败");
        toast(loginMsg || "登录失败", "err");
      }
    }
    C.useR1Event("unisound_login", onLoginResult);
    C.useR1Event("login_result", onLoginResult);

    C.useR1Event("exit_login", function () {
      stopPolling();
      setUser(null);
      setPhase("idle");
      setQrSrc("");
      setMsg("已退出登录");
      setSub("");
    });

    /* 挂载：先问一次登录状态；所有定时器卸载清理 */
    useEffect(function () {
      safe(function () {
        R1WS.requestLoginState();
      });
      return function () {
        stopPolling();
        if (loginRef.current) {
          clearTimeout(loginRef.current);
          loginRef.current = null;
        }
        clearQrTimeout();
      };
    }, []);

    function pickSource(v) {
      setSrc(v);
      srcRef.current = v;
      autoRef.current = false;
      scannedRef.current = false;
      refreshQR();
    }
    function doLogout() {
      C.confirm({
        title: "退出登录",
        desc: "将退出当前音源账号，之后需要重新扫码登录。",
        okText: "退出登录",
        cancelText: "取消",
      }).then(function (ok) {
        if (!ok) return;
        safe(function () {
          R1WS.logout(srcRef.current);
        }, "退出登录指令发送失败");
        /* 同步清掉本地头像缓存，徽标立即回退 R1 字样 */
        try {
          localStorage.removeItem("r1_qq_avatar");
        } catch (e) {}
        setUser(null);
        setPhase("idle");
        setQrSrc("");
        stopPolling();
        autoRef.current = false;
        setMsg("已发送退出登录请求");
        setSub("");
        toast("已退出登录", "ok");
      });
    }
    function calibrateTime() {
      safe(function () {
        R1WS.executeShell(
          "settings put global ntp_server ntp1.aliyun.com & date " +
            String(Date.now()).substring(0, 10),
          "set_date",
        );
      }, "校准指令发送失败");
      toast("正在校准音箱时间…", "info");
    }

    var api = st.apiInfo || {};
    var logged = phase === "success" || !!(user && user.nick) || api.qqmusic_login_state === 1;
    var srcLabel = { 1: "QQ 音乐", 2: "网易云音乐", 3: "酷我音乐" }[src] || "QQ 音乐";

    return h(
      "div",
      null,
      /* 说明：登录 QQ 音乐会同步登录网易云和酷我（设备端共用授权），
       * 因此不再提供音源切换，二维码固定走 QQ 通道 */

      logged && phase === "success"
        ? h(
            "div",
            { style: { textAlign: "center", padding: "6px 0 2px" } },
            h(
              "div",
              { style: { display: "grid", placeItems: "center", marginBottom: 10 } },
              h(
                "div",
                { className: "hero-avatar" },
                user && user.nick ? user.nick.substr(0, 1) : "R",
              ),
            ),
            h(
              "div",
              { style: { fontWeight: 700, fontSize: 16, color: "var(--t1)" } },
              "登录成功：" + ((user && user.nick) || api.nick || "已登录账号"),
            ),
            h(
              "div",
              { className: "hint", style: { marginTop: 6 } },
              "登录后同步解锁 QQ / 网易云 / 酷我歌单",
            ),
          )
        : h(
            "div",
            null,
            h(
              "div",
              { className: "qr" },
              loading
                ? h(Icon, { name: "loader", size: 28 })
                : qrSrc
                  ? h("img", { src: qrSrc, alt: "登录二维码" })
                  : h(Icon, { name: "qrcode", size: 34 }),
            ),
            h(
              "div",
              {
                className: "hint",
                style: { textAlign: "center", marginTop: 10, fontWeight: 600, color: "var(--t2)" },
              },
              msg,
            ),
            sub
              ? h("div", { className: "hint", style: { textAlign: "center", marginTop: 4 } }, sub)
              : null,
          ),

      h("div", { className: "divider" }),

      h(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        h(
          Button,
          { variant: "primary", icon: "refresh", onClick: refreshQR },
          logged ? "重新扫码" : "获取二维码",
        ),
        h(Button, { variant: "ghost", icon: "clock", onClick: calibrateTime }, "校准音箱时间"),
        logged
          ? h(Button, { variant: "danger", icon: "power", onClick: doLogout }, "退出登录")
          : null,
      ),

      h("div", { className: "divider" }),

      h(
        "div",
        { className: "rows" },
        h(Row, {
          icon: "music",
          title: "QQ 音乐",
          sub: api.qqmusic_login_state === 1 ? "已登录（" + (api.userid || "") + "）" : "未登录",
        }),
        h(Row, {
          icon: "music",
          title: "网易云音乐",
          sub:
            api.netease_login_state === 1
              ? "已登录（" + (api.netease_uid || "") + "）"
              : api.netease_login_info || "未登录",
        }),
        h(Row, {
          icon: "music",
          title: "酷我音乐",
          sub: api.kuwo_login_state === 1 ? "已登录（" + (api.kuwo_uid || "") + "）" : "未登录",
        }),
      ),
    );
  }

  /* =====================================================================
   * 弹层：本地音乐
   * =================================================================== */
  function LocalMusicSheet() {
    var st = C.useStore();
    var later = useTimers();

    var _list = useState([]),
      list = _list[0],
      setList = _list[1];
    var _scan = useState(false),
      scanning = _scan[0],
      setScanning = _scan[1];
    var _path = useState(""),
      path = _path[0],
      setPath = _path[1];
    var _kw = useState(""),
      kw = _kw[0],
      setKw = _kw[1];

    function onList(data) {
      var items = [];
      if (data && data.data && Array.isArray(data.data.list)) items = data.data.list;
      else if (Array.isArray(data)) items = data;
      setList(items);
      setScanning(false);
      if (items.length) toast("已加载 " + items.length + " 首本地音乐", "ok");
    }
    function onScan(data) {
      setScanning(false);
      if (data && (data.code === 200 || data.code === "200")) {
        toast("扫描完成，正在加载列表…", "ok");
        later(function () {
          safe(function () {
            R1WS.requestLocalMusicList();
          });
        }, 1000);
      } else {
        toast("扫描失败", "err");
      }
    }
    C.useR1Event("local_music_list", onList);
    C.useR1Event("local_music_scan", onScan);

    useEffect(function () {
      safe(function () {
        R1WS.requestLocalMusicList();
      });
    }, []);

    function doScan() {
      if (!st.connected) {
        toast("请先连接设备", "err");
        return;
      }
      setScanning(true);
      safe(function () {
        R1WS.scanLocalMusic();
      }, "扫描指令发送失败");
      later(function () {
        safe(function () {
          R1WS.requestLocalMusicList();
        });
      }, 2000);
      /* 兜底：设备没回包也别让按钮一直转 */
      later(function () {
        setScanning(false);
      }, 8000);
    }
    function play(item) {
      if (!st.connected) {
        toast("请先连接设备", "err");
        return;
      }
      var target = item && (item.path || item);
      if (!target) {
        toast("该条目缺少文件路径", "err");
        return;
      }
      safe(function () {
        R1WS.playLocalMusic(target);
      }, "播放指令发送失败");
      toast("开始播放：" + ((item && (item.name || item.title)) || ""), "ok");
    }
    function playPath() {
      var p = (path || "").trim();
      if (!p) {
        toast("请输入文件路径", "err");
        return;
      }
      if (!st.connected) {
        toast("请先连接设备", "err");
        return;
      }
      safe(function () {
        R1WS.playLocalMusic(p);
      }, "播放指令发送失败");
      toast("已发送播放指令", "ok");
    }

    var filtered = list.filter(function (m) {
      if (!kw) return true;
      var name = (m.name || m.title || m.path || "").toLowerCase();
      return name.indexOf(kw.toLowerCase()) >= 0;
    });

    return h(
      "div",
      null,
      h(
        "div",
        { style: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" } },
        h(
          Button,
          { size: "sm", variant: "primary", icon: "search", loading: scanning, onClick: doScan },
          scanning ? "扫描中…" : "扫描设备",
        ),
        h(
          "div",
          { style: { flex: 1, minWidth: 180 } },
          h(SearchBar, {
            value: kw,
            onChange: setKw,
            placeholder: "搜索本地音乐（" + list.length + " 首）",
          }),
        ),
      ),

      h(
        "div",
        { style: { display: "flex", gap: 8, marginBottom: 12 } },
        h(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          h(Input, {
            value: path,
            onChange: setPath,
            placeholder: "输入文件路径，如 /sdcard/Music/xxx.mp3",
            onKeyDown: function (e) {
              if (e.key === "Enter") playPath();
            },
          }),
        ),
        h(Button, { variant: "soft", icon: "play", onClick: playPath }, "播放"),
      ),

      filtered.length
        ? h(
            "div",
            { className: "rows" },
            filtered.map(function (m, i) {
              return h(Row, {
                key: i,
                icon: "music",
                accent: true,
                title: m.name || m.title || m.path || "未知文件",
                sub: m.artist || m.album || m.path || "",
                onClick: function () {
                  play(m);
                },
                end: h(Button, { size: "sm", variant: "soft", icon: "play" }, "播放"),
              });
            }),
          )
        : h(Empty, {
            icon: "folder",
            title: list.length ? "无匹配结果" : "暂无本地音乐",
            desc: list.length ? "换个关键词试试" : '点击上方"扫描设备"读取音箱存储的音频文件',
          }),
    );
  }

  /* =====================================================================
   * 弹层：备忘 / 闹钟 / 提醒
   * =================================================================== */
  function MemoSheet() {
    var st = C.useStore();
    var later = useTimers();

    var _memos = useState([]),
      memos = _memos[0],
      setMemos = _memos[1];
    var _filter = useState("all"),
      filter = _filter[0],
      setFilter = _filter[1];
    var _type = useState(0),
      mType = _type[0],
      setMType = _type[1];
    var _time = useState("08:00"),
      mTime = _time[0],
      setMTime = _time[1];
    var _text = useState(""),
      mText = _text[0],
      setMText = _text[1];

    function onMemo(data) {
      if (!data) return;
      if (data.memo) setMemos(data.memo);
      else if (Array.isArray(data)) setMemos(data);
    }
    /* 不同固件通道回的事件名不同：两条都监听，处理是幂等的 */
    C.useR1Event("memo_info", onMemo);
    C.useR1Event("memo", onMemo);

    useEffect(function () {
      safe(function () {
        R1WS.requestMemoList();
      });
    }, []);

    function reload() {
      later(function () {
        safe(function () {
          R1WS.requestMemoList();
        });
      }, 500);
    }
    function add() {
      var t = (mText || "").trim();
      if (!t) {
        toast("请输入内容", "err");
        return;
      }
      if (!st.connected) {
        toast("请先连接设备", "err");
        return;
      }
      safe(function () {
        R1WS.addMemo({ type: Number(mType), time: mTime || "08:00", text: t });
      }, "添加失败");
      toast("已添加", "ok");
      setMText("");
      reload();
    }
    function del(item) {
      if (!st.connected) {
        toast("请先连接设备", "err");
        return;
      }
      safe(function () {
        R1WS.deleteMemo(item.id);
      }, "删除失败");
      toast("已删除", "ok");
      reload();
    }
    function clearAlarms() {
      C.confirm({
        title: "清空闹钟与提醒",
        desc: "将删除设备上所有闹钟（type=1）与提醒（type=0），备忘不受影响。",
        okText: "清空",
        cancelText: "取消",
      }).then(function (ok) {
        if (!ok) return;
        safe(function () {
          R1WS.clearAlarms();
        }, "清空失败");
        toast("已发送清空指令", "ok");
        reload();
      });
    }

    var typeNames = { 0: "提醒", 1: "闹钟", 2: "备忘" };
    var typeIcons = { 0: "clock", 1: "clock", 2: "note" };
    var shown = memos.filter(function (m) {
      if (filter === "all") return true;
      return String(m.type) === filter;
    });

    return h(
      "div",
      null,
      h(
        "div",
        {
          style: {
            display: "flex",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
            alignItems: "center",
          },
        },
        h(Seg, {
          value: filter,
          onChange: setFilter,
          items: [
            { key: "all", label: "全部" },
            { key: "0", label: "提醒" },
            { key: "1", label: "闹钟" },
            { key: "2", label: "备忘" },
          ],
        }),
        h("div", { style: { flex: 1 } }),
        h(
          Button,
          { size: "sm", variant: "danger", icon: "trash", onClick: clearAlarms },
          "清空闹钟",
        ),
      ),

      h(
        "div",
        { className: "card tight", style: { marginBottom: 12 } },
        h(
          "div",
          { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" } },
          h(
            "div",
            { style: { flex: "1 1 160px" } },
            h(
              Field,
              { label: "类型" },
              h(Seg, {
                value: String(mType),
                onChange: function (k) {
                  setMType(Number(k));
                },
                items: [
                  { key: "0", label: "提醒" },
                  { key: "1", label: "闹钟" },
                  { key: "2", label: "备忘" },
                ],
              }),
            ),
          ),
          h(
            "div",
            { style: { width: 120 } },
            h(
              Field,
              { label: "时间" },
              h(Input, { value: mTime, onChange: setMTime, type: "time" }),
            ),
          ),
          h(Button, { variant: "primary", icon: "plus", onClick: add }, "新增"),
        ),
        h(
          "div",
          { style: { marginTop: 10 } },
          h(
            Field,
            { label: "内容" },
            h(Input, {
              value: mText,
              onChange: setMText,
              placeholder: "例如：8 点提醒我吃药",
              onKeyDown: function (e) {
                if (e.key === "Enter") add();
              },
            }),
          ),
        ),
      ),

      shown.length
        ? h(
            "div",
            { className: "rows" },
            shown.map(function (m, i) {
              return h(Row, {
                key: m.id != null ? m.id : i,
                icon: typeIcons[m.type] || "note",
                accent: m.type === 1,
                title: m.text || m.content || m.title || "（无内容）",
                sub: (m.time || "") + " · " + (typeNames[m.type] || "备忘"),
                end: h(IconBtn, {
                  icon: "trash",
                  title: "删除",
                  onClick: function () {
                    del(m);
                  },
                }),
              });
            }),
          )
        : h(Empty, {
            icon: "note",
            title: "暂无数据",
            desc: "在上方填写内容即可新增提醒、闹钟或备忘",
          }),
    );
  }

  /* =====================================================================
   * 弹层：语音报时
   * =================================================================== */
  function VoiceSheet() {
    var st = C.useStore();
    var _en = useState(false),
      enable = _en[0],
      setEnable = _en[1];
    var _hour = useState(true),
      hour = _hour[0],
      setHour = _hour[1];
    var _half = useState(false),
      halfHour = _half[0],
      setHalfHour = _half[1];
    var _h12 = useState(false),
      time12h = _h12[0],
      setTime12h = _h12[1];
    var _start = useState("08:00"),
      startTime = _start[0],
      setStartTime = _start[1];
    var _end = useState("22:00"),
      endTime = _end[0],
      setEndTime = _end[1];

    function save() {
      if (!st.connected) {
        toast("请先连接设备", "err");
        return;
      }
      safe(function () {
        R1WS.setVoiceTimeReporting({
          enable: enable,
          hour: hour,
          half_hour: halfHour,
          time_12h: time12h,
          start_time: startTime,
          end_time: endTime,
        });
      }, "语音报时设置失败");
      toast("语音报时设置已保存", "ok");
    }

    return h(
      "div",
      null,
      h(
        "div",
        { className: "card tight", style: { marginBottom: 12 } },
        h(
          "div",
          { className: "rows" },
          h(Row, {
            icon: "clock",
            accent: true,
            title: "启用语音报时",
            sub: "开启后设备将在指定时段内播报时间",
            end: h(Switch, { on: enable, onChange: setEnable }),
          }),
          h(Row, {
            icon: "clock",
            title: "整点报时",
            sub: "每整点播报一次",
            end: h(Switch, { on: hour, disabled: !enable, onChange: setHour }),
          }),
          h(Row, {
            icon: "clock",
            title: "半点报时",
            sub: "每半点播报一次",
            end: h(Switch, { on: halfHour, disabled: !enable, onChange: setHalfHour }),
          }),
          h(Row, {
            icon: "sun",
            title: "12 小时制",
            sub: "使用上午 / 下午格式播报",
            end: h(Switch, { on: time12h, disabled: !enable, onChange: setTime12h }),
          }),
        ),
      ),
      h(
        "div",
        { className: "card tight", style: { marginBottom: 12 } },
        h(
          "div",
          { className: "rows" },
          h(Row, {
            icon: "sun",
            title: "开始时间",
            sub: "生效时段起点",
            end: h(
              "div",
              { style: { width: 130 } },
              h(Input, {
                value: startTime,
                onChange: setStartTime,
                type: "time",
                disabled: !enable,
              }),
            ),
          }),
          h(Row, {
            icon: "moon",
            title: "结束时间",
            sub: "生效时段终点",
            end: h(
              "div",
              { style: { width: 130 } },
              h(Input, { value: endTime, onChange: setEndTime, type: "time", disabled: !enable }),
            ),
          }),
        ),
      ),
      h(
        "div",
        { style: { display: "flex", gap: 10, alignItems: "center" } },
        h(Button, { variant: "primary", block: true, onClick: save }, "保存设置"),
      ),
      h(
        "div",
        { className: "hint", style: { marginTop: 10 } },
        "设备不回传报时配置，此处为本次会话的设置值；保存后立即生效。",
      ),
    );
  }

  /* =====================================================================
   * 弹层：自动重启 + 手动重启
   * =================================================================== */
  function RestartSheet() {
    var st = C.useStore();
    var _en = useState(false),
      enable = _en[0],
      setEnable = _en[1];
    var _time = useState("03:00"),
      time = _time[0],
      setTime = _time[1];

    function save() {
      if (!st.connected) {
        toast("请先连接设备", "err");
        return;
      }
      safe(function () {
        R1WS.setAutoRestart(enable, time);
      }, "自动重启设置失败");
      toast(enable ? "已设置每天 " + time + " 自动重启" : "已关闭定时重启", "ok");
    }
    function reboot(kind) {
      var map = {
        device: {
          t: "重启音箱",
          d: "音箱将立即重启，期间会短暂离线。",
          fn: function () {
            R1WS.rebootDevice();
          },
        },
        echo: {
          t: "重启 Echo 服务",
          d: "将重启音箱上的 Echo 相关服务。",
          fn: function () {
            R1WS.rebootEcho();
          },
        },
        adbd: {
          t: "重启 adbd",
          d: "将重启设备的 ADB 守护进程。",
          fn: function () {
            R1WS.rebootAdbd();
          },
        },
      };
      var item = map[kind];
      if (!item) return;
      C.confirm({ title: item.t, desc: item.d, okText: "确认重启", cancelText: "取消" }).then(
        function (ok) {
          if (!ok) return;
          safe(function () {
            item.fn();
          }, item.t + "指令发送失败");
          toast("已发送：" + item.t, "ok");
        },
      );
    }

    return h(
      "div",
      null,
      h(
        "div",
        { className: "card tight", style: { marginBottom: 12 } },
        h(
          "div",
          { className: "rows" },
          h(Row, {
            icon: "refresh",
            accent: true,
            title: "启用定时重启",
            sub: "开启后设备每天在指定时间自动重启一次",
            end: h(Switch, { on: enable, onChange: setEnable }),
          }),
          h(Row, {
            icon: "clock",
            title: "重启时间",
            sub: "建议设在无人使用的时段（如凌晨）",
            end: h(
              "div",
              { style: { width: 130 } },
              h(Input, { value: time, onChange: setTime, type: "time", disabled: !enable }),
            ),
          }),
        ),
      ),
      h(
        "div",
        { style: { marginBottom: 12 } },
        h(Button, { variant: "primary", block: true, onClick: save }, "保存设置"),
      ),
      h("div", { className: "hint" }, "重启期间设备将短暂离线，已保存的设置不会丢失。"),

      h("div", { className: "divider" }),

      h(
        "div",
        { className: "section", style: { marginBottom: 0 } },
        h(
          Card,
          { title: "手动重启", icon: "power", tight: true },
          h(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            h(
              Button,
              {
                size: "sm",
                variant: "danger",
                icon: "refresh",
                onClick: function () {
                  reboot("device");
                },
              },
              "重启音箱",
            ),
            h(
              Button,
              {
                size: "sm",
                variant: "danger",
                icon: "volume",
                onClick: function () {
                  reboot("echo");
                },
              },
              "重启 Echo 服务",
            ),
            h(
              Button,
              {
                size: "sm",
                variant: "danger",
                icon: "terminal",
                onClick: function () {
                  reboot("adbd");
                },
              },
              "重启 adbd",
            ),
          ),
          h("div", { className: "hint", style: { marginTop: 10 } }, "以上操作均需二次确认。"),
        ),
      ),
    );
  }

  /* =====================================================================
   * 弹层：高级工具（DLNA / mDNS / ADB / 配网 / 背景 / 小爱 / 休眠麦克风）
   * =================================================================== */
  function AdvancedSheet() {
    var _bg = useState(C.getCustomBg ? C.getCustomBg() : ""),
      bg = _bg[0],
      setBg = _bg[1];
    var _xiaoai = useState(true),
      xiaoai = _xiaoai[0],
      setXiaoai = _xiaoai[1];
    var _uni = useState({}),
      uni = _uni[0],
      setUni = _uni[1];
    var fileRef = useRef(null);

    C.useR1Event("xiaoai_state", function (info) {
      if (!info) return;
      if (info.is_xiaoai !== undefined) setXiaoai(!!info.is_xiaoai);
      else if (info.data && info.data.is_xiaoai !== undefined) setXiaoai(!!info.data.is_xiaoai);
    });
    C.useR1Event("unisound_device_info", function (info) {
      if (info)
        setUni(function (p) {
          return Object.assign({}, p, info);
        });
    });

    var tools = [
      {
        icon: "wifi",
        name: "DLNA 投屏",
        desc: "开启后可用手机投屏软件搜索音箱",
        act: function () {
          safe(function () {
            R1WS.openDLNA();
          });
          toast("DLNA 已开启", "ok");
        },
      },
      {
        icon: "signal",
        name: "mDNS 服务",
        desc: "重启局域网服务发现进程",
        act: function () {
          safe(function () {
            R1WS.openMDNS();
          });
          toast("正在重启 mDNS 服务…", "info");
        },
      },
      {
        icon: "terminal",
        name: "ADB 控制台",
        desc: "在页面内执行 Shell 命令",
        act: function () {
          C.openSheet("adb");
        },
      },
      {
        icon: "link",
        name: "重新配网",
        desc: "打开配置页面重设 Wi-Fi",
        act: function () {
          safe(function () {
            R1WS.openConfigWifi();
          }, "配网页打开失败");
        },
      },
    ];

    /* 选图 → canvas 压缩（最长边 1920、JPEG 0.82）→ 存为网页背景。
     * 压缩是为了塞进 localStorage（原始 base64 动辄几 MB 会存不下）。 */
    function compressImage(dataUrl, cb) {
      var img = new Image();
      img.onload = function () {
        try {
          var max = 1920;
          var w = img.width,
            hgt = img.height;
          var scale = Math.min(1, max / Math.max(w, hgt));
          var cv = document.createElement("canvas");
          cv.width = Math.round(w * scale);
          cv.height = Math.round(hgt * scale);
          cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
          cb(cv.toDataURL("image/jpeg", 0.82));
        } catch (err) {
          cb(dataUrl);
        }
      };
      img.onerror = function () {
        cb(dataUrl);
      };
      img.src = dataUrl;
    }
    function pickBg(e) {
      try {
        var file = e && e.target && e.target.files && e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          toast("图片大小不能超过 5MB", "err");
          return;
        }
        var reader = new FileReader();
        reader.onload = function (ev) {
          compressImage(ev.target.result, function (small) {
            setBg(small);
            C.setCustomBg(small);
            toast("网页背景已更新", "ok");
          });
        };
        reader.readAsDataURL(file);
        if (e.target) e.target.value = "";
      } catch (err) {
        toast("读取文件失败：" + (err && err.message), "err");
      }
    }

    function confirmThen(title, desc, fn) {
      C.confirm({ title: title, desc: desc, okText: "确认执行", cancelText: "取消" }).then(
        function (ok) {
          if (!ok) return;
          safe(fn, title + "失败");
          toast("已发送指令", "ok");
        },
      );
    }

    return h(
      "div",
      null,
      /* ===== 高级工具 ===== */
      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "高级工具", icon: "sliders", tight: true },
          h(
            "div",
            { className: "tools-grid" },
            tools.map(function (t) {
              return h(
                "div",
                {
                  key: t.name,
                  className: "tool",
                  style: { cursor: "pointer" },
                  onClick: t.act,
                },
                h("div", { className: "t-ico" }, h(Icon, { name: t.icon })),
                h("div", { className: "t-name" }, t.name),
                h("div", { className: "t-desc" }, t.desc),
              );
            }),
          ),
        ),
      ),

      /* ===== 自定义背景 ===== */
      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "自定义背景", icon: "image", tight: true },
          h("input", {
            type: "file",
            accept: "image/*",
            ref: fileRef,
            onChange: pickBg,
            style: { display: "none" },
          }),
          h(
            "div",
            { className: "hint" },
            "上传一张图片作为整个网页的背景，界面自动变成半透明毛玻璃（图片会自动压缩，不超过 5MB）。",
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                gap: 8,
                marginTop: 10,
                alignItems: "center",
                flexWrap: "wrap",
              },
            },
            h(
              Button,
              {
                size: "sm",
                variant: "primary",
                icon: "image",
                onClick: function () {
                  if (fileRef.current) fileRef.current.click();
                },
              },
              "选择图片",
            ),
            bg
              ? h("div", {
                  style: {
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    border: "1px solid var(--stroke)",
                    backgroundImage: "url(" + bg + ")",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  },
                })
              : null,
            bg
              ? h(
                  Button,
                  {
                    size: "sm",
                    variant: "ghost",
                    icon: "trash",
                    onClick: function () {
                      setBg("");
                      C.setCustomBg("");
                      toast("已恢复默认背景", "ok");
                    },
                  },
                  "恢复默认",
                )
              : null,
          ),
        ),
      ),

      /* ===== 小爱同学 ===== */
      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "小爱同学", icon: "mic", tight: true },
          h(
            "div",
            { className: "rows" },
            h(Row, {
              icon: "mic",
              accent: true,
              title: "小爱唤醒",
              sub: xiaoai ? "已开启，可通过语音唤醒" : "已关闭",
              end: h(Switch, {
                on: xiaoai,
                onChange: function (v) {
                  setXiaoai(v);
                  safe(function () {
                    R1WS.setWakeupXiaoai(v);
                  }, "小爱唤醒设置失败");
                  toast(v ? "已开启小爱唤醒" : "已关闭小爱唤醒", "ok");
                },
              }),
            }),
            h(Row, {
              icon: "power",
              title: "重启小爱服务",
              sub: "小爱响应异常时可尝试",
              end: h(
                Button,
                {
                  size: "sm",
                  variant: "ghost",
                  onClick: function () {
                    confirmThen("重启小爱服务", "将重启设备上的小爱语音服务。", function () {
                      R1WS.rebootXiaoaiService();
                    });
                  },
                },
                "重启",
              ),
            }),
            h(Row, {
              icon: "sparkle",
              title: "一键激活",
              sub: "重新激活小爱授权",
              end: h(
                Button,
                {
                  size: "sm",
                  variant: "soft",
                  onClick: function () {
                    confirmThen("激活小爱", "将向设备发送小爱激活指令。", function () {
                      R1WS.activateXiaoai();
                    });
                  },
                },
                "激活",
              ),
            }),
            h(Row, {
              icon: "volume",
              title: "唤醒小讯",
              sub: "立即唤醒音箱语音助手",
              end: h(
                Button,
                {
                  size: "sm",
                  variant: "soft",
                  onClick: function () {
                    safe(function () {
                      R1WS.wakeupDevice();
                    });
                    toast("已唤醒小讯", "ok");
                  },
                },
                "唤醒",
              ),
            }),
          ),
        ),
      ),

      /* ===== 休眠与麦克风 ===== */
      h(
        "div",
        { className: "section", style: { marginBottom: 0 } },
        h(
          Card,
          { title: "休眠与麦克风", icon: "power", tight: true },
          h(
            "div",
            { className: "rows" },
            h(Row, {
              icon: "moon",
              title: uni.DeviceStatus === 5 ? "退出休眠" : "开始休眠",
              sub: uni.DeviceStatus === 5 ? "当前：休眠中" : "让设备进入低功耗休眠",
              end: h(
                Button,
                {
                  size: "sm",
                  variant: "ghost",
                  onClick: function () {
                    var sleeping = uni.DeviceStatus === 5;
                    confirmThen(
                      sleeping ? "退出休眠" : "开始休眠",
                      sleeping ? "将唤醒设备并恢复正常工作。" : "休眠后设备将停止响应语音与推送。",
                      function () {
                        R1WS.setDormancy(!sleeping);
                      },
                    );
                  },
                },
                "执行",
              ),
            }),
            h(Row, {
              icon: "mic",
              title: uni.isIdle ? "启用麦克风" : "禁用麦克风",
              sub: uni.isIdle ? "当前：麦克风已禁用（临时开关）" : "临时关闭麦克风拾音",
              end: h(
                Button,
                {
                  size: "sm",
                  variant: uni.isIdle ? "soft" : "danger",
                  onClick: function () {
                    if (uni.isIdle) {
                      safe(function () {
                        R1WS.enterWakeup();
                      });
                      toast("正在启用麦克风…", "ok");
                    } else {
                      confirmThen(
                        "禁用麦克风",
                        "禁用后音箱将无法被语音唤醒（临时开关，重启恢复）。",
                        function () {
                          R1WS.stopWakeup();
                        },
                      );
                    }
                  },
                },
                uni.isIdle ? "启用" : "禁用",
              ),
            }),
          ),
          h(
            "div",
            { className: "hint", style: { marginTop: 10 } },
            "当前状态：" +
              (uni.DeviceStatus === 5 ? "休眠中" : uni.isIdle ? "麦克风已禁用" : "正常"),
          ),
        ),
      ),
    );
  }

  /* =====================================================================
   * 弹层：设置（外观 + 快捷入口 + 本地数据 + 调试）
   * =================================================================== */
  function SettingsSheet() {
    var st = C.useStore();

    function clearHistory() {
      C.confirm({
        title: "清除连接历史",
        desc: "将删除本机保存的 IP 连接记录，下次需要重新输入。",
        okText: "清除",
        cancelText: "取消",
      }).then(function (ok) {
        if (!ok) return;
        try {
          localStorage.removeItem("r1_connect_history");
        } catch (e) {}
        C.setState({ history: [] });
        toast("连接历史已清除", "ok");
      });
    }
    function clearLocalCache() {
      C.confirm({
        title: "清除本地缓存",
        desc: "将删除收藏标记、登录昵称、自定义 EQ 等保存在浏览器里的数据，不影响设备。",
        okText: "清除",
        cancelText: "取消",
      }).then(function (ok) {
        if (!ok) return;
        try {
          localStorage.removeItem("r1_collected");
          localStorage.removeItem("r1_login_nick");
          localStorage.removeItem("r1_custom_eqs");
          localStorage.removeItem("r1_song_list_cache");
        } catch (e) {}
        toast("本地缓存已清除", "ok");
      });
    }
    function debugInfo() {
      safe(function () {
        R1WS.requestDeviceInfo(true);
      }, "请求设备信息失败");
      safe(function () {
        R1WS.requestServiceInfo();
      }, "请求服务状态失败");
      toast("已请求设备与服务信息", "ok");
    }

    var entries = [
      {
        icon: "qrcode",
        name: "账号登录",
        desc: "扫码登录音乐账号",
        act: function () {
          C.openSheet("login");
        },
      },
      {
        icon: "bluetooth",
        name: "蓝牙",
        desc: "连接与配对管理",
        act: function () {
          C.goRoute("bluetooth");
        },
      },
      {
        icon: "folder",
        name: "本地音乐",
        desc: "扫描并播放设备音频",
        act: function () {
          C.openSheet("local");
        },
      },
      {
        icon: "note",
        name: "备忘闹钟",
        desc: "提醒、闹钟与备忘",
        act: function () {
          C.openSheet("memo");
        },
      },
      {
        icon: "clock",
        name: "语音报时",
        desc: "整点 / 半点语音播报",
        act: function () {
          C.openSheet("voice");
        },
      },
      {
        icon: "refresh",
        name: "自动重启",
        desc: "定时自检与重启策略",
        act: function () {
          C.openSheet("restart");
        },
      },
      {
        icon: "sliders",
        name: "高级工具",
        desc: "DLNA / mDNS / 配网 / 小爱",
        act: function () {
          C.openSheet("advanced");
        },
      },
      {
        icon: "terminal",
        name: "ADB 控制台",
        desc: "在设备上执行 Shell",
        act: function () {
          C.openSheet("adb");
        },
      },
      {
        icon: "info",
        name: "关于",
        desc: "版本信息",
        act: function () {
          C.openSheet("about");
        },
      },
    ];

    return h(
      "div",
      null,
      /* ===== 外观 ===== */
      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "外观", icon: st.dark ? "moon" : "sun", tight: true },
          h(
            "div",
            { className: "rows" },
            h(Row, {
              icon: st.dark ? "moon" : "sun",
              accent: true,
              title: "暗色模式",
              sub: st.followSystem
                ? "已跟随系统，手动切换将自动关闭跟随"
                : st.dark
                  ? "当前为暗色"
                  : "当前为亮色",
              end: h(Switch, {
                on: !!st.dark,
                onChange: function (v) {
                  /* 手动切换时自动关闭"跟随系统"，否则刷新后系统主题又覆盖回来，
                   * 用户会觉得开关"失灵/颜色乱跳" */
                  if (st.followSystem) C.setFollowSystem(false);
                  C.applyTheme(v);
                },
              }),
            }),
            h(Row, {
              icon: "settings",
              title: "跟随系统",
              sub: "自动跟随操作系统的深浅色设置",
              end: h(Switch, {
                on: !!st.followSystem,
                onChange: function (v) {
                  C.setFollowSystem(v);
                },
              }),
            }),
          ),
        ),
      ),

      /* ===== 快捷入口 ===== */
      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "功能入口", icon: "grid", tight: true },
          h(
            "div",
            { className: "rows" },
            entries.map(function (e) {
              return h(Row, {
                key: e.name,
                icon: e.icon,
                title: e.name,
                sub: e.desc,
                onClick: e.act,
                end: h(Icon, { name: "chevronR" }),
              });
            }),
          ),
        ),
      ),

      /* ===== 本地数据 ===== */
      h(
        "div",
        { className: "section" },
        h(
          Card,
          { title: "本地数据", icon: "hdd", tight: true },
          h(
            "div",
            { className: "rows" },
            h(Row, {
              icon: "link",
              title: "清除连接历史",
              sub: "删除本机保存的 " + (st.history ? st.history.length : 0) + " 条 IP 记录",
              end: h(Button, { size: "sm", variant: "ghost", onClick: clearHistory }, "清除"),
            }),
            h(Row, {
              icon: "trash",
              title: "清除本地缓存",
              sub: "收藏、登录昵称、自定义 EQ 等浏览器数据",
              end: h(Button, { size: "sm", variant: "ghost", onClick: clearLocalCache }, "清除"),
            }),
          ),
        ),
      ),

      /* ===== 调试 ===== */
      h(
        "div",
        { className: "section", style: { marginBottom: 0 } },
        h(
          Card,
          { title: "调试", icon: "terminal", tight: true },
          h(
            "div",
            { className: "rows" },
            h(Row, {
              icon: "refresh",
              title: "刷新设备信息",
              sub: "强制重新拉取设备信息与服务开关状态",
              end: h(Button, { size: "sm", variant: "soft", onClick: debugInfo }, "请求"),
            }),
          ),
          h(
            "div",
            { className: "hint", style: { marginTop: 10 } },
            "页面切换或断开重连后，状态会自动重新拉取。",
          ),
        ),
      ),
    );
  }

  /* =====================================================================
   * 弹层：关于
   * =================================================================== */
  function AboutSheet() {
    var st = C.useStore();
    var info = st.deviceInfo || {};

    var ver = "",
      uver = "",
      uni = "";
    try {
      ver = R1WS.getVer ? R1WS.getVer() : "";
    } catch (e) {}
    try {
      uver = R1WS.getUVer ? R1WS.getUVer() : "";
    } catch (e) {}
    try {
      uni = R1WS.isUnisound ? (R1WS.isUnisound() ? "是" : "否") : "--";
    } catch (e) {}

    return h(
      "div",
      null,
      h(
        "div",
        { className: "rows" },
        h(Row, { icon: "box", accent: true, title: "应用名称", sub: "R1音箱控制器" }),
        h(Row, { icon: "star", title: "版本", sub: "v2.0.0（新版 UI）" }),
        h(Row, { icon: "cpu", title: "框架", sub: "React UMD + 自绘组件库" }),
        h(Row, { icon: "user", title: "开发者", sub: "小飞 X 诉说与海 联合开发" }),
      ),
      h("div", { className: "divider" }),
      h(
        "div",
        { className: "rows" },
        h(Row, { icon: "hdd", title: "设备固件", sub: text(info.firmware_ver) }),
        h(Row, {
          icon: "cpu",
          title: "协议版本",
          sub: "ver " + text(ver) + " · u_ver " + text(uver),
        }),
        h(Row, { icon: "box", title: "新版小讯", sub: uni }),
        h(Row, { icon: "link", title: "连接地址", sub: st.lastIp || "--" }),
      ),
    );
  }

  /* =====================================================================
   * 弹层：音乐源
   * =================================================================== */
  function SourceSheet() {
    var st = C.useStore();
    var _src = useState(2),
      src = _src[0],
      setSrc = _src[1];

    function toNum(v) {
      if (typeof v === "string") return { qq: 1, netease: 2, kuwo: 3 }[v] || 0;
      return Number(v) || 0;
    }

    useEffect(function () {
      try {
        var mi = R1WS.getMusicInfo && R1WS.getMusicInfo();
        var n = mi ? toNum(mi.music_source) : 0;
        if (n >= 1 && n <= 3) setSrc(n);
      } catch (e) {}
    }, []);

    C.useR1Event("music_info", function (info) {
      if (!info || info.music_source === undefined || info.music_source === null) return;
      var n = toNum(info.music_source);
      if (n >= 1 && n <= 3) setSrc(n);
    });

    function pick(item) {
      setSrc(item.v);
      if (!st.connected) {
        toast("请先连接设备", "err");
        return;
      }
      /* 设备接口只认字符串 'qq'/'netease'/'kuwo'，传数字会被拒绝 */
      safe(function () {
        R1WS.setMusicSource(item.key);
      }, "切换音乐源失败");
      toast("已切换到 " + item.label, "ok");
    }

    return h(
      "div",
      null,
      h(
        "div",
        { className: "rows" },
        C.SOURCES.map(function (s) {
          return h(Row, {
            key: s.v,
            icon: s.icon,
            accent: src === s.v,
            title: s.label,
            sub: src === s.v ? "当前音源 · 影响点播、歌单与登录" : "点播与歌单将使用该音源",
            onClick: function () {
              pick(s);
            },
            end: src === s.v ? h(Icon, { name: "check" }) : h(Icon, { name: "chevronR" }),
          });
        }),
      ),
      h("div", { className: "divider" }),
      h(
        "div",
        { className: "hint" },
        "切换音源后，扫码登录与歌单加载都会使用对应的平台；当前显示值随设备回包自动同步。",
      ),
    );
  }

  /* =====================================================================
   * 弹层：ADB 控制台
   * =================================================================== */
  var QUICK_CMDS = [
    { label: "包列表", cmd: "pm list packages" },
    { label: "内存", cmd: "cat /proc/meminfo | head -5" },
    { label: "分辨率", cmd: "wm size" },
    { label: "IP", cmd: "getprop net.hostname && netcfg" },
    { label: "系统版本", cmd: "getprop ro.build.version.release && getprop ro.product.model" },
    { label: "重启 adbd", cmd: "setprop service.adb.tcp.port 5555 && stop adbd && start adbd" },
  ];

  function AdbSheet() {
    var st = C.useStore();
    var later = useTimers();

    var _cmd = useState(""),
      cmd = _cmd[0],
      setCmd = _cmd[1];
    var _logs = useState([]),
      logs = _logs[0],
      setLogs = _logs[1];
    var _running = useState(false),
      running = _running[0],
      setRunning = _running[1];
    var logRef = useRef(null);
    var runRef = useRef(false);

    function push(kind, textStr) {
      setLogs(function (prev) {
        var next = prev.concat([{ kind: kind, text: textStr }]);
        /* 只留最近 400 条，避免长时间会话把内存撑爆 */
        return next.length > 400 ? next.slice(next.length - 400) : next;
      });
    }

    C.useR1Event("shell_output", function (data) {
      if (!data) return;
      var tid = data.type_id || "";
      /* 只回显本控制台发出的命令（type_id 形如 adb_1699999999999） */
      if (tid && tid.indexOf("adb_") !== 0) return;
      var out = "";
      if (data.data && typeof data.data === "string") {
        var lines = data.data.split(/\r?\n/);
        /* 设备通常把命令本身回显在第一行，丢弃它 */
        out = lines.length > 1 ? lines.slice(1).join("\n") : data.data;
      } else if (data.data) {
        out = String(data.data);
      }
      var okCode = data.code === undefined || data.code === 200 || data.code === "200";
      if (!out && data.code !== undefined)
        out = okCode ? "(执行成功，无输出)" : "(执行失败，code=" + data.code + ")";
      push(okCode ? "out" : "err", out);
      runRef.current = false;
      setRunning(false);
    });

    /* 输出自动滚到底部 */
    useEffect(
      function () {
        var el = logRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      },
      [logs],
    );

    function run(textStr) {
      var c = (textStr || "").trim();
      if (!c) return;
      if (!st.connected) {
        push("err", "设备未连接，无法执行命令");
        return;
      }
      push("cmd", c);
      setCmd("");
      setRunning(true);
      runRef.current = true;
      var sent = true;
      try {
        R1WS.executeShell(c, "adb_" + Date.now());
      } catch (e) {
        sent = false;
        push("err", "发送失败：" + (e && e.message));
      }
      if (!sent) {
        runRef.current = false;
        setRunning(false);
        return;
      }
      /* 设备无回包时 5 秒兜底解锁，避免输入框一直禁用 */
      later(function () {
        if (runRef.current) {
          runRef.current = false;
          setRunning(false);
        }
      }, 5000);
    }
    function clearLogs() {
      setLogs([]);
    }

    return h(
      "div",
      null,
      h(
        "div",
        { className: "hint", style: { marginBottom: 10 } },
        "在设备上执行 Shell 命令。危险命令（如 reboot、rm）请谨慎输入。",
      ),

      h(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 } },
        QUICK_CMDS.map(function (q) {
          return h(
            Chip,
            {
              key: q.label,
              onClick: function () {
                run(q.cmd);
              },
            },
            q.label,
          );
        }),
      ),

      h(
        "div",
        { className: "log", ref: logRef },
        logs.length
          ? logs.map(function (l, i) {
              var cls = l.kind === "cmd" ? "k" : l.kind === "err" ? "e" : "";
              return h(
                "div",
                { key: i, className: cls },
                l.kind === "cmd" ? "$ " + l.text : l.text,
              );
            })
          : h("span", { className: "hint" }, "暂无输出，输入命令或点击上方快捷指令开始。"),
      ),

      h(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 10, alignItems: "center" } },
        h(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          h(Input, {
            value: cmd,
            onChange: setCmd,
            placeholder: running ? "执行中…" : "输入命令，回车执行",
            disabled: running,
            onKeyDown: function (e) {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                run(cmd);
              }
            },
          }),
        ),
        h(
          Button,
          {
            variant: "primary",
            icon: "send",
            loading: running,
            onClick: function () {
              run(cmd);
            },
          },
          "执行",
        ),
        h(IconBtn, { icon: "trash", title: "清空输出", onClick: clearLogs }),
      ),
    );
  }

  /* ================= 导出 ================= */
  P.SoundPanel = SoundPanel;
  P.BluetoothPanel = BluetoothPanel;
  P.DevicePanel = DevicePanel;

  P.LoginSheet = LoginSheet;
  P.LocalMusicSheet = LocalMusicSheet;
  P.MemoSheet = MemoSheet;
  P.VoiceSheet = VoiceSheet;
  P.RestartSheet = RestartSheet;
  P.AdvancedSheet = AdvancedSheet;
  P.SettingsSheet = SettingsSheet;
  P.AboutSheet = AboutSheet;
  P.SourceSheet = SourceSheet;
  P.AdbSheet = AdbSheet;
})(window);
