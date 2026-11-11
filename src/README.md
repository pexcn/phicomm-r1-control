# 独立新版前端

Vue 3、TypeScript、Vite 与 `@material/web` 实现的 R1 音箱控制器。
这里不加载原作者版的业务脚本；设备消息格式依据已记录的协议独立实现。

- `App.vue`、`components/`、`views/`：应用外壳、共享组件和五个功能页。
- `lib/client.ts`：WebSocket 生命周期、轮询、重连和旧连接消息隔离。
- `lib/protocol.ts`：协议数据与地址校验。
- `lib/speaker.ts`：设备状态和操作；不实现音乐账号登录。
- `lib/theme.ts`：三态主题、系统偏好跟踪和独立的浏览器存储。
- `lib/theme-reveal.ts`：以点击位置为圆心的主题扩散；键盘操作以按钮中心为圆心。
- `material.css`：M3 字体层级、颜色角色、形状与交互动效；深浅主题均使用翡翠绿色系。
- `styles.css`：页面布局和响应式适配。
- `components/MaterialState.vue`：复合控件的 Material Web 涟漪与键盘焦点状态。

Roboto 400/500/700 字重本地打包，中文使用系统字体回退；图标使用官方 Material Symbols。
常规操作使用 Material Web 组件；导航、队列和遥控等复合控件复用其状态层，
避免自行覆盖组件内部的悬停、按下和禁用颜色。减少动态效果偏好会关闭形状过渡和主题扩散。

主题切换参照 VoHive：跟随系统 → 浅色 → 深色 → 跟随系统，默认跟随系统。
工具栏与设置复用同一个主题状态；只有实际明暗发生变化时才播放 650ms 扩散，
动画期间忽略重复切换。系统偏好变化、不支持 View Transitions 或动画失败时仍能直接应用主题。

开发运行 `npm run dev`；发布运行 `npm run build`，产物位于 `dist/`。
Vite 使用相对资源和 hash 导航，支持 GitHub Pages 的项目子目录。
根目录 `index.html` 是新版入口；发布脚本保留 `/upstream/` 原作者版。
`upstream/original/` 保存唯一原件；构建时生成 `dist/upstream/`，生成结果不提交。
固定静态资源位于 `public/`，它们的访问地址不受源码目录影响。

新版浏览器存储统一使用 `phicomm-r1:web:` 前缀；不读取原页面的账号或设置。
原作者更新仍按 `upstream/README.md` 处理，不直接合并界面代码到这里。
