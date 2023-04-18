
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tmem')
		.setDescription('Shows the memory usage of the bot.'),
	async execute(interaction) {
		await interaction.reply(JSON. stringify(process.memoryUsage()));
	},
};