const winston = require('winston');

winston.configure({
    transports: [
        new(winston.transports.File)({
            name: 'info-log',
            filename: './logs/info-log.log',
            level: 'info'
        }),
        new(winston.transports.File)({
            name: 'error-log',
            filename: './logs/error-log.log',
            level: 'error'
        }),
    ]
});

module.exports = {
    log(msg) {
        winston.log(msg);
    },
    info(msg) {
        window.info(msg);
    }
}