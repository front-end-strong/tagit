#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { join } from 'path';
import { spawnSync } from 'child_process';

const DEFAULT_ENVS = {
  prod: { label: 'Production', prefix: 'v' },
  sandbox: { label: 'Sandbox', prefix: 'x' },
  preprod: { label: 'Preprod', prefix: 'preprod' },
  staging: { label: 'Staging', prefix: 's' },
  dev: { label: 'Dev', prefix: 'd' },
};

const CONFIG_FILE = '.tag-config.json';

/**
 * Load environment configuration from file or return defaults
 * @returns {Object} Environment configuration
 */
function loadConfig() {
  if (existsSync(CONFIG_FILE)) {
    try {
      const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
      return config;
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not load config from ${CONFIG_FILE}, using defaults`));
      return DEFAULT_ENVS;
    }
  }
  return DEFAULT_ENVS;
}

/**
 * Save environment configuration to file
 * @param {Object} config - Environment configuration
 */
function saveConfig(config) {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

const ENVS = loadConfig();

/**
 * Execute a git command and return the output
 * @param {string[]} args - Git command arguments
 * @returns {string} Trimmed stdout
 * @throws {Error} If git command fails
 */
function runGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    const errorMsg = result.stderr || 'Git command failed';
    throw new Error(errorMsg);
  }
  return result.stdout.trim();
}

/**
 * Parse semver version from a tag name
 * @param {string} tag - Tag name (e.g., 'v1.2.3', 's0.1.0')
 * @param {string} prefix - Environment prefix (e.g., 'v', 's', 'preprod')
 * @returns {[number, number, number] | null} Version array [major, minor, patch] or null
 */
function parseSemverFromTag(tag, prefix) {
  if (!tag.startsWith(prefix)) {
    return null;
  }
  const rest = tag.slice(prefix.length);
  const match = rest.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }
  return [
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10),
  ];
}

/**
 * Compare two semver version arrays
 * @param {[number, number, number]} a - First version
 * @param {[number, number, number]} b - Second version
 * @returns {number} Negative if a < b, positive if a > b, 0 if equal
 */
function compareSemver(a, b) {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

/**
 * Increment the patch version
 * @param {[number, number, number]} version - Version array [major, minor, patch]
 * @returns {[number, number, number]} New version with incremented patch
 */
function bumpPatch(version) {
  return [version[0], version[1], version[2] + 1];
}

/**
 * Format version array as string
 * @param {[number, number, number]} version - Version array [major, minor, patch]
 * @returns {string} Formatted version string (e.g., "1.2.3")
 */
function formatVersion(version) {
  return `${version[0]}.${version[1]}.${version[2]}`;
}

/**
 * Detect unique prefixes from all tags
 * @returns {Map<string, string[]>} Map of prefix to example tags
 */
function detectPrefixes() {
  try {
    const output = runGit(['tag', '--list']);
    if (!output) {
      return new Map();
    }

    const tags = output.split('\n').filter((line) => line.trim());
    const prefixMap = new Map();

    for (const tag of tags) {
      // Match tags that start with a prefix (letters) followed by version pattern (digits.digits.digits)
      // Examples: v1.2.3, s0.1.0, preprod2.4.7, x1.3.135
      const match = tag.match(/^([a-zA-Z]+)(\d+\.\d+\.\d+)/);
      if (match) {
        const prefix = match[1];
        if (!prefixMap.has(prefix)) {
          prefixMap.set(prefix, []);
        }
        const examples = prefixMap.get(prefix);
        if (examples.length < 3) {
          examples.push(tag);
        }
      }
    }

    return prefixMap;
  } catch (error) {
    return new Map();
  }
}

/**
 * Get the latest tag for an environment
 * @param {string} envName - Environment name (key from ENVS)
 * @returns {{name: string, author: string, ago: string, description: string, version: [number, number, number]} | null}
 */
function getLatestTagForEnv(envName) {
  const env = ENVS[envName];
  if (!env) {
    return null;
  }

  const prefix = env.prefix;
  const pattern = `${prefix}[0-9]*.[0-9]*.[0-9]*`;

  try {
    const output = runGit([
      'tag',
      '--list',
      pattern,
      '--format',
      '%(refname:short)|%(taggername)|%(taggerdate:relative)|%(contents)',
    ]);

    if (!output) {
      return null;
    }

    const lines = output.split('\n').filter((line) => line.trim());
    const tags = [];

    for (const line of lines) {
      const parts = line.split('|');
      const name = parts[0] || '';
      const author = parts[1] || 'unknown';
      const ago = parts[2] || '';
      // Get description - it might contain newlines, so join remaining parts
      const description = parts.slice(3).join('|').trim() || '';
      const version = parseSemverFromTag(name, prefix);

      if (version) {
        tags.push({ name, author, ago, description, version });
      }
    }

    if (tags.length === 0) {
      return null;
    }

    tags.sort((a, b) => compareSemver(b.version, a.version));
    return tags[0];
  } catch (error) {
    return null;
  }
}

const program = new Command();

program
  .name('tag')
  .description('Helper for environment-specific git tags')
  .version('0.1.0');

program
  .command('list')
  .description('Show latest tag for each environment')
  .action(() => {
    Object.entries(ENVS).forEach(([envName, env]) => {
      const latest = getLatestTagForEnv(envName);
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
    const latest = getLatestTagForEnv(envName);
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

program.parseAsync(process.argv);

