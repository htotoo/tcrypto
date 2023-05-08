const { Bot, Market } = require('../market.js')

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tpair')
		.setDescription('Get info about a pair').addStringOption(option => option.setName('pair').setDescription('Trading pair, in format: ETHUSDT').setRequired(true)),
	async execute(interaction) {
		const pair = interaction.options.getString('pair') ?? "BTCUSDT";
		let ret = await Market.GetPairInfoTxt(pair);
		ret = ret.slice(0, 1990);
		await interaction.reply(ret);
	},
};