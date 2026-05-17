import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { VALID_PROFILES, VALID_DIFFICULTIES, VALID_TEMPLATE_TYPES } from '../constants.js';
import { bold, green, cyan, dim } from '../color.js';

async function collectInput(typeHint) {
  if (process.stdin.isTTY) {
    return collectInteractive(typeHint);
  }
  return collectPiped(typeHint);
}

async function collectInteractive(typeHint) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(resolve => rl.question(q, resolve));

  try {
    let type = typeHint || 'prompt';
    if (!typeHint) {
      console.log(dim(`  Template types: ${VALID_TEMPLATE_TYPES.join(', ')}`));
      type = (await ask(cyan('  Type: '))).trim() || 'prompt';
      if (!VALID_TEMPLATE_TYPES.includes(type)) {
        console.log(dim(`  Using "prompt" (invalid type: "${type}")`));
        type = 'prompt';
      }
    }

    const id = (await ask(cyan('  Template ID (lowercase, hyphens): '))).trim().toLowerCase().replace(/\s+/g, '-') || 'my-template';
    const title = (await ask(cyan('  Title (Chinese): '))).trim() || '我的模板';
    const titleEn = (await ask(cyan('  Title (English): '))).trim() || 'My Template';

    console.log(dim(`  Profiles: ${VALID_PROFILES.join(', ')}`));
    let profile = (await ask(cyan('  Profile: '))).trim() || 'general';
    if (!VALID_PROFILES.includes(profile)) {
      console.log(dim(`  Using "general" (invalid profile: "${profile}")`));
      profile = 'general';
    }

    console.log(dim(`  Levels: ${VALID_DIFFICULTIES.join(', ')}`));
    let difficulty = (await ask(cyan('  Difficulty: '))).trim() || 'beginner';
    if (!VALID_DIFFICULTIES.includes(difficulty)) difficulty = 'beginner';

    return { type, id, title, titleEn, profile, difficulty };
  } finally {
    rl.close();
  }
}

async function collectPiped(typeHint) {
  const lines = [];
  const rl = createInterface({ input: process.stdin, terminal: false });
  for await (const line of rl) {
    lines.push(line.trim());
  }

  const pipedType = VALID_TEMPLATE_TYPES.includes(lines[0]) ? lines[0] : null;
  const offset = pipedType ? 1 : 0;

  return {
    type: VALID_TEMPLATE_TYPES.includes(typeHint) ? typeHint : (pipedType || 'prompt'),
    id: (lines[offset] || 'my-template').toLowerCase().replace(/\s+/g, '-'),
    title: lines[offset + 1] || '我的模板',
    titleEn: lines[offset + 2] || 'My Template',
    profile: VALID_PROFILES.includes(lines[offset + 3]) ? lines[offset + 3] : 'general',
    difficulty: VALID_DIFFICULTIES.includes(lines[offset + 4]) ? lines[offset + 4] : 'beginner'
  };
}

function buildTemplateBody(type) {
  if (type === 'workflow') {
    return `## Goal

Describe the workflow outcome this template should help the agent produce.

## When To Use

- Describe the situations where this workflow is a strong fit

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| \`input_name\` | yes | What the agent needs before starting |

## Steps

1. Describe the first step the agent should take.
2. Describe the next decision or generation step.
3. Describe how to iterate or stop.

## Prompt Blocks

### Starter Prompt

\`\`\`text
Reusable prompt block or instruction fragment for this workflow
\`\`\`

## Success Checks

- Add checks that confirm the workflow result is usable
`;
  }

  return `## Prompt Template

\`\`\`
Provider-neutral base prompt with {{variable|default value}} slots. Keep this conservative and avoid model-specific hacks.
\`\`\`

## Prompt Template: gemini

\`\`\`
Gemini/Nano Banana tuned prompt with {{variable|default value}} slots. Use descriptive scene language, preserve exact quoted labels when needed, and avoid generic quality tags.
\`\`\`

## Prompt Template: gpt-image

\`\`\`
GPT Image tuned prompt with {{variable|default value}} slots. State exact constraints, what to avoid, and any text/label limits explicitly.
\`\`\`

## Variables

| Variable | Default | Description |
|----------|---------|-------------|
| \`variable\` | default value | Description |

## Tips

- Keep provider-specific tactics inside the matching prompt variant
- Do not reuse a Gemini-tuned prompt for GPT Image unless it has been tested and documented
`;
}

function buildReadme(titleEn, id, profile, type) {
  return `# ${titleEn}

A BananaHub ${type} template for ${profile} workflows.

## Install

\`\`\`bash
npx bananahub add your-username/${id}
\`\`\`

## Verified Models

- \`gpt-image-2\` via \`gpt-image\` prompt variant — validate with a real sample before publishing

## Supported Models

- \`gpt-image-1\` via \`gpt-image\` prompt variant — compatible fallback, not yet manually verified
- \`gemini-3.1-flash-image-preview\` via \`gemini\` prompt variant — expected to work, not yet manually verified

## Sample Outputs

| File | Provider | Model | Prompt Variant |
|---|---|---|---|
| \`samples/sample-gpt-image-2-01.png\` | \`chatgpt-compatible\` | \`gpt-image-2\` | \`gpt-image\` |

Update this README after you generate real samples. Each sample should name the provider, exact model, and prompt variant used.

## License

This template content is published under CC BY 4.0. Keep the frontmatter \`license\` value and the repo \`LICENSE\` file aligned. Only publish samples and copy that you can redistribute.
`;
}

function buildTemplateLicenseFile() {
  return `Creative Commons Attribution 4.0 International

SPDX-License-Identifier: CC-BY-4.0

This template content is licensed under the Creative Commons Attribution 4.0 International License.

You may share and adapt this material for any purpose, including commercial use,
as long as you give appropriate credit, provide a link to the license, and indicate
if changes were made.

License text:
https://creativecommons.org/licenses/by/4.0/
`;
}

export async function initCommand(args) {
  console.log(bold('\n  BananaHub Template Scaffolding\n'));

  const typeFlag = args.indexOf('--type');
  const typeHint = typeFlag !== -1 ? args[typeFlag + 1] : null;
  if (typeHint && !VALID_TEMPLATE_TYPES.includes(typeHint)) {
    throw new Error(`Invalid template type: ${typeHint}`);
  }

  const { type, id, title, titleEn, profile, difficulty } = await collectInput(typeHint);

  const outDir = join(process.cwd(), id);
  await mkdir(join(outDir, 'samples'), { recursive: true });

  const sampleFrontmatter = type === 'prompt' ? `samples:
  - file: samples/sample-gpt-image-2-01.png
    provider: chatgpt-compatible
    model: gpt-image-2
    prompt_variant: gpt-image
    prompt: "The exact prompt used to generate this sample"
    aspect: "16:9"` : `samples: []`;

  const templateMd = `---
type: ${type}
id: ${id}
title: ${title}
title_en: ${titleEn}
author: your-github-username
license: CC-BY-4.0
version: 1.0.0
profile: ${profile}
tags: []
models:
  - name: gemini-3-pro-image-preview
    tested: true
    quality: best
  - name: gemini-3.1-flash-image-preview
    tested: false
    quality: good
providers:
  - id: google-ai-studio
    family: gemini-image
    models:
      - id: gemini-3-pro-image-preview
        aliases: [nano-banana-pro]
        quality: best
        prompt_variant: gemini
      - id: gemini-3.1-flash-image-preview
        aliases: [nano-banana-2]
        quality: good
        prompt_variant: gemini
  - id: openai
    family: gpt-image
    models:
      - id: gpt-image-2
        quality: untested
        prompt_variant: gpt-image
capabilities:
  generation: true
  edit: false
  mask_edit: false
prompt_variants:
  default: base
  gemini: prompt-gemini
  gpt-image: prompt-gpt-image
aspect: "16:9"
difficulty: ${difficulty}
${sampleFrontmatter}
created: ${new Date().toISOString().split('T')[0]}
updated: ${new Date().toISOString().split('T')[0]}
---

${buildTemplateBody(type)}
`;

  await writeFile(join(outDir, 'template.md'), templateMd);
  await writeFile(join(outDir, 'samples', '.gitkeep'), '');
  await writeFile(join(outDir, 'README.md'), buildReadme(titleEn, id, profile, type));
  await writeFile(join(outDir, 'LICENSE'), buildTemplateLicenseFile());

  console.log(green(`\n  Created: ${bold(id)}/`));
  console.log(dim(`    ${id}/template.md`));
  console.log(dim(`    ${id}/samples/.gitkeep`));
  console.log(dim(`    ${id}/README.md`));
  console.log(dim(`    ${id}/LICENSE`));
  console.log(cyan('\n  Next steps:'));
  console.log(dim(`    1. Edit template.md — add your ${type === 'workflow' ? 'workflow sections and prompt blocks' : 'prompt and variables'}`));
  console.log(dim('    2. Add sample images to samples/ and include the model in each filename'));
  console.log(dim('    3. Update README.md with verified/supported models, sample mappings, and any license notes'));
  console.log(dim('    4. Create a GitHub repo and push'));
  console.log(dim('    5. Others install: npx bananahub add <user>/' + id));
  console.log();
}
