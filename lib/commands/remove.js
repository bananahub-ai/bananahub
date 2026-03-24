import { rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { TEMPLATES_DIR } from '../constants.js';
import { rebuildRegistry } from '../registry.js';
import { bold, green, red } from '../color.js';

export async function removeCommand(args) {
  const id = args[0];
  if (!id) {
    console.error(red('Usage: bananahub remove <template-id>'));
    process.exit(1);
  }

  const dir = join(TEMPLATES_DIR, id);
  try {
    await access(dir);
  } catch {
    console.error(red(`Template "${id}" is not installed.`));
    process.exit(1);
  }

  await rm(dir, { recursive: true, force: true });
  await rebuildRegistry();
  console.log(green(`  Removed: ${bold(id)}`));
}
