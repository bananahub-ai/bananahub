import { bold, cyan, dim, green, red, yellow } from '../color.js';
import { fetchHubCatalog, fetchHubTrending, buildCatalogLookup, compareCatalogPriority, templateKey } from '../hub.js';
import { HUB_SITE } from '../constants.js';

export async function searchCommand(args) {
  const options = parseSearchArgs(args);
  const keyword = options.terms.join(' ').trim();

  if (!keyword) {
    console.error(red('Usage: bananahub search <keyword> [--limit N] [--curated|--discovered]'));
    process.exit(1);
  }

  let catalog;
  try {
    catalog = await fetchHubCatalog();
  } catch (error) {
    console.error(red(`Error: ${error.message}`));
    console.log(dim(`Browse the hub directly: ${HUB_SITE}`));
    process.exit(1);
  }

  const matches = rankTemplates(catalog.templates || [], keyword, options).slice(0, options.limit);

  if (matches.length === 0) {
    console.log(yellow(`\n  No hub templates matched "${keyword}".`));
    console.log(dim(`  Browse the full catalog: ${HUB_SITE}\n`));
    return;
  }

  const sourceHint = options.source === 'all' ? '' : dim(` (${options.source})`);
  console.log(bold(`\n  Hub Search Results${sourceHint}\n`));

  for (const [index, template] of matches.entries()) {
    printTemplateResult(index + 1, template);
  }

  console.log(green('  Install with: bananahub add <install_target>\n'));
}

export async function trendingCommand(args = []) {
  const options = parseTrendingArgs(args);
  if (!['24h', '7d'].includes(options.period)) {
    console.error(red('Usage: bananahub trending [--period 24h|7d] [--limit N]'));
    process.exit(1);
  }

  let catalog;
  let trending;

  try {
    [catalog, trending] = await Promise.all([
      fetchHubCatalog(),
      fetchHubTrending({ period: options.period, limit: options.limit })
    ]);
  } catch (error) {
    console.error(red(`Error: ${error.message}`));
    console.log(dim(`Browse the hub directly: ${HUB_SITE}`));
    process.exit(1);
  }

  const lookup = buildCatalogLookup(catalog);
  const items = trending.templates || [];

  if (items.length === 0) {
    console.log(yellow(`\n  No trending installs found for ${options.period}.\n`));
    return;
  }

  console.log(bold(`\n  Trending Templates (${options.period})\n`));

  for (const [index, item] of items.entries()) {
    const template = lookup.get(templateKey(item.repo, item.template_id));
    printTrendingResult(index + 1, item, template);
  }

  console.log(green('  Install with: bananahub add <install_target>\n'));
}

function parseSearchArgs(args) {
  const options = {
    terms: [],
    limit: 8,
    source: 'all'
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--limit') {
      options.limit = clampLimit(args[index + 1], 8, 20);
      index++;
      continue;
    }
    if (arg === '--curated') {
      options.source = 'curated';
      continue;
    }
    if (arg === '--discovered') {
      options.source = 'discovered';
      continue;
    }
    options.terms.push(arg);
  }

  return options;
}

function parseTrendingArgs(args) {
  const options = {
    limit: 10,
    period: '7d'
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--limit') {
      options.limit = clampLimit(args[index + 1], 10, 20);
      index++;
      continue;
    }
    if (arg === '--period') {
      options.period = args[index + 1] || '';
      index++;
    }
  }

  return options;
}

function rankTemplates(templates, keyword, options) {
  const query = normalize(keyword);
  const terms = buildTerms(query);

  return templates
    .filter((template) => options.source === 'all' || template.catalog_source === options.source)
    .map((template) => ({
      template,
      score: scoreTemplate(template, query, terms)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return compareCatalogPriority(left.template, right.template);
    })
    .map((entry) => entry.template);
}

function scoreTemplate(template, query, terms) {
  const id = normalize(template.id);
  const title = normalize(template.title);
  const titleEn = normalize(template.title_en);
  const description = normalize(template.description);
  const profile = normalize(template.profile);
  const tags = (template.tags || []).map((tag) => normalize(tag));

  let relevance = 0;

  if (id === query) relevance += 100;
  if (title === query || titleEn === query) relevance += 80;
  if (tags.includes(query)) relevance += 60;

  if (id.includes(query)) relevance += 24;
  if (title.includes(query) || titleEn.includes(query)) relevance += 24;
  if (description.includes(query)) relevance += 12;
  if (profile.includes(query)) relevance += 8;

  for (const term of terms) {
    if (term === query) continue;
    if (tags.includes(term)) relevance += 10;
    if (tags.some((tag) => tag.includes(term))) relevance += 6;
    if (id.includes(term)) relevance += 5;
    if (title.includes(term) || titleEn.includes(term)) relevance += 5;
    if (description.includes(term)) relevance += 2;
    if (profile.includes(term)) relevance += 2;
  }

  if (relevance === 0) {
    return 0;
  }

  let score = relevance;
  if (template.pinned) score += 12;
  if (template.featured) score += 8;
  if (template.catalog_source === 'curated') score += 4;
  if (template.official) score += 2;

  return score;
}

function buildTerms(query) {
  const parts = query
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part.length > 1 || /[^\u0000-\u007f]/.test(part));

  if (query && !parts.includes(query)) {
    parts.unshift(query);
  }

  return [...new Set(parts)];
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function printTemplateResult(index, template) {
  const title = template.title_en || template.title || template.id;
  const subtitle = template.title && template.title_en ? template.title : '';
  const flags = buildFlags(template);
  const primaryCmd = template.primary_cmd || template.install_cmd || '';
  const commandLabel = template.primary_action === 'use' ? 'Use' : 'Install';

  console.log(`  ${cyan(String(index).padStart(2, ' '))}. ${bold(template.id)}${dim(` [${template.type || 'prompt'}]`)}  ${title}`);
  if (subtitle) {
    console.log(dim(`      ${subtitle}`));
  }
  console.log(dim(`      ${template.profile || 'general'} | ${template.difficulty || 'beginner'}${flags ? ` | ${flags}` : ''}`));
  if (template.description) {
    console.log(dim(`      ${clip(template.description, 140)}`));
  }
  if (template.tags?.length) {
    console.log(dim(`      Tags: ${template.tags.slice(0, 6).join(', ')}`));
  }
  if (primaryCmd) {
    console.log(dim(`      ${commandLabel}: ${primaryCmd}`));
  }
  console.log();
}

function printTrendingResult(index, item, template) {
  const id = template?.id || item.template_id;
  const type = template?.type || 'template';
  const title = template?.title_en || template?.title || id;
  const subtitle = template?.title && template?.title_en ? template.title : '';
  const flags = buildFlags(template);
  const primaryCmd = template?.primary_cmd || template?.install_cmd || `bananahub add ${item.repo}`;
  const commandLabel = template?.primary_action === 'use' ? 'Use' : 'Install';

  console.log(`  ${cyan(String(index).padStart(2, ' '))}. ${bold(id)}${dim(` [${type}]`)}  ${title}`);
  if (subtitle) {
    console.log(dim(`      ${subtitle}`));
  }
  console.log(dim(`      ${item.installs} installs | ${item.repo}${flags ? ` | ${flags}` : ''}`));
  console.log(dim(`      ${commandLabel}: ${primaryCmd}`));
  console.log();
}

function buildFlags(template) {
  if (!template) {
    return '';
  }

  const flags = [];
  if (template.catalog_source) flags.push(template.catalog_source);
  if (template.official) flags.push('official');
  if (template.pinned) flags.push('pinned');
  if (template.featured) flags.push('featured');
  return flags.join(', ');
}

function clip(text, maxLength) {
  const value = String(text || '').trim();
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function clampLimit(rawValue, fallback, max) {
  const parsed = parseInt(rawValue || String(fallback), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}
