const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Set task status (pending or done)')
    .addStringOption(o => o.setName('path').setDescription('Task path (group/.../task)').setRequired(true))
    .addStringOption(o => o.setName('state').setDescription('pending or done').setRequired(true).addChoices(
      { name: 'pending', value: 'pending' },
      { name: 'done', value: 'done' }
    )),
  async execute({ interaction, dataHandler }) {
    const path = interaction.options.getString('path');
    const state = interaction.options.getString('state');
    const segs = path.split('/').filter(s => s.trim());
    try {
  const task = dataHandler.setTaskStatus(segs, state);
  await dataHandler.saveData();
  logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} set status ${task.name} -> ${state}`);
  return interaction.reply({ content: `Task "${task.name}" set to ${state}.` });
    } catch (err) {
      return interaction.reply({ content: `Failed to set status: ${err.message}`, flags: 64 });
    }
  }
};