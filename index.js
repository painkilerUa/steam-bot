const server = require('./server');
const Manager = require('./manager');
const MarketWebSocketClint = require('./server').MarketWebSocketClient;
const ManagerWebSocketClient = require('./server').ManagerWebSocketClient;
const TradeOperationsLoger = require('./manager/tradeOperationLoger');
const TransferOperationsLoger = require('./manager/transferOperationsLoger');


let manager = new Manager({
    marketWebSocketClient: new MarketWebSocketClient({ showPongMsg: false }),
    managerWebSocketClient: new ManagerWebSocketClient(),
    tradeOperationLoger: new TradeOperationsLoger(),
    transferOperationsLoger: new TransferOperationsLoger()
});
server.start(manager);