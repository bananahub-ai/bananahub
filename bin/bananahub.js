#!/usr/bin/env node

import { bold, dim, cyan, yellow } from '../lib/color.js';

const VERSION = '0.1.0';

const HELP = `
${bold('bananahub')} ${dim(`v${VERSION}`)} — Template manager for Nanobanana

${bold('USAGE')}
  bananahub <command> [options]

${bold('COMMANDS')}
  ${cyan('add')} <user/repo[/path/to/template]>  Install template(s) from a GitHub repo
      --template <name>               Pick one template from a multi-template directory
      --all                           Install all templates from a collection
  ${cyan('remove')} <template-id>                Uninstall a template
  ${cyan('list')}                                List installed templates
  ${cyan('update')} [template-id]                Update one or all installed templates
  ${cyan('info')} <template-id>                  Show template details
  ${cyan('search')} <keyword>                    Search hub for templates (coming soon)
  ${cyan('trending')}                            Show trending templates (coming soon)
  ${cyan('init')}                                Scaffold a new template project
  ${cyan('validate')} [path]                     Validate a template directory
  ${cyan('registry')} rebuild                    Rebuild local registry index

${bold('OPTIONS')}
  --help, -h                Show this help message
  --version, -v             Show version

${bold('EXAMPLES')}
  bananahub add user/nanobanana-cyberpunk
  bananahub add nano-banana-hub/nanobanana/cute-sticker
  bananahub add user/multi-template-repo --template portrait
  bananahub list
  bananahub validate ./my-template
  bananahub init
`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const cmdArgs = args.slice(1);

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }

  if (command === '--version' || command === '-v') {
    console.log(VERSION);
    return;
  }

  switch (command) {
    case 'add': {
      const { addCommand } = await import('../lib/commands/add.js');
      await addCommand(cmdArgs);
      break;
    }
    case 'remove': {
      const { removeCommand } = await import('../lib/commands/remove.js');
      await removeCommand(cmdArgs);
      break;
    }
    case 'list': {
      const { listCommand } = await import('../lib/commands/list.js');
      await listCommand();
      break;
    }
    case 'update': {
      const { updateCommand } = await import('../lib/commands/update.js');
      await updateCommand(cmdArgs);
      break;
    }
    case 'info': {
      const { infoCommand } = await import('../lib/commands/info.js');
      await infoCommand(cmdArgs);
      break;
    }
    case 'search': {
      const { searchCommand } = await import('../lib/commands/search.js');
      await searchCommand(cmdArgs);
      break;
    }
    case 'trending': {
      const { trendingCommand } = await import('../lib/commands/search.js');
      await trendingCommand();
      break;
    }
    case 'init': {
      const { initCommand } = await import('../lib/commands/init.js');
      await initCommand(cmdArgs);
      break;
    }
    case 'validate': {
      const { validateCommand } = await import('../lib/commands/validate-cmd.js');
      await validateCommand(cmdArgs);
      break;
    }
    case 'registry': {
      const { registryCommand } = await import('../lib/commands/registry-cmd.js');
      await registryCommand(cmdArgs);
      break;
    }
    default:
      console.error(yellow(`  Unknown command: "${command}"`));
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
