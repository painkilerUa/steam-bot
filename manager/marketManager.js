const request = require('../request');
const csvParser = require('../csvParser');
const TradeOperationLoger = require('./tradeOperationLoger');
const PurchaseManager = require('./purchasingManager');
const MarketWebSocketClient = require('../server').MarketWebSocketClient;
const config = require('../config');
const EMarketOfferState = require('../Enums/EMarketOfferState');


class MarketManager {
    constructor(bot) {
        this.trader = bot;
        this.tradeOperationLoger = new TradeOperationLoger()
        this.purchaseManager = new PurchaseManager();
        this.purchaseManager.on('haseItemsToBuy', this._haseItemsToBuyHandler.bind(this));
        this._restorTradeLogs();
        this._autoCheckingTrades();
        this._initSocketMsgHandling();
        this.traderFrozen = config.traderFrozen;
    }


    /**
     * Configurat web socket message handling
     *
     * @param {any} ws
     *
     * @memberOf Manager
     */
    _initSocketMsgHandling() {
        let marketWebSocketClient = new MarketWebSocketClient({ showPongMsg: true });
        this.trader.getWSAuth()
            .then((auth) => {
                marketWebSocketClient.connect(auth.wsAuth);

                marketWebSocketClient.onOfferStatusChanged((msg) => {
                    if (msg.type == 'itemstatus_cs') {
                        let notyData = JSON.parse(msg.data);
                        if (notyData.status == EMarketOfferState.ReadyToGetFromBot) {
                            this.trader
                                .itemRequest(notyData.bid)
                                .then((data) => {
                                    console.log('Item request after ws message');
                                    console.log(data);
                                });
                        }
                        if (notyData.status == EMarketOfferState.ItemTransferedToYou) {
                            console.log('WS message status 5 (ItemTransferedToYou)');
                            let trade = this.tradeOperationLoger.close(notyData.id);
                            let msgToSystem = {
                                isBuyProcess: 0,
                                isDone: 1,
                                dateBuyProcessGmt: (new Date()).toGMTString(),
                                buyId: trade.marketId,
                                id: trade.id || null,
                                classid: trade.classId,
                                instanceid: trade.instanceId,
                                price: trade.price,
                                botSteamId: this.trader.steamId
                            }
                            this.sendToSystemOfferChangedStatusMsg(msgToSystem);
                        }
                    }
                });
            }).catch((error) => {
                console.error('getWSAuth', error);
            });
    }

    /**
     *
     *
     * @param {Array} itemsToBuy
     *
     * @memberOf Manager
     */
    _haseItemsToBuyHandler(itemsToBuy) {
        itemsToBuy.forEach((serchigItem, index) => {
            setTimeout(() => {
                this.searchItemByName(serchigItem.marketHashName)
                    .then((res) => {
                        if (!res.success || !res.list.length) {
                            console.error('Searching item on market error', res);
                            return;
                        }

                        let buyingItem = res.list.find((marketItem) => {
                            return marketItem.price <= parseInt((serchigItem.adminMaxPrice || serchigItem.minPrice));
                        });

                        if (!buyingItem) {
                            console.log('Item is not found on market', serchigItem);
                            return;
                        }

                        console.log('Searched item', serchigItem)
                        console.log('Items is on market', buyingItem)
                        if (process.argv.indexOf('debug') != -1) {
                            return;
                        }
                        this.buy({
                                id: serchigItem.id,
                                caseItemId: serchigItem.caseItemId,
                                price: buyingItem.price,
                                classId: buyingItem.i_classid,
                                instanceId: buyingItem.i_instanceid
                            })
                            .then((resp) => {
                                console.log('Item bougth on market and waiting transfering', buyingItem);
                                let msgToSystem = {
                                    isBuyProcess: 1,
                                    isDone: 0,
                                    dateBuyProcessGmt: (new Date()).toGMTString(),
                                    buyId: resp.id,
                                    caseItemId: serchigItem.caseItemId,
                                    id: serchigItem.id,
                                    classid: buyingItem.i_classid,
                                    instanceid: buyingItem.i_instanceid,
                                    price: buyingItem.price,
                                    botSteamId: this.trader.steamId
                                }
                                this.sendToSystemOfferChangedStatusMsg(msgToSystem);
                            })
                            .catch((error) => {
                                console.error(error);
                            });
                    })
                    .catch((error) => {
                        console.error('Searching item on market request error', error);
                    })
            }, 1000 * index);
        });
    }

    /**
     * Return items from market
     *
     * @param {any} lastItemsCount
     * @returns {Promise}
     *
     * @memberOf Manager
     */
    loadItemsFromMarket(lastItemsCount, time, price) {
        return request.getRequestToMarket('/itemdb/current_570.json')
            .then((data) => {
                let dataFileNmae = data.db;
                return dataFileNmae;
            })
            .then((fileName) => {
                console.log('Marcket data file name', fileName);
                return request.getRequestToMarket('/itemdb/' + fileName);
            })
            .then((data) => {
                let rows = data.split('\n');
                let json = csvParser.toJson(data);
                if (time || price) {
                    json = json.filter((item) => {
                        if (time && !price) {
                            return item.c_price_updated > time;
                        }
                        if (!time && price) {
                            return item.c_price <= price;
                        }
                        return item.c_price_updated >= time && item.c_price <= price;
                    });
                }
                if (lastItemsCount) {
                    return json.slice(0, lastItemsCount);
                }
                return json
            });
    }

    /**
     * Serching item on market by item name.
     *
     * @param {any} itemName
     * @returns {Promise}
     * @memberOf Manager
     */
    searchItemByName(itemName) {
        return this.trader.searchItemByName(itemName);
    }

    /**
     * Return items in bot-trader.
     *
     * @returns
     *
     * @memberOf Manager
     */
    getItemsInSystem() {
        return this.trader.loadAllInventoryInfo(570);
    }

    /**
     * Returns QuickItems list from market
     *
     * @param {any} price
     * @returns
     *
     * @memberOf Manager
     */
    getQuickItems(price) {
        return this.trader.getQuickItems(price);
    }

    /**
     * Make quick buying on market
     *
     * @param {any} purchaceInfo
     * @returns
     *
     * @memberOf Manager
     */
    quickBuy(purchaceInfo) {
        return this.trader
            .quickBuy(purchaceInfo.uiId)
            .then((data) => {
                if (data.success) {
                    return purchaceInfo;
                }
                return data;
            })
            .then((tradesInfo) => {
                if (!tradesInfo.success) {
                    return this.getTrades()
                        .then((items) => {
                            return items.reduce((accumulator, currentValue) => {
                                let isMatch = currentValue.ui_status == EMarketOfferState.ReadyToGetFromBot &&
                                    currentValue.i_classid == purchaceInfo.classId &&
                                    currentValue.i_instanceid == purchaceInfo.instanceId;
                                if (isMatch && !accumulator) {
                                    return currentValue.ui_bid;
                                }
                            }, '');
                        }).then((botId) => {
                            return this.itemRequest(botId);
                        });
                }
                return tradesInfo;
            });
    }

    /**
     * Returns bot trads
     *
     * @param {string} tradeId
     *
     * @memberOf Manager
     */
    getTrade(tradeId) {
        this.getTrades().then((tradsInfo) => {
            return tradsInfo.reduce((prev, curent) => {
                if (!prev.ui_id && curent.ui_id == tradeId) {
                    return curent;
                }
            }, {});
        });
    }

    /**
     * Returns bot trads
     *
     * @returns
     *
     * @memberOf Manager
     */
    getTrades() {
        return this.trader.getTrades();
    }

    /**
     * Request for sending item offer from market
     *
     * @param {any} botId
     * @returns
     *
     * @memberOf Manager
     */
    itemRequest(botId) {
        return this.trader.itemRequest(botId);
    }

    /**
     * Buy User item on the market
     *
     * @param {Object} itemInfo
     * @returns {Promise}
     *
     * @memberOf Manager
     */
    buy(itemInfo) {
        if (this.traderFrozen) {
            return Promise.reject(Error('Trader configuration: trading status is frozen. For unfreeze status, change configurations'));
        }
        return this.trader
            .buy(itemInfo)
            .then((tradeStatus) => {
                if (tradeStatus.result !== 'ok') {
                    return Promise.reject(tradeStatus);
                }
                // return this.getTrade(tradeStatus.id);
                itemInfo.caseItemId = itemInfo.caseItemId;
                itemInfo.id = itemInfo.id;
                itemInfo.marketId = tradeStatus.id;
                itemInfo.isBuyProcess = 1;
                itemInfo.status = 'is buyed';
                this.logTrade(itemInfo);
                return tradeStatus;
            })
            .then((tradeInfo) => {
                return tradeInfo //this.itemRequest(tradeInfo.ui_bid);
            });
    }

    /**
     * Send request to market for creating offers(send to our bot) for all our items
     *
     * @returns {Promise}
     *
     * @memberOf Manager
     */
    requestAllBoughtItems() {
        return this.getTrades()
            .then((tradeItemsInfo) => {
                if (!Array.isArray(tradeItemsInfo)) {
                    throw new TypeError('tradeItemsInfo is not a Array');
                }
                let promises = [];
                let arr = tradeItemsInfo
                    .reduce((accumulator, currentValue) => {
                        if (EMarketOfferState.ReadyToGetFromBot == currentValue.ui_status && accumulator.indexOf(currentValue.ui_bid) == -1) {
                            accumulator.push(currentValue.ui_bid);
                        }
                        return accumulator;
                    }, []);
                arr.forEach((botId) => {
                    promises.push(this.itemRequest(botId));
                });
                return Promise.all(promises);
            });
    }

    /**
     * Checks trades by time interval
     *
     *
     * @memberOf Manager
     */
    _autoCheckingTrades() {
        if (process.argv.indexOf('debug') != -1 || this._autoCheckingTradesInterval) {
            return;
        }
        this._autoCheckingTradesInterval = setInterval(() => {
            console.log(`Auto Checking Trades inteval is: ${config.autoCheckingBoughtItemsInterval}`);
            this.requestAllBoughtItems()
                .then((trades) => {
                    console.log(`trades ${ trades.length }`);
                })
                .catch((error) => {
                    console.error('Auto Checking Trades', error);
                });
        }, config.autoCheckingBoughtItemsInterval);
    }

    /**
     * Restores trade log before start
     *
     *
     * @memberOf Manager
     */
    _restorTradeLogs() {
        this.getTrades()
            .then((items) => {
                items.forEach((item) => {
                    this.logTrade({
                        marketId: item.ui_id,
                        price: item.ui_price * 100,
                        classId: item.i_classid,
                        instanceId: item.i_instanceid
                    });
                });
            }).catch((error) => {
                console.error('_restorTradeLogs', error)
            });
    }

    /**
     * Send trade item state to system
     *
     * @param {Object} offerState
     * @returns {Promise}
     *
     * @memberOf Manager
     */
    sendToSystemOfferChangedStatusMsg(offerState) {
        console.log('sendToSystemOfferChangedStatusMsg', offerState);
        return request.postToSystem(JSON.stringify(offerState)).then((data) => {
            console.log('sendToSystemOfferChangedStatusMsg response');
            console.log(data);
            return data;
        });
    }

    logTrade(trade) {
        this.tradeOperationLoger.add(trade);
    }

}

module.exports = MarketManager;