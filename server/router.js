const router = require('express').Router();

/**
 * Recive Market bot manager.
 * Configurat express routing.
 * 
 * @param {Manager} manager
 * @returns
 */
function routerConfigutaion(manager) {
    router.get('/', (req, res) => {
        res.end('This is market bot control server')
    });

    router.get('/test', (req, res) => {
        let msgToSystem = {
            isBuyProcess: 1,
            isDone: 1,
            isGiveToUser: 1,
            dateBuyProcessGmt: (new Date()).toGMTString(),
            buy_id: 1111111
        }
        manager.marketManager.sendToSystemOfferChangedStatusMsg(msgToSystem).then((data) => {
            res.json(data);
        });

    });

    router.get('/getBotsBalance', (req, res) => {
        manager.getBotsBalance().then((blanceData) => {
            res.json(blanceData);
        }).catch((err) => {
            res.end(err);
        });
    });

    router.get('/getLastTenItemsFormMarket', (req, res) => {
        manager.marketManager.loadItemsFromMarket(10, (Date.now() / 1000) - 60 * 10, 100).then((items) => {
            res.json(items);
        }).catch((err) => {
            res.json(err);
        });
    });

    router.get('/searchItemByName', (req, res) => {
        let itemsName = req.query.market_hash_name;
        manager.marketManager.searchItemByName(itemsName).then((data) => {
            res.json(data);
        }).catch((err) => {
            res.end(err.message);
        });
    });

    router.get('/getQuickItems', (req, res) => {
        manager.marketManager.getQuickItems(100).then((items) => {
            res.json(items);
        }).catch((err) => {
            res.json(err);
        });
    });

    //getTrades
    router.get('/getTrades', (req, res) => {
        manager.marketManager.getTrades().then((items) => {
            res.json(items);
        }).catch((err) => {
            res.json(err);
        });
    });

    router.get('/quickBuy', (req, res) => {
        let uiId = req.query.ui_id;
        let classId = req.query.classid;
        let instanceId = req.query.instanceid;
        manager.marketManager.quickBuy({ uiId, classId, instanceId }).then((data) => {
            res.json(data);
        }).catch((err) => {
            res.json(err);
        });
    });

    router.get('/buy', (req, res) => {
        let price = req.query.price;
        let classId = req.query.classid;
        let instanceId = req.query.instanceid
        manager.marketManager.buy({ price, classId, instanceId }).then((data) => {
            res.json(data);
        }).catch((err) => {
            res.json(err.message);
        });
    });

    router.get('/itemRequest', (req, res) => {
        let botId = req.query.botid;
        manager.marketManager.itemRequest(botId).then((data) => {
            res.json(data);
        }).catch((err) => {
            res.json(err);
        });
    });

    router.get('/allItemRequest', (req, res) => {
        manager.marketManager.requestAllBoughtItems()
            .then((data) => {
                res.json(data);
            }).catch((err) => {
                res.json(err);
            });
    });

    router.get('/getItemsInSystem', (req, res) => {
        manager.marketManager.getItemsInSystem()
            .then((data) => {
                res.json(data);
            }).catch((err) => {
                res.end(err);
            });
    });

    router.get('/transferItemToBot', (req, res) => {
        let botId = req.query.steamid //Bot reciver steam id;
        let itemInfo = {
            classid: req.query.classid,
            instanceid: req.query.nstanceid
        };
        manager.transferManager.transferItemToBot(botId, itemInfo)
            .then((data) => {
                res.json(data);
            }).catch((err) => {
                res.end(err.message);
            });
    });

    router.get('/transferItemToUser', (req, res) => {
        let userId = req.query.user_steamid;
        let botId = req.query.bot_steamid;
        let itemInfo = {
            classid: req.query.classid,
            instanceid: req.query.nstanceid
        };
        let userToken = req.query.tradelink;
        manager.transferManager.transferItemToUser(botId, userId, userToken, itemInfo)
            .then((data) => {
                res.json(data);
            }).catch((err) => {
                res.end(err.message);
            });
    });

    return router;
}

module.exports = routerConfigutaion;