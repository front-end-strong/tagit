import chalk from 'chalk';
import inquirer from 'inquirer';
import { runGit, getLatestTagForEnv, bumpPatch, formatVersion } from '../utils.js';

export function registerBumpCommand(program, ENVS) {
  program
    .command('bump [env]')
    .description('Create and push a new tag for an environment')
    .action(async (envArg) => {
      const envNames = Object.keys(ENVS);
      let envName = envArg;

      if (!envName || !envNames.includes(envName)) {
        const answer = await inquirer.prompt([
          {
            type: 'list',
            name: 'env',
            message: 'Which environment do you want to tag?',
            choices: envNames.map((name) => ({
              name: `${name} (${ENVS[name].label})`,
              value: name,
            })),
          },
        ]);
        envName = answer.env;
      }

      const env = ENVS[envName];
      const latest = getLatestTagForEnv(envName, ENVS);
      const baseVersion = latest ? latest.version : [0, 0, 0];
      const nextVersion = bumpPatch(baseVersion);
      const newTag = `${env.prefix}${formatVersion(nextVersion)}`;

      console.log();
      console.log(chalk.bold(`Environment: ${env.label} ${chalk.cyan(`(${envName})`)}`));
      console.log(
        `Current latest: ${latest ? chalk.green(latest.name) : chalk.gray('(none)')}`
      );
      console.log(`Next tag:       ${chalk.bold.green(newTag)}`);
      console.log();

      const { message } = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message:
            'Annotation message (optional – leave blank to create a lightweight tag):',
        },
      ]);

      try {
        if (message && message.trim()) {
          runGit(['tag', '-a', newTag, '-m', message.trim()]);
        } else {
          runGit(['tag', newTag]);
        }

        console.log(chalk.green(`✓ Created tag ${chalk.bold(newTag)}`));

        runGit(['push', 'origin', newTag]);
        console.log(chalk.green(`✓ Pushed ${chalk.bold(newTag)} to origin `));
        console.log(chalk.dim(env.description || ''));
        runGit(['fetch', 'origin', '+refs/tags/*:refs/tags/*']);
        console.log(chalk.blue('✓ Fetched latest tags from origin'));
      } catch (error) {
        console.error(chalk.red(`✗ Error: ${error.message}`));
        process.exit(1);
      }
    });
}

