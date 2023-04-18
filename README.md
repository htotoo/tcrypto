# tcrypto
A Discord bot for Binance users.


Simply clone it, install npm packages (npm install bfx-api-node-rest && npm install binance-api-node && npm install discord.js).

Edit the config.json, where discordToken is the token of your Discord bot. discordClientId is the user id of your bot. notifyChannel is the channel's id, where you want to get the execution reports.


Functions (for now):  
/tapi  - Any user can add their Binance API key (read only is good too)  
/tapidel - Users can delete their API keys.  
/tcalc  - Calculates you the minimum sell or buy price for az initial price with a required gain percentage.  
/tsafeexit - Same as above, but for 0% (including trading fees), and for 1%.  
/twall - Queries the BTC/USD orderbook and check if there is a sell/buy wall.  
/twallet - Queries the user's wallet, prints it's content. If the SAVE parameter is true, creates a snapshot. So on the next check, user can see the diff.  

