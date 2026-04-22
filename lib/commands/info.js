import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SOURCE_FILE, SKILL_COMMAND } from '../constants.js';
import { parseFrontmatter } from '../frontmatter.js';
import { bold, dim, cyan, green } from '../color.js';
import { red } from '../color.js';
import { resolveInstalledTemplateDir } from '../paths.js';
import { MODEL_DISPLAY, normalizeProviders } from '../template-schema.js';

export async function infoCommand(args) {
  const id = args[0];
  if (!id) {
    console.error(red('Usage: bananahub info <template-id>'));
    process.exit(1);
  }

  let content;
  const templateDir = await resolveInstalledTemplateDir(id);
  try {
    content = await readFile(join(templateDir, 'template.md'), 'utf8');
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
    const raw = await readFile(join(templateDir, SOURCE_FILE), 'utf8');
    source = JSON.parse(raw);
  } catch { /* ok */ }

  console.log(bold(`\n  ${fm.title || id}`));
  if (fm.title_en) console.log(dim(`  ${fm.title_en}`));
  console.log();

  const fields = [
    ['ID', fm.id || id],
    ['Type', fm.type || 'prompt'],
    ['Version', fm.version || '-'],
    ['Author', fm.author || '-'],
    ['License', fm.license || '-'],
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
    console.log(`  ${cyan('Legacy'.padEnd(12))}`);
    for (const m of fm.models) {
      const name = m.name || m;
      const quality = m.quality ? ` (${m.quality})` : '';
      console.log(`    - ${name}${dim(quality)}`);
    }
  }

  const providers = normalizeProviders(fm);
  if (providers.length) {
    console.log(`  ${cyan('Providers'.padEnd(12))}`);
    for (const provider of providers) {
      const family = provider.family ? dim(` [${provider.family}]`) : '';
      console.log(`    - ${provider.id}${family}`);
      for (const model of provider.models) {
        const quality = model.quality ? dim(` (${model.quality})`) : '';
        const variant = model.prompt_variant ? dim(` via ${model.prompt_variant}`) : '';
        const recommendation = MODEL_DISPLAY[model.id]?.tier === 'recommended' ? dim(' recommended') : '';
        console.log(`      - ${model.id}${quality}${variant}${recommendation}`);
      }
    }
  }

  if (fm.capabilities && typeof fm.capabilities === 'object') {
    const capabilities = Object.entries(fm.capabilities)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
    console.log(`  ${cyan('Capabilities'.padEnd(12))} ${capabilities}`);
  }

  if (source) {
    console.log();
    console.log(dim(`  Source: ${source.repo}`));
    console.log(dim(`  Installed: ${source.installed_at}`));
    if (source.sha) console.log(dim(`  SHA: ${source.sha.slice(0, 8)}`));
  }

  console.log(green(`\n  Use: ${SKILL_COMMAND} use ${id}`));
  const recommended = findRecommendedProviderModel(providers);
  if (recommended) {
    console.log(dim(`  Provider override: ${SKILL_COMMAND} use ${id} --provider ${recommended.provider} --model ${recommended.model}`));
  }
  console.log();
}

function findRecommendedProviderModel(providers) {
  for (const provider of providers) {
    const model = provider.models.find((entry) => entry.id === 'gpt-image-2');
    if (model) return { provider: provider.id, model: model.id };
  }
  for (const provider of providers) {
    const model = provider.models.find((entry) => entry.quality === 'best') || provider.models[0];
    if (model) return { provider: provider.id, model: model.id };
  }
  return null;
}
