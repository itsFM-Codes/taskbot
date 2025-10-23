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

Logger (utils/logger.js)
- Purpose: log user actions to the console and to a daily file.
- Format: 2025-10-23 12:34:56 - <discordId> : <message>
- File location: logs/<YYYY-MM-DD>.txt (created automatically)
- Usage:
  const logger = require('./utils/logger');
  logger.log({ id: interaction.user.id, username: interaction.user.username }, 'did something');
- Options: pass { toFile: false } as a third argument to skip writing to the file for that call.

Notes:
- The logger is intentionally small and synchronous. For production-grade features (rotation, levels), consider winston or pino.
- Commands in `commands/` already call the logger on successful actions.

Test runner (testers/test-runner.js)
- Purpose: smoke-test command logic without connecting to Discord.
- Behavior: backs up `data.json`, loads data, invokes command handlers via a MockInteraction, then restores `data.json`.
- Run (Windows PowerShell):
  1. Open PowerShell in the project root.
  2. Run: .\testers\run-windows.ps1
- Run (Linux/macOS):
  1. Open a shell in the project root.
  2. Make launcher executable: chmod +x testers/run-linux.sh
  3. Run: testers/run-linux.sh
 - Useful options:
   - `--dry-run` : show the planned command sequence but don't execute it (no side-effects).
   - `--limit=N` : run only the first N commands from the default sequence (quick checks).
   - `--list`    : list available command names and exit (no side-effects).
   - `--report`  : write a JSON report to the `reports/` folder (timestamped filename) or use `--report=path` to choose a file.
  - `--mock-time=VAL` : freeze time during the run (ISO date string or epoch ms).
  - `--retry=N`       : retry failed commands up to N times before marking failure.
  - `--timeout=MS`    : per-command timeout in milliseconds; commands taking longer fail.

Examples (Windows PowerShell):
```
.\testers\run-windows.ps1 --dry-run
.\testers\run-windows.ps1 --silent --report=results.json
```

Examples (Linux/macOS):
```
./testers/run-linux.sh --dry-run
./testers/run-linux.sh --silent --report
```
