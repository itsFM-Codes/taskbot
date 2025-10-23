const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');

// Helper function to format date nicely
function formatDate(dateStr) {
    if (!dateStr) return '(no deadline)';
    const d = new Date(dateStr);
    if (isNaN(d)) return '(invalid date)';
    return d.toISOString().replace('T', ' ').substring(0, 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('List all groups and tasks.')
        .addStringOption(option =>
            option.setName('sort_by')
                .setDescription('Sort by "deadline" or "name"')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('filter_status')
                .setDescription('Filter tasks by status (all, pending, completed)')
                .setRequired(false)),

    async execute({ interaction, dataHandler }) {
        try {
            if (!interaction || !interaction.options) {
                console.error('Invalid interaction object passed to list command');
                return await interaction?.reply({
                    content: 'Something went wrong while handling this command.',
                    flags: 64
                });
            }

            const sortBy = interaction.options.getString('sort_by') || 'name';
            const filterStatus = interaction.options.getString('filter_status') || 'all';

            const data = dataHandler.getRawData();
            const outputLines = [];

            function listGroup(group, indent = '') {
                outputLines.push(`${indent}${group.name}`);

                if (group.tasks && group.tasks.length > 0) {
                    let tasks = [...group.tasks];

                    if (filterStatus !== 'all') {
                        tasks = tasks.filter(t => t.status === filterStatus);
                    }

                    if (sortBy === 'deadline') {
                        tasks.sort((a, b) => {
                            const da = new Date(a.deadline || 0);
                            const db = new Date(b.deadline || 0);
                            return da - db;
                        });
                    } else {
                        tasks.sort((a, b) => a.name.localeCompare(b.name));
                    }

                    for (const task of tasks) {
                        const status = task.status?.toUpperCase() || 'PENDING';
                        outputLines.push(
                            `${indent}  [${status}] ${task.name} - Due ${formatDate(task.deadline)}`
                        );
                    }
                }

                if (group.groups && group.groups.length > 0) {
                    for (const sub of group.groups) {
                        listGroup(sub, indent + '  ');
                    }
                }
            }

            if (data.groups && data.groups.length > 0) {
                for (const g of data.groups) {
                    listGroup(g);
                }
            }

            const output =
                outputLines.length > 0
                    ? outputLines.join('\n')
                    : 'No groups or tasks found.';

            logger.log({ id: interaction.user.id, username: interaction.user.username }, `${interaction.user.username} listed groups/tasks`);
            await interaction.reply({
                content: `\`\`\`\n${output}\n\`\`\``,
                flags: 64
            });
        } catch (err) {
            console.error('Error in /list command:', err);
            try {
                await interaction.reply({
                    content: 'An error occurred while listing tasks.',
                    flags: 64
                });
            } catch {
                // silently ignore follow-up reply errors
            }
        }
    }
};