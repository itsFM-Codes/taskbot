const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move a group or task to another group')
    .addStringOption(o => o.setName('from').setDescription('Source path').setRequired(true))
    .addStringOption(o => o.setName('to').setDescription('Destination group path (omit for top-level)').setRequired(true)),
  async execute({ interaction, dataHandler }) {
    const from = interaction.options.getString('from');
    const to = interaction.options.getString('to');
    const fromSegs = from.split('/').filter(s => s.trim());
    const toSegs = to.split('/').filter(s => s.trim());
    try {
  const r = dataHandler.movePath(fromSegs, toSegs);
  await dataHandler.saveData();
  logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} moved ${from} -> ${toSegs.join('/') || 'top-level'}`);
  return interaction.reply({ content: `Moved ${r.type} from "${from}" to "${toSegs.join('/') || 'top-level'}".` });
    } catch (err) {
      return interaction.reply({ content: `Failed to move: ${err.message}`, flags: 64 });
    }
  }
};