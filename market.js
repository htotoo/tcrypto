const fs = require('fs');

const Binance = require('binance-api-node').default;
const { RESTv2 } = require('bfx-api-node-rest')
const bfxRest = new RESTv2({ transform: false })

class Market  {
	
	static CallBackPriceChangeReport = null;
	
	static exchangeInfo = {};
	static binance = Binance();
	static allPrices = {};
  	static lastCloses = {}; //for price alerts the 15m candle last closes
	static allTickers = {}; //for all ticker data storage, and symbol info query
	
	
    static toFixedTrunc(x, n) {
	  const v = (typeof x === 'string' ? x : x.toString()).split('.');
	  if (n <= 0) return v[0];
	  let f = v[1] || '';
	  if (f.length > n) return `${v[0]}.${f.substr(0,n)}`;
	  while (f.length < n) f += '0';
	  return `${v[0]}.${f}`;
	}
	
	static CalcDelta( numa, numb) 
    {
        if (numa == 0) return 0;
        let delta = (numa - numb ) /numa *100;
        return delta;
    }
	
	static async UpdateAllPrices()
	{
		try
		{
			Market.allPrices = await Market.binance.prices();
		}
		catch(e)
		{
			console.log("UpdateAllPrices error: " + e);
		}
	}

	
	static async GetExInfoAll()
	{
		Market.exchangeInfo = await Market.binance.exchangeInfo();    
		console.log("GetExInfoAll finished");
	}

	
	static async GetWallsInt (wl = 250)
	{
        let ret = {};
        try
        {
            let books = await bfxRest.orderBook("tBTCUSD", 'P2?len=100');
            for (let i in books)
            {
                let cb = books[i];
                let btcdb = cb[2];
                if (btcdb >= wl || ((-1*btcdb) >= wl))
                {
                    btcdb = Math.round(btcdb * 10) / 10;
                    ret[ cb[0] ]= btcdb;
                }
            }
        }
        catch(e){
			console.log(e);
		}
        return ret;
	}
	
	static async GetWalls(wl = 150)
    {
        let ret = "";
        try
        {
            let walls = await Market.GetWallsInt(wl);
            let firstneg = true;
            for (let i in walls)
            {
                let btcdb = walls[i];
                if (btcdb<0) 
                {
                    if (firstneg)
                    {
                        firstneg = false;
                        if (ret != "") ret = ret + "---\n";
                    }
                }
                btcdb = Math.round(btcdb * 10) / 10;
                ret = ret + i.toString() + " - " + btcdb.toString() + "BTC\n";
            }
        }
        catch(e){
			console.log(e);
		}
        if (ret == "") ret = "No walls detected."
        return ret;
    }
	
	static GetSymbolInUsdt (symbol, amount = 1)
    {
        symbol = symbol.toUpperCase();
        symbol = symbol.replace("/","");
        if (symbol == "USDC") return amount;
        if (symbol == "USDT") return amount;
        if (symbol == "BETH") return Market.GetSymbolInUsdt("ETH", amount);
        var s = symbol + "USDT";
        //check direct usdt
        if (s in Market.allPrices) 
        {
            var pp = parseFloat(Market.allPrices[s]);
            return pp * amount;
        }
        //check to btc
        s = symbol + "BTC";
        if (s in Market.allPrices && s != "BTCBTC") 
        {
            var pp = parseFloat(Market.allPrices[s]) * amount;
            return Market.GetSymbolInUsdt("BTC", pp);
        }
        s = symbol + "ETH";
        if (s in Market.allPrices && s != "ETHETH") 
        {
            var pp = parseFloat(Market.allPrices[s]) * amount;
            return Market.GetSymbolInUsdt("ETH", pp);
        }
        if (symbol.startsWith("LD")) return Market.GetSymbolInUsdt(symbol.substring(2), amount); //locked eg investment
        return 0;    
    }
	
	static async GetWalletRaw(userid, save = false)
	{
		var ret = {"old":[], "new":[]};
		try
		{
			if (userid == "") return ret;
			if (! Bot.apis.hasOwnProperty(userid)) return ret;
			const client2 = Binance( Bot.apis[userid].api );
			var newdataa = await client2.accountInfo();
			if (!newdataa) return ret;
			var newdata = newdataa["balances"];
			var olddata = [];
			var moddate = "-";
			if (fs.existsSync("./" + userid + ".wallet"))
			{
				var data = fs.readFileSync("./" + userid + ".wallet");
				olddata = JSON.parse(data);
				const stats = fs.statSync("./" + userid + ".wallet");
				moddate = stats.mtime;
			}
			if (save) 
			{
				fs.writeFileSync("./" + userid + ".wallet", JSON.stringify(newdata, null, 2), 'utf-8');
			}
			ret["old"] = olddata;
			ret["oldtime"] = moddate;
			ret["new"] = newdata;
			return ret;
		}
		catch(e)
		{
			console.log(e);
			return ret;
		}			
	}
	
	static async GetWallet(userid, needdelta = true, save = false)
	{
		if (userid == "") return "";
		if (! Bot.apis.hasOwnProperty(userid)) return "No API key presented";
		var ret = await Market.GetWalletRaw(userid, save);
		var newdata = ret["new"];
		var olddata = ret["old"];
		
		var str = "";
		var news = {};
		var olds = {};

		
		var sumnewusd = 0.0;
		var sumoldusd = 0.0;
		if (!newdata) return "Invalid API";
		newdata.forEach((element) => {
		  var sum =  parseFloat(element["free"]) +   parseFloat(element["locked"]);
		  if (sum <= 0) return;
		  var usd = Market.GetSymbolInUsdt(element["asset"], sum);
		  str = str + element["asset"] + ":  " + sum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 20 }) + "  (" + usd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 }) + "$)\n";
		  news[element["asset"]] = sum;
		  sumnewusd = sumnewusd + usd;
		});
		str = str + "\nSUM in USD: " + sumnewusd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 }) + "\n";
		if (needdelta)
		{
			str = str + "-----\nChange (since "+ret["oldtime"]+"):\n";
			olddata.forEach((element) => {
			  var sum =  parseFloat(element["free"]) +   parseFloat(element["locked"]);
			  if (sum <= 0) return;
			  olds[element["asset"]] = sum;
			  sumoldusd = sumoldusd + Market.GetSymbolInUsdt(element["asset"], sum);
			});
			for (const key in news) {
				if (!olds.hasOwnProperty(key))
				{
					str = str + key + ": " + news[key].toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 20 }) + "  ("+ Market.GetSymbolInUsdt(key, news[key]).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })+"$)\n";
				}
				else
				{
					if (news[key] - olds[key] == 0) continue;
					str = str + key + ": " + (news[key] - olds[key]).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 20 }) + "  ("+ Market.GetSymbolInUsdt(key, news[key] - olds[key]).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })+"$)\n";
				}
			}
			for (const key in olds) {
				if (!news.hasOwnProperty(key))
				{
					str = str + key + ": -" + olds[key].toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 20 }) + "  ("+ Market.GetSymbolInUsdt(key, -1*olds[key]).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })+"$)\n";
				}
			}			
			str = str + "\nChange in USD: " + (sumnewusd-sumoldusd).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
		}
		return str;
	}

	static GetCurrentPrice(symbol) 
    {
        let cprice = 0;
        if (symbol in Market.allPrices) cprice = parseFloat(Market.allPrices[symbol]);
        return cprice;
    }
	
	static GetExchangeInfoForSymbol(symbol)
    {
        for (let o in Market.exchangeInfo.symbols)
        {
            if (Market.exchangeInfo.symbols[o].symbol == symbol) return Market.exchangeInfo.symbols[o];
        }
        return null;
    }
    
	static GetTickSize(exinfo)
    {
        for (let i in exinfo.filters)
        {
            if (exinfo.filters[i].filterType == "PRICE_FILTER")
            {
                return exinfo.filters[i].tickSize;
            }
        }
        return 0.00000000001;
    }
        
    static roundTicks( price, tickSize )
    {
        const formatter = new Intl.NumberFormat( 'en-US', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 8 } );
        const precision = formatter.format( tickSize ).split( '.' )[1].length || 0;
        if ( typeof price === 'string' ) price = parseFloat( price );
        return price.toFixed( precision );
    }
    
    static FixPriceForSymbol (price, symbol)
    {
        if ( typeof price === 'string' ) price = parseFloat( price );
        let ex = Market.GetExchangeInfoForSymbol(symbol);
        let precision = ex.quotePrecision;
        let tickSize = Market.GetTickSize(ex);
        let ret = Market.roundTicks(price , tickSize);
        ret = toFixedTrunc(ret, precision);
        return ret;
    }
	
	static async CancelOrder(userid, orderid, symbol)
    {
		const client2 = Binance( Bot.apis[userid].api );
        console.info("Market.CancelOrder");
        try {
            await client2.cancelOrder({ symbol: symbol, orderId: orderid });
            return true;
        }
        catch (e) {console.log(e);}
        return false;
    }
    
    static async NewOrder(userid, symbol, side, type, quantity, price, stopPrice = null, newOrderId = null)
    {
		const client2 = Binance( Bot.apis[userid].api );
        console.info("Market.NewOrder");
        if (newOrderId == null) newOrderId = "TRADEBOT_" + Math.floor(new Date().getTime() / 10).toString();
        try
        {
            let neword = null;
            if (stopPrice != null) { neword = await client2.order({ symbol: symbol, side: side, type:type, quantity:quantity, price:price, stopPrice:stopPrice, newClientOrderId:newOrderId  });}
            else
                { neword = await client2.order({ symbol: symbol, side: side, type:type, quantity:quantity, price:price, newClientOrderId:newOrderId  });}
            return neword;
        }
        catch (e) { console.log(e);}
        return null;
    }
	
	static async ProcessAlerterCandle(candle)
	{
		//1.5% alert in 15 m
		if (candle["isFinal"] == false) return; //no closing
		var currClose = parseFloat(candle["close"]);
		var symboli = candle["symbol"]+ "@" + candle["interval"];
		if (! symboli in Market.lastCloses)
		{
			Market.lastCloses[symboli] = currClose;
			return; //first
		}
		const priceDiff = currClose - Market.lastCloses[symboli];
		const percentChange = (priceDiff / Market.lastCloses[symboli]) * 100;
		
		if (Math.abs(percentChange) >1.3)
		{
			try
			{
				var dir = "drop";
				if (currClose > Market.lastCloses[symboli]) dir = "raise";
				var msg = "Big price " + dir + " in " + symboli + "! ( " + percentChange.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + " % )";
				if (Market.CallBackPriceChangeReport != null) Market.CallBackPriceChangeReport(msg, candle["symbol"], candle["interval"],  percentChange.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }));
			}
			catch(e) { console.log(e);}
		}
		Market.lastCloses[symboli] = currClose; //override last
		console.log(symboli + "  changed: " + percentChange.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + " %");
		/*
		{
		  eventType: 'kline',
		  eventTime: 1682504696071,
		  symbol: 'ETHUSDT',
		  startTime: 1682504640000,
		  closeTime: 1682504699999,
		  firstTradeId: 1138488258,
		  lastTradeId: 1138490247,
		  open: '1898.23000000',
		  high: '1902.00000000',
		  low: '1898.23000000',
		  close: '1900.30000000',
		  volume: '1598.38220000',
		  trades: 1990,
		  interval: '1m',
		  isFinal: false,
		  quoteVolume: '3037234.35416800',
		  buyVolume: '920.31000000',
		  quoteBuyVolume: '1748724.34588300'
		}
		*/		
	}
	
	static GetPairInfo(pair)
	{ 
		 pair = pair.toUpperCase();
		 pair = pair.replace(/\s/g, '');
		 pair = pair.replace(/\//g, '');
		/* [ {
			eventType: '24hrTicker',
			eventTime: 1683534178817,
			symbol: 'FLMUSDT',
			priceChange: '-0.00710000',
			priceChangePercent: '-7.837',
			weightedAvg: '0.08618026',
			prevDayClose: '0.09060000',
			curDayClose: '0.08350000',
			closeTradeQuantity: '849.00000000',
			bestBid: '0.08340000',
			bestBidQnt: '8804.00000000',
			bestAsk: '0.08350000',
			bestAskQnt: '349.00000000',
			open: '0.09060000',
			high: '0.09090000',
			low: '0.08140000',
			volume: '5415735.00000000',
			volumeQuote: '466729.42710000',
			openTime: 1683447778817,
			closeTime: 1683534178817,
			firstTradeId: 26983574,
			lastTradeId: 26989162,
			totalTrades: 5589
		  }, ... ]*/
		for (let value of Market.allTickers)
		{
			if (value["symbol"] == pair) return value;			
		}
		return null;
	}
	
	static SpreadCalcPercent(bid_, ask_)
	{
		const bid = parseFloat(bid_);
		const ask = parseFloat(ask_);
		const spread = ((ask - bid) / bid) * 100;
		return spread.toFixed(2);
	}
	
	static async GetPairInfoTxt(pair)
	{
		let info = Market.GetPairInfo(pair);
		if (info == null) return "Unknown pair. Try the format: BTCUSDT";
		let ret = "**" + info["symbol"] + ":**\n";
		ret = ret + "Bid: " + info["bestBid"] + "\n";
		ret = ret + "Ask: " + info["bestAsk"] + "\n";
		ret = ret + "24hH: " + info["high"] + "\n";
		ret = ret + "24hL: " + info["low"] + "\n";
		ret = ret + "24h change: " + info["priceChangePercent"] + "\n";
		ret = ret + "Spread: " + Market.SpreadCalcPercent(info["bestBid"], info["bestAsk"]) + "%\n";
		ret = ret + "Volume: " + info["volume"] + "  -  " + info["volumeQuote"]+"\n";

		return ret;
	}
	
	static btccandlecanceltoken = null;
	static ethcandlecanceltoken = null;
	static btccandletimer = null;
	static ethcandletimer = null;
	
	static alltickertoken = null;
	static alltickertimer = null;
	
	static async ResetAllTickerTimer()
	{
		if (Market.alltickertimer != null)
		{
			clearTimeout(Market.alltickertimer);
		}
		Market.alltickertimer = setTimeout(() => {
		  Market.InitAllTicker();
		}, 30*1000);
	}
	
	
	static async ResetPriceAlertBTCTimer()
	{
		if (Market.btccandletimer != null)
		{
			clearTimeout(Market.btccandletimer);
		}
		Market.btccandletimer = setTimeout(() => {
		  Market.InitPriceAlertsBTC();
		}, 30*1000);
	}
	
	static async ResetPriceAlertETHTimer()
	{
		if (Market.ethcandletimer != null)
		{
			clearTimeout(Market.ethcandletimer);
		}
		Market.ethcandletimer = setTimeout(() => {
		  Market.InitPriceAlertsETH();
		}, 30*1000);
	}
	
	static async InitPriceAlertsBTC()
	{
		if (Market.btccandlecanceltoken != null)
		{
		  try
		  {
			  Market.btccandlecanceltoken();
		  }catch(e){}
		}
		Market.btccandlecanceltoken = Market.binance.ws.candles('BTCUSDT', '15m', candle => {
			Market.ResetPriceAlertBTCTimer();
			Market.ProcessAlerterCandle(candle);
		});
	}
	static async InitPriceAlertsETH()
	{
		if (Market.ethcandlecanceltoken != null)
		{
		  try
		  {
			  Market.ethcandlecanceltoken();
		  }catch(e){}
		}
		Market.ethcandlecanceltoken = Market.binance.ws.candles('ETHUSDT', '15m', candle => {
			Market.ResetPriceAlertETHTimer();
			Market.ProcessAlerterCandle(candle);
		});
	}
	
	static async InitAllTicker()
	{
		if (Market.alltickertoken != null)
		{
		  try
		  {
			  Market.alltickertoken();
		  }catch(e){}
		}
		Market.alltickertoken = Market.binance.ws.allTickers( ticker => {
			Market.ResetAllTickerTimer();
			//todo bot
			Market.allTickers = ticker;
		});
	}

	static async InitPriceAlerts()
	{
		Market.InitPriceAlertsBTC();
		Market.InitPriceAlertsETH();
		Market.InitAllTicker();
	}
	
};

class Bot
{
	static apis = {};
	static clients = {};
	static wscloses = {};
	
	static CallBackExecutionReport = null;
	
	static async Init() {
		if (!fs.existsSync('./apis.json'))
		{
			fs.writeFileSync('./apis.json', "{}", 'utf-8');
		}
		Bot.apis = require('./apis.json');
		await Market.GetExInfoAll();
		setInterval(Market.UpdateAllPrices, 1000*60); //minutes
        await Market.UpdateAllPrices();
		//init price alerters
		await Market.InitPriceAlerts();
		
		//init all ws clients
		Bot.ResetWsClients();
		
		console.log("Inited bot stuff");
	}
	
	static async ResetWsClients()
	{
		for (let key in Bot.apis)
		{
			Bot.DeInitWsClient(key);
			Bot.InitWsClient(key);
		}
		setTimeout(()=>{ Bot.ResetWsClients();}, 2*60*60*1000); //reset it 2 hourly
	}
	
	static async InitWsClient(userid)
	{
		try
		{
			Bot.clients[userid] = Binance( Bot.apis[userid]["api"] );
			Bot.wscloses[userid] = await Bot.clients[userid].ws.user(msg => {  Bot.CheckStreamedMsg(msg, userid); });      
		}
		catch(e) { console.log(e);}
	}
	
	static async DeInitWsClient(userid)
	{
		if (Bot.clients.hasOwnProperty(userid))
			{
				delete Bot.clients[userid];
			}
			if (Bot.wscloses.hasOwnProperty(userid))
			{
				try
				{
					Bot.wscloses[userid]();
				} catch (e){};
				delete Bot.wscloses[userid];
			}
	}
	
	
	static AddApi(userid, key, secret)
	{
		var newkey = true;
		if (Bot.apis.hasOwnProperty(userid)) newkey = false;
		Bot.apis[userid] = {};
		Bot.apis[userid]["enabled"] = true;
		Bot.apis[userid]["api"] = {};
		Bot.apis[userid]["api"]["apiKey"] = key;
		Bot.apis[userid]["api"]["apiSecret"] = secret;
		fs.writeFileSync('./apis.json', JSON.stringify(Bot.apis, null, 2), 'utf-8');
		if (!newkey)
		{
			Bot.DeInitWsClient(userid);
		}
		Bot.InitWsClient(userid);
		return (newkey)?"Added new API key":"Updated API key";
	}
	static DelApi(userid)
	{
		delete Bot.apis[userid];
		fs.writeFileSync('./apis.json', JSON.stringify(Bot.apis, null, 2), 'utf-8');
		Bot.DeInitWsClient(userid);
		return "API key deleted";
	}
		
	
	static CheckStreamedMsg(msg, uid)
	{
		try
		{
			console.log(msg);
			if (msg.eventType == "executionReport")
			{       
				//todo:
				//AUTO TRADE SCRIPT
				/*
				if (msg.orderStatus == "FILLED"|| msg.orderStatus == "CANCELED" || msg.orderStatus == "REJECTED" || msg.orderStatus == "EXPIRED")
				{
					//if (CallBackOrderGone != null && (uid in biClientStreamers)) CallBackOrderGone(uid, msg, biClientStreamers[uid]['cli']);
				}
				
			  //REFRESH ORDER STATUS
				if (msg.orderStatus == "FILLED" || msg.orderStatus == "CANCELED" || msg.orderStatus == "REJECTED" || msg.orderStatus == "EXPIRED")
				{
					//RemoveOrderFromList(uid, msg);
				}
				if (msg.orderStatus == "NEW")
				{
					//AddOrderToList(uid, msg);
				}
				*/
				
				if (Bot.CallBackExecutionReport != null)
					{
					//GENERATING STR Response
					if (msg.newClientOrderId.startsWith("TRADEBOT_")) return;
					if (msg.originalClientOrderId.startsWith("TRADEBOT_")) return;
					let stat = msg.orderStatus;
					if (msg.orderStatus == "NEW") stat = "New ord";
					if (msg.orderStatus == "CANCELED") stat = "Canceled";
					if (msg.orderStatus == "FILLED") stat = "Filled";
					if (msg.orderStatus == "REJECTED") stat = "Rejected";
					if (msg.orderStatus == "EXPIRED") stat = "Expired";
					var str = "";
					let cprice = Market.GetCurrentPrice(msg.symbol);
					if (msg.price == 0 && msg.orderType == "MARKET") msg.price = msg.priceLastTrade;
					let cdelta = Market.CalcDelta(cprice, parseFloat(msg.price));
					str += "```"+stat+" ("+msg.orderId.toString()+"): " + msg.symbol + ". " +  msg.side  + "  p: " + msg.price + "   qt: " + msg.quantity + " /  "  + msg.totalTradeQuantity + ". Current delta: " + cdelta.toString() + "%.  Type: "+msg.orderType+"\n";
					if (msg.orderStatus == "NEW")
					{
						if (msg.side =="BUY")
							{
								str += "Sell@ " + (msg.price * 1.012).toString() + " for 1%. Sell@ " + (msg.price * 1.002).toString() + " for 0%";
							}
							else
							{
								str += "Buy@ " + (msg.price * 0.988).toString() + " for 1%. Buy@ " + (msg.price * 0.998).toString() + " for 0%";
							}
					}
					str += "```";
					str = "<@" + uid + ">\n" + str;
					Bot.CallBackExecutionReport(str);
				}				
			}
		}
		catch(e){}
	}
}

module.exports = {
  Market: Market,
  Bot: Bot
};

