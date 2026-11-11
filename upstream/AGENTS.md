# upstream/ 维护约定

继承根目录 AGENTS.md，所有开发仍在 master。

- 改动前先读本目录 README.md、tools/upstream/source.json 和 patches.json。
- 这里是生成的原作者参考版；README.md、AGENTS.md 由本地维护，其余文件不要直接手改。
- 原始字节在 tools/upstream/snapshot/。保持原作者目录、文件名、变量与格式；不要在这里执行全量重构或格式化。
- 修改部署适配应编辑 tools/upstream/patches.json 或 overlays/，然后执行 sync.py build 和 check。
- 合并更新按 README 的候选抓取、三方比较、校验、验证和提交流程进行。
- 不以独立新版代码或历史改造版代替原作者原件；业务功能放在独立新站。
- 用户当前明确的指令优先；这些约定不额外要求反复确认。
