const dayjs = require('dayjs');

let intervalHandle = null;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// start scheduler with client (to DM owner)
function start(client) {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = setInterval(() => {
    runCheck(client);
  }, CHECK_INTERVAL_MS);
  // run once immediately
  runCheck(client).catch(err => console.error('Scheduler initial run error:', err));
}

async function runCheck(client) {
  // require dataHandler lazily to avoid cycles
  const dataHandler = require('./dataHandler');
  const config = require('../config.json');

  // walk tasks
  const now = dayjs();
  dataHandler.walkTasks((task, groupPath) => {
    try {
      if (!task.deadline) return;
      if (task.status === 'done') return;
      // don't send multiple reminders
      if (task.reminded) return;
      const deadline = dayjs(task.deadline);
      if (!deadline.isValid()) return;
      // effective hours
      const eff = dataHandler.getEffectiveReminderHours(task, groupPath);
      const diffHours = deadline.diff(now, 'hour', true); // fractional hours
      if (diffHours <= eff && diffHours >= 0) {
        // send DM
        const owner = client.users.cache.get(config.owner_id) || client.users.fetch(config.owner_id).catch(()=>null);
        Promise.resolve(owner).then(user => {
          if (!user) return;
          const inText = diffHours < 1 ? `${Math.round(diffHours * 60)} minutes` : `${Math.round(diffHours)} hours`;
          const gpath = groupPath.join('/');
          const msg = `Reminder: Your task "${task.name}" in "${gpath}" is due soon (in ${inText}). Deadline: ${deadline.toISOString()}.`;
          user.send(msg).catch(err => console.error('Failed to send reminder DM:', err));
          // set reminded flag and save
          task.reminded = true;
          dataHandler.saveData().catch(err => console.error('Failed to save data after reminder flag:', err));
        }).catch(err => console.error('Failed to fetch owner user:', err));
      }
    } catch (err) {
      console.error('Scheduler error for task:', err);
    }
  });
}

module.exports = { start, runCheck };