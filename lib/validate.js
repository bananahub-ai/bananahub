import { readFile, access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFrontmatter } from './frontmatter.js';
import { VALID_PROFILES, VALID_DIFFICULTIES } from './constants.js';

/**
 * Validate a template directory. Returns { valid, errors, warnings, meta }.
 */
export async function validateTemplate(dirPath) {
  const errors = [];
  const warnings = [];
  let meta = null;

  // Check template.md exists
  const tmplPath = join(dirPath, 'template.md');
  let content;
  try {
    content = await readFile(tmplPath, 'utf8');
  } catch {
    return { valid: false, errors: ['template.md not found'], warnings, meta };
  }

  // Parse frontmatter
  const fm = parseFrontmatter(content);
  if (!fm) {
    return { valid: false, errors: ['No YAML frontmatter found (missing --- delimiters)'], warnings, meta };
  }
  meta = fm;

  // Required fields
  const requiredFields = ['title', 'profile'];
  for (const field of requiredFields) {
    if (!fm[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // ID format
  if (fm.id) {
    if (!/^[a-z][a-z0-9-]{1,48}[a-z0-9]$/.test(fm.id)) {
      warnings.push(`ID "${fm.id}" should be lowercase, hyphens only, 3-50 chars`);
    }
  }

  // Profile validation
  if (fm.profile && !VALID_PROFILES.includes(fm.profile)) {
    errors.push(`Invalid profile "${fm.profile}". Must be one of: ${VALID_PROFILES.join(', ')}`);
  }

  // Difficulty validation
  if (fm.difficulty && !VALID_DIFFICULTIES.includes(fm.difficulty)) {
    warnings.push(`Invalid difficulty "${fm.difficulty}". Should be: ${VALID_DIFFICULTIES.join(', ')}`);
  }

  // Tags
  if (!fm.tags || !Array.isArray(fm.tags) || fm.tags.length === 0) {
    warnings.push('No tags defined — templates are harder to discover without tags');
  } else if (fm.tags.length < 3) {
    warnings.push(`Only ${fm.tags.length} tags — recommend at least 3 for better discoverability`);
  }

  // Version
  if (fm.version && !/^\d+\.\d+\.\d+/.test(fm.version)) {
    warnings.push(`Version "${fm.version}" is not valid semver`);
  }

  // Models
  if (!fm.models || !Array.isArray(fm.models) || fm.models.length === 0) {
    warnings.push('No models listed — users won\'t know which models are tested');
  }

  // Prompt Template section
  if (!content.includes('## Prompt Template') && !content.includes('## prompt template')) {
    warnings.push('No "## Prompt Template" section found');
  }

  // Variables — check for {{var}} patterns
  const varMatches = content.match(/\{\{(\w+)(?:\|[^}]*)?\}\}/g);
  if (!varMatches || varMatches.length === 0) {
    warnings.push('No template variables ({{var|default}}) found — template is static');
  }

  // Samples directory
  try {
    const samplesDir = join(dirPath, 'samples');
    await access(samplesDir);
    const sampleFiles = await readdir(samplesDir);
    const imageFiles = sampleFiles.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    if (imageFiles.length === 0) {
      warnings.push('samples/ directory exists but contains no images');
    }
  } catch {
    warnings.push('No samples/ directory — sample images help users preview results');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    meta
  };
}
