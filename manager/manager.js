const ETradeOfferState = require('steam-tradeoffer-manager').ETradeOfferState;
const EMarketOfferState = require('../Enums/EMarketOfferState');

const MarketManager = require('./marketManager');
const TransferManager = require('./transferManager');

const Bot = require('../bot');
const config = require('../config');
const request = require('../request');


/**
 * This class managed marcket bots
 * Processing commands for buying items on market and commands for transferring items
 * 
 * @class Manager
 */
class Manager {
    constructor(options) {
        this.bots = new Map();
        this.tradeOperationLoger = options.tradeOperationLoger;
        this.marketWebSocketClient = options.marketWebSocketClient;
        this.transferOperationsLoger = options.transferOperationsLoger;
    }

    /**
     * Initialise bots
     * 
     * @param {Array<Object>} botsInfo
     * 
     * @memberOf Manager
     */
    start(botsInfo) {
        botsInfo.forEach((botInfo) => {
            let newBot = new Bot(botInfo);

            newBot.on('webSession', (bot) => {
                this.bots.set(newBot.steamId, newBot);
                console.log("Community loggedIn " + newBot.steamId);
                if (bot.botConfig.trader) {
                    this.trader = newBot;
                    this.trader.isTrader = true;
                    this.marketManager = new MarketManager(newBot);
                }
                newBot.connectToWSWithDelay(config.intervalConnactionToManagerWS * this.bots.size);
                this._initManagerWebSocketComunication(newBot);
                this._initBotEventHandling(newBot);
            });
        });
        this.transferManager = new TransferManager(this.bots, this.trader);

    }

    /**
     * Configurat web socket message handling
     * 
     * 
     * @memberOf Manager
     */
    // _initSocketMsgHandling() {
    //     if (!this.marketWebSocketClient) {
    //         return;
    //     }
    //     this.trader.getWSAuth()
    //         .then((auth) => {
    //             this.marketWebSocketClient.connect(auth.wsAuth);

    //             this.marketWebSocketClient.onOfferStatusChanged((msg) => {
    //                 if (msg.type == 'itemstatus_cs') {
    //                     let notyData = JSON.parse(msg.data);
    //                     if (notyData.status == EMarketOfferState.ReadyToGetFromBot) {
    //                         this.trader
    //                             .itemRequest(notyData.bid)
    //                             .then((data) => {
    //                                 console.log('Item request after ws message');
    //                                 console.log(data);
    //                             });
    //                     }
    //                     if (notyData.status == EMarketOfferState.ItemTransferedToYou) {
    //                         console.log('WS: Market message status 5 (ItemTransferedToYou)');
    //                         let trade = this.tradeOperationLoger.close(notyData.id);
    //                         let msgToSystem = {
    //                             isBuyProcess: 0,
    //                             isDone: 1,
    //                             dateBuyProcessGmt: (new Date()).toGMTString(),
    //                             buyId: notyData.id,
    //                             price: trade.price
    //                         }
    //                         this.sendToSystemOfferChangedStatusMsg(msgToSystem);
    //                     }
    //                 }
    //             });
    //         }).catch((erro) => {
    //             console.error('Getting WSAuth error', erro)
    //         });
    // }


    _initManagerWebSocketComunication(bot) {
        bot.on('wsMessage', (data) => {
            this.transferManager.transferItemTo(bot, data.steamId, data.tradeLink, data.item)
                .then((offer) => {
                    console.log('Items transferd to bot', offer);
                    //Log task info
                    data.botId = bot.steamId;
                    data.offerId = offer.id;
                    this.transferOperationsLoger.add(data);
                    //Send notyfication to manager
                    bot.wsSend({
                        name: 'trade.create',
                        params: data
                    });
                }).catch((err) => {
                    console.error('_initManagerWebSocketComunication wsMessage', err.message);
                    data.botId = bot.steamId;
                    data.reason = err.message;
                    bot.wsSend({
                        name: 'trade.fail',
                        params: data
                    })
                });
        });
    }


    /*******HANDLER*********/

    /**
     * Init handling bot events
     * 
     * @param {SteamBot} bot
     * 
     * @memberOf Manager
     */
    _initBotEventHandling(bot) {
        bot.on("BotReceivedNewOffer", (emiter, offer) => {
            this._botReceiveNewOfferHandler(emiter, offer);
        });

        bot.on('BotNewOfferCreated', (emiter, sendOferInfo) => {
            this._newOfferCreatedHandler(emiter, sendOferInfo);
        });

        bot.on('BotSentOfferChanged', (emiter, offer, oldState) => {
            this._botSentOfferChangedHandler(emiter, offer, oldState);
        });

        /**
         * Take items when partner confir offer.
         */
        bot.on('BotReceivedOfferChanged', (emiter, offer, oldState) => {
            this._botReceivedOfferChangedHandler(emiter, offer, oldState);
        });

        bot.on('Limitation', (emiter, limitations) => {
            console.log(`Bot steam Limitation`);
            console.log(emiter);
            console.log(limitations);
            bot.wsSend({
                name: 'bot.restrictions',
                params: {
                    restrictions: limitations
                }
            });
        })
    }

    /**
     * Handler for received new offer event
     * 
     * @param {MarketBot} bot
     * @param {TradeOffer} offer
     * 
     * @memberOf Manager
     */
    _botReceiveNewOfferHandler(bot, offer) {
        console.log(`Bot ${bot.steamId} recive new offer ${offer.id}`);
        //Receive incoming items 
        if (!(offer.isOurOffer && offer.itemsToGive)) {
            this._acceptIncomingOffer(offer)
                .then((state) => {
                    console.log('botReceiveNewOfferHandler accept:', state);
                })
                .catch((error) => {
                    console.error('botReceiveNewOfferHandler', error);
                });
        }
    }

    /**
     * Acceptiong incoming offer.
     * 
     * @param {TradeOffer} offer 
     * 
     * @memberOf Manager
     */
    _acceptIncomingOffer(offer) {
        return new Promise((resolve, reject) => {
            offer.accept(true, (err, status) => {
                if (err) {
                    console.error('botReceiveNewOfferHandler', err);
                    reject(err);
                    return;
                }
                console.log('botReceiveNewOfferHandler accept:', status);
                resolve(status);
            });
        });

    }

    /**
     * 
     * 
     * @param {MarketBot} bot
     * @param {TradeOffer} sendOferInfo
     * 
     * @memberOf Manager
     */
    _newOfferCreatedHandler(bot, sendOfferInfo) {
        console.log(` Bot ${bot.steamId} sent offer changed:`);
        console.log(sendOfferInfo);
    }

    /**
     * Handler for sent offer changed event
     * 
     * TradeOffer description https://github.com/DoctorMcKay/node-steam-tradeoffer-manager/wiki/TradeOffer
     * 
     * @param {SteamBot} bot
     * @param {TradeOffer} offer 
     * @param {String} oldState
     * 
     * @memberOf Manager
     */
    _botSentOfferChangedHandler(bot, offer, oldState) {
        console.log(` Bot ${bot.steamId} sent offer ${offer.id} changed ${ETradeOfferState[offer.state]} old state ${ETradeOfferState[oldState]}`);
        let task = this.transferOperationsLoger.getByOfferId(offer.id);

        if (!task) {
            console.error('Task has not found in task log lis', offer);
            return;
        }

        let msg = { name: '', params: {} };
        msg.params.task_id = task.task_id;
        msg.params.classid = task.item.classid;
        msg.params.instanceid = task.item.instanceid;
        msg.params.from_steamid = task.botId;
        msg.params.to_steamid = task.steamId;

        // Enums description on https://github.com/DoctorMcKay/node-steam-tradeoffer-manager/blob/master/resources/ETradeOfferState.js
        switch (offer.state) {
            case 1:
                msg.params.reason = 'invalid';
                break;
            case 3:
                msg.name = 'trade.success';
                this.transferOperationsLoger.closeByOfferId(offer.id);
                break;
            case 4: //Countered The recipient made a counter offer.                
                msg.params.reason = 'сountered';
                break;
            case 5: //Expired The trade offer was not accepted before the expiration date.
                msg.params.reason = 'expired';
                break;
            case 7: //Declined The recipient declined the offer.
                msg.params.reason = 'declined';
                break;
        }
        if (!msg.name && msg.params.reason) {
            msg.name = 'trade.fail';
        }
        if (!msg.name) {
            return;
        }

        bot.wsSend(msg);
    }

    /**
     * Handler for received offer changed event
     * 
     * @param {SteamBot} bot
     * @param {Object} offer
     * @param {String} oldState
     * 
     * @memberOf Manager
     */
    _botReceivedOfferChangedHandler(bot, offer, oldState) {
        console.log(`Bot ${bot.steamId} recive offer changed ${ETradeOfferState[offer.state]} old state ${ETradeOfferState[oldState]}`);
    }



    /******PUBLIC METHODS*****/

    /**
     * Returning balance info 
     * 
     * @returns {Promise}
     * 
     * @memberOf Manager
     */
    getBotsBalance() {
        let promises = [];
        this.bots.forEach((bot) => {
            promises.push(bot.getMoney());
        });
        return Promise.all(promises);
    }

    // /**
    //  * Create offer to trasfer item
    //  * 
    //  * @param {Object} itemInfo
    //  * @param {String} botId
    //  * @param {String} userToken
    //  * @returns {Promise}
    //  * 
    //  * @memberOf Manager
    //  */
    // transferItemToBot(botId, itemInfo) {
    //     let ourBot = this.bots.get(botId);
    //     if (!ourBot) {
    //         return Promise.reject(Error('Bot not found'));
    //     }
    //     let userToken = ourBot.userToken;
    //     let appItems = { '570': [itemInfo] };
    //     return this.trader.createOffer('send', botId, userToken, appItems);
    // }

    // /**
    //  * Create offer to trasfer item
    //  * 
    //  * @param {Object} itemInfo
    //  * @param {String} botId
    //  * @param {String} userToken
    //  * @returns {Promise}
    //  * 
    //  * @memberOf Manager
    //  */
    // transferItemToUser(botId, userId, userToken, itemInfo) {
    //     let ourBot = this.bots.get(botId);
    //     let appItems = { '570': [itemInfo] };
    //     return ourBot.createOffer('send', userId, userToken, appItems);
    // }
}

module.exports = Manager;