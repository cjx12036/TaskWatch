# TaskWatch launch materials / 发布素材

These are ready-to-copy drafts for a public early-preview launch. They describe the product's intended workflow; they are not recordings, screenshots, model output, or evidence from a live evaluation.

以下内容是早期预览版公开发布时可直接复制的草稿。它们描述的是产品的预期工作方式，不是录屏、截图、模型输出，也不是来自真实线上评估的证据。

## English post draft

Your coding agent is busy. Is it still building what you asked for?

A small personal-ledger fix can quietly become a multi-tenant microservice plan. Before accepting that expansion, ask whether it is still the task you gave the agent.

TaskWatch is an early-preview plugin for DeepSeek Harness. It keeps your original request, the agent's visible execution evidence, and the supervisor's interpretation separate, so a model guess cannot quietly become a new instruction.

Start in observe mode: reports stay with you. Coach is opt-in and scoped to a consenting running task. A clear, evidence-backed execution deviation may be steered automatically to a running main Agent; suggestions about goals, permissions, cost, irreversible action, or another material tradeoff wait for your approval. It does not wake an ended agent.

Install: `dsh plugin --profile web add github:cjx12036/TaskWatch`

Repository: https://github.com/cjx12036/TaskWatch

Feedback: https://github.com/cjx12036/TaskWatch/issues/new?template=feedback.yml

Verified limit: installation and sidebar UI flows were smoke-checked on DSH 0.1.5-rc.3 with zero model calls. Live supervision generation and coach have not been validated on that host.

We are looking for 5–10 testers who can share feedback on installation, false positives, missed deviations, and whether the reports are useful. Please do not include private prompts, logs, or keys.

## 中文推广文案

Agent 很忙，但忙的还是你想做的事吗？

一个个人账本的小修复，可能悄悄演变成多租户微服务方案。接受这种扩展前，先确认它是否仍是你交给 Agent 的任务。

TaskWatch 是 DeepSeek Harness 的早期预览插件。它把你的原始要求、Agent 可见的执行证据与监督器的理解分开保存，避免模型猜测悄悄变成新的指令。

先从 observe 开始：报告只通知你。Coach 必须显式开启，只面向已同意且仍在运行的 task；有明确证据支撑的执行偏差，可能自动 steer 给运行中的主 Agent。涉及目标、权限、成本、不可逆操作或其他重要取舍的建议，会等待你批准。它不会唤醒已结束的 Agent。

安装：`dsh plugin --profile web add github:cjx12036/TaskWatch`

仓库：https://github.com/cjx12036/TaskWatch

反馈：https://github.com/cjx12036/TaskWatch/issues/new?template=feedback.yml

已验证的边界：DSH 0.1.5-rc.3 上已完成安装和侧栏界面流程的零模型调用冒烟检查；该宿主上的实时监督生成与 coach 尚未验证。

我们希望邀请 5–10 位测试者反馈安装、误报、漏报，以及报告是否有用。请勿提交私有提示词、日志或密钥。

## 45–60 second recording storyboard / 45–60 秒录制脚本

**Planned example only — do not present this as model output or a validated live result.** Record the actual behavior from a real, approved experiment before publishing any demo; if an assessment is absent or fails, show that honestly.

**以下仅为计划示例，不能当作模型输出或已验证的线上结果。** 发布演示前，请录制真实且获批准的实验；若评估没有产生或失败，也应如实呈现。

| Time | On-screen action / 屏幕动作 | Narration / 旁白 |
| --- | --- | --- |
| 0–7s | Show a fresh DSH workspace and the TaskWatch sidebar. Do not show private conversations or logs. / 展示全新的 DSH 工作区和 TaskWatch 侧栏；不要展示私有对话或日志。 | “Your coding agent is busy. Is it still building what you asked for?” / “Agent 很忙，但忙的还是你想做的事吗？” |
| 7–16s | Show an approved, non-sensitive task asking for a small personal-ledger fix, then its consent flow. / 展示一个已批准且非敏感的 task：只修复个人账本中的小问题；再展示同意流程。 | “TaskWatch only observes after project and task consent.” / “只有 project 和 task 都同意后，TaskWatch 才会开始观察。” |
| 16–28s | Show the agent's planned expansion to a multi-tenant, microservice-style approach and the available evidence. / 展示 Agent 计划扩展为多租户、微服务式方案，以及可用证据。 | “The question is not whether more architecture is impressive. It is whether it is still the requested work.” / “问题不是架构是否更复杂，而是它是否仍是用户要求的工作。” |
| 28–40s | Show TaskWatch asking or surfacing the tradeoff: keep the narrow fix, or approve the larger design. Capture only behavior that actually occurs. / 展示 TaskWatch 提出或呈现取舍：保持小修复，还是批准更大的设计；只录制真实发生的行为。 | “A recommendation is advice from available evidence. It does not change the request or prove the work is correct.” / “建议基于现有证据，只是建议；它不会改写原始要求，也不能证明工作正确。” |
| 40–52s | Show the user's real clarification in the approved experiment, then show the resulting visible state. If no result appears, show the absence or error. / 展示用户在已批准实验中的真实澄清，再展示随后可见的状态；若没有结果，请展示缺失或错误。 | “The user decides whether the broader plan is in scope.” / “是否接受更大的方案，由用户决定。” |
| 52–60s | Show the install command, early-preview notice, and feedback destination. / 展示安装命令、早期预览说明和反馈入口。 | “This is an early preview. Please share redacted feedback.” / “这是早期预览版，欢迎提交已脱敏的反馈。” |

## Author checklist / 发布者检查清单

- [ ] Record a real demonstration with an approved, non-sensitive task; do not reuse private development cases. / 用已批准且非敏感的 task 录制真实演示；不得复用私有开发案例。
- [ ] Obtain explicit approval for the live experiment's task scope, model provider, maximum budget, and any data that leaves the machine. / 明确批准线上实验的 task 范围、模型 provider、最高预算，以及任何会离开本机的数据。
- [ ] Keep coach disabled unless the approved experiment specifically includes coach; preserve the real consent flow in the recording. / 除非已批准的实验明确包含 coach，否则保持关闭；录制中保留真实的同意流程。
- [ ] Verify every statement in the post and release notes against the exact version being published. / 依据将要发布的确切版本核对推广文案和发布说明中的每一项表述。
- [ ] Recruit 5–10 early testers and direct them to structured feedback. / 招募 5–10 位早期测试者，并引导他们提交结构化反馈。
- [ ] Ask testers not to include private prompts, conversation transcripts, tool logs, credentials, or API keys. / 告知测试者不要提交私有提示词、对话转录、工具日志、凭据或 API 密钥。
- [ ] Publish only after the export, documentation checks, and privacy gate have been rerun for the release candidate. / 仅在为候选发布版本重新运行导出、文档检查和隐私门禁后再发布。
