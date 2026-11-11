# upstream/ 维护约定

继承根目录 AGENTS.md，所有开发仍在 master。

- 改动前先读本目录 README.md、source.json 和 patches.json。
- 原作者原件只保存在 original/；保持原始字节、内部目录、文件名、变量和格式，不做全量重构。
- 本目录的 README.md、AGENTS.md、清单、补丁、overlays/ 和 sync.py 是本地维护文件。
- 部署适配编辑 patches.json 或 overlays/；运行 sync.py check 校验原件与补丁，运行 sync.py build 生成 dist/upstream/。
- 生成结果不提交 Git；不要把它覆盖回 original/。完整发布使用 npm run build。
- 合并更新按 README 的候选抓取、三方比较、导入、校验和提交流程进行。
- 不以独立新版代码或历史改造版代替原作者原件；业务功能放在独立新站。
- 用户当前明确的指令优先；这些约定不额外要求反复确认。
