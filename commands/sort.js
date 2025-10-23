const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sort')
    .setDescription('Sort tasks in a group and save order')
    .addStringOption(o => o.setName('path').setDescription('Group path').setRequired(true))
    .addStringOption(o => o.setName('by').setDescription('Sort by: name|deadline|status').setRequired(true)
      .addChoices(
        { name: 'name', value: 'name' },
        { name: 'deadline', value: 'deadline' },
        { name: 'status', value: 'status' }
      )),
  async execute({ interaction, dataHandler }) {
    const path = interaction.options.getString('path');
    const by = interaction.options.getString('by');
    const segs = path.split('/').filter(s => s.trim());
    try {
      const found = dataHandler.findGroupByPathSegments(segs);
      if (!found) return interaction.reply({ content: 'Group not found.', flags: 64 });
      const group = found.group;
      group.tasks = group.tasks || [];
      if (by === 'deadline') {
        group.tasks.sort((a,b)=> {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline) - new Date(b.deadline);
        });
      } else if (by === 'name') {
        group.tasks.sort((a,b)=> a.name.localeCompare(b.name));
      } else if (by === 'status') {
        group.tasks.sort((a,b)=> {
          const pa = a.status === 'done' ? 1 : 0;
          const pb = b.status === 'done' ? 1 : 0;
          return pa - pb;
        });
      }
  await dataHandler.saveData();
  logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} sorted ${path} by ${by}`);
  return interaction.reply({ content: `Sorted tasks in "${path}" by ${by}.` });
    } catch (err) {
      return interaction.reply({ content: `Sort failed: ${err.message}`, flags: 64 });
    }
  }
};