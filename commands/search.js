const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search groups and tasks by keyword')
    .addStringOption(o => o.setName('query').setDescription('Keyword').setRequired(true)),
  async execute({ interaction, dataHandler }) {
    const q = interaction.options.getString('query');
    try {
  const results = dataHandler.search(q);
      if (!results.length) return interaction.reply({ content: 'No matches found.' });
      const lines = results.map(r => `${r.type.toUpperCase()}: ${r.path}`);
      if (lines.join('\n').length > 1900) {
        const buffer = Buffer.from(lines.join('\n'), 'utf8');
        logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} searched for "${q}"`);
        await interaction.reply({ content: 'Result is long, sending as file.' });
        return interaction.followUp({ files: [{ attachment: buffer, name: 'search_results.txt' }] });
      } else {
        logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} searched for "${q}"`);
        return interaction.reply(lines.join('\n'));
      }
    } catch (err) {
      return interaction.reply({ content: `Search failed: ${err.message}`, flags: 64 });
    }
  }
};