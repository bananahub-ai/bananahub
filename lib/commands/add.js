import { access, cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { extract } from 'tar';
import { downloadTarball, getDefaultBranchInfo, getLatestSha } from '../github.js';
import { validateTemplate } from '../validate.js';
import { rebuildRegistry } from '../registry.js';
import { TEMPLATES_DIR, CLI_VERSION, HUB_API } from '../constants.js';
import { bold, green, red, yellow, cyan, dim } from '../color.js';

const KNOWN_TEMPLATE_ROOTS = ['references/templates', 'templates'];

export async function addCommand(args) {
  const target = parseInstallTarget(args[0]);
  if (!target) {
    console.error(red('Usage: bananahub add <user/repo[/path/to/template]> [--template <name>] [--all]'));
    process.exit(1);
  }

  const templateFlag = args.indexOf('--template');
  const specificTemplate = templateFlag !== -1 ? args[templateFlag + 1] : null;
  const installAll = args.includes('--all');
  const { repo, requestedPath } = target;

  console.log(dim(`Resolving ${repo}${requestedPath ? `/${requestedPath}` : ''}...`));

  let branchInfo;
  try {
    branchInfo = await getDefaultBranchInfo(repo);
  } catch (error) {
    console.error(red(`Error: ${error.message}`));
    process.exit(1);
  }

  const sha = await getLatestSha(repo, branchInfo.branch);

  console.log(dim('Downloading...'));
  let tarBuffer;
  try {
    tarBuffer = await downloadTarball(repo, branchInfo.branch);
  } catch (error) {
    console.error(red(`Error: ${error.message}`));
    process.exit(1);
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'bananahub-'));

  try {
    await pipeline(
      Readable.from(tarBuffer),
      createGunzip(),
      extract({ cwd: tmpDir, strip: 1 })
    );

    const templateDirs = await resolveTemplateDirs({
      tmpDir,
      repo,
      requestedPath,
      specificTemplate,
      installAll
    });

    if (templateDirs.length === 0) {
      return;
    }

    let installed = 0;

    for (const template of templateDirs) {
      const result = await validateTemplate(template.path);
      if (!result.valid) {
        console.error(red(`\nValidation failed for ${template.relativePath || repo}:`));
        for (const error of result.errors) {
          console.error(red(`  - ${error}`));
        }
        continue;
      }

      for (const warning of result.warnings) {
        console.log(yellow(`  Warning: ${warning}`));
      }

      const id = result.meta.id || template.name || repo.split('/')[1];
      const destDir = join(TEMPLATES_DIR, id);
      await rm(destDir, { recursive: true, force: true });
      await mkdir(destDir, { recursive: true });
      await cp(template.path, destDir, { recursive: true });

      const installTarget = buildInstallTarget(branchInfo.fullName, template.relativePath);
      const source = {
        repo: branchInfo.fullName,
        ref: branchInfo.branch,
        sha: sha || '',
        template_path: template.relativePath || '',
        install_target: installTarget,
        installed_at: new Date().toISOString(),
        version: result.meta.version || '0.0.0',
        cli_version: CLI_VERSION
      };
      await writeFile(join(destDir, '.source.json'), JSON.stringify(source, null, 2));

      console.log(green(`\n  Installed: ${bold(id)} v${result.meta.version || '0.0.0'}`));
      console.log(dim(`  Source: ${installTarget}`));
      if (result.meta.tags?.length) {
        console.log(dim(`  Tags: ${result.meta.tags.join(', ')}`));
      }
      console.log(cyan(`\n  Use: /nanobanana use ${id}\n`));

      trackInstall(branchInfo.fullName, id, template.relativePath, installTarget).catch(() => {});
      installed += 1;
    }

    if (installed > 0) {
      await rebuildRegistry();
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

function parseInstallTarget(target) {
  if (!target) {
    return null;
  }

  const segments = target.split('/').filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  return {
    repo: `${segments[0]}/${segments[1]}`,
    requestedPath: segments.slice(2).join('/') || ''
  };
}

async function resolveTemplateDirs({ tmpDir, repo, requestedPath, specificTemplate, installAll }) {
  if (requestedPath) {
    const requestedMatches = await findTargetsFromRequestedPath(tmpDir, requestedPath, specificTemplate, installAll);
    if (requestedMatches.length > 0) {
      return requestedMatches;
    }

    console.error(red(`Error: Could not resolve template path "${requestedPath}" inside ${repo}.`));
    process.exit(1);
  }

  const rootTemplate = await getTemplateDir(tmpDir, '');
  if (rootTemplate) {
    return [rootTemplate];
  }

  const rootManifestTargets = await getManifestTargets(tmpDir, '', specificTemplate, installAll);
  if (rootManifestTargets) {
    return rootManifestTargets;
  }

  const collectionTargets = await findTargetsFromKnownCollections(tmpDir, specificTemplate, installAll);
  if (collectionTargets.length > 0) {
    return collectionTargets;
  }

  const collections = await listKnownCollections(tmpDir);
  if (collections.length > 0) {
    printCollectionHelp(repo, collections);
    return [];
  }

  console.error(red('Error: Repository has no template.md, bananahub.json, or known template collection.'));
  process.exit(1);
}

async function findTargetsFromRequestedPath(tmpDir, requestedPath, specificTemplate, installAll) {
  const directCandidates = buildRequestedPathCandidates(requestedPath);

  for (const candidate of directCandidates) {
    const directTemplate = await getTemplateDir(tmpDir, candidate);
    if (directTemplate) {
      return [directTemplate];
    }

    const manifestTargets = await getManifestTargets(tmpDir, candidate, specificTemplate, installAll);
    if (manifestTargets) {
      return manifestTargets;
    }
  }

  return [];
}

async function findTargetsFromKnownCollections(tmpDir, specificTemplate, installAll) {
  const collections = await listKnownCollections(tmpDir);
  if (collections.length === 0) {
    return [];
  }

  if (specificTemplate) {
    for (const collection of collections) {
      const match = collection.templates.find((template) => template.name === specificTemplate);
      if (match) {
        return [match];
      }
    }

    const choices = collections.flatMap((collection) => collection.templates.map((template) => template.name));
    console.error(red(`Template "${specificTemplate}" not found. Available: ${choices.join(', ')}`));
    process.exit(1);
  }

  if (installAll) {
    return collections.flatMap((collection) => collection.templates);
  }

  return [];
}

function buildRequestedPathCandidates(requestedPath) {
  const candidates = [trimSlashes(requestedPath)];

  if (!requestedPath.includes('/')) {
    for (const root of KNOWN_TEMPLATE_ROOTS) {
      candidates.push(`${root}/${trimSlashes(requestedPath)}`);
    }
  }

  return [...new Set(candidates.filter(Boolean))];
}

async function getManifestTargets(tmpDir, baseRelativePath, specificTemplate, installAll) {
  const baseDir = resolveWithinTemp(tmpDir, baseRelativePath);
  let manifest;

  try {
    const raw = await readFile(join(baseDir, 'bananahub.json'), 'utf8');
    manifest = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!manifest || !Array.isArray(manifest.templates) || manifest.templates.length === 0) {
    console.error(red(`Error: Invalid bananahub.json at ${baseRelativePath || '.'}`));
    process.exit(1);
  }

  const templates = manifest.templates.map((name) => ({
    path: resolveWithinTemp(tmpDir, joinRelative(baseRelativePath, name)),
    name,
    relativePath: joinRelative(baseRelativePath, name)
  }));

  if (specificTemplate) {
    const match = templates.find((template) => template.name === specificTemplate);
    if (!match) {
      console.error(red(`Template "${specificTemplate}" not found in ${baseRelativePath || 'repo root'}. Available: ${manifest.templates.join(', ')}`));
      process.exit(1);
    }
    return [match];
  }

  if (installAll) {
    return templates;
  }

  console.log(`\nMulti-template directory at ${cyan(baseRelativePath || '/')} with ${manifest.templates.length} templates:`);
  for (const templateName of manifest.templates) {
    console.log(`  - ${templateName}`);
  }
  console.log(`\nUse ${cyan('--all')} to install all, ${cyan('--template <name>')} to pick one, or install directly via ${cyan(`bananahub add <user/repo>/${manifest.templates[0]}`)}.`);
  return [];
}

async function listKnownCollections(tmpDir) {
  const collections = [];

  for (const root of KNOWN_TEMPLATE_ROOTS) {
    const templates = await listTemplatesInCollection(tmpDir, root);
    if (templates.length > 0) {
      collections.push({ root, templates });
    }
  }

  return collections;
}

async function listTemplatesInCollection(tmpDir, baseRelativePath) {
  const baseDir = resolveWithinTemp(tmpDir, baseRelativePath);

  try {
    const entries = await readdir(baseDir, { withFileTypes: true });
    const templates = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const relativePath = joinRelative(baseRelativePath, entry.name);
      const templateDir = await getTemplateDir(tmpDir, relativePath);
      if (templateDir) {
        templates.push(templateDir);
      }
    }

    return templates;
  } catch {
    return [];
  }
}

async function getTemplateDir(tmpDir, relativePath) {
  const dir = resolveWithinTemp(tmpDir, relativePath);
  try {
    await access(join(dir, 'template.md'));
    return {
      path: dir,
      name: basename(relativePath) || null,
      relativePath: trimSlashes(relativePath)
    };
  } catch {
    return null;
  }
}

function resolveWithinTemp(tmpDir, relativePath) {
  return relativePath ? join(tmpDir, trimSlashes(relativePath)) : tmpDir;
}

function trimSlashes(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '');
}

function joinRelative(baseRelativePath, child) {
  const parts = [trimSlashes(baseRelativePath), trimSlashes(child)].filter(Boolean);
  return parts.join('/');
}

function buildInstallTarget(repo, relativePath) {
  return relativePath ? `${repo}/${relativePath}` : repo;
}

function printCollectionHelp(repo, collections) {
  const allTemplates = collections.flatMap((collection) => collection.templates);
  console.log(`\nTemplate collections discovered in ${bold(repo)}:`);
  for (const collection of collections) {
    console.log(dim(`  ${collection.root}`));
    for (const template of collection.templates) {
      console.log(`    - ${template.name}`);
    }
  }
  console.log();
  console.log(dim(`  Install one: bananahub add ${repo}/${allTemplates[0].name}`));
  console.log(dim(`  Or pick explicitly: bananahub add ${repo} --template <name>`));
  console.log(dim('  Or install everything: bananahub add ' + repo + ' --all'));
  console.log();
}

async function trackInstall(repo, templateId, templatePath = '', installTarget = '') {
  try {
    await fetch(`${HUB_API}/installs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo,
        template_id: templateId,
        template_path: templatePath || '',
        install_target: installTarget || '',
        cli_version: CLI_VERSION,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(3000)
    });
  } catch {}
}
