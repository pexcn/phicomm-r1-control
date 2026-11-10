# 线上新增能力的协议摘要

来源、覆盖和迁移顺序见 [主报告](upstream-analysis-2026-11-10.md)。
此文档记录发布前端实际构造的请求，不是已经验证的音箱服务协议规范。
以下所有新接口仍需真实设备或服务端实现核对；没有发送设备命令。

## 队列及搜歌

根页面 `sendAction(what, arg1, arg2, obj)` 发送：

```json
{"type":"send_message","what":4,"arg1":28,"arg2":-1,"obj":"{\"from\":1,\"to\":0}"}
```

注意 `obj` 在这些队列操作中是 JSON **字符串**。
部分操作是复用既有协议；不能把此表的每个数值都当成服务端新增命令。

| 操作 | what | arg1 | arg2 | obj 的内容 | 发布代码位置 |
| --- | --- | --- | --- | --- | --- |
| 播放搜索结果/整页 | 4 | 15 | -1 | `curItemId`、`index`、`itemList` | `createMusicSearchDialog` |
| 队尾追加 | 4 | 19 | -1 | `curItemId`、`pageIndex:1`、`itemList` | `createMusicSearchDialog` |
| 下一首插队 | 4 | 27 | -1 | 单首歌曲对象 | `showQueueMoveDialog`、`createMusicSearchDialog` |
| 队列移动 | 4 | 28 | -1 | `from`、`to`，代码使用从 0 开始的索引 | `showQueueMoveDialog`、`attachQueueRowDrag` |
| 队列删除 | 4 | 29 | -1 | `index` | `confirmQueueRemove` |

搜索结果歌曲对象包含 `itemId`、`title`、`artist`、`album`、`albumUrl`、
`itemType`；未安装/不可用 Unisound 时还会加上 `/music?url=<编码歌曲ID>` 播放地址。
执行后会请求 `{ "type": "list" }` 刷新列表。

能力判断来自 `hasMusicQueueCapability`：当前连接实际确认版本至少 `1887`，
且确认 IP、socket 与当前连接一致。异步操作还通过 `isMusicQueueContextCurrent`
检查 epoch。版本、断线和换机失效分支已用提取函数的合成状态探针验证。

搜索请求：

```text
GET https://r1.wxfsq.com/music?keyword=<关键词>&source=<qq|kuwo|netease>&page=<页号>
```

已观察到的成功结构为 `code=1`、`data.page`、`data.page_size`、
`data.source`、`data.list`；每项包括 `id/name/artist/link/pic`。
本次仅测试 QQ 来源第 1 页，不能把其他来源、分页终点和播放成功列为已验证。
新 UI 对应的是同源 `/api/music/search`，不能把该相对路径直接当作静态站点文件。

## 服务开关、音量及 MiPlay

| 能力 | 请求/字段 | 版本依据 | 位置 |
| --- | --- | --- | --- |
| 独立蓝牙服务开关 | `type: Set_Bluetooth_Open`、`open: boolean`；状态 `info.bluetooth_open` | 控件 `min_ver:1887` | 按钮配置表 |
| MiPlay 服务开关 | `type: Set_MiPlay_Open`、`open: boolean`；状态 `info.miplay_open` | 开关自身未声明 `min_ver`；存在比较 1882 的辅助函数，但本次主脚本未见其调用 | 按钮配置表、`readMiPlayAvailable` |
| 投放服务常开 | `type: Set_Service_Normally_Open`、`open: boolean` | 控件 `min_ver:1840`，基线已有；现文案扩大范围 | 按钮配置表 |
| 扬声器音量 | `type: setMixerValue`、`controlName: DAC Digital Volume L/R`、`value`，与 `get_eq_config` 放进 `sends.list` | 显示门槛 `1876`；滑块范围 211..251，默认参考值 237 | `renderSpeakerVolume` |
| 本机/远端声道 | `Set_MiPlay_Channel` 使用 `mode`；`Set_MiPlay_Remote_Channel` 同时发送 `mode`、`channel`、`ip` | 前端没有提供全部命令的可靠最低版本表 | `createMiPlayAdvDialog` |
| 本机/远端队列水位 | `Set_MiPlay_Tuning` / `Set_MiPlay_Remote_Tuning`、`queue_target_ms`，远端另有 `ip` | 同上；界面有重置 800 ms 操作 | `createMiPlayAdvDialog` |
| 同步延迟 | `Set_MiPlay_Sync_Delay` / `Set_MiPlay_Remote_Sync_Delay`，字段 `sync_delay_ms`，远端另带 `ip` | 前端限制 -500..500 整数毫秒；提示正值晚播、负值早播，实际效果未验证 | `createMiPlayAdvDialog` |
| 分组 | `Set_MiPlay_Group` / `Set_MiPlay_Group_Auto` | 必须核对实际服务支持 | `createMiPlayGroupDialog` |
| 诊断 | `Get_MiPlay_Diag`、`Get_MiPlay_Remote_Diag`、`Get_MiPlay_Paired_Diag`、`Get_Lan_Devices` | 未执行设备请求 | MiPlay 设置与分组函数 |

声道值为 `0=立体声`、`1=仅左`、`2=仅右`，来自界面选项。
不能把 `readMiPlayAvailable` 的 1882 判断扩展为所有 MiPlay 命令均兼容 1882。
该函数对无法解析的版本返回 true；它在本次主脚本中未见调用，
不能据此认定线上正在执行该版本门槛。

## 系统信息、DSP、上传

- CPU 温度：在 `ver >= 1853` 的设备信息批量请求中增加 `shell`，
  读取 `/sys/class/hwmon/hwmon0/device/temp0_input`，关联 `type_id:cpu_temp`。
  这只是当前前端指定的节点，不能保证所有固件都存在。
- 实际编译时间：从设备信息的 `build_timestamp` 取毫秒数，校验为有效数字后
  格式化成 UTC+08；显示还要求当前确认版本/IP/socket 有效。
  作者日志标注依赖 1888，本次 `refresh.js` 仍公布 EchoService 1887。
- DSP：`ver >= 1869` 时使用 `sendAction(16384,100,0,开关值)`，
  另查 `persist.route0feture` 与 `tinymix -D 2 "DSP Firmware PRAM"`。
  旧路径直接写设备 property；不能据此推导统一的最低支持版本或音效结果。
- 上传：根页面只负责打开设备 `/upload`，并通过 postMessage 交换背景资料。
  该分支检查窗口、来源、nonce、消息类型并设置超时；没有取得设备的上传页源码。
  作者声明的上传/安装进度不能由控制页这段代码独自验证。

## 后续回归的最小集合

1. 旧设备、未知设备版本和伪造 URL 版本不会启用新增队列能力。
2. 搜索、弹窗和拖动操作在断线/换机后停止，旧响应不作用于新连接。
3. `obj` 字符串编码、完整歌曲 ID、从 0 开始的索引与设备响应一致。
4. 无 Unisound、暂停拖动进度、长队列、服务开关状态刷新分别通过真机检查。
5. 自部署域名的音乐 API、WebSocket 和 Android 桥不存在时给出可理解的失败提示。
