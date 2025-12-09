import chalk from 'chalk';
import { getLatestTagForEnv } from '../utils.js';

export function registerListCommand(program, ENVS) {
  program
    .command('list')
    .description('Show latest tag for each environment')
    .action(() => {
      if(Object.keys(ENVS).length === 0) {
        console.log(chalk.yellow('No environments configured. Run `tag setup` to configure environments.'));
        return;
      }

      Object.entries(ENVS).forEach(([envName, env]) => {
        const latest = getLatestTagForEnv(envName, ENVS);
        var author = '';
        
        if(latest && latest.author !== 'unknown' && latest.ago) {
          author = `${chalk.gray('·')} ${chalk.blue(latest.author)} ${chalk.gray('·')} ${chalk.dim(latest.ago || 'unknown')}`
        }

        if (!latest) {
          console.log(
            `${chalk.bold(env.label)} ${chalk.dim(`(${envName})`)} ${chalk.dim(`- ${env.description || ''}`)}`
          );
          console.log(chalk.yellow('(no tags found)'));
        } else {
          console.log(
            `${chalk.bold(env.label)} ${chalk.dim(`(${envName})`)}: ${chalk.green.bold(latest.name)} ${chalk.dim(`- ${env.description || ''}`)}`
          );
          if(latest.description) {
            console.log(`${chalk.dim(latest.description)} ${author}`)
          }
        }
        console.log();
      });
    });
}

