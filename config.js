module.exports = {
    server: {
        port: 4444
    },
    traderFrozen: true,
    marketWebSocket: '',
    managerWebSocket: '',
    marketDomain: '',
    systemDomain: '',
    systemApiUrl: '',
    autoCheckingPurchaisIntervalTime: 1000 * 60,
    autoCheckingBoughtItemsInterval: 1000 * 60 * 5, //ms
    autoCheckingItemsInterval: 1000 * 30, //ms
    checkingLimitationTimeInterval: 1000 * 60 * 5, //ms
    intervalConnactionToManagerWS: 20 * 1000, //ms
    tradeOfferTryCount: 5,
    bots: [{
            login: '',
            password: '',
            identitySecret: '',
            sharedSecret: '',
            steamId: '',
            steamWebApi: '',
            link: '',
            marketApiKey: '',
            trader: true
        }

    ]
}