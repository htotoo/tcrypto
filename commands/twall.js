const { Bot, Market } = require('../market.js')

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('twall')
		.setDescription('Show the Buy / sell walls.').addIntegerOption(option => option.setName('wallnum').setDescription('The size of the wall to trigger to. Defaults to 250 BTC')),
	async execute(interaction) {
		await interaction.deferReply();
		const wallnum = interaction.options.getInteger('wallnum') ?? 150;
		let ret = await Market.GetWalls(wallnum);
		ret = ret.slice(0, 1990);
		await interaction.editReply(ret);
	},
};