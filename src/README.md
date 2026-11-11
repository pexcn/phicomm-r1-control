# 独立新版前端

Vue 3、TypeScript、Vite 与 `@material/web` 实现的 R1 音箱控制器。
这里不加载原作者版的业务脚本；设备消息格式依据已记录的协议独立实现。

- `App.vue`、`components/`、`views/`：应用外壳、共享组件和五个功能页。
- `lib/client.ts`：WebSocket 生命周期、轮询、重连和旧连接消息隔离。
- `lib/protocol.ts`：协议数据与地址校验。
- `lib/speaker.ts`：设备状态和操作；不实现音乐账号登录。
- `material.css`：M3 字体层级、颜色角色、形状与交互动效；浅色使用 DC1 绿色，深色使用蓝色。
- `styles.css`：页面布局和响应式适配。
- `components/MaterialState.vue`：复合控件的 Material Web 涟漪与键盘焦点状态。

Roboto 400/500/700 字重本地打包，中文使用系统字体回退；图标使用官方 Material Symbols。
常规操作使用 Material Web 组件；导航、队列和遥控等复合控件复用其状态层，
避免自行覆盖组件内部的悬停、按下和禁用颜色。减少动态效果偏好会关闭形状过渡。

开发运行 `npm run dev`；发布运行 `npm run build`，产物位于 `dist/`。
Vite 使用相对资源和 hash 导航，支持 GitHub Pages 的项目子目录。
根目录 `index.html` 是新版入口；发布脚本保留 `/upstream/` 原作者版。
`upstream/original/` 保存唯一原件；构建时生成 `dist/upstream/`，生成结果不提交。
固定静态资源位于 `public/`，它们的访问地址不受源码目录影响。

新版浏览器存储统一使用 `phicomm-r1:web:` 前缀；不读取原页面的账号或设置。
原作者更新仍按 `upstream/README.md` 处理，不直接合并界面代码到这里。
