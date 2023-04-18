const { Bot, Market } = require('../market.js')

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tapidel')
		.setDescription('Deletes Binance API key from user'),
	async execute(interaction) {
		let ret = await Bot.DelApi(interaction.user.id);
		ret = ret.slice(0, 1990);
		await interaction.reply(ret);
	},
};