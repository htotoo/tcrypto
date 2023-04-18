const { Bot, Market } = require('../market.js')
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tcalc')
		.setDescription('Calculates the requires percentages')
		.addNumberOption(option => option.setName('price').setDescription('Wher you bought or sold the asset').setRequired(true))
		.addNumberOption(option => option.setName('percent').setDescription('How many percentage would like to win').setRequired(true)),
	async execute(interaction) {
		const price = interaction.options.getNumber('price') ?? 1;
		const percent = interaction.options.getNumber('percent') ?? 1;
		let str = "";
		str += "Sell@ " +  ( price * (1.002 + (percent / 100) )).toString() + " for " + percent.toString()+ "%\n";
		str += "Buy@ " +  (price * (0.998 - (percent /100) )).toString() + " for " + percent.toString()+ "%";
		str = str.slice(0, 1990);
		await interaction.reply(str);
	},
};