const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const config = require('../config.json');

const DATA_PATH = path.join(__dirname, '..', 'data.json');

/**
 * Sends the data.json file to a specified user.
 * @param {import('discord.js').User} user The user to send the backup to.
 */
async function sendBackup(user) {
  if (!user) return;

  try {
    if (!fs.existsSync(DATA_PATH)) {
      console.log('Backup skipped: data.json does not exist.');
      return;
    }
    await user.send({
      content: `Here is your daily Task Queue Bot data backup for ${new Date().toDateString()}.`,
      files: [DATA_PATH]
    });
    console.log(`Backup sent to ${user.tag}.`);
  } catch (err) {
    console.error(`Failed to send backup DM to ${user.tag}:`, err);
  }
}

/**
 * Initializes a cron job to send a daily backup.
 * @param {import('discord.js').Client} client The Discord client instance.
 */
function initDailyBackup(client) {
  cron.schedule('0 12 * * *', async () => {
    console.log('Running daily backup task...');
    try {
      const owner = await client.users.fetch(config.owner_id);
      await sendBackup(owner);
    } catch (err) {
      console.error('Failed to run daily backup:', err);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Jakarta"
  });

  console.log('Daily backup scheduler initialized for 12:00 PM Asia/Jakarta.');
}

module.exports = {
  sendBackup,
  initDailyBackup
};