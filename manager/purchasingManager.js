const request = require('../request');
const config = require('../config');
const EventEmitter = require('events');

class PurchasingManager extends EventEmitter {
    constructor() {
        super();
        this.autoCheckingIntervalTime = config.autoCheckingPurchaisIntervalTime || 1000;
        this._autoChecking();
    }

    /**
     * Start automatic checking buying items for cases.
     * 
     */
    _autoChecking() {
        this.auntoCheckingInterval = setInterval(() => {
            this._getBuyingItems().then((data) => {
                this._checkResponse(data.items_to_buy);
            }).catch((error) => {
                console.error(error);
            });
        }, this.autoCheckingIntervalTime);
    }

    _getBuyingItems() {
        return request.getRequestToSystem('items-to-buy');
    }

    /**
     * Checking respons data
     * 
     * @param {any} data 
     * 
     * @memberOf PurchasingManager
     */
    _checkResponse(data) {
        if (data && data.length) {
            this.emit('haseItemsToBuy', data);
        }
    }
}

module.exports = PurchasingManager;