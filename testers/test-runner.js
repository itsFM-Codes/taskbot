const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, '..', 'commands');
const dataHandler = require(path.join(__dirname, '..', 'utils', 'dataHandler'));
const config = require(path.join(__dirname, '..', 'config.json'));

// Simple mock interaction and options helpers
class MockOptions {
  constructor(map) { this.map = map || {}; }
  getString(name) { const v = this.map[name]; return v === undefined ? null : String(v); }
  getInteger(name) { const v = this.map[name]; return v === undefined ? null : parseInt(v, 10); }
}

class MockInteraction {
  constructor(user, options) {
    this.user = user;
    this.options = new MockOptions(options);
    this.replied = false;
    this.lastReply = null;
    this.replies = [];
  }
  isChatInputCommand() { return true; }
  reply(obj) {
    this.replied = true;
    const out = typeof obj === 'string' ? obj : (obj && obj.content) ? obj.content : JSON.stringify(obj);
    this.lastReply = out;
    this.replies.push({ type: 'reply', content: out });
    console.log(`[reply] ${out}`);
    return Promise.resolve();
  }
  followUp(obj) {
    const out = typeof obj === 'string' ? obj : (obj && obj.content) ? obj.content : JSON.stringify(obj);
    this.lastReply = out;
    this.replies.push({ type: 'followUp', content: out });
    console.log(`[followUp] ${out}`);
    return Promise.resolve();
  }
}

function loadCommands() {
  const map = {};
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const cmd = require(path.join(commandsDir, f));
    map[cmd.data.name] = cmd;
  }
  return map;
}

async function run() {
  const rawArgs = process.argv.slice(2);
  // CLI options:
  // usage: node test-runner.js [testerFile] [--silent|-s] [--fail-on-err] [--no-backup] [--only=cmd1,cmd2] [--help|-h]
  let testerFile = null;
  let silent = false;
  let failOnErr = false;
  let noBackup = false;
  let onlyList = null; // array of command names to run
  let reportPath = null;
  let showHelp = false;
  let dryRun = false; // list planned commands but don't execute
  let limit = null; // optional limit on number of commands to run
  let listOnly = false; // just list available commands and exit
  let mockTime = null; // epoch ms to freeze Date
  let retryCount = 0; // number of retries on failure
  let timeoutMs = null; // per-command timeout in ms

  for (const a of rawArgs) {
    if (a === '--silent' || a === '-s') { silent = true; continue; }
    if (a === '--fail-on-err') { failOnErr = true; continue; }
    if (a === '--no-backup') { noBackup = true; continue; }
    if (a === '--help' || a === '-h') { showHelp = true; continue; }
  if (a.startsWith('--only=')) { onlyList = a.substring(7).split(',').map(x => x.trim()).filter(Boolean); continue; }
  if (a === '--report') { reportPath = true; continue; }
  if (a.startsWith('--report=')) { reportPath = a.substring(9); continue; }
  if (a === '--dry-run') { dryRun = true; continue; }
  if (a === '--list') { listOnly = true; continue; }
  if (a.startsWith('--limit=')) { const v = parseInt(a.substring(8), 10); if (isNaN(v) || v < 1) { console.error('Invalid --limit value, expected a positive integer'); process.exit(2); } limit = v; continue; }
  if (a.startsWith('--mock-time=')) {
    const raw = a.substring(12);
    // Accept 'YYYY-MM-DD HH:MM:SS' by converting space -> 'T' so Date.parse treats as local/ISO
    let candidate = raw;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(raw)) {
      candidate = raw.replace(' ', 'T');
    }
    const t = Date.parse(candidate);
    if (!isNaN(t)) { mockTime = t; } else { const n = parseInt(raw, 10); if (!isNaN(n)) mockTime = n; else { console.error('Invalid --mock-time value, expected ISO date, "YYYY-MM-DD HH:MM[:SS]" or epoch ms'); process.exit(2); } }
    continue;
  }
  if (a.startsWith('--retry=')) { const v = parseInt(a.substring(8), 10); if (isNaN(v) || v < 0) { console.error('Invalid --retry value, expected non-negative integer'); process.exit(2); } retryCount = v; continue; }
  if (a.startsWith('--timeout=')) { const v = parseInt(a.substring(10), 10); if (isNaN(v) || v < 1) { console.error('Invalid --timeout value, expected milliseconds as positive integer'); process.exit(2); } timeoutMs = v; continue; }
    // positional first arg
  if (a.startsWith('-')) { console.error(`Unrecognized option: ${a}`); process.exit(2); }
    if (!testerFile) testerFile = a;
  }

  if (showHelp) {
    const help = [];
    help.push('test-runner usage: node test-runner.js [testerFile] [options]');
    help.push('');
    help.push('Options:');
    const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
    help.push(`  ${pad('--silent, -s', 20)}: minimal output (only OK/ERR)`);
    help.push(`  ${pad('--fail-on-err', 20)}: exit with code 1 if any command fails`);
    help.push(`  ${pad('--no-backup', 20)}: do not backup/restore data.json`);
    help.push(`  ${pad("--only=cmd1,cmd2", 20)}: run only the named commands (comma-separated)`);
    help.push(`  ${pad('--report', 20)}: write a JSON report to the default 'reports/' folder (timestamped)`);
  help.push(`  ${pad('--report=path', 20)}: write a JSON report to the given file or directory`);
  help.push(`  ${pad('--dry-run', 20)}: show planned commands but do not execute them`);
  help.push(`  ${pad('--limit=N', 20)}: stop after N commands from the sequence`);
  help.push(`  ${pad('--list', 20)}: list available commands and exit`);
  help.push(`  ${pad('--mock-time=VAL', 20)}: freeze time to ISO/epoch ms VAL for the run`);
  help.push(`  ${pad('--retry=N', 20)}: retry failed commands up to N times`);
  help.push(`  ${pad('--timeout=MS', 20)}: per-command timeout in milliseconds`);
    help.push(`  ${pad('--help, -h', 20)}: show this help`);
    help.push('');
    help.push('Examples:');
    help.push('  node testers/test-runner.js --silent --report');
    help.push('  node testers/test-runner.js --report=results.json');
    help.push('  testers\\run-windows.ps1 --silent --report');
    help.push('  ./testers/run-linux.sh --silent --report');
    console.log(help.join('\n'));
    return;
  }

  const origConsoleLog = console.log;
  const origConsoleError = console.error;

  // In silent mode we filter out any console output except OK/ERR lines
  if (silent) {
    console.log = (...args) => {
      try {
        const s = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        if (s.startsWith('OK:') || s.startsWith('ERR')) origConsoleLog(...args);
      } catch (e) { /* swallow */ }
    };
    console.error = (...args) => {
      try {
        const s = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        if (s.startsWith('ERR')) origConsoleError(...args);
      } catch (e) { /* swallow */ }
    };
  }

  const log = (...args) => { if (!silent) origConsoleLog(...args); };
  const err = (...args) => { if (!silent) origConsoleError(...args); };
  const always = (...args) => { origConsoleLog(...args); };

  log('--- TEST RUNNER START ---');
  const DATA_PATH = path.join(__dirname, '..', 'data.json');
  const BACKUP_PATH = DATA_PATH + '.bak';

  // If mockTime is provided, override global Date for the process.
  let RealDate = null;
  if (mockTime !== null) {
    RealDate = Date;
    // Minimal Date shim: zero-arg constructor and Date.now() return mocked time
    // This is only for the test-runner; avoid affecting other processes.
    // eslint-disable-next-line no-global-assign
    Date = class extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          super(mockTime);
        } else {
          super(...args);
        }
      }
      static now() { return mockTime; }
      static parse(s) { return RealDate.parse(s); }
      static UTC(...args) { return RealDate.UTC(...args); }
    };
  }

  try {
    await dataHandler.loadData();
  } catch (e) {
    console.error('Failed to load data:', e);
    // restore mocked Date before exiting
    if (RealDate) { Date = RealDate; RealDate = null; }
    process.exitCode = 2;
    return;
  }

  const commands = loadCommands();
  const schedulerStub = { start: () => {} };

  const stats = { ok: 0, err: 0 };
  const results = [];

  // Build the list of commands to run (default sequence)
  const defaultSequence = [
    { name: 'addgroup', opts: { name: 'TestGroup' } },
    { name: 'addgroup', opts: { name: 'SubGroup', parent: 'TestGroup' } },
    { name: 'addtask', opts: { name: 'Task1', group: 'TestGroup/SubGroup', deadline: '2025-12-31 12:00', description: 'desc' } },
    { name: 'list', opts: {} },
    { name: 'search', opts: { query: 'Task1' } },
    { name: 'setreminderhours', opts: { hours: 48 } },
    { name: 'status', opts: { path: 'TestGroup/SubGroup/Task1', state: 'done' } },
    { name: 'clearcompleted', opts: {} },
    { name: 'remove', opts: { path: 'TestGroup/SubGroup/Task1' } },
    { name: 'rename', opts: { path: 'TestGroup/SubGroup', new_name: 'RenamedSub' } },
    { name: 'move', opts: { from: 'TestGroup/RenamedSub', to: '' } },
    { name: 'sort', opts: { path: 'TestGroup', by: 'name' } },
  ];

  let sequence = defaultSequence;
  if (onlyList && Array.isArray(onlyList)) {
    // filter defaultSequence to only include named commands, preserving order
    sequence = defaultSequence.filter(s => onlyList.includes(s.name));
    if (sequence.length === 0) {
      console.warn('No matching commands found for --only list. Exiting.');
      if (RealDate) { Date = RealDate; RealDate = null; }
      return;
    }
  }

  // apply --limit if provided
  if (limit && Number.isInteger(limit) && limit > 0) {
    sequence = sequence.slice(0, limit);
  }

  // if --list, print available commands and exit (no side-effects)
  if (listOnly) {
    origConsoleLog('Available commands:');
    for (const n of Object.keys(commands).sort()) origConsoleLog('  ' + n);
    if (RealDate) { Date = RealDate; RealDate = null; }
    return;
  }

  // if dry-run, show planned sequence and exit before any backup/IO
  if (dryRun) {
    origConsoleLog('Planned command sequence:');
    for (const item of sequence) origConsoleLog(`  /${item.name} ${JSON.stringify(item.opts)}`);
    if (RealDate) { Date = RealDate; RealDate = null; }
    return;
  }

  // backup current data.json (unless disabled) — do this AFTER dry-run/list checks
  if (!noBackup && fs.existsSync(DATA_PATH)) {
    fs.copyFileSync(DATA_PATH, BACKUP_PATH);
    log('Backed up data.json to data.json.bak');
  }

  function timestampFileName() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    let base = `${y}-${m}-${day}_${hh}${mm}${ss}`;
    // If time was mocked, append millisecond + short random to avoid filename collisions
    if (typeof mockTime === 'number' && mockTime !== null) {
      const ms = String(d.getMilliseconds()).padStart(3, '0');
      const rand = Math.random().toString(16).slice(2, 8);
      base = `${base}${ms}_${rand}`;
    }
    return `${base}.json`;
  }

  const user = { id: '999999', username: 'tester' };

  async function runCmd(name, opts = {}, userOverride = null) {
    const cmd = commands[name];
    if (!cmd) { console.warn('Command not found:', name); return; }
    const interaction = new MockInteraction(userOverride || user, opts);

    // helper that runs the provided function and rejects if it doesn't finish before timeoutMs
    const runWithTimeout = (fn) => {
      if (!timeoutMs) return fn();
      return new Promise((resolve, reject) => {
        let settled = false;
        const t = setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error(`Command timed out after ${timeoutMs} ms`));
        }, timeoutMs);
        Promise.resolve()
          .then(() => fn())
          .then(r => { if (!settled) { settled = true; clearTimeout(t); resolve(r); } })
          .catch(e => { if (!settled) { settled = true; clearTimeout(t); reject(e); } });
      });
    };

    let attempt = 0;
    while (true) {
      attempt += 1;
      try {
        await runWithTimeout(() => cmd.execute({ interaction, dataHandler, scheduler: schedulerStub }));
        always(`OK: /${name}`);
        stats.ok += 1;
        results.push({ name, ok: true, message: `OK: /${name}`, reply: interaction.lastReply || null });
        break;
      } catch (err) {
        const m = err && err.stack ? err.stack : String(err);
        if (attempt <= retryCount) {
          always(`Retry ${attempt}/${retryCount} for /${name} after error: ${m}`);
          // clear interaction state between attempts
          interaction.replied = false;
          interaction.lastReply = null;
          interaction.replies = [];
          continue;
        }
        always(`ERR running /${name}: ${m}`);
        stats.err += 1;
        results.push({ name, ok: false, message: m, reply: interaction.lastReply || null });
        break;
      }
    }
  }

  // execute the sequence
  for (const item of sequence) {
    await runCmd(item.name, item.opts);
  }

  // Test backup: use owner id to pass permission
  const ownerUser = { id: config.owner_id, username: 'owner' };
  await runCmd('backup', {}, ownerUser);

  if (!silent) console.log('Final data snapshot:', JSON.stringify(dataHandler.getRawData(), null, 2));

  // restore backup
  if (fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(BACKUP_PATH, DATA_PATH);
    fs.unlinkSync(BACKUP_PATH);
    log('Restored original data.json from backup.');
  }

  log('--- TEST RUNNER END ---');
  // Final summary (use original console to ensure visibility even in silent mode)
  try {
    origConsoleLog(`TEST SUMMARY: ${stats.ok} OK, ${stats.err} ERR`);
  } catch (e) { /* ignore */ }
  if (failOnErr && stats.err > 0) {
    origConsoleLog('Fail-on-err enabled and some commands failed. Setting exit code 1.');
    process.exitCode = 1;
  }
  if (reportPath) {
    try {
      // compute default path when reportPath === true
      let finalPath = reportPath === true ? null : reportPath;
      if (!finalPath) {
        const reportsDir = path.join(__dirname, '..', 'reports');
        if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
        finalPath = path.join(reportsDir, timestampFileName());
      } else {
        // if finalPath is an existing directory, write into it
        if (fs.existsSync(finalPath) && fs.statSync(finalPath).isDirectory()) {
          if (!fs.existsSync(finalPath)) fs.mkdirSync(finalPath, { recursive: true });
          finalPath = path.join(finalPath, timestampFileName());
        }
      }

      // ensure containing directory exists
      const dir = path.dirname(finalPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(finalPath, JSON.stringify({ stats, results }, null, 2), 'utf8');
      origConsoleLog(`Wrote report to ${finalPath}`);
    } catch (e) {
      origConsoleLog('Failed to write report:', e);
    }
  }
  // restore mocked Date if we replaced it earlier
  if (RealDate) { Date = RealDate; RealDate = null; }
}

run().catch(err => {
  console.error('Test runner failed:', err);
});
