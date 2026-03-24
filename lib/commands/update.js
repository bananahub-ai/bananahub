import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TEMPLATES_DIR, SOURCE_FILE } from '../constants.js';
import { loadRegistry } from '../registry.js';
import { addCommand } from './add.js';
import { bold, dim, yellow, green, red } from '../color.js';

export async function updateCommand(args) {
  const targetId = args[0];
  const registry = await loadRegistry();
  const templates = registry.templates || [];

  if (templates.length === 0) {
    console.log(dim('  No templates installed.'));
    return;
  }

  let toUpdate = templates;
  if (targetId) {
    toUpdate = templates.filter(t => t.id === targetId);
    if (toUpdate.length === 0) {
      console.error(red(`Template "${targetId}" is not installed.`));
      process.exit(1);
    }
  }

  for (const t of toUpdate) {
    let source;
    try {
      const raw = await readFile(join(TEMPLATES_DIR, t.id, SOURCE_FILE), 'utf8');
      source = JSON.parse(raw);
    } catch {
      console.log(yellow(`  Skipping ${bold(t.id)}: no source info (locally created?)`));
      continue;
    }

    if (!source.repo) {
      console.log(yellow(`  Skipping ${bold(t.id)}: no source repo recorded`));
      continue;
    }

    console.log(dim(`  Updating ${bold(t.id)} from ${source.repo}...`));
    await addCommand([source.repo]);
  }

  console.log(green('\n  Update complete.\n'));
}
