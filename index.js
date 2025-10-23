const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType } = require('discord.js');
const config = require('./config.json');
const dataHandler = require('./utils/dataHandler');
const scheduler = require('./utils/scheduler');
const backup = require('./utils/backup');

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

const client = new Client({ intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.Guilds], partials: ['CHANNEL'] });

client.commands = new Collection();

for (const file of commandFiles) {
  const cmd = require(path.join(commandsPath, file));
  client.commands.set(cmd.data.name, cmd);
}

// Register slash commands on ready
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setActivity('the game of productivity!', {
    type: ActivityType.Playing,
    details: 'Fighting procrastination!',
    state: 'Leveling up your task list :3',
    timestamps: { start: Date.now() },
    assets: {
      large_image: 'bigpresence',
      large_text: 'Task Queue Bot',
      small_image: 'smallpresence',
      small_text: 'Online',
    }
  });
  console.log('Bot activity set.');

  // load data
  await dataHandler.loadData();
  // register commands (global)
  const rest = new REST({ version: '10' }).setToken(config.token);
  const commandsPayload = client.commands.map(cmd => cmd.data.toJSON());
  try {
    console.log('Registering slash commands (this may take a minute)...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commandsPayload });
    console.log('Commands registered.');
  } catch (err) {
    console.error('Failed registering commands:', err);
  }
  // start scheduler and backups
  scheduler.start(client);
  backup.initDailyBackup(client);
});

// Interaction handler (code unchanged)
client.on('interactionCreate', async interaction => {
    try {
        if (!interaction || !interaction.isChatInputCommand()) return;
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute({ interaction, dataHandler, scheduler });

    } catch (err) {
        console.error('Interaction handling error:', err);
        if (interaction && (interaction.replied || interaction.deferred)) {
            await interaction.followUp({ content: 'An error occurred while executing this command.', flags: 64 }).catch(e => console.error("Follow-up failed", e));
        } else if (interaction) {
            await interaction.reply({ content: 'An error occurred while executing this command.', flags: 64 }).catch(e => console.error("Reply failed", e));
        }
    }
});

client.login(config.token);

const gracefulShutdown = async () => {
  console.log('Bot is shutting down. Sending final backup...');
  try {
    const owner = await client.users.fetch(config.owner_id).catch(() => null);
    if (owner) {
      await backup.sendBackup(owner);
      console.log('Final backup sent successfully.');
    } else {
      console.log('Could not fetch owner to send final backup.');
    }
  } catch (err) {
    console.error('Failed to send backup on shutdown:', err);
  } finally {
    console.log('Exiting process.');
    client.destroy();
    process.exit(0);
  }
};

process.on('SIGINT', gracefulShutdown); // Catches Ctrl+C
process.on('SIGTERM', gracefulShutdown); // Catches kill command