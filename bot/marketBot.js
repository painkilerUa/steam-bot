const request = require('../request');
const socket = require('uws');
const SteamBot = require('./steamBot');
const config = require('../config');

class MarketBot extends SteamBot {
    constructor(botConfig) {
        super(botConfig);
        this.marketApiKey = botConfig.marketApiKey;
    }

    get userToken() {
        return this.botConfig.link;
    }

    /**
     * Sending ping to market once at 3 minutes 
     * For online status at market
     * https://market.dota2.net/api/PingPong/?key=[your_secret_key]
     * 
     * 
     * @memberOf MarketBot
     */
    pingPong() {
        throw Error('not implemented');
    }

    /**
     * Immediately stops all sales
     * https://market.dota2.net/api/GoOffline/?key=[your_secret_key]
     * 
     * 
     * @memberOf MarketBot
     */
    goOffline() {
        throw Error('not implemented');
    }

    /**
     * Set trade link
     * https://market.dota2.net/api/SetToken/[token]/?key=[your_secret_key]
     * 
     * @param {string} tradeLink
     * 
     * @memberOf MarketBot
     */
    setToken(tradeLink) {
        throw Error('not implemented');
    }

    /**
     * Return trade link
     * https://market.dota2.net/api/GETToken/?key=[your_secret_key]
     * 
     * 
     * @memberOf MarketBot
     */
    getToken() {
        throw Error('not implemented');
    }

    /**
     * 
     * 
     * @param {String} markeHashName
     * 
     * @memberOf MarketBot
     */
    findItemsOnMarket(markeHashName) {
        return request.postRequestToMarket('/api/MassSearchItemByName/?key=' + this.marketApiKey, 'list[0]:' + markeHashName);
    }

    /**
     * https://market.dota2.net/api/SearchItemByName/[market_hash_name]/?key=[your_secret_key]
     * 
     * @param {string} markeHashName
     * @returns {Promise}
     * 
     * @memberOf MarketBot
     */
    searchItemByName(markeHashName) {
        return this._getRequset('/api/SearchItemByName/' + markeHashName);
    }

    /**
     * Get balance
     * https://market.dota2.net/api/GetMoney/?key=[your_secret_key]
     * 
     * 
     * @memberOf MarketBot
     */
    getMoney() {
        return this._getRequset('/api/GetMoney').then((data) => {
            data.steaId = this.steamId;
            return data;
        });
    }

    /**
     * Return Quick Items list for market
     * 
     *
     * 
     * @memberOf MarketBot
     */
    getQuickItems(price) {
        return this._getRequset('/api/QuickItems').then((res) => {
            if (!res.success) {
                return res;
            }
            if (price) {
                return res.items.filter((item) => {
                    return price >= item.l_paid;
                });
            }
            return res.items;
        });
    }

    /**
     * Returns list of items ready for transfer or receiving
     * https://market.dota2.net/api/Trades/?key=[your_secret_key]
     * 
     * @returns
     * 
     * @memberOf MarketBot
     */
    getTrades() {
        return this._getRequset('/api/Trades');
    }

    /**
     * С помощью этого методы, Вы можете запросить передачу предмета который был куплен у Вас или куплен Вами. 
     * Вам будет отправлен оффлайн трейдоффер в Steam, который необходимо принять в течении 2 минут. В одну операцию может попасть максимум 20 предметов.
     * https://market.dota2.net/api/ItemRequest/out/[botid]/?key=[your_secret_key]
     * 
     * @param {any} botid
     * @returns
     * 
     * @memberOf MarketBot
     */
    itemRequest(botId) {
        return this._getRequset('/api/ItemRequest/out/' + botId);
    }

    /**
     * Do quick buy on the market
     * 
     * @param {String} uiId
     * @returns
     * 
     * @memberOf MarketBot
     */
    quickBuy(uiId) {
        // get guick items
        return this._getRequset('/api/QuickBuy/' + uiId);
    }

    /**
     * Buy item manually
     * https://market.dota2.net/api/Buy/[classid]_[instanceid]/[price]/[hash]/?key=[your_secret_key]
     * response {"result": "ok", "id": "136256960"} 
     * - result = ok — предмет был успешно куплен
     * - id - ID предмета (операции) в нашей системе, так-же можно увидеть в Trades
     * 
     * @param {any} buyItemInfo
     * @returns {Promise}
     * 
     * @memberOf MarketBot
     */
    buy(buyItemInfo) {
        return this._getRequset('/api/Buy/' + buyItemInfo.classId + '_' + buyItemInfo.instanceId + '/' + buyItemInfo.price + '/' + (buyItemInfo.hash ? buyItemInfo.hash : ''));
    }

    /**
     * GET requset to market.dot2.net API
     * 
     * @param {string} path
     * @returns {Promise}
     * 
     * @memberOf MarketBot
     */
    _getRequset(path) {
        return request.getRequestToMarket(path + '/?key=' + this.marketApiKey);
    }

    _postRequest(path, params) {
        return request.postRequestToMarket(path + '/?key=' + this.marketApiKey, params);
    }

    /**
     * Gets list of steam app items
     * 
     * @param {number} appId
     * @returns
     * 
     * @memberOf MarketBot
     */
    loadAllInventoryInfo(appId) {
        let contextid = this.getContext(appId);
        return new Promise((resolve, reject) => {
            this.manager.loadInventory(appId, contextid, true, (err, inventory, currencies) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!inventory) {
                    reject("Items list is empty");
                    return;
                }
                let prettifyInfo = inventory.map((itemInfo) => {
                    return {
                        "id": itemInfo.id,
                        "classid": itemInfo.classid,
                        "descriptions": itemInfo.descriptions,
                        "marketable": itemInfo.marketable,
                        "icon_url": itemInfo.icon_url,
                        "instanceid": itemInfo.instanceid,
                        "amount": itemInfo.amount,
                        "pos": itemInfo.pos,
                        "assetid": itemInfo.assetid,
                        "contextid": itemInfo.contextid,
                        "appId": itemInfo.appid
                    };
                });
                resolve(prettifyInfo);
            });
        });
    }

    /**
     * Return WS autt key
     * https://market.dota2.net/api/UpdateInventory/?key=[your_secret_key]
     * 
     * @returns
     * 
     * @memberOf MarketBot
     */
    getWSAuth() {
        return this._getRequset('/api/GetWSAuth')
    }


    /**
     * Return items count 
     * 
     * @param {string} [appId='570'] 
     * @returns 
     * 
     * @memberOf MarketBot
     */
    getInventoryCount(appId = '570') {
        let contextid = this.getContext(appId);
        return new Promise((resolve, reject) => {
            this.manager.loadInventory(appId, contextid, true, (err, inventory, currencies) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(inventory.length);
            });
        })
    }

    connectToWSWithDelay(delay) {
        this.connectionDelay = delay;
        setTimeout(() => {
            this.connectToWS();
        }, delay);
    }

    /**
     * Establish connection to manager websocket
     * 
     * 
     * @memberOf MarketBot
     */
    connectToWS() {
        this.ws = new socket(config.managerWebSocket);

        this.ws.on('error', (error) => {
            console.log('Manager WS: Connection error', error);
            this.restoreWsConnetion();
        });

        this.ws.on('close', (code, message) => {
            console.log(`Manager WS: Manager server disconnection : ${code}, ${message}`);
            this.restoreWsConnetion();
        });

        this.ws.on('open', (data) => {
            // clearInterval(this.connectionIntervalIndex);
            this.loadAllInventoryInfo(570).then((items) => {
                let msg = {
                    name: 'bot.auth',
                    params: {
                        steam_id: this.steamId,
                        restrictions: this.limitations ? {
                            limited: this.limitations.limited,
                            locked: this.limitations.locked,
                            communityBanned: this.limitations.communityBanned
                        } : {
                            limited: false,
                            locked: false,
                            communityBanned: false
                        },
                        inventory_count: items.length
                    }
                };
                this.ws.send(JSON.stringify(msg), () => {
                    console.log('Manager WS: sended auth to manager websocket server', msg);
                });
            }).catch(function(err) {
                console.error('Manager WS: loadAllInventoryInfo', err);
            });
        });

        this.ws.on('message', (msg) => {
            try {
                msg = JSON.parse(msg);
            } catch (error) {
                console.error('message JSON parsing error')
            }

            if (msg.name == 'trade.new') {
                if (!msg.params) {
                    throw Error('"trade.new" message "params" property is "undefined" in transfer message');
                }
                console.log('Manager WS: massage form server', msg)
                this.emit('wsMessage', msg.params);
            }
        });
    }

    restoreWsConnetion() {
        console.log(`Manager WS: bot restore connection`);
        setTimeout(() => {
            this.connectToWS();
        }, (60 * 1000 + this.connectionDelay));
    }

    /**
     * Send message to manager on websocket
     * 
     * @param {any} msg 
     * 
     * @memberOf MarketBot
     */
    wsSend(msg) {
        if (this.ws) {
            this.ws.send(JSON.stringify(msg), () => {
                console.log('Manager WS: sended', msg);
            });
        }
    }
}

module.exports = MarketBot;