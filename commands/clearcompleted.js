const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearcompleted')
    .setDescription('Remove all tasks marked as done (recursively)'),
  async execute({ interaction, dataHandler }) {
    try {
  const removed = dataHandler.clearCompleted();
  await dataHandler.saveData();
  logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} cleared ${removed} completed tasks`);
  return interaction.reply({ content: `Removed ${removed} completed tasks.` });
    } catch (err) {
      return interaction.reply({ content: `Failed to clear completed: ${err.message}`, flags: 64 });
    }
  }
};