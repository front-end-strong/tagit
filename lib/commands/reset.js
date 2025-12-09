import { existsSync, unlinkSync } from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { CONFIG_FILE } from '../utils.js';

export function registerResetCommand(program) {
  program
    .command('reset')
    .description('Reset configuration by deleting the tag-config.json file')
    .action(async () => {
      if (existsSync(CONFIG_FILE)) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete ${CONFIG_FILE}?`,
            default: false,
          },
        ]);

        if (!confirm) {
          console.log(chalk.yellow('Reset cancelled.'));
          return;
        }

        try {
          unlinkSync(CONFIG_FILE);
          console.log(chalk.green(`✓ Configuration file ${CONFIG_FILE} deleted`));
          console.log(chalk.dim('Run `tag setup` to configure environments again.'));
        } catch (error) {
          console.error(chalk.red(`✗ Error deleting ${CONFIG_FILE}:`), error.message);
          process.exit(1);
        }
      } else {
        console.log(chalk.yellow(`No configuration file found at ${CONFIG_FILE}`));
        console.log(chalk.dim('Using default configuration.'));
      }
    });
}

