# 独立新版前端

Vue 3、TypeScript、Vite 与 `@material/web` 实现的 R1 音箱控制器。
这里不加载旧版或作者版的业务脚本；设备消息格式依据已记录的协议独立实现。

- `App.vue`、`components/`、`views/`：应用外壳、共享组件和五个功能页。
- `lib/client.ts`：WebSocket 生命周期、轮询、重连和旧连接消息隔离。
- `lib/protocol.ts`：协议数据与地址校验。
- `lib/speaker.ts`：设备状态和操作；不实现音乐账号登录。
- `styles.css`：浅色使用 DC1 绿色配色，深色使用蓝色 Material 配色。

开发运行 `npm run dev`；发布运行 `npm run build`，产物位于 `dist/`。
Vite 使用相对资源和 hash 导航，支持 GitHub Pages 的项目子目录。
发布脚本保留 `/upstream/` 作者版与 `/legacy.html` 旧改造版；
`tools/upstream/snapshot/` 只供同步和校验，不包含在发布产物中。

新版浏览器存储统一使用 `phicomm-r1:web:` 前缀；不读取原页面的账号或设置。
作者更新仍按 `upstream/README.md` 处理，不直接合并界面代码到这里。
