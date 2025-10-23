test-runner usage

This file documents the test runner options (duplicate of README entry for quick reference).

Options
- --silent, -s        : minimal output (only OK and ERR lines)
- --fail-on-err       : exit with code 1 if any command fails
- --no-backup         : do not backup/restore data.json
- --only=cmd1,cmd2    : run only the named commands (comma-separated)
- --report            : write a JSON report of the run to the default `reports/` folder (timestamped filename)
- --report=path       : write a JSON report to the given file path or directory
- --help, -h          : show help and exit

Additional helpful options
- --dry-run           : show the list of commands that would run, but don't execute them
- --limit=N           : stop after N commands have run (useful for quick checks)
- --list              : list available command names and exit
- --mock-time=VAL    : freeze time for the run (ISO string or epoch ms)
- --retry=N          : retry failed commands up to N times
- --timeout=MS       : per-command timeout in milliseconds
- --retry-delay=MS   : wait MS milliseconds between retry attempts (default 200ms)

Running via the provided launchers

Windows (PowerShell):

```powershell
.\testers\run-windows.ps1 --silent --report
```

Linux / macOS (bash/sh):

```bash
./testers/run-linux.sh --silent --report
```

Examples

- Run silently and fail CI on error:
  node testers/test-runner.js --silent --fail-on-err

- Run only addgroup and addtask (verbose):
  node testers/test-runner.js --only=addgroup,addtask

- Run and write a JSON report to a file:
  node testers/test-runner.js --report=results.json

- Write a report to the default folder (reports/YYYY-MM-DD_HHMMSS.json):
  node testers/test-runner.js --report

- Show planned commands without running them:
  node testers/test-runner.js --dry-run

- Run only the first 3 commands:
  node testers/test-runner.js --limit=3

- List available commands and exit:
  node testers/test-runner.js --list
