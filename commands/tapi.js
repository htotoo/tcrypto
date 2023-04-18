const { Bot, Market } = require('../market.js')

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tapi')
		.setDescription('Set Binance API key to user').addStringOption(option => option.setName('key').setDescription('Api key').setRequired(true)).addStringOption(option => option.setName('secret').setDescription('Api secret').setRequired(true)),
	async execute(interaction) {
		const key = interaction.options.getString('key') ?? "";
		const secret = interaction.options.getString('secret') ?? "";
		let ret = await Bot.AddApi(interaction.user.id, key, secret);
		ret = ret.slice(0, 1990);
		await interaction.reply(ret);
	},
};