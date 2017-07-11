//TODO remove this module

const socket = require('uws');
const config = require('../config');
const EventEmitter = require('events');

class ManagerWebSocketClient extends EventEmitter {
    constructor() {
        super();
        this.ws;
    }

    connect(bot) {
        let url = 'ws://bot-manager:8654';

        return new Promise((resolve, reject) => {
            this.ws = new socket(url);
            this.ws.on('open', (data) => {
                this.sendAuth(bot);
                resolve();
            });
            this.ws.on('error', (error) => {
                console.log('Manager WS: Connection error', error);
                reject(error)
            });
            this.ws.on('close', (code, message) => {
                console.log(`Manager WS: Manager server disconnection : ${code}, ${message}`);
                reject(code);
            });
        });

    }

    send(msg, callback) {
        msg = JSON.stringify(msg);
        console.log('Manager WS: Sending message to manager: ', msg);
        this.ws.send(msg, callback);
    }

    sendAuth(bot) {
        bot.loadAllInventoryInfo(570).then((items) => {
            let msg = {
                name: 'bot.auth',
                params: {
                    steam_id: bot.steamId,
                    restrictions: bot.limitations ? bot.limitations : { limited: false, locked: false, communityBanned: false },
                    inventory_count: items.length
                }
            };
            this.send(msg, () => {
                console.log('Manager WS: sended auth to manager websocket server');
            });
        }).catch(function(err) {
            console.error('Manager WS: loadAllInventoryInfo', err);
        });
    }

    onTransferItemTo(callback) {
        this.ws.on('message', (msg) => {
            try {
                msg = JSON.parse(msg);
            } catch (error) {
                console.error('message JSON parsing error')
            }

            if (msg.name == 'trade.new') {
                if (!msg.params) {
                    reject(Error('Params property is \'undefined\' in transfer message'));
                    return;
                }
                callback(msg.params);
            }
        });
    }
}

module.exports = ManagerWebSocketClient;