import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { VALID_PROFILES, VALID_DIFFICULTIES } from '../constants.js';
import { bold, green, cyan, dim } from '../color.js';

async function collectInput() {
  if (process.stdin.isTTY) {
    return collectInteractive();
  }
  return collectPiped();
}

async function collectInteractive() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(resolve => rl.question(q, resolve));

  try {
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

    return { id, title, titleEn, profile, difficulty };
  } finally {
    rl.close();
  }
}

async function collectPiped() {
  const lines = [];
  const rl = createInterface({ input: process.stdin, terminal: false });
  for await (const line of rl) {
    lines.push(line.trim());
  }

  return {
    id: (lines[0] || 'my-template').toLowerCase().replace(/\s+/g, '-'),
    title: lines[1] || '我的模板',
    titleEn: lines[2] || 'My Template',
    profile: VALID_PROFILES.includes(lines[3]) ? lines[3] : 'general',
    difficulty: VALID_DIFFICULTIES.includes(lines[4]) ? lines[4] : 'beginner'
  };
}

export async function initCommand(args) {
  console.log(bold('\n  BananaHub Template Scaffolding\n'));

  const { id, title, titleEn, profile, difficulty } = await collectInput();

  const outDir = join(process.cwd(), id);
  await mkdir(join(outDir, 'samples'), { recursive: true });

  const templateMd = `---
id: ${id}
title: ${title}
title_en: ${titleEn}
author: your-github-username
version: 1.0.0
profile: ${profile}
tags: []
models:
  - name: gemini-3-pro-image-preview
    quality: best
aspect: "16:9"
difficulty: ${difficulty}
samples: []
created: ${new Date().toISOString().split('T')[0]}
updated: ${new Date().toISOString().split('T')[0]}
---

## Prompt Template

\`\`\`
Your prompt here with {{variable|default value}} slots
\`\`\`

## Variables

| Variable | Default | Description |
|----------|---------|-------------|
| \`variable\` | default value | Description |

## Tips

- Add tips for using this template
`;

  await writeFile(join(outDir, 'template.md'), templateMd);
  await writeFile(join(outDir, 'samples', '.gitkeep'), '');
  await writeFile(join(outDir, 'README.md'), `# ${titleEn}\n\nA Nanobanana template for ${profile} generation.\n\n## Install\n\n\`\`\`bash\nnpx bananahub add your-username/${id}\n\`\`\`\n`);

  console.log(green(`\n  Created: ${bold(id)}/`));
  console.log(dim(`    ${id}/template.md`));
  console.log(dim(`    ${id}/samples/.gitkeep`));
  console.log(dim(`    ${id}/README.md`));
  console.log(cyan('\n  Next steps:'));
  console.log(dim('    1. Edit template.md — add your prompt and variables'));
  console.log(dim('    2. Add sample images to samples/'));
  console.log(dim('    3. Create a GitHub repo and push'));
  console.log(dim('    4. Others install: npx bananahub add <user>/' + id));
  console.log();
}
