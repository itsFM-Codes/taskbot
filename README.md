# Task Queue Bot - Logger

The project now includes a simple logger utility at `utils/logger.js`.

Behavior:

  YYYY-MM-DD HH:MM:SS - <discordId> : <message>


```js
const logger = require('./utils/logger');
logger.log({ id: interaction.user.id, username: interaction.user.username }, 'your message here');
```

Options:

Example messages are added in the command handlers: `commands/*` will now log user actions (addgroup, addtask, remove, move, rename, setreminderhours, status, sort, clearcompleted, backup, search, list, help).

If you want a different log directory or behavior (rotate files, external logger like winston), I can add that.
Task Queue Bot — Logger & Test Runner

This repository includes a small logger utility and a smoke-test runner to help validate command behavior locally.

# Task Queue Bot

This repository provides a small Task Queue bot (commands under `commands/`), a simple
logger utility (`utils/logger.js`) and a smoke-test runner (`testers/test-runner.js`).

For full documentation and usage examples, see `README_FULL.md`.

Quick start
- Run the smoke-test runner (PowerShell):
  ```powershell
  .\testers\run-windows.ps1 --dry-run
  ```

- Or run the runner directly:
  ```powershell
  node testers/test-runner.js --help
  ```

The `README_FULL.md` file contains complete usage details, options, and examples.
- Run (Linux/macOS):
