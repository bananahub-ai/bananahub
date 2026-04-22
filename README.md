# bananahub

Template manager for [BananaHub Skill](https://github.com/bananahub-ai/bananahub-skill) — the agent-native multi-provider image workflow.

Install, manage, and share prompt or workflow modules for the BananaHub Skill workflow. BananaHub keeps the runtime lean and lets reusable prompt structures and guided SOPs travel as installable units.

## Model Strategy

BananaHub now treats provider/model choice as a first-class interaction:

- Prefer `gpt-image-2` for new high-quality generation, launch visuals, README covers, information graphics, and premium first-pass outputs.
- Prefer Gemini / Nano Banana (`gemini-3-pro-image-preview` first) for edit-heavy, multi-reference, consistency-heavy, and previously validated template workflows.
- Templates can declare provider/model support explicitly, so `bananahub` can surface the recommended model instead of treating all image models as interchangeable.

## Installation

```bash
npm install -g bananahub
```

Or run directly with npx:

```bash
npx bananahub <command>
```

## Requirements

- Node.js >= 18.0.0

## Commands

### `add <user/repo[/path/to/template]>`

Install template(s) from a GitHub repository, a specific template directory, or a known template collection.

```bash
bananahub add user/bananahub-cyberpunk
bananahub add bananahub-ai/bananahub-skill/cute-sticker
bananahub add user/multi-template-repo --template portrait
```

Options:
- `--template <name>` — Install a specific template from a multi-template directory or known collection
- `--all` — Install all templates from a multi-template directory or known collection

### `remove <template-id>`

Uninstall an installed template.

```bash
bananahub remove cyberpunk
```

### `list [--by-model]`

List all installed templates.

```bash
bananahub list
bananahub list --by-model
```

### `update [template-id]`

Update one or all installed templates.

```bash
bananahub update cyberpunk   # update a specific template
bananahub update             # update all templates
```

### `info <template-id>`

Show details about an installed template (metadata, version, source).

```bash
bananahub info cyberpunk
```

`info` now shows provider/model support and suggests an explicit override when a template has a stronger recommended model, for example `gpt-image-2`.

### `models [--remote]`

Show BananaHub's model support map from the local registry or the remote hub catalog.

```bash
bananahub models
bananahub models --remote
bananahub models --provider openai
```

### `search <keyword>`

Search the hub catalog for prompt or workflow templates.

```bash
bananahub search portrait
bananahub search logo --curated
bananahub search logo --model gpt-image-2
bananahub search diagram --provider openai --capability generation
```

Options:
- `--limit <n>` — Limit the number of results (default: 8, max: 20)
- `--curated` — Search only curated templates
- `--discovered` — Search only discovered templates
- `--provider <id>` — Filter by provider, for example `openai` or `google-ai-studio`
- `--model <id>` — Filter by canonical model id or alias, for example `gpt-image-2` or `nano-banana-pro`
- `--capability <name>` — Filter by capability such as `generation`, `edit`, or `mask_edit`

### `trending`

Show recent install trends from the BananaHub API.

```bash
bananahub trending
bananahub trending --period 24h
```

Options:
- `--period <24h|7d>` — Trending window (default: `7d`)
- `--limit <n>` — Limit the number of results (default: 10, max: 20)

### `init`

Scaffold a new prompt or workflow template project in the current directory.

```bash
bananahub init
bananahub init --type workflow
```

### `validate [path]`

Validate a template directory against the BananaHub template spec.

```bash
bananahub validate ./my-template
bananahub validate             # validates current directory
```

### `registry rebuild`

Rebuild the local registry index from installed templates.

```bash
bananahub registry rebuild
```

## Global Options

| Flag | Description |
|------|-------------|
| `--help`, `-h` | Show help message |
| `--version`, `-v` | Show version |

## Template Format

A valid BananaHub template directory must contain a `template.md` file with YAML frontmatter at its root. Published templates should declare a frontmatter `license` such as `CC-BY-4.0` and include a repo `LICENSE` file. Templates may be `type: prompt` or `type: workflow`, and may live as:

- a single-template repository with `template.md` at repo root
- a multi-template repository with `bananahub.json` plus per-template subdirectories
- a known collection layout such as `references/templates/<template-id>/template.md`

## Contributing

Code, docs, and tests contributed to this repo are accepted under the repo's MIT license.

Sign off each commit with the Developer Certificate of Origin:

```bash
git commit -s -m "feat: your change"
```

Template repos created with `bananahub init` default to `CC-BY-4.0` for template content. If you publish community templates, keep the template frontmatter `license` field and the repo `LICENSE` file in sync.

## License

Code in this repo is licensed under MIT.
