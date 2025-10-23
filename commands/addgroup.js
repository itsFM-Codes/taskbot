const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addgroup')
    .setDescription('Create a new group (top-level if parent omitted)')
    .addStringOption(o => o.setName('name').setDescription('Group name').setRequired(true))
    .addStringOption(o => o.setName('parent').setDescription('Parent group path (e.g. work/Projects)')),
  async execute({ interaction, dataHandler }) {
    const name = interaction.options.getString('name');
    const parent = interaction.options.getString('parent');
    const segments = parent ? parent.split('/').filter(s => s.trim()) : [];
    try {
  const g = dataHandler.addGroupByPath(segments, name);
  await dataHandler.saveData();
  logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} made a new group "${name}"${segments.length ? ` in ${segments.join('/')}` : ' at top-level'}`);
  return interaction.reply({ content: `Created group "${name}"${segments.length ? ` under "${segments.join('/')}"` : ' at top-level'}.` });
    } catch (err) {
      return interaction.reply({ content: `Failed to create group: ${err.message}`, flags: 64 });
    }
  }
};