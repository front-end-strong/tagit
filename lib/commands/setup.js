import chalk from 'chalk';
import inquirer from 'inquirer';
import { runGit, detectPrefixes, saveConfig, CONFIG_FILE } from '../utils.js';

export function registerSetupCommand(program) {
  program
    .command('setup')
    .description('Configure environment tags by detecting prefixes from existing tags')
    .action(async () => {
      try {
        console.log(chalk.blue('Fetching tags from origin...'));
        runGit(['fetch', 'origin', '+refs/tags/*:refs/tags/*']);
        console.log(chalk.green('✓ Tags fetched successfully\n'));
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not fetch tags: ${error.message}\n`));
      }

      const prefixMap = detectPrefixes();
      
      if (prefixMap.size === 0) {
        console.log(chalk.yellow('No tags with version patterns found. Using default configuration.'));
        return;
      }

      const prefixArray = Array.from(prefixMap.keys()).sort();
      
      console.log(chalk.bold('Found tag prefixes:'));
      prefixArray.forEach(prefix => {
        const examples = prefixMap.get(prefix);
        console.log(`  ${chalk.cyan(prefix.toUpperCase())}: ${chalk.dim(examples.join(', '))}`);
      });
      console.log();

      const config = {};

      for (const prefix of prefixArray) {
        const examples = prefixMap.get(prefix);
        console.log(chalk.cyan(`\nPrefix "${prefix.toUpperCase()}"`));
        if (examples.length > 0) {
          console.log(chalk.dim(`  Examples: ${examples.join(', ')}`));
        }

        const { configure } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'configure',
            message: `Configure prefix "${prefix}"?`,
            default: true,
          },
        ]);

        if (!configure) {
          console.log(chalk.dim(`  Skipped prefix "${prefix}"`));
          continue;
        }

        const { name } = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Name:',
            default: prefix.charAt(0).toUpperCase() + prefix.slice(1),
          },
        ]);

        const { description } = await inquirer.prompt([
          {
            type: 'input',
            name: 'description',
            message: 'Description (optional):',
          },
        ]);

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Confirm "${name}" for prefix "${prefix}"?`,
            default: true,
          },
        ]);

        if (confirm) {
          // Use prefix as key, convert to lowercase
          const key = prefix.toLowerCase();
          config[key] = {
            label: name,
            prefix: prefix,
            description: description || undefined,
          };
        }
      }

      if (Object.keys(config).length > 0) {
        saveConfig(config);
        console.log(chalk.green(`\n✓ Configuration saved to ${CONFIG_FILE}`));
        console.log(chalk.dim('Run `tag list` to see your configured environments.'));
      } else {
        console.log(chalk.yellow('\nNo configuration saved.'));
      }
    });
}

