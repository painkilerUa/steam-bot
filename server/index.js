const config = require('../config');
const app = require('express')();
const bodyParser = require('body-parser');

const router = require('./router');

exports.MarketWebSocketClient = require('./markectWebSocketClient');

exports.ManagerWebSocketClient = require('./managerWebSocketClient');

exports.start = (manager) => {
    manager.start(config.bots);
    app.use('/', router(manager));

    let server = app.listen(config.server.port, function() {
        let host = server.address().address
        let port = server.address().port
        console.log("App listening at http://%s:%s", host, port)
    });
};