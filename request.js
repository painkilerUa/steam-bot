const http = require('http');
const config = require('./config');
var crypto = require('crypto');


let getRequestToMarketQueueIndex = 0;

// http.request.setEncoding('utf8');

exports.getRequestToMarket = (path) => {
    getRequestToMarketQueueIndex++;
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            let requestClient = http.request({
                hostname: config.marketDomain,
                path: encodeURI(path)
            }, (res) => {
                let data = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    getRequestToMarketQueueIndex--;
                    try {
                        data = JSON.parse(data);
                        if (data.error) {
                            reject(data)
                            return;
                        }
                    } catch (error) {
                        console.error('request JSON.parse erorr ');
                    }

                    resolve(data);
                })
            });
            requestClient.on('error', (e) => {
                reject(e)
            });
            requestClient.end();

        }, 300 * getRequestToMarketQueueIndex);
    });
}

exports.postRequestToMarket = (path, data) => {
    let stringifiedData = data;
    return new Promise((resolve, reject) => {
        let requestClient = http.request({
            hostname: config.marketDomain,
            port: 80,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringifiedData)
            }
        }, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    resolve(data);
                }

            })
        });
        requestClient.write(stringifiedData);
        requestClient.end();
    });
}

exports.getRequestToSystem = (mathode) => {
    let path = '/v1/case-item-bot/get/' + mathode;
    return new Promise((resolve, reject) => {
        let requestClient = http.request({
            hostname: config.systemDomain,
            path: path
        }, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    resolve(data);
                }

            })
        });
        requestClient.on('error', (e) => {
            reject(e)
        });
        requestClient.end();
    });
}

exports.postToSystem = (requestData) => {
    let md5 = crypto.createHash('md5'),
        date = new Date(),
        year = date.getFullYear(),
        month = (date.getMonth() + 1).toString(),
        day = date.getDate().toString(),
        ymd = year + '-' + (month.length > 1 ? month : '0' + month) + '-' + (day.length > 1 ? day : '0' + day),
        msg = 'guadalupe' + ymd;
    md5.update(msg, 'utf-8');
    let path = '/v1/case-item-bot/update?token=' + md5.digest('hex');
    return new Promise((resolve, reject) => {
        let requestClient = http.request({
            hostname: config.systemDomain,
            port: 80,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestData)
            }
        }, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    resolve(data);
                }

            })
        });
        requestClient.write(requestData);
        requestClient.end();
    });
}