# 作者线上版本分析与 next 迁移建议

> 状态更新：后续已按用户要求导入公开前端。本文保留导入前的分析时点，
> 当前合并范围与限制见 [合并记录](upstream-merge-2026-11-10.md)。

分析日期：2026-11-10（台北时间）。
基线：`68f293ad3b3e714e1ab1a4a96caac656918e762a`。
分析开始时 `next` 为 `616c03e3ce288846f1cb3b039001f390b6334a52`，
仅在基线上增加了 `AGENTS.md`。

## 结论

可以从公开发布的网页资源中确认大量更新，并据此在 `next` 分批实现。
这不是有共同 Git 历史的上游分支，无法直接执行 Git merge 获取闭源后的提交。
本次交付是可追溯的差异分析和迁移规格，尚未将线上业务代码合入 `next`。

目前线上同时存在两套控制界面：

- [根页面](https://r1.wxfsq.com/)：延续原控制面板，主脚本已重构，网页版本为 `2863`。
- [新 UI](https://r1.wxfsq.com/newui/)：独立的 React 界面和通信层，包含音乐、屏幕、音效、蓝牙、设备及设置入口。

更新覆盖前端、音箱服务、服务器 API 和 Android 宿主，不能仅替换一个 JS 文件就获得全部功能。
推荐先迁移使用现有设备协议即可实现的前端改进，再增加需要新版设备支持的能力。

## 范围与证据

入口为用户提供的 `https://r1.wxfsq.com/`，所有网络读取均来自公开页面、
页面引用及基线中已有的资源路径。分析包含公开静态资源、正常加载过程、
无效 IP 的界面反馈，以及两次公开搜歌 API 的只读请求。

使用的工具：REA 6.8.0、Craft Anything 0.6.0、Chromium / Playwright、
Babel AST 和 Prettier 3.9.10。REA、Craft Anything 的完整 Evidence 保存在单独分析包中。
仓库只保存报告、协议摘要和资源指纹，不提交线上业务脚本副本。

证据分为：

- **运行观察**：本次浏览器或 HTTP 请求实际得到的结果。
- **代码确认**：已取得的发布文件中存在对应调用、控件或状态逻辑，尚不等于真机可用。
- **作者声明**：脚本内 CHANGELOG 的说明，未充分验证的部分单独标记。

资源和 SHA-256 见 [资源清单](upstream-assets-2026-11-10.json)。
下文根页面的函数名和行号对应分析包内 `online.pretty.js`；
该文件由实际加载的 `r1_control.min.js` 格式化产生，不是作者原始工程文件。

## 发布结构发生了什么变化

| 资源 | 开源基线 | 当前公开发布 | 判断 |
| --- | --- | --- | --- |
| 主程序 | `js/r1_control.js`，280064 字节 | `js/r1_control.min.js`，317828 字节 | 主程序重构；旧路径本次返回 404 |
| 样式 | `new_r1_control.css`，8371 字节 | 同路径，42703 字节 | 大量界面和弹窗样式变化 |
| 加载器 | `refresh.js`，`web_ver=2687` | 同路径，`web_ver=2863` | 协议跟随页面，集中加载 CSS 与新主脚本 |
| 设备入口 | `new_r1_control.js`、`js/connect.js` | 两个路径仍可访问，内容均已变化 | HTTPS 资源 URL、加载回退和初始界面调整 |
| 配网 | 小型 HTML + `config_wifi/main.js` | 大部分逻辑放进 `config_wifi/index.html` | `main.js` 仍可下载，但本次配网页未加载它 |
| 新控制界面 | 不存在 `newui/` | React 18.2.0、本地 vendor、独立 CSS/JS | 与根页面并行存在，不能假定两套界面功能完全一致 |
| 扩展页面 | 基线无对应文件 | `dlna.html`、`mdns.html`、`device_scan.html` | 页面可打开，扫描实现依赖宿主能力 |
| PWA | 无 manifest / SW | 存在 `manifest.json`、`sw.js` | 存在配置不代表离线功能已经工作 |

根页面加载链已实际观察到：
`index.html → refresh.js → new_r1_control.css + js/r1_control.min.js → jQuery`。
加载过程中还请求百度统计脚本和 `/ip`。
这些访问不能推导出作者服务器的实现、数据库结构或完整接口列表。

新 UI 加载的是 `newui/js/ws.js`、`ui.js`、`core.js`、`panel-music.js`、
`panel-device.js`、`app.js`，并由本地 React / ReactDOM 驱动。
业务按通信、共享状态、组件和面板分开；图标与部分依赖仍有 CDN 访问。

## 已确认的重要更新

以下差异以基线代码与当前发布文件核对，日期来自作者 CHANGELOG，
表示作者标注的日期，不是本次恢复出的 Git 提交日期。

| 领域 | 相对基线的更新 | 依据与依赖 | 迁移建议 |
| --- | --- | --- | --- |
| 加载和连接 | 根页面取消强制 HTTPS 降级，资源 URL 跟随协议；增加 `local-network-access` 检测、提示、可取消自动连接 | `index.html`、`initLocalNetworkPermission`、`requestAndConnect`、`renderConnectPage`；浏览器实际先提示本地网络权限，再显示无效 IP 提示 | 优先迁移；需要单独验证 Chromium、Safari 和普通 HTTP |
| 状态组织 | 大量全局变量收拢到 `state`、`ui`、`timers`，统一弹窗及连接清理 | 根脚本开头、`cleanupSpeakerConnection`、`showConnectionNotice` 等 | 按功能引入必要结构；不要把整体重构当成简单修复补丁 |
| 播放界面 | 图标按钮、全屏歌词、播放列表弹窗、封面背景渐变、歌词高度适配 | `buildMusicPanel`、`createFullscreenLrcOverlay`、`buildPlaylistPanel`；作者标注 2026-10-27 起 | 前端为主；保留现有歌曲和歌词协议 |
| 播放进度 | 拖动后的进度更新保护、暂停拖动分支、投送模式时间状态处理 | `setMusicProgress`、`updatePlayerState`、`syncProgressBar`；对应 2026-11-09 日志 | 可先独立迁移；需播放/暂停真机回归 |
| 自定义 EQ | 保存 EQ 名称和频段，写入 `localStorage.custom_eqs`，重新选用自定义预设 | `renderEqPreset`、`updateCustomPresets`；2025-07-22 | 适合首批实现；可复用基线 EQ 协议，不需新增服务器 API |
| 扬声器音量 | 中低音和高音独立滑块，批量发送 `setMixerValue` | `renderSpeakerVolume`，`DAC Digital Volume L/R`，界面门槛 `ver >= 1876`；2025-08-30 | 设备能力项；不要向旧版无条件显示 |
| DSP 低音增强 | 读写 DSP 状态；新版走 `send_message`，旧路径用设备 shell | `buildSoundEffectsPanel`、`dsp_bass_state`；`1869` 是分支切换点，不是此功能统一最低版本；2026-04-12 | 依赖音箱 DSP/固件；必须先核对真机，不照搬 shell |
| 唤醒与录音 | 灵敏度和最大录音时长增加短暂解锁、防误触；最大录音时长下限 2 秒 | `buildBenchmarkSection`；2023-10-15、2026-02-12 | 防误触可先做；保留 Unisound 版本分支 |
| 设备信息 | CPU 温度、独立时间查询、版本信息中展示实际编译时间 | `updateSystemInfo`、`getConfirmedBuildTimestamp`、`getVersionInfo`；CPU 节点 `/sys/class/hwmon/hwmon0/device/temp0_input` | 温度节点可能因固件不同而失效；编译时间字段须由设备提供 |
| ADB | 增加单独重启 adbd 的操作 | `reboot_adbd`，设备 shell 为 `stop adbd && start adbd ...`；2025-08-17 | 与重启整机区分；需要明确用户操作和真机验证 |
| 投放服务 | 蓝牙服务独立开关、MiPlay 开关，常开文案覆盖更多投放服务 | `Set_Bluetooth_Open`、`Set_MiPlay_Open`、`Set_Service_Normally_Open`；蓝牙门槛 `1887` | 将协议和能力检测一起迁移 |
| MiPlay | 立体声组合、远端声道、延迟/队列水位、诊断状态 | `createMiPlayGroupDialog`、`createMiPlayAdvDialog`、多个 `Get/Set_MiPlay_*` 命令 | 主要依赖音箱服务，不是网页内实现投放协议 |
| 多源搜歌 | QQ / 酷我 / 网易云搜索、分页、整页播放、下一首插队、追加队尾 | `createMusicSearchDialog`；根页面使用 `https://r1.wxfsq.com/music`；2026-11-07 | 外部 API + 新设备协议，两层依赖都要隔离 |
| 队列编辑 | 拖动排序、移到首尾、单项删除及连接上下文保护 | `attachQueueRowDrag`、`showQueueMoveDialog`、`confirmQueueRemove`；实际连接确认 `ver >= 1887` 才启用 | 先实现版本/会话判断，再增加操作 |
| 扫码与初始化 | 登录意图和会话校验、二维码轮询、断线恢复、取消和跳过初始化状态处理 | `loginIntentCurrent`、`loginSessionCurrent`、`recoverLoginService`、`handleLoginState`；2026-11-06 至 11-09 | 已确认对应逻辑存在；真实账号登录成功与否未测试 |
| 屏幕控制 | 重写指针/触摸输入，长按与右键返回区分；帧加载校验当前连接并清理旧 URL | `ScreenController`、`setScreenFrame`、`releaseScreenFrameLoad`；2026-03-15 起 | 可分拆交互修复；必须在设备屏幕/触摸场景回归 |
| 自定义背景 | 双层过渡、模糊时扩大边界，切歌时保留封面背景 | `transitionBackground`、`applyHomeBackgroundBlur`、`restoreCoverBackground`；最后一条日志为 2026-11-10 | 前端改进，适合首批拆分 |
| 上传页面 | 从控制页进入设备 `/upload`，用带 nonce、来源校验和超时的消息同步背景 | `onItemClick` 的 `upload_page` 分支 | 实际上传和安装进度位于未取得的设备页面，尚未确认实现 |

旧版已具备 EQ、蓝牙设备控制、屏幕、基础投放服务开关、扫码登录等功能。
上表只描述增量；不能把整个蓝牙页、EQ 页或登录流程都算作闭源后的新增功能。

## 版本与协议的关键边界

`refresh.js` 发布常量为：网页 `2863`、APP `128`、EchoService `1887`、
Unisound `1856`。与此同时，CHANGELOG 声称编译时间展示需 `1888`。
这两者不能合并成“本次已经拿到并验证 1888 服务”。本次没有取得该服务构建或真实回包。

根页面新增队列能力的判断比仅比较 `ver` 更严格：

1. 设备回包确认的版本是有限数字且至少为 `1887`。
2. 确认版本与当前 `state.ver` 一致。
3. 确认时的 IP、WebSocket 必须仍属于当前连接，且连接为 OPEN。
4. 异步请求保存 epoch、IP 和 socket，回调执行前再次检查。

因此，URL 携带的 `ver=1887` 不能独自启用新功能。
切换设备、断线、关闭弹窗和搜索请求取消都要使旧操作失效。
已通过抽取实际发布函数、在合成连接状态中运行的探针验证这些分支。
协议格式和最低版本依据见 [协议摘要](upstream-protocol-2026-11-10.md)。

## 服务器和 Android 宿主依赖

| 功能 | 当前依赖 | 本次验证 | 自部署含义 |
| --- | --- | --- | --- |
| 根页面搜歌 | `GET https://r1.wxfsq.com/music?keyword=…&source=qq&page=1` | 一次查询返回 HTTP 200、`code=1`、10 条结果 | 需要可配置的 API 适配层或自己的后端；不能由静态文件替代 |
| 新 UI 搜歌 | 同源 `GET /api/music/search?...` | 同一查询返回 HTTP 200、`code=1`、10 条结果 | 部署到其他域名时，相对路径需要自己的后端代理/实现 |
| 歌曲封面/歌词/播放链接 | `/music` 和新 UI 的音乐查询/详情 API | 已确认代码调用；本次未验证实际播放及全部分支 | 接口成功不等于媒体可播、授权可用或账号登录有效 |
| 新 UI 局域网扫描 | HTTP 时直接 WebSocket；HTTPS 分支生成 `wss://<host>/r1ws/<编码地址>/` | 已确认代码；未点击扫描或验证该服务器代理 | 静态站点不能自然提供该 WebSocket 路由 |
| DLNA / AirPlay 扫描页面 | `plus.android`、Android UDP / SSDP / NsdManager 等 | 页面打开后停留“等待环境初始化” | 普通桌面浏览器不能直接获得相同 Android 能力 |
| 配网 | 音箱热点 `192.168.43.1:8989` 的 `/api/wifilist`、`POST /api/configwifi` | 页面自动读取列表失败；未提交配置 | 需要热点连接；手机 App 的 HTML5+ 路径还要单独测试 |
| 通知和媒体会话 | `plus.android`、Android MediaSession / Notification | 代码确认 | 网页修改无法替代 App 宿主集成 |

搜歌测试使用公开关键词“晴天”，没有登录账号、提交配网数据或向音箱发送控制命令。
API 响应中歌曲 ID 带来源后缀，如 `...,qq`；迁移时应保留完整 ID，不假定为纯数字。

## 不应原样沿用或过度解释的地方

- **PWA 尚不能认定可离线使用。** 根 HTML 在 `load` 回调里再次注册 `load` 监听后才调用 SW 注册；
  本次浏览器实际没有已注册的 Service Worker 和 Cache Storage 条目。
  `sw.js` 也没有建立预缓存。迁移时应独立设计并验证离线策略。
- **HTTPS 兼容不是全站统一完成。** 根页面有所改善，配网页实测跳到
  `http://r1.wxfsq.com:8080/config_wifi/`，新 UI 对 Apple 浏览器还有 HTTP 跳转分支。
  在 Chromium 可打开不代表 Safari、iOS 或热点环境都可用。
- **MiPlay 版本辅助函数有宽松回退。** `readMiPlayAvailable` 在版本无法解析时返回可用；
  已用实际函数验证，但本次主脚本中未见其调用，不能将它当作线上实际启用门槛。
  独立实现应将“未知能力”作为未知处理。
- **日志不是设备实现。** 上传安装进度、1888 编译时间字段、投放音频效果和账号恢复成功，
  不能仅凭 CHANGELOG 或前端调用认定已验证。
- **许可需要对应具体发布物。** 基线 `LICENSE` 是木兰宽松许可证第 2 版；
  本次没有确认闭源后资源的授权是否延续。公开可下载本身不能证明新发布物可直接再分发。
  当前报告提供可独立实现的功能和接口依据，不把新发布业务文件作为开源源码提交。

## 建议在 next 上的合并顺序

下面均是待实施的分批范围，不是已经完成的功能提交。每批验证后独立提交并 push。

1. **加载与连接兼容**：协议跟随页面、错误提示、权限状态、取消自动连接；
   测试 HTTP/HTTPS、无权限、无效 IP、连接取消和重连。保留现有设备名连接方式。
2. **不新增设备协议的改进**：自定义 EQ 持久化、防误触、背景模糊边界、
   歌词和进度交互；用已支持的协议保持旧设备可用。
3. **设备能力和会话确认**：版本回包确认、IP/socket/epoch 绑定、回调过期处理；
   对旧版、未知版本、断线、换机分别回归。这是新增队列功能的前置项。
4. **新增设备接口**：蓝牙服务开关、扬声器音量、MiPlay、DSP 和编译时间；
   按真实设备或可验证的服务实现逐项开放。未验证项保留禁用或明确提示。
5. **搜歌与队列**：先将 API 基址和返回格式封装，再实现分页、播放、插队、排序和删除；
   必测无 Unisound、搜索取消、切源、长队列和断线后旧回包。
6. **独立的新 UI**：明确要迁移的视觉和交互后实施，不与上述协议更新绑成一次全量替换；
   逐页对照基线已有能力，检查自部署后 API、字体/图标、App 桥和浏览器兼容。

新 APK 服务、真实音箱、Android App 宿主和服务器实现是后续验证输入，
不以网页抓取结果替代它们。只有网页侧需要变化的功能可以先完成独立实现。

## 已执行验证与覆盖限制

- 根页面、新 UI、配网、DLNA、AirPlay、网络扫描页均进行了浏览器加载。
  根页面和新 UI 首次加载无页面 JS 异常；控制台曾出现一个未定位的资源 404，
  因此没有把页面检查描述为“所有资源均正常”。
- 新 UI 在 `1280 / 768 / 390` CSS 像素宽度分别切换音乐、屏幕、音效、蓝牙、设备页：
  未捕获页面 JS 异常，文档滚动宽度等于视口宽度。检查状态为未连接设备。
- 根页面手机宽度下，经过本地网络权限说明后输入无效 IP，显示预期校验提示。
- 两个搜歌 API 的一次只读请求成功；这不建立持续可用性、其他来源或完整播放链路的结论。
- 10 个抽取函数探针通过：队列版本、连接/IP/epoch 失效、编译时间格式和 MiPlay 版本回退。
  这些是合成状态验证，没有向设备发包。
- REA 两侧各选择 5 个 JS 文件，分别访问约 46169 / 72293 个 AST 节点；
  两侧应用图和语义图均为 partial，语义节点达到默认每文件 20000 的保留上限，
  基线另有 alias selection 限制。基线中 `package` 变量产生 5 条保留字恢复诊断，
  这不是本次发现的浏览器运行故障。
- REA 比较返回 `changed=6, unknown=130`，未给出可信的新增/删除统计。
  因覆盖和重构导致的未匹配，不能解读成“只改了 6 项”或“没有新增”。
- Craft Anything 的活页 JS 分析覆盖该窗口加载的 4 个外部脚本；
  静态目录分析也有 partial 覆盖，结果不包含未加载分支的完整证明。
- 没有真实音箱、有效账号登录、Android HTML5+ 宿主、实际配网、扫描、播放、
  shell 执行、软件上传或安装验证。没有恢复闭源仓库、原始提交历史或服务器源码。

私有分析包保留公开发布文件、页面截图、网络摘要、API 样本、AST 索引、
REA/Craft Anything Evidence 和探针脚本。重新分析时先核对 SHA-256，
不要把今后同一 URL 返回的新内容当作本次快照。
