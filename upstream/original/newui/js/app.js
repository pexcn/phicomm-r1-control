/**
 * R1 应用外壳：导航 / 顶栏 / 弹层路由 / 迷你播放条 / 启动流程
 * 页面实现分别在 panel-music.js 与 panel-device.js（挂载到 window.R1Panels）。
 */
(function (global) {
    'use strict';

    var h = R1UI.h, Icon = R1UI.Icon, Button = R1UI.Button, IconBtn = R1UI.IconBtn;
    var QQAvatar = R1UI.QQAvatar;
    var Pill = R1UI.Pill, Chip = R1UI.Chip, Modal = R1UI.Modal, Empty = R1UI.Empty;
    var Input = R1UI.Input, Row = R1UI.Row, Spinner = R1UI.Spinner;
    var ToastHost = R1UI.ToastHost, ConfirmHost = R1UI.ConfirmHost;
    var useState = React.useState, useEffect = React.useEffect;
    var C = R1Core;
    var P = R1Panels || (global.R1Panels = {});

    var NAV = [
        { key: 'music', label: '音乐', icon: 'music' },
        { key: 'screen', label: '屏幕', icon: 'monitor' },
        { key: 'sound', label: '音效', icon: 'sliders' },
        { key: 'bluetooth', label: '蓝牙', icon: 'bluetooth' },
        { key: 'device', label: '设备', icon: 'cpu' }
    ];

    var TITLES = {
        music: '音乐', screen: '屏幕', sound: '音效',
        bluetooth: '蓝牙', device: '设备'
    };

    /* 弹层注册表：type → { 标题, 内容组件, 尺寸, 是否居中 } */
    function sheetConfig(type) {
        var Pn = R1Panels || {};
        var map = {
            connect: { title: '连接 R1 音箱', sub: '同一局域网内输入 IP，或自动扫描发现', Comp: ConnectSheet, center: true },
            source: { title: '音乐源', sub: '切换点播与歌单使用的音源', Comp: Pn.SourceSheet, center: true },
            light: { title: '氛围灯设置', sub: '效果 / 亮度 / 渐变速度 / 颜色', Comp: Pn.LightSheet, center: true },
            tts: { title: '选择发音人', sub: '设备朗读文本时使用的声音', Comp: Pn.TtsSpeakerSheet, center: true },
            login: { title: '扫码登录', sub: '登录音乐账号后可同步歌单与收藏', Comp: Pn.LoginSheet, size: 'wide' },
            local: { title: '本地音乐', sub: '设备本地存储的音频文件', Comp: Pn.LocalMusicSheet, size: 'wide' },
            memo: { title: '备忘与闹钟', sub: '管理设备上的提醒事项', Comp: Pn.MemoSheet, size: 'wide' },
            voice: { title: '语音报时', sub: '整点报时与语音设置', Comp: Pn.VoiceSheet },
            restart: { title: '自动重启', sub: '设备定时自检与重启策略', Comp: Pn.RestartSheet },
            advanced: { title: '高级工具', sub: 'DLNA / mDNS / ADB / 配网 / 小爱', Comp: Pn.AdvancedSheet, size: 'wide' },
            adb: { title: 'ADB 控制台', sub: '在设备上执行 Shell 命令', Comp: Pn.AdbSheet, size: 'wide' },
            settings: { title: '设置', sub: '外观与使用偏好', Comp: Pn.SettingsSheet, center: true },
            about: { title: '关于', sub: '版本信息', Comp: Pn.AboutSheet, center: true }
        };
        return map[type] || null;
    }

    /* =====================================================================
     * 连接弹层
     * =================================================================== */
    function ConnectSheet() {
        var st = C.useStore();
        var _ip = useState(''), ip = _ip[0], setIp = _ip[1];
        var scan = st.scan || { running: false, devices: [], scanned: 0, total: 0 };
        var isHttps = location.protocol === 'https:';
        var isApple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent || '');

        function doConnect(target) {
            var v = String(target != null ? target : ip).trim();
            if (!v) { C.toast('请输入设备 IP', 'err'); return; }
            C.connectTo(v);
        }

        return h('div', null,
            h('div', { style: { display: 'flex', gap: '10px', marginBottom: '14px' } },
                h(Input, {
                    value: ip, onChange: setIp, placeholder: '例如 192.168.2.97',
                    inputMode: 'decimal',
                    onKeyDown: function (e) { if (e.key === 'Enter') doConnect(); }
                }),
                h(Button, { variant: 'primary', loading: st.connecting && !st.connected, onClick: function () { doConnect(); } }, '连接')
            ),

            st.connected
                ? h('div', { className: 'rows', style: { marginBottom: '14px' } },
                    h(Row, {
                        icon: 'wifi', accent: true,
                        title: '已连接 ' + (R1WS.getConnectIp ? R1WS.getConnectIp() : st.lastIp),
                        sub: '控制页面已就绪',
                        end: h(Button, { size: 'sm', variant: 'ghost', onClick: function () { C.disconnect(); } }, '断开')
                    })
                )
                : null,

            /* 局域网扫描 */
            h('div', { style: { marginBottom: '14px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
                    h(Button, {
                        size: 'sm', icon: 'signal', variant: scan.running ? 'soft' : 'ghost',
                        onClick: function () { scan.running ? C.stopScan() : C.startScan(); }
                    }, scan.running ? '停止扫描' : '扫描局域网设备'),
                    scan.running
                        ? h('span', { className: 'hint' }, '已探测 ' + scan.scanned + (scan.total ? ' / ' + scan.total : ''))
                        : null
                ),
                scan.running
                    ? h('div', { className: 'progress-outer', style: { marginBottom: '10px' } },
                        h('div', { className: 'progress-inner', style: { width: (scan.total ? Math.round(scan.scanned / scan.total * 100) : 8) + '%' } }))
                    : null,
                scan.devices.length
                    ? h('div', { className: 'rows' }, scan.devices.map(function (d, i) {
                        return h(Row, {
                            key: i, icon: 'wifi', accent: !!d.isR1,
                            title: d.name || '未知设备',
                            sub: d.ip + (d.port ? ':' + d.port : '') + (d.model ? ' · ' + d.model : ''),
                            onClick: function () { doConnect(d.ip); },
                            end: h(Icon, { name: 'chevronR' })
                        });
                    }))
                    : null
            ),

            /* 连接历史 */
            st.history && st.history.length
                ? h('div', null,
                    h('div', { className: 'card-title', style: { marginBottom: '8px' } }, '最近连接'),
                    h('div', { className: 'rows' }, st.history.map(function (x) {
                        return h(Row, {
                            key: x.ip, icon: 'clock', title: x.ip,
                            sub: new Date(x.time).toLocaleString(),
                            onClick: function () { doConnect(x.ip); },
                            end: h(Icon, { name: 'chevronR' })
                        });
                    }))
                )
                : h('div', { className: 'hint' },
                    '不知道 IP？可以先点上面的「扫描局域网设备」，或查看路由器后台的设备列表。'
                ),

            isHttps && isApple
                ? h('div', { className: 'divider' })
                : null,
            isHttps && isApple
                ? h('div', { className: 'hint' },
                    '当前是 HTTPS，iPhone/iPad 上可能无法直连设备，建议切换到 HTTP。 ',
                    h('button', {
                        style: { color: 'var(--accent)', fontWeight: 600 },
                        onClick: function () {
                            try { sessionStorage.setItem('r1_protocol_choice', 'http'); } catch (e) {}
                            location.replace(location.href.replace(/^https:/, 'http:'));
                        }
                    }, '切换到 HTTP')
                )
                : null
        );
    }

    /* =====================================================================
     * 迷你播放条（手机/小平板、非音乐页时显示）
     * =================================================================== */
    function MiniPlayer() {
        var st = C.useStore();
        var _s = useState({ title: '', artist: '', cover: '', playing: false, progress: 0, duration: 0 });
        var s = _s[0], setS = _s[1];

        C.useR1Event('music_info', function (info) {
            if (!info) return;
            setS(function (prev) {
                return {
                    title: info.title || prev.title,
                    artist: info.artist || prev.artist,
                    cover: info.cover || info.albumUrl || prev.cover,
                    playing: info.playing !== undefined ? !!info.playing : (info.play_state !== undefined ? !!info.play_state : prev.playing),
                    progress: info.position !== undefined ? info.position / 1000
                        : (info.progress !== undefined ? (info.progress > 10000 ? info.progress / 1000 : info.progress) : prev.progress),
                    duration: info.duration !== undefined ? (info.duration > 10000 ? Math.floor(info.duration / 1000) : info.duration) : prev.duration
                };
            });
        });

        if (!st.connected || !s.title || st.route === 'music') return null;

        var pct = s.duration ? Math.min(100, s.progress / s.duration * 100) : 0;

        return h('div', { className: 'mini' },
            h('div', { className: 'mini-art', style: s.cover ? { backgroundImage: 'url(' + s.cover + ')' } : null },
                s.cover ? null : h(Icon, { name: 'music' })
            ),
            h('div', { className: 'mini-main', onClick: function () { C.goRoute('music'); } },
                h('div', { className: 'mini-title' }, s.title),
                h('div', { className: 'mini-artist' }, s.artist || 'R1 音箱')
            ),
            h('button', {
                className: 'btn icon sm ghost', title: '上一首',
                onClick: function (e) {
                    e.stopPropagation();
                    try { R1WS.musicControl('prev'); } catch (err) {}
                }
            }, h(Icon, { name: 'prev' })),
            h('button', {
                className: 'btn icon sm primary', title: s.playing ? '暂停' : '播放',
                onClick: function (e) {
                    e.stopPropagation();
                    try { s.playing ? R1WS.musicPause() : R1WS.musicResume(); } catch (err) {}
                    setS(Object.assign({}, s, { playing: !s.playing }));
                }
            }, h(Icon, { name: s.playing ? 'pause' : 'play' })),
            h('button', {
                className: 'btn icon sm ghost', title: '下一首',
                onClick: function (e) {
                    e.stopPropagation();
                    try { R1WS.musicControl('next'); } catch (err) {}
                }
            }, h(Icon, { name: 'next' })),
            h('div', { className: 'mini-line', style: { width: pct + '%' } })
        );
    }

    /* =====================================================================
     * 应用外壳
     * =================================================================== */
    function App() {
        var st = C.useStore();

        useEffect(function () { C.boot(); }, []);

        /* 没有历史 IP：直接弹连接；有历史但 7 秒没连上：也弹连接 */
        useEffect(function () {
            if (C.getState().lastIp) {
                var t = setTimeout(function () {
                    if (!C.getState().connected) C.openSheet('connect');
                }, 7000);
                return function () { clearTimeout(t); };
            }
            var t2 = setTimeout(function () {
                if (!C.getState().connected) C.openSheet('connect');
            }, 600);
            return function () { clearTimeout(t2); };
        }, []);

        function connPill() {
            if (st.connected) return h(Pill, { tone: 'ok', dot: true }, R1WS.getConnectIp ? R1WS.getConnectIp() : '已连接');
            if (st.connecting) return h(Pill, { tone: 'warn', dot: true, pulse: true }, '连接中…');
            return h(Pill, { tone: 'err', dot: true }, '未连接');
        }

        function pageContent() {
            var comp = {
                music: P.MusicPanel, screen: P.ScreenPanel, sound: P.SoundPanel,
                bluetooth: P.BluetoothPanel, device: P.DevicePanel
            }[st.route];
            if (comp) return h(comp);
            return h('div', { className: 'page-inner narrow' },
                h('div', { className: 'card pad-lg' },
                    h(Empty, {
                        icon: 'sparkle', title: '页面正在加载',
                        desc: '如果长时间没有出现，请刷新页面重试。',
                        action: h(Button, { variant: 'primary', onClick: function () { location.reload(); } }, '刷新')
                    })
                )
            );
        }

        var sheet = st.sheet;
        var cfg = sheet ? sheetConfig(sheet.type) : null;

        return h(React.Fragment, null,
            /* ---- 网页自定义背景层（设置 → 高级工具 → 自定义背景） ---- */
            st.customBg ? h('div', { className: 'app-bg-layer' },
                h('div', { className: 'app-bg-image', style: { backgroundImage: 'url(' + st.customBg + ')' } }),
                h('div', { className: 'app-bg-overlay' })
            ) : null,

            h('div', { className: 'app' + (st.customBg ? ' app-layout-bg' : '') },

            /* ---- 左侧导航（≥900px） ---- */
            h('nav', { className: 'rail' },
                h('div', { className: 'rail-logo' }, h(QQAvatar, { fallback: 'R1' })),
                h('div', { className: 'rail-nav' }, NAV.map(function (n) {
                    return h('button', {
                        key: n.key,
                        className: 'rail-item' + (st.route === n.key ? ' on' : ''),
                        onClick: function () { C.goRoute(n.key); },
                        title: n.label
                    },
                        h(Icon, { name: n.icon }),
                        h('span', { className: 'lbl' }, n.label)
                    );
                })),
                h('div', { className: 'rail-foot' },
                    h('button', {
                        className: 'rail-item' + (sheet && sheet.type === 'settings' ? ' on' : ''),
                        onClick: function () { C.openSheet('settings'); }, title: '设置'
                    }, h(Icon, { name: 'settings' }), h('span', { className: 'lbl' }, '设置'))
                )
            ),

            /* ---- 主区 ---- */
            h('div', { className: 'main' },
                h('header', { className: 'topbar' },
                    h('div', { style: { minWidth: 0 } },
                        h('div', { className: 'topbar-title' }, TITLES[st.route] || 'R1')
                    ),
                    h('div', { className: 'topbar-spacer' }),
                    h('div', { className: 'topbar-actions' },
                        st.connected
                            ? null
                            : h(Button, { size: 'sm', variant: 'soft', icon: 'link', onClick: function () { C.openSheet('connect'); } }, '连接'),
                        connPill(),
                        h(IconBtn, { icon: 'settings', title: '设置', onClick: function () { C.openSheet('settings'); } })
                    )
                ),
                /* 音乐页用 page-music：容器锁定，播放器自己管高度（见 player-fix.css） */
                h('main', {
                    className: 'page' + (st.route === 'music' ? ' page-music' : ''),
                    key: st.route
                }, pageContent())
            ),

            h(MiniPlayer),

            /* ---- 底部标签（<900px） ---- */
            h('nav', { className: 'tabbar' }, NAV.map(function (n) {
                return h('button', {
                    key: n.key,
                    className: 'tabbar-item' + (st.route === n.key ? ' on' : ''),
                    onClick: function () { C.goRoute(n.key); }
                }, h(Icon, { name: n.icon }), h('span', { className: 'lbl' }, n.label));
            })),

            /* ---- 弹层 ---- */
            cfg
                ? h(Modal, {
                    open: true,
                    title: cfg.title, sub: cfg.sub,
                    size: cfg.size, center: cfg.center,
                    onClose: C.closeSheet
                }, cfg.Comp ? h(cfg.Comp, { payload: sheet.payload }) : h(Empty, {
                    icon: 'sparkle', title: '模块加载中', desc: '该功能模块未成功加载，请刷新页面。'
                }))
                : null,

            h(ToastHost),
            h(ConfirmHost)
            )
        );
    }

    global.R1App = App;

    if (document.getElementById('root')) {
        ReactDOM.createRoot(document.getElementById('root')).render(h(App));
    }
})(window);
