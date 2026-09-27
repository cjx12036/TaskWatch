(() => {
  // plugins/taskwatch/i18n.mjs
  var english = {
    "goal.modify": "Modify {target}",
    "goal.add": "Add {target}",
    "goal.update": "Update {target}",
    "goal.remove": "Remove {target}",
    "goal.switchPhase": "Switch phase to {name}",
    "punctuation.closeCount": ")",
    "punctuation.colon": ": ",
    "punctuation.semicolon": "; ",
    "punctuation.list": ", ",
    "ui.observing": "Observing",
    "ui.checking": "Checking",
    "ui.completed": "Completed",
    "ui.paused": "Paused",
    "ui.automatic.supervision.is.off": "Automatic supervision is off",
    "ui.waiting.to.bind": "Waiting to bind",
    "ui.waiting.to.resume": "Waiting to resume",
    "ui.check.completed": "Check completed",
    "ui.recent.evidence.checked": "Recent evidence checked",
    "ui.assessment.incomplete": "Assessment incomplete",
    "ui.too.much.evidence.review.not.completed": "Too much evidence; review not completed",
    "ui.waiting.for.a.user.task": "Waiting for a user task",
    "ui.budget.exhausted": "Budget exhausted",
    "ui.result.expired": "Result expired",
    "ui.check.failed": "Check failed",
    "ui.request.timed.out": "Request timed out",
    "ui.waiting.for.goal.understanding": "Waiting for goal understanding",
    "ui.clarification.needed": "Clarification needed",
    "ui.incomplete.evidence": "Incomplete evidence",
    "ui.insufficient.evidence": "Insufficient evidence",
    "ui.invalid.model.response.format": "Invalid model response format",
    "ui.report.could.not.be.saved": "Report could not be saved",
    "ui.understanding.updated": "Understanding updated",
    "ui.replied": "Replied",
    "ui.checking.please.retry.shortly": "Checking; please retry shortly",
    "ui.request.stopped": "Request stopped",
    "ui.the.model.response.did.not.finish.no.usable.assessment.is.available": "The model response did not finish; no usable assessment is available.",
    "ui.the.model.did.not.return.a.valid.structured.response": "The model did not return a valid structured response.",
    "ui.the.response.does.not.match.this.check": "The response does not match this check.",
    "ui.the.check.request.failed.isolation.validation": "The check request failed isolation validation.",
    "ui.the.model.check.did.not.complete": "The model check did not complete.",
    "ui.the.model.request.or.execution.failed": "The model request or execution failed.",
    "ui.resource.cleanup.after.the.check.is.still.pending": "Resource cleanup after the check is still pending.",
    "ui.connection.failed": "Connection failed",
    "ui.input": "Input ",
    "ui.output": " · Output ",
    "ui.calls": " · Calls ",
    "ui.no.records.yet": "No records yet",
    "ui.requirements": "Requirements",
    "ui.success.criteria": "Success criteria",
    "ui.acceptance.criteria": "Acceptance criteria",
    "ui.ongoing.constraints": "Ongoing constraints",
    "ui.non.goals": "Non-goals",
    "ui.priorities": "Priorities",
    "ui.modify": "Modify ",
    "ui.project.purpose": "Project purpose",
    "ui.phase.goal": "Phase goal",
    "ui.current.task": "Current task",
    "ui.add": "Add ",
    "ui.item": "item",
    "ui.update": "Update ",
    "ui.remove": "Remove",
    "ui.switch.phase.to": "Switch phase to ",
    "ui.supervision.paused": "Supervision paused",
    "ui.resume.observation.in.the.supervision.status.section.below.when.ready": "Resume observation in the supervision status section below when ready.",
    "ui.task.completed": "Task completed",
    "ui.this.task.has.ended.previous.supervision.records.remain.available": "This task has ended; previous supervision records remain available.",
    "ui.supervision.is.off": "Supervision is off",
    "ui.supervisor.model.calls.are.disabled.review.the.configuration.in.settings": "Supervisor model calls are disabled; review the configuration in settings.",
    "ui.view.settings": "View settings",
    "ui.coach.suggestions.awaiting.approval": "Coach suggestions awaiting approval",
    "ui.suggestions.may.only.arrive.while.the.main.agent.is.running.review.the.full.message.first": "Suggestions may only arrive while the main Agent is running. Review the full message first.",
    "ui.view.coach.suggestions": "View coach suggestions",
    "ui.tradeoff.awaiting.your.answer": "Tradeoff awaiting your answer",
    "ui.please.confirm.the.current.tradeoff": "Please confirm the current tradeoff.",
    "ui.view.tradeoff": "View tradeoff",
    "ui.goal.changes.awaiting.confirmation": "Goal changes awaiting confirmation",
    "ui.the.supervision.goal.will.not.change.until.confirmed": "The supervision goal will not change until confirmed.",
    "ui.view.goal.changes": "View goal changes",
    "ui.shared.goal.candidates.awaiting.confirmation": "Shared goal candidates awaiting confirmation",
    "ui.compare.the.project.purpose.candidate.with.the.original.user.messages": "Compare the project purpose candidate with the original user messages.",
    "ui.compare.the.current.phase.candidate.with.the.original.user.messages": "Compare the current phase candidate with the original user messages.",
    "ui.view.goal.candidates": "View goal candidates",
    "ui.review.the.latest.supervision.report.and.rejected.items.below": "Review the latest supervision report and rejected items below.",
    "ui.check.incomplete": "Check incomplete",
    "ui.review.the.latest.supervision.report.and.error.reason.below": "Review the latest supervision report and error reason below.",
    "ui.waiting.for.the.next.checkpoint": "Waiting for the next checkpoint",
    "ui.supervisor.understanding.was.updated.it.will.be.reviewed.at.the.next.main.task.checkpoint": "Supervisor understanding was updated; it will be reviewed at the next main-task checkpoint.",
    "ui.there.is.nothing.requiring.your.attention.right.now.this.updates.after.a.new.public.reply.": "There is nothing requiring your attention right now; this updates after a new public reply or checkpoint.",
    "ui.none": "None",
    "ui.acceptance": " · Acceptance: ",
    "ui.previous": "Previous: ",
    "ui.none.new": "None (new)",
    "ui.proposed": "Proposed: ",
    "ui.shared.goal.changes.awaiting.confirmation": "Shared goal changes awaiting confirmation",
    "ui.view.original.user.messages": "View original user messages",
    "ui.confirmation.only.updates.the.supervision.goal.it.is.not.sent.to.the.main.agent": "Confirmation only updates the supervision goal; it is not sent to the main Agent.",
    "ui.confirm.changes": "Confirm changes",
    "ui.dismiss": "Dismiss",
    "ui.project.purpose.candidate": "Project purpose candidate",
    "ui.current.phase.candidate": "Current phase candidate",
    "ui.basis": "Basis",
    "ui.inferred.across.tasks": "Inferred across tasks",
    "ui.explicit.user.statement": "Explicit user statement",
    "ui.clarification.neededAlt": "Clarification needed",
    "ui.view.original.user.messagesAlt": "View original user messages (",
    "ui.task": "Task ",
    "ui.confirm.supervision.goal.update": "Confirm supervision goal update",
    "ui.local.candidate.capture.failed.the.supervision.result.was.retained": "Local candidate capture failed; the supervision result was retained.",
    "ui.local.feedback.capture.failed.your.card.action.was.saved": "Local feedback capture failed; your card action was saved.",
    "ui.assessment.incomplete.only.validated.items.are.shown": "Assessment incomplete: only validated items are shown.",
    "ui.rejected.item": "Rejected item ",
    "ui.evidence": "Evidence ",
    "ui.expand.public.record": "Expand public record",
    "ui.this.public.record.is.unavailable.execution.cannot.be.verified.from.this.reference": "This public record is unavailable; execution cannot be verified from this reference.",
    "ui.this.public.record.was.truncated": "This public record was truncated.",
    "ui.overall.goal": "Overall goal",
    "ui.tradeoff.requiring.your.confirmation": "Tradeoff requiring your confirmation",
    "ui.processing.answer": "Processing answer…",
    "ui.impact": "Impact",
    "ui.source": "Source",
    "ui.execution.evidence": "Execution evidence",
    "ui.proposal.understanding": "Proposal understanding",
    "ui.related.requirement": "Related requirement",
    "ui.your.answer": "Your answer: ",
    "ui.last.attempt.incomplete": "Last attempt incomplete: ",
    "ui.answers.only.update.supervisor.understanding.and.are.not.sent.to.the.main.agent": "Answers only update supervisor understanding and are not sent to the main Agent.",
    "ui.enter.your.tradeoff.choice": "Enter your tradeoff choice",
    "ui.answer": "Answer",
    "ui.later": "Later",
    "ui.ignore": "Ignore",
    "ui.clarification.card.history": "Clarification card history (",
    "ui.status": "Status",
    "ui.report": "Report",
    "ui.version": "Version",
    "ui.main": "Main ",
    "ui.evidenceAlt": " · Evidence ",
    "ui.supervisor": " · Supervisor ",
    "ui.question": "Question",
    "ui.requirement.reference.at.the.time": "Requirement reference at the time",
    "ui.original.answer": "Original answer",
    "ui.answer.status": "Answer status",
    "ui.shared.goal.candidate.extraction": "Shared goal candidate extraction",
    "ui.only.original.user.messages.from.bound.tasks.are.used.candidates.do.not.change.supervision": "Only original user messages from bound tasks are used. Candidates do not change supervision goals until confirmed; new model calls count toward usage above.",
    "ui.statusAlt": "Status: ",
    "ui.enabled": "Enabled",
    "ui.disabled": "Disabled",
    "ui.disable.automatic.candidate.extraction": "Disable automatic candidate extraction",
    "ui.enable.automatic.candidate.extraction": "Enable automatic candidate extraction",
    "ui.preview.historical.scan.scope": "Preview historical scan scope",
    "ui.bound.tasks": "Bound tasks",
    "ui.estimated.base.calls": "Estimated base calls",
    "ui.estimated.source.bytes": "Estimated source bytes",
    "ui.model": "Model",
    "ui.user.messages": " user messages · ",
    "ui.with.time.evidence": " with time evidence",
    "ui.formal.goal": "Formal goal",
    "ui.none.yet": "None yet",
    "ui.time.unknown": "Time unknown",
    "ui.confirm.sending.these.materials.to.generate.candidates": "Confirm sending these materials to generate candidates",
    "ui.controlled.coaching": "Controlled coaching",
    "ui.when.project.coach.is.enabled.only.tasks.with.supervision.consent.are.eligible.clear.execu": "When project coach is enabled, only tasks with supervision consent are eligible. Clear execution deviations may trigger automatic steering; each tradeoff requires your approval. Messages are only delivered to a running main Agent.",
    "ui.project.switch": "Project switch",
    "ui.disable.coach": "Disable coach",
    "ui.enable.coach": "Enable coach",
    "ui.consent.to.coach.for.this.existing.task": "Consent to coach for this existing task",
    "ui.clear.deviation.alert": "Clear deviation alert",
    "ui.suggestion.requiring.approval": "Suggestion requiring approval",
    "ui.expired": "Expired",
    "ui.full.message.to.send": "Full message to send",
    "ui.confirm.sending.to.the.running.main.agent": "Confirm sending to the running main Agent",
    "ui.choose.and.save.a.model.first.the.project.and.each.new.task.need.separate.consent.before.p": "Choose and save a model first. The project and each new task need separate consent before public text and tool evidence from that task are observed and sent.",
    "ui.allow.supervisor.model.calls": "Allow supervisor model calls",
    "ui.model.calls.are.billed.by.the.provider.based.on.actual.usage.saving.model.settings.does.no": "Model calls are billed by the provider based on actual usage. Saving model settings does not enable any project or task automatically.",
    "ui.current.project": "Current project",
    "ui.unknown.project": "Unknown project",
    "ui.disable.supervision.for.this.project": "Disable supervision for this project",
    "ui.enable.for.this.project": "Enable for this project",
    "ui.supervision.is.not.enabled.for.this.task": "Supervision is not enabled for this task",
    "ui.waiting.for.a.task.to.start": "Waiting for a task to start",
    "ui.choose.and.save.a.supervision.model.in.settings.first": "Choose and save a supervision model in settings first.",
    "ui.supervisor.model.calls.are.disabled.enable.them.in.settings": "Supervisor model calls are disabled; enable them in settings.",
    "ui.enable.the.current.project.first": "Enable the current project first.",
    "ui.choose.whether.to.enable.supervision.in.the.task.consent.dialog": "Choose whether to enable supervision in the task consent dialog.",
    "ui.you.skipped.this.task.new.tasks.will.ask.again": "You skipped this task; new tasks will ask again.",
    "ui.subtasks.do.not.enable.supervision.separately": "Subtasks do not enable supervision separately.",
    "ui.create.or.open.a.main.task.to.choose": "Create or open a main task to choose.",
    "ui.waiting.for.this.task.s.first.user.message": "Waiting for this task's first user message.",
    "ui.reading.binding.status": "Reading binding status…",
    "ui.current.projectAlt": "Current project: ",
    "ui.messages.here.only.affect.supervisor.understanding.the.main.agent.does.not.receive.them": "Messages here only affect supervisor understanding; the main Agent does not receive them.",
    "ui.you": "You",
    "ui.you.can.ask.why.does.this.step.appear.to.deviate.from.the.goal.or.switch.to.correcting.und": "You can ask, “Why does this step appear to deviate from the goal?” Or switch to correcting understanding to describe what you want to accomplish.",
    "ui.tradeoffs.awaiting.confirmation": "Tradeoffs awaiting confirmation",
    "ui.there.are.no.tradeoffs.awaiting.confirmation": "There are no tradeoffs awaiting confirmation.",
    "ui.resume.observation": "Resume observation",
    "ui.pause.observation": "Pause observation",
    "ui.bound.task": "Bound task: ",
    "ui.last.check": "Last check: ",
    "ui.user.message": "User message",
    "ui.public.reply": "Public reply",
    "ui.tool.batch": "Tool batch",
    "ui.repeated.failure": "Repeated failure",
    "ui.turn.end": "Turn end",
    "ui.new.evidence.review": "New evidence review",
    "ui.historical.report": "Historical report",
    "ui.none.yetAlt": "None yet",
    "ui.queued.check": "Queued check: ",
    "ui.earliest": " · Earliest ",
    "ui.supervisor.understanding.updated.waiting.for.the.next.checkpoint": "Supervisor understanding updated; waiting for the next checkpoint.",
    "ui.project.purpose.not.yet.established": "Project purpose not yet established",
    "ui.shared.within.this.project.v": "Shared within this project · v",
    "ui.publish.to.project.agent": "Publish to project Agent",
    "ui.output.path": "Output path",
    "ui.content.summary": "Content summary",
    "ui.phase": "; Phase: ",
    "ui.not.yet.established": "Not yet established",
    "ui.taskAlt": "; Task: ",
    "ui.not.yet.defined": "Not yet defined",
    "ui.for.reference.only.this.does.not.mean.the.main.agent.has.received.new.authorization.change": "For reference only; this does not mean the main Agent has received new authorization. Changes to the private source do not automatically update this copy.",
    "ui.confirm.publishing.to.project.agent": "Confirm publishing to project Agent",
    "ui.private.source": "Private source",
    "ui.current.phase": "Current phase",
    "ui.current.phase.not.yet.established": "Current phase not yet established",
    "ui.model.proposed.user.confirmed.transitions.v": "Model proposed, user confirmed transitions · v",
    "ui.phase.history": "Phase history (",
    "ui.unnamed.phase": "Unnamed phase",
    "ui.in.progress": "In progress",
    "ui.archived": "Archived",
    "ui.supervisor.correction": "Supervisor correction",
    "ui.supervisor.understanding.only.not.sent.to.the.main.agent": "Supervisor understanding only · Not sent to the main Agent",
    "ui.based.on.the.main.conversation.intent.ledger": "Based on the main conversation intent ledger",
    "ui.view.complete.user.message": "View complete user message",
    "ui.awaiting.extraction": " · Awaiting extraction",
    "ui.current.execution.evidence": "Current execution evidence",
    "ui.total.events": "Total events",
    "ui.included.this.time": "Included this time",
    "ui.omitted": "Omitted",
    "ui.truncated": "Truncated",
    "ui.the.current.window.is.truncated.public.records.can.be.viewed.as.needed": "The current window is truncated; public records can be viewed as needed.",
    "ui.load.earlier.public.records": "Load earlier public records",
    "ui.view.recent.public.records": "View recent public records",
    "ui.requirements.and.supervisor.corrections": "Requirements and supervisor corrections",
    "ui.sidebar.correction": "Sidebar correction",
    "ui.historical.correction.main.task.has.changed": "Historical correction; main task has changed",
    "ui.versionAlt": " · Version ",
    "ui.not.sent.to.the.main.agent": " · Not sent to the main Agent",
    "ui.requirement": "Requirement ",
    "ui.constraint": "Constraint ",
    "ui.supervisor.clarification.needed": "Supervisor clarification needed",
    "ui.clarification.neededAltAlt": "Clarification needed",
    "ui.latest.supervision.report": "Latest supervision report",
    "ui.no.valid.assessment.was.produced.the.failure.status.is.retained": "No valid assessment was produced; the failure status is retained.",
    "ui.coverage.total.events": "Coverage: total events ",
    "ui.unknown": "Unknown",
    "ui.included.this.timeAlt": " · Included this time ",
    "ui.omittedAlt": " · Omitted ",
    "ui.truncatedAlt": " · Truncated ",
    "ui.partial.check.only": " · Partial check only",
    "ui.observation": "Observation",
    "ui.interpretation": "Interpretation",
    "ui.suggestion": "Suggestion",
    "ui.original.user.message": "Original user message: ",
    "ui.original.user.messageAlt": "Original user message",
    "ui.view.internal.review.records": "View internal review records (",
    "ui.no.notification.needed.for.this.check.this.does.not.mean.the.entire.task.is.complete.or.ve": "No notification needed for this check; this does not mean the entire task is complete or verified.",
    "ui.dismissed": "Dismissed",
    "ui.dismiss.this.report": "Dismiss this report",
    "ui.shared.goal.change.history": "Shared goal change history (",
    "ui.original.message": " · Original message: ",
    "ui.current.task.correction.history": "Current task correction history",
    "ui.may.send.coaching.to.a.running.main.agent": "May send coaching to a running main Agent",
    "ui.project.coach.enabled.this.task.has.not.consented": "Project coach enabled · This task has not consented",
    "ui.observe.only.no.messages.to.the.main.agent": "Observe only; no messages to the main Agent",
    "ui.inputAlt": "Input",
    "ui.no.data.yet": "No data yet",
    "ui.outputAlt": "Output",
    "ui.cache.hit": "Cache hit¹",
    "ui.callsAlt": "Calls",
    "ui.first.token": "First token",
    "ui.speed": "Speed",
    "ui.based.on.known.usage.cache.read": "¹ Based on known usage · Cache read ",
    "ui.cache.write": " · Cache write ",
    "ui.calls.with.unknown.usage": " calls with unknown usage",
    "ui.total.reserved": " · Total reserved ",
    "ui.callsAltAlt": " calls",
    "ui.recent.calls": "Recent calls (",
    "ui.intent.extraction": "Intent extraction",
    "ui.execution.review": "Execution review",
    "ui.sidebar.chat": "Sidebar chat",
    "ui.tradeoff.answer": "Tradeoff answer",
    "ui.no.request.sent": "No request sent",
    "ui.usage.unknown": "Usage unknown",
    "ui.outputAltAlt": " / Output ",
    "ui.duration.unknown": "Duration unknown",
    "ui.all.tasks.total": "All tasks total",
    "ui.chat.mode": "Chat mode",
    "ui.ask.keep.understanding.unchanged": "Ask · Keep understanding unchanged",
    "ui.correct.update.supervisor.understanding.only": "Correct · Update supervisor understanding only",
    "ui.message.to.supervisor.agent": "Message to supervisor Agent",
    "ui.ask.the.supervisor.agent": "Ask the supervisor Agent…",
    "ui.describe.the.goal.or.requirements.to.correct": "Describe the goal or requirements to correct…",
    "ui.processing": "Processing…",
    "ui.send.to.supervisor.agent": "Send to supervisor Agent",
    "ui.with.consent.taskwatch.sends.this.task.s.public.materials.to.the.supervision.model.project": "With consent, TaskWatch sends this task's public materials to the supervision model. Project coach is enabled: clear execution deviations may automatically alert the running main Agent; other tradeoffs still require your confirmation.",
    "ui.with.consent.taskwatch.reads.this.task.s.public.conversation.and.tool.evidence.and.sends.t": "With consent, TaskWatch reads this task's public conversation and tool evidence and sends them to the selected supervision model. Supervision only observes and does not message the main Agent.",
    "tabs.overview": "Status",
    "tabs.goals": "Goals",
    "tabs.tradeoffs": "Tradeoffs",
    "tabs.coach": "Coach",
    "tabs.chat": "Chat",
    "tabs.count": "{label} ({count})",
    "gear.settings": "Settings",
    "panel.sidebar": "TaskWatch sidebar",
    "panel.main": "TaskWatch supervision panel",
    "status.heading": "Supervision status",
    "status.currentTask": "Current task",
    "status.nextStep": "Next step",
    "status.observing": "Observing",
    "consent.title": "Enable supervision for this task?",
    "consent.enable": "Enable supervision",
    "consent.skip": "Skip this task",
    "bubble.collapse": "Collapse",
    "bubble.taskwatch": "TaskWatch",
    "next.none": "There is nothing requiring your attention right now; this updates after a new public reply or checkpoint.",
    "project.heading": "Project purpose",
    "phase.heading": "Current phase",
    "task.formalGoal": "Formal goal",
    "task.recentRequest": "Latest request",
    "task.waitingGoal": "Waiting to extract a goal",
    "task.waitingMessage": "Waiting for a user message",
    "task.latestMessage": "Latest user message",
    "action.pause": "Pause observation",
    "action.resume": "Resume observation",
    "settings.model": "Supervision model settings",
    "settings.heading": "Supervision model",
    "settings.chooseModel": "Choose a model",
    "settings.save": "Save model settings",
    "usage.label": "Supervisor model usage",
    "usage.current": "Supervisor usage · Current task",
    "usage.all": "Supervisor usage · All tasks",
    "error.generic": "TaskWatch request failed. Refresh and try again.",
    "error.bad-request": "TaskWatch request failed. Refresh and try again."
  };
  var chinese = {
    "goal.modify": "修改{target}",
    "goal.add": "新增{target}",
    "goal.update": "更新{target}",
    "goal.remove": "删除{target}",
    "goal.switchPhase": "切换阶段到 {name}",
    "punctuation.closeCount": "）",
    "punctuation.colon": "：",
    "punctuation.semicolon": "；",
    "punctuation.list": "、",
    "ui.observing": "正在观察",
    "ui.checking": "检查中",
    "ui.completed": "已完成",
    "ui.paused": "已暂停",
    "ui.automatic.supervision.is.off": "自动监督已关闭",
    "ui.waiting.to.bind": "等待绑定",
    "ui.waiting.to.resume": "等待恢复",
    "ui.check.completed": "已完成检查",
    "ui.recent.evidence.checked": "已检查近期证据",
    "ui.assessment.incomplete": "评估不完整",
    "ui.too.much.evidence.review.not.completed": "证据量过大，暂未完成审查",
    "ui.waiting.for.a.user.task": "等待用户任务",
    "ui.budget.exhausted": "额度不足",
    "ui.result.expired": "结果已过期",
    "ui.check.failed": "检查失败",
    "ui.request.timed.out": "请求超时",
    "ui.waiting.for.goal.understanding": "等待目标理解",
    "ui.clarification.needed": "需要澄清",
    "ui.incomplete.evidence": "证据不完整",
    "ui.insufficient.evidence": "证据不足",
    "ui.invalid.model.response.format": "模型回复格式无效",
    "ui.report.could.not.be.saved": "报告保存失败",
    "ui.understanding.updated": "理解已更新",
    "ui.replied": "已回复",
    "ui.checking.please.retry.shortly": "正在检查，请稍后重试",
    "ui.request.stopped": "请求已停止",
    "ui.the.model.response.did.not.finish.no.usable.assessment.is.available": "模型回复未完整结束，本次没有可用判断。",
    "ui.the.model.did.not.return.a.valid.structured.response": "模型未返回有效的结构化回复。",
    "ui.the.response.does.not.match.this.check": "回复与本次检查不匹配。",
    "ui.the.check.request.failed.isolation.validation": "检查请求未通过隔离校验。",
    "ui.the.model.check.did.not.complete": "模型检查未能完成。",
    "ui.the.model.request.or.execution.failed": "模型请求或运行过程失败。",
    "ui.resource.cleanup.after.the.check.is.still.pending": "检查结束后的资源清理仍未完成。",
    "ui.connection.failed": "连接失败",
    "ui.input": "输入 ",
    "ui.output": " · 输出 ",
    "ui.calls": " · 调用 ",
    "ui.no.records.yet": "暂无记录",
    "ui.requirements": "要求",
    "ui.success.criteria": "成功标准",
    "ui.acceptance.criteria": "验收标准",
    "ui.ongoing.constraints": "持续约束",
    "ui.non.goals": "非目标",
    "ui.priorities": "优先级",
    "ui.modify": "修改",
    "ui.project.purpose": "项目主旨",
    "ui.phase.goal": "阶段目标",
    "ui.current.task": "当前任务",
    "ui.add": "新增",
    "ui.item": "条目",
    "ui.update": "更新",
    "ui.remove": "删除",
    "ui.switch.phase.to": "切换阶段到 ",
    "ui.supervision.paused": "监督已暂停",
    "ui.resume.observation.in.the.supervision.status.section.below.when.ready": "需要继续时，可在下方监督状态中恢复观察。",
    "ui.task.completed": "任务已完成",
    "ui.this.task.has.ended.previous.supervision.records.remain.available": "本任务已结束；可以查看此前的监督记录。",
    "ui.supervision.is.off": "监督未开启",
    "ui.supervisor.model.calls.are.disabled.review.the.configuration.in.settings": "监督模型调用已关闭；可在设置中查看配置。",
    "ui.view.settings": "查看设置",
    "ui.coach.suggestions.awaiting.approval": "待审批的纠偏建议",
    "ui.suggestions.may.only.arrive.while.the.main.agent.is.running.review.the.full.message.first": "建议可能只在主 Agent 运行时送达，请先核对将发送的全文。",
    "ui.view.coach.suggestions": "查看纠偏建议",
    "ui.tradeoff.awaiting.your.answer": "待回答的取舍",
    "ui.please.confirm.the.current.tradeoff": "请确认当前取舍。",
    "ui.view.tradeoff": "查看取舍",
    "ui.goal.changes.awaiting.confirmation": "待确认的目标修改",
    "ui.the.supervision.goal.will.not.change.until.confirmed": "确认前不会改变监督目标。",
    "ui.view.goal.changes": "查看目标修改",
    "ui.shared.goal.candidates.awaiting.confirmation": "待确认的共享目标候选",
    "ui.compare.the.project.purpose.candidate.with.the.original.user.messages": "请核对项目主旨候选与用户原话。",
    "ui.compare.the.current.phase.candidate.with.the.original.user.messages": "请核对当前阶段候选与用户原话。",
    "ui.view.goal.candidates": "查看目标候选",
    "ui.review.the.latest.supervision.report.and.rejected.items.below": "请查看下方最近监督报告和被拒项。",
    "ui.check.incomplete": "检查未完成",
    "ui.review.the.latest.supervision.report.and.error.reason.below": "请查看下方最近监督报告和错误原因。",
    "ui.waiting.for.the.next.checkpoint": "等待下个检查点",
    "ui.supervisor.understanding.was.updated.it.will.be.reviewed.at.the.next.main.task.checkpoint": "监督理解已更新，下一次主任务检查时再复核。",
    "ui.there.is.nothing.requiring.your.attention.right.now.this.updates.after.a.new.public.reply.": "目前没有需要你处理的事项；新的公开回复或检查点后会更新。",
    "ui.none": "无",
    "ui.acceptance": " · 验收：",
    "ui.previous": "原内容：",
    "ui.none.new": "无（新增）",
    "ui.proposed": "建议内容：",
    "ui.shared.goal.changes.awaiting.confirmation": "待确认的共享目标修改",
    "ui.view.original.user.messages": "查看用户原话",
    "ui.confirmation.only.updates.the.supervision.goal.it.is.not.sent.to.the.main.agent": "确认后仅更新监督目标，未同步主 Agent。",
    "ui.confirm.changes": "确认修改",
    "ui.dismiss": "驳回",
    "ui.project.purpose.candidate": "项目主旨候选",
    "ui.current.phase.candidate": "当前阶段候选",
    "ui.basis": "依据类型",
    "ui.inferred.across.tasks": "跨任务归纳",
    "ui.explicit.user.statement": "用户明确表述",
    "ui.clarification.neededAlt": "需澄清",
    "ui.view.original.user.messagesAlt": "查看用户原话（",
    "ui.task": "任务 ",
    "ui.confirm.supervision.goal.update": "确认写入监督目标",
    "ui.local.candidate.capture.failed.the.supervision.result.was.retained": "本地候选采集失败；监督结果仍已保留。",
    "ui.local.feedback.capture.failed.your.card.action.was.saved": "本地反馈采集失败；你的卡片操作仍已保存。",
    "ui.assessment.incomplete.only.validated.items.are.shown": "评估不完整：仅展示已通过验证的项目。",
    "ui.rejected.item": "被拒项 ",
    "ui.evidence": "证据 ",
    "ui.expand.public.record": "展开公开记录",
    "ui.this.public.record.is.unavailable.execution.cannot.be.verified.from.this.reference": "此引用的公开记录不可用；不能据此确认执行情况。",
    "ui.this.public.record.was.truncated": "该公开记录已截取。",
    "ui.overall.goal": "整体目标",
    "ui.tradeoff.requiring.your.confirmation": "需要你确认的取舍",
    "ui.processing.answer": "回答处理中…",
    "ui.impact": "影响",
    "ui.source": "来源",
    "ui.execution.evidence": "执行证据",
    "ui.proposal.understanding": "方案理解",
    "ui.related.requirement": "关联要求",
    "ui.your.answer": "你的回答：",
    "ui.last.attempt.incomplete": "上次未完成：",
    "ui.answers.only.update.supervisor.understanding.and.are.not.sent.to.the.main.agent": "回答只更新监督理解，不会发送给主 Agent。",
    "ui.enter.your.tradeoff.choice": "输入你的取舍",
    "ui.answer": "回答",
    "ui.later": "稍后",
    "ui.ignore": "忽略",
    "ui.clarification.card.history": "澄清卡片历史（",
    "ui.status": "状态",
    "ui.report": "报告",
    "ui.version": "版本",
    "ui.main": "主 ",
    "ui.evidenceAlt": " · 证据 ",
    "ui.supervisor": " · 监督 ",
    "ui.question": "问题",
    "ui.requirement.reference.at.the.time": "当时要求引用",
    "ui.original.answer": "原回答",
    "ui.answer.status": "回答状态",
    "ui.shared.goal.candidate.extraction": "共享目标候选提取",
    "ui.only.original.user.messages.from.bound.tasks.are.used.candidates.do.not.change.supervision": "仅使用已绑定任务的用户原话。候选确认前不改变监督目标；新模型调用会计入上方用量。",
    "ui.statusAlt": "状态：",
    "ui.enabled": "已开启",
    "ui.disabled": "未开启",
    "ui.disable.automatic.candidate.extraction": "关闭自动候选提取",
    "ui.enable.automatic.candidate.extraction": "开启自动候选提取",
    "ui.preview.historical.scan.scope": "查看历史扫描范围",
    "ui.bound.tasks": "已绑定任务",
    "ui.estimated.base.calls": "预计基础调用",
    "ui.estimated.source.bytes": "预计原话字节",
    "ui.model": "模型",
    "ui.user.messages": " 条用户消息 · ",
    "ui.with.time.evidence": " 条有时间依据",
    "ui.formal.goal": "正式目标",
    "ui.none.yet": "暂无",
    "ui.time.unknown": "时间未知",
    "ui.confirm.sending.these.materials.to.generate.candidates": "确认发送上述材料生成候选",
    "ui.controlled.coaching": "受控纠偏",
    "ui.when.project.coach.is.enabled.only.tasks.with.supervision.consent.are.eligible.clear.execu": "项目级 coach 开启后，仅已同意监督的任务可用。明确执行偏差可能自动 steer；取舍需要你逐条确认。只投递给正在运行的主 Agent。",
    "ui.project.switch": "项目开关",
    "ui.disable.coach": "关闭 coach",
    "ui.enable.coach": "开启 coach",
    "ui.consent.to.coach.for.this.existing.task": "同意当前旧任务使用 coach",
    "ui.clear.deviation.alert": "明确偏差提醒",
    "ui.suggestion.requiring.approval": "需审批的建议",
    "ui.expired": "已过期",
    "ui.full.message.to.send": "将发送的全文",
    "ui.confirm.sending.to.the.running.main.agent": "确认发送给运行中的主 Agent",
    "ui.choose.and.save.a.model.first.the.project.and.each.new.task.need.separate.consent.before.p": "先选择模型并保存。项目和每个新任务都需要你单独同意，之后才会观察并发送该任务的公开文本与工具证据。",
    "ui.allow.supervisor.model.calls": "允许监督模型调用",
    "ui.model.calls.are.billed.by.the.provider.based.on.actual.usage.saving.model.settings.does.no": "模型调用按服务商实际用量计费。保存模型设置不会自动启用任何项目或任务。",
    "ui.current.project": "当前项目",
    "ui.unknown.project": "未知项目",
    "ui.disable.supervision.for.this.project": "关闭当前项目监督",
    "ui.enable.for.this.project": "在当前项目启用",
    "ui.supervision.is.not.enabled.for.this.task": "当前任务尚未启用监督",
    "ui.waiting.for.a.task.to.start": "等待开始一个任务",
    "ui.choose.and.save.a.supervision.model.in.settings.first": "请先在设置中选择监督模型并保存。",
    "ui.supervisor.model.calls.are.disabled.enable.them.in.settings": "监督模型调用已关闭，请在设置中开启。",
    "ui.enable.the.current.project.first": "请先启用当前项目。",
    "ui.choose.whether.to.enable.supervision.in.the.task.consent.dialog": "请在任务确认弹窗中选择是否启用监督。",
    "ui.you.skipped.this.task.new.tasks.will.ask.again": "你已跳过此任务；新任务仍会再次询问。",
    "ui.subtasks.do.not.enable.supervision.separately": "子任务不单独开启监督。",
    "ui.create.or.open.a.main.task.to.choose": "新建或打开一个主任务后即可选择。",
    "ui.waiting.for.this.task.s.first.user.message": "等待本任务的第一条用户消息。",
    "ui.reading.binding.status": "正在读取绑定状态…",
    "ui.current.projectAlt": "当前项目：",
    "ui.messages.here.only.affect.supervisor.understanding.the.main.agent.does.not.receive.them": "这里的内容只影响监督理解，主 Agent 不会收到。",
    "ui.you": "你",
    "ui.you.can.ask.why.does.this.step.appear.to.deviate.from.the.goal.or.switch.to.correcting.und": "你可以问：“为什么认为这一步偏离目标？”也可以切换到修正理解，告诉我你真正想完成什么。",
    "ui.tradeoffs.awaiting.confirmation": "待确认的取舍",
    "ui.there.are.no.tradeoffs.awaiting.confirmation": "当前没有待确认的取舍。",
    "ui.resume.observation": "继续观察",
    "ui.pause.observation": "暂停观察",
    "ui.bound.task": "绑定：",
    "ui.last.check": "上次检查：",
    "ui.user.message": "用户消息",
    "ui.public.reply": "公开回复",
    "ui.tool.batch": "工具批次",
    "ui.repeated.failure": "重复失败",
    "ui.turn.end": "回合结束",
    "ui.new.evidence.review": "新证据复查",
    "ui.historical.report": "历史报告",
    "ui.none.yetAlt": "尚无",
    "ui.queued.check": "排队检查：",
    "ui.earliest": " · 最早 ",
    "ui.supervisor.understanding.updated.waiting.for.the.next.checkpoint": "监督理解已更新，等待下个检查点。",
    "ui.project.purpose.not.yet.established": "尚未建立项目主旨",
    "ui.shared.within.this.project.v": "同一项目共享 · v",
    "ui.publish.to.project.agent": "发布给项目 Agent",
    "ui.output.path": "写入路径",
    "ui.content.summary": "内容摘要",
    "ui.phase": "；阶段：",
    "ui.not.yet.established": "尚未建立",
    "ui.taskAlt": "；任务：",
    "ui.not.yet.defined": "尚未明确",
    "ui.for.reference.only.this.does.not.mean.the.main.agent.has.received.new.authorization.change": "仅供参考，不代表主 Agent 已收到新授权。私有主档变化不会自动更新该副本。",
    "ui.confirm.publishing.to.project.agent": "确认发布给项目 Agent",
    "ui.private.source": "私有主档",
    "ui.current.phase": "当前阶段",
    "ui.current.phase.not.yet.established": "尚未建立当前阶段",
    "ui.model.proposed.user.confirmed.transitions.v": "模型建议、用户确认后切换 · v",
    "ui.phase.history": "阶段历史（",
    "ui.unnamed.phase": "未命名阶段",
    "ui.in.progress": "进行中",
    "ui.archived": "已归档",
    "ui.supervisor.correction": "监督侧修正",
    "ui.supervisor.understanding.only.not.sent.to.the.main.agent": "仅更新监督理解 · 未同步主 Agent",
    "ui.based.on.the.main.conversation.intent.ledger": "根据主对话意图账本",
    "ui.view.complete.user.message": "查看完整用户消息",
    "ui.awaiting.extraction": " · 尚待提取",
    "ui.current.execution.evidence": "当前执行证据",
    "ui.total.events": "总事件",
    "ui.included.this.time": "本次条数",
    "ui.omitted": "省略",
    "ui.truncated": "截取",
    "ui.the.current.window.is.truncated.public.records.can.be.viewed.as.needed": "当前窗口已截取；可按需查看公开记录。",
    "ui.load.earlier.public.records": "加载更早公开记录",
    "ui.view.recent.public.records": "查看近期公开记录",
    "ui.requirements.and.supervisor.corrections": "要求与监督修正",
    "ui.sidebar.correction": "侧栏修正",
    "ui.historical.correction.main.task.has.changed": "历史修正，主任务已更新",
    "ui.versionAlt": " · 版本 ",
    "ui.not.sent.to.the.main.agent": " · 未同步给主 Agent",
    "ui.requirement": "要求 ",
    "ui.constraint": "约束 ",
    "ui.supervisor.clarification.needed": "监督待澄清",
    "ui.clarification.neededAltAlt": "待澄清",
    "ui.latest.supervision.report": "最近监督报告",
    "ui.no.valid.assessment.was.produced.the.failure.status.is.retained": "本次未形成有效判断，保留失败状态。",
    "ui.coverage.total.events": "本次覆盖：总事件 ",
    "ui.unknown": "未知",
    "ui.included.this.timeAlt": " · 本次条数 ",
    "ui.omittedAlt": " · 省略 ",
    "ui.truncatedAlt": " · 截取 ",
    "ui.partial.check.only": " · 仅局部检查",
    "ui.observation": "观察",
    "ui.interpretation": "推断",
    "ui.suggestion": "建议",
    "ui.original.user.message": "用户原话：",
    "ui.original.user.messageAlt": "用户原话",
    "ui.view.internal.review.records": "查看内部复核记录（",
    "ui.no.notification.needed.for.this.check.this.does.not.mean.the.entire.task.is.complete.or.ve": "本次无需提醒；这不表示整个任务已经完成或得到验证。",
    "ui.dismissed": "已驳回",
    "ui.dismiss.this.report": "驳回此报告",
    "ui.shared.goal.change.history": "共享目标修改历史（",
    "ui.original.message": " · 原话：",
    "ui.current.task.correction.history": "当前任务修正历史",
    "ui.may.send.coaching.to.a.running.main.agent": "可能向运行中的主 Agent 发送纠偏",
    "ui.project.coach.enabled.this.task.has.not.consented": "项目 coach 已开启 · 本任务未同意",
    "ui.observe.only.no.messages.to.the.main.agent": "仅观察，不向主 Agent 发送",
    "ui.inputAlt": "输入",
    "ui.no.data.yet": "暂无数据",
    "ui.outputAlt": "输出",
    "ui.cache.hit": "缓存命中¹",
    "ui.callsAlt": "调用",
    "ui.first.token": "首字",
    "ui.speed": "速度",
    "ui.based.on.known.usage.cache.read": "¹ 按已知用量计算 · 缓存读取 ",
    "ui.cache.write": " · 缓存写入 ",
    "ui.calls.with.unknown.usage": " 次用量未知",
    "ui.total.reserved": " · 累计预留 ",
    "ui.callsAltAlt": " 次",
    "ui.recent.calls": "最近调用（",
    "ui.intent.extraction": "意图提取",
    "ui.execution.review": "执行审查",
    "ui.sidebar.chat": "侧栏对话",
    "ui.tradeoff.answer": "取舍回答",
    "ui.no.request.sent": "未发出请求",
    "ui.usage.unknown": "用量未知",
    "ui.outputAltAlt": " / 输出 ",
    "ui.duration.unknown": "耗时未知",
    "ui.all.tasks.total": "全部任务累计",
    "ui.chat.mode": "对话方式",
    "ui.ask.keep.understanding.unchanged": "询问 · 不修改理解",
    "ui.correct.update.supervisor.understanding.only": "修正 · 仅更新监督理解",
    "ui.message.to.supervisor.agent": "给监督 Agent 的消息",
    "ui.ask.the.supervisor.agent": "向监督 Agent 提问…",
    "ui.describe.the.goal.or.requirements.to.correct": "描述你希望修正的目标或要求…",
    "ui.processing": "处理中…",
    "ui.send.to.supervisor.agent": "发送给监督 Agent",
    "ui.with.consent.taskwatch.sends.this.task.s.public.materials.to.the.supervision.model.project": "同意后，TaskWatch 会向监督模型发送本任务的公开材料。项目 coach 已开启：明确执行偏差可能自动提醒运行中的主 Agent；其他取舍仍需你确认。",
    "ui.with.consent.taskwatch.reads.this.task.s.public.conversation.and.tool.evidence.and.sends.t": "同意后，TaskWatch 会读取本任务的公开对话与工具证据，并发送给所选监督模型。监督只观察，不向主 Agent 发消息。",
    "tabs.overview": "状态",
    "tabs.goals": "目标",
    "tabs.tradeoffs": "取舍",
    "tabs.coach": "纠偏",
    "tabs.chat": "对话",
    "tabs.count": "{label}（{count}）",
    "gear.settings": "设置",
    "panel.sidebar": "TaskWatch 监督侧栏",
    "panel.main": "TaskWatch 监督面板",
    "status.heading": "监督状态",
    "status.currentTask": "当前任务",
    "status.nextStep": "下一步",
    "status.observing": "正在观察",
    "consent.title": "是否在这个任务启用监督？",
    "consent.enable": "启用监督",
    "consent.skip": "跳过本任务",
    "bubble.collapse": "收起",
    "bubble.taskwatch": "TaskWatch",
    "next.none": "目前没有需要你处理的事项；新的公开回复或检查点后会更新。",
    "project.heading": "项目主旨",
    "phase.heading": "当前阶段",
    "task.formalGoal": "正式目标",
    "task.recentRequest": "最近请求",
    "task.waitingGoal": "等待提取目标",
    "task.waitingMessage": "等待用户消息",
    "task.latestMessage": "最近一条用户消息",
    "action.pause": "暂停观察",
    "action.resume": "继续观察",
    "settings.model": "监督模型设置",
    "settings.heading": "监督模型",
    "settings.chooseModel": "选择模型",
    "settings.save": "保存模型设置",
    "usage.label": "监督模型用量",
    "usage.current": "监督用量 · 当前任务",
    "usage.all": "监督用量 · 全部任务",
    "error.generic": "TaskWatch 请求失败，请刷新后重试。",
    "error.bad-request": "TaskWatch 请求失败，请刷新后重试。"
  };
  function t(locale, key, vars = {}) {
    const dictionary = String(locale).toLowerCase().startsWith("zh") ? chinese : english;
    const template = Object.hasOwn(dictionary, key) ? dictionary[key] : Object.hasOwn(english, key) ? english[key] : key;
    return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
  }
  function errorText(locale, code) {
    const key = `error.${code}`;
    return t(locale, t(locale, key) === key ? "error.generic" : key);
  }

  // plugins/taskwatch/client.source.mjs
  window.__ModuleLoader__.load({ id: "dsh-taskwatch", factory: (require2) => {
    const React = require2("react");
    const h = React.createElement;
    const { useState, useEffect, useRef } = React;
    const css = `.tw-bubble{position:fixed;right:20px;bottom:24px;pointer-events:auto;border:1px solid #cbdce8;background:#f7fcff;border-radius:22px;padding:12px 16px;color:#234562;box-shadow:0 8px 28px #163a5420;font:600 14px system-ui;cursor:pointer;z-index:70}.tw-panel{position:fixed;right:16px;top:64px;bottom:86px;width:min(388px,calc(100vw - 32px));pointer-events:auto;z-index:69;display:flex;flex-direction:column;background:#fbfcff;color:#243445;border:1px solid #dce5ef;border-radius:22px;box-shadow:0 20px 70px #102c4430;font:14px/1.55 system-ui;overflow:hidden}.tw-head{padding:18px 20px 12px;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center}.tw-head-main{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%}.tw-settings-button{flex:0 0 auto;padding:5px 8px!important;font-size:18px!important;line-height:1}.tw-head .tw-muted{min-width:0;overflow-wrap:anywhere}.tw-head strong{font-size:18px}.tw-usage{margin:0 18px 10px;padding:10px 12px;border:1px solid #dce8f2;border-radius:12px;background:#f0f7fd;font-size:11px}.tw-usage-title{font-weight:700;color:#315571;margin-bottom:5px}.tw-usage-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 10px}.tw-usage-grid strong{font-size:13px;color:#183f5d}.tw-usage-note{color:#667f93;margin-top:5px}.tw-usage details{margin-top:4px;color:#52718a}.tw-panel button,.tw-panel input,.tw-panel select,.tw-panel textarea{font:inherit}.tw-panel button{border:1px solid #d9e3ed;border-radius:10px;padding:7px 11px;background:white;color:#35546f;cursor:pointer}.tw-panel button:disabled{opacity:.5;cursor:default}.tw-tabs{display:flex;gap:6px;padding:0 18px 12px;border-bottom:1px solid #e7edf3}.tw-tabs button[aria-selected=true]{background:#e6f0fb;border-color:#bfd6ef;color:#164f87}.tw-body{padding:16px 18px;overflow:auto;flex:1}.tw-card{background:white;border:1px solid #e4ebf2;border-radius:14px;padding:13px;margin-bottom:12px;overflow-wrap:anywhere}.tw-muted{color:#778696;font-size:12px}.tw-tag{display:inline-block;background:#e7f2ee;color:#33705d;border-radius:8px;padding:3px 8px;font-size:12px}.tw-warn{background:#fff3df;color:#895818}.tw-error{color:#a74642;background:#fff0ef;padding:10px;border-radius:10px;margin:10px 18px 0}.tw-line{margin:7px 0;white-space:pre-wrap}.tw-panel label{display:block;margin:12px 0 5px}.tw-panel input,.tw-panel select,.tw-panel textarea{box-sizing:border-box;border:1px solid #d6e1eb;border-radius:9px;padding:9px;width:100%;background:white;color:#243445}.tw-panel textarea{resize:vertical;min-height:74px}.tw-chat-user{margin-left:25px;background:#eaf3ff}.tw-chat-assistant{margin-right:12px}.tw-compose{padding:12px 18px;background:#f4f7fb;border-top:1px solid #e2e9f1}.tw-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}.tw-tabs{overflow-x:auto}.tw-tabs button{flex-shrink:0}.tw-next{border-color:#bfd6ef;background:#f0f7fd}.tw-diff{padding:9px 0;border-top:1px solid #e7edf3}.tw-diff:first-of-type{border-top:0}.tw-diff-label{font-weight:700;color:#315571}.tw-diff-value{white-space:pre-wrap;overflow-wrap:anywhere}.tw-source{margin-top:7px}.tw-primary{background:#2b6ea6!important;color:white!important;border-color:#2b6ea6!important}.tw-panel summary{cursor:pointer;color:#53728b}.tw-panel h4{margin:0 0 7px;font-size:13px}.tw-panel p{margin:7px 0}.tw-evidence{max-height:220px;overflow:auto;white-space:pre-wrap;font:11px/1.4 ui-monospace,SFMono-Regular,monospace}.tw-consent-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:#12283e88;pointer-events:auto}.tw-consent-box{width:min(420px,calc(100vw - 32px));padding:22px;border-radius:18px;background:#fff;color:#243445;box-shadow:0 20px 70px #102c4455;font:14px/1.55 system-ui}.tw-consent-box h3{margin:0 0 10px}.tw-consent-box p{margin:8px 0}.tw-consent-box button{border:1px solid #d9e3ed;border-radius:10px;padding:9px 13px;background:#fff;color:#35546f;cursor:pointer}`;
    class LocalRequestError extends Error {
      constructor(key) {
        super(key);
        this.key = key;
      }
    }
    class RpcRequestError extends Error {
      constructor(code) {
        super(code);
        this.code = code;
      }
    }
    const requestError = (error) => error instanceof LocalRequestError ? { key: error.key } : error instanceof RpcRequestError ? { code: error.code } : { message: error?.message ?? String(error) };
    function Panel({ useSessions, rpc, locale }) {
      const language = React.useSyncExternalStore(locale.subscribe.bind(locale), () => locale.getLocale().active, () => "en");
      const label = (key, vars) => t(language, key, vars);
      const labels = { active: label("ui.observing"), observing: label("ui.checking"), completed: label("ui.completed"), paused: label("ui.paused"), stopped: label("ui.paused"), disabled: label("ui.automatic.supervision.is.off"), unbound: label("ui.waiting.to.bind"), waiting: label("ui.waiting.to.resume"), assessed: label("ui.check.completed"), "assessed-partial": label("ui.recent.evidence.checked"), "assessed-incomplete": label("ui.assessment.incomplete"), "input-too-large": label("ui.too.much.evidence.review.not.completed"), empty: label("ui.waiting.for.a.user.task"), "budget-exhausted": label("ui.budget.exhausted"), stale: label("ui.result.expired"), failed: label("ui.check.failed"), timeout: label("ui.request.timed.out"), "needs-intent": label("ui.waiting.for.goal.understanding"), "needs-clarification": label("ui.clarification.needed"), "incomplete-evidence": label("ui.incomplete.evidence"), "insufficient-evidence": label("ui.insufficient.evidence"), "invalid-output": label("ui.invalid.model.response.format"), "publication-failed": label("ui.report.could.not.be.saved"), corrected: label("ui.understanding.updated"), inquiry: label("ui.replied"), clarification: label("ui.clarification.needed"), busy: label("ui.checking.please.retry.shortly"), disposed: label("ui.request.stopped") };
      const errorReasons = { INCOMPLETE_OUTPUT: label("ui.the.model.response.did.not.finish.no.usable.assessment.is.available"), INVALID_JSON: label("ui.the.model.did.not.return.a.valid.structured.response"), CHECK_ID_MISMATCH: label("ui.the.response.does.not.match.this.check"), REQUEST_ISOLATION: label("ui.the.check.request.failed.isolation.validation"), TURN_FAILED: label("ui.the.model.check.did.not.complete"), RUNTIME_ERROR: label("ui.the.model.request.or.execution.failed"), CLEANUP_PENDING: label("ui.resource.cleanup.after.the.check.is.still.pending") };
      const sessionId = useSessions((s) => s.current);
      const [open, setOpen] = useState(false), [tab, setTab] = useState("overview"), [data, setData] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [draft, setDraft] = useState(""), [mode, setMode] = useState("ask"), [refresh, setRefresh] = useState(0), [form, setForm] = useState(null), [evidence, setEvidence] = useState({}), [page, setPage] = useState(null), [scanPreview, setScanPreview] = useState(null);
      const current = useRef(sessionId);
      current.current = sessionId;
      const answerDraft = useRef({ key: null, text: "" });
      const previousContentTab = useRef("overview");
      const navigate = (next) => {
        if (next !== "settings") previousContentTab.current = next;
        setTab(next);
      };
      const toggleSettings = () => navigate(tab === "settings" ? previousContentTab.current : "settings");
      async function call(endpoint, payload) {
        const transport = window.__TASKWATCH_RPC_TRANSPORT__;
        if (!["api", "channel"].includes(transport)) throw new LocalRequestError("ui.connection.failed");
        let r;
        try {
          r = await rpc.call(transport === "api" ? "/api" : "/taskwatch", transport === "api" ? "taskwatch/" + endpoint : endpoint, payload);
        } catch {
          throw new LocalRequestError("ui.connection.failed");
        }
        if (!r.ok) {
          if (r.error?.code) throw new RpcRequestError(r.error.code);
          throw new LocalRequestError("ui.connection.failed");
        }
        return r.value;
      }
      useEffect(() => {
        setDraft("");
        setError("");
        setData(null);
        setEvidence({});
        setPage(null);
        setScanPreview(null);
      }, [sessionId]);
      useEffect(() => {
        let live = true;
        let pending = false;
        async function load() {
          if (pending) return;
          pending = true;
          try {
            const value = await call("state", sessionId ? { sessionId } : {});
            if (live) {
              setData(value);
            }
          } catch (e) {
            if (live) setError(requestError(e));
          } finally {
            pending = false;
          }
        }
        load();
        const timer = setInterval(load, 2500);
        return () => {
          live = false;
          clearInterval(timer);
        };
      }, [sessionId, refresh]);
      useEffect(() => {
        if (!data || form) return;
        setForm({ provider: data.budget.config?.provider ?? "deepseek-official", model: data.budget.config?.model ?? data.models.find((m) => m.id.includes("flash"))?.id ?? "", enabled: data.budget.config?.enabled ?? true });
      }, [data, form]);
      async function action(endpoint, payload) {
        const owner = sessionId;
        setBusy(true);
        setError("");
        try {
          const r = await call(endpoint, payload);
          if (current.current === owner) {
            if (r?.status && ["busy", "paused", "failed", "invalid-output", "timeout", "budget-exhausted", "stale", "disposed"].includes(r.status)) setError({ status: r.status });
            else if (endpoint === "chat") setDraft("");
            setRefresh((n) => n + 1);
          }
        } catch (e) {
          if (current.current === owner) setError(requestError(e));
        } finally {
          setBusy(false);
        }
      }
      async function scanShared() {
        try {
          setScanPreview(await call("scan-shared-extraction", { sessionId }));
        } catch (e) {
          setError(requestError(e));
        }
      }
      async function showEvidence(eventId) {
        const owner = sessionId;
        try {
          const record = await call("evidence", { sessionId: owner, eventId });
          if (current.current === owner) setEvidence((old) => ({ ...old, [eventId]: record }));
        } catch (e) {
          if (current.current === owner) setError(requestError(e));
        }
      }
      async function loadPage(beforeSeq) {
        const owner = sessionId;
        try {
          const result = await call("page", { sessionId: owner, beforeSeq, limit: 20 });
          if (current.current === owner) setPage(result);
        } catch (e) {
          if (current.current === owner) setError(requestError(e));
        }
      }
      const chip = (status) => h("span", { className: "tw-tag" + (["assessed", "active", "inquiry", "corrected"].includes(status) ? "" : " tw-warn") }, labels[status] ?? status);
      const item = (label2, value, reactKey = label2) => h("p", { key: reactKey, className: "tw-line" }, h("span", { className: "tw-muted" }, label2 + " "), value);
      const chat = data?.chat;
      const budget = data?.budget;
      const usage = data?.supervisorUsage;
      const usageCurrent = usage?.task ?? usage?.global;
      const tokenCount = (value) => Number(value ?? 0).toLocaleString();
      const usageCell = (label2, value) => h("span", { key: label2 }, label2 + " ", h("strong", null, value));
      const usageSummary = (summary) => summary ? label("ui.input") + tokenCount(summary.inputTokens + summary.cacheReadTokens + summary.cacheWriteTokens) + label("ui.output") + tokenCount(summary.outputTokens) + label("ui.calls") + summary.calls : label("ui.no.records.yet");
      const card = data?.card;
      const latest = data?.reports?.at(-1);
      const state = data?.status?.latestReport?.status === "publication-failed" ? "publication-failed" : data?.status?.status ?? "waiting";
      const validation = data?.validationStatus;
      const cardHistory = data?.cardHistory ?? [];
      const hierarchy = data?.goalHierarchy;
      const pendingGoal = data?.pendingGoalChange;
      const goalHistory = data?.goalHistory ?? [];
      const goalDocument = data?.goalDocument;
      const currentTask = data?.intent?.messages?.at(-1);
      const currentGoal = (hierarchy?.task?.supervisorCurrent ? hierarchy.task.supervisorOverlay?.goal : null) ?? hierarchy?.task?.formalGoal ?? data?.intent?.current?.goal?.text ?? null;
      const collectionNames = { requirements: label("ui.requirements"), successCriteria: label("ui.success.criteria"), acceptance: label("ui.acceptance.criteria"), constraints: label("ui.ongoing.constraints"), nonGoals: label("ui.non.goals"), priorities: label("ui.priorities") };
      const goalOpLabel = (op, preview) => op.tool === "set_summary" ? label("goal.modify", { target: op.layer === "project" ? label("ui.project.purpose") : op.layer === "phase" ? label("ui.phase.goal") : label("ui.current.task") }) : op.tool === "add_item" ? label("goal.add", { target: collectionNames[op.collection] ?? label("ui.item") }) : op.tool === "update_item" ? label("goal.update", { target: collectionNames[preview?.collection] ?? label("ui.item") }) : op.tool === "remove_item" ? label("goal.remove", { target: collectionNames[preview?.collection] ?? label("ui.item") }) : op.tool === "propose_phase_transition" ? label("goal.switchPhase", { name: op.name }) : op.tool;
      const taskCharacters = currentTask?.text ? Array.from(currentTask.text) : [];
      const taskTruncated = taskCharacters.length > 320;
      const taskPreview = taskCharacters.slice(0, 320).join("");
      const pendingCandidates = (data?.sharedGoalCandidates ?? []).filter((value) => value.status === "pending");
      const pendingCoach = data?.coach?.project?.enabled && data?.coach?.taskConsented ? (data.coach.suggestions ?? []).filter((value) => value.risk === "approval" && value.status === "approval" && Number.isFinite(value.expires) && value.expires >= Date.now()) : [];
      const goalPendingCount = (pendingGoal ? 1 : 0) + pendingCandidates.length;
      const nextStep = !data?.taskId || data?.consent?.status === "pending" ? null : ["paused", "stopped"].includes(state) ? { title: label("ui.supervision.paused"), detail: label("ui.resume.observation.in.the.supervision.status.section.below.when.ready") } : state === "completed" ? { title: label("ui.task.completed"), detail: label("ui.this.task.has.ended.previous.supervision.records.remain.available") } : state === "disabled" ? { title: label("ui.supervision.is.off"), detail: label("ui.supervisor.model.calls.are.disabled.review.the.configuration.in.settings"), tab: "settings", action: label("ui.view.settings") } : pendingCoach.length ? { title: label("ui.coach.suggestions.awaiting.approval"), detail: label("ui.suggestions.may.only.arrive.while.the.main.agent.is.running.review.the.full.message.first"), tab: "coach", action: label("ui.view.coach.suggestions") } : card?.status === "pending" ? { title: label("ui.tradeoff.awaiting.your.answer"), detail: card.tradeoff?.question ?? label("ui.please.confirm.the.current.tradeoff"), tab: "tradeoffs", action: label("ui.view.tradeoff") } : pendingGoal ? { title: label("ui.goal.changes.awaiting.confirmation"), detail: label("ui.the.supervision.goal.will.not.change.until.confirmed"), tab: "goals", action: label("ui.view.goal.changes") } : pendingCandidates.length ? { title: label("ui.shared.goal.candidates.awaiting.confirmation"), detail: pendingCandidates[0].layer === "project" ? label("ui.compare.the.project.purpose.candidate.with.the.original.user.messages") : label("ui.compare.the.current.phase.candidate.with.the.original.user.messages"), tab: "goals", action: label("ui.view.goal.candidates") } : latest?.report?.status === "assessed-incomplete" || latest?.report?.result?.validation?.complete === false ? { title: label("ui.assessment.incomplete"), detail: label("ui.review.the.latest.supervision.report.and.rejected.items.below") } : ["failed", "timeout", "invalid-output", "input-too-large", "publication-failed", "budget-exhausted"].includes(state) ? { title: labels[state] ?? label("ui.check.incomplete"), detail: label("ui.review.the.latest.supervision.report.and.error.reason.below") } : data?.checkpoint?.waitingForCheckpoint ? { title: label("ui.waiting.for.the.next.checkpoint"), detail: label("ui.supervisor.understanding.was.updated.it.will.be.reviewed.at.the.next.main.task.checkpoint") } : { title: label("ui.observing"), detail: label("ui.there.is.nothing.requiring.your.attention.right.now.this.updates.after.a.new.public.reply.") };
      const nextStepCard = nextStep && h("div", { className: "tw-card tw-next", "aria-label": label("status.nextStep") }, h("h4", null, label("status.nextStep") + " · " + nextStep.title), h("p", { className: "tw-line" }, nextStep.detail), nextStep.tab && h("button", { className: "tw-primary", disabled: busy, onClick: () => navigate(nextStep.tab) }, nextStep.action));
      const goalValue = (value) => value === null || value === void 0 ? label("ui.none") : typeof value === "string" ? value : typeof value === "object" && typeof value.name === "string" ? h("span", null, value.name, value.outcome ? " · " + value.outcome : "", Array.isArray(value.acceptance) && value.acceptance.length ? h("span", null, label("ui.acceptance") + value.acceptance.join(label("punctuation.list"))) : null) : String(value);
      const goalDiff = (op, preview, key) => h("div", { key, className: "tw-diff" }, h("div", { className: "tw-diff-label" }, goalOpLabel(op, preview)), h("div", { className: "tw-diff-value" }, h("span", { className: "tw-muted" }, label("ui.previous")), preview?.before === null ? label("ui.none.new") : goalValue(preview?.before)), h("div", { className: "tw-diff-value" }, h("span", { className: "tw-muted" }, label("ui.proposed")), preview?.after === null ? label("ui.remove") : goalValue(preview?.after)));
      const goalDraft = pendingGoal && h("div", { className: "tw-card" }, h("h4", null, label("ui.shared.goal.changes.awaiting.confirmation")), ...(pendingGoal.preview ?? pendingGoal.operations ?? []).map((preview, i) => h("div", { key: "draft-" + i }, goalDiff(pendingGoal.operations?.[i] ?? preview, preview, "diff-" + i), preview.source && h("details", { className: "tw-source" }, h("summary", null, label("ui.view.original.user.messages")), h("p", { className: "tw-line" }, preview.source)))), h("p", { className: "tw-muted" }, label("ui.confirmation.only.updates.the.supervision.goal.it.is.not.sent.to.the.main.agent")), h("div", { className: "tw-row" }, h("button", { className: "tw-primary", disabled: busy, onClick: () => action("confirm-goal-change", { sessionId, draftId: pendingGoal.id, confirmed: true }) }, label("ui.confirm.changes")), h("button", { disabled: busy, onClick: () => action("dismiss-goal-change", { sessionId, draftId: pendingGoal.id }) }, label("ui.dismiss"))));
      const candidateCard = (c) => h("div", { key: c.id, className: "tw-card" }, h("h4", null, c.layer === "project" ? label("ui.project.purpose.candidate") : label("ui.current.phase.candidate")), item(label("ui.basis"), c.basis === "inferred" ? label("ui.inferred.across.tasks") : label("ui.explicit.user.statement")), c.question && item(label("ui.clarification.neededAlt"), c.question), ...(c.operations ?? []).map((op, i) => h("div", { key: "op-" + i }, goalDiff(op, c.preview?.[i], "diff-" + i), (op.sources ?? []).length > 0 && h("details", { className: "tw-source" }, h("summary", null, label("ui.view.original.user.messagesAlt") + op.sources.length + label("punctuation.closeCount")), ...op.sources.map((src, j) => item(label("ui.task") + src.taskId + " · " + src.messageId, src.quote, "source-" + j))))), h("p", { className: "tw-muted" }, label("ui.confirmation.only.updates.the.supervision.goal.it.is.not.sent.to.the.main.agent")), c.status === "pending" && h("div", { className: "tw-row" }, h("button", { className: "tw-primary", disabled: busy, onClick: () => action("confirm-shared-candidate", { sessionId, candidateId: c.id, confirmed: true }) }, label("ui.confirm.supervision.goal.update")), h("button", { disabled: busy, onClick: () => action("dismiss-shared-candidate", { sessionId, candidateId: c.id }) }, label("ui.dismiss"))));
      const cardKey = card ? `${data?.taskId ?? ""}:${card.id}` : null;
      if (answerDraft.current.key !== cardKey) answerDraft.current = { key: cardKey, text: card?.answer ?? "" };
      let clarification, cardAudit;
      const validationNotice = [validation && ["capture-failed", "feedback-capture-failed"].includes(validation.status) && h("div", { className: "tw-error" }, validation.status === "capture-failed" ? label("ui.local.candidate.capture.failed.the.supervision.result.was.retained") : label("ui.local.feedback.capture.failed.your.card.action.was.saved")), latest?.report?.result?.validation?.complete === false && h("div", { className: "tw-error" }, label("ui.assessment.incomplete.only.validated.items.are.shown"), ...(latest.report.result.validation.rejected ?? []).map((entry, i) => entry && typeof entry.kind === "string" && Number.isSafeInteger(entry.index) && typeof entry.errorCode === "string" ? h("p", { key: "rejected-" + i, className: "tw-line" }, label("ui.rejected.item") + entry.kind + " #" + entry.index + label("punctuation.colon") + entry.errorCode) : null))];
      const executionHistory = data?.executionHistory;
      const reportHistory = latest?.report?.history;
      const historyValue = (history, ...keys) => keys.map((key) => history?.[key]).find((value) => Number.isSafeInteger(value));
      const eventDetail = (eventId) => h("details", { key: eventId }, h("summary", null, label("ui.evidence") + eventId.slice(0, 8)), h("button", { disabled: busy, onClick: () => showEvidence(eventId) }, label("ui.expand.public.record")), Object.hasOwn(evidence, eventId) && evidence[eventId] === null && h("p", { className: "tw-muted" }, label("ui.this.public.record.is.unavailable.execution.cannot.be.verified.from.this.reference")), evidence[eventId] && h("pre", { className: "tw-evidence" }, JSON.stringify(evidence[eventId], null, 2)), evidence[eventId]?.data?.truncated && h("p", { className: "tw-muted" }, label("ui.this.public.record.was.truncated")));
      const requirementText = (id) => {
        if (id === "goal") return data?.intent?.current?.goal?.text ?? label("ui.overall.goal");
        const [group, index] = id.split(":");
        return data?.intent?.current?.[group]?.[Number(index)]?.text ?? id;
      };
      clarification = card && h("div", { className: "tw-card" }, h("h4", null, label("ui.tradeoff.requiring.your.confirmation")), card.status === "answering" && h("p", { className: "tw-muted" }, label("ui.processing.answer")), h("p", { className: "tw-line" }, card.tradeoff.question), item(label("ui.impact"), card.tradeoff.impact), item(label("ui.source"), card.tradeoff.basis === "execution" ? label("ui.execution.evidence") : label("ui.proposal.understanding")), ...(card.requirementIds ?? []).map((value) => item(value === "goal" ? label("ui.overall.goal") : label("ui.related.requirement"), requirementText(value), "related-" + value)), ...(card.evidenceIds ?? []).map(eventDetail), card.answer && h("p", { className: "tw-muted" }, label("ui.your.answer") + card.answer), card.answerStatus && card.status === "pending" && h("p", { className: "tw-muted" }, label("ui.last.attempt.incomplete") + (labels[card.answerStatus] ?? card.answerStatus)), h("p", { className: "tw-muted" }, label("ui.answers.only.update.supervisor.understanding.and.are.not.sent.to.the.main.agent")), card.status !== "answering" && h("textarea", { key: card.id, defaultValue: answerDraft.current.text, placeholder: label("ui.enter.your.tradeoff.choice"), onChange: (e) => {
        answerDraft.current = { key: cardKey, text: e.target.value };
      } }), card.status !== "answering" && h("div", { className: "tw-row" }, h("button", { className: "tw-primary", disabled: busy, onClick: () => action("answer", { sessionId, cardId: card.id, text: answerDraft.current.key === cardKey ? answerDraft.current.text : card.answer ?? "" }) }, label("ui.answer")), h("button", { disabled: busy, onClick: () => action("defer", { sessionId, cardId: card.id, until: new Date(Date.now() + 36e5).toISOString() }) }, label("ui.later")), h("button", { disabled: busy, onClick: () => action("dismiss", { sessionId, cardId: card.id }) }, label("ui.ignore"))));
      cardAudit = cardHistory.length > 0 && h("details", { className: "tw-card" }, h("summary", null, label("ui.clarification.card.history") + cardHistory.length + label("punctuation.closeCount")), ...cardHistory.map((entry) => h("div", { key: entry.id, className: "tw-line" }, item(label("ui.status"), entry.status), item(label("ui.report"), entry.report_id), item(label("ui.version"), label("ui.main") + entry.main_version + label("ui.evidenceAlt") + (entry.through_seq ?? label("ui.none")) + label("ui.supervisor") + entry.side_version), entry.tradeoff && item(label("ui.question"), entry.tradeoff.question), entry.tradeoff && item(label("ui.impact"), entry.tradeoff.impact), ...(entry.requirementIds ?? []).map((value) => item(label("ui.requirement.reference.at.the.time"), value, "past-related-" + value)), ...(entry.evidenceIds ?? []).map(eventDetail), entry.answer && item(label("ui.original.answer"), entry.answer), entry.answerStatus && item(label("ui.answer.status"), labels[entry.answerStatus] ?? entry.answerStatus))));
      let body;
      if (tab === "goals") body = h("div", null, goalDraft, ...(data?.sharedGoalCandidates ?? []).filter((c) => c.status === "pending" || c.status === "needs-clarification").map(candidateCard), h("div", { className: "tw-card" }, h("h4", null, label("ui.shared.goal.candidate.extraction")), h("p", { className: "tw-muted" }, label("ui.only.original.user.messages.from.bound.tasks.are.used.candidates.do.not.change.supervision")), h("p", null, label("ui.statusAlt") + (data?.project?.sharedExtractionEnabled ? label("ui.enabled") : label("ui.disabled"))), data?.project?.enabled && h("div", { className: "tw-row" }, h("button", { disabled: busy, onClick: () => action("shared-extraction", { sessionId, enabled: !data.project.sharedExtractionEnabled, confirmed: true }) }, data.project.sharedExtractionEnabled ? label("ui.disable.automatic.candidate.extraction") : label("ui.enable.automatic.candidate.extraction"))), data?.taskId && h("div", { className: "tw-row" }, h("button", { disabled: busy, onClick: scanShared }, label("ui.preview.historical.scan.scope"))), scanPreview && h("div", null, item(label("ui.bound.tasks"), scanPreview.tasks.length), item(label("ui.estimated.base.calls"), scanPreview.estimatedLayerCalls), item(label("ui.estimated.source.bytes"), scanPreview.estimatedSourceBytes), item(label("ui.model"), scanPreview.model), h("p", { className: "tw-muted" }, scanPreview.note), ...scanPreview.tasks.map((t2) => h("details", { key: t2.taskId }, h("summary", null, label("ui.task") + t2.taskId + " · " + t2.messageCount + label("ui.user.messages") + t2.knownTimeCount + label("ui.with.time.evidence")), item(label("ui.formal.goal"), t2.formalGoal ?? label("ui.none.yet")), ...(t2.sources ?? []).map((s) => item(s.messageId + " · " + (s.time ?? label("ui.time.unknown")), s.text)))), h("button", { className: "tw-primary", disabled: busy || !data?.project?.sharedExtractionEnabled, onClick: () => action("run-shared-extraction", { sessionId, confirmed: true }) }, label("ui.confirm.sending.these.materials.to.generate.candidates")))));
      else if (tab === "coach") body = h("div", null, h("div", { className: "tw-card" }, h("h4", null, label("ui.controlled.coaching")), h("p", { className: "tw-muted" }, label("ui.when.project.coach.is.enabled.only.tasks.with.supervision.consent.are.eligible.clear.execu")), item(label("ui.project.switch"), data?.coach?.project?.enabled ? label("ui.enabled") : label("ui.disabled")), data?.project?.enabled && h("button", { disabled: busy, onClick: () => action("coach-project", { sessionId, enabled: !data.coach?.project?.enabled, confirmed: true }) }, data?.coach?.project?.enabled ? label("ui.disable.coach") : label("ui.enable.coach")), data?.taskId && data?.coach?.project?.enabled && !data?.coach?.taskConsented && h("button", { disabled: busy, onClick: () => action("consent-coach", { sessionId, confirmed: true }) }, label("ui.consent.to.coach.for.this.existing.task"))), ...(data?.coach?.suggestions ?? []).map((v) => h("div", { key: v.id, className: "tw-card" }, h("h4", null, v.risk === "auto" ? label("ui.clear.deviation.alert") : label("ui.suggestion.requiring.approval")), item(label("ui.status"), v.status === "approval" && Number.isFinite(v.expires) && v.expires < Date.now() ? label("ui.expired") : v.status), item(label("ui.full.message.to.send"), v.text), item(label("ui.report"), v.reportId), v.risk === "approval" && v.status === "approval" && h("div", { className: "tw-row" }, h("button", { className: "tw-primary", disabled: busy || !data?.coach?.project?.enabled || !data?.coach?.taskConsented || !Number.isFinite(v.expires) || v.expires < Date.now(), onClick: () => action("send-coach", { sessionId, suggestionId: v.id, confirmed: true }) }, label("ui.confirm.sending.to.the.running.main.agent")), h("button", { disabled: busy, onClick: () => action("dismiss-coach", { sessionId, suggestionId: v.id }) }, label("ui.dismiss"))))));
      else if (tab === "settings") body = form && h("div", null, h("h4", null, label("settings.model")), h("p", { className: "tw-muted" }, label("ui.choose.and.save.a.model.first.the.project.and.each.new.task.need.separate.consent.before.p")), h("label", null, label("settings.heading")), h("select", { value: form.model, onChange: (e) => setForm({ ...form, model: e.target.value }) }, h("option", { value: "" }, label("settings.chooseModel")), ...(data?.models ?? []).map((m) => h("option", { key: m.id, value: m.id }, m.name))), h("label", null, h("input", { type: "checkbox", style: { width: "auto", marginRight: 8 }, checked: form.enabled, onChange: (e) => setForm({ ...form, enabled: e.target.checked }) }), label("ui.allow.supervisor.model.calls")), h("p", { className: "tw-muted" }, label("ui.model.calls.are.billed.by.the.provider.based.on.actual.usage.saving.model.settings.does.no")), h("button", { className: "tw-primary", disabled: busy || !form.model, onClick: () => action("configure", { confirmed: true, config: form }) }, label("settings.save")), sessionId && data?.eligible && budget?.config?.enabled && h("div", { className: "tw-card" }, h("h4", null, label("ui.current.project")), h("p", { className: "tw-muted" }, data?.project?.path ?? data?.sessionWorkspace ?? label("ui.unknown.project")), data?.project?.enabled ? h("button", { disabled: busy, onClick: () => action("disable-project", { sessionId, confirmed: true }) }, label("ui.disable.supervision.for.this.project")) : h("button", { className: "tw-primary", disabled: busy, onClick: () => action("enable-project", { sessionId, confirmed: true }) }, label("ui.enable.for.this.project"))));
      else if (!data?.taskId) body = h("div", { className: "tw-card" }, h("h4", null, sessionId ? label("ui.supervision.is.not.enabled.for.this.task") : label("ui.waiting.for.a.task.to.start")), h("p", { className: "tw-muted" }, { "not-configured": label("ui.choose.and.save.a.supervision.model.in.settings.first"), "global-disabled": label("ui.supervisor.model.calls.are.disabled.enable.them.in.settings"), "project-disabled": label("ui.enable.the.current.project.first"), "pending": label("ui.choose.whether.to.enable.supervision.in.the.task.consent.dialog"), "declined": label("ui.you.skipped.this.task.new.tasks.will.ask.again"), "not-primary": label("ui.subtasks.do.not.enable.supervision.separately"), "no-session": label("ui.create.or.open.a.main.task.to.choose"), "accepted": label("ui.waiting.for.this.task.s.first.user.message") }[data?.bindingReason] ?? label("ui.reading.binding.status")), data?.project?.path && h("p", { className: "tw-muted" }, label("ui.current.projectAlt") + data.project.path), sessionId && data?.eligible && budget?.config?.enabled && !data?.project?.enabled && h("button", { className: "tw-primary", disabled: busy, onClick: () => action("enable-project", { sessionId, confirmed: true }) }, label("ui.enable.for.this.project")));
      else if (tab === "chat") body = h("div", null, h("p", { className: "tw-muted" }, label("ui.messages.here.only.affect.supervisor.understanding.the.main.agent.does.not.receive.them")), ...(chat?.messages ?? []).map((m) => h("div", { key: m.id, className: "tw-card tw-chat-" + m.role }, h("span", { className: "tw-muted" }, m.role === "user" ? label("ui.you") : "TaskWatch"), h("div", { className: "tw-line" }, m.text ?? labels[m.status] ?? m.status), m.status === "stale" && chip("stale"))), !chat?.messages?.length && h("div", { className: "tw-card" }, label("ui.you.can.ask.why.does.this.step.appear.to.deviate.from.the.goal.or.switch.to.correcting.und")));
      else if (tab === "tradeoffs") body = h("div", null, validationNotice, clarification || h("div", { className: "tw-card" }, h("h4", null, label("ui.tradeoffs.awaiting.confirmation")), h("p", { className: "tw-muted" }, label("ui.there.are.no.tradeoffs.awaiting.confirmation"))), cardAudit);
      else body = h("div", null, nextStepCard, h("div", { className: "tw-card" }, h("h4", null, label("status.heading")), chip(state), h("div", { className: "tw-row" }, h("button", { disabled: busy, onClick: () => action(state === "paused" ? "resume" : "pause", { sessionId }) }, state === "paused" ? label("ui.resume.observation") : label("ui.pause.observation"))), h("p", { className: "tw-muted" }, label("ui.bound.task") + data.taskId), data.checkpoint && h("div", { className: "tw-line" }, label("ui.last.check") + ({ "user": label("ui.user.message"), "assistant": label("ui.public.reply"), "tool-batch": label("ui.tool.batch"), "repeated-failure": label("ui.repeated.failure"), "turn-end": label("ui.turn.end"), "stale-refresh": label("ui.new.evidence.review"), "restored-report": label("ui.historical.report") }[data.checkpoint.lastReason] ?? label("ui.none.yetAlt")) + (data.checkpoint.lastCheckedAt ? " · " + new Date(data.checkpoint.lastCheckedAt).toLocaleTimeString() : "")), data.checkpoint?.pendingReason && h("p", { className: "tw-muted" }, label("ui.queued.check") + ({ "user": label("ui.user.message"), "assistant": label("ui.public.reply"), "tool-batch": label("ui.tool.batch"), "repeated-failure": label("ui.repeated.failure"), "turn-end": label("ui.turn.end"), "stale-refresh": label("ui.new.evidence.review") }[data.checkpoint.pendingReason] ?? data.checkpoint.pendingReason) + label("ui.earliest") + new Date(data.checkpoint.nextCheckAt).toLocaleTimeString()), data.checkpoint?.waitingForCheckpoint && h("p", { className: "tw-muted" }, label("ui.supervisor.understanding.updated.waiting.for.the.next.checkpoint"))), h("div", { className: "tw-card" }, h("h4", null, label("ui.project.purpose")), h("p", { className: "tw-line" }, hierarchy?.project?.summary ?? label("ui.project.purpose.not.yet.established")), h("p", { className: "tw-muted" }, label("ui.shared.within.this.project.v") + (hierarchy?.project?.version ?? 0)), ...(hierarchy?.project?.items ?? []).map((v) => item(v.collection, v.text, v.id)), hierarchy?.project?.version > 0 && h("details", null, h("summary", null, label("ui.publish.to.project.agent")), item(label("ui.output.path"), (data?.project?.path ?? data?.sessionWorkspace) + "/.taskwatch/intent.md"), item(label("ui.content.summary"), (hierarchy.project.summary ?? label("ui.project.purpose.not.yet.established")) + label("ui.phase") + (hierarchy?.phase?.name ?? label("ui.not.yet.established")) + label("ui.taskAlt") + (hierarchy?.task?.formalGoal ?? label("ui.not.yet.defined"))), h("p", { className: "tw-muted" }, label("ui.for.reference.only.this.does.not.mean.the.main.agent.has.received.new.authorization.change")), h("button", { className: "tw-primary", disabled: busy, onClick: () => action("publish-goal-document", { sessionId, confirmed: true }) }, label("ui.confirm.publishing.to.project.agent")), goalDocument?.privatePath && item(label("ui.private.source"), goalDocument.privatePath))), h("div", { className: "tw-card" }, h("h4", null, label("ui.current.phase")), h("p", { className: "tw-line" }, hierarchy?.phase?.name ? hierarchy.phase.name + " · " + hierarchy.phase.outcome : label("ui.current.phase.not.yet.established")), h("p", { className: "tw-muted" }, label("ui.model.proposed.user.confirmed.transitions.v") + (hierarchy?.phase?.version ?? 0)), ...(hierarchy?.phase?.items ?? []).map((v) => item(v.collection, v.text, v.id)), (hierarchy?.phaseHistory ?? []).length > 0 && h("details", null, h("summary", null, label("ui.phase.history") + hierarchy.phaseHistory.length + label("punctuation.closeCount")), ...hierarchy.phaseHistory.map((v) => h("p", { key: v.id, className: "tw-line" }, (v.name ?? label("ui.unnamed.phase")) + " · v" + v.version + " · " + (v.status === "active" ? label("ui.in.progress") : label("ui.archived")) + (v.outcome ? " · " + v.outcome : ""))))), h("div", { className: "tw-card" }, h("h4", null, label("status.currentTask")), item(label("task.formalGoal"), hierarchy?.task?.formalGoal ?? data?.intent?.current?.goal?.text ?? label("task.waitingGoal")), hierarchy?.task?.supervisorOverlay && item(label("ui.supervisor.correction"), hierarchy.task.supervisorOverlay.goal), h("p", { className: "tw-muted" }, hierarchy?.task?.supervisorOverlay ? label("ui.supervisor.understanding.only.not.sent.to.the.main.agent") : label("ui.based.on.the.main.conversation.intent.ledger"))), h("div", { className: "tw-card" }, h("h4", null, label("task.recentRequest")), h("p", { className: "tw-line" }, currentTask ? taskPreview + (taskTruncated ? "…" : "") : label("task.waitingMessage")), taskTruncated && h("details", null, h("summary", null, label("ui.view.complete.user.message")), h("p", { className: "tw-line" }, currentTask.text)), currentTask && h("p", { className: "tw-muted" }, label("task.latestMessage") + (data?.intent?.reviewedVersion < currentTask.version ? label("ui.awaiting.extraction") : ""))), validationNotice, executionHistory && h("div", { className: "tw-card" }, h("h4", null, label("ui.current.execution.evidence")), item(label("ui.total.events"), String(historyValue(executionHistory, "totalEvents", "total", "count") ?? 0)), item(label("ui.included.this.time"), String(historyValue(executionHistory, "includedEvents", "windowEvents", "included", "returned") ?? executionHistory.events?.length ?? 0)), item(label("ui.omitted"), String(executionHistory.omittedEvents ?? 0)), item(label("ui.truncated"), String(executionHistory.truncatedEvents ?? 0)), (executionHistory.partial || executionHistory.truncatedEvents > 0) && h("p", { className: "tw-muted" }, label("ui.the.current.window.is.truncated.public.records.can.be.viewed.as.needed")), page && h("div", null, ...(page.events ?? []).map((event) => h("div", { key: event.id, className: "tw-line" }, event.seq + " · " + event.type, eventDetail(event.id))), page.nextBeforeSeq !== null && h("button", { disabled: busy, onClick: () => loadPage(page.nextBeforeSeq) }, label("ui.load.earlier.public.records"))), h("button", { disabled: busy, onClick: () => loadPage(Number.MAX_SAFE_INTEGER) }, label("ui.view.recent.public.records"))), h("div", { className: "tw-card" }, h("h4", null, label("ui.requirements.and.supervisor.corrections")), chat?.understanding && h("p", { className: "tw-muted" }, (chat.current ? label("ui.sidebar.correction") : label("ui.historical.correction.main.task.has.changed")) + label("ui.versionAlt") + chat.version + label("ui.not.sent.to.the.main.agent")), ...((chat?.current ? chat.understanding?.requirements : []) ?? []).map((v, i) => item(label("ui.requirement") + (i + 1), v)), ...((chat?.current ? chat.understanding?.constraints : []) ?? []).map((v, i) => item(label("ui.constraint") + (i + 1), v)), ...(chat?.questions ?? []).map((v, i) => item(label("ui.supervisor.clarification.needed"), v)), ...(data.intent?.questions ?? []).map((v, i) => item(label("ui.clarification.neededAltAlt"), typeof v === "string" ? v : JSON.stringify(v)))), latest && h("div", { className: "tw-card" }, h("h4", null, label("ui.latest.supervision.report")), chip(latest.current === false ? "stale" : latest.report.status), latest.report.result?.errorCode && h("p", { className: "tw-muted" }, errorReasons[latest.report.result.errorCode] ?? label("ui.no.valid.assessment.was.produced.the.failure.status.is.retained")), h("p", { className: "tw-muted" }, new Date(latest.created).toLocaleString()), reportHistory && h("p", { className: "tw-muted" }, label("ui.coverage.total.events") + (historyValue(reportHistory, "totalEvents", "total", "count") ?? label("ui.unknown")) + label("ui.included.this.timeAlt") + (historyValue(reportHistory, "includedEvents", "windowEvents", "included", "returned") ?? label("ui.unknown")) + label("ui.omittedAlt") + (historyValue(reportHistory, "omittedEvents", "omitted") ?? label("ui.unknown")) + label("ui.truncatedAlt") + (reportHistory.truncatedEvents ?? 0) + (reportHistory.partial ? label("ui.partial.check.only") : "")), ...(latest.report.result?.findings ?? []).filter((_, i) => {
        const n = latest.report.result?.notification;
        return !n || n.findingIndexes.includes(i);
      }).map((f, i) => h("div", { key: i }, item(label("ui.observation"), f.observation), item(label("ui.interpretation"), f.interpretation), item(label("ui.suggestion"), f.suggestion), ...(f.evidenceIds ?? []).map(eventDetail), ...(f.userMessageIds ?? []).map((id) => {
        const original = data.intent?.messages?.find((message) => message.id === id)?.text;
        return original ? h("details", { key: "user-" + id }, h("summary", null, label("ui.original.user.message") + id), h("p", { className: "tw-line" }, original.length > 500 ? original.slice(0, 500) + "…" : original)) : item(label("ui.original.user.messageAlt"), id);
      }))), (latest.report.result?.findings ?? []).filter((_, i) => {
        const n = latest.report.result?.notification;
        return n && !n.findingIndexes.includes(i);
      }).length > 0 && h("details", { className: "tw-card" }, h("summary", null, label("ui.view.internal.review.records") + (latest.report.result?.findings ?? []).filter((_, i) => {
        const n = latest.report.result?.notification;
        return n && !n.findingIndexes.includes(i);
      }).length + label("punctuation.closeCount")), ...(latest.report.result?.findings ?? []).filter((_, i) => {
        const n = latest.report.result?.notification;
        return n && !n.findingIndexes.includes(i);
      }).map((f, i) => h("div", { key: "audit-" + i }, item(label("ui.observation"), f.observation), item(label("ui.interpretation"), f.interpretation), item(label("ui.suggestion"), f.suggestion), ...(f.evidenceIds ?? []).map(eventDetail), ...(f.userMessageIds ?? []).map((id) => {
        const original = data.intent?.messages?.find((message) => message.id === id)?.text;
        return original ? h("details", { key: "audit-user-" + id }, h("summary", null, label("ui.original.user.message") + id), h("p", { className: "tw-line" }, original.length > 500 ? original.slice(0, 500) + "…" : original)) : item(label("ui.original.user.messageAlt"), id);
      })))), latest.report.status.startsWith("assessed") && !(latest.report.result?.notification?.shouldNotify ?? (latest.report.result?.findings ?? []).length > 0) && h("p", { className: "tw-muted" }, label("ui.no.notification.needed.for.this.check.this.does.not.mean.the.entire.task.is.complete.or.ve")), h("button", { disabled: busy || latest.dismissed, onClick: () => action("dismiss", { sessionId, reportId: latest.id }) }, latest.dismissed ? label("ui.dismissed") : label("ui.dismiss.this.report"))), goalHistory.length > 0 && h("details", { className: "tw-card" }, h("summary", null, label("ui.shared.goal.change.history") + goalHistory.length + label("punctuation.closeCount")), ...goalHistory.map((r) => h("p", { key: r.id, className: "tw-line" }, (r.layer === "project" ? label("ui.project.purpose") : label("ui.current.phase")) + " v" + r.version + " · " + new Date(r.created).toLocaleString() + label("ui.original.message") + (r.sourceRefs?.length ? r.sourceRefs.map((ref) => ref.taskId + " / " + ref.messageId + label("punctuation.colon") + ref.quote).join(label("punctuation.semicolon")) : r.source)))), chat?.revisions?.length > 0 && h("details", { className: "tw-card" }, h("summary", null, label("ui.current.task.correction.history")), ...chat.revisions.map((r) => h("p", { key: r.version, className: "tw-line" }, "v" + r.version + " · " + r.understanding.goal))));
      const consentPrompt = !!sessionId && data?.consent?.status === "pending" && budget?.config?.enabled;
      return h(React.Fragment, null, h("style", null, css), h("button", { className: "tw-bubble", onClick: () => setOpen(!open), "aria-label": label("panel.sidebar"), "aria-expanded": open }, "🫧 ", open ? label("bubble.collapse") : labels[state] ?? label("bubble.taskwatch")), open && h("aside", { className: "tw-panel", "aria-label": label("panel.main") }, h("div", { className: "tw-head" }, h("div", { className: "tw-head-main" }, h("strong", null, "🫧 TaskWatch"), h("button", { className: "tw-settings-button", title: label("gear.settings"), "aria-label": label("gear.settings"), "aria-pressed": tab === "settings", onClick: toggleSettings }, "⚙")), h("span", { className: "tw-muted" }, data?.coach?.project?.enabled ? data?.coach?.taskConsented ? label("ui.may.send.coaching.to.a.running.main.agent") : label("ui.project.coach.enabled.this.task.has.not.consented") : label("ui.observe.only.no.messages.to.the.main.agent"))), h("div", { className: "tw-usage", "aria-label": label("usage.label") }, h("div", { className: "tw-usage-title" }, usage?.task ? label("usage.current") : label("usage.all")), h("div", { className: "tw-usage-grid" }, usageCell(label("ui.inputAlt"), usageCurrent?.measuredCalls ? tokenCount(usageCurrent.inputTokens + usageCurrent.cacheReadTokens + usageCurrent.cacheWriteTokens) : label("ui.no.data.yet")), usageCell(label("ui.outputAlt"), usageCurrent?.measuredCalls ? tokenCount(usageCurrent.outputTokens) : label("ui.no.data.yet")), usageCell(label("ui.cache.hit"), usageCurrent?.cacheHitPercent === null || usageCurrent?.cacheHitPercent === void 0 ? label("ui.no.data.yet") : usageCurrent.cacheHitPercent.toFixed(1) + "%"), usageCell(label("ui.callsAlt"), String(usageCurrent?.calls ?? 0)), usageCell(label("ui.first.token"), usageCurrent?.last?.firstTokenMs === null || usageCurrent?.last?.firstTokenMs === void 0 ? label("ui.no.data.yet") : (usageCurrent.last.firstTokenMs / 1e3).toFixed(1) + "s"), usageCell(label("ui.speed"), usageCurrent?.last?.tokensPerSecond === null || usageCurrent?.last?.tokensPerSecond === void 0 ? label("ui.no.data.yet") : usageCurrent.last.tokensPerSecond.toFixed(1) + " tok/s")), h("div", { className: "tw-usage-note" }, label("ui.based.on.known.usage.cache.read") + tokenCount(usageCurrent?.cacheReadTokens) + label("ui.cache.write") + tokenCount(usageCurrent?.cacheWriteTokens) + (usageCurrent?.unknownCalls ? " · " + usageCurrent.unknownCalls + label("ui.calls.with.unknown.usage") : "") + (budget?.requestsUsed ? label("ui.total.reserved") + budget.requestsUsed + label("ui.callsAltAlt") : "")), usage?.recent?.length > 0 && h("details", null, h("summary", null, label("ui.recent.calls") + usage.recent.length + label("punctuation.closeCount")), ...usage.recent.map((call2) => h("div", { key: call2.checkId, className: "tw-usage-note" }, new Date(call2.created).toLocaleTimeString() + " · " + ({ "intent": label("ui.intent.extraction"), "assessment": label("ui.execution.review"), "chat": label("ui.sidebar.chat"), "clarification": label("ui.tradeoff.answer") }[call2.category] ?? call2.category) + " · " + (call2.requests ? labels[call2.status] ?? call2.status : label("ui.no.request.sent")) + " · " + (call2.inputTokens === null ? label("ui.usage.unknown") : label("ui.input") + tokenCount(call2.inputTokens + (call2.cacheReadTokens ?? 0) + (call2.cacheWriteTokens ?? 0)) + label("ui.outputAltAlt") + tokenCount(call2.outputTokens)) + " · " + (call2.totalMs === null ? label("ui.duration.unknown") : (call2.totalMs / 1e3).toFixed(1) + "s")))), usage?.task && h("details", null, h("summary", null, label("ui.all.tasks.total")), usageSummary(usage.global))), h("nav", { className: "tw-tabs" }, ...["overview", "goals", "tradeoffs", "coach", "chat"].map((id) => {
        const tabLabel = label("tabs." + id);
        return h("button", { key: id, "aria-selected": tab === id, onClick: () => navigate(id) }, id === "tradeoffs" && card ? label("tabs.count", { label: tabLabel, count: 1 }) : id === "goals" && goalPendingCount ? label("tabs.count", { label: tabLabel, count: goalPendingCount }) : id === "coach" && pendingCoach.length ? label("tabs.count", { label: tabLabel, count: pendingCoach.length }) : tabLabel);
      })), error && h("div", { className: "tw-error", role: "alert" }, error.key ? label(error.key) : error.status ? labels[error.status] ?? error.status : error.code ? errorText(language, error.code) : error.message), h("div", { className: "tw-body" }, body), tab === "chat" && data?.taskId && h("div", { className: "tw-compose" }, h("select", { "aria-label": label("ui.chat.mode"), value: mode, onChange: (e) => setMode(e.target.value) }, h("option", { value: "ask" }, label("ui.ask.keep.understanding.unchanged")), h("option", { value: "correct" }, label("ui.correct.update.supervisor.understanding.only"))), h("textarea", { "aria-label": label("ui.message.to.supervisor.agent"), value: draft, maxLength: 4e3, onChange: (e) => setDraft(e.target.value), placeholder: mode === "ask" ? label("ui.ask.the.supervisor.agent") : label("ui.describe.the.goal.or.requirements.to.correct") }), h("div", { className: "tw-row" }, h("button", { className: "tw-primary", disabled: busy || !draft.trim() || state === "paused", onClick: () => action("chat", { sessionId, text: draft, mode }) }, busy ? label("ui.processing") : label("ui.send.to.supervisor.agent"))))), consentPrompt && h("div", { className: "tw-consent-overlay", role: "dialog", "aria-modal": true, "aria-label": label("consent.title") }, h("div", { className: "tw-consent-box" }, h("h3", null, label("consent.title")), h("p", { className: "tw-muted" }, label("ui.current.projectAlt") + (data?.project?.path ?? data?.sessionWorkspace ?? label("ui.unknown.project"))), h("p", null, data?.coach?.project?.enabled ? label("ui.with.consent.taskwatch.sends.this.task.s.public.materials.to.the.supervision.model.project") : label("ui.with.consent.taskwatch.reads.this.task.s.public.conversation.and.tool.evidence.and.sends.t")), h("div", { className: "tw-row" }, h("button", { className: "tw-primary", disabled: busy, onClick: () => action("decide", { sessionId, choice: "accept", confirmed: true }) }, label("consent.enable")), h("button", { disabled: busy, onClick: () => action("decide", { sessionId, choice: "decline", confirmed: true }) }, label("consent.skip"))))));
    }
    return { inject: ["slots", "layout", "connection", "locale"], apply(ctx) {
      ctx.effect(() => ctx.slots.register({ name: "shell.overlay", id: "taskwatch-observer", inject: () => ({ rpc: ctx.connection.rpc, locale: ctx.locale }) }, Panel), "taskwatch: observer sidebar");
    } };
  } });
})();
