import { existsSync, readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import chalk from 'chalk';

export const DEFAULT_ENVS = {
  prod: { label: 'Production', prefix: 'v' },
  sandbox: { label: 'Sandbox', prefix: 'x' },
  preprod: { label: 'Preprod', prefix: 'preprod' },
  staging: { label: 'Staging', prefix: 's' },
  dev: { label: 'Dev', prefix: 'd' },
};

export const CONFIG_FILE = '.tag-config.json';

/**
 * Load environment configuration from file or return defaults
 * @returns {Object} Environment configuration
 */
export function loadConfig() {
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
export function saveConfig(config) {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Execute a git command and return the output
 * @param {string[]} args - Git command arguments
 * @returns {string} Trimmed stdout
 * @throws {Error} If git command fails
 */
export function runGit(args) {
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
export function parseSemverFromTag(tag, prefix) {
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
export function compareSemver(a, b) {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

/**
 * Increment the patch version
 * @param {[number, number, number]} version - Version array [major, minor, patch]
 * @returns {[number, number, number]} New version with incremented patch
 */
export function bumpPatch(version) {
  return [version[0], version[1], version[2] + 1];
}

/**
 * Format version array as string
 * @param {[number, number, number]} version - Version array [major, minor, patch]
 * @returns {string} Formatted version string (e.g., "1.2.3")
 */
export function formatVersion(version) {
  return `${version[0]}.${version[1]}.${version[2]}`;
}

/**
 * Detect unique prefixes from all tags
 * @returns {Map<string, string[]>} Map of prefix to example tags
 */
export function detectPrefixes() {
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
 * @param {Object} ENVS - Environment configuration
 * @returns {{name: string, author: string, ago: string, description: string, version: [number, number, number]} | null}
 */
export function getLatestTagForEnv(envName, ENVS) {
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

