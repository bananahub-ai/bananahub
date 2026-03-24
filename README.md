# bananahub

Template manager for [Nanobanana](https://github.com/nanobanana) — Gemini image generation skill.

Install, manage, and share prompt templates for the Nanobanana Claude Code skill.

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

### `add <user/repo>`

Install template(s) from a GitHub repository.

```bash
bananahub add user/nanobanana-cyberpunk
```

Options:
- `--template <name>` — Install a specific template from a multi-template repo
- `--all` — Install all templates from a multi-template repo

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

Search the hub for templates. *(coming soon)*

```bash
bananahub search portrait
```

### `trending`

Show trending templates. *(coming soon)*

```bash
bananahub trending
```

### `init`

Scaffold a new template project in the current directory.

```bash
bananahub init
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

A valid Nanobanana template repository must contain a `template.yaml` (or `template.json`) file at its root with at minimum a `name` and `version` field. Templates can be single-template repos or multi-template repos containing subdirectories.

## License

MIT
