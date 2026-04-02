# bananahub

Template manager for [Nanobanana](https://github.com/nano-banana-hub/nanobanana) — the agent-native Gemini image workflow.

Install, manage, and share prompt or workflow modules for the Nanobanana Claude Code workflow. BananaHub keeps the base skill lean and lets reusable prompt structures and guided SOPs travel as installable units.

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
bananahub add user/nanobanana-cyberpunk
bananahub add nano-banana-hub/nanobanana/cute-sticker
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

### `list`

List all installed templates.

```bash
bananahub list
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

### `search <keyword>`

Search the hub catalog for prompt or workflow templates.

```bash
bananahub search portrait
bananahub search logo --curated
```

Options:
- `--limit <n>` — Limit the number of results (default: 8, max: 20)
- `--curated` — Search only curated templates
- `--discovered` — Search only discovered templates

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

Validate a template directory against the Nanobanana template spec.

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

A valid Nanobanana template directory must contain a `template.md` file with YAML frontmatter at its root. Templates may be `type: prompt` or `type: workflow`, and may live as:

- a single-template repository with `template.md` at repo root
- a multi-template repository with `bananahub.json` plus per-template subdirectories
- a known collection layout such as `references/templates/<template-id>/template.md`

## License

MIT
