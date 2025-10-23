const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');
const dayjs = require('dayjs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addtask')
    .setDescription('Add a task to a group')
    .addStringOption(o => o.setName('name').setDescription('Task name').setRequired(true))
    .addStringOption(o => o.setName('group').setDescription('Group path (e.g. work/Projects)').setRequired(true))
    .addStringOption(o => o.setName('deadline').setDescription('Deadline (e.g., "2025-12-31 18:00"). Flexible formats are accepted.'))
    .addStringOption(o => o.setName('description').setDescription('Optional description'))
    .addIntegerOption(o => o.setName('reminderhours').setDescription('Optional reminder hours for this task (overrides group/global)')),
  async execute({ interaction, dataHandler }) {
    const name = interaction.options.getString('name');
    const group = interaction.options.getString('group');
    const deadlineRaw = interaction.options.getString('deadline');
    const description = interaction.options.getString('description');
    const reminderHours = interaction.options.getInteger('reminderhours');

    const groupSegments = group.split('/').filter(s => s.trim());
    // parse deadline
    let deadlineIso = null;
    if (deadlineRaw) {
      const d = dayjs(deadlineRaw);
      if (!d.isValid()) {
        return interaction.reply({ content: 'Invalid deadline format. Use a clear format like YYYY-MM-DD HH:mm.', flags: 64 });
      }
      deadlineIso = d.toISOString();
    }

    try {
      const task = {
        name,
        description: description || '',
        deadline: deadlineIso,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      if (typeof reminderHours === 'number') task.reminderHours = reminderHours;
        dataHandler.addTaskToGroup(groupSegments, task);
        await dataHandler.saveData();
        const msg = `${interaction.user.username} added task "${name}" to ${groupSegments.join('/')}`;
        logger.log({ id: interaction.user.id, username: interaction.user.username }, msg);
        return interaction.reply({ content: `Task "${name}" added to "${groupSegments.join('/')}".` });
    } catch (err) {
      return interaction.reply({ content: `Failed to add task: ${err.message}`, flags: 64 });
    }
  }
};