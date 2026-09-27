# TaskWatch

[简体中文](README.zh-CN.md)

> **Your coding agent is busy. Is it still building what you asked for?**

A small fix can turn into a large refactor before anyone asks whether that is still the goal. TaskWatch is an early-preview [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) plugin that keeps your request, the model's interpretation, visible execution evidence, and supervision feedback distinct, so an inference cannot silently become a new instruction.

TaskWatch is independent and is not affiliated with or endorsed by DeepSeek.

## Try the early preview

```sh
dsh plugin --profile web add github:cjx12036/TaskWatch
```

This is an early preview. The exported bundle has been smoke-checked on DSH `0.1.5-rc.3` for installation and sidebar UI flows with zero model calls. Live runtime generation and coach behavior have **not** been validated on that latest host, and TaskWatch makes no performance, benchmark, or quality claims. See the [prerelease notes](docs/releases/v0.0.1.md) for the measured scope and limits.

For launch copy, an illustrative 45–60 second recording script, and the remaining human-run launch checklist, see [Launch materials](docs/launch.md).

## What it does

TaskWatch maintains three connected views of a task:

1. **Intent** — original user messages, explicit requirements, and separately versioned model inferences.
2. **Evidence** — public conversation and tool evidence from the bound task, including visible gaps, timeouts, truncation, and stale results.
3. **Supervision** — assessments and suggestions that compare the evidence with the task's intent. They do not replace the user's words or expand authorization.

The sidebar can show the current goal, requirements, tradeoffs, usage, and reports. Its private supervisor chat updates only TaskWatch's own understanding; it does not send a message to the main Agent or rewrite the main task input.

### Observe and coach

**Observe** is the normal mode. It sends reports to you in TaskWatch and never messages the main Agent.

**Coach** is available only after explicit consent. You must enable coach for the project, and a task must have accepted supervision before it is eligible. When project coach is enabled, the new-task consent dialog explicitly discloses that a clear, evidence-backed execution deviation may automatically steer the running main Agent. Accepting that disclosed dialog grants both supervision consent and task coach consent. Previously bound tasks need the separate **Consent to coach** action after enabling project coach.

Coach may automatically steer a **clear, evidence-backed execution deviation** only to the currently running main Agent. Suggestions involving a goal change, permission, cost, irreversible action, or other material tradeoff wait for your approval. TaskWatch keeps the plugin source on coach messages, deduplicates and expires suggestions, rate-limits delivery, and does not wake an ended Agent.

## Install

TaskWatch is installed from GitHub into a DSH profile. The following uses the standard `web` profile:

```sh
dsh plugin --profile web add github:cjx12036/TaskWatch
```

Restart the `web` profile with your normal DSH launch command, then open the TaskWatch sidebar. Confirm that the bundle is present before launching if you need to diagnose an installation:

```sh
dsh --profile web --dump-config
```

The bundle should appear as `dsh-taskwatch`. TaskWatch ships a prebuilt client and requires no TaskWatch install-time build or prepare hook. Review the plugin source before installing.

## First use

1. Open TaskWatch and select **Settings**.
2. Choose and save the supervision provider and model, then explicitly allow supervisor model calls. Saving these settings alone does not enable a project or task.
3. Enable supervision for the current project.
4. When DSH asks for the task decision, choose **Enable supervision** for the specific task. If project coach is enabled, read its explicit coach disclosure before accepting; that one disclosed decision also grants coach consent for the new task. Skipping a task does not affect later tasks.
5. Review reports in the sidebar. Pause or resume observation for the task when needed.
6. If you want coaching, explicitly enable it for the project and give each applicable task its coach consent as described above.

Installing the plugin does not start observation or make model requests. A project must be enabled and each task must receive its own consent before TaskWatch observes that task.

## Data, consent, and model usage

After project and task consent, TaskWatch reads the consenting task's public conversation and public tool evidence and sends that material to the supervision provider and model you selected. The provider may bill those calls according to its own terms and actual usage. TaskWatch shows known usage and marks unavailable usage as unknown; choose a model and limits appropriate for your account.

TaskWatch does not use hidden reasoning, and the supervision Agent has no execution tools. Evidence can be incomplete: a timeout, a missing or truncated event, stale result, exhausted budget, or failed request is displayed as such instead of as a normal assessment. A model assessment is advice based on the available evidence, not a guarantee that work is correct or complete.

### Local storage

The private ledger defaults to `~/.dsh/taskwatch/ledger.sqlite`. A nonblank `DSH_HOME` selects `$DSH_HOME/taskwatch/ledger.sqlite`; for example, launch DSH with `DSH_HOME="$HOME/.dsh-private"`. Supported `~`, `~/` and `~\` prefixes expand to the OS home. Blank `DSH_HOME` uses the default. Relative homes are rejected. Automatic storage must resolve outside the plugin package, launch checkout and configured `workspacePath`, including existing symlink destinations; an unsafe or unresolvable location stops initialization with an error. Launching from the OS home still permits the standard `~/.dsh` location unless that home is explicitly configured as the workspace. This startup check covers known paths, not future session workspaces.

To keep an existing ledger or choose another location, set the TaskWatch plugin configuration's `dbPath` (for example, `/path/to/private/taskwatch/ledger.sqlite`). An explicit `dbPath` is preserved exactly, including existing relative-path behavior; choose its location deliberately. TaskWatch does not automatically migrate or delete ledgers when storage configuration changes or the plugin is removed. New ledger directories use mode `0700` and database files use `0600`.

## Compatibility and limitations

Development regression tests use DSH `0.1.1-rc.2`. An isolated installation of the exported bundle on DSH `0.1.5-rc.3` with Node.js `26.0.0` passed startup, sidebar state, language switching and model-settings smoke checks with zero model calls. This verifies installation and these UI paths, not live supervision or coach behavior on the newer host. Peer declarations name these two versions only. TaskWatch does not make benchmark or quality claims.

On the newer host, TaskWatch uses the public authenticated Fetch-route API because the legacy channel registration fails across plugin scopes. It retains a loopback-only Host/Origin check and a 64 KiB request limit; the older host keeps its loopback RPC channel. The web client accepts only the transport announced by the server. Remote access to TaskWatch endpoints is not supported.

The plugin needs a DSH installation with a web client and Node.js `>=22.23.2`. It supervises only the task explicitly bound through its consent flow. It cannot recover evidence that DSH did not expose, and coach cannot deliver to a main Agent that is no longer running.

## Remove

Remove TaskWatch from the profile and restart that profile:

```sh
dsh plugin --profile web remove dsh-taskwatch
```

Removal changes the DSH profile. It does not claim to migrate or delete an existing local TaskWatch ledger.

## Development

The release bundle lives in `release/`. Install dependencies and use the scripts declared by its package manifest:

```sh
npm ci --ignore-scripts
npm test
```

Run the public documentation test directly with:

```sh
node --test tests/public-docs.test.mjs
```

## License

[MIT](LICENSE) © 2026 cjx12036.
