import { loadRegistry } from '../registry.js';
import { bold, dim, cyan, yellow } from '../color.js';

export async function listCommand() {
  const registry = await loadRegistry();
  const templates = registry.templates || [];

  if (templates.length === 0) {
    console.log(dim('\n  No templates installed.'));
    console.log(dim('  Install one: bananahub add <user/repo>\n'));
    return;
  }

  // Group by profile
  const groups = {};
  for (const t of templates) {
    const profile = t.profile || 'general';
    if (!groups[profile]) groups[profile] = [];
    groups[profile].push(t);
  }

  console.log(bold(`\n  Installed Templates (${templates.length})\n`));

  for (const [profile, items] of Object.entries(groups).sort()) {
    console.log(cyan(`  [${profile}]`));
    for (const t of items) {
      const title = t.title_en || t.title || t.id;
      const version = t.version ? dim(` v${t.version}`) : '';
      const author = t.author ? dim(` by ${t.author}`) : '';
      console.log(`    ${bold(t.id)}  ${title}${version}${author}`);
      if (t.tags?.length) {
        console.log(dim(`      Tags: ${t.tags.join(', ')}`));
      }
    }
    console.log();
  }
}
