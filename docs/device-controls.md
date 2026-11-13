# 独立新版设备功能协议

协议以保存的经典网页和已分析的 EchoService 1.8.73 / 1.8.87 APK 为依据，
不是将原 NewUI 的包装函数直接照搬。模拟测试验证消息与界面，实际效果仍需音箱确认。

## 本地音乐

- 入口在音乐页。通过带关联 ID 的 `shell` 请求执行只读 `find`，目录用单引号转义，
  结果以固定标记分隔，只接收目录内的音频文件路径；最多检查 2000 个文件。
- 扫描不改变播放队列、不自动播放；浏览器按文件名和路径过滤，不读取 ID3 标签。
- 目录播放使用 `{type:"play_local_music",path,play:true}`。
- 单文件使用 `send_message` 的 `what=4,arg1=15`，`obj` 为序列化的播放列表，
  `url` 是音箱上的本地路径。这条播放接口在两个 APK 的 `MsgHandler.handlePlayRequest`
  中均存在，不与 1.8.87 新增的搜索/队列编辑能力混为一谈。
- 延续经典版播放器限制：1.8.56 起可用，1.8.56–1.8.64 仅 MediaPlayer，
  1.8.65 起支持两种播放器。音频编码支持由设备决定。
- `local_` 歌曲不向外部元数据服务发送请求。扫描回包在关闭弹窗、换机或断线后失效。

## 氛围灯

- 从 `get_info` 回读 `music_light_enable/mode/luma/chroma/color`。
- `send_message` 使用 `what=4`；`arg1=64/65/66/68/70` 分别设置开关、亮度、
  渐变速度、效果和颜色，颜色为 24 位 RGB 整数。
- 经典版的效果门槛保留：1.8.29 起旋转效果，1.8.48 起单色效果；
  1.8.81 起七彩模式也能选色，更旧版本仅单色模式提供选色。
- 未收到设备状态时不启用控件。设置后请求状态，日常轮询继续回读实际值。

## 每日自动重启与 adbd

- 每日重启使用 EchoService 自身的 `Auto_restart_device` 查询，
  `set_Auto_restart_device_time` 的 `times` 是 `[时,分]` 的 JSON 字符串，
  开关使用 `set_Auto_restart_device_open`。两个 APK 的 `server` 均包含这些接口。
- 保存前校验时间，逐步核对设置确认，再回读完整配置；未确认或超时时不显示保存成功。
  关闭页面或切换设备后不继续后续写入。1.8.48 以下不启用。
- 以音箱本地时间每日执行，不依赖网页的定时器，关闭网页后仍生效。
- 重启 adbd 沿用经典版的 `stop adbd && start adbd`，用户确认后发送，
  以固定输出标记判断命令是否执行；不采用 NewUI 未证实的 `what=1,arg1=3` 包装。

## 高级音效

- `get_eq_config` 分别读取 `bass`、`loudness` 和 `Mixer`；没有返回完整数值时禁用对应控件，
  不用默认值冒充设备状态。读取失败后也禁用旧配置。
- 低音增强沿用 `set_bass_enable`、`set_bass_strength`，强度设备值为 0–1000，显示为百分比。
- 响度沿用 `set_loudness_enable`、`set_loudness_gain`，设备值为 -3000–3000，按百分之一 dB 显示。
- DAC 分路音量要求确认 EchoService >=1.8.76，且 Mixer 已提供对应控制值；
  使用 `setMixerValue` 设置 `DAC Digital Volume L/R`，原网页范围 211–251，参考值 231。
- DSP 查询 `persist.route0feture` 与 `DSP Firmware PRAM`，分别显示开关与固件生效状态。
  1.8.69 起沿用经典版的 `what=16384,arg1=100,arg2=0` 指令；旧版本沿用固定 property 写入。
  没读到有效状态时不开放开关。设置后延迟回读，不将“已发送”当作“音效已生效”。
- 断线、换机或离开音效页后取消后续查询，不让延迟结果覆盖新设备状态。

## 默认音乐源与播放设置

- 音箱默认音乐源使用经典版 `setMusicSource` 和 NewUI `setMusicSource` 的
  `what=65536,arg1=0,arg2=4,obj=qq|netease|kuwo`，它修改设备点播偏好，
  不改变本网页搜索来源。此指令发往设备语音服务；未确认 Unisound 存在时禁用。
  网页不提供账号登录，也不能因此解锁平台付费曲目。
- 引擎切换沿用经典版 `buildDeviceActions` / `handleSwitchPlayer`：
  1.8.56 起发送 `switch_player`，`player=1/2` 是 MediaPlayer/ExoPlayer。
  只有设置回包确认目标值后才发送 `reboot_echo`。重启会中断播放与连接；
  `PlayerType` 是保存的选择，`Current_PlayerType` 才是当前实际引擎，不混用。
- 1.8.63 起 ExoPlayer 使用 `switch_quality`，`quality=0/1/2/3` 对应高品、
  超品、无损、Hi-Res。未上报 `Support_Flac` 时仅提供前两档。
  设置回包后另外查询 `get_info`，以实际偏好回读确认，而非仅依据中转成功。
- 格式来自 `music_info.Current_MusicData.Format`，音源质量及码率来自 `api_data`。
  缺失项不填默认值，不凭高码率推断无损；PCM 编码显示为“解码位深”，
  不承诺它就是源文件位深。首选音质不保证每首曲目都能达到。

## MiPlay 与投放服务

- 协议由经典版 `createMiPlayAdvDialog` 和 EchoService 1.8.87 `server` /
  `MiPlayHost` / `MiPlayRuntime` 交叉核对，不经过 Unisound。仅设备上报 `miplay_open` 时开放入口。
- 服务使用 `Set_MiPlay_Open`；蓝牙后台启动许可使用 `Set_Bluetooth_Open`，
  后者沿用经典版 1.8.87 门槛，不等同于蓝牙适配器开关。
- 投放连接模式使用 `what=64,arg1=1/2,arg2=-1` 进入／退出，1.8.20 起支持，
  `get_info.device_state=3` 表示进入，其他已知状态表示退出。
- 诊断使用 `Get_MiPlay_Diag`；远端使用 `Get_MiPlay_Remote_Diag` 加 `ip`，
  解析回包 `data.diag` 内的 JSON，检查远端错误码和代理错误。仅接受有效 IPv4。
- 声道使用 `Set_MiPlay_Channel` 的 `mode=0/1/2`，对应立体声、左、右；
  远端使用 `Set_MiPlay_Remote_Channel`，同时发送 `mode` 与 `channel` 兼容字段。
- 队列使用 `Set_MiPlay_Tuning` / `Set_MiPlay_Remote_Tuning` 的
  `queue_target_ms`（400–1500 整数 ms）；同步延迟使用
  `Set_MiPlay_Sync_Delay` / `Set_MiPlay_Remote_Sync_Delay` 的
  `sync_delay_ms`（-500–500 整数 ms），正值晚播，负值早播。
- 必须读到有效字段才开放该参数；写入后查询同一目标并核对，不以代理 ACK 代替实际生效。
  目标变化、关闭弹层、换机后停止后续操作。诊断为手动刷新的带读取时间快照，
  展示设备提供的数据年龄与有效标记；不作声学同步保证，不自动校准。

## 暂未移植的 Unisound 功能

以下判断来自保存的原作者网页，而不是把“无需网页登录”当成“无设备依赖”：

| 功能 | 原版源码依据 | 本轮处理 |
| --- | --- | --- |
| 休眠、麦克风、唤醒 | NewUI `ws.js` 的 `setDormancy` / `stopWakeup` / `enterWakeup` 发往 Unisound；经典版 `updateUnisoundInfo` 提供休眠与拾音状态 | 不移植完整模块；原生 `what=256` 唤醒/休眠消息不能证明脱离语音服务后完整可用 |
| 收藏、平台歌单 | 经典版 `collect` / `cancel_collect` / `get_song_list` 经 `sendToUnisound` 的 `api` 请求 | 不移植；还涉及设备端账户与曲目权限 |
| 闹钟、提醒、备忘 | NewUI `ws.js` 的 memo 查询与增删经 `send_to_unisound` | 不移植 |
| 热榜 | NewUI `panel-music.js` 的 `HotTab` 经 HTTP 取列表，点播、追加与整榜播放经 `musicPlay` / `web_添加` | 列表本身独立，但原版完整播放功能依赖 Unisound；列表只有名称等信息，没有精确播放 ID，本轮不加入只能浏览的入口 |
| 高级语音 | NewUI `ws.js` 的唤醒词、灵敏度、IOT_API 等 `arg2=10` 消息，广播、歌单与个性电台指令发往语音服务 | 不移植 |

可复核的网页原件位于 [`upstream/original/newui/js/ws.js`](../upstream/original/newui/js/ws.js)、
[`panel-music.js`](../upstream/original/newui/js/panel-music.js) 和
[`r1_control.min.js`](../upstream/original/js/r1_control.min.js)。
“依赖 Unisound”指设备端语音服务及对应扩展接口，不代表所有功能都必须登录音乐平台，
也不保证任意原厂版本都支持修改版扩展。EchoService 自身不能替代这些处理程序。

## 请求关联与会话隔离

`requestDevice` 给请求分配当前会话内唯一的 `type_id`，拒绝错误码、超时和断线请求。
组件另外检查自身生命周期和操作代次，避免延迟扫描或配置回包覆盖新页面/新设备。
