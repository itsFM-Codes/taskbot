const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const config = require('../config.json');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Sends a backup of the data.json file (owner only).'),
  async execute({ interaction }) {
    if (interaction.user.id !== config.owner_id) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      const dataPath = path.join(__dirname, '..', 'data.json');
      if (!fs.existsSync(dataPath)) {
        return interaction.reply({ content: 'Backup file not found.', ephemeral: true });
      }

      await interaction.reply({
        content: 'Here is your data backup file.',
        files: [dataPath]
      });
      logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} requested a backup`);
    } catch (err) {
      console.error('Backup command failed:', err);
      return interaction.reply({ content: 'Failed to retrieve the backup file.', ephemeral: true });
    }
  }
};