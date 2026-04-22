import { bold, cyan, dim, green, red, yellow } from '../color.js';
import { fetchHubCatalog } from '../hub.js';
import { loadRegistry } from '../registry.js';
import {
  MODEL_DISPLAY,
  collectModelSupport,
  templateSupportsProviderModel
} from '../template-schema.js';

export async function modelsCommand(args = []) {
  const options = parseModelsArgs(args);
  let templates;
  let sourceLabel;

  try {
    if (options.remote) {
      const catalog = await fetchHubCatalog();
      templates = catalog.templates || [];
      sourceLabel = 'hub catalog';
    } else {
      const registry = await loadRegistry();
      templates = registry.templates || [];
      sourceLabel = 'local registry';
    }
  } catch (error) {
    console.error(red(`Error: ${error.message}`));
    process.exit(1);
  }

  const filteredTemplates = templates.filter((template) => templateSupportsProviderModel(template, options));
  const models = collectModelSupport(filteredTemplates)
    .filter((model) => !options.provider || model.provider === options.provider)
    .sort(compareModels);

  console.log(bold(`\n  BananaHub Model Map (${sourceLabel})\n`));
  console.log(dim('  Use this to choose a provider/model before installing or activating templates.'));
  console.log(dim('  Recommendation: use gpt-image-2 for new high-quality generation when OpenAI is available; use Gemini/Nano Banana for proven template/edit workflows.\n'));

  if (models.length === 0) {
    console.log(yellow('  No models matched the current filters.\n'));
    return;
  }

  for (const model of models) {
    printModel(model, options);
  }

  console.log(green('  Examples:'));
  console.log(dim('    bananahub search logo --model gpt-image-2'));
  console.log(dim('    bananahub search diagram --provider openai --capability generation'));
  console.log(dim('    bananahub list --by-model\n'));
}

function parseModelsArgs(args) {
  const options = {
    remote: false,
    provider: '',
    model: '',
    capability: ''
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--remote' || arg === '--hub') {
      options.remote = true;
      continue;
    }
    if (arg === '--provider') {
      options.provider = args[index + 1] || '';
      index++;
      continue;
    }
    if (arg === '--model') {
      options.model = args[index + 1] || '';
      index++;
      continue;
    }
    if (arg === '--capability') {
      options.capability = args[index + 1] || '';
      index++;
      continue;
    }
  }

  return options;
}

function compareModels(left, right) {
  const rankDiff = modelRank(left.id) - modelRank(right.id);
  if (rankDiff !== 0) return rankDiff;
  const countDiff = right.template_count - left.template_count;
  if (countDiff !== 0) return countDiff;
  return left.id.localeCompare(right.id);
}

function modelRank(modelId) {
  if (modelId === 'gpt-image-2') return 0;
  if (modelId === 'gemini-3-pro-image-preview') return 1;
  if (modelId === 'gemini-3.1-flash-image-preview') return 2;
  if (modelId.startsWith('gpt-image')) return 3;
  if (modelId.startsWith('gemini')) return 4;
  return 9;
}

function printModel(model, options) {
  const display = MODEL_DISPLAY[model.id] || {};
  const label = display.label || model.id;
  const tier = display.tier ? dim(` ${display.tier}`) : '';
  const provider = model.provider ? dim(` ${model.provider}`) : '';
  const family = model.family ? dim(`/${model.family}`) : '';
  const templates = model.templates.slice(0, 5).join(', ');

  console.log(`  ${bold(model.id)}${tier}`);
  console.log(`    ${cyan(label)}${provider}${family}`);
  if (display.note) {
    console.log(dim(`    ${display.note}`));
  }
  if (model.aliases.length) {
    console.log(dim(`    Aliases: ${model.aliases.join(', ')}`));
  }
  if (model.capabilities.length) {
    console.log(dim(`    Capabilities: ${model.capabilities.join(', ')}`));
  }
  console.log(dim(`    Templates: ${model.template_count}${templates ? ` (${templates}${model.templates.length > 5 ? ', ...' : ''})` : ''}`));
  if (options.model && model.id !== options.model) {
    console.log(dim(`    Matched by alias/filter: ${options.model}`));
  }
  console.log();
}
