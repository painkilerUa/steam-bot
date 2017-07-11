class TransferManager {
    constructor(bots) {
        this.bots = bots;
    }

    /**
     * Create offer to trasfer item
     * 
     * @param {Object} itemInfo
     * @param {String} botId
     * @param {String} userToken
     * @returns {Promise}
     * 
     * @memberOf TransferManager
     */
    transferItemToBot(botId, itemInfo) {
        let ourBot = this.bots.get(botId);
        let trader;

        this.bots.forEach((value) => {
            if (value.isTrader) {
                trader = value;
            }
        });

        if (!ourBot) {
            return Promise.reject(Error('Bot not found'));
        }

        if (!trader) {
            return Promise.reject(Error('Bot trader not found'));
        }

        let userToken = ourBot.userToken;
        let appItems = { '570': [itemInfo] };
        return trader.createOffer('send', botId, userToken, appItems);
    }

    /**
     * Create offer to trasfer item
     * 
     * @param {Object} itemInfo
     * @param {String} botId
     * @param {String} userToken
     * @returns {Promise}
     * 
     * @memberOf TransferManager
     */
    transferItemToUser(botId, userId, userToken, itemInfo) {
        let bot = this.bots.get(botId);
        return this.transferItemTo(bot, userId, userToken, appItems);
    }

    /**
     * Create offer to trasfer item
     * 
     * @param {MarkeBot} bot 
     * @param {String} userId 
     * @param {String} userToken 
     * @param {Object} itemInfo 
     * @returns {Promise}
     * 
     * @memberOf TransferManager
     */
    transferItemTo(bot, userId, userToken, itemInfo) {
        let appItems = { '570': [itemInfo] };
        return bot.createOffer('send', userId, userToken, appItems);
    }
}

module.exports = TransferManager;