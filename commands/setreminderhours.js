const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setreminderhours')
    .setDescription('Set global reminder hours before deadline (also read per-group/task overrides if present)')
    .addIntegerOption(o => o.setName('hours').setDescription('Number of hours').setRequired(true)),
  async execute({ interaction, dataHandler, scheduler }) {
    const hours = interaction.options.getInteger('hours');
    if (hours < 0) return interaction.reply({ content: 'Hours must be >= 0', flags: 64 });
    try {
      dataHandler.setGlobalReminderHours(hours);
      await dataHandler.saveData();
      // restart scheduler run to pick up new value
      try {
        // scheduler has start method that uses data on each run; call start to reset interval
        scheduler.start(interaction.client);
      } catch (e) {}
      logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} set global reminder hours to ${hours}`);
      return interaction.reply({ content: `Global reminder hours set to ${hours}.` });
    } catch (err) {
      return interaction.reply({ content: `Failed to set reminder hours: ${err.message}`, flags: 64 });
    }
  }
};