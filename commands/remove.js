const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a group or a task. Use full path.')
    .addStringOption(o => o.setName('path').setDescription('Path to group or task').setRequired(true)),
  async execute({ interaction, dataHandler }) {
    const path = interaction.options.getString('path');
    const segs = path.split('/').filter(s => s.trim());
    try {
      // try group first
      const gFound = dataHandler.findGroupByPathSegments(segs);
      if (gFound) {
        // remove group
        dataHandler.removeGroupByPath(segs);
        await dataHandler.saveData();
        logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} removed group ${path}`);
        return interaction.reply({ content: `Removed group "${path}".` });
      }
      // try task
      const tFound = dataHandler.findTaskByPathSegments(segs);
      if (tFound) {
        dataHandler.removeTaskByPath(segs);
        await dataHandler.saveData();
        logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} removed task ${path}`);
        return interaction.reply({ content: `Removed task "${path}".` });
      }
      return interaction.reply({ content: `Path not found.`, flags: 64 });
    } catch (err) {
      return interaction.reply({ content: `Failed to remove: ${err.message}`, flags: 64 });
    }
  }
};