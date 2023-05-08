
const { Bot, Market } = require('./market.js')
const { Specials } = require('./special.js')
const { Client, Events, Collection, GatewayIntentBits, SlashCommandBuilder, ActivityType, REST, Routes } = require( 'discord.js');

//         CONFIG PART

	const Config = require('./config.json');
	if (!Config || !("discordToken" in Config) || !("discordClientId" in Config) || !("notifyChannel" in Config) || Config["discordToken"] == ""  || Config["discordClientId"] == "" )
	{
		console.log ("There is no valid config.json edit it please.");
		process.exit(-1);
	}	
	//upgrade from prev Config
	if (!("priceAlertsChannel" in Config))
	{
		Config["priceAlertsChannel"] = Config["notifyChannel"]; //if you don't want this, set it to ""
	}	




const discordClient = new Client({ intents:[ GatewayIntentBits.DirectMessages, GatewayIntentBits.Guilds,GatewayIntentBits.GuildBans,   GatewayIntentBits.GuildMessages,  GatewayIntentBits.MessageContent] });
discordClient.commands = new Collection();
const commands = [];


function BotMsg(msg)
{
	try
	{
		discordClient.user.setActivity(msg, { type: ActivityType.Watching });
    }
	catch (e) { console.log(e); }
}

function BotSendMsg(msg, channel = Config["notifyChannel"])
{
    if (msg == "") return;
    if (channel == "") return;
	try
	{
		const chan = discordClient.channels.cache.get(channel);
		chan.send(msg);
	}
	catch (e) { console.log(e); }
}

function BotLoadCommand(fn)
{
	const command = require("./commands/"+fn + ".js");
	if ('data' in command && 'execute' in command) {
		discordClient.commands.set(command.data.name, command);
		commands.push(command.data.toJSON());
	}
}

function BotRegisterCommands()
{
	const rest = new REST().setToken(Config["discordToken"]);
	(async () => {
		try {
			console.log(`Started refreshing ${discordClient.commands.length} application (/) commands.`);
			const data = await rest.put(
				Routes.applicationCommands(Config["discordClientId"]),
				{ body: commands },
			);
			console.log(`Successfully reloaded ${data.length} application (/) commands.`);
		} catch (error) {
			console.error(error);
		}
	})();
}


//called when a binance ws client got an execution report event
function CallBackExecutionReport(msg)
{
    BotSendMsg(msg);
}

function CallBackPriceChangeReport(msg, symbol, interval, change)
{
    BotSendMsg(msg, Config["priceAlertsChannel"]);
	Specials.CallBackPriceChangeReport(msg, symbol, interval, change);
	
}


discordClient.once(Events.ClientReady, async c => {
	console.log(`Logged in as ${discordClient.user.tag}!`); 
    BotMsg('Starting up...');
	
	await Bot.Init();
	Bot.CallBackExecutionReport = CallBackExecutionReport;
	Market.CallBackPriceChangeReport = CallBackPriceChangeReport;
    BotMsg("Watching..");
});



discordClient.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}
	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

//not in use yet.
discordClient.on("messageCreate", (message) => {
	/*if (message.content === "hello") {
		message.reply("Hey!")
	} */
});

async function Init()
{    
	BotLoadCommand("tping");
	BotLoadCommand("twall");
	BotLoadCommand("tmem");
	BotLoadCommand("tsafeexit");
	BotLoadCommand("tcalc");
	BotLoadCommand("tapi");
	BotLoadCommand("tapidel");
	BotLoadCommand("twallet");
	BotLoadCommand("tpair");
	BotRegisterCommands();
    discordClient.login(Config["discordToken"]);
}

Init();