import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { TEMPLATES_DIR, REGISTRY_FILE } from './constants.js';
import { parseFrontmatter } from './frontmatter.js';

/**
 * Rebuild .registry.json by scanning all installed template directories.
 */
export async function rebuildRegistry() {
  await mkdir(TEMPLATES_DIR, { recursive: true });
  const entries = await readdir(TEMPLATES_DIR, { withFileTypes: true });
  const templates = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const tmplPath = join(TEMPLATES_DIR, entry.name, 'template.md');
    try {
      const content = await readFile(tmplPath, 'utf8');
      const fm = parseFrontmatter(content);
      if (!fm) continue;

      let source = null;
      try {
        const srcJson = await readFile(join(TEMPLATES_DIR, entry.name, '.source.json'), 'utf8');
        source = JSON.parse(srcJson);
      } catch { /* no source info */ }

      templates.push({
        id: fm.id || entry.name,
        title: fm.title || '',
        title_en: fm.title_en || '',
        author: fm.author || '',
        profile: fm.profile || 'general',
        tags: fm.tags || [],
        difficulty: fm.difficulty || 'beginner',
        aspect: fm.aspect || '',
        models: Array.isArray(fm.models) ? fm.models.map(m => m.name || m) : [],
        source: source?.repo || '',
        version: fm.version || '0.0.0',
        installed_at: source?.installed_at || ''
      });
    } catch {
      // skip unreadable templates
    }
  }

  const registry = {
    version: '1.0.0',
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
