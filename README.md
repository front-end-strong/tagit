# YourIt

A simple, yet powerful CLI tool for managing environment-specific git tags with automatic version bumping and configuration.

[![npm version](https://img.shields.io/npm/v/yourit.svg)](https://www.npmjs.com/package/yourit)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Features

- 🏷️ **Environment-specific tag management** - Organize tags by environment (production, staging, dev, etc.)
- 🔍 **Automatic prefix detection** - Detects tag prefixes from your existing git tags
- ⚙️ **Interactive setup** - Guided configuration wizard for setting up environments
- 📋 **List latest tags** - View the latest tag for each configured environment
- 🚀 **Automatic version bumping** - Increment patch versions automatically
- 🎨 **Beautiful CLI output** - Colorized, formatted output for better readability
- 💾 **Local configuration** - Store environment configurations per repository

## Installation

### Global Installation

```bash
npm install -g yourit
```

After global installation, use the `tag` command from anywhere:

```bash
tag list
tag setup
tag bump
```

### Local Installation

```bash
npm install --save-dev yourit
```

Then use via `npx`:

```bash
npx tag list
npx tag setup
npx tag bump
```

### Development Installation

If you want to work on the tool while using it:

```bash
git clone <repository-url>
cd yourit
npm install
npm link
```

This creates a symlink so changes are immediately available.

## Quick Start

1. **Navigate to your git repository**
   ```bash
   cd /path/to/your/repo
   ```

2. **Run setup to configure environments**
   ```bash
   tag setup
   ```

3. **List your tags**
   ```bash
   tag list
   ```

4. **Create a new tag**
   ```bash
   tag bump staging
   ```

## Commands

### `tag setup`

Configure environment tags by detecting prefixes from existing tags.

This command will:
- Fetch tags from the remote repository
- Detect unique tag prefixes (e.g., `v`, `s`, `x`, `preprod`)
- Prompt you to configure each prefix with a name and description
- Save configuration to `.tag-config.json`

**Usage:**
```bash
tag setup
```

**Example:**
```bash
$ tag setup
Fetching tags from origin...
✓ Tags fetched successfully

Found tag prefixes:
  D: d0.1.16, d0.1.17, d0.1.18
  Y: y1.3.0, y1.3.0-T1
  S: s0.0.14, s0.0.15, s0.0.16
  V: v0.0.10, v0.0.11, v0.0.12
  X: x0.0.10, x0.0.11, x0.0.12

Prefix "D"
  Examples: d0.1.16, d0.1.17, d0.1.18
? Configure prefix "d"? Yes
? Name: Dev
? Description (optional): Development environment
? Confirm "Dev" for prefix "d"? Yes
...
```

### `tag list`

Show the latest tag for each configured environment.

**Usage:**
```bash
tag list
```

**Example Output:**
```
Production (prod): v1.2.3 - Production environment
Josh · 3 days ago

Sandbox (sandbox): x1.2.3 - Sandbox testing environment
Bob · 2 hours ago

Preprod (preprod): p1.2.3 - Pre-production environment
Joshua  · 18 hours ago
Deploy hotfix for login issue

Staging (staging): s1.2.3 - Staging environment
Alice · 1 hour ago

Dev (dev): d1.2.3 - Development environment
Carol · 10 minutes ago
```

### `tag bump [env]`

Create and push a new tag for an environment with automatic version bumping.

This command will:
- Show the current latest tag and the next tag that will be created
- Prompt for an optional annotation message
- Create the tag locally (annotated or lightweight)
- Push the tag to origin
- Fetch latest tags from origin

**Usage:**
```bash
tag bump [env]
```

**Examples:**
```bash
# Interactive environment selection
tag bump

# Direct environment specification
tag bump staging
tag bump prod
tag bump dev
```

**Example Output:**
```bash
$ tag bump staging

Environment: Staging (staging)
Current latest: s0.0.4
Next tag:       s0.0.5

? Annotation message (optional – leave blank to create a lightweight tag): Deploy hotfix for login issue

✓ Created tag s0.0.5
✓ Pushed s0.0.5 to origin
✓ Fetched latest tags from origin
```

### `tag refresh`

Fetch tags from the remote repository to update your local tag list.

**Usage:**
```bash
tag refresh
```

**Example:**
```bash
$ tag refresh
Fetching tags from origin...
✓ Tags refreshed successfully
```

### `tag reset`

Reset configuration by deleting the `.tag-config.json` file.

This will prompt for confirmation before deleting the configuration file.

**Usage:**
```bash
tag reset
```

**Example:**
```bash
$ tag reset
? Are you sure you want to delete .tag-config.json? No
Reset cancelled.
```

## Configuration

### Configuration File

The tool stores configuration in `.tag-config.json` in your repository root. This file is created automatically when you run `tag setup`.

**Example `.tag-config.json`:**
```json
{
  "d": {
    "label": "Dev",
    "prefix": "d",
    "description": "Development environment"
  },
  "s": {
    "label": "Staging",
    "prefix": "s",
    "description": "Staging environment"
  },
  "prod": {
    "label": "Production",
    "prefix": "v",
    "description": "Production environment"
  }
}
```

### Tag Prefix Patterns

Tags must follow the pattern: `<prefix><major>.<minor>.<patch>`

Examples:
- `v1.2.3` - Production tag with prefix `v`
- `s0.1.5` - Staging tag with prefix `s`
- `d0.4.2` - Dev tag with prefix `d`
- `p2.4.7` - Preprod tag with prefix `p`

The tool automatically detects prefixes from your existing tags during setup.

## Examples

### Complete Workflow

```bash
# 1. Setup environments (first time)
tag setup

# 2. List current tags
tag list

# 3. Refresh tags from remote
tag refresh

# 4. Create a new staging tag
tag bump staging

# 5. Create a production tag with annotation
tag bump prod
# Enter annotation: "Release v1.2.0 - New features"

# 6. View updated tags
tag list
```

### Working with Multiple Environments

```bash
# Create tags for different environments
tag bump dev      # Creates d0.1.0
tag bump staging  # Creates s0.1.0
tag bump prod     # Creates v0.1.0

# Each environment maintains its own version sequence
tag bump dev      # Creates d0.1.1
tag bump staging  # Creates s0.1.1
tag bump prod     # Creates v0.1.1
```

## Requirements

- Node.js 14+ (ES modules support)
- Git repository initialized
- Remote named `origin` configured (for push/fetch operations)

## Troubleshooting

### "No environments configured"

If you see this message when running `tag list`, you need to run `tag setup` first:

```bash
tag setup
```

### "Git command failed"

Make sure you're in a git repository:

```bash
git status  # Should show repository status
```

### "Error refreshing tags: would clobber existing tag"

This happens when local and remote tags differ. The `refresh` command uses force fetch to resolve this automatically.

### "fatal: not a git repository"

Ensure you're in a directory with a `.git` folder, or initialize a git repository:

```bash
git init
```

### Configuration not loading

If your configuration isn't loading:
1. Check that `.tag-config.json` exists in the repository root
2. Verify the JSON is valid: `cat .tag-config.json | jq`
3. Run `tag reset` and `tag setup` again if needed

## Development

### Project Structure

```
yourit/
├── bin/
│   └── tag.js              # Main entry point
├── lib/
│   ├── utils.js           # Shared utilities
│   └── commands/
│       ├── list.js         # List command
│       ├── setup.js        # Setup command
│       ├── refresh.js      # Refresh command
│       ├── reset.js        # Reset command
│       └── bump.js         # Bump command
└── package.json
```

### Running Locally

```bash
# Install dependencies
npm install

# Link for development
npm link

# Test commands
tag list
tag setup
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Author

Created for managing environment-specific git tags with ease.

---

**Made with ❤️ By [Joshua Armstrong](https://www.linkedin.com/in/joshuatarmstrong/)**

