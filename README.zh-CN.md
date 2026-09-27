# TaskWatch

[English](README.md)

TaskWatch 是 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 的任务意图监督插件。它检查 Agent 的执行是否仍在推进用户真正要完成的任务，并将用户原话、模型理解、执行证据与监督建议分开保存，避免模型推测悄然变成新指令。

TaskWatch 是独立的 DSH 插件，不代表也未获得 DeepSeek 的认可或背书。

## 能做什么

TaskWatch 用三层信息理解一个 task：

1. **意图（Intent）**：原始用户消息、明确要求，以及与其分开版本化的模型推测。
2. **证据（Evidence）**：绑定 task 的公开对话和工具证据；缺失、超时、截断和过期结果会被明确标出。
3. **监督（Supervision）**：把证据与任务意图相比较后生成的判断和建议。它们不会覆盖用户原话，也不会扩大授权。

侧栏会显示当前目标、要求、取舍、用量和报告。侧栏中的监督对话只更新 TaskWatch 自己的理解，不会给主 Agent 发送消息，也不会改写主 task 的输入。

### observe 与 coach

**Observe** 是默认的监督方式：报告只通知你，不会向主 Agent 发送消息。

**Coach** 需要明确同意。你需要在 project 级别显式开启 coach，而且 task 必须已同意监督才具备资格。当 project coach 已开启时，新 task 同意弹窗会明确披露：有明确证据支撑的执行偏差可能自动 steer 给运行中的主 Agent。接受带有此披露的同意框，会同时给予监督同意和该 task 的 coach 同意。已经绑定的 task 在开启 project coach 后仍需单独点击 **同意使用 coach**。

Coach 只可能自动 steer 有明确证据支撑的执行偏差，并且只发送给仍在运行的主 Agent。涉及目标、权限、成本、不可逆操作或其他重要取舍的建议，必须由你逐条确认。TaskWatch 会保留 coach 消息的插件来源，去重、检查时效并限制发送频率；它不会唤醒已经结束的主 Agent。

## 安装

从 GitHub 将 TaskWatch 安装到 DSH profile。以下示例使用标准 `web` profile：

```sh
dsh plugin --profile web add github:cjx12036/TaskWatch
```

用你平时的 DSH 启动命令重启 `web` profile，然后打开 TaskWatch 侧栏。如需排查安装，可在启动前确认配置：

```sh
dsh --profile web --dump-config
```

输出中应出现 `dsh-taskwatch`。TaskWatch 随包提供预构建客户端，不需要 TaskWatch 安装时构建或 prepare hook。安装前请审阅插件源码。

## 首次使用

1. 打开 TaskWatch，进入 **设置（Settings）**。
2. 选择并保存监督 provider 与 model，再显式允许监督模型调用。仅保存设置不会启用任何 project 或 task。
3. 为当前 project 启用监督。
4. DSH 弹出 task 同意框时，为这个具体 task 选择 **启用监督（Enable supervision）**。若 project coach 已开启，请先阅读弹窗中的明确 coach 披露；接受这个披露过的同意框也会给予新 task 的 coach 同意。跳过一个 task 不影响后续 task。
5. 在侧栏查看报告；需要时可以暂停或继续这个 task 的 observe。
6. 如需 coach，请显式为 project 开启 coach，并按上文为每个适用 task 给出 coach 同意。

安装插件不会开始 observe，也不会调用 model。只有 project 已启用且每个 task 分别同意后，TaskWatch 才会监督该 task。

## 数据、同意与模型用量

在 project 和 task 都已同意后，TaskWatch 会读取该 task 的公开对话和公开工具证据，并将这些材料发送给你选择的监督 provider 与 model。provider 可能按自身条款和实际用量收费。TaskWatch 显示已知用量，并将无法取得的用量标为未知；请为自己的账户选择合适的 model 与限制。

TaskWatch 不读取隐藏推理，监督 Agent 也没有执行工具。证据可能不完整：超时、缺失或截断事件、过期结果、预算耗尽和请求失败都会明确显示，不会伪装成正常判断。模型判断只是根据现有证据给出的建议，不能保证执行正确或任务已经完成。

### 本地存储

私有账本默认保存在 `~/.dsh/taskwatch/ledger.sqlite`。非空白的 `DSH_HOME` 会将位置设为 `$DSH_HOME/taskwatch/ledger.sqlite`，例如用 `DSH_HOME="$HOME/.dsh-private"` 启动 DSH。支持的 `~`、`~/` 和 `~\` 前缀会展开为操作系统用户主目录；空白 `DSH_HOME` 使用默认值，相对路径会被拒绝。自动存储位置必须在插件包、启动工作目录和已配置的 `workspacePath` 之外，检查包含现有符号链接的实际目标；位置不安全或无法解析时，初始化会报错停止。从用户主目录启动时仍允许标准 `~/.dsh` 位置，但如果将该主目录明确配置为工作区，则仍会拒绝。这个启动检查覆盖已知路径，不覆盖未来会话的未知工作区。

若要继续使用已有账本或指定其他位置，可设置 TaskWatch 插件配置中的 `dbPath`，例如 `/path/to/private/taskwatch/ledger.sqlite`。显式 `dbPath` 会原样保留，包括已有的相对路径行为，请自行明确选择其位置。更改存储配置或移除插件都不会自动迁移或删除账本。新建账本目录权限为 `0700`，数据库文件权限为 `0600`。

## 兼容性与限制

开发回归测试使用 DSH `0.1.1-rc.2`。干净导出的 bundle 已在隔离的 DSH `0.1.5-rc.3`、Node.js `26.0.0` 上通过安装、启动、侧栏状态、语言切换和模型设置冒烟测试，全程零模型调用。这仅验证安装及这些界面路径，不代表新版宿主上的真实监督或 coach 行为已验证；peer 声明只列出这两个版本。TaskWatch 不宣称 benchmark 成绩或质量结果。

新版宿主的旧 channel 注册在跨插件作用域时失败，因此 TaskWatch 使用公开的已认证 Fetch route API，同时保留只允许本机回环 Host/Origin 的检查和 64 KiB 请求限制；旧版继续使用回环 RPC channel。客户端只接受服务端公布的传输方式。TaskWatch 接口不支持远程访问。

插件需要带 web client 的 DSH，以及 Node.js `>=22.23.2`。它只监督经过同意流程显式绑定的 task；DSH 没有公开的证据无法恢复，主 Agent 已结束时 coach 也无法投递。

## 卸载

从 profile 移除 TaskWatch 后重启该 profile：

```sh
dsh plugin --profile web remove dsh-taskwatch
```

卸载会修改 DSH profile，但不会迁移或删除既有的本地 TaskWatch ledger。

## 开发

发布 bundle 位于 `release/`。安装依赖后，使用它的 package manifest 声明的命令：

```sh
npm ci --ignore-scripts
npm test
```

可单独运行公开文档测试：

```sh
node --test tests/public-docs.test.mjs
```

## 许可证

[MIT](LICENSE) © 2026 cjx12036。
