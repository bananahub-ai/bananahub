import { CLI_VERSION, HUB_API, HUB_CATALOG_URL } from './constants.js';

export async function fetchHubCatalog() {
  const res = await fetch(HUB_CATALOG_URL, {
    headers: hubHeaders()
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch hub catalog: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data || !Array.isArray(data.templates)) {
    throw new Error('Hub catalog is missing the templates array.');
  }

  return data;
}

export async function fetchHubTrending({ period = '7d', limit = 10 } = {}) {
  const url = new URL(`${HUB_API}/trending`);
  url.searchParams.set('period', period);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, {
    headers: hubHeaders()
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch hub trending data: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data || !Array.isArray(data.templates)) {
    throw new Error('Hub trending response is missing the templates array.');
  }

  return data;
}

export function buildCatalogLookup(catalog) {
  const lookup = new Map();
  for (const template of catalog.templates || []) {
    lookup.set(templateKey(template.repo, template.id), template);
  }
  return lookup;
}

export function compareCatalogPriority(left, right) {
  const pinnedDiff = getPinnedRank(left) - getPinnedRank(right);
  if (pinnedDiff !== 0) {
    return pinnedDiff;
  }

  const featuredDiff = toFlag(right?.featured) - toFlag(left?.featured);
  if (featuredDiff !== 0) {
    return featuredDiff;
  }

  const sourceDiff = sourceRank(right?.catalog_source) - sourceRank(left?.catalog_source);
  if (sourceDiff !== 0) {
    return sourceDiff;
  }

  const officialDiff = toFlag(right?.official) - toFlag(left?.official);
  if (officialDiff !== 0) {
    return officialDiff;
  }

  const updatedDiff = String(right?.updated || '').localeCompare(String(left?.updated || ''));
  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  return String(left?.id || '').localeCompare(String(right?.id || ''));
}

export function templateKey(repo, templateId) {
  return `${repo || ''}::${templateId || ''}`;
}

function hubHeaders() {
  return {
    Accept: 'application/json',
    'User-Agent': `bananahub-cli/${CLI_VERSION}`
  };
}

function getPinnedRank(template) {
  return Number.isFinite(template?.pinned_rank)
    ? template.pinned_rank
    : Number.POSITIVE_INFINITY;
}

function toFlag(value) {
  return value ? 1 : 0;
}

function sourceRank(source) {
  if (source === 'curated') return 2;
  if (source === 'discovered') return 1;
  return 0;
}
