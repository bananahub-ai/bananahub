import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TEMPLATES_DIR, REGISTRY_FILE } from './constants.js';
import { parseFrontmatter } from './frontmatter.js';
import { ensurePrimaryTemplatesDir, getTemplateRoots } from './paths.js';
import { getProviderIds, getSupportedModelIds, normalizeProviders } from './template-schema.js';

/**
 * Rebuild .registry.json by scanning all installed template directories.
 */
export async function rebuildRegistry() {
  await ensurePrimaryTemplatesDir();
  const roots = await getTemplateRoots();
  const templates = [];
  const seenIds = new Set();

  for (const root of roots) {
    const entries = await readdir(root, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || seenIds.has(entry.name)) continue;

      const tmplPath = join(root, entry.name, 'template.md');
      try {
        const content = await readFile(tmplPath, 'utf8');
        const fm = parseFrontmatter(content);
        if (!fm) continue;

        let source = null;
        try {
          const srcJson = await readFile(join(root, entry.name, '.source.json'), 'utf8');
          source = JSON.parse(srcJson);
        } catch { /* no source info */ }

        templates.push({
          id: fm.id || entry.name,
          type: fm.type || 'prompt',
          title: fm.title || '',
          title_en: fm.title_en || '',
          author: fm.author || '',
          license: fm.license || '',
          profile: fm.profile || 'general',
          tags: fm.tags || [],
          difficulty: fm.difficulty || 'beginner',
          aspect: fm.aspect || '',
          models: getSupportedModelIds(fm),
          providers: getProviderIds(fm),
          provider_matrix: normalizeProviders(fm),
          capabilities: fm.capabilities || {},
          prompt_variants: fm.prompt_variants || {},
          source: source?.repo || '',
          version: fm.version || '0.0.0',
          installed_at: source?.installed_at || ''
        });
        seenIds.add(entry.name);
      } catch {
        // skip unreadable templates
      }
    }
  }

  const registry = {
    version: '2.0.0',
    generated_at: new Date().toISOString(),
    templates
  };

  await writeFile(join(TEMPLATES_DIR, REGISTRY_FILE), JSON.stringify(registry, null, 2));
  return registry;
}

/**
 * Load the current registry (or rebuild if missing).
 */
export async function loadRegistry() {
  try {
    const raw = await readFile(join(TEMPLATES_DIR, REGISTRY_FILE), 'utf8');
    return JSON.parse(raw);
  } catch {
    return rebuildRegistry();
  }
}
