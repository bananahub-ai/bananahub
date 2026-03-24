import { HUB_API } from '../constants.js';
import { bold, dim, cyan, yellow } from '../color.js';
import { red } from '../color.js';

export async function searchCommand(args) {
  const keyword = args.join(' ');
  if (!keyword) {
    console.error(red('Usage: bananahub search <keyword>'));
    process.exit(1);
  }

  console.log(yellow(`\n  Search is not yet available — the BananaHub API is under development.`));
  console.log(dim(`  Searched for: "${keyword}"`));
  console.log(dim('\n  In the meantime, browse templates at: https://bananahub.github.io\n'));
}

export async function trendingCommand() {
  console.log(yellow('\n  Trending is not yet available — the BananaHub API is under development.'));
  console.log(dim('  Browse templates at: https://bananahub.github.io\n'));
}
