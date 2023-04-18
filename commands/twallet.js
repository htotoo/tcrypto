const { Bot, Market } = require('../market.js')

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('twallet')
		.setDescription('Query the wallet').addBooleanOption(option => option.setName('save').setDescription('Save as snapshot')),
	async execute(interaction) {
		await interaction.deferReply();
		const save = interaction.options.getBoolean('save') ?? false;
		let ret = await Market.GetWallet(interaction.user.id, true, save);
		ret = ret.slice(0, 1990);
		await interaction.editReply(ret);
	},
};