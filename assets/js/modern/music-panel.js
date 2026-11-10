/**
 * R1 页面：音乐（原版网易云风格播放器 UI）/ 屏幕
 *
 * 音乐页刻意沿用旧版播放器的 DOM 结构与类名（netease-* / player-* / song-*），
 * 视觉由 app.css 中原版样式决定，本文件只负责状态与交互；
 * 数据来自 R1WS 事件，高频状态留在组件内部，避免整页重绘。
 */
(function (global) {
    'use strict';

    var h = R1UI.h, Icon = R1UI.Icon, Button = R1UI.Button, IconBtn = R1UI.IconBtn;
    var Chip = R1UI.Chip, Seg = R1UI.Seg, Card = R1UI.Card, Row = R1UI.Row;
    var Empty = R1UI.Empty, Slider = R1UI.Slider, Input = R1UI.Input;
    var Pill = R1UI.Pill, Spinner = R1UI.Spinner, PageHead = R1UI.PageHead;
    var SearchBar = R1UI.SearchBar, Modal = R1UI.Modal;
    var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;
    var C = R1Core;
    var toast = C.toast;

    var P = global.R1Panels = global.R1Panels || {};

    var VOL_MAX = 30;
    var VOL_WARN_THRESHOLD = 18;
    var MUSIC_API = R1Config.musicApiUrl;

    /* 发音人：设备用字符串码，展示用中文名（沿用原版映射） */
    var TTS_SPEAKERS = [
        ['SWEET', '萱萱'], ['FEMALE', '小雯'], ['CHILDREN', '糖糖'],
        ['LZL', '玲玲'], ['MALE', '小峰'], ['TIANTIAN', '天天']
    ];
    var TTS_LABEL = {};
    TTS_SPEAKERS.forEach(function (s) { TTS_LABEL[s[0]] = s[1]; });

    var defaultCover = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">' +
        '<rect fill="#1a1a2e" width="160" height="160" rx="80"/>' +
        '<circle cx="80" cy="80" r="50" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>' +
        '<circle cx="80" cy="80" r="30" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>' +
        '<path d="M70 55 L70 95 Q70 105 80 105 Q90 105 90 95 L90 65 Q90 55 80 55 Z" fill="rgba(255,255,255,0.15)"/>' +
        '<circle cx="80" cy="100" r="8" fill="rgba(255,255,255,0.2)"/>' +
        '</svg>'
    );

    /* 歌词文本统一转字符串，规避 React 渲染对象报错（原版踩过坑） */
    function lrcText(line) {
        if (line == null) return '';
        if (typeof line === 'object') return line.text != null ? String(line.text) : JSON.stringify(line);
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

    function qCoverFetch(key, name, artist, src, cb) {
        if (qCoverCache[key]) { if (cb) cb(qCoverCache[key]); return; }
        if (qCoverFail[key]) return;
        if (qCoverWaiters[key]) { if (cb) qCoverWaiters[key].push(cb); return; }
        qCoverWaiters[key] = cb ? [cb] : [];
        qCoverBatch.push({ key: key, name: name, artist: artist, src: src });
        if (qCoverBatch.length >= 25) qCoverFlush();
        else if (!qCoverTimer) qCoverTimer = setTimeout(qCoverFlush, 120);
    }

    /* 队列行封面：有封面直接显示；没有则等滚动到可见（IO）再按需拉取 */
    function QueuePic(props) {
        var ref = useRef(null);
        var _pic = useState(''), pic = _pic[0], setPic = _pic[1];
        useEffect(function () {
            if (props.direct || qCoverCache[props.k]) return;
            var el = ref.current;
            if (!el) return;
            var fire = function () {
                qCoverFetch(props.k, props.name, props.artist, props.src, function (url) { if (url) setPic(url); });
            };
            var io = null;
            try {
                io = new IntersectionObserver(function (entries) {
                    for (var i = 0; i < entries.length; i++) {
                        if (entries[i].isIntersecting) { io.disconnect(); fire(); return; }
                    }
                }, { root: (props.rootRef && props.rootRef.current) || null, rootMargin: '300px' });
                io.observe(el);
            } catch (e) { fire(); }
            return function () { try { io && io.disconnect(); } catch (e) {} };
        }, []);
        var url = props.direct || qCoverCache[props.k] || pic;
        return h('div', {
            className: 'pl-pic' + (url ? ' has-img' : ''),
            ref: url ? undefined : ref
        },
            url
                ? h('img', {
                    src: url, alt: '',
                    onError: function (e) {
                        if (e.target.parentNode) e.target.parentNode.classList.add('no-pic');
                        e.target.style.display = 'none';
                    }
                })
                : h(Icon, { name: 'music' })
        );
    }

    /* =====================================================================
     * 音乐页
     * =================================================================== */
    function MusicPanel() {
        var st = C.useStore();

        /* --- 播放状态 --- */
        var _playing = useState(false), playing = _playing[0], setPlaying = _playing[1];
        var _song = useState({ title: '未在播放', artist: '', cover: '' }), song = _song[0], setSong = _song[1];
        var _progress = useState(0), progress = _progress[0], setProgress = _progress[1];
        var _duration = useState(0), duration = _duration[0], setDuration = _duration[1];
        var _volume = useState(15), volume = _volume[0], setVolume = _volume[1];
        var _mode = useState('list'), mode = _mode[0], setMode = _mode[1];
        var _source = useState(2), source = _source[0], setSource = _source[1];
        var _lyrics = useState([]), lyrics = _lyrics[0], setLyrics = _lyrics[1];
        var _lrcIdx = useState(0), lrcIdx = _lrcIdx[0], setLrcIdx = _lrcIdx[1];
        var _queue = useState([]), queue = _queue[0], setQueue = _queue[1];
        var _tts = useState(''), tts = _tts[0], setTts = _tts[1];
        var _collected = useState(function () {
            try { return JSON.parse(localStorage.getItem('r1_collected') || '{}'); } catch (e) { return {}; }
        }), collected = _collected[0], setCollected = _collected[1];

        /* --- 播放器 UI --- */
        var _scale = useState(1), scale = _scale[0], setScale = _scale[1];
        var _showLyrics = useState(false), showLyrics = _showLyrics[0], setShowLyrics = _showLyrics[1];
        var _showVol = useState(false), showVol = _showVol[0], setShowVol = _showVol[1];
        var _showQueue = useState(false), showQueue = _showQueue[0], setShowQueue = _showQueue[1];
        var _queueFilter = useState(''), queueFilter = _queueFilter[0], setQueueFilter = _queueFilter[1];
        var _showMore = useState(false), showMore = _showMore[0], setShowMore = _showMore[1];
        var _askText = useState(''), askText = _askText[0], setAskText = _askText[1];
        var _showAsk = useState(false), showAsk = _showAsk[0], setShowAsk = _showAsk[1];
        var _showTts = useState(false), showTts = _showTts[0], setShowTts = _showTts[1];
        var _showSrc = useState(false), showSrc = _showSrc[0], setShowSrc = _showSrc[1];
        var _showLight = useState(false), showLight = _showLight[0], setShowLight = _showLight[1];
        var _showHot = useState(false), showHot = _showHot[0], setShowHot = _showHot[1];
        /* 歌词自动重试：正在播放却没歌词时每 4 秒重取一次，最多 5 次 */
        var _retry = useState(0), retryCount = _retry[0], setRetryCount = _retry[1];
        var _showSongs = useState(false), showSongs = _showSongs[0], setShowSongs = _showSongs[1];
        var _songGroups = useState(null), songGroups = _songGroups[0], setSongGroups = _songGroups[1];
        var _groupsBusy = useState(false), groupsBusy = _groupsBusy[0], setGroupsBusy = _groupsBusy[1];
        /* 我的歌单音源：弹层内可切 QQ / 网易云 / 酷我，切换即向设备重新拉取该源歌单 */
        var _songSrc = useState('netease'), songSrc = _songSrc[0], setSongSrc = _songSrc[1];
        var _web = useState({ open: false, kw: '', src: 'netease', list: [], busy: false, searched: false });
        var web = _web[0], setWeb = _web[1];

        /* --- 拖动锁 --- */
        var seekingRef = useRef(false);
        var volDragRef = useRef(false);
        var volWarnRef = useRef(false);
        var sourceSwitchRef = useRef(false);
        var progressRef = useRef(0);
        var lyricsRef = useRef([]);
        var queueRef = useRef(null);
        useEffect(function () { progressRef.current = progress; }, [progress]);
        useEffect(function () { lyricsRef.current = lyrics; }, [lyrics]);

        /* ---------- 设备事件 ---------- */
        /* 切歌检测：歌名变化即清空旧歌词（新歌词由 lrc 事件随后填入），
         * 避免新歌没歌词时界面残留上一首的歌词；同时重置自动重试计数 */
        var lastTitleRef = useRef('');
        C.useR1Event('music_info', function (info) {
            if (!info) return;
            if (info.title && info.title !== lastTitleRef.current) {
                lastTitleRef.current = info.title;
                setLyrics([]); lyricsRef.current = [];
                setLrcIdx(0);
                setRetryCount(0);
            }
            if (info.title || info.artist || info.cover || info.albumUrl) {
                setSong(function (p) {
                    return Object.assign({}, p, {
                        title: info.title != null ? info.title : p.title,
                        artist: info.artist != null ? info.artist : p.artist,
                        album: info.album != null ? info.album : p.album,
                        cover: info.cover || info.albumUrl || p.cover
                    });
                });
            }
            if (info.playing !== undefined) setPlaying(!!info.playing);
            if (info.play_state !== undefined) setPlaying(!!info.play_state);
            if (info.play_mode !== undefined) {
                var mm = { 1: 'random', 2: 'list', 3: 'single' };
                if (mm[info.play_mode]) setMode(mm[info.play_mode]);
            }
            if (info.ttsModelType !== undefined) setTts(info.ttsModelType);
            if (info.music_source !== undefined && info.music_source !== null) {
                var raw = info.music_source;
                var num = typeof raw === 'string' ? ({ qq: 1, netease: 2, kuwo: 3 })[raw] : raw;
                if ((num === 1 || num === 2 || num === 3) && !sourceSwitchRef.current && num !== source) {
                    setSource(num);
                    try { localStorage.setItem('r1_music_source', String(num)); } catch (e) {}
                }
            }
            if (info.volume !== undefined && !volDragRef.current) {
                setVolume(Math.max(0, Math.min(VOL_MAX, Number(info.volume))));
            }
            if (info.position !== undefined) {
                if (!seekingRef.current) setProgress(info.position / 1000);
            } else if (info.progress !== undefined) {
                if (!seekingRef.current) setProgress(info.progress > 10000 ? info.progress / 1000 : info.progress);
            }
            if (info.duration !== undefined) {
                setDuration(info.duration > 10000 ? Math.floor(info.duration / 1000) : info.duration);
            }
        });

        C.useR1Event('lrc', function (data) {
            if (!data) return;
            if (data.lyrics) {
                setProgress(0); progressRef.current = 0;
                setLrcIdx(0);
                setLyrics(data.lyrics);
            }
            if (data.currentIndex !== undefined) setLrcIdx(data.currentIndex);
        });

        C.useR1Event('music_list', function (list) { if (Array.isArray(list)) setQueue(list); });

        C.useR1Event('song_list', function (data) {
            setGroupsBusy(false);
            if (!data) { toast('歌单响应为空', 'err'); return; }
            if (data.code !== 200 && data.code !== '200') {
                toast('获取歌单失败：' + (data.msg || data.login_msg || ('code=' + data.code)), 'err');
                setSongGroups(data);
                return;
            }
            setSongGroups(data);
            toast('歌单加载完成', 'ok');
        });

        C.useR1Event('collect_result', function (info) { if (info && info.msg) toast(info.msg, 'info'); });

        /* ---------- 进度推进 + 歌词同步（100ms，沿用原版节奏） ---------- */
        useEffect(function () {
            function tick() {
                if (seekingRef.current) return;
                var next = progressRef.current;
                if (playing && duration > 0) next = Math.min(duration, next + 0.1);
                progressRef.current = next;
                setProgress(next);

                var ls = lyricsRef.current;
                if (ls && ls.length) {
                    var ms = next * 1000 + 280; /* 原版：人声到达前 280ms 高亮 */
                    var lo = 0, hi = ls.length - 1, ans = 0;
                    while (lo <= hi) {
                        var mid = (lo + hi) >> 1;
                        if (ls[mid].time <= ms) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
                    }
                    setLrcIdx(function (cur) { return cur === ans ? cur : ans; });
                }
            }
            var t = setInterval(tick, 100);
            return function () { clearInterval(t); };
        }, [playing, duration, lyrics]);

        /* ---------- 记住上次音乐源 ---------- */
        useEffect(function () {
            var saved = 2;
            try { saved = parseInt(localStorage.getItem('r1_music_source') || '2', 10) || 2; } catch (e) {}
            setSource(saved);
        }, []);

        /* ---------- 视口缩放（原版 --player-scale 逻辑，小屏防裁切、平板防空旷） ---------- */
        useEffect(function () {
            function calc() {
                var w = window.innerWidth, hh = window.innerHeight, s;
                if (w <= 360) s = 0.85;
                else if (w <= 414) s = 1;
                else if (w <= 768) s = 1 + (w - 414) / (768 - 414) * 0.25;
                else if (w <= 1024) { var vmin = Math.min(w, hh) / 100; s = Math.min(2.0, Math.max(1.5, vmin * 0.08)); }
                else s = 1;
                if (hh < 600) s = Math.min(s, 0.9);
                if (hh < 500) s = Math.min(s, 0.78);
                setScale(parseFloat(s.toFixed(3)));
            }
            calc();
            window.addEventListener('resize', calc);
            return function () { window.removeEventListener('resize', calc); };
        }, []);

        /* ---------- 交互 ---------- */
        function guard() {
            if (!st.connected) { toast('请先连接设备', 'err'); return false; }
            return true;
        }
        function handlePlay() {
            if (!guard()) return;
            var next = !playing;
            setPlaying(next); /* 乐观更新，按下即响应 */
            try { next ? R1WS.musicResume() : R1WS.musicPause(); } catch (e) {}
        }
        function step(action) {
            if (!guard()) return;
            try { R1WS.musicControl(action); } catch (e) {}
        }
        function changeMode() {
            if (!guard()) return;
            var next = C.nextMode(mode);
            setMode(next);
            try { R1WS.wsSend({ type: 'set_play_mode', mode: C.MODE_CODE[next] }); } catch (e) {}
            toast(C.MODE_LABEL[next], 'info', 1400);
        }
        function applyVolume(v) {
            v = Math.max(0, Math.min(VOL_MAX, v));
            setVolume(v);
            volDragRef.current = false;
            if (v > VOL_WARN_THRESHOLD && !volWarnRef.current) {
                C.confirm({
                    title: '音量提醒',
                    desc: '音量超过 ' + VOL_WARN_THRESHOLD + ' 可能打扰他人，甚至损伤扬声器。确定继续吗？',
                    okText: '继续调大', cancelText: '取消'
                }).then(function (ok) {
                    if (ok) { volWarnRef.current = true; try { R1WS.setVolume(v); } catch (e) {} }
                    else setVolume(VOL_WARN_THRESHOLD);
                });
                return;
            }
            try { R1WS.setVolume(v); } catch (e) {}
        }
        function bumpVolume(delta) { applyVolume(volume + delta); }
        function seekTo(v) {
            try { R1WS.seekTo(v); } catch (e) {}
            setTimeout(function () { seekingRef.current = false; }, 500);
        }
        function playQueueItem(item, idx) {
            if (!guard()) return;
            var name = item.title || item.name || '';
            /* 点击的正是当前歌曲且在播放 → 不重复触发 */
            if (name && name === song.title && playing) return;
            try {
                if (idx !== undefined && idx !== null) R1WS.playByIndex(idx);
                else R1WS.musicPlay(name);
            } catch (e) {}
            toast('正在播放：' + name, 'ok', 1600);
        }
        function toggleCollect(item) {
            if (!guard()) return;
            var key = (item.title || item.name || '') + '@@' + (item.artist || item.singer || '');
            var next = Object.assign({}, collected);
            var has = !!next[key];
            try { has ? R1WS.cancelCollectSong(item) : R1WS.collectSong(item); } catch (e) {}
            if (has) delete next[key]; else next[key] = true;
            setCollected(next);
            try { localStorage.setItem('r1_collected', JSON.stringify(next)); } catch (e) {}
        }
        function openQueue() {
            setShowQueue(true);
            try { R1WS.requestMusicList(); } catch (e) {}
        }
        function askPlay() {
            var kw = (askText || '').trim();
            if (!kw) { toast('请输入歌曲名或歌手', 'err'); return; }
            if (!guard()) return;
            var key = ({ 1: 'qq', 2: 'netease', 3: 'kuwo' })[source];
            try { if (key) R1WS.setMusicSource(key); } catch (e) {}
            try { R1WS.musicPlay(kw); } catch (e) {}
            toast('正在点播：' + kw, 'ok');
            setAskText(''); setShowAsk(false);
        }
        function playCollection() {
            if (!guard()) return;
            try { if (source) R1WS.setMusicSource(({ 1: 'qq', 2: 'netease', 3: 'kuwo' })[source]); R1WS.playCollection(); } catch (e) {}
            toast('正在播放小讯收藏', 'ok');
            setShowMore(false);
        }
        function loadGroups(force, src) {
            if (!guard()) return;
            setGroupsBusy(true);
            setSongGroups(null);
            try { R1WS.requestSongList(src != null ? src : source, force); } catch (e) { setGroupsBusy(false); }
            setTimeout(function () { setGroupsBusy(false); }, 8000);
        }
        function doWebSearch() {
            var kw = (web.kw || '').trim();
            if (!kw) { toast('请输入关键词', 'err'); return; }
            setWeb(Object.assign({}, web, { busy: true, searched: true, list: [] }));
            /* 静态部署使用可配置的 CORS 音乐接口，不依赖同源搜索后端。 */
            fetch(MUSIC_API + '?source=' + web.src + '&page=1&keyword=' + encodeURIComponent(kw))
                .then(function (r) { return r.json(); })
                .then(function (d) {
                    if (d.code === 1 && d.data && d.data.list && d.data.list.length) {
                        var list = d.data.list;
                        if (web.src === 'qq') {
                            setWeb(Object.assign({}, web, { busy: false, list: list }));
                            return;
                        }
                        Promise.all(list.map(function (s) {
                            return fetch(MUSIC_API + '?info=' + encodeURIComponent(s.id))
                                .then(function (r) { return r.json(); })
                                .then(function (x) { if (x.code === 1 && x.data && x.data.pic) s.pic = x.data.pic; return s; })
                                .catch(function () { return s; });
                        })).then(function (full) {
                            setWeb(Object.assign({}, web, { busy: false, list: full }));
                        });
                        return;
                    }
                    setWeb(Object.assign({}, web, { busy: false, list: [] }));
                    toast('未找到相关歌曲', 'info');
                })
                .catch(function () {
                    setWeb(Object.assign({}, web, { busy: false, list: [] }));
                    toast('搜索失败，请检查网络', 'err');
                });
        }
        function playWebResult(s) {
            if (!guard()) return;
            var STR2NUM = { qq: 1, netease: 2, kuwo: 3 };
            var num = STR2NUM[web.src];
            if (num && num !== source) {
                setSource(num);
                sourceSwitchRef.current = true;
                setTimeout(function () { sourceSwitchRef.current = false; }, 3000);
                try { R1WS.setMusicSource(({ 1: 'qq', 2: 'netease', 3: 'kuwo' })[num]); } catch (e) {}
            }
            try { R1WS.musicPlay((s.name || '') + ' ' + (s.artist || '')); } catch (e) {}
            toast('正在播放：' + s.name, 'ok');
            setWeb(Object.assign({}, web, { open: false }));
        }
        function addNext(s) {
            if (!guard()) return;
            try {
                R1WS.sendMessage({ what: 65536, arg1: 0, arg2: 1, obj: 'web_添加' + (s.name || '') + ' ' + (s.artist || '') });
            } catch (e) {}
            toast('已加入播放队列', 'ok');
        }
        function locatePlaying() {
            var el = document.querySelector('.playlist-item.playing');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            else toast('当前无正在播放的歌曲', 'info');
        }

        /* ---------- 队列过滤（保留原始索引用于 playByIndex） ---------- */
        var kw = queueFilter.trim().toLowerCase();
        var filteredQueue = queue.map(function (s, i) { return { song: s, idx: i }; }).filter(function (it) {
            if (!kw) return true;
            var name = (it.song.title || it.song.name || '').toLowerCase();
            var artist = (it.song.artist || it.song.singer || '').toLowerCase();
            return name.indexOf(kw) >= 0 || artist.indexOf(kw) >= 0 || String(it.idx + 1).indexOf(kw) >= 0;
        });

        /* ---------- 歌词滚动定位（桌面与移动两个容器都尝试） ---------- */
        var desktopLrcRef = useRef(null);
        var mobileLrcRef = useRef(null);
        useEffect(function () {
            [desktopLrcRef.current, mobileLrcRef.current].forEach(function (box) {
                if (!box) return;
                var el = box.querySelector('.active');
                if (!el) return;
                var top = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
                try { box.scrollTo({ top: top, behavior: 'smooth' }); } catch (e) { box.scrollTop = top; }
            });
        }, [lrcIdx, lyrics]);

        /* 歌词自动重试：正在播放且无歌词时，定期让设备重新推送（多数情况 1-2 次就到） */
        useEffect(function () {
            if (lyrics.length || !playing || !song.title) return;
            if (retryCount >= 5) return;
            var t = setTimeout(function () {
                try { R1WS.requestMusicInfo(); } catch (e) {}
                setRetryCount(retryCount + 1);
            }, 4000);
            return function () { clearTimeout(t); };
        }, [lyrics.length, playing, song.title, retryCount]);

        /* 队列封面全量后台预取：队列一到就把所有歌的封面慢速预热到服务器持久缓存，
         * 每批 25 首、间隔 400ms，不打扰当前操作；之后打开队列弹层全部命中缓存（65ms 级秒出），
         * 滚动到任何区块都不用再等首查 */
        useEffect(function () {
            if (!queue.length) return;
            var src = ({ 1: 'qq', 2: 'netease', 3: 'kuwo' })[source] || 'netease';
            var seen = {};
            var todo = [];
            queue.forEach(function (s) {
                var name = s.title || s.name || '';
                if (!name) return;
                var artist = s.artist || s.singer || '';
                var k = name + '@@' + artist;
                if (seen[k] || qCoverCache[k] || qCoverFail[k] || qCoverWaiters[k]) return;
                seen[k] = 1;
                todo.push({ key: k, name: name, artist: artist, src: src });
            });
            if (!todo.length) return;
            var i = 0;
            var timer = setInterval(function () {
                if (i >= todo.length) { clearInterval(timer); return; }
                var batch = todo.slice(i, i + 25);
                i += 25;
                batch.forEach(function (t) { qCoverFetch(t.key, t.name, t.artist, t.src, null); });
            }, 400);
            return function () { clearInterval(timer); };
        }, [queue.length]);

        function renderLrc(variant) {
            var cls = variant === 'mobile' ? 'netease-lrc-line-mobile' : 'netease-lrc-line';
            return lyrics.map(function (line, i) {
                return h('div', { key: i, className: cls + (i === lrcIdx ? ' active' : '') }, lrcText(line));
            });
        }

        var MORE_ITEMS = [
            { icon: 'music', label: '点播音乐', act: function () { setShowMore(false); setShowAsk(true); } },
            { icon: 'search', label: '音乐搜索', act: function () { setShowMore(false); setWeb({ open: true, kw: '', src: 'netease', list: [], busy: false, searched: false }); } },
            { icon: 'heart', label: '小讯收藏', act: playCollection },
            { icon: 'list', label: '我的歌单', act: function () {
                setShowMore(false); setShowSongs(true);
                var s = ({ 1: 'qq', 2: 'netease', 3: 'kuwo' })[source] || 'netease';
                setSongSrc(s); loadGroups(false, s);
            } },
            { icon: 'sliders', label: '调整发音人', act: function () { setShowMore(false); setShowTts(true); } },
            { icon: 'refresh', label: '调整音乐源', act: function () { setShowMore(false); setShowSrc(true); } },
            { icon: 'lightbulb', label: '氛围灯', act: function () { setShowMore(false); setShowLight(true); } },
            { icon: 'star', label: '热榜推荐', act: function () { setShowMore(false); setShowHot(true); } }
        ];

        var cover = song.cover || defaultCover;

        return h(React.Fragment, null,

            /* ================= 播放器主体（原版结构） ================= */
            h('div', {
                className: 'netease-player-wrapper',
                style: { '--player-scale': String(scale) }
            },
                h('div', { className: 'player-bg', style: song.cover ? { backgroundImage: 'url(' + song.cover + ')' } : {} }),

                /* --- 电脑版：左转盘 + 右歌名/歌词 --- */
                h('div', { className: 'player-content-desktop' },
                    h('div', { className: 'player-left' },
                        h('div', { className: 'netease-disc-wrap' },
                            h('div', { className: 'song-disc' },
                                h('div', { className: 'song-needle' + (playing ? ' play' : '') }),
                                h('div', { className: 'song-disc__bg' }),
                                h('div', { className: 'song-disc__cover' },
                                    h('div', { className: 'song-img' + (playing ? ' play' : '') },
                                        h('img', { src: cover, alt: '封面', className: 'u-img' })
                                    )
                                )
                            )
                        )
                    ),
                    h('div', { className: 'player-right' },
                        h('div', { className: 'desktop-song-info' },
                            h('div', { className: 'desktop-song-title' }, song.title || '未在播放'),
                            h('div', { className: 'desktop-song-artist' }, song.artist || '--')
                        ),
                        lyrics.length
                            ? h('div', { className: 'desktop-lyrics', ref: desktopLrcRef }, renderLrc('desktop'))
                            : h('div', { className: 'desktop-lyrics pure-music-center' },
                                h('div', { className: 'pure-music-title' }, song.title || '未在播放'),
                                h('div', { className: 'pure-music-artist' }, song.artist || '--'),
                                h('div', { className: 'no-lrc-hint' }, '暂无歌词，可尝试重新获取'),
                                h('button', {
                                    className: 'no-lrc-btn',
                                    onClick: function () {
                                        try { R1WS.requestMusicInfo(); toast('已请求重新获取歌词', 'info'); } catch (e) {}
                                        setRetryCount(0);
                                    }
                                }, h(Icon, { name: 'refresh' }), '重新获取歌词')
                            )
                    )
                ),

                /* --- 手机版：歌名置顶 + 封面/歌词互切 --- */
                h('div', { className: 'player-content-mobile' },
                    h('div', { className: 'mobile-song-info' },
                        h('div', { className: 'mobile-song-title' }, song.title || '未在播放'),
                        h('div', { className: 'mobile-song-artist' }, song.artist || '--')
                    ),
                    h('div', { className: 'mobile-stage' },
                        !showLyrics
                            ? h('div', {
                                className: 'mobile-disc-wrap mobile-stage-item',
                                style: { cursor: 'pointer' },
                                /* 无论有无歌词都允许点击：无歌词时显示占位 */
                                onClick: function () { setShowLyrics(true); }
                            },
                                h('div', { className: 'song-disc song-disc-mobile' },
                                    h('div', { className: 'song-needle song-needle-mobile' + (playing ? ' play' : '') }),
                                    h('div', { className: 'song-disc__bg song-disc__bg-mobile' }),
                                    h('div', { className: 'song-disc__cover song-disc__cover-mobile' },
                                        h('div', { className: 'song-img' + (playing ? ' play' : '') },
                                            h('img', { src: cover, alt: '封面', className: 'u-img' })
                                        )
                                    )
                                )
                            )
                            : h('div', {
                                className: 'mobile-lyrics mobile-stage-item',
                                ref: mobileLrcRef,
                                onClick: function () { setShowLyrics(false); }
                            },
                                lyrics.length
                                    ? renderLrc('mobile')
                                    : h('div', { className: 'pure-music-center' },
                                        h('div', { className: 'pure-music-title' }, song.title || '未在播放'),
                                        h('div', { className: 'pure-music-artist' }, song.artist || '--'),
                                        h('div', { className: 'pure-music-artist', style: { fontSize: '12px', opacity: 0.6, marginTop: '8px' } }, '暂无歌词 · 点击返回封面')
                                    )
                            )
                    )
                ),

                /* --- 底部控制栏 --- */
                h('div', { className: 'player-controls' },
                    h('div', { className: 'progress-section' },
                        h('span', { className: 'time-current' }, C.fmtTime(progress)),
                        h('div', { className: 'progress-bar-wrap' },
                            h(Slider, {
                                min: 0, max: duration || 100, step: 0.1,
                                value: Math.min(progress, duration || progress),
                                showValue: false, label: '播放进度',
                                className: 'progress-slider',
                                onChange: function (v) {
                                    seekingRef.current = true;
                                    setProgress(v); progressRef.current = v;
                                },
                                onCommit: seekTo
                            })
                        ),
                        h('span', { className: 'time-total' }, C.fmtTime(duration))
                    ),

                    h('div', { className: 'controls-row' },
                        h('div', { className: 'controls-left' },
                            h('button', { className: 'ctrl-btn', title: C.MODE_LABEL[mode], onClick: changeMode },
                                h(Icon, { name: C.MODE_ICON[mode] || 'repeat' })),
                            h('div', { className: 'vol-control' },
                                h('button', {
                                    className: 'ctrl-btn', title: '音量 ' + volume,
                                    onClick: function () { setShowVol(!showVol); }
                                }, h(Icon, { name: volume === 0 ? 'volumeMute' : (volume < 12 ? 'volumeLow' : 'volume') })),
                                showVol
                                    ? h('div', { className: 'vol-slider-wrap' },
                                        h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
                                            h(Button, { size: 'sm', variant: 'ghost', onClick: function () { bumpVolume(-1); } }, h(Icon, { name: 'minus' })),
                                            h(Button, { size: 'sm', variant: 'ghost', onClick: function () { bumpVolume(1); } }, h(Icon, { name: 'plus' }))
                                        ),
                                        h(Slider, {
                                            min: 0, max: VOL_MAX, step: 1, value: volume,
                                            label: '音量', showValue: false,
                                            onChange: function (v) { volDragRef.current = true; setVolume(v); },
                                            onCommit: function (v) { applyVolume(v); }
                                        }),
                                        h('span', { className: 'vol-value' }, volume + ' / ' + VOL_MAX)
                                    )
                                    : null
                            )
                        ),
                        h('div', { className: 'controls-center' },
                            h('button', { className: 'ctrl-btn', title: '上一首', onClick: function () { step('prev'); } }, h(Icon, { name: 'prev' })),
                            h('button', { className: 'play-btn', title: playing ? '暂停' : '播放', onClick: handlePlay }, h(Icon, { name: playing ? 'pause' : 'play' })),
                            h('button', { className: 'ctrl-btn', title: '下一首', onClick: function () { step('next'); } }, h(Icon, { name: 'next' }))
                        ),
                        h('div', { className: 'controls-right' },
                            h('button', { className: 'ctrl-btn', title: '播放队列', onClick: openQueue }, h(Icon, { name: 'list' })),
                            h('button', { className: 'ctrl-btn', title: '更多功能', onClick: function () { setShowMore(true); } }, h(Icon, { name: 'more' }))
                        )
                    )
                )
            ),

            /* ================= 播放队列 ================= */
            h(Modal, {
                open: showQueue, title: '当前播放队列',
                sub: queue.length + ' 首 · 点击切歌',
                size: 'wide',
                onClose: function () { setShowQueue(false); setQueueFilter(''); },
                footer: h(Button, { variant: 'soft', icon: 'search', onClick: locatePlaying }, '定位当前')
            },
                h('div', { style: { marginBottom: '12px' } },
                    h(SearchBar, { value: queueFilter, onChange: setQueueFilter, placeholder: '搜索歌曲 / 歌手 / 序号' })
                ),
                filteredQueue.length
                    ? h('div', { className: 'playlist-scroll', ref: queueRef },
                        filteredQueue.map(function (it, i) {
                            var s = it.song;
                            var name = s.title || s.name || '';
                            var artist = s.artist || s.singer || '';
                            var isCur = !!s.playing || (song.title && song.title === name);
                            var key = name + '@@' + artist;
                            return h('div', {
                                key: it.idx,
                                className: 'playlist-item' + (isCur ? ' playing' : ''),
                                onClick: function () { playQueueItem(s, it.idx); }
                            },
                                h(QueuePic, {
                                    k: key,
                                    name: name,
                                    artist: artist,
                                    src: ({ 1: 'qq', 2: 'netease', 3: 'kuwo' })[source] || 'netease',
                                    direct: (isCur && song.cover) || cachedPic(name, artist) || '',
                                    rootRef: queueRef
                                }),
                                h('div', { className: 'pl-idx' }, it.idx + 1),
                                h('div', { className: 'pl-main' },
                                    h('div', { className: 'pl-name' }, name || '（未命名）'),
                                    artist ? h('div', { className: 'pl-artist' }, artist) : null
                                ),
                                h('div', { className: 'pl-act' },
                                    h('button', {
                                        className: 'btn sm', title: collected[key] ? '取消收藏' : '收藏',
                                        onClick: function (e) { e.stopPropagation(); toggleCollect(s); }
                                    }, h(Icon, { name: collected[key] ? 'heartFill' : 'heart' }))
                                )
                            );
                        })
                    )
                    : h(Empty, { icon: 'list', title: kw ? '没有匹配的歌曲' : '队列为空', desc: kw ? '换个关键词试试' : '点播或从歌单选歌后会出现在这里' })
            ),

            /* ================= 更多功能 ================= */
            h(Modal, {
                open: showMore, title: '更多功能', onClose: function () { setShowMore(false); }
            },
                h('div', { className: 'netease-more-grid' }, MORE_ITEMS.map(function (it, i) {
                    return h('div', { key: i, className: 'netease-more-item', onClick: it.act },
                        h('div', { className: 'more-icon' }, h(Icon, { name: it.icon })),
                        h('div', { className: 'more-label' }, it.label)
                    );
                }))
            ),

            /* ================= 点播音乐 ================= */
            h(Modal, {
                open: showAsk, title: '点播音乐',
                sub: '输入歌名或「歌手 + 歌名」，直接让设备播放',
                onClose: function () { setShowAsk(false); },
                footer: [
                    h(Button, { key: 'c', variant: 'ghost', onClick: function () { setShowAsk(false); } }, '取消'),
                    h(Button, { key: 'o', variant: 'primary', onClick: askPlay }, '点播')
                ]
            },
                h(Input, {
                    value: askText, onChange: setAskText, autoFocus: true,
                    placeholder: '例如：安和桥 宋冬野',
                    onKeyDown: function (e) { if (e.key === 'Enter') askPlay(); }
                }),
                h('div', { className: 'hint', style: { marginTop: '10px' } },
                    '当前音乐源：' + (C.SOURCE_LABEL[source] || '未设置'))
            ),

            /* ================= 音乐搜索（聚合） ================= */
            h(Modal, {
                open: web.open, title: '音乐搜索',
                sub: '跨音源搜索，结果可直接点播到设备',
                size: 'wide',
                onClose: function () { setWeb(Object.assign({}, web, { open: false })); }
            },
                h('div', { style: { display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' } },
                    [{ k: 'netease', l: '网易云' }, { k: 'qq', l: 'QQ 音乐' }, { k: 'kuwo', l: '酷我' }].map(function (s) {
                        return h(Chip, {
                            key: s.k, on: web.src === s.k,
                            onClick: function () { setWeb(Object.assign({}, web, { src: s.k })); }
                        }, s.l);
                    })
                ),
                h('div', { style: { display: 'flex', gap: '8px' } },
                    h(Input, {
                        value: web.kw, placeholder: '歌名 / 歌手',
                        onChange: function (v) { setWeb(Object.assign({}, web, { kw: v })); },
                        onKeyDown: function (e) { if (e.key === 'Enter') doWebSearch(); }
                    }),
                    h(Button, { variant: 'primary', loading: web.busy, onClick: doWebSearch }, '搜索')
                ),
                h('div', { style: { marginTop: '14px' } },
                    web.busy
                        ? h('div', { style: { display: 'grid', placeItems: 'center', padding: '26px 0' } }, h(Spinner))
                        : web.list.length
                            ? h('div', { className: 'playlist-scroll' }, web.list.map(function (s, i) {
                                return h('div', { key: s.id || i, className: 'playlist-item', onClick: function () { playWebResult(s); } },
                                    h('div', { className: 'pl-idx' }, i + 1),
                                    h('div', { className: 'pl-main' },
                                        h('div', { className: 'pl-name' }, s.name || s.title || ''),
                                        h('div', { className: 'pl-artist' }, s.artist || s.singer || '')
                                    ),
                                    h('div', { className: 'pl-act' },
                                        h('button', {
                                            className: 'btn sm', title: '加入队列',
                                            onClick: function (e) { e.stopPropagation(); addNext(s); }
                                        }, h(Icon, { name: 'plus' }))
                                    )
                                );
                            }))
                            : h(Empty, { icon: 'search', title: '搜索音乐', desc: web.searched ? '没有找到匹配的歌曲' : '选择音源并输入关键词开始搜索' })
                )
            ),

            /* ================= 发音人 ================= */
            h(Modal, {
                open: showTts, title: '选择发音人',
                sub: '当前：' + (TTS_LABEL[tts] || tts || '未设置'),
                onClose: function () { setShowTts(false); }
            },
                h('div', { className: 'hint', style: { marginBottom: '12px' } }, '设备朗读文本时使用的声音'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
                    TTS_SPEAKERS.map(function (s) {
                        return h(Chip, {
                            key: s[0], on: tts === s[1],
                            onClick: function () {
                                setTts(s[0]);
                                try { R1WS.setTtsSpeaker(s[0]); toast('已切换为 ' + s[1], 'ok'); } catch (e) {}
                            }
                        }, s[1]);
                    })
                )
            ),

            /* ================= 音乐源 ================= */
            h(Modal, {
                open: showSrc, title: '调整音乐源',
                sub: '点播与歌单使用的音源',
                onClose: function () { setShowSrc(false); }
            },
                h('div', { className: 'rows' }, C.SOURCES.map(function (s) {
                    return h(Row, {
                        key: s.key, icon: 'music', accent: source === s.v,
                        title: s.label,
                        sub: source === s.v ? '当前使用中' : '点击切换',
                        onClick: function () {
                            setSource(s.v);
                            sourceSwitchRef.current = true; /* 切换保护：3 秒内不接受设备滞后回包 */
                            setTimeout(function () { sourceSwitchRef.current = false; }, 3000);
                            try { localStorage.setItem('r1_music_source', String(s.v)); } catch (e) {}
                            try { R1WS.setMusicSource(s.key); } catch (e) {}
                            toast('音乐源已切换为 ' + s.label, 'ok');
                            setShowSrc(false);
                        },
                        end: source === s.v ? h(Icon, { name: 'check' }) : null
                    });
                }))
            ),

            /* ================= 我的歌单 ================= */
            h(Modal, {
                open: showSongs, title: '我的歌单',
                sub: '来自设备登录的音乐账号',
                size: 'wide',
                onClose: function () { setShowSongs(false); },
                footer: h(Button, { variant: 'ghost', icon: 'refresh', loading: groupsBusy, onClick: function () { loadGroups(true, songSrc); } }, '重新加载')
            },
                h('div', { style: { marginBottom: 12 } },
                    h(Seg, {
                        value: songSrc,
                        onChange: function (k) { setSongSrc(k); loadGroups(true, k); },
                        items: [
                            { key: 'qq', label: 'QQ 音乐' },
                            { key: 'netease', label: '网易云' },
                            { key: 'kuwo', label: '酷我' }
                        ]
                    })
                ),
                h(SongGroups, {
                    data: songGroups, busy: groupsBusy,
                    onPlay: function (id, title) {
                        if (!guard()) return;
                        try { R1WS.playSongList(String(id)); } catch (e) {}
                        toast('正在播放：' + title, 'ok');
                        setShowSongs(false);
                    }
                })
            ),

            /* ================= 热榜推荐 ================= */
            h(Modal, {
                open: showHot, title: '热榜推荐',
                sub: '网易云 / QQ 官方榜单，点击歌曲直接在音箱播放',
                size: 'wide',
                onClose: function () { setShowHot(false); }
            }, h(HotTab, { guard: guard, devSrc: source })),

            /* ================= 氛围灯 ================= */
            h(Modal, {
                open: showLight, title: '氛围灯设置',
                sub: '效果 / 亮度 / 渐变速度 / 颜色',
                onClose: function () { setShowLight(false); }
            }, h(LightSheetBody))
        );
    }

    /* =====================================================================
     * 热榜：网易云 / QQ 官方榜单（服务端 /api/hotlist 代理 + 5 分钟缓存）
     * 点歌直接推到音箱播放；+ 号把歌加入播放队列。酷我接口被限制暂不可用。
     * =================================================================== */
    var HOT_SOURCES = [
        { k: 'netease', l: '网易云' },
        { k: 'qq', l: 'QQ 音乐' },
        { k: 'kuwo', l: '酷我', broken: true }
    ];
    var HOT_BOARDS = [{ k: 'hot', l: '热歌' }, { k: 'new', l: '新歌' }, { k: 'soar', l: '飙升' }];
    /* 各榜单在音源侧对应的官方歌单 id：一键播放直接把歌单 id 下发给设备（与"我的歌单"同款逻辑），
     * 设备自行拉取完整榜单（约 100 首），无需前端逐首 web_添加 */
    var HOT_BOARD_LIST_IDS = {
        netease: { hot: '3778678', new: '3779629', soar: '19723756' },
        qq: { hot: '26', new: '27', soar: '28' }
    };
    var hotCache = {};

    /* 从已缓存的榜单数据里按歌名找封面（零网络请求；找不到返回空串显示音符占位） */
    function cachedPic(name, artist) {
        if (!name) return '';
        var keys = Object.keys(hotCache);
        for (var i = 0; i < keys.length; i++) {
            var arr = hotCache[keys[i]] || [];
            for (var j = 0; j < arr.length; j++) {
                if (arr[j].name === name && arr[j].pic) return arr[j].pic;
            }
        }
        return '';
    }

    function HotTab(props) {
        var _src = useState('netease'), src = _src[0], setSrc = _src[1];
        var _board = useState('hot'), board = _board[0], setBoard = _board[1];
        var _list = useState(null), list = _list[0], setList = _list[1];
        var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];
        var _err = useState(''), err = _err[0], setErr = _err[1];

        useEffect(function () {
            var key = src + ':' + board;
            if (hotCache[key]) { setList(hotCache[key]); setErr(''); return; }
            setBusy(true); setErr(''); setList(null);
            var dead = false;
            fetch(R1Config.serviceUrl('api/hotlist') + '?source=' + src + '&board=' + board)
                .then(function (r) { return r.json(); })
                .then(function (d) {
                    if (dead) return;
                    if (d.success && d.list && d.list.length) {
                        hotCache[key] = d.list;
                        setList(d.list);
                    } else {
                        setErr(d.error || '榜单暂不可用');
                    }
                    setBusy(false);
                })
                .catch(function () {
                    if (dead) return;
                    setErr('榜单加载失败，请稍后再试');
                    setBusy(false);
                });
            return function () { dead = true; };
        }, [src, board]);

        var playAllBusy = useRef(false);

        function playSong(item) {
            if (!props.guard()) return;
            try { R1WS.musicPlay((item.name || '') + ' ' + (item.artist || '')); } catch (e) {}
            toast('正在点播：' + item.name, 'ok', 1800);
        }
        function addSong(item) {
            if (!props.guard()) return;
            try {
                R1WS.sendMessage({ what: 65536, arg1: 0, arg2: 1, obj: 'web_添加' + (item.name || '') + ' ' + (item.artist || '') });
            } catch (e) {}
            toast('已加入播放队列', 'ok');
        }
        /* 一键播放整榜：设备端「歌单 id 直发」（arg2:9）只认它自己拉取过的歌单，
         * 对网易云/QQ 官方榜单 id 会报「暂不支持该网站」（实测两次确认），此路不通。
         * 改用实测可靠的逐首方案：第一首点播立即出声，其余 99 首以 150ms 间隔
         * 依次 web_添加 入队（约 15 秒发完）；音源不一致时先切源等设备应用再开始。 */
        function playAll() {
            if (!props.guard()) return;
            if (playAllBusy.current) { toast('正在加入队列，请稍候', 'info'); return; }
            if (!list || !list.length) { toast('榜单还没加载出来', 'err'); return; }
            playAllBusy.current = true;
            var batch = list.slice(0, 100);
            var devStr = ({ 1: 'qq', 2: 'netease', 3: 'kuwo' })[props.devSrc] || 'netease';
            var start = function () {
                try { R1WS.musicPlay((batch[0].name || '') + ' ' + (batch[0].artist || '')); } catch (e) {}
                for (var i = 1; i < batch.length; i++) {
                    (function (it, delay, idx) {
                        setTimeout(function () {
                            try {
                                R1WS.sendMessage({ what: 65536, arg1: 0, arg2: 1, obj: 'web_添加' + (it.name || '') + ' ' + (it.artist || '') });
                            } catch (e) {}
                            if (idx === batch.length - 1) {
                                playAllBusy.current = false;
                                toast('整榜 ' + batch.length + ' 首已全部加入队列', 'ok', 2600);
                            }
                        }, delay);
                    })(batch[i], i * 150, i);
                }
                toast('正在播放第 1 首，其余 ' + (batch.length - 1) + ' 首依次加入队列（约 ' + Math.ceil(batch.length * 150 / 1000) + ' 秒）', 'ok', 3000);
            };
            if (devStr === src) { start(); return; }
            try { R1WS.setMusicSource(src); } catch (e) {}
            toast('正在切换音源，稍后自动开始…', 'info', 2000);
            setTimeout(start, 1200);
        }

        return h('div', null,
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 } },
                HOT_SOURCES.map(function (s2) {
                    return h(Chip, {
                        key: s2.k, on: src === s2.k && !s2.broken,
                        onClick: function () {
                            if (s2.broken) { toast('酷我榜单接口暂时被限制，敬请期待', 'info', 2200); return; }
                            setSrc(s2.k);
                        }
                    }, s2.l);
                }),
                h('div', { style: { flex: 1 } }),
                h(Button, {
                    variant: 'primary', icon: 'play', size: 'sm',
                    disabled: !(list && list.length),
                    onClick: playAll
                }, '播放整榜')
            ),
            h('div', { style: { marginBottom: 12 } },
                h(Seg, {
                    value: board, onChange: setBoard,
                    items: HOT_BOARDS.map(function (b) { return { key: b.k, label: b.l }; })
                })
            ),
            busy
                ? h('div', { style: { display: 'grid', placeItems: 'center', padding: '30px 0' } }, h(Spinner))
                : err
                    ? h(Empty, { icon: 'alert', title: '榜单暂不可用', desc: err })
                    : (list && list.length
                        ? h('div', { className: 'playlist-scroll' }, list.map(function (it, i) {
                            return h('div', { key: i, className: 'playlist-item', onClick: function () { playSong(it); } },
                                h('div', { className: 'pl-pic' },
                                    it.pic
                                        ? h('img', { src: it.pic, alt: '', onError: function (e) { if (e.target.parentNode) e.target.parentNode.classList.add('no-pic'); e.target.style.display = 'none'; } })
                                        : h(Icon, { name: 'music' })
                                ),
                                h('div', { className: 'pl-idx' }, i + 1),
                                h('div', { className: 'pl-main' },
                                    h('div', { className: 'pl-name' }, it.name || ''),
                                    h('div', { className: 'pl-artist' }, it.artist || '')
                                ),
                                h('div', { className: 'pl-act' },
                                    h('button', {
                                        className: 'btn sm', title: '加入队列',
                                        onClick: function (e) { e.stopPropagation(); addSong(it); }
                                    }, h(Icon, { name: 'plus' }))
                                )
                            );
                        }))
                        : h(Empty, { icon: 'list', title: '暂无数据' })
                    ),
            /* 设备端只播它注册过的歌单：网易云官方榜单本质是歌单，收藏后即可直发 */
            src === 'netease'
                ? h('div', { style: { marginTop: 10, fontSize: 12, color: 'var(--mui-text-secondary)', lineHeight: 1.6 } },
                    '提示：在网易云音乐 App 收藏「热歌榜 / 新歌榜 / 飙升榜」官方歌单后，它们会出现在「更多 → 我的歌单」里，点卡片即可整榜直发（一条指令、秒级完成）。')
                : null
        );
    }

    /* 我的歌单分组列表 */
    function SongGroups(props) {
        if (props.busy) return h('div', { style: { display: 'grid', placeItems: 'center', padding: '30px 0' } }, h(Spinner));
        var data = props.data;
        if (!data) return h(Empty, { icon: 'folder', title: '还没有加载歌单', desc: '点击下方「重新加载」从设备读取' });
        if (data.code !== 200 && data.code !== '200') {
            return h(Empty, { icon: 'alert', title: '获取歌单失败', desc: data.msg || data.login_msg || '请先在设备上登录音乐账号' });
        }
        var d = data.data;
        var list = Array.isArray(d) ? d : (d && Array.isArray(d.data) ? d.data : (d && Array.isArray(d.list) ? d.list : []));
        if (!list.length) return h(Empty, { icon: 'folder', title: '当前音源暂无歌单数据' });

        /* 原版封面卡片网格：分组标题 + 歌单卡片（封面 pic / 标题 / 描述），
         * 点击卡片用 playSongList(歌单id) 整张歌单播放 */
        return h('div', { className: 'song-list-content' }, list.map(function (g, gi) {
            var items = g.list || g.songs || g.items || [];
            return h('div', { key: gi, className: 'song-list-group' },
                h('div', { className: 'song-list-group-title' },
                    h('span', null, g.title || g.name || '默认分组'),
                    h('span', { className: 'song-list-count' }, '[' + items.length + ']')
                ),
                h('div', { className: 'song-list-grid' },
                    items.map(function (item, ii) {
                        var id = item.id || item.list_id || item.songListId;
                        var title = item.title || item.name || '未命名歌单';
                        return h('div', {
                            key: ii, className: 'song-list-card',
                            onClick: function () {
                                if (!id) { toast('歌单 ID 为空', 'err'); return; }
                                props.onPlay(id, title);
                            }
                        },
                            h('div', { className: 'song-list-card-cover' },
                                item.pic
                                    ? h('img', {
                                        src: item.pic,
                                        alt: title,
                                        onError: function (e) {
                                            /* 封面加载失败：隐藏裂图，显示占位图标 */
                                            e.target.style.display = 'none';
                                            if (e.target.parentNode) e.target.parentNode.classList.add('cover-fallback');
                                        }
                                    })
                                    : null
                            ),
                            h('div', { className: 'song-list-card-info' },
                                h('div', { className: 'song-list-card-title' }, title),
                                item.content ? h('div', { className: 'song-list-card-desc' }, item.content) : null
                            )
                        );
                    })
                )
            );
        }));
    }

    /* =====================================================================
     * 屏幕
     * =================================================================== */
    var DEFAULT_DW = 720, DEFAULT_DH = 480;

    function ScreenPanel() {
        var st = C.useStore();
        var _frame = useState(''), frame = _frame[0], setFrame = _frame[1];
        var _streaming = useState(false), streaming = _streaming[0], setStreaming = _streaming[1];
        var _fps = useState(0), fps = _fps[0], setFps = _fps[1];
        var _text = useState(''), text = _text[0], setText = _text[1];
        var _ttsText = useState(''), ttsText = _ttsText[0], setTtsText = _ttsText[1];
        var _size = useState({ w: DEFAULT_DW, h: DEFAULT_DH }), size = _size[0], setSize = _size[1];
        var _imgBad = useState(false), imgBad = _imgBad[0], setImgBad = _imgBad[1];
        var imgRef = useRef(null);
        var dragRef = useRef({ down: false });
        var statRef = useRef({ frames: 0, last: Date.now(), smooth: 0 });
        var lastUrlRef = useRef('');
        var _fluid = useState(false), fluid = _fluid[0], setFluid = _fluid[1];

        /* 帧格式归一化（移植原版 onFrame 逻辑）：
         * 设备发来的帧可能是完整 dataURL、裸 base64 或二进制 Blob，
         * 直接把裸 base64 当 img src 会显示裂图（就是"屏幕不显示"的原因）。 */
        function normalizeFrame(payload) {
            if (!payload) return '';
            if (typeof payload === 'string') {
                var s = payload.trim();
                /* 完整 dataURL / blob / http 地址 → 直接可用 */
                if (/^(data:image\/[a-zA-Z0-9+.-]+;base64,|blob:|https?:\/\/)/.test(s)) return s;
                /* 裸 base64（长度足够且只含 base64 字符）→ 补 jpeg 前缀 */
                if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 100) {
                    return 'data:image/jpeg;base64,' + s.replace(/\s+/g, '');
                }
                return '';
            }
            /* 二进制：Blob / ArrayBuffer / Uint8Array → ObjectURL */
            try {
                var blob = (typeof Blob !== 'undefined' && payload instanceof Blob) ? payload : new Blob([payload]);
                if (!blob.size) return '';
                return (typeof URL !== 'undefined' && URL.createObjectURL) ? URL.createObjectURL(blob) : '';
            } catch (e) { return ''; }
        }

        C.useR1Event('screen_frame', function (data) {
            var url = normalizeFrame(data);
            if (!url) return;
            /* 释放上一个 blob 帧，避免内存泄漏 */
            if (lastUrlRef.current && lastUrlRef.current.indexOf('blob:') === 0 && lastUrlRef.current !== url) {
                try { URL.revokeObjectURL(lastUrlRef.current); } catch (e) {}
            }
            lastUrlRef.current = url;
            setFrame(url);
            setImgBad(false);
            var s = statRef.current;
            s.frames++;
            var now = Date.now();
            if (now - s.last >= 1000) {
                var cur = Math.round(s.frames * 1000 / (now - s.last));
                /* 指数平滑：FPS 数字不再 1↔4 乱跳，看起来更接近真实感受 */
                s.smooth = s.smooth ? Math.round(s.smooth * 0.55 + cur * 0.45) : cur;
                setFps(s.smooth);
                s.frames = 0; s.last = now;
            }
        });
        C.useR1Event('screen_size', function (d) {
            try {
                var str = typeof d === 'string' ? d : JSON.stringify(d);
                var m = str.match(/(\d{2,5})\s*[xX]\s*(\d{2,5})/);
                if (m) setSize({ w: parseInt(m[1], 10), h: parseInt(m[2], 10) });
            } catch (e) {}
        });

        useEffect(function () {
            if (!st.connected) return;
            try { R1WS.startScreenStream(100); setStreaming(true); } catch (e) {}
            return function () {
                try { R1WS.stopScreenStream(); } catch (e) {}
                /* 离开页面释放最后一次 blob 帧 */
                if (lastUrlRef.current && lastUrlRef.current.indexOf('blob:') === 0) {
                    try { URL.revokeObjectURL(lastUrlRef.current); } catch (e) {}
                    lastUrlRef.current = '';
                }
            };
        }, [st.connected]);

        /* 方向键/回车/空格 → 设备按键（输入框聚焦时不拦截） */
        useEffect(function () {
            function onKey(e) {
                var tag = (e.target && e.target.tagName) || '';
                if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
                var map = { ArrowUp: 19, ArrowDown: 20, ArrowLeft: 21, ArrowRight: 22, Enter: 23, ' ': 23, Backspace: 67, Escape: 4 };
                var code = map[e.key];
                if (code) { e.preventDefault(); try { R1WS.sendKeyevent(code); } catch (err) {} }
            }
            window.addEventListener('keydown', onKey);
            return function () { window.removeEventListener('keydown', onKey); };
        }, []);

        function toDevice(cx, cy) {
            var el = imgRef.current;
            if (!el) return { x: 0, y: 0 };
            var r = el.getBoundingClientRect();
            if (!r.width || !r.height) return { x: 0, y: 0 };
            return { x: Math.round((cx - r.left) / r.width * size.w), y: Math.round((cy - r.top) / r.height * size.h) };
        }
        function onPointerDown(e) {
            e.preventDefault();
            var p = toDevice(e.clientX, e.clientY);
            dragRef.current = { down: true, sx: p.x, sy: p.y, dx: p.x, dy: p.y, t0: Date.now(), moved: false };
            try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (err) {}
        }
        function onPointerMove(e) {
            var d = dragRef.current;
            if (!d.down) return;
            var p = toDevice(e.clientX, e.clientY);
            if (Math.abs(p.x - d.sx) + Math.abs(p.y - d.sy) > 4) d.moved = true;
            d.dx = p.x; d.dy = p.y;
        }
        function onPointerUp() {
            var d = dragRef.current;
            if (!d.down) return;
            d.down = false;
            var dur = Date.now() - d.t0;
            try {
                if (d.moved) R1WS.sendInput('swipe ' + d.sx + ' ' + d.sy + ' ' + d.dx + ' ' + d.dy + ' ' + Math.max(80, dur));
                else R1WS.sendInput('tap ' + d.sx + ' ' + d.sy);
            } catch (e) {}
        }
        function sendText() {
            var v = (text || '').trim();
            if (!v) { toast('请输入要发送的文本', 'err'); return; }
            try { R1WS.sendInput('text ' + v); } catch (e) {}
            setText(''); toast('已发送文本', 'ok');
        }
        function sendTts() {
            var v = (ttsText || '').trim();
            if (!v) { toast('请输入要播报的内容', 'err'); return; }
            try { R1WS.tts(v); } catch (e) {}
            setTtsText(''); toast('已发送语音播报', 'ok');
        }
        function uploadBg(e) {
            var file = e.target.files && e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) { toast('图片不能超过 5MB', 'err'); return; }
            var reader = new FileReader();
            reader.onload = function (ev) {
                try { R1WS.setBackground(ev.target.result); toast('背景已上传', 'ok'); } catch (err) {}
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        }
        function toggleStream() {
            if (!st.connected) { toast('请先连接设备', 'err'); return; }
            try {
                if (streaming) { R1WS.stopScreenStream(); setStreaming(false); }
                else { R1WS.startScreenStream(100); setStreaming(true); }
            } catch (e) {}
        }

        /* 流畅模式（实验）：降低设备分辨率换更高的推流帧率
         * 设备每帧截图耗时与小图面积成正比，480x320 只有 720x480 的 44% 像素量。
         * 注意会改变设备本体的显示分辨率，开关两侧都发 wm size 命令并重启推流。 */
        function restartStreamAfter(ms) {
            try { R1WS.stopScreenStream(); } catch (e) {}
            setTimeout(function () {
                try { R1WS.startScreenStream(100); setStreaming(true); } catch (e) {}
            }, ms);
        }
        function toggleFluid() {
            if (!st.connected) { toast('请先连接设备', 'err'); return; }
            if (!fluid) {
                try { R1WS.executeShell('wm size 480x320'); } catch (e) {}
                setSize({ w: 480, h: 320 });
                setFluid(true);
                restartStreamAfter(1200);
                toast('已切换流畅模式：设备分辨率降为 480×320', 'info', 2600);
            } else {
                try { R1WS.executeShell('wm size 720x480'); } catch (e) {}
                setSize({ w: 720, h: 480 });
                setFluid(false);
                restartStreamAfter(1200);
                toast('已恢复标准分辨率 720×480', 'ok');
            }
        }

        var KEYS = [
            { k: '返回', c: 4 }, { k: '主页', c: 3 }, { k: '菜单', c: 82 }, { k: '电源', c: 26 },
            { k: '上', c: 19 }, { k: '下', c: 20 }, { k: '左', c: 21 }, { k: '右', c: 22 },
            { k: '音量+', c: 24 }, { k: '音量-', c: 25 }, { k: '退格', c: 67 }, { k: 'OK', c: 23 }
        ];

        if (!st.connected) {
            return h('div', { className: 'page-inner narrow' },
                h(PageHead, { title: '屏幕', desc: '远程查看并操控音箱屏幕' }),
                h('div', { className: 'card pad-lg' },
                    h(Empty, {
                        icon: 'monitor', title: '尚未连接设备',
                        desc: '连接后可实时预览设备屏幕，并用鼠标、触摸、键盘远程操控。',
                        action: h(Button, { variant: 'primary', icon: 'link', onClick: function () { C.openSheet('connect'); } }, '连接设备')
                    })
                )
            );
        }

        return h('div', { className: 'page-inner' },
            h(PageHead, {
                title: '屏幕',
                desc: size.w + ' × ' + size.h + (streaming ? ' · 推流中 ' + fps + ' FPS' : ' · 推流已停'),
                actions: [
                    h(Chip, { key: 'st', on: streaming, icon: 'monitor', onClick: toggleStream }, streaming ? '停止推流' : '开始推流'),
                    h(Chip, { key: 'cap', icon: 'camera', onClick: function () { try { R1WS.requestScreencap(); } catch (e) {} } }, '截屏'),
                    h(Chip, { key: 'rs', icon: 'refresh', onClick: function () { try { R1WS.resetScreenResolution(); toast('已请求重置分辨率为 720x480', 'ok'); } catch (e) {} } }, '重置分辨率'),
                    h(Chip, {
                        key: 'fluid', icon: 'signal', on: fluid, title: '降低设备分辨率换取更高帧率（实验）',
                        onClick: toggleFluid
                    }, fluid ? '流畅模式开' : '流畅模式')
                ]
            }),
            h('div', { className: 'section' },
                h('div', { className: 'stage' },
                    h('div', { className: 'stage-hud' },
                        h(Pill, { tone: streaming ? 'ok' : 'err', dot: true, pulse: streaming }, streaming ? '实时' : '已停止'),
                        fps ? h(Pill, { tone: 'accent' }, fps + ' FPS') : null
                    ),
                    frame
                        ? h('img', {
                            src: frame, alt: '设备屏幕', ref: imgRef, draggable: false,
                            onPointerDown: onPointerDown, onPointerMove: onPointerMove,
                            onPointerUp: onPointerUp, onPointerCancel: onPointerUp,
                            onLoad: function () { setImgBad(false); },
                            onError: function () {
                                /* 帧解码失败：清掉裂图显示提示，等待设备发下一帧 */
                                setImgBad(true);
                                setFrame('');
                            }
                        })
                        : h('div', { className: 'placeholder' },
                            h(Icon, { name: 'monitor' }),
                            h('div', null, imgBad ? '画面解码失败，正在等待下一帧…' : (streaming ? '正在等待设备画面…' : '推流未开启')),
                            h(Button, { size: 'sm', variant: 'soft', onClick: toggleStream }, streaming ? '重新推流' : '开始推流')
                        )
                )
            ),
            h('div', { className: 'grid cols-2 section' },
                h(Card, { title: '遥控按键', icon: 'keyboard' },
                    h('div', { className: 'keypad' }, KEYS.map(function (key) {
                        return h(Button, {
                            key: key.c, size: 'sm',
                            onClick: function () { try { R1WS.sendKeyevent(key.c); } catch (e) {} }
                        }, key.k);
                    }))
                ),
                h(Card, { title: '文本 / 语音', icon: 'mic' },
                    h('div', { style: { display: 'flex', gap: '8px', marginBottom: '10px' } },
                        h(Input, {
                            value: text, onChange: setText, placeholder: '发送到设备输入框',
                            onKeyDown: function (e) { if (e.key === 'Enter') sendText(); }
                        }),
                        h(Button, { onClick: sendText }, '发送')
                    ),
                    h('div', { style: { display: 'flex', gap: '8px' } },
                        h(Input, {
                            value: ttsText, onChange: setTtsText, placeholder: '让设备朗读这段文字',
                            onKeyDown: function (e) { if (e.key === 'Enter') sendTts(); }
                        }),
                        h(Button, { variant: 'primary', onClick: sendTts }, '播报')
                    ),
                    h('div', { className: 'divider' }),
                    h('label', { className: 'btn ghost block', style: { cursor: 'pointer' } },
                        h(Icon, { name: 'image' }), '上传设备背景图',
                        h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: uploadBg })
                    ),
                    h('div', { className: 'hint', style: { marginTop: '8px' } }, '支持 5MB 以内图片，上传后立即应用到设备')
                )
            )
        );
    }

    /* =====================================================================
     * 氛围灯（原版协议：模式 0/1/2/3/4，亮度 1-200，颜色下发整数）
     * =================================================================== */
    function LightSheetBody() {
        var info = C.useStore().deviceInfo || {};
        var _on = useState(false), on = _on[0], setOn = _on[1];
        var _mode = useState(0), mode = _mode[0], setMode = _mode[1];
        var _bright = useState(100), bright = _bright[0], setBright = _bright[1];
        var _speed = useState(4), speed = _speed[0], setSpeed = _speed[1];
        var _color = useState('#ffffff'), color = _color[0], setColor = _color[1];

        useEffect(function () { if (info.music_light_enable != null) setOn(!!info.music_light_enable); }, [info.music_light_enable]);
        useEffect(function () { if (info.music_light_mode != null) setMode(info.music_light_mode); }, [info.music_light_mode]);

        /* 改灯效后设备约 2 秒才回写状态，延时重新拉取 */
        function refreshLater() {
            setTimeout(function () { try { R1WS.requestServiceInfo(); } catch (e) {} }, 2500);
        }

        var MODES = [
            { mode: 0, label: '官方效果' }, { mode: 2, label: '七彩效果' },
            { mode: 1, label: '七彩旋转' }, { mode: 3, label: '七彩旋转1' }, { mode: 4, label: '单色效果' }
        ];

        return h('div', null,
            h('div', { className: 'rows' },
                h('div', { className: 'row' },
                    h('div', { className: 'row-ico accent' }, h(Icon, { name: 'lightbulb' })),
                    h('div', { className: 'row-main' },
                        h('div', { className: 'row-title' }, '氛围灯'),
                        h('div', { className: 'row-sub' }, on ? '已开启' : '已关闭')
                    ),
                    h('div', { className: 'row-end' }, h(R1UI.Switch, {
                        on: on,
                        onChange: function (v) { setOn(v); try { R1WS.setAtmosphereLight(v); refreshLater(); } catch (e) {} }
                    }))
                )
            ),
            h('div', { className: 'divider' }),
            h('div', { className: 'field', style: { marginBottom: '16px' } },
                h('label', null, '氛围效果'),
                h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                    MODES.map(function (m) {
                        return h(Chip, {
                            key: m.mode, on: mode === m.mode,
                            onClick: function () { setMode(m.mode); try { R1WS.setLightMode(m.mode); refreshLater(); } catch (e) {} }
                        }, m.label);
                    })
                )
            ),
            h('div', { className: 'field', style: { marginBottom: '16px' } },
                h('label', null, '亮度'),
                h(Slider, {
                    value: bright, min: 1, max: 200, label: '亮度',
                    onChange: setBright,
                    onCommit: function (v) { try { R1WS.setLightBrightness(v); } catch (e) {} }
                })
            ),
            (mode === 0 || mode === 1 || mode === 3)
                ? h('div', { className: 'field', style: { marginBottom: '16px' } },
                    h('label', null, '颜色渐变速度'),
                    h(Slider, {
                        value: speed, min: 0, max: 100, label: '渐变速度',
                        onChange: setSpeed,
                        onCommit: function (v) { try { R1WS.setLightColorSpeed(v); } catch (e) {} }
                    })
                )
                : null,
            mode === 4
                ? h('div', { className: 'field' },
                    h('label', null, '灯光颜色'),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                        h('input', {
                            type: 'color', value: color,
                            style: {
                                width: '52px', height: '36px', padding: '3px',
                                background: 'transparent', border: '1px solid var(--mui-divider)',
                                borderRadius: '8px', cursor: 'pointer'
                            },
                            onChange: function (e) {
                                var v = e.target.value;
                                setColor(v);
                                try { R1WS.setLightColor(parseInt(v.substr(1), 16)); } catch (err) {}
                            }
                        }),
                        h('span', { className: 'mono', style: { color: 'var(--mui-text-secondary)' } }, color)
                    )
                )
                : null
        );
    }

    P.MusicPanel = MusicPanel;
    P.ScreenPanel = ScreenPanel;
    P.LightSheet = LightSheetBody;

    /* 发音人弹层（设备页顶栏入口也会用到） */
    P.TtsSpeakerSheet = function TtsSpeakerSheet() {
        var tts = (C.useStore().deviceInfo || {}).ttsModelType;
        return h('div', null,
            h('div', { className: 'hint', style: { marginBottom: '12px' } }, '选择设备播报文本时使用的发音人，切换后立即生效。'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
                TTS_SPEAKERS.map(function (s) {
                    return h(Chip, {
                        key: s[0], on: tts === s[0],
                        onClick: function () { try { R1WS.setTtsSpeaker(s[0]); toast('已切换为 ' + s[1], 'ok'); } catch (e) {} }
                    }, s[1]);
                })
            )
        );
    };
})(window);
