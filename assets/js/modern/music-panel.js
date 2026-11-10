/**
 * R1 页面：音乐（原版网易云风格播放器 UI）/ 屏幕
 *
 * 音乐页刻意沿用旧版播放器的 DOM 结构与类名（netease-* / player-* / song-*），
 * 视觉由 app.css 中原版样式决定，本文件只负责状态与交互；
 * 数据来自 R1WS 事件，高频状态留在组件内部，避免整页重绘。
 */
(function (global) {
  "use strict";

  var h = R1UI.h,
    Icon = R1UI.Icon,
    Button = R1UI.Button,
    IconBtn = R1UI.IconBtn;
  var Chip = R1UI.Chip,
    Seg = R1UI.Seg,
    Card = R1UI.Card,
    Row = R1UI.Row;
  var Empty = R1UI.Empty,
    Slider = R1UI.Slider,
    Input = R1UI.Input;
  var Pill = R1UI.Pill,
    Spinner = R1UI.Spinner,
    PageHead = R1UI.PageHead;
  var SearchBar = R1UI.SearchBar,
    Modal = R1UI.Modal;
  var useState = React.useState,
    useEffect = React.useEffect,
    useRef = React.useRef;
  var r1Core = R1Core;
  var toast = r1Core.toast;

  var r1Panels = (global.R1Panels = global.R1Panels || {});

  var vOLMAX = 30;
  var vOLWARNTHRESHOLD = 18;
  var mUSICAPI = R1Config.musicApiUrl;

  /* 发音人：设备用字符串码，展示用中文名（沿用原版映射） */
  var tTSSPEAKERS = [
    ["SWEET", "萱萱"],
    ["FEMALE", "小雯"],
    ["CHILDREN", "糖糖"],
    ["LZL", "玲玲"],
    ["MALE", "小峰"],
    ["TIANTIAN", "天天"],
  ];
  var tTSLABEL = {};
  tTSSPEAKERS.forEach(function (item) {
    tTSLABEL[item[0]] = item[1];
  });

  var defaultCover =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">' +
        '<rect fill="#1a1a2e" width="160" height="160" rx="80"/>' +
        '<circle cx="80" cy="80" r="50" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>' +
        '<circle cx="80" cy="80" r="30" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>' +
        '<path d="M70 55 L70 95 Q70 105 80 105 Q90 105 90 95 L90 65 Q90 55 80 55 Z" fill="rgba(255,255,255,0.15)"/>' +
        '<circle cx="80" cy="100" r="8" fill="rgba(255,255,255,0.2)"/>' +
        "</svg>",
    );

  /* 歌词文本统一转字符串，规避 React 渲染对象报错（原版踩过坑） */
  function lrcText(line) {
    if (line == null) return "";
    if (typeof line === "object")
      return line.text != null ? String(line.text) : JSON.stringify(line);
    return String(line);
  }

  /* ================= 队列封面按需加载 =================
   * 设备的播放队列只有歌名/歌手，没有封面 URL。这里做一层按需封面服务：
   * - 模块级缓存（会话内复用）+ 失败名单（避免对无结果的歌反复请求）
   * - 并发上限 5，避免弹层打开瞬间打爆代理
   * - QQ 搜索结果自带 pic；网易云需再查一次详情拿封面
   * - 首屏前 100 首由 MusicPanel 预取；滚动时 QueuePic 用 IntersectionObserver 按需加载 */
  var qCoverCache = {};
  var qCoverFail = {};
  var qCoverWaiters = {};
  var qCoverBatch = [];
  var qCoverTimer = null;

  /* 批量取封面：攒一批（最多 25 首 / 120ms）POST /api/covers，
   * server 端 8 线程并发查上游 + 内存/磁盘双缓存 —— 请求数从每首 1-2 个降到每 25 首 1 个 */
  function qCoverFlush() {
    /*qCoverTimer = null;
        if (!qCoverBatch.length) return;
        var items = qCoverBatch.splice(0, 25);
        fetch('/api/covers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: items })
        }).then(function (r) { return r.json(); }).then(function (d) {
            var covers = (d && d.covers) || {};
            items.forEach(function (t) {
                var url = covers[t.key] || '';
                if (url) qCoverCache[t.key] = url; else qCoverFail[t.key] = 1;
                var ws = qCoverWaiters[t.key] || [];
                delete qCoverWaiters[t.key];
                ws.forEach(function (cb) { try { cb(url); } catch (e) {} });
            });
            setTimeout(qCoverFlush, 250);
        }).catch(function () {
            items.forEach(function (t) {
                qCoverFail[t.key] = 1;
                var ws = qCoverWaiters[t.key] || [];
                delete qCoverWaiters[t.key];
                ws.forEach(function (cb) { try { cb(''); } catch (e) {} });
            });
            qCoverFlush();
        });*/
  }

  function qCoverFetch(key, name, artist, source, callback) {
    if (qCoverCache[key]) {
      if (callback) callback(qCoverCache[key]);
      return;
    }
    if (qCoverFail[key]) return;
    if (qCoverWaiters[key]) {
      if (callback) qCoverWaiters[key].push(callback);
      return;
    }
    qCoverWaiters[key] = callback ? [callback] : [];
    qCoverBatch.push({ key: key, name: name, artist: artist, src: source });
    if (qCoverBatch.length >= 25) qCoverFlush();
    else if (!qCoverTimer) qCoverTimer = setTimeout(qCoverFlush, 120);
  }

  /* 队列行封面：有封面直接显示；没有则等滚动到可见（IO）再按需拉取 */
  function QueuePic(props) {
    var ref = useRef(null);
    var picState = useState(""),
      pic = picState[0],
      setPic = picState[1];
    useEffect(function () {
      if (props.direct || qCoverCache[props.k]) return;
      var element = ref.current;
      if (!element) return;
      var fire = function () {
        qCoverFetch(props.k, props.name, props.artist, props.src, function (url) {
          if (url) setPic(url);
        });
      };
      var io = null;
      try {
        io = new IntersectionObserver(
          function (entries) {
            for (var index = 0; index < entries.length; index++) {
              if (entries[index].isIntersecting) {
                io.disconnect();
                fire();
                return;
              }
            }
          },
          { root: (props.rootRef && props.rootRef.current) || null, rootMargin: "300px" },
        );
        io.observe(element);
      } catch (error) {
        fire();
      }
      return function () {
        try {
          io && io.disconnect();
        } catch (error) {}
      };
    }, []);
    var url = props.direct || qCoverCache[props.k] || pic;
    return h(
      "div",
      {
        className: "pl-pic" + (url ? " has-img" : ""),
        ref: url ? undefined : ref,
      },
      url
        ? h("img", {
            src: url,
            alt: "",
            onError: function (event) {
              if (event.target.parentNode) event.target.parentNode.classList.add("no-pic");
              event.target.style.display = "none";
            },
          })
        : h(Icon, { name: "music" }),
    );
  }

  /* =====================================================================
   * 音乐页
   * =================================================================== */
  function MusicPanel() {
    var store = r1Core.useStore();

    /* --- 播放状态 --- */
    var playingState = useState(false),
      playing = playingState[0],
      setPlaying = playingState[1];
    var songState = useState({ title: "未在播放", artist: "", cover: "" }),
      song = songState[0],
      setSong = songState[1];
    var progressState = useState(0),
      progress = progressState[0],
      setProgress = progressState[1];
    var durationState = useState(0),
      duration = durationState[0],
      setDuration = durationState[1];
    var volumeState = useState(15),
      volume = volumeState[0],
      setVolume = volumeState[1];
    var modeState = useState("list"),
      mode = modeState[0],
      setMode = modeState[1];
    var sourceState = useState(2),
      source = sourceState[0],
      setSource = sourceState[1];
    var lyricsState = useState([]),
      lyrics = lyricsState[0],
      setLyrics = lyricsState[1];
    var lrcIdxState = useState(0),
      lrcIdx = lrcIdxState[0],
      setLrcIdx = lrcIdxState[1];
    var queueState = useState([]),
      queue = queueState[0],
      setQueue = queueState[1];
    var ttsState = useState(""),
      tts = ttsState[0],
      setTts = ttsState[1];
    var collectedState = useState(function () {
        try {
          return JSON.parse(localStorage.getItem("r1_collected") || "{}");
        } catch (error) {
          return {};
        }
      }),
      collected = collectedState[0],
      setCollected = collectedState[1];

    /* --- 播放器 UI --- */
    var scaleState = useState(1),
      scale = scaleState[0],
      setScale = scaleState[1];
    var showLyricsState = useState(false),
      showLyrics = showLyricsState[0],
      setShowLyrics = showLyricsState[1];
    var showVolState = useState(false),
      showVol = showVolState[0],
      setShowVol = showVolState[1];
    var showQueueState = useState(false),
      showQueue = showQueueState[0],
      setShowQueue = showQueueState[1];
    var queueFilterState = useState(""),
      queueFilter = queueFilterState[0],
      setQueueFilter = queueFilterState[1];
    var showMoreState = useState(false),
      showMore = showMoreState[0],
      setShowMore = showMoreState[1];
    var askTextState = useState(""),
      askText = askTextState[0],
      setAskText = askTextState[1];
    var showAskState = useState(false),
      showAsk = showAskState[0],
      setShowAsk = showAskState[1];
    var showTtsState = useState(false),
      showTts = showTtsState[0],
      setShowTts = showTtsState[1];
    var showSrcState = useState(false),
      showSrc = showSrcState[0],
      setShowSrc = showSrcState[1];
    var showLightState = useState(false),
      showLight = showLightState[0],
      setShowLight = showLightState[1];
    var showHotState = useState(false),
      showHot = showHotState[0],
      setShowHot = showHotState[1];
    /* 歌词自动重试：正在播放却没歌词时每 4 秒重取一次，最多 5 次 */
    var retryCountState = useState(0),
      retryCount = retryCountState[0],
      setRetryCount = retryCountState[1];
    var showSongsState = useState(false),
      showSongs = showSongsState[0],
      setShowSongs = showSongsState[1];
    var songGroupsState = useState(null),
      songGroups = songGroupsState[0],
      setSongGroups = songGroupsState[1];
    var groupsBusyState = useState(false),
      groupsBusy = groupsBusyState[0],
      setGroupsBusy = groupsBusyState[1];
    /* 我的歌单音源：弹层内可切 QQ / 网易云 / 酷我，切换即向设备重新拉取该源歌单 */
    var songSrcState = useState("netease"),
      songSrc = songSrcState[0],
      setSongSrc = songSrcState[1];
    var webState = useState({
      open: false,
      kw: "",
      src: "netease",
      list: [],
      busy: false,
      searched: false,
    });
    var web = webState[0],
      setWeb = webState[1];

    /* --- 拖动锁 --- */
    var seekingRef = useRef(false);
    var volDragRef = useRef(false);
    var volWarnRef = useRef(false);
    var sourceSwitchRef = useRef(false);
    var progressRef = useRef(0);
    var lyricsRef = useRef([]);
    var queueRef = useRef(null);
    useEffect(
      function () {
        progressRef.current = progress;
      },
      [progress],
    );
    useEffect(
      function () {
        lyricsRef.current = lyrics;
      },
      [lyrics],
    );

    /* ---------- 设备事件 ---------- */
    /* 切歌检测：歌名变化即清空旧歌词（新歌词由 lrc 事件随后填入），
     * 避免新歌没歌词时界面残留上一首的歌词；同时重置自动重试计数 */
    var lastTitleRef = useRef("");
    r1Core.useR1Event("music_info", function (info) {
      if (!info) return;
      if (info.title && info.title !== lastTitleRef.current) {
        lastTitleRef.current = info.title;
        setLyrics([]);
        lyricsRef.current = [];
        setLrcIdx(0);
        setRetryCount(0);
      }
      if (info.title || info.artist || info.cover || info.albumUrl) {
        setSong(function (track) {
          return Object.assign({}, track, {
            title: info.title != null ? info.title : track.title,
            artist: info.artist != null ? info.artist : track.artist,
            album: info.album != null ? info.album : track.album,
            cover: info.cover || info.albumUrl || track.cover,
          });
        });
      }
      if (info.playing !== undefined) setPlaying(!!info.playing);
      if (info.play_state !== undefined) setPlaying(!!info.play_state);
      if (info.play_mode !== undefined) {
        var mm = { 1: "random", 2: "list", 3: "single" };
        if (mm[info.play_mode]) setMode(mm[info.play_mode]);
      }
      if (info.ttsModelType !== undefined) setTts(info.ttsModelType);
      if (info.music_source !== undefined && info.music_source !== null) {
        var raw = info.music_source;
        var count = typeof raw === "string" ? { qq: 1, netease: 2, kuwo: 3 }[raw] : raw;
        if (
          (count === 1 || count === 2 || count === 3) &&
          !sourceSwitchRef.current &&
          count !== source
        ) {
          setSource(count);
          try {
            localStorage.setItem("r1_music_source", String(count));
          } catch (error) {}
        }
      }
      if (info.volume !== undefined && !volDragRef.current) {
        setVolume(Math.max(0, Math.min(vOLMAX, Number(info.volume))));
      }
      if (info.position !== undefined) {
        if (!seekingRef.current) setProgress(info.position / 1000);
      } else if (info.progress !== undefined) {
        if (!seekingRef.current)
          setProgress(info.progress > 10000 ? info.progress / 1000 : info.progress);
      }
      if (info.duration !== undefined) {
        setDuration(info.duration > 10000 ? Math.floor(info.duration / 1000) : info.duration);
      }
    });

    r1Core.useR1Event("lrc", function (data) {
      if (!data) return;
      if (data.lyrics) {
        setProgress(0);
        progressRef.current = 0;
        setLrcIdx(0);
        setLyrics(data.lyrics);
      }
      if (data.currentIndex !== undefined) setLrcIdx(data.currentIndex);
    });

    r1Core.useR1Event("music_list", function (list) {
      if (Array.isArray(list)) setQueue(list);
    });

    r1Core.useR1Event("song_list", function (data) {
      setGroupsBusy(false);
      if (!data) {
        toast("歌单响应为空", "err");
        return;
      }
      if (data.code !== 200 && data.code !== "200") {
        toast("获取歌单失败：" + (data.msg || data.login_msg || "code=" + data.code), "err");
        setSongGroups(data);
        return;
      }
      setSongGroups(data);
      toast("歌单加载完成", "ok");
    });

    r1Core.useR1Event("collect_result", function (info) {
      if (info && info.msg) toast(info.msg, "info");
    });

    /* ---------- 进度推进 + 歌词同步（100ms，沿用原版节奏） ---------- */
    useEffect(
      function () {
        function tick() {
          if (seekingRef.current) return;
          var next = progressRef.current;
          if (playing && duration > 0) next = Math.min(duration, next + 0.1);
          progressRef.current = next;
          setProgress(next);

          var ls = lyricsRef.current;
          if (ls && ls.length) {
            var ms = next * 1000 + 280; /* 原版：人声到达前 280ms 高亮 */
            var lo = 0,
              hi = ls.length - 1,
              ans = 0;
            while (lo <= hi) {
              var mid = (lo + hi) >> 1;
              if (ls[mid].time <= ms) {
                ans = mid;
                lo = mid + 1;
              } else {
                hi = mid - 1;
              }
            }
            setLrcIdx(function (current) {
              return current === ans ? current : ans;
            });
          }
        }
        var intervalId = setInterval(tick, 100);
        return function () {
          clearInterval(intervalId);
        };
      },
      [playing, duration, lyrics],
    );

    /* ---------- 记住上次音乐源 ---------- */
    useEffect(function () {
      var saved = 2;
      try {
        saved = parseInt(localStorage.getItem("r1_music_source") || "2", 10) || 2;
      } catch (error) {}
      setSource(saved);
    }, []);

    /* ---------- 视口缩放（原版 --player-scale 逻辑，小屏防裁切、平板防空旷） ---------- */
    useEffect(function () {
      function calc() {
        var innerWidth = window.innerWidth,
          hh = window.innerHeight,
          numericValue;
        if (innerWidth <= 360) numericValue = 0.85;
        else if (innerWidth <= 414) numericValue = 1;
        else if (innerWidth <= 768) numericValue = 1 + ((innerWidth - 414) / (768 - 414)) * 0.25;
        else if (innerWidth <= 1024) {
          var vmin = Math.min(innerWidth, hh) / 100;
          numericValue = Math.min(2.0, Math.max(1.5, vmin * 0.08));
        } else numericValue = 1;
        if (hh < 600) numericValue = Math.min(numericValue, 0.9);
        if (hh < 500) numericValue = Math.min(numericValue, 0.78);
        setScale(parseFloat(numericValue.toFixed(3)));
      }
      calc();
      window.addEventListener("resize", calc);
      return function () {
        window.removeEventListener("resize", calc);
      };
    }, []);

    /* ---------- 交互 ---------- */
    function guard() {
      if (!store.connected) {
        toast("请先连接设备", "err");
        return false;
      }
      return true;
    }
    function handlePlay() {
      if (!guard()) return;
      var next = !playing;
      setPlaying(next); /* 乐观更新，按下即响应 */
      try {
        next ? R1WS.musicResume() : R1WS.musicPause();
      } catch (error) {}
    }
    function step(action) {
      if (!guard()) return;
      try {
        R1WS.musicControl(action);
      } catch (error) {}
    }
    function changeMode() {
      if (!guard()) return;
      var next = r1Core.nextMode(mode);
      setMode(next);
      try {
        R1WS.wsSend({ type: "set_play_mode", mode: r1Core.MODE_CODE[next] });
      } catch (error) {}
      toast(r1Core.MODE_LABEL[next], "info", 1400);
    }
    function applyVolume(value) {
      value = Math.max(0, Math.min(vOLMAX, value));
      setVolume(value);
      volDragRef.current = false;
      if (value > vOLWARNTHRESHOLD && !volWarnRef.current) {
        r1Core
          .confirm({
            title: "音量提醒",
            desc: "音量超过 " + vOLWARNTHRESHOLD + " 可能打扰他人，甚至损伤扬声器。确定继续吗？",
            okText: "继续调大",
            cancelText: "取消",
          })
          .then(function (ok) {
            if (ok) {
              volWarnRef.current = true;
              try {
                R1WS.setVolume(value);
              } catch (error) {}
            } else setVolume(vOLWARNTHRESHOLD);
          });
        return;
      }
      try {
        R1WS.setVolume(value);
      } catch (error) {}
    }
    function bumpVolume(delta) {
      applyVolume(volume + delta);
    }
    function seekTo(value) {
      try {
        R1WS.seekTo(value);
      } catch (error) {}
      setTimeout(function () {
        seekingRef.current = false;
      }, 500);
    }
    function playQueueItem(item, index) {
      if (!guard()) return;
      var name = item.title || item.name || "";
      /* 点击的正是当前歌曲且在播放 → 不重复触发 */
      if (name && name === song.title && playing) return;
      try {
        if (index !== undefined && index !== null) R1WS.playByIndex(index);
        else R1WS.musicPlay(name);
      } catch (error) {}
      toast("正在播放：" + name, "ok", 1600);
    }
    function toggleCollect(item) {
      if (!guard()) return;
      var key = (item.title || item.name || "") + "@@" + (item.artist || item.singer || "");
      var next = Object.assign({}, collected);
      var has = !!next[key];
      try {
        has ? R1WS.cancelCollectSong(item) : R1WS.collectSong(item);
      } catch (error) {}
      if (has) delete next[key];
      else next[key] = true;
      setCollected(next);
      try {
        localStorage.setItem("r1_collected", JSON.stringify(next));
      } catch (error) {}
    }
    function openQueue() {
      setShowQueue(true);
      try {
        R1WS.requestMusicList();
      } catch (error) {}
    }
    function askPlay() {
      var keyword2 = (askText || "").trim();
      if (!keyword2) {
        toast("请输入歌曲名或歌手", "err");
        return;
      }
      if (!guard()) return;
      var key = { 1: "qq", 2: "netease", 3: "kuwo" }[source];
      try {
        if (key) R1WS.setMusicSource(key);
      } catch (error) {}
      try {
        R1WS.musicPlay(keyword2);
      } catch (error) {}
      toast("正在点播：" + keyword2, "ok");
      setAskText("");
      setShowAsk(false);
    }
    function playCollection() {
      if (!guard()) return;
      try {
        if (source) R1WS.setMusicSource({ 1: "qq", 2: "netease", 3: "kuwo" }[source]);
        R1WS.playCollection();
      } catch (error) {}
      toast("正在播放小讯收藏", "ok");
      setShowMore(false);
    }
    function loadGroups(force, source2) {
      if (!guard()) return;
      setGroupsBusy(true);
      setSongGroups(null);
      try {
        R1WS.requestSongList(source2 != null ? source2 : source, force);
      } catch (error) {
        setGroupsBusy(false);
      }
      setTimeout(function () {
        setGroupsBusy(false);
      }, 8000);
    }
    function doWebSearch() {
      var keyword2 = (web.kw || "").trim();
      if (!keyword2) {
        toast("请输入关键词", "err");
        return;
      }
      setWeb(Object.assign({}, web, { busy: true, searched: true, list: [] }));
      /* 静态部署使用可配置的 CORS 音乐接口，不依赖同源搜索后端。 */
      fetch(mUSICAPI + "?source=" + web.src + "&page=1&keyword=" + encodeURIComponent(keyword2))
        .then(function (result) {
          return result.json();
        })
        .then(function (message) {
          if (message.code === 1 && message.data && message.data.list && message.data.list.length) {
            var list = message.data.list;
            if (web.src === "qq") {
              setWeb(Object.assign({}, web, { busy: false, list: list }));
              return;
            }
            Promise.all(
              list.map(function (item) {
                return fetch(mUSICAPI + "?info=" + encodeURIComponent(item.id))
                  .then(function (result) {
                    return result.json();
                  })
                  .then(function (message2) {
                    if (message2.code === 1 && message2.data && message2.data.pic)
                      item.pic = message2.data.pic;
                    return item;
                  })
                  .catch(function () {
                    return item;
                  });
              }),
            ).then(function (full) {
              setWeb(Object.assign({}, web, { busy: false, list: full }));
            });
            return;
          }
          setWeb(Object.assign({}, web, { busy: false, list: [] }));
          toast("未找到相关歌曲", "info");
        })
        .catch(function () {
          setWeb(Object.assign({}, web, { busy: false, list: [] }));
          toast("搜索失败，请检查网络", "err");
        });
    }
    function playWebResult(value) {
      if (!guard()) return;
      var STR2NUM = { qq: 1, netease: 2, kuwo: 3 };
      var count = STR2NUM[web.src];
      if (count && count !== source) {
        setSource(count);
        sourceSwitchRef.current = true;
        setTimeout(function () {
          sourceSwitchRef.current = false;
        }, 3000);
        try {
          R1WS.setMusicSource({ 1: "qq", 2: "netease", 3: "kuwo" }[count]);
        } catch (error) {}
      }
      try {
        R1WS.musicPlay((value.name || "") + " " + (value.artist || ""));
      } catch (error) {}
      toast("正在播放：" + value.name, "ok");
      setWeb(Object.assign({}, web, { open: false }));
    }
    function addNext(value) {
      if (!guard()) return;
      try {
        R1WS.sendMessage({
          what: 65536,
          arg1: 0,
          arg2: 1,
          obj: "web_添加" + (value.name || "") + " " + (value.artist || ""),
        });
      } catch (error) {}
      toast("已加入播放队列", "ok");
    }
    function locatePlaying() {
      var element = document.querySelector(".playlist-item.playing");
      if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      else toast("当前无正在播放的歌曲", "info");
    }

    /* ---------- 队列过滤（保留原始索引用于 playByIndex） ---------- */
    var keyword = queueFilter.trim().toLowerCase();
    var filteredQueue = queue
      .map(function (item, index) {
        return { song: item, idx: index };
      })
      .filter(function (it) {
        if (!keyword) return true;
        var name = (it.song.title || it.song.name || "").toLowerCase();
        var artist = (it.song.artist || it.song.singer || "").toLowerCase();
        return (
          name.indexOf(keyword) >= 0 ||
          artist.indexOf(keyword) >= 0 ||
          String(it.idx + 1).indexOf(keyword) >= 0
        );
      });

    /* ---------- 歌词滚动定位（桌面与移动两个容器都尝试） ---------- */
    var desktopLrcRef = useRef(null);
    var mobileLrcRef = useRef(null);
    useEffect(
      function () {
        [desktopLrcRef.current, mobileLrcRef.current].forEach(function (box) {
          if (!box) return;
          var element = box.querySelector(".active");
          if (!element) return;
          var top = element.offsetTop - box.clientHeight / 2 + element.clientHeight / 2;
          try {
            box.scrollTo({ top: top, behavior: "smooth" });
          } catch (error) {
            box.scrollTop = top;
          }
        });
      },
      [lrcIdx, lyrics],
    );

    /* 歌词自动重试：正在播放且无歌词时，定期让设备重新推送（多数情况 1-2 次就到） */
    useEffect(
      function () {
        if (lyrics.length || !playing || !song.title) return;
        if (retryCount >= 5) return;
        var timeoutId = setTimeout(function () {
          try {
            R1WS.requestMusicInfo();
          } catch (error) {}
          setRetryCount(retryCount + 1);
        }, 4000);
        return function () {
          clearTimeout(timeoutId);
        };
      },
      [lyrics.length, playing, song.title, retryCount],
    );

    /* 队列封面全量后台预取：队列一到就把所有歌的封面慢速预热到服务器持久缓存，
     * 每批 25 首、间隔 400ms，不打扰当前操作；之后打开队列弹层全部命中缓存（65ms 级秒出），
     * 滚动到任何区块都不用再等首查 */
    useEffect(
      function () {
        if (!queue.length) return;
        var source2 = { 1: "qq", 2: "netease", 3: "kuwo" }[source] || "netease";
        var seen = {};
        var todo = [];
        queue.forEach(function (track) {
          var name = track.title || track.name || "";
          if (!name) return;
          var artist = track.artist || track.singer || "";
          var value = name + "@@" + artist;
          if (seen[value] || qCoverCache[value] || qCoverFail[value] || qCoverWaiters[value])
            return;
          seen[value] = 1;
          todo.push({ key: value, name: name, artist: artist, src: source2 });
        });
        if (!todo.length) return;
        var numericValue = 0;
        var timer = setInterval(function () {
          if (numericValue >= todo.length) {
            clearInterval(timer);
            return;
          }
          var batch = todo.slice(numericValue, numericValue + 25);
          numericValue += 25;
          batch.forEach(function (image) {
            qCoverFetch(image.key, image.name, image.artist, image.src, null);
          });
        }, 400);
        return function () {
          clearInterval(timer);
        };
      },
      [queue.length],
    );

    function renderLrc(variant) {
      var className = variant === "mobile" ? "netease-lrc-line-mobile" : "netease-lrc-line";
      return lyrics.map(function (line, index) {
        return h(
          "div",
          { key: index, className: className + (index === lrcIdx ? " active" : "") },
          lrcText(line),
        );
      });
    }

    var mOREITEMS = [
      {
        icon: "music",
        label: "点播音乐",
        act: function () {
          setShowMore(false);
          setShowAsk(true);
        },
      },
      {
        icon: "search",
        label: "音乐搜索",
        act: function () {
          setShowMore(false);
          setWeb({ open: true, kw: "", src: "netease", list: [], busy: false, searched: false });
        },
      },
      { icon: "heart", label: "小讯收藏", act: playCollection },
      {
        icon: "list",
        label: "我的歌单",
        act: function () {
          setShowMore(false);
          setShowSongs(true);
          var optionItem = { 1: "qq", 2: "netease", 3: "kuwo" }[source] || "netease";
          setSongSrc(optionItem);
          loadGroups(false, optionItem);
        },
      },
      {
        icon: "sliders",
        label: "调整发音人",
        act: function () {
          setShowMore(false);
          setShowTts(true);
        },
      },
      {
        icon: "refresh",
        label: "调整音乐源",
        act: function () {
          setShowMore(false);
          setShowSrc(true);
        },
      },
      {
        icon: "lightbulb",
        label: "氛围灯",
        act: function () {
          setShowMore(false);
          setShowLight(true);
        },
      },
      {
        icon: "star",
        label: "热榜推荐",
        act: function () {
          setShowMore(false);
          setShowHot(true);
        },
      },
    ];

    var cover = song.cover || defaultCover;

    return h(
      React.Fragment,
      null,

      /* ================= 播放器主体（原版结构） ================= */
      h(
        "div",
        {
          className: "netease-player-wrapper",
          style: { "--player-scale": String(scale) },
        },
        h("div", {
          className: "player-bg",
          style: song.cover ? { backgroundImage: "url(" + song.cover + ")" } : {},
        }),

        /* --- 电脑版：左转盘 + 右歌名/歌词 --- */
        h(
          "div",
          { className: "player-content-desktop" },
          h(
            "div",
            { className: "player-left" },
            h(
              "div",
              { className: "netease-disc-wrap" },
              h(
                "div",
                { className: "song-disc" },
                h("div", { className: "song-needle" + (playing ? " play" : "") }),
                h("div", { className: "song-disc__bg" }),
                h(
                  "div",
                  { className: "song-disc__cover" },
                  h(
                    "div",
                    { className: "song-img" + (playing ? " play" : "") },
                    h("img", { src: cover, alt: "封面", className: "u-img" }),
                  ),
                ),
              ),
            ),
          ),
          h(
            "div",
            { className: "player-right" },
            h(
              "div",
              { className: "desktop-song-info" },
              h("div", { className: "desktop-song-title" }, song.title || "未在播放"),
              h("div", { className: "desktop-song-artist" }, song.artist || "--"),
            ),
            lyrics.length
              ? h("div", { className: "desktop-lyrics", ref: desktopLrcRef }, renderLrc("desktop"))
              : h(
                  "div",
                  { className: "desktop-lyrics pure-music-center" },
                  h("div", { className: "pure-music-title" }, song.title || "未在播放"),
                  h("div", { className: "pure-music-artist" }, song.artist || "--"),
                  h("div", { className: "no-lrc-hint" }, "暂无歌词，可尝试重新获取"),
                  h(
                    "button",
                    {
                      className: "no-lrc-btn",
                      onClick: function () {
                        try {
                          R1WS.requestMusicInfo();
                          toast("已请求重新获取歌词", "info");
                        } catch (error) {}
                        setRetryCount(0);
                      },
                    },
                    h(Icon, { name: "refresh" }),
                    "重新获取歌词",
                  ),
                ),
          ),
        ),

        /* --- 手机版：歌名置顶 + 封面/歌词互切 --- */
        h(
          "div",
          { className: "player-content-mobile" },
          h(
            "div",
            { className: "mobile-song-info" },
            h("div", { className: "mobile-song-title" }, song.title || "未在播放"),
            h("div", { className: "mobile-song-artist" }, song.artist || "--"),
          ),
          h(
            "div",
            { className: "mobile-stage" },
            !showLyrics
              ? h(
                  "div",
                  {
                    className: "mobile-disc-wrap mobile-stage-item",
                    style: { cursor: "pointer" },
                    /* 无论有无歌词都允许点击：无歌词时显示占位 */
                    onClick: function () {
                      setShowLyrics(true);
                    },
                  },
                  h(
                    "div",
                    { className: "song-disc song-disc-mobile" },
                    h("div", {
                      className: "song-needle song-needle-mobile" + (playing ? " play" : ""),
                    }),
                    h("div", { className: "song-disc__bg song-disc__bg-mobile" }),
                    h(
                      "div",
                      { className: "song-disc__cover song-disc__cover-mobile" },
                      h(
                        "div",
                        { className: "song-img" + (playing ? " play" : "") },
                        h("img", { src: cover, alt: "封面", className: "u-img" }),
                      ),
                    ),
                  ),
                )
              : h(
                  "div",
                  {
                    className: "mobile-lyrics mobile-stage-item",
                    ref: mobileLrcRef,
                    onClick: function () {
                      setShowLyrics(false);
                    },
                  },
                  lyrics.length
                    ? renderLrc("mobile")
                    : h(
                        "div",
                        { className: "pure-music-center" },
                        h("div", { className: "pure-music-title" }, song.title || "未在播放"),
                        h("div", { className: "pure-music-artist" }, song.artist || "--"),
                        h(
                          "div",
                          {
                            className: "pure-music-artist",
                            style: { fontSize: "12px", opacity: 0.6, marginTop: "8px" },
                          },
                          "暂无歌词 · 点击返回封面",
                        ),
                      ),
                ),
          ),
        ),

        /* --- 底部控制栏 --- */
        h(
          "div",
          { className: "player-controls" },
          h(
            "div",
            { className: "progress-section" },
            h("span", { className: "time-current" }, r1Core.fmtTime(progress)),
            h(
              "div",
              { className: "progress-bar-wrap" },
              h(Slider, {
                min: 0,
                max: duration || 100,
                step: 0.1,
                value: Math.min(progress, duration || progress),
                showValue: false,
                label: "播放进度",
                className: "progress-slider",
                onChange: function (value) {
                  seekingRef.current = true;
                  setProgress(value);
                  progressRef.current = value;
                },
                onCommit: seekTo,
              }),
            ),
            h("span", { className: "time-total" }, r1Core.fmtTime(duration)),
          ),

          h(
            "div",
            { className: "controls-row" },
            h(
              "div",
              { className: "controls-left" },
              h(
                "button",
                { className: "ctrl-btn", title: r1Core.MODE_LABEL[mode], onClick: changeMode },
                h(Icon, { name: r1Core.MODE_ICON[mode] || "repeat" }),
              ),
              h(
                "div",
                { className: "vol-control" },
                h(
                  "button",
                  {
                    className: "ctrl-btn",
                    title: "音量 " + volume,
                    onClick: function () {
                      setShowVol(!showVol);
                    },
                  },
                  h(Icon, {
                    name: volume === 0 ? "volumeMute" : volume < 12 ? "volumeLow" : "volume",
                  }),
                ),
                showVol
                  ? h(
                      "div",
                      { className: "vol-slider-wrap" },
                      h(
                        "div",
                        { style: { display: "flex", gap: "8px", justifyContent: "center" } },
                        h(
                          Button,
                          {
                            size: "sm",
                            variant: "ghost",
                            onClick: function () {
                              bumpVolume(-1);
                            },
                          },
                          h(Icon, { name: "minus" }),
                        ),
                        h(
                          Button,
                          {
                            size: "sm",
                            variant: "ghost",
                            onClick: function () {
                              bumpVolume(1);
                            },
                          },
                          h(Icon, { name: "plus" }),
                        ),
                      ),
                      h(Slider, {
                        min: 0,
                        max: vOLMAX,
                        step: 1,
                        value: volume,
                        label: "音量",
                        showValue: false,
                        onChange: function (value) {
                          volDragRef.current = true;
                          setVolume(value);
                        },
                        onCommit: function (value) {
                          applyVolume(value);
                        },
                      }),
                      h("span", { className: "vol-value" }, volume + " / " + vOLMAX),
                    )
                  : null,
              ),
            ),
            h(
              "div",
              { className: "controls-center" },
              h(
                "button",
                {
                  className: "ctrl-btn",
                  title: "上一首",
                  onClick: function () {
                    step("prev");
                  },
                },
                h(Icon, { name: "prev" }),
              ),
              h(
                "button",
                { className: "play-btn", title: playing ? "暂停" : "播放", onClick: handlePlay },
                h(Icon, { name: playing ? "pause" : "play" }),
              ),
              h(
                "button",
                {
                  className: "ctrl-btn",
                  title: "下一首",
                  onClick: function () {
                    step("next");
                  },
                },
                h(Icon, { name: "next" }),
              ),
            ),
            h(
              "div",
              { className: "controls-right" },
              h(
                "button",
                { className: "ctrl-btn", title: "播放队列", onClick: openQueue },
                h(Icon, { name: "list" }),
              ),
              h(
                "button",
                {
                  className: "ctrl-btn",
                  title: "更多功能",
                  onClick: function () {
                    setShowMore(true);
                  },
                },
                h(Icon, { name: "more" }),
              ),
            ),
          ),
        ),
      ),

      /* ================= 播放队列 ================= */
      h(
        Modal,
        {
          open: showQueue,
          title: "当前播放队列",
          sub: queue.length + " 首 · 点击切歌",
          size: "wide",
          onClose: function () {
            setShowQueue(false);
            setQueueFilter("");
          },
          footer: h(
            Button,
            { variant: "soft", icon: "search", onClick: locatePlaying },
            "定位当前",
          ),
        },
        h(
          "div",
          { style: { marginBottom: "12px" } },
          h(SearchBar, {
            value: queueFilter,
            onChange: setQueueFilter,
            placeholder: "搜索歌曲 / 歌手 / 序号",
          }),
        ),
        filteredQueue.length
          ? h(
              "div",
              { className: "playlist-scroll", ref: queueRef },
              filteredQueue.map(function (it, index) {
                var song2 = it.song;
                var name = song2.title || song2.name || "";
                var artist = song2.artist || song2.singer || "";
                var isCur = !!song2.playing || (song.title && song.title === name);
                var key = name + "@@" + artist;
                return h(
                  "div",
                  {
                    key: it.idx,
                    className: "playlist-item" + (isCur ? " playing" : ""),
                    onClick: function () {
                      playQueueItem(song2, it.idx);
                    },
                  },
                  h(QueuePic, {
                    k: key,
                    name: name,
                    artist: artist,
                    src: { 1: "qq", 2: "netease", 3: "kuwo" }[source] || "netease",
                    direct: (isCur && song.cover) || cachedPic(name, artist) || "",
                    rootRef: queueRef,
                  }),
                  h("div", { className: "pl-idx" }, it.idx + 1),
                  h(
                    "div",
                    { className: "pl-main" },
                    h("div", { className: "pl-name" }, name || "（未命名）"),
                    artist ? h("div", { className: "pl-artist" }, artist) : null,
                  ),
                  h(
                    "div",
                    { className: "pl-act" },
                    h(
                      "button",
                      {
                        className: "btn sm",
                        title: collected[key] ? "取消收藏" : "收藏",
                        onClick: function (event) {
                          event.stopPropagation();
                          toggleCollect(song2);
                        },
                      },
                      h(Icon, { name: collected[key] ? "heartFill" : "heart" }),
                    ),
                  ),
                );
              }),
            )
          : h(Empty, {
              icon: "list",
              title: keyword ? "没有匹配的歌曲" : "队列为空",
              desc: keyword ? "换个关键词试试" : "点播或从歌单选歌后会出现在这里",
            }),
      ),

      /* ================= 更多功能 ================= */
      h(
        Modal,
        {
          open: showMore,
          title: "更多功能",
          onClose: function () {
            setShowMore(false);
          },
        },
        h(
          "div",
          { className: "netease-more-grid" },
          mOREITEMS.map(function (it, index) {
            return h(
              "div",
              { key: index, className: "netease-more-item", onClick: it.act },
              h("div", { className: "more-icon" }, h(Icon, { name: it.icon })),
              h("div", { className: "more-label" }, it.label),
            );
          }),
        ),
      ),

      /* ================= 点播音乐 ================= */
      h(
        Modal,
        {
          open: showAsk,
          title: "点播音乐",
          sub: "输入歌名或「歌手 + 歌名」，直接让设备播放",
          onClose: function () {
            setShowAsk(false);
          },
          footer: [
            h(
              Button,
              {
                key: "c",
                variant: "ghost",
                onClick: function () {
                  setShowAsk(false);
                },
              },
              "取消",
            ),
            h(Button, { key: "o", variant: "primary", onClick: askPlay }, "点播"),
          ],
        },
        h(Input, {
          value: askText,
          onChange: setAskText,
          autoFocus: true,
          placeholder: "例如：安和桥 宋冬野",
          onKeyDown: function (value) {
            if (value.key === "Enter") askPlay();
          },
        }),
        h(
          "div",
          { className: "hint", style: { marginTop: "10px" } },
          "当前音乐源：" + (r1Core.SOURCE_LABEL[source] || "未设置"),
        ),
      ),

      /* ================= 音乐搜索（聚合） ================= */
      h(
        Modal,
        {
          open: web.open,
          title: "音乐搜索",
          sub: "跨音源搜索，结果可直接点播到设备",
          size: "wide",
          onClose: function () {
            setWeb(Object.assign({}, web, { open: false }));
          },
        },
        h(
          "div",
          { style: { display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" } },
          [
            { k: "netease", l: "网易云" },
            { k: "qq", l: "QQ 音乐" },
            { k: "kuwo", l: "酷我" },
          ].map(function (item) {
            return h(
              Chip,
              {
                key: item.k,
                on: web.src === item.k,
                onClick: function () {
                  setWeb(Object.assign({}, web, { src: item.k }));
                },
              },
              item.l,
            );
          }),
        ),
        h(
          "div",
          { style: { display: "flex", gap: "8px" } },
          h(Input, {
            value: web.kw,
            placeholder: "歌名 / 歌手",
            onChange: function (value) {
              setWeb(Object.assign({}, web, { kw: value }));
            },
            onKeyDown: function (value) {
              if (value.key === "Enter") doWebSearch();
            },
          }),
          h(Button, { variant: "primary", loading: web.busy, onClick: doWebSearch }, "搜索"),
        ),
        h(
          "div",
          { style: { marginTop: "14px" } },
          web.busy
            ? h(
                "div",
                { style: { display: "grid", placeItems: "center", padding: "26px 0" } },
                h(Spinner),
              )
            : web.list.length
              ? h(
                  "div",
                  { className: "playlist-scroll" },
                  web.list.map(function (track, index) {
                    return h(
                      "div",
                      {
                        key: track.id || index,
                        className: "playlist-item",
                        onClick: function () {
                          playWebResult(track);
                        },
                      },
                      h("div", { className: "pl-idx" }, index + 1),
                      h(
                        "div",
                        { className: "pl-main" },
                        h("div", { className: "pl-name" }, track.name || track.title || ""),
                        h("div", { className: "pl-artist" }, track.artist || track.singer || ""),
                      ),
                      h(
                        "div",
                        { className: "pl-act" },
                        h(
                          "button",
                          {
                            className: "btn sm",
                            title: "加入队列",
                            onClick: function (event) {
                              event.stopPropagation();
                              addNext(track);
                            },
                          },
                          h(Icon, { name: "plus" }),
                        ),
                      ),
                    );
                  }),
                )
              : h(Empty, {
                  icon: "search",
                  title: "搜索音乐",
                  desc: web.searched ? "没有找到匹配的歌曲" : "选择音源并输入关键词开始搜索",
                }),
        ),
      ),

      /* ================= 发音人 ================= */
      h(
        Modal,
        {
          open: showTts,
          title: "选择发音人",
          sub: "当前：" + (tTSLABEL[tts] || tts || "未设置"),
          onClose: function () {
            setShowTts(false);
          },
        },
        h(
          "div",
          { className: "hint", style: { marginBottom: "12px" } },
          "设备朗读文本时使用的声音",
        ),
        h(
          "div",
          { style: { display: "flex", flexWrap: "wrap", gap: "8px" } },
          tTSSPEAKERS.map(function (item) {
            return h(
              Chip,
              {
                key: item[0],
                on: tts === item[1],
                onClick: function () {
                  setTts(item[0]);
                  try {
                    R1WS.setTtsSpeaker(item[0]);
                    toast("已切换为 " + item[1], "ok");
                  } catch (error) {}
                },
              },
              item[1],
            );
          }),
        ),
      ),

      /* ================= 音乐源 ================= */
      h(
        Modal,
        {
          open: showSrc,
          title: "调整音乐源",
          sub: "点播与歌单使用的音源",
          onClose: function () {
            setShowSrc(false);
          },
        },
        h(
          "div",
          { className: "rows" },
          r1Core.SOURCES.map(function (item) {
            return h(Row, {
              key: item.key,
              icon: "music",
              accent: source === item.v,
              title: item.label,
              sub: source === item.v ? "当前使用中" : "点击切换",
              onClick: function () {
                setSource(item.v);
                sourceSwitchRef.current = true; /* 切换保护：3 秒内不接受设备滞后回包 */
                setTimeout(function () {
                  sourceSwitchRef.current = false;
                }, 3000);
                try {
                  localStorage.setItem("r1_music_source", String(item.v));
                } catch (error) {}
                try {
                  R1WS.setMusicSource(item.key);
                } catch (error) {}
                toast("音乐源已切换为 " + item.label, "ok");
                setShowSrc(false);
              },
              end: source === item.v ? h(Icon, { name: "check" }) : null,
            });
          }),
        ),
      ),

      /* ================= 我的歌单 ================= */
      h(
        Modal,
        {
          open: showSongs,
          title: "我的歌单",
          sub: "来自设备登录的音乐账号",
          size: "wide",
          onClose: function () {
            setShowSongs(false);
          },
          footer: h(
            Button,
            {
              variant: "ghost",
              icon: "refresh",
              loading: groupsBusy,
              onClick: function () {
                loadGroups(true, songSrc);
              },
            },
            "重新加载",
          ),
        },
        h(
          "div",
          { style: { marginBottom: 12 } },
          h(Seg, {
            value: songSrc,
            onChange: function (value) {
              setSongSrc(value);
              loadGroups(true, value);
            },
            items: [
              { key: "qq", label: "QQ 音乐" },
              { key: "netease", label: "网易云" },
              { key: "kuwo", label: "酷我" },
            ],
          }),
        ),
        h(SongGroups, {
          data: songGroups,
          busy: groupsBusy,
          onPlay: function (id, title) {
            if (!guard()) return;
            try {
              R1WS.playSongList(String(id));
            } catch (error) {}
            toast("正在播放：" + title, "ok");
            setShowSongs(false);
          },
        }),
      ),

      /* ================= 热榜推荐 ================= */
      h(
        Modal,
        {
          open: showHot,
          title: "热榜推荐",
          sub: "网易云 / QQ 官方榜单，点击歌曲直接在音箱播放",
          size: "wide",
          onClose: function () {
            setShowHot(false);
          },
        },
        h(HotTab, { guard: guard, devSrc: source }),
      ),

      /* ================= 氛围灯 ================= */
      h(
        Modal,
        {
          open: showLight,
          title: "氛围灯设置",
          sub: "效果 / 亮度 / 渐变速度 / 颜色",
          onClose: function () {
            setShowLight(false);
          },
        },
        h(LightSheetBody),
      ),
    );
  }

  /* =====================================================================
   * 热榜：网易云 / QQ 官方榜单（服务端 /api/hotlist 代理 + 5 分钟缓存）
   * 点歌直接推到音箱播放；+ 号把歌加入播放队列。酷我接口被限制暂不可用。
   * =================================================================== */
  var hOTSOURCES = [
    { k: "netease", l: "网易云" },
    { k: "qq", l: "QQ 音乐" },
    { k: "kuwo", l: "酷我", broken: true },
  ];
  var hOTBOARDS = [
    { k: "hot", l: "热歌" },
    { k: "new", l: "新歌" },
    { k: "soar", l: "飙升" },
  ];
  /* 各榜单在音源侧对应的官方歌单 id：一键播放直接把歌单 id 下发给设备（与"我的歌单"同款逻辑），
   * 设备自行拉取完整榜单（约 100 首），无需前端逐首 web_添加 */
  var hOTBOARDLISTIDS = {
    netease: { hot: "3778678", new: "3779629", soar: "19723756" },
    qq: { hot: "26", new: "27", soar: "28" },
  };
  var hotCache = {};

  /* 从已缓存的榜单数据里按歌名找封面（零网络请求；找不到返回空串显示音符占位） */
  function cachedPic(name, artist) {
    if (!name) return "";
    var keys = Object.keys(hotCache);
    for (var index = 0; index < keys.length; index++) {
      var items = hotCache[keys[index]] || [];
      for (var index2 = 0; index2 < items.length; index2++) {
        if (items[index2].name === name && items[index2].pic) return items[index2].pic;
      }
    }
    return "";
  }

  function HotTab(props) {
    var sourceState = useState("netease"),
      source = sourceState[0],
      setSrc = sourceState[1];
    var boardState = useState("hot"),
      board = boardState[0],
      setBoard = boardState[1];
    var listState = useState(null),
      list = listState[0],
      setList = listState[1];
    var busyState = useState(false),
      busy = busyState[0],
      setBusy = busyState[1];
    var errorState = useState(""),
      error = errorState[0],
      setErr = errorState[1];

    useEffect(
      function () {
        var key = source + ":" + board;
        if (hotCache[key]) {
          setList(hotCache[key]);
          setErr("");
          return;
        }
        setBusy(true);
        setErr("");
        setList(null);
        var dead = false;
        fetch(R1Config.serviceUrl("api/hotlist") + "?source=" + source + "&board=" + board)
          .then(function (result) {
            return result.json();
          })
          .then(function (result) {
            if (dead) return;
            if (result.success && result.list && result.list.length) {
              hotCache[key] = result.list;
              setList(result.list);
            } else {
              setErr(result.error || "榜单暂不可用");
            }
            setBusy(false);
          })
          .catch(function () {
            if (dead) return;
            setErr("榜单加载失败，请稍后再试");
            setBusy(false);
          });
        return function () {
          dead = true;
        };
      },
      [source, board],
    );

    var playAllBusy = useRef(false);

    function playSong(item) {
      if (!props.guard()) return;
      try {
        R1WS.musicPlay((item.name || "") + " " + (item.artist || ""));
      } catch (error2) {}
      toast("正在点播：" + item.name, "ok", 1800);
    }
    function addSong(item) {
      if (!props.guard()) return;
      try {
        R1WS.sendMessage({
          what: 65536,
          arg1: 0,
          arg2: 1,
          obj: "web_添加" + (item.name || "") + " " + (item.artist || ""),
        });
      } catch (error2) {}
      toast("已加入播放队列", "ok");
    }
    /* 一键播放整榜：设备端「歌单 id 直发」（arg2:9）只认它自己拉取过的歌单，
     * 对网易云/QQ 官方榜单 id 会报「暂不支持该网站」（实测两次确认），此路不通。
     * 改用实测可靠的逐首方案：第一首点播立即出声，其余 99 首以 150ms 间隔
     * 依次 web_添加 入队（约 15 秒发完）；音源不一致时先切源等设备应用再开始。 */
    function playAll() {
      if (!props.guard()) return;
      if (playAllBusy.current) {
        toast("正在加入队列，请稍候", "info");
        return;
      }
      if (!list || !list.length) {
        toast("榜单还没加载出来", "err");
        return;
      }
      playAllBusy.current = true;
      var batch = list.slice(0, 100);
      var devStr = { 1: "qq", 2: "netease", 3: "kuwo" }[props.devSrc] || "netease";
      var start = function () {
        try {
          R1WS.musicPlay((batch[0].name || "") + " " + (batch[0].artist || ""));
        } catch (error2) {}
        for (var index = 1; index < batch.length; index++) {
          (function (it, delay, index2) {
            setTimeout(function () {
              try {
                R1WS.sendMessage({
                  what: 65536,
                  arg1: 0,
                  arg2: 1,
                  obj: "web_添加" + (it.name || "") + " " + (it.artist || ""),
                });
              } catch (error2) {}
              if (index2 === batch.length - 1) {
                playAllBusy.current = false;
                toast("整榜 " + batch.length + " 首已全部加入队列", "ok", 2600);
              }
            }, delay);
          })(batch[index], index * 150, index);
        }
        toast(
          "正在播放第 1 首，其余 " +
            (batch.length - 1) +
            " 首依次加入队列（约 " +
            Math.ceil((batch.length * 150) / 1000) +
            " 秒）",
          "ok",
          3000,
        );
      };
      if (devStr === source) {
        start();
        return;
      }
      try {
        R1WS.setMusicSource(source);
      } catch (error2) {}
      toast("正在切换音源，稍后自动开始…", "info", 2000);
      setTimeout(start, 1200);
    }

    return h(
      "div",
      null,
      h(
        "div",
        {
          style: {
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 10,
          },
        },
        hOTSOURCES.map(function (s2) {
          return h(
            Chip,
            {
              key: s2.k,
              on: source === s2.k && !s2.broken,
              onClick: function () {
                if (s2.broken) {
                  toast("酷我榜单接口暂时被限制，敬请期待", "info", 2200);
                  return;
                }
                setSrc(s2.k);
              },
            },
            s2.l,
          );
        }),
        h("div", { style: { flex: 1 } }),
        h(
          Button,
          {
            variant: "primary",
            icon: "play",
            size: "sm",
            disabled: !(list && list.length),
            onClick: playAll,
          },
          "播放整榜",
        ),
      ),
      h(
        "div",
        { style: { marginBottom: 12 } },
        h(Seg, {
          value: board,
          onChange: setBoard,
          items: hOTBOARDS.map(function (item) {
            return { key: item.k, label: item.l };
          }),
        }),
      ),
      busy
        ? h(
            "div",
            { style: { display: "grid", placeItems: "center", padding: "30px 0" } },
            h(Spinner),
          )
        : error
          ? h(Empty, { icon: "alert", title: "榜单暂不可用", desc: error })
          : list && list.length
            ? h(
                "div",
                { className: "playlist-scroll" },
                list.map(function (it, index) {
                  return h(
                    "div",
                    {
                      key: index,
                      className: "playlist-item",
                      onClick: function () {
                        playSong(it);
                      },
                    },
                    h(
                      "div",
                      { className: "pl-pic" },
                      it.pic
                        ? h("img", {
                            src: it.pic,
                            alt: "",
                            onError: function (event) {
                              if (event.target.parentNode)
                                event.target.parentNode.classList.add("no-pic");
                              event.target.style.display = "none";
                            },
                          })
                        : h(Icon, { name: "music" }),
                    ),
                    h("div", { className: "pl-idx" }, index + 1),
                    h(
                      "div",
                      { className: "pl-main" },
                      h("div", { className: "pl-name" }, it.name || ""),
                      h("div", { className: "pl-artist" }, it.artist || ""),
                    ),
                    h(
                      "div",
                      { className: "pl-act" },
                      h(
                        "button",
                        {
                          className: "btn sm",
                          title: "加入队列",
                          onClick: function (event) {
                            event.stopPropagation();
                            addSong(it);
                          },
                        },
                        h(Icon, { name: "plus" }),
                      ),
                    ),
                  );
                }),
              )
            : h(Empty, { icon: "list", title: "暂无数据" }),
      /* 设备端只播它注册过的歌单：网易云官方榜单本质是歌单，收藏后即可直发 */
      source === "netease"
        ? h(
            "div",
            {
              style: {
                marginTop: 10,
                fontSize: 12,
                color: "var(--mui-text-secondary)",
                lineHeight: 1.6,
              },
            },
            "提示：在网易云音乐 App 收藏「热歌榜 / 新歌榜 / 飙升榜」官方歌单后，它们会出现在「更多 → 我的歌单」里，点卡片即可整榜直发（一条指令、秒级完成）。",
          )
        : null,
    );
  }

  /* 我的歌单分组列表 */
  function SongGroups(props) {
    if (props.busy)
      return h(
        "div",
        { style: { display: "grid", placeItems: "center", padding: "30px 0" } },
        h(Spinner),
      );
    var data = props.data;
    if (!data)
      return h(Empty, {
        icon: "folder",
        title: "还没有加载歌单",
        desc: "点击下方「重新加载」从设备读取",
      });
    if (data.code !== 200 && data.code !== "200") {
      return h(Empty, {
        icon: "alert",
        title: "获取歌单失败",
        desc: data.msg || data.login_msg || "请先在设备上登录音乐账号",
      });
    }
    var payload = data.data;
    var list = Array.isArray(payload)
      ? payload
      : payload && Array.isArray(payload.data)
        ? payload.data
        : payload && Array.isArray(payload.list)
          ? payload.list
          : [];
    if (!list.length) return h(Empty, { icon: "folder", title: "当前音源暂无歌单数据" });

    /* 原版封面卡片网格：分组标题 + 歌单卡片（封面 pic / 标题 / 描述），
     * 点击卡片用 playSongList(歌单id) 整张歌单播放 */
    return h(
      "div",
      { className: "song-list-content" },
      list.map(function (item, gi) {
        var items = item.list || item.songs || item.items || [];
        return h(
          "div",
          { key: gi, className: "song-list-group" },
          h(
            "div",
            { className: "song-list-group-title" },
            h("span", null, item.title || item.name || "默认分组"),
            h("span", { className: "song-list-count" }, "[" + items.length + "]"),
          ),
          h(
            "div",
            { className: "song-list-grid" },
            items.map(function (item, ii) {
              var id = item.id || item.list_id || item.songListId;
              var title = item.title || item.name || "未命名歌单";
              return h(
                "div",
                {
                  key: ii,
                  className: "song-list-card",
                  onClick: function () {
                    if (!id) {
                      toast("歌单 ID 为空", "err");
                      return;
                    }
                    props.onPlay(id, title);
                  },
                },
                h(
                  "div",
                  { className: "song-list-card-cover" },
                  item.pic
                    ? h("img", {
                        src: item.pic,
                        alt: title,
                        onError: function (event) {
                          /* 封面加载失败：隐藏裂图，显示占位图标 */
                          event.target.style.display = "none";
                          if (event.target.parentNode)
                            event.target.parentNode.classList.add("cover-fallback");
                        },
                      })
                    : null,
                ),
                h(
                  "div",
                  { className: "song-list-card-info" },
                  h("div", { className: "song-list-card-title" }, title),
                  item.content
                    ? h("div", { className: "song-list-card-desc" }, item.content)
                    : null,
                ),
              );
            }),
          ),
        );
      }),
    );
  }

  /* =====================================================================
   * 屏幕
   * =================================================================== */
  var dEFAULTDW = 720,
    dEFAULTDH = 480;

  function ScreenPanel() {
    var store = r1Core.useStore();
    var frameState = useState(""),
      frame = frameState[0],
      setFrame = frameState[1];
    var streamingState = useState(false),
      streaming = streamingState[0],
      setStreaming = streamingState[1];
    var fpsState = useState(0),
      fps = fpsState[0],
      setFps = fpsState[1];
    var textState = useState(""),
      text = textState[0],
      setText = textState[1];
    var ttsTextState = useState(""),
      ttsText = ttsTextState[0],
      setTtsText = ttsTextState[1];
    var sizeState = useState({ w: dEFAULTDW, h: dEFAULTDH }),
      size = sizeState[0],
      setSize = sizeState[1];
    var imgBadState = useState(false),
      imgBad = imgBadState[0],
      setImgBad = imgBadState[1];
    var imgRef = useRef(null);
    var dragRef = useRef({ down: false });
    var statRef = useRef({ frames: 0, last: Date.now(), smooth: 0 });
    var lastUrlRef = useRef("");
    var fluidState = useState(false),
      fluid = fluidState[0],
      setFluid = fluidState[1];

    /* 帧格式归一化（移植原版 onFrame 逻辑）：
     * 设备发来的帧可能是完整 dataURL、裸 base64 或二进制 Blob，
     * 直接把裸 base64 当 img src 会显示裂图（就是"屏幕不显示"的原因）。 */
    function normalizeFrame(payload) {
      if (!payload) return "";
      if (typeof payload === "string") {
        var text2 = payload.trim();
        /* 完整 dataURL / blob / http 地址 → 直接可用 */
        if (/^(data:image\/[a-zA-Z0-9+.-]+;base64,|blob:|https?:\/\/)/.test(text2)) return text2;
        /* 裸 base64（长度足够且只含 base64 字符）→ 补 jpeg 前缀 */
        if (/^[A-Za-z0-9+/=\s]+$/.test(text2) && text2.length > 100) {
          return "data:image/jpeg;base64," + text2.replace(/\s+/g, "");
        }
        return "";
      }
      /* 二进制：Blob / ArrayBuffer / Uint8Array → ObjectURL */
      try {
        var blob =
          typeof Blob !== "undefined" && payload instanceof Blob ? payload : new Blob([payload]);
        if (!blob.size) return "";
        return typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(blob) : "";
      } catch (error) {
        return "";
      }
    }

    r1Core.useR1Event("screen_frame", function (data) {
      var url = normalizeFrame(data);
      if (!url) return;
      /* 释放上一个 blob 帧，避免内存泄漏 */
      if (
        lastUrlRef.current &&
        lastUrlRef.current.indexOf("blob:") === 0 &&
        lastUrlRef.current !== url
      ) {
        try {
          URL.revokeObjectURL(lastUrlRef.current);
        } catch (error) {}
      }
      lastUrlRef.current = url;
      setFrame(url);
      setImgBad(false);
      var current = statRef.current;
      current.frames++;
      var now = Date.now();
      if (now - current.last >= 1000) {
        var current2 = Math.round((current.frames * 1000) / (now - current.last));
        /* 指数平滑：FPS 数字不再 1↔4 乱跳，看起来更接近真实感受 */
        current.smooth = current.smooth
          ? Math.round(current.smooth * 0.55 + current2 * 0.45)
          : current2;
        setFps(current.smooth);
        current.frames = 0;
        current.last = now;
      }
    });
    r1Core.useR1Event("screen_size", function (value) {
      try {
        var text2 = typeof value === "string" ? value : JSON.stringify(value);
        var value2 = text2.match(/(\d{2,5})\s*[xX]\s*(\d{2,5})/);
        if (value2) setSize({ w: parseInt(value2[1], 10), h: parseInt(value2[2], 10) });
      } catch (error) {}
    });

    useEffect(
      function () {
        if (!store.connected) return;
        try {
          R1WS.startScreenStream(100);
          setStreaming(true);
        } catch (error) {}
        return function () {
          try {
            R1WS.stopScreenStream();
          } catch (error) {}
          /* 离开页面释放最后一次 blob 帧 */
          if (lastUrlRef.current && lastUrlRef.current.indexOf("blob:") === 0) {
            try {
              URL.revokeObjectURL(lastUrlRef.current);
            } catch (error) {}
            lastUrlRef.current = "";
          }
        };
      },
      [store.connected],
    );

    /* 方向键/回车/空格 → 设备按键（输入框聚焦时不拦截） */
    useEffect(function () {
      function onKey(event) {
        var tag = (event.target && event.target.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) return;
        var map = {
          ArrowUp: 19,
          ArrowDown: 20,
          ArrowLeft: 21,
          ArrowRight: 22,
          Enter: 23,
          " ": 23,
          Backspace: 67,
          Escape: 4,
        };
        var code = map[event.key];
        if (code) {
          event.preventDefault();
          try {
            R1WS.sendKeyevent(code);
          } catch (error) {}
        }
      }
      window.addEventListener("keydown", onKey);
      return function () {
        window.removeEventListener("keydown", onKey);
      };
    }, []);

    function toDevice(cx, cy) {
      var element = imgRef.current;
      if (!element) return { x: 0, y: 0 };
      var bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return { x: 0, y: 0 };
      return {
        x: Math.round(((cx - bounds.left) / bounds.width) * size.w),
        y: Math.round(((cy - bounds.top) / bounds.height) * size.h),
      };
    }
    function onPointerDown(event) {
      event.preventDefault();
      var point = toDevice(event.clientX, event.clientY);
      dragRef.current = {
        down: true,
        sx: point.x,
        sy: point.y,
        dx: point.x,
        dy: point.y,
        t0: Date.now(),
        moved: false,
      };
      try {
        event.target.setPointerCapture && event.target.setPointerCapture(event.pointerId);
      } catch (error) {}
    }
    function onPointerMove(event) {
      var current = dragRef.current;
      if (!current.down) return;
      var point = toDevice(event.clientX, event.clientY);
      if (Math.abs(point.x - current.sx) + Math.abs(point.y - current.sy) > 4) current.moved = true;
      current.dx = point.x;
      current.dy = point.y;
    }
    function onPointerUp() {
      var current = dragRef.current;
      if (!current.down) return;
      current.down = false;
      var dur = Date.now() - current.t0;
      try {
        if (current.moved)
          R1WS.sendInput(
            "swipe " +
              current.sx +
              " " +
              current.sy +
              " " +
              current.dx +
              " " +
              current.dy +
              " " +
              Math.max(80, dur),
          );
        else R1WS.sendInput("tap " + current.sx + " " + current.sy);
      } catch (error) {}
    }
    function sendText() {
      var text2 = (text || "").trim();
      if (!text2) {
        toast("请输入要发送的文本", "err");
        return;
      }
      try {
        R1WS.sendInput("text " + text2);
      } catch (error) {}
      setText("");
      toast("已发送文本", "ok");
    }
    function sendTts() {
      var text2 = (ttsText || "").trim();
      if (!text2) {
        toast("请输入要播报的内容", "err");
        return;
      }
      try {
        R1WS.tts(text2);
      } catch (error) {}
      setTtsText("");
      toast("已发送语音播报", "ok");
    }
    function uploadBg(event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast("图片不能超过 5MB", "err");
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          R1WS.setBackground(ev.target.result);
          toast("背景已上传", "ok");
        } catch (error) {}
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    }
    function toggleStream() {
      if (!store.connected) {
        toast("请先连接设备", "err");
        return;
      }
      try {
        if (streaming) {
          R1WS.stopScreenStream();
          setStreaming(false);
        } else {
          R1WS.startScreenStream(100);
          setStreaming(true);
        }
      } catch (error) {}
    }

    /* 流畅模式（实验）：降低设备分辨率换更高的推流帧率
     * 设备每帧截图耗时与小图面积成正比，480x320 只有 720x480 的 44% 像素量。
     * 注意会改变设备本体的显示分辨率，开关两侧都发 wm size 命令并重启推流。 */
    function restartStreamAfter(ms) {
      try {
        R1WS.stopScreenStream();
      } catch (error) {}
      setTimeout(function () {
        try {
          R1WS.startScreenStream(100);
          setStreaming(true);
        } catch (error) {}
      }, ms);
    }
    function toggleFluid() {
      if (!store.connected) {
        toast("请先连接设备", "err");
        return;
      }
      if (!fluid) {
        try {
          R1WS.executeShell("wm size 480x320");
        } catch (error) {}
        setSize({ w: 480, h: 320 });
        setFluid(true);
        restartStreamAfter(1200);
        toast("已切换流畅模式：设备分辨率降为 480×320", "info", 2600);
      } else {
        try {
          R1WS.executeShell("wm size 720x480");
        } catch (error) {}
        setSize({ w: 720, h: 480 });
        setFluid(false);
        restartStreamAfter(1200);
        toast("已恢复标准分辨率 720×480", "ok");
      }
    }

    var KEYS = [
      { k: "返回", c: 4 },
      { k: "主页", c: 3 },
      { k: "菜单", c: 82 },
      { k: "电源", c: 26 },
      { k: "上", c: 19 },
      { k: "下", c: 20 },
      { k: "左", c: 21 },
      { k: "右", c: 22 },
      { k: "音量+", c: 24 },
      { k: "音量-", c: 25 },
      { k: "退格", c: 67 },
      { k: "OK", c: 23 },
    ];

    if (!store.connected) {
      return h(
        "div",
        { className: "page-inner narrow" },
        h(PageHead, { title: "屏幕", desc: "远程查看并操控音箱屏幕" }),
        h(
          "div",
          { className: "card pad-lg" },
          h(Empty, {
            icon: "monitor",
            title: "尚未连接设备",
            desc: "连接后可实时预览设备屏幕，并用鼠标、触摸、键盘远程操控。",
            action: h(
              Button,
              {
                variant: "primary",
                icon: "link",
                onClick: function () {
                  r1Core.openSheet("connect");
                },
              },
              "连接设备",
            ),
          }),
        ),
      );
    }

    return h(
      "div",
      { className: "page-inner" },
      h(PageHead, {
        title: "屏幕",
        desc: size.w + " × " + size.h + (streaming ? " · 推流中 " + fps + " FPS" : " · 推流已停"),
        actions: [
          h(
            Chip,
            { key: "st", on: streaming, icon: "monitor", onClick: toggleStream },
            streaming ? "停止推流" : "开始推流",
          ),
          h(
            Chip,
            {
              key: "cap",
              icon: "camera",
              onClick: function () {
                try {
                  R1WS.requestScreencap();
                } catch (error) {}
              },
            },
            "截屏",
          ),
          h(
            Chip,
            {
              key: "rs",
              icon: "refresh",
              onClick: function () {
                try {
                  R1WS.resetScreenResolution();
                  toast("已请求重置分辨率为 720x480", "ok");
                } catch (error) {}
              },
            },
            "重置分辨率",
          ),
          h(
            Chip,
            {
              key: "fluid",
              icon: "signal",
              on: fluid,
              title: "降低设备分辨率换取更高帧率（实验）",
              onClick: toggleFluid,
            },
            fluid ? "流畅模式开" : "流畅模式",
          ),
        ],
      }),
      h(
        "div",
        { className: "section" },
        h(
          "div",
          { className: "stage" },
          h(
            "div",
            { className: "stage-hud" },
            h(
              Pill,
              { tone: streaming ? "ok" : "err", dot: true, pulse: streaming },
              streaming ? "实时" : "已停止",
            ),
            fps ? h(Pill, { tone: "accent" }, fps + " FPS") : null,
          ),
          frame
            ? h("img", {
                src: frame,
                alt: "设备屏幕",
                ref: imgRef,
                draggable: false,
                onPointerDown: onPointerDown,
                onPointerMove: onPointerMove,
                onPointerUp: onPointerUp,
                onPointerCancel: onPointerUp,
                onLoad: function () {
                  setImgBad(false);
                },
                onError: function () {
                  /* 帧解码失败：清掉裂图显示提示，等待设备发下一帧 */
                  setImgBad(true);
                  setFrame("");
                },
              })
            : h(
                "div",
                { className: "placeholder" },
                h(Icon, { name: "monitor" }),
                h(
                  "div",
                  null,
                  imgBad
                    ? "画面解码失败，正在等待下一帧…"
                    : streaming
                      ? "正在等待设备画面…"
                      : "推流未开启",
                ),
                h(
                  Button,
                  { size: "sm", variant: "soft", onClick: toggleStream },
                  streaming ? "重新推流" : "开始推流",
                ),
              ),
        ),
      ),
      h(
        "div",
        { className: "grid cols-2 section" },
        h(
          Card,
          { title: "遥控按键", icon: "keyboard" },
          h(
            "div",
            { className: "keypad" },
            KEYS.map(function (key) {
              return h(
                Button,
                {
                  key: key.c,
                  size: "sm",
                  onClick: function () {
                    try {
                      R1WS.sendKeyevent(key.c);
                    } catch (error) {}
                  },
                },
                key.k,
              );
            }),
          ),
        ),
        h(
          Card,
          { title: "文本 / 语音", icon: "mic" },
          h(
            "div",
            { style: { display: "flex", gap: "8px", marginBottom: "10px" } },
            h(Input, {
              value: text,
              onChange: setText,
              placeholder: "发送到设备输入框",
              onKeyDown: function (value) {
                if (value.key === "Enter") sendText();
              },
            }),
            h(Button, { onClick: sendText }, "发送"),
          ),
          h(
            "div",
            { style: { display: "flex", gap: "8px" } },
            h(Input, {
              value: ttsText,
              onChange: setTtsText,
              placeholder: "让设备朗读这段文字",
              onKeyDown: function (value) {
                if (value.key === "Enter") sendTts();
              },
            }),
            h(Button, { variant: "primary", onClick: sendTts }, "播报"),
          ),
          h("div", { className: "divider" }),
          h(
            "label",
            { className: "btn ghost block", style: { cursor: "pointer" } },
            h(Icon, { name: "image" }),
            "上传设备背景图",
            h("input", {
              type: "file",
              accept: "image/*",
              style: { display: "none" },
              onChange: uploadBg,
            }),
          ),
          h(
            "div",
            { className: "hint", style: { marginTop: "8px" } },
            "支持 5MB 以内图片，上传后立即应用到设备",
          ),
        ),
      ),
    );
  }

  /* =====================================================================
   * 氛围灯（原版协议：模式 0/1/2/3/4，亮度 1-200，颜色下发整数）
   * =================================================================== */
  function LightSheetBody() {
    var info = r1Core.useStore().deviceInfo || {};
    var onState = useState(false),
      on = onState[0],
      setOn = onState[1];
    var modeState = useState(0),
      mode = modeState[0],
      setMode = modeState[1];
    var brightState = useState(100),
      bright = brightState[0],
      setBright = brightState[1];
    var speedState = useState(4),
      speed = speedState[0],
      setSpeed = speedState[1];
    var colorState = useState("#ffffff"),
      color = colorState[0],
      setColor = colorState[1];

    useEffect(
      function () {
        if (info.music_light_enable != null) setOn(!!info.music_light_enable);
      },
      [info.music_light_enable],
    );
    useEffect(
      function () {
        if (info.music_light_mode != null) setMode(info.music_light_mode);
      },
      [info.music_light_mode],
    );

    /* 改灯效后设备约 2 秒才回写状态，延时重新拉取 */
    function refreshLater() {
      setTimeout(function () {
        try {
          R1WS.requestServiceInfo();
        } catch (error) {}
      }, 2500);
    }

    var MODES = [
      { mode: 0, label: "官方效果" },
      { mode: 2, label: "七彩效果" },
      { mode: 1, label: "七彩旋转" },
      { mode: 3, label: "七彩旋转1" },
      { mode: 4, label: "单色效果" },
    ];

    return h(
      "div",
      null,
      h(
        "div",
        { className: "rows" },
        h(
          "div",
          { className: "row" },
          h("div", { className: "row-ico accent" }, h(Icon, { name: "lightbulb" })),
          h(
            "div",
            { className: "row-main" },
            h("div", { className: "row-title" }, "氛围灯"),
            h("div", { className: "row-sub" }, on ? "已开启" : "已关闭"),
          ),
          h(
            "div",
            { className: "row-end" },
            h(R1UI.Switch, {
              on: on,
              onChange: function (value) {
                setOn(value);
                try {
                  R1WS.setAtmosphereLight(value);
                  refreshLater();
                } catch (error) {}
              },
            }),
          ),
        ),
      ),
      h("div", { className: "divider" }),
      h(
        "div",
        { className: "field", style: { marginBottom: "16px" } },
        h("label", null, "氛围效果"),
        h(
          "div",
          { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
          MODES.map(function (item) {
            return h(
              Chip,
              {
                key: item.mode,
                on: mode === item.mode,
                onClick: function () {
                  setMode(item.mode);
                  try {
                    R1WS.setLightMode(item.mode);
                    refreshLater();
                  } catch (error) {}
                },
              },
              item.label,
            );
          }),
        ),
      ),
      h(
        "div",
        { className: "field", style: { marginBottom: "16px" } },
        h("label", null, "亮度"),
        h(Slider, {
          value: bright,
          min: 1,
          max: 200,
          label: "亮度",
          onChange: setBright,
          onCommit: function (value) {
            try {
              R1WS.setLightBrightness(value);
            } catch (error) {}
          },
        }),
      ),
      mode === 0 || mode === 1 || mode === 3
        ? h(
            "div",
            { className: "field", style: { marginBottom: "16px" } },
            h("label", null, "颜色渐变速度"),
            h(Slider, {
              value: speed,
              min: 0,
              max: 100,
              label: "渐变速度",
              onChange: setSpeed,
              onCommit: function (value) {
                try {
                  R1WS.setLightColorSpeed(value);
                } catch (error) {}
              },
            }),
          )
        : null,
      mode === 4
        ? h(
            "div",
            { className: "field" },
            h("label", null, "灯光颜色"),
            h(
              "div",
              { style: { display: "flex", alignItems: "center", gap: "12px" } },
              h("input", {
                type: "color",
                value: color,
                style: {
                  width: "52px",
                  height: "36px",
                  padding: "3px",
                  background: "transparent",
                  border: "1px solid var(--mui-divider)",
                  borderRadius: "8px",
                  cursor: "pointer",
                },
                onChange: function (event) {
                  var value = event.target.value;
                  setColor(value);
                  try {
                    R1WS.setLightColor(parseInt(value.substr(1), 16));
                  } catch (error) {}
                },
              }),
              h(
                "span",
                { className: "mono", style: { color: "var(--mui-text-secondary)" } },
                color,
              ),
            ),
          )
        : null,
    );
  }

  r1Panels.MusicPanel = MusicPanel;
  r1Panels.ScreenPanel = ScreenPanel;
  r1Panels.LightSheet = LightSheetBody;

  /* 发音人弹层（设备页顶栏入口也会用到） */
  r1Panels.TtsSpeakerSheet = function TtsSpeakerSheet() {
    var tts = (r1Core.useStore().deviceInfo || {}).ttsModelType;
    return h(
      "div",
      null,
      h(
        "div",
        { className: "hint", style: { marginBottom: "12px" } },
        "选择设备播报文本时使用的发音人，切换后立即生效。",
      ),
      h(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: "8px" } },
        tTSSPEAKERS.map(function (item) {
          return h(
            Chip,
            {
              key: item[0],
              on: tts === item[0],
              onClick: function () {
                try {
                  R1WS.setTtsSpeaker(item[0]);
                  toast("已切换为 " + item[1], "ok");
                } catch (error) {}
              },
            },
            item[1],
          );
        }),
      ),
    );
  };
})(window);
