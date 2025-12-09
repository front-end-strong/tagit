#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import { spawnSync } from 'child_process';

const ENVS = {
  prod: { label: 'Production', prefix: 'v' },
  sandbox: { label: 'Sandbox', prefix: 'x' },
  preprod: { label: 'Preprod', prefix: 'preprod' },
  staging: { label: 'Staging', prefix: 's' },
  dev: { label: 'Dev', prefix: 'd' },
};

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
 * Get the latest tag for an environment
 * @param {string} envName - Environment name (key from ENVS)
 * @returns {{name: string, author: string, ago: string, version: [number, number, number]} | null}
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
      '%(refname:short)|%(taggername)|%(taggerdate:relative)',
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
      const version = parseSemverFromTag(name, prefix);

      if (version) {
        tags.push({ name, author, ago, version });
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
        console.log(`${env.label} (${envName}): (no tags found)`);
      } else {
        console.log(
          `${env.label} (${envName}): ${latest.name} · ${latest.author} · ${latest.ago}`
        );
      }
    });
  });

program
  .command('refresh')
  .description('Fetch tags from the remote repository')
  .action(() => {
    try {
      console.log('Fetching tags from origin...');
      runGit(['fetch', 'origin', '--tags']);
      console.log('Tags refreshed successfully');
    } catch (error) {
      console.error('Error refreshing tags:', error.message);
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
    console.log(`Environment: ${env.label} (${envName})`);
    console.log(`Current latest: ${latest ? latest.name : '(none)'}`);
    console.log(`Next tag:       ${newTag}`);
    console.log();

    const { message } = await inquirer.prompt([
      {
        type: 'input',
        name: 'message',
        message:
          'Annotation message (optional – leave blank to create a lightweight tag):',
      },
    ]);

    if (message && message.trim()) {
      runGit(['tag', '-a', newTag, '-m', message.trim()]);
    } else {
      runGit(['tag', newTag]);
    }

    console.log(`Created tag ${newTag}`);

    runGit(['push', 'origin', newTag]);
    console.log(`Pushed ${newTag} to origin`);
  });

program.parseAsync(process.argv);

