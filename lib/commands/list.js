import chalk from 'chalk';
import { getLatestTagForEnv } from '../utils.js';

export function registerListCommand(program, ENVS) {
  program
    .command('list')
    .description('Show latest tag for each environment')
    .action(() => {
      Object.entries(ENVS).forEach(([envName, env]) => {
        const latest = getLatestTagForEnv(envName, ENVS);
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
            console.log(chalk.dim(latest.description))
          }
          console.log(
            `${chalk.blue(latest.author)} ${chalk.gray('·')} ${chalk.dim(latest.ago || 'unknown')}`
          );
        }
        console.log();
      });
    });
}

