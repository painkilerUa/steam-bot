var socket = require('uws');
const config = require('../config');

class MarketWebSocketClient {
    constructor(configs) {
        this.serverUrl = configs.url || config.marketWebSocket;
        this.showPongMsg = configs.showPongMsg || false;
        this.ws;
    }
    connect(wsAuth) {
        this.wsAuth = wsAuth;
        this.reconnect();
    }

    initConnactionHandling() {
        this.ws.on('error', (error) => {
            console.log('Market WS: Connection error', error);
        });

        this.ws.on('close', (code, message) => {
            console.log('Market WS: Disconnection: ' + code + ', ' + message);
            this.reconnect(this.wsAuth);
        });

        if (this.pingIntervalIndex) {
            clearInterval(this.pingIntervalIndex);
        }

        this.pingIntervalIndex = setInterval(() => {
            this.ws.send('ping');
        }, 40 * 1000);
    }

    reconnect() {
        this.ws = new socket(this.serverUrl);
        this.ws.on('open', () => {
            this.ws.send(this.wsAuth, () => {
                console.log('Market WS: sended ', this.wsAuth);
            });
            this.ws.send('ping');
            this.ws.send('webnotify');
            this.initConnactionHandling();
        });
    }

    onOfferStatusChanged(callback) {
        this.ws.on('message', (msg) => {
            if (msg == 'pong') {
                if (this.showPongMsg)
                    console.log(msg, new Date());

                return;
            }
            try {
                let parsetMsg = JSON.parse(msg);
                callback(parsetMsg);
            } catch (Error) {
                console.error(Error);
            }
        })
    }
}

module.exports = MarketWebSocketClient;