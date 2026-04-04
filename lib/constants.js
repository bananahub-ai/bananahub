import { homedir } from 'node:os';
import { join } from 'node:path';

export const CLI_VERSION = '0.1.1';
export const CONFIG_HOME = join(homedir(), '.config', 'bananahub');
export const TEMPLATES_DIR = join(CONFIG_HOME, 'templates');
export const REGISTRY_FILE = '.registry.json';
export const SOURCE_FILE = '.source.json';
export const GITHUB_API = 'https://api.github.com';
export const HUB_API = 'https://bananahub-api.zhan9kun.workers.dev/api';
export const HUB_SITE = 'https://bananahub-ai.github.io';
export const HUB_CATALOG_URL = `${HUB_SITE}/catalog.json`;
export const SKILL_COMMAND = '/bananahub';

export const VALID_PROFILES = [
  'photo', 'illustration', 'diagram', 'text-heavy',
  'minimal', 'sticker', '3d', 'product', 'concept-art', 'general'
];

export const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
export const VALID_TEMPLATE_TYPES = ['prompt', 'workflow'];
