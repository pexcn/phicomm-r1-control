# Phicomm R1 Control

需配合音箱上的 `new_EchoService`；部分功能还需 `new_Unisound` 或 Android App 的 HTML5+ 宿主。

当前同时保留本地改造版和作者参考版，后续独立新 Web 在 `src/` 开发。
作者参考版以 2026-11-10 保存的公开网页快照（`web_ver = 2863`）为基线，
保留原目录、文件名和代码格式，通过明确的部署补丁在 `/upstream/` 运行。
独立新站尚未重写，根目录当前仍运行已有本地改造版。

## 使用

Python 3.10+ 可直接启动页面和音乐接口转发，不需要安装服务器依赖：

```sh
python3 serve.py
```

入口如下，部署到项目子目录时同样适用：

- `/`：当前本地改造版；`/pages/modern/`：本地改造后的新 UI。
- `/upstream/`：作者经典界面；`/upstream/newui/`：作者新 UI。

从本地连接页也可打开作者参考版。
需要其他设备访问时使用 `--bind 0.0.0.0`；端口可用 `--port` 指定。
音乐接口默认转发到作者服务，服务地址可用 `--upstream` 指定。

也可以使用普通静态服务器或部署到 GitHub Pages 的项目子目录。
静态部署支持页面和使用作者 CORS 接口的搜索；新 UI 的排行榜还需同源 API 转发，
可运行 `serve.py` 或在自己的服务器配置 `/api/hotlist`。

自部署设置位于 [assets/js/shared/config.js](assets/js/shared/config.js)：
`musicApiUrl` 控制搜索、封面和歌词接口，`serviceBaseUrl` 控制排行榜等服务接口，
`scanProxyBaseUrl` 可选，默认直接连接局域网设备。
资源地址从配置脚本所在目录推导，支持项目子目录部署。

## 目录

| 路径             | 用途                                                        |
| ---------------- | ----------------------------------------------------------- |
| `index.html`     | 当前本地改造版入口                                          |
| `pages/`         | `modern`、`wifi`、`adb`、`dlna`、`mdns`、`device-scan` 页面 |
| `assets/js/`     | `classic`、`modern`、`shared`、`tools` 脚本                 |
| `assets/css/`    | 页面样式                                                    |
| `assets/images/` | 应用图标、唱片和唱针图片                                    |
| `assets/vendor/` | 第三方浏览器库及其许可                                      |
| `scripts/`       | 开发检查工具                                                |
| `tests/`         | 浏览器与接口回归                                            |
| `docs/`          | 上游快照分析与协议记录                                      |

另外还有：

- `src/`：独立新站源码预留目录。
- `upstream/`：生成的作者参考版；合并前先读 [维护说明](upstream/README.md)。
- `tools/upstream/`：原始快照、来源指纹、部署补丁和同步脚本。

本地改造版的页面由 `newui/`、`config_wifi/`、`adb/` 等旧路径迁移至 `pages/`，
部署时应整体上传当前目录并更新书签。历史分析报告中的路径仍指当时的上游快照。
根目录的 `new_r1_control.js` 继续加载本地改造版，兼容已有音箱配置。
使用作者参考版时，可指定 `/upstream/new_r1_control.js`。
作者版的浏览器存储与本地改造版隔离，不会自动继承彼此的设备、账号和 EQ 缓存。
配网页保留内联样式和逻辑，供 Android App 保存为单文件离线页面。

## 连接地址

本地改造版的连接页和新 UI 都支持以下地址，重连时保留自定义端口、代理路径和查询参数：

- `192.168.1.10`、`Phicomm_R1_ABCD`：直连音箱，默认端口 `8080`。
- `192.168.1.10:9090`：使用指定端口。
- `wss://r1.example.com/speaker/`：通过已配置的 TLS 反向代理连接。
- `r1.example.com/speaker/`：省略协议时按 `wss://` 处理；也支持完整 `ws://` 地址。

页面保持当前域名、协议和部署目录，不会为连接音箱而自动降级到 HTTP。
WSS 需要自己的反向代理转发 WebSocket；`serve.py` 不提供设备代理或 TLS。
上传入口按连接地址推导，例如上述代理地址对应
`https://r1.example.com/speaker/upload`，需要另行转发该 HTTP 路径。

## 设备兼容与限制

- 旧版设备保留原有协议路径；队列编辑只在当前连接实际确认 EchoService ≥ `1887` 后启用。
- MiPlay、独立蓝牙服务开关、DSP、扬声器音量和编译时间依赖对应设备能力。
- HTTPS 页面直连明文 WebSocket 仍取决于浏览器的本地网络访问支持与授权；
  不支持时可填写 WSS 代理地址。网页改造不会给音箱固件添加 TLS。
- 配网需要先连接音箱热点，固件配网接口仍为 `http://192.168.43.1:8989`；
  浏览器可能拦截 HTTPS 页面对该接口的访问，WSS 控制代理不代理配网接口。
  DLNA/AirPlay 扫描及独立 ADB 控制台需要 Android HTML5+ 宿主。
- `serve.py` 提供有限接口转发，未恢复作者的服务器源码或缓存系统。
  音乐服务、账号登录、投放和固件升级仍受外部服务与真实设备限制。
- manifest 和 Service Worker 已接入；没有实现完整离线应用缓存。

具体变更、来源和验证结果见 [合并说明](docs/upstream-merge-2026-11-10.md)。
原始对比见 [差异报告](docs/upstream-analysis-2026-11-10.md) 和
[协议摘要](docs/upstream-protocol-2026-11-10.md)。

## 验证

开发时使用 Node.js 20+ 安装固定版本的格式化工具：

```sh
npm ci
npm run check
npm run format
```

`check` 检查格式、浏览器脚本语法和本地资源引用；`format` 统一项目代码格式。
HTML、CSS、JavaScript 使用两空格缩进，JavaScript 使用 camelCase 变量和函数名、
PascalCase 组件和类名，常量使用 UPPER_SNAKE_CASE，目录和文件使用 kebab-case。
设备协议字段、存储键、DOM ID 和固件兼容接口保留原名。
第三方压缩分发文件、历史分析数据、作者原始快照和生成的 `upstream/` 不参与格式化。
`npm run check` 还验证快照和生成结果；修改部署适配后运行 `npm run upstream:build`。
作者更新应按 [upstream/README.md](upstream/README.md) 的候选抓取、比较与导入流程处理，
不要用本地改造版覆盖作者原件。
npm 仅用于开发检查，页面部署和 `serve.py` 不依赖 Node.js。

服务器回归仅需 Python 标准库：

```sh
python3 -m unittest discover -s tests -p test_server.py -v
```

浏览器回归需要 Python Playwright 和 Chromium（系统安装或 Playwright 安装均可）：

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 -m unittest discover -s tests -v
```

自定义浏览器路径可设置 `CHROMIUM_PATH`。浏览器测试使用模拟连接，不向真实音箱发命令。

作者入口：<https://r1.wxfsq.com/>；原项目介绍：
<https://www.right.com.cn/forum/thread-4072249-1-1.html>。

后续开发在 `master` 分支进行。
