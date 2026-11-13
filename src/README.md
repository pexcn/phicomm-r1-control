# 独立新版前端

Vue 3、TypeScript、Vite 与 `@material/web` 实现的 R1 音箱控制器。
这里不加载原作者版的业务脚本；设备消息格式依据已记录的协议独立实现。

- `App.vue`、`components/`、`views/`：应用外壳、共享组件和五个功能页。
- `lib/client.ts`：WebSocket 生命周期、轮询、重连和旧连接消息隔离。
- `lib/protocol.ts`：协议数据与地址校验。
- `lib/speaker.ts`：设备状态和操作；不实现音乐账号登录。
- `lib/theme.ts`：三态明暗模式、独立配色偏好、系统跟踪与浏览器存储。
- `lib/color-schemes.ts`：内置配色列表，每项提供稳定 ID、名称和完整的深浅颜色角色。
- `lib/custom-color.ts`：自定义主色校验与 Material Tonal Spot 深浅颜色生成。
- `lib/theme-reveal.ts`：主题扩散；鼠标、触屏和键盘操作统一以触发控件的几何中心为圆心。
- `material.css`：M3 字体层级、形状与交互动效。
- `styles.css`：页面布局和响应式适配。
- `scrollbars.css`：全局细滚动条；`main.ts` 将同一份样式复用到 Material 弹窗、菜单和文本框内部。
- `components/MaterialState.vue`：复合控件的 Material Web 涟漪与键盘焦点状态。
- `components/TurntablePlayer.vue`：黑胶旋转、暂停停靠、封面大图与键盘关闭。
- `lib/turntable.ts`：以固定支点计算唱针圆弧，让针尖随进度从黑胶外圈向内圈移动。
- `components/LocalMusicDialog.vue`、`lib/local-music.ts`：只读扫描音箱目录、过滤音频与本地路径点播。
- `components/AtmosphereLightDialog.vue`：按设备版本提供氛围灯效果、亮度、渐变速度和颜色。
- `components/AutoRestartCard.vue`：设备端每日自动重启配置、保存确认与回读。
- `components/AdvancedAudioEffects.vue`、`lib/audio-effects.ts`：低音、响度、DSP 和 DAC 分路音量。

新增设备能力及 APK 协议依据见 `../docs/device-controls.md`。请求由 `requestDevice` 的会话 ID
关联；弹层关闭、换机或卸载后不应用旧扫描和配置结果，也不继续跨会话的后续写入。

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
自定义主色存储为 `custom-color`，仅接受六位十六进制 `#RRGGBB`，统一转为小写；
已选自定义但存储颜色无效时回退翡翠绿，保留明暗模式。
`@material/material-color-utilities` 的 Tonal Spot 算法以标准对比度生成全部深浅颜色角色，
实际主题主色不一定等于输入的原色；成功提示保持绿色，错误提示使用 Material 错误色。
算法依赖使用兼容 Node 原生 ESM 的 0.3 系列；0.4.0 发布包的无扩展名导入会导致 Node 测试失败，
升级时需同时验证浏览器构建和原生 Node 回归。颜色测试覆盖灰阶和饱和色的常用文字对比度。
内置或自定义选项立即应用并保存；修改自定义主色后须点击“应用颜色”，避免取色时反复扩散。
切回内置配色会保留已应用的自定义颜色；“恢复默认配色”清回翡翠绿及默认主色，保留明暗模式。
接口地址独立校验保存，关闭设置会丢弃未应用的主色和未保存的接口草稿。

开发运行 `npm run dev`；发布运行 `npm run build`，产物位于 `dist/`。
Vite 使用相对资源和 hash 导航，支持 GitHub Pages 的项目子目录。
根目录 `index.html` 是新版入口；发布脚本保留 `/upstream/` 原作者版。
`upstream/original/` 保存唯一原件；构建时生成 `dist/upstream/`，生成结果不提交。
固定静态资源位于 `public/`，它们的访问地址不受源码目录影响。

新版浏览器存储统一使用 `phicomm-r1:web:` 前缀；不读取原页面的账号或设置。
原作者更新仍按 `upstream/README.md` 处理，不直接合并界面代码到这里。
