import { mkdtemp, rm, readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { extract } from 'tar';
import { downloadTarball, getDefaultBranchInfo, getLatestSha, getFileContent } from '../github.js';
import { validateTemplate } from '../validate.js';
import { rebuildRegistry } from '../registry.js';
import { parseFrontmatter } from '../frontmatter.js';
import { TEMPLATES_DIR, CLI_VERSION, HUB_API } from '../constants.js';
import { bold, green, red, yellow, cyan, dim } from '../color.js';

export async function addCommand(args) {
  const repo = args[0];
  if (!repo || !repo.includes('/')) {
    console.error(red('Usage: bananahub add <user/repo> [--template <name>] [--all]'));
    process.exit(1);
  }

  const templateFlag = args.indexOf('--template');
  const specificTemplate = templateFlag !== -1 ? args[templateFlag + 1] : null;
  const installAll = args.includes('--all');

  console.log(dim(`Resolving ${repo}...`));

  // 1. Get repo info
  let branchInfo;
  try {
    branchInfo = await getDefaultBranchInfo(repo);
  } catch (e) {
    console.error(red(`Error: ${e.message}`));
    process.exit(1);
  }

  const sha = await getLatestSha(repo, branchInfo.branch);

  // 2. Download tarball
  console.log(dim('Downloading...'));
  let tarBuffer;
  try {
    tarBuffer = await downloadTarball(repo, branchInfo.branch);
  } catch (e) {
    console.error(red(`Error: ${e.message}`));
    process.exit(1);
  }

  // 3. Extract to temp dir
  const tmpDir = await mkdtemp(join(tmpdir(), 'bananahub-'));
  try {
    await pipeline(
      Readable.from(tarBuffer),
      createGunzip(),
      extract({ cwd: tmpDir, strip: 1 })
    );

    // 4. Detect repo type
    let templateDirs = [];
    let rootTemplateMd;
    try {
      rootTemplateMd = await readFile(join(tmpDir, 'template.md'), 'utf8');
    } catch { /* not single template */ }

    if (rootTemplateMd) {
      // Single-template repo
      templateDirs.push({ path: tmpDir, name: null });
    } else {
      // Check for bananahub.json (multi-template)
      let manifest;
      try {
        const manifestRaw = await readFile(join(tmpDir, 'bananahub.json'), 'utf8');
        manifest = JSON.parse(manifestRaw);
      } catch { /* not multi either */ }

      if (manifest && manifest.templates) {
        if (specificTemplate) {
          if (!manifest.templates.includes(specificTemplate)) {
            console.error(red(`Template "${specificTemplate}" not found in repo. Available: ${manifest.templates.join(', ')}`));
            process.exit(1);
          }
          templateDirs.push({ path: join(tmpDir, specificTemplate), name: specificTemplate });
        } else if (installAll) {
          for (const t of manifest.templates) {
            templateDirs.push({ path: join(tmpDir, t), name: t });
          }
        } else {
          console.log(`\nMulti-template repo with ${manifest.templates.length} templates:`);
          for (const t of manifest.templates) {
            console.log(`  - ${t}`);
          }
          console.log(`\nUse ${cyan('--all')} to install all, or ${cyan('--template <name>')} to pick one.`);
          return;
        }
      } else {
        console.error(red('Error: Repository has no template.md (single) or bananahub.json (multi).'));
        process.exit(1);
      }
    }

    // 5. Validate and install each template
    let installed = 0;
    for (const tmpl of templateDirs) {
      const result = await validateTemplate(tmpl.path);
      if (!result.valid) {
        console.error(red(`\nValidation failed for ${tmpl.name || repo}:`));
        for (const e of result.errors) console.error(red(`  - ${e}`));
        continue;
      }

      if (result.warnings.length > 0) {
        for (const w of result.warnings) console.log(yellow(`  Warning: ${w}`));
      }

      const id = result.meta.id || tmpl.name || repo.split('/')[1];
      const destDir = join(TEMPLATES_DIR, id);
      await mkdir(destDir, { recursive: true });
      await cp(tmpl.path, destDir, { recursive: true });

      // Write .source.json
      const source = {
        repo: branchInfo.fullName,
        ref: branchInfo.branch,
        sha: sha || '',
        installed_at: new Date().toISOString(),
        version: result.meta.version || '0.0.0',
        cli_version: CLI_VERSION
      };
      await writeFile(join(destDir, '.source.json'), JSON.stringify(source, null, 2));

      console.log(green(`\n  Installed: ${bold(id)} v${result.meta.version || '0.0.0'}`));
      console.log(dim(`  Source: ${branchInfo.fullName}`));
      if (result.meta.tags?.length) {
        console.log(dim(`  Tags: ${result.meta.tags.join(', ')}`));
      }
      console.log(cyan(`\n  Use: /nanobanana use ${id}\n`));

      // Fire-and-forget install tracking
      trackInstall(branchInfo.fullName, id).catch(() => {});
      installed++;
    }

    // 6. Rebuild registry
    if (installed > 0) {
      await rebuildRegistry();
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

async function trackInstall(repo, templateId) {
  try {
    await fetch(`${HUB_API}/installs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo,
        template_id: templateId,
        cli_version: CLI_VERSION,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(3000)
    });
  } catch { /* fire and forget */ }
}
