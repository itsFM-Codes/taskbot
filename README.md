# Task Queue Bot

Production-focused README for a self-hosted Discord task-queue bot. This document explains how to configure, run, and maintain the bot in a real project setting. It also contains a command reference, data/logging details, and guidance for contributors.

Table of contents
- [Overview](#overview)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Run and deploy](#run-and-deploy)
- [Commands (summary)](#commands-summary)
- [Logging](#logging)
- [Development & testing](#development--testing)
- [Contributing](#contributing)

## Overview
This project implements a Discord bot that manages a simple task queue per user or group. It follows practical conventions for small production deployments:

- Configured via environment variables
- Synchronous file-based persistence for simplicity (suitable for light workloads)
- A small smoke-test runner to validate command logic without a live Discord connection

## Repository layout
- `index.js` — main entry (registers and slash commands and boots the bot)
- `commands/` — command modules (each exports `data` and `execute`)
- `utils/logger.js` — timestamped logger (console + daily files under `logs/`)
- `utils/dataHandler.js` — read/write helpers for `data.json`
- `testers/` — test-runner and helper scripts (`test-runner.js`, `run-windows.ps1`, `run-linux.sh`)
- `data.json` — persisted task data
- `logs/` — runtime logs (created automatically)

## Prerequisites
- Node.js 14+ (LTS recommended)
- npm (or yarn)
- A Discord application and bot token (for deployment)

## Installation
Clone the repo and install dependencies:

```powershell
git clone <repo-url>
cd task
npm install
```

Note: replace `<repo-url>` with your repository clone URL.

## Configuration
You can configure the bot either via environment variables (recommended for production) or by placing a `config.json` file in the repository root for local/development use.

If you choose `config.json`, copy the provided `config.example.json` to `config.json` and fill in the values. Do NOT commit `config.json` with real secrets — see `.gitignore`.

Example `config.json` (development, do not commit):

```json
{
	"discord": {
		"token": "<DISCORD_TOKEN - prefer using env vars for production>",
		"clientId": "<CLIENT_ID>",
		"guildId": "<GUILD_ID - optional for dev registration>"
	},
	"paths": {
		"dataFile": "data.json",
		"logsDir": "logs",
		"backupDir": "backups"
	},
	"reminders": {
		"enabled": false,
		"defaultHours": 24
	},
	"backup": {
		"enabled": true,
		"keepCopies": 7
	},
	"logging": {
		"toFile": true,
		"level": "info"
	}
}
```

Environment variables supported (these override `config.json` when present):

- `DISCORD_TOKEN` — bot token (recommended)
- `CLIENT_ID` — application client id
- `GUILD_ID` — development guild id (optional)

Tip: For production use, keep secrets in your process manager or secret store and prefer environment variables.

## Run and deploy
Local development (quick):

```powershell
node index.js
```

Suggested `package.json` scripts (add these to make running consistent):

```
"scripts": {
	"start": "node index.js",
	"test-runner": "node testers/test-runner.js",
	"lint": "eslint . || true"
}
```

For production, run the bot under a process manager (PM2, systemd, Docker). Example with PM2:

```powershell
pm2 start index.js --name taskbot --env production
```

### Backups
The smoke-test runner and certain maintenance commands back up `data.json` before modifying it. For production use, add regular backups (e.g., daily copy to cloud storage).

## Commands (summary)
The project exposes several slash commands implemented in `commands/`. Each command follows the `discord.js` pattern and should export `data` (command metadata) and `execute(interaction)`.

Common commands implemented (see `commands/` for exact names and flags):

- `addgroup` — create a task group
- `addtask` — add a task to a group
- `list` — list tasks/groups
- `remove` — remove a task
- `move` — move a task between groups
- `rename` — rename group or task
- `status` — mark tasks complete/incomplete
- `setreminderhours` — configure reminder schedule for a group
- `search` — search tasks
- `backup` — write a backup of `data.json`

Include new commands by adding a file under `commands/` and exporting `data` and `execute`.

## Logging
Logs are written to `logs/YYYY-MM-DD.txt` and also printed to the console. The format is:

```
YYYY-MM-DD HH:MM:SS - <discordId> : <message>
```

For production-grade logging (rotation, levels, remote sinks) consider integrating `winston` or `pino`.

## Development & testing
- Use `testers/run-windows.ps1` or `testers/run-linux.sh` to run the smoke-test runner locally.
- The runner can be invoked with `--dry-run`, `--report`, `--mock-time`, and other options. Run `node testers/test-runner.js --help` for full options.
- Keep command code deterministic and avoid making direct network requests in command implementations to keep them testable.

## Contributing
1. Fork the repository and create a feature branch.
2. Add tests or a smoke-test scenario for any new command or behavioral change.
3. Open a pull request describing the change and how to test it.

Please follow the code style used in the repository and keep changes small and focused.

---

Maintainers: please keep `README.md` up to date with new commands and configuration changes.