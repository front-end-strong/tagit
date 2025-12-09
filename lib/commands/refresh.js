import chalk from 'chalk';
import { runGit } from '../utils.js';

export function registerRefreshCommand(program) {
  program
    .command('refresh')
    .description('Fetch tags from the remote repository')
    .action(() => {
      try {
        console.log(chalk.blue('Fetching tags from origin...'));
        runGit(['fetch', 'origin', '+refs/tags/*:refs/tags/*']);
        console.log(chalk.green('✓ Tags refreshed successfully'));
      } catch (error) {
        console.error(chalk.red('✗ Error refreshing tags:'), error.message);
        process.exit(1);
      }
    });
}

