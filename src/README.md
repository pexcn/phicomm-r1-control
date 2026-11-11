# 独立新版前端

Vue 3、TypeScript、Vite 与 `@material/web` 实现的 R1 音箱控制器。
这里不加载原作者版的业务脚本；设备消息格式依据已记录的协议独立实现。

- `App.vue`、`components/`、`views/`：应用外壳、共享组件和五个功能页。
- `lib/client.ts`：WebSocket 生命周期、轮询、重连和旧连接消息隔离。
- `lib/protocol.ts`：协议数据与地址校验。
- `lib/speaker.ts`：设备状态和操作；不实现音乐账号登录。
- `lib/theme.ts`：三态明暗模式、独立配色偏好、系统跟踪与浏览器存储。
- `lib/color-schemes.ts`：内置配色列表，每项提供稳定 ID、名称和完整的深浅颜色角色。
- `lib/theme-reveal.ts`：以点击位置为圆心的主题扩散；键盘操作以按钮中心为圆心。
- `material.css`：M3 字体层级、形状与交互动效。
- `styles.css`：页面布局和响应式适配。
- `components/MaterialState.vue`：复合控件的 Material Web 涟漪与键盘焦点状态。
- `components/TurntablePlayer.vue`：黑胶旋转、暂停停靠、封面大图与键盘关闭。
- `lib/turntable.ts`：以固定支点计算唱针圆弧，让针尖随进度从黑胶外圈向内圈移动。

唱片与唱针图片由 `upstream/original/newui/images/` 中的原件直接打包为本站静态资源，
不加载原版业务脚本、不修改原件。原图尺寸改变时需复核唱针支点和针尖标定。
旋转与唱针跟随设备上报状态；时长未知时落在外圈，播完或暂停时停转并移出唱针。
暂停保留当前转角，封面大图独立静止显示；启用减少动态效果时关闭旋转与摆臂过渡。

Roboto 400/500/700 字重本地打包，中文使用系统字体回退；图标使用官方 Material Symbols。
常规操作使用 Material Web 组件；导航、队列和遥控等复合控件复用其状态层，
避免自行覆盖组件内部的悬停、按下和禁用颜色。减少动态效果偏好会关闭形状过渡和主题扩散。

主题切换参照 VoHive：跟随系统 → 浅色 → 深色 → 跟随系统，默认跟随系统。
工具栏与设置复用同一个主题状态；实际明暗或配色发生变化时才播放 650ms 扩散，
动画期间忽略重复切换。系统偏好变化、不支持 View Transitions 或动画失败时仍能直接应用主题。

主题颜色默认翡翠绿，也可选蓝色；颜色切换复用扩散效果，不改变明暗模式。
新增内置颜色时，在 `lib/color-schemes.ts` 中增加唯一稳定 ID、名称和完整的深浅配色；
设置选项由列表自动生成，无需增加切换分支。颜色回归检查会验证常用文字配对的对比度。
明暗模式与颜色分别存储为 `theme`、`color-scheme`，未知颜色 ID 回退为翡翠绿。
外观立即应用并保存；接口地址独立校验保存，关闭设置会丢弃未保存的接口草稿。

开发运行 `npm run dev`；发布运行 `npm run build`，产物位于 `dist/`。
Vite 使用相对资源和 hash 导航，支持 GitHub Pages 的项目子目录。
根目录 `index.html` 是新版入口；发布脚本保留 `/upstream/` 原作者版。
`upstream/original/` 保存唯一原件；构建时生成 `dist/upstream/`，生成结果不提交。
固定静态资源位于 `public/`，它们的访问地址不受源码目录影响。

新版浏览器存储统一使用 `phicomm-r1:web:` 前缀；不读取原页面的账号或设置。
原作者更新仍按 `upstream/README.md` 处理，不直接合并界面代码到这里。
