export const VALID_PROVIDER_IDS = [
  'google-ai-studio',
  'gemini-compatible',
  'vertex-ai',
  'openai',
  'openai-compatible',
  'chatgpt-compatible'
];

export const MODEL_ALIASES = {
  'nano-banana-pro': 'gemini-3-pro-image-preview',
  'nano-banana-pro-preview': 'gemini-3-pro-image-preview',
  'nano-banana-2': 'gemini-3.1-flash-image-preview',
  'nano-banana-flash': 'gemini-3.1-flash-image-preview',
  'nano-banana': 'gemini-2.5-flash-image',
  'nano-banana-1': 'gemini-2.5-flash-image',
  'gpt-image2': 'gpt-image-2',
  'gpt image 2': 'gpt-image-2',
  'gpt-image': 'gpt-image-1',
  'gpt image': 'gpt-image-1',
  'gpt5.4': 'gpt-5.4',
  'gpt 5.4': 'gpt-5.4'
};

export const MODEL_DISPLAY = {
  'gpt-image-2': {
    provider: 'openai',
    family: 'gpt-image',
    label: 'GPT Image 2',
    tier: 'recommended',
    note: 'Highest-priority default for new high-quality generation when an OpenAI key is available.'
  },
  'gemini-3-pro-image-preview': {
    provider: 'google-ai-studio',
    family: 'gemini-image',
    label: 'Gemini 3 Pro Image Preview',
    tier: 'strong',
    note: 'Best Nano Banana/Gemini path for template compatibility, editing flows, and conservative prompts.'
  },
  'gemini-3.1-flash-image-preview': {
    provider: 'google-ai-studio',
    family: 'gemini-image',
    label: 'Gemini 3.1 Flash Image Preview',
    tier: 'fast',
    note: 'Fast Gemini/Nano Banana option for simple templates and lower-cost iteration.'
  },
  'gemini-2.5-flash-image': {
    provider: 'google-ai-studio',
    family: 'gemini-image',
    label: 'Gemini 2.5 Flash Image',
    tier: 'legacy',
    note: 'Legacy Nano Banana-compatible model.'
  },
  'gpt-image-1': {
    provider: 'openai',
    family: 'gpt-image',
    label: 'GPT Image 1',
    tier: 'fallback',
    note: 'OpenAI GPT Image fallback where GPT Image 2 is unavailable.'
  },
  'gpt-5.4': {
    provider: 'chatgpt-compatible',
    family: 'chat-image',
    label: 'GPT 5.4 Chat Image',
    tier: 'gateway',
    note: 'Chat/completions-compatible image path; endpoint behavior is gateway-dependent.'
  }
};

export const VALID_MODEL_FAMILIES = [
  'gemini-image',
  'gpt-image',
  'chat-image',
  'unknown-openai-compatible'
];

export const VALID_MODEL_QUALITIES = [
  'best',
  'good',
  'ok',
  'untested',
  'expected-best'
];

export const VALID_CAPABILITY_KEYS = [
  'generation',
  'edit',
  'mask_edit'
];

export function getLegacyModelIds(fm) {
  if (!Array.isArray(fm?.models)) return [];
  return fm.models
    .map((model) => {
      if (typeof model === 'string') return model;
      if (model && typeof model === 'object') return model.name || model.id || '';
      return '';
    })
    .filter(Boolean);
}

export function normalizeProviders(fm) {
  const providerEntries = Array.isArray(fm?.provider_matrix)
    ? fm.provider_matrix
    : (Array.isArray(fm?.providers) && fm.providers.some((provider) => provider && typeof provider === 'object')
      ? fm.providers
      : []);
  if (!providerEntries.length) {
    return normalizeFlatProviderModelSupport(fm);
  }
  return providerEntries
    .filter((provider) => provider && typeof provider === 'object')
    .map((provider) => ({
      id: provider.id || '',
      family: provider.family || '',
      models: Array.isArray(provider.models)
        ? provider.models
          .filter((model) => model && typeof model === 'object')
          .map((model) => ({
            id: model.id || model.name || '',
            aliases: Array.isArray(model.aliases) ? model.aliases : [],
            quality: model.quality || 'untested',
            prompt_variant: model.prompt_variant || ''
          }))
        : []
    }));
}

function normalizeFlatProviderModelSupport(fm) {
  const providerIds = Array.isArray(fm?.providers)
    ? fm.providers.filter((provider) => typeof provider === 'string')
    : [];
  const modelIds = Array.isArray(fm?.models)
    ? fm.models.map((model) => (typeof model === 'string' ? model : model?.id || model?.name || '')).filter(Boolean)
    : [];
  if (!providerIds.length || !modelIds.length) return [];
  return providerIds.map((providerId) => ({
    id: providerId,
    family: inferFamily(providerId, modelIds),
    models: modelIds
      .filter((modelId) => modelBelongsToProvider(modelId, providerId))
      .map((modelId) => ({
        id: canonicalizeModelId(modelId),
        aliases: [],
        quality: 'untested',
        prompt_variant: inferPromptVariant(providerId, modelId)
      }))
  })).filter((provider) => provider.models.length);
}

function inferFamily(providerId, modelIds) {
  if (providerId === 'openai' || modelIds.some((modelId) => canonicalizeModelId(modelId).startsWith('gpt-image'))) return 'gpt-image';
  if (providerId === 'chatgpt-compatible') return 'chat-image';
  if (providerId.includes('gemini') || providerId.includes('google') || providerId === 'vertex-ai') return 'gemini-image';
  return '';
}

function inferPromptVariant(providerId, modelId) {
  const canonical = canonicalizeModelId(modelId);
  if (canonical.startsWith('gpt-image')) return 'gpt-image';
  if (providerId === 'chatgpt-compatible' || canonical === 'gpt-5.4') return 'chat-image';
  if (canonical.startsWith('gemini')) return 'gemini';
  return '';
}

function modelBelongsToProvider(modelId, providerId) {
  const canonical = canonicalizeModelId(modelId);
  if (providerId === 'openai') return canonical.startsWith('gpt-image');
  if (providerId === 'chatgpt-compatible') return canonical === 'gpt-5.4';
  if (providerId === 'google-ai-studio' || providerId === 'gemini-compatible' || providerId === 'vertex-ai') {
    return canonical.startsWith('gemini');
  }
  return true;
}

export function canonicalizeModelId(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return MODEL_ALIASES[normalized.toLowerCase()] || normalized;
}

export function providerMatches(providerId, requestedProvider) {
  if (!requestedProvider) return true;
  return String(providerId || '').toLowerCase() === String(requestedProvider || '').toLowerCase();
}

export function modelMatches(model, requestedModel) {
  if (!requestedModel) return true;
  const canonical = canonicalizeModelId(requestedModel).toLowerCase();
  const ids = [model?.id, ...(model?.aliases || [])].map((item) => canonicalizeModelId(item).toLowerCase());
  return ids.includes(canonical);
}

export function templateSupportsCapability(template, capability) {
  if (!capability) return true;
  const capabilities = template?.capabilities || {};
  return capabilities[capability] === true || capabilities[capability] === 'true';
}

export function templateSupportsProviderModel(template, { provider = '', model = '', capability = '' } = {}) {
  if (!templateSupportsCapability(template, capability)) return false;
  const providers = normalizeProviders(template);
  if (!providers.length) {
    const models = getLegacyModelIds(template).map((id) => canonicalizeModelId(id).toLowerCase());
    return !model || models.includes(canonicalizeModelId(model).toLowerCase());
  }
  return providers.some((entry) => {
    if (!providerMatches(entry.id, provider)) return false;
    return entry.models.some((entryModel) => modelMatches(entryModel, model));
  });
}

export function collectModelSupport(templates) {
  const support = new Map();
  for (const template of templates || []) {
    for (const provider of normalizeProviders(template)) {
      for (const model of provider.models) {
        const id = canonicalizeModelId(model.id);
        if (!id) continue;
        if (!support.has(id)) {
          support.set(id, {
            id,
            provider: provider.id,
            family: provider.family,
            aliases: new Set(),
            qualities: new Set(),
            prompt_variants: new Set(),
            templates: [],
            capabilities: new Set()
          });
        }
        const entry = support.get(id);
        for (const alias of model.aliases || []) entry.aliases.add(alias);
        if (model.quality) entry.qualities.add(model.quality);
        if (model.prompt_variant) entry.prompt_variants.add(model.prompt_variant);
        entry.templates.push(template.id);
        for (const [key, value] of Object.entries(template.capabilities || {})) {
          if (value === true || value === 'true') entry.capabilities.add(key);
        }
      }
    }
  }
  return [...support.values()].map((entry) => ({
    ...entry,
    aliases: [...entry.aliases],
    qualities: [...entry.qualities],
    prompt_variants: [...entry.prompt_variants],
    capabilities: [...entry.capabilities],
    template_count: entry.templates.length
  }));
}

export function getProviderModelIds(fm) {
  return normalizeProviders(fm)
    .flatMap((provider) => provider.models.map((model) => model.id))
    .filter(Boolean);
}

export function getSupportedModelIds(fm) {
  return Array.from(new Set([...getLegacyModelIds(fm), ...getProviderModelIds(fm)]));
}

export function getProviderIds(fm) {
  return normalizeProviders(fm)
    .map((provider) => provider.id)
    .filter(Boolean);
}

export function hasPromptVariant(content, variantId) {
  if (!variantId || variantId === 'base' || variantId === 'default') return true;
  const escaped = variantId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    new RegExp(`^##\\s+Prompt Template:\\s*${escaped}\\s*$`, 'im').test(content) ||
    new RegExp(`^#{2,4}\\s+Provider Variant:\\s*${escaped}\\s*$`, 'im').test(content)
  );
}
