import { loadRegistry } from '../registry.js';
import { bold, dim, cyan, yellow } from '../color.js';
import { collectModelSupport } from '../template-schema.js';

export async function listCommand(args = []) {
  const registry = await loadRegistry();
  const templates = registry.templates || [];

  if (templates.length === 0) {
    console.log(dim('\n  No templates installed.'));
    console.log(dim('  Install one: bananahub add <user/repo>\n'));
    return;
  }

  if (args.includes('--by-model') || args.includes('--by-provider')) {
    printByModel(templates);
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
      const type = dim(` [${t.type || 'prompt'}]`);
      const version = t.version ? dim(` v${t.version}`) : '';
      const author = t.author ? dim(` by ${t.author}`) : '';
      console.log(`    ${bold(t.id)}${type}  ${title}${version}${author}`);
      if (t.tags?.length) {
        console.log(dim(`      Tags: ${t.tags.join(', ')}`));
      }
      if (t.providers?.length || t.models?.length) {
        const providers = t.providers?.length ? t.providers.join(', ') : 'providers n/a';
        const models = t.models?.length ? t.models.slice(0, 4).join(', ') : 'models n/a';
        console.log(dim(`      Support: ${providers} | ${models}`));
      }
    }
    console.log();
  }
}

function printByModel(templates) {
  const models = collectModelSupport(templates);
  console.log(bold(`\n  Installed Templates by Model (${templates.length})\n`));

  for (const model of models.sort((left, right) => right.template_count - left.template_count || left.id.localeCompare(right.id))) {
    console.log(cyan(`  ${model.id}`) + dim(`  ${model.provider || 'provider n/a'}${model.family ? `/${model.family}` : ''}`));
    for (const templateId of model.templates.slice(0, 12)) {
      console.log(`    - ${templateId}`);
    }
    if (model.templates.length > 12) {
      console.log(dim(`    ... ${model.templates.length - 12} more`));
    }
    console.log();
  }
}
