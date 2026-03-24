import { resolve } from 'node:path';
import { validateTemplate } from '../validate.js';
import { bold, green, red, yellow, dim } from '../color.js';

export async function validateCommand(args) {
  const targetPath = args[0] ? resolve(args[0]) : process.cwd();

  console.log(dim(`\n  Validating: ${targetPath}\n`));

  const result = await validateTemplate(targetPath);

  if (result.errors.length > 0) {
    console.log(red(bold('  ERRORS:')));
    for (const e of result.errors) {
      console.log(red(`    - ${e}`));
    }
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log(yellow(bold('  WARNINGS:')));
    for (const w of result.warnings) {
      console.log(yellow(`    - ${w}`));
    }
    console.log();
  }

  if (result.meta) {
    console.log(dim(`  ID: ${result.meta.id || '(not set)'}`));
    console.log(dim(`  Title: ${result.meta.title || '(not set)'}`));
    console.log(dim(`  Profile: ${result.meta.profile || '(not set)'}`));
  }

  if (result.valid) {
    console.log(green(bold('\n  VALID')));
  } else {
    console.log(red(bold('\n  INVALID')));
    process.exitCode = 1;
  }
  console.log();
}
