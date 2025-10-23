const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename a group or task')
    .addStringOption(o => o.setName('path').setDescription('Path to group or task').setRequired(true))
    .addStringOption(o => o.setName('new_name').setDescription('New name').setRequired(true)),
  async execute({ interaction, dataHandler }) {
    const path = interaction.options.getString('path');
    const newName = interaction.options.getString('new_name');
    const segs = path.split('/').filter(s => s.trim());
    try {
      const r = dataHandler.renameByPath(segs, newName);
      await dataHandler.saveData();
      logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} renamed ${path} -> ${newName}`);
      return interaction.reply({ content: `${r.type === 'group' ? 'Group' : 'Task'} renamed to "${newName}".` });
    } catch (err) {
      return interaction.reply({ content: `Failed to rename: ${err.message}`, flags: 64 });
    }
  }
};