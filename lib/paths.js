import { access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { TEMPLATES_DIR } from './constants.js';

async function dirExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function ensurePrimaryTemplatesDir() {
  await mkdir(TEMPLATES_DIR, { recursive: true });
  return TEMPLATES_DIR;
}

export async function getTemplateRoots() {
  if (!(await dirExists(TEMPLATES_DIR))) {
    await ensurePrimaryTemplatesDir();
  }

  return [TEMPLATES_DIR];
}

export async function resolveInstalledTemplateDir(id) {
  for (const root of await getTemplateRoots()) {
    const candidate = join(root, id);
    if (await dirExists(candidate)) {
      return candidate;
    }
  }

  return join(TEMPLATES_DIR, id);
}

export async function resolveInstalledTemplateDirs(id) {
  const dirs = [];

  for (const root of await getTemplateRoots()) {
    const candidate = join(root, id);
    if (await dirExists(candidate)) {
      dirs.push(candidate);
    }
  }

  return dirs;
}
