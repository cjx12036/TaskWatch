import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {errorText, t} from '../plugins/taskwatch/i18n.mjs';

test('TaskWatch UI dictionary selects English, Chinese, and a safe English fallback', () => {
  assert.equal(t('en', 'tabs.overview'), 'Status');
  assert.equal(t('zh', 'tabs.overview'), '状态');
  assert.equal(t('fr', 'tabs.overview'), 'Status');
  assert.equal(t('en', 'missing.key'), 'missing.key');
});

test('TaskWatch UI dictionary interpolates only its own static template', () => {
  assert.equal(t('en', 'tabs.count', {label: 'Goals', count: 2}), 'Goals (2)');
  assert.equal(t('zh', 'tabs.count', {label: '目标', count: 2}), '目标（2）');
});

test('TaskWatch RPC error codes use the active locale and unknown codes use the generic error', () => {
  assert.equal(errorText('en', 'bad-request'), 'TaskWatch request failed. Refresh and try again.');
  assert.equal(errorText('zh', 'bad-request'), 'TaskWatch 请求失败，请刷新后重试。');
  assert.equal(errorText('en', 'unknown'), 'TaskWatch request failed. Refresh and try again.');
  assert.equal(errorText('zh', 'unknown'), 'TaskWatch 请求失败，请刷新后重试。');
});

test('client source translates RPC error codes without displaying server error messages', () => {
  const source = readFileSync(new URL('../plugins/taskwatch/client.source.mjs', import.meta.url), 'utf8');
  assert.match(source, /new RpcRequestError\(r\.error\.code\)/);
  assert.match(source, /errorText\(language,error\.code\)/);
  assert.doesNotMatch(source, /r\.error\?\.message/);
});

test('the checked-in DSH loader is reproducible from the client source', () => {
  const before = readFileSync(new URL('../plugins/taskwatch/client.js', import.meta.url), 'utf8');
  execFileSync(process.execPath, ['scripts/build-taskwatch-client.mjs'], {cwd: new URL('..', import.meta.url)});
  assert.equal(readFileSync(new URL('../plugins/taskwatch/client.js', import.meta.url), 'utf8'), before);
});

test('maintained UI source contains no untranslated Chinese literals', () => {
  const source = readFileSync(new URL('../plugins/taskwatch/client.source.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\p{Script=Han}/u);
});

test('every static client translation key has both translations', () => {
  const source = readFileSync(new URL('../plugins/taskwatch/client.source.mjs', import.meta.url), 'utf8');
  const keys = [...source.matchAll(/label\('([^']+)'\)/g)].map(match => match[1]);
  assert.ok(keys.length > 200);
  for (const key of new Set(keys)) {
    assert.notEqual(t('en', key), key, `Missing English: ${key}`);
    assert.notEqual(t('zh', key), key, `Missing Chinese: ${key}`);
    assert.doesNotMatch(t('en', key), /\p{Script=Han}/u, `Chinese in English: ${key}`);
  }
});

test('inherited property names are safe unknown translation keys', () => {
  for (const locale of ['en', 'zh', 'fr']) {
    for (const key of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
      assert.equal(t(locale, key), key);
    }
  }
});
