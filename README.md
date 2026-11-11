# Phicomm R1 Control

为斐讯 R1 音箱独立实现的网页控制器，使用 Vue 3、TypeScript、Vite 与
Google Material Web 组件。浅色采用 [DC1 网页](https://github.com/pexcn/phicomm-dc1-firmware/tree/master/web)
的绿色配色，深色采用蓝色主题；桌面侧栏与手机底部导航分别适配。
Roboto 字体与 Material Symbols 图标随网站本地打包，无需外部字体 CDN。
字体层级、颜色角色、形状和交互动效集中在 `src/material.css`。

需配合音箱上的 `new_EchoService`。新版独立实现，不加载原作者版的业务脚本，
设备协议参考已有记录独立实现；不实现 QQ 音乐、网易云音乐等账号登录。

## 使用与部署

建议使用 Node.js 24；最低支持 Node 20.19 或 22.12。
开发和构建还需 Python 3.10+，用于校验与生成原作者版。

```sh
npm ci
npm run dev
```

开发服务器地址见命令输出。构建包含新版和原作者版的完整静态站点：

```sh
npm run build
npm run serve
```

打开 `http://127.0.0.1:8000/`。`scripts/serve.py` 提供 `dist/` 和可选的音乐接口转发；
需要其他设备访问时加 `--bind 0.0.0.0`，端口用 `--port` 指定。
没有构建产物时会提示先运行 `npm run build`。

也可直接将 `dist/` 部署到普通静态服务器。推送 `master` 后，GitHub Actions
使用 Node 构建，再发布到 GitHub Pages；网站运行时不需要 Node 或 Python。
相对资源地址和 hash 导航支持域名根目录与项目子目录，无需服务器路由重写。

发布入口：

| 地址               | 内容           |
| ------------------ | -------------- |
| `/`                | 独立新版       |
| `/upstream/`       | 原作者经典界面 |
| `/upstream/newui/` | 原作者新 UI    |

根目录 `index.html` 是新版入口，应用源码位于 `src/`。
音箱固件固定引用的 `new_r1_control.js` 保留为小型兼容入口，加载
`upstream/new_r1_control.js` 中的原作者实现，不包含另一套界面。

## 新版功能

- 音乐：当前曲目、封面与歌词、播放/暂停、上下曲、进度、音量、播放模式、
  队列点播；确认 EchoService ≥ 1.8.87 后开放队列上移与删除。
- 搜歌：匿名多源搜索，不提供账号登录。精确点播、追加需要当前连接确认
  EchoService ≥ 1.8.87；旧版设备可尝试依赖设备语音服务的关键词点播。
- 定时暂停：由当前网页计时，需保持页面打开和连接；浏览器休眠可能延迟执行。
  换机或断线即取消，不宣称为设备后台定时任务。
- 屏幕：实时推流、截图、下载、点击/滑动、方向键、文字输入和语音播报。
  保持原始画面比例，画面下方固定返回、Home、菜单三个系统键。
  离开页面或隐藏网页停止推流，回到页面后可手动重新开启。
- 音效：设备上报的 EQ 开关、频段、预设，以及浏览器本地自定义 EQ 保存与应用。
- 蓝牙：适配器开关、搜索、配对、取消配对与音频输入/输出连接。
- 设备：固件、EchoService、CPU、内存与运行时间，DLNA/AirPlay/服务常开，
  名称修改与重启操作。没有回报的状态显示为空或禁用，不伪造设备数据。

配网、设备扫描和 Android 专用 ADB 工具打开保留的原作者页面。
新版不是原作者全部高级功能的等价替代；MiPlay 分组、固件上传、Android 宿主能力等
仍可使用原作者参考版。界面能够打开不代表相关硬件功能已经通过真机验证。

## 连接与服务限制

连接框支持：

- `192.168.1.40`、`Phicomm_R1_12CF`：默认端口 `8080`。
- `192.168.1.40:9090`：自定义端口。
- `ws://192.168.1.40:80/`：完整明文地址。
- `wss://r1.example.com/speaker/ws?key=...`：完整 TLS 代理地址，保留路径和参数。

网页保持当前 HTTPS、域名与端口。HTTPS 页面直接访问局域网的明文 WebSocket
取决于浏览器的本地网络访问支持和授权；不支持时需要自己的 WSS 反向代理。
GitHub Pages 和 `scripts/serve.py` 均不提供音箱代理或 TLS，也不能为音箱固件增加这些能力。

音乐搜索、封面和歌词默认使用原作者的 `https://r1.wxfsq.com/music` 接口，
可在设置中换成协议兼容、允许跨域的 HTTP(S) 服务。搜索源是否可用、歌曲权限、
歌词和封面取决于外部服务；设备播放控制不依赖该接口。
可选 Python 转发由 `--upstream` 设置源地址，但它不是原作者服务器的完整实现。

文字输入的字符支持取决于设备输入法；语音播报和关键词点播需要相应语音服务。
原版配网接口是 `http://192.168.43.1:8989`，需先连接音箱热点，可能受浏览器限制。
独立 ADB、DLNA/AirPlay 扫描等工具需要 Android HTML5+ 宿主。

## 目录与原作者同步

| 路径                       | 用途                                         |
| -------------------------- | -------------------------------------------- |
| `src/`                     | 独立新版组件、样式与通信层                   |
| `scripts/prepare-site.mjs` | 合并静态发布产物，保留原作者和兼容入口       |
| `dist/`                    | 构建产物，不提交 Git                         |
| `upstream/`                | 原作者原件、部署补丁、同步工具与 AI 合并说明 |
| `public/`                  | favicon 和音箱固定脚本等原样发布的静态文件   |
| `tests/`                   | 协议、浏览器、服务器与快照回归               |
| `docs/`                    | 历史分析、来源和协议记录                     |

`upstream/original/` 只保存一份原作者文件；来源指纹、补丁、适配脚本和同步工具均在
`upstream/`。构建时生成 `dist/upstream/`，不提交生成结果，也不发布原件目录和维护工具。
更新原作者版前先读 [AI 维护指南](upstream/README.md)。

`public/favicon.svg` 和 `public/new_r1_control.js` 由 Vite 原样发布，访问地址保持
`/favicon.svg` 和 `/new_r1_control.js`。本地服务工具位于 `scripts/serve.py`，
可用 `npm run serve -- --port 8080` 指定端口；Prettier 配置集中在 `package.json`。

新版存储使用 `phicomm-r1:web:` 前缀，原作者版使用 `phicomm-r1:upstream:`；
不读取旧改造版的账号和设置，不自动导入旧设备地址，也不自动连接已保存地址。
新站不注册 Service Worker，不声明离线可用。

## 开发与验证

```sh
npm run check
npm run test:unit
npm run build
```

`check` 包含格式、Vue/TypeScript 类型、原作者浏览器脚本、本地资源与原作者快照校验。
`npm run format` 格式化自有代码，原作者原件、精确补丁上下文和构建产物均排除。
仅修改原作者部署补丁时运行 `npm run upstream:build`，再用
`python3 upstream/sync.py check --output dist/upstream` 核对生成结果。
`npm run check` 在临时目录验证部署资源，不依赖已有的 `dist/`。

完整回归还需 Python Playwright 和 Chromium：

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
npm test
```

浏览器测试可用 `CHROMIUM_PATH` 指定可执行文件，默认优先系统 Chromium。
测试使用合成 WebSocket、音箱回包与音乐服务，不连接真实音箱。
真实设备上的音频输出、投放、蓝牙、屏幕输入和固件版本兼容仍需实际设备核对。

根 `LICENSE` 保留木兰宽松许可证第 2 版；依赖构建时生成 `THIRD-PARTY-LICENSES.md`。
原作者参考版的来源与许可边界见 [历史导入说明](docs/upstream-merge-2026-11-10.md)，
原作者入口：<https://r1.wxfsq.com/>。
