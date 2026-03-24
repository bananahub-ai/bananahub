import { rebuildRegistry } from '../registry.js';
import { bold, green, dim } from '../color.js';

export async function registryCommand(args) {
  const sub = args[0];
  if (sub !== 'rebuild') {
    console.log(`  Usage: bananahub registry rebuild`);
    process.exit(1);
  }

  console.log(dim('  Rebuilding registry...'));
  const registry = await rebuildRegistry();
  const count = registry.templates?.length || 0;
  console.log(green(`  Registry rebuilt: ${bold(String(count))} template(s) indexed.\n`));
}
