const { Bot, Market } = require('../market.js')
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tsafeexit')
		.setDescription('Show where to exit from a trade without a lose.')
		.addNumberOption(option => option.setName('price').setDescription('Wher you bought or sold the asset').setRequired(true)),
	async execute(interaction) {
		const price = interaction.options.getNumber('price') ?? -1;
		let str = "";
		str += "Sell@ " + (price * 1.012).toString() + " for 1%. @ " + (price * 1.002).toString() + " for 0%\n";
		str += "Buy@ " + (price * 0.988).toString() + " for 1%. @ " + (price * 0.998).toString() + " for 0%";
		str = str.slice(0, 1990);
		await interaction.reply(str);
	},
};