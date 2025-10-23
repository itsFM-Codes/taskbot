const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays a list of all available commands and their usage.'),
  async execute({ interaction }) {
    if (interaction.user.id !== config.owner_id) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
    
    const { commands } = interaction.client;

    const helpEmbed = new EmbedBuilder()
      .setColor(0x5865F2) // Discord Blurple color
      .setTitle('Task Queue Bot Help')
      .setDescription('Here is a list of all my commands and how to use them. Required parameters are in `<>`, optional are in `[]`.');

    commands.forEach(command => {
      // Don't show the help command itself in the list
      if (command.data.name === 'help') return;

      // Format the parameters for the usage string
      const usage = command.data.options.map(opt => {
        return opt.required ? `<${opt.name}>` : `[${opt.name}]`;
      }).join(' ');

      helpEmbed.addFields({
        name: `/${command.data.name} ${usage}`,
        value: command.data.description,
      });
    });

    logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} viewed help`);
    return interaction.reply({ embeds: [helpEmbed], flags: 64 });
  }
};