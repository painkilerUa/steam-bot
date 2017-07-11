/**
 * Log trade information
 * 
 * @class TradeOparationLoger
 */

let keys = ['marketId', ''];
class TradeOperationLoger {
    constructor() {
        this.tradeOprationList = [];
    }

    add(newTrade) {
        if (typeof newTrade != 'object') {
            throw new TypeError('"add" method must receive a object')
        }
        if (!newTrade.hasOwnProperty('marketId')) {
            throw new Error('New trade not have "marketId"');
        }
        this.tradeOprationList.push(newTrade);
        console.log('Items is buyed and added to purchase log', newTrade);
    }
    delete(marketId) {
        this.tradeOprationList = this.tradeOprationList.filter((item) => {
            return item.marketId !== marketId;
        });
    }
    close(marketId) {
        console.log('TradeOperationLoger: trade is closed')
        console.log(this.tradeOprationList)
        let matchedItems = this.tradeOprationList.filter((item) => {
            return item.marketId == marketId;
        })
        this.delete(marketId);
        return matchedItems[0];

    }
    update() {}
}

module.exports = TradeOperationLoger