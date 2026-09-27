import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const text = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('public documentation gives both audiences complete and linked installation guidance', () => {
  const english = text('../README.md');
  const chinese = text('../README.zh-CN.md');
  const install = 'dsh plugin --profile web add github:cjx12036/TaskWatch';
  const uninstall = 'dsh plugin --profile web remove dsh-taskwatch';

  assert.match(english, /README\.zh-CN\.md/);
  assert.match(chinese, /README\.md/);
  for (const document of [english, chinese]) {
    assert.match(document, new RegExp(install));
    assert.match(document, new RegExp(uninstall));
    assert.match(document, /project/i);
    assert.match(document, /task/i);
    assert.match(document, /observe/i);
    assert.match(document, /coach/i);
    assert.match(document, /model/i);
  }
});

test('public documentation describes consent, data sharing, and coaching boundaries accurately', () => {
  const english = text('../README.md');
  const chinese = text('../README.zh-CN.md');

  for (const document of [english, chinese]) {
    assert.match(document, /explicit|明确|显式/i);
    assert.match(document, /public (conversation|text|materials)|公开(?:对话|文本|材料)/i);
    assert.match(document, /running main Agent|(?:运行中的|仍在运行的)主 Agent/i);
    assert.doesNotMatch(document, /coach (?:is )?not (?:implemented|available)/i);
    assert.doesNotMatch(document, /coach.*default.*automatic|coach.*默认.*自动/i);
    assert.doesNotMatch(document, /docs\/(?:cases|development)|\.superpowers|\/Users\//i);
  }

  assert.match(english, /new-task consent dialog[\s\S]*clear, evidence-backed execution deviation[\s\S]*automatically steer[\s\S]*running main Agent/i);
  assert.match(chinese, /新 task 同意弹窗[\s\S]*明确披露[\s\S]*执行偏差[\s\S]*自动 steer[\s\S]*运行中的主 Agent/i);
  assert.match(english, /previously bound tasks[\s\S]*Consent to coach/i);
  assert.match(chinese, /已经绑定的 task[\s\S]*同意使用 coach/i);
});

test('public documentation makes no unverified quality claim and limits the measured latest DSH smoke claim', () => {
  const english = text('../README.md');
  const chinese = text('../README.zh-CN.md');

  assert.match(english, /DSH `0\.1\.5-rc\.3`[\s\S]*Node.js `26\.0\.0`[\s\S]*zero model calls/i);
  assert.match(chinese, /0\.1\.5-rc\.3[\s\S]*26\.0\.0[\s\S]*零模型调用/i);
  assert.match(english, /does not make benchmark or quality claims/i);
  assert.match(chinese, /不宣称 benchmark 成绩或质量结果/i);
});

test('public release metadata is searchable and the license is MIT', () => {
  const manifest = JSON.parse(text('../release/package.json'));
  const license = text('../LICENSE');

  assert.match(manifest.description, /deepseek harness|dsh|agent supervision|intent tracking/i);
  assert.deepEqual(manifest.keywords, ['deepseek-harness', 'dsh-plugin', 'agent-supervision', 'intent-tracking', 'taskwatch']);
  assert.match(license, /MIT License/);
  assert.match(license, /Copyright \(c\) 2026 cjx12036/);
});

test('installation uses the shipped client without a TaskWatch prepare hook', () => {
  assert.match(text('../README.md'), /prebuilt client[\s\S]*no TaskWatch install-time build or prepare hook/);
  assert.match(text('../README.zh-CN.md'), /预构建客户端[\s\S]*不需要 TaskWatch 安装时构建或 prepare hook/);
});

test('launch materials are public, bilingual, and do not present a hypothetical demo as evidence', () => {
  const launch = text('../docs/launch.md');
  const notes = text('../docs/releases/v0.0.1.md');
  const feedback = text('../.github/ISSUE_TEMPLATE/feedback.yml');

  assert.match(launch, /Your coding agent is busy\. Is it still building what you asked for\?/);
  assert.match(launch, /Agent 很忙，但忙的还是你想做的事吗？/);
  assert.match(launch, /Planned example only/i);
  assert.match(launch, /personal-ledger fix[\s\S]*multi-tenant, microservice-style approach/i);
  assert.match(launch, /user's real clarification/i);
  assert.match(launch, /5–10/);
  assert.doesNotMatch(launch, /docs\/cases/i);
  assert.match(launch, /do not reuse private development cases/i);
  assert.doesNotMatch(notes, /142 files|363 files|142 个文件|363 个文件/);
  assert.match(notes, /live runtime supervision generation and coach behavior were not validated/i);
  assert.match(feedback, /installation \/ 安装问题/);
  assert.match(feedback, /false positive \/ 误报/);
  assert.match(feedback, /missed deviation \/ 漏报/);
  assert.match(feedback, /usefulness \/ 使用体验/);
  assert.match(feedback, /Do not include private prompts, conversation transcripts, tool logs, credentials, API keys/i);
});
