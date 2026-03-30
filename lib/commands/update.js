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
    toUpdate = templates.filter((template) => template.id === targetId);
    if (toUpdate.length === 0) {
      console.error(red(`Template "${targetId}" is not installed.`));
      process.exit(1);
    }
  }

  for (const template of toUpdate) {
    let source;
    try {
      const raw = await readFile(join(TEMPLATES_DIR, template.id, SOURCE_FILE), 'utf8');
      source = JSON.parse(raw);
    } catch {
      console.log(yellow(`  Skipping ${bold(template.id)}: no source info (locally created?)`));
      continue;
    }

    const installTarget = source.install_target || (source.template_path ? `${source.repo}/${source.template_path}` : source.repo);
    if (!installTarget) {
      console.log(yellow(`  Skipping ${bold(template.id)}: no source repo recorded`));
      continue;
    }

    console.log(dim(`  Updating ${bold(template.id)} from ${installTarget}...`));
    await addCommand([installTarget]);
  }

  console.log(green('\n  Update complete.\n'));
}
