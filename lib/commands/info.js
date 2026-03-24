import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TEMPLATES_DIR, SOURCE_FILE } from '../constants.js';
import { parseFrontmatter } from '../frontmatter.js';
import { bold, dim, cyan, green } from '../color.js';
import { red } from '../color.js';

export async function infoCommand(args) {
  const id = args[0];
  if (!id) {
    console.error(red('Usage: bananahub info <template-id>'));
    process.exit(1);
  }

  let content;
  try {
    content = await readFile(join(TEMPLATES_DIR, id, 'template.md'), 'utf8');
  } catch {
    console.error(red(`Template "${id}" is not installed.`));
    process.exit(1);
  }

  const fm = parseFrontmatter(content);
  if (!fm) {
    console.error(red('Could not parse template frontmatter.'));
    process.exit(1);
  }

  let source = null;
  try {
    const raw = await readFile(join(TEMPLATES_DIR, id, SOURCE_FILE), 'utf8');
    source = JSON.parse(raw);
  } catch { /* ok */ }

  console.log(bold(`\n  ${fm.title || id}`));
  if (fm.title_en) console.log(dim(`  ${fm.title_en}`));
  console.log();

  const fields = [
    ['ID', fm.id || id],
    ['Version', fm.version || '-'],
    ['Author', fm.author || '-'],
    ['Profile', fm.profile || '-'],
    ['Aspect', fm.aspect || '-'],
    ['Difficulty', fm.difficulty || '-'],
  ];

  for (const [k, v] of fields) {
    console.log(`  ${cyan(k.padEnd(12))} ${v}`);
  }

  if (fm.tags?.length) {
    console.log(`  ${cyan('Tags'.padEnd(12))} ${fm.tags.join(', ')}`);
  }

  if (fm.models?.length) {
    console.log(`  ${cyan('Models'.padEnd(12))}`);
    for (const m of fm.models) {
      const name = m.name || m;
      const quality = m.quality ? ` (${m.quality})` : '';
      console.log(`    - ${name}${dim(quality)}`);
    }
  }

  if (source) {
    console.log();
    console.log(dim(`  Source: ${source.repo}`));
    console.log(dim(`  Installed: ${source.installed_at}`));
    if (source.sha) console.log(dim(`  SHA: ${source.sha.slice(0, 8)}`));
  }

  console.log(green(`\n  Use: /nanobanana use ${id}\n`));
}
