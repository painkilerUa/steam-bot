const config = require('../config');

const EventEmitter = require('events');
const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamCommunity = require('steamcommunity');
const SteamTotp = require('steam-totp');

class SteamBot extends EventEmitter {
    constructor(botConfig) {
        super();

        this.botConfig = botConfig;

        this._logOnSteam();
        this._initTradeOfferManager();

        this.community = new SteamCommunity();
        this._initSteamCommunityEventsHandlers();
    }

    get login() {
        return this.botConfig.login;
    }

    get steamId() {
        if (!this.client.steamID) {
            return this.botConfig.steamId;
        }
        return this.client.steamID.getSteamID64();
    }

    get guardCode() {
        return SteamTotp.generateAuthCode(this.botConfig.sharedSecret);
    }

    get identitySecret() {
        return this.botConfig.identitySecret;
    }

    get isLimitedAccount() {
        return this.client.limitations.limited ||
            this.client.limitations.communityBanned ||
            this.client.limitations.locked;
    }

    get limitations() {
        return this.client.limitations;
    }

    _logOnSteam() {
        this.client = new SteamUser();
        this._initSteamUserEventsHandlers();
        let guardCode = this.guardCode;
        let login = this.botConfig.login;
        let id = this.botConfig.steamId;
        let password = this.botConfig.password;
        this.client.logOn({
            accountName: login,
            // loginKey: login,
            password: password,
            authCode: guardCode,
            twoFactorCode: guardCode
        });
    }

    _initTradeOfferManager() {
        let client = this.client;
        this.manager = new TradeOfferManager({
            "steam": client, // Polling every 30 seconds is fine since we get notifications from Steam
            //"domain": "example.com", // Our domain is example.com
            "language": "en", // We want English item descriptions
            // "pollInterval": 10000,
            // "cancelOfferCount": 10,
            // "cancelOfferCountMinAge": 10000*/,
            'cancelTime': 1000 * 60 * 5,
            'pendingCancelTime': 1000 * 60 * 5
        });
        this._initManagerEventsHandlers();
    }

    _checkingLimitationInterval(interval) {
        setInterval(() => {
            console.log(`Checking steam limitations`)
            if (this.isLimitedAccount) {
                this.emit('Limitation', this, {
                    communityBanned: this.limitations.communityBanned,
                    limited: this.limitations.limited,
                    locked: this.limitations.locked
                });
            }
        }, interval);
    }

    _initSteamUserEventsHandlers() {
        let on = this.client.on.bind(this.client);

        on("loggedOn", (details, parental) => {
            // console.log(`Bot ${this.accountName} name ${this.steamId} loged on to steam`);
            this.isLoggedOnSteam = true;
            // console.log("details", details);
            // if(parental){
            //     console.log("parental", parental);
            // }

            this._checkingLimitationInterval(config.checkingLimitationTimeInterval);
        });

        on('error', (error, arg) => {
            console.error('Client ', error);
            console.error('Client EROR arg', arg);
        })
        on('webSession', (sessionID, cookies) => {
            this.manager.setCookies(cookies, (err) => {
                if (err) {
                    this.webSessionAPIKeyError = err;
                    this.isLoggedOnSteamCommunity = false;
                    //console.log(`${Date()} Bot ${this.accountName} webSession error ${err}`);
                    console.error(`${Date()} Bot ${this.accountName} webSession error ${err}`);
                    //TODO:: Check and maeby replace with exception
                    //process.exit(1); // Fatal error since we couldn't get your API key
                    return;
                }
                this.webSessionAPIKeyError = null;
            });
            this.community.setCookies(cookies);
            this.community.loggedIn((err, loggedIn, familyView) => {
                var logMessage = {};

                if (err) {
                    logMessage.error = 'Error logining in community ' + err;
                    this.isLoggedOnSteamCommunity = false;
                    return;
                }
                if (loggedIn) {
                    this.isLoggedOnSteamCommunity = true;
                    this.emit('webSession', this);
                } else {
                    logMessage.error = 'User not login in community';
                    console.error("Community loggedIn " + logMessage.error);

                    this.isLoggedOnSteamCommunity = false;
                }
            });
        });

        on("disconnected", (eresult, msg) => {
            //console.log(`Bot ${this.accountName} disconnected ${SteamUser.EResult[eresult]} "${msg}"`);
            console.info(`Bot ${this.accountName} disconnected ${SteamUser.EResult[eresult]} "${msg}"`);
            this.isLoggedOnSteam = false;
        });

        on("steamGuard", (domain, callback) => {
            //console.log("Steam Guard code needed from email ending in " + domain);
            console.info("Steam requests a Steam Guard code from us.");
            var code = SteamTotp.generateAuthCode(this.identitySecret);
            callback(code);
        });

        on("accountLimitations", (limited, communityBanned, locked, canInviteFriends) => {
            var logMessage = {};

            if (limited) {
                // More info: https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663
                logMessage.error = "Our account is limited. We cannot send friend invites, use the market, open group chat, or access the web API.";
                this.limited = true;
            }
            if (communityBanned) {
                // More info: https://support.steampowered.com/kb_article.php?ref=4312-UOJL-0835
                // http://forums.steampowered.com/forums/showpost.php?p=17054612&postcount=3
                logMessage.error = "Our account is banned from Steam Community";
                // I don't know if this alone means you can't trade or not.
                this.communityBanned = true;
            }
            if (locked) {
                // Either self-locked or locked by a Valve employee: http://forums.steampowered.com/forums/showpost.php?p=17054612&postcount=3
                logMessage.error = "Our account is locked. We cannot trade/gift/purchase items, play on VAC servers, or access Steam Community.  Shutting down.";
                this.locked = true;
                throw Error(logMessage.error);
            }
            if (!canInviteFriends) {
                // This could be important if you need to add users.  In our case, they add us or just use a direct tradeoffer link.
                this.canInviteFriends = false;
                logMessage.error = "Our account is unable to send friend requests.";
            }

            console.error(`Bot Limitations: ${this.steamId } |  limited: ${limited} |  communityBanned ${communityBanned} | locked ${locked} canInviteFriends ${canInviteFriends}`);

            //TODO: implement "accountLimitations" event handler
        });
        on("tradeRequest", (steamID, respond) => {
            // TODO Check this feature 
            // console.log(`BOT Incoming trade request from "${steamID.getSteam3RenderedID()}", accepting`);
            logger.log(`BOT Incoming trade request from "${steamID.getSteam3RenderedID()}", accepting`);
            respond(true);
        });
    }

    _initManagerEventsHandlers() {
        let on = this.manager.on.bind(this.manager);

        on("newOffer", (offer) => {
            //TODO: implement/delete "newOffer" event handler
            this.emit('BotReceivedNewOffer', this, offer);
        });

        on('sentOfferChanged', (offer, oldState) => {
            this.emit('BotSentOfferChanged', this, offer, oldState);
        });

        /**
         * Take items when partner confir offer.
         */
        on('receivedOfferChanged', (offer, oldState) => {
            this.emit('BotReceivedOfferChanged', this, offer, oldState);
        });
    }

    _initSteamCommunityEventsHandlers() {
        let on = this.community.on.bind(this.community);

        on("sessionExpired", (err) => {
            //TODO: implement "receivedOfferChanged" event handler
            console.info(`Steam session expired. Error message: ${err}`);
            this.isLoggedOnSteamCommunity = false;
        });

        on("newConfirmation", (confirmation) => {
            //TODO:: implement "newConfirmation" event handler
            console.info(`SteamCommunityEventsHandlers Received new confirmation: ${confirmation}`);
        });
    }


    /**
     * Creat get/send offer 
     * offerType = ['get', 'send'];
     * @param {String} offerType
     * @param {String} steamId
     * @param {String} userToken
     * @param {[]} appItems
     * @returns {Promise}
     */
    createOffer(offerType, steamId, userToken, appItems) {
        let offer = this.manager.createOffer(userToken);
        if (!offerType || !steamId || !userToken || !appItems) {
            throw Error(`Create offer argument Error`);
        }
        if (!offer) {
            return Promise.reject({ message: 'BOT Create offer error', data: { offerType, steamId, userToken, appItems } });
        }

        return new Promise((resolve, reject) => {
            this.loadItmes(appItems, offerType === 'get' ? offer : null)
                .then((items) => {
                    if (this.addItemsToOffer(offer, offerType, items)) {
                        this.sendOffer(offer, offerType)
                            .then((sentOfferInfo) => resolve(sentOfferInfo))
                            .catch((err) => {
                                err.botId = this.steamId;
                                reject(err);
                            });
                    } else {
                        reject(Error(`Trable with adding items to offer ${offer.id}`));
                    }
                })
                .catch((err) => {
                    err.botId = this.steamId;
                    err.partner = steamId;
                    err.offerType = offerType;
                    reject(err);
                });
        });
    }

    /**
     * @param {String} appItems
     * @param {String} offer
     * @returns {Promise}
     */
    loadItmes(appItems, offer) {
        let loadInventoryPromises = [];
        for (let appid in appItems) {
            if (appid in appItems) {
                if (offer) {
                    //Load items for geting
                    loadInventoryPromises.push(this.loadUserInventoryFromTradOffer(offer, appid, appItems[appid]));
                } else {
                    //Loaditems for sending
                    loadInventoryPromises.push(this.loadBotInventory(appid, appItems[appid]));
                }
            }
        }
        //Combine all loaded items by app in one promise
        return new Promise((resolve, reject) => {
            Promise
                .all(loadInventoryPromises)
                .then((val) => {
                    let itemsList = val.reduce((prev, curent) => {
                        return prev.concat(curent);
                    }, []);
                    if (itemsList.length) {
                        resolve(itemsList);
                    } else {
                        reject({ message: `No items found in inventory `, errorType: 4, itemsToAdd: appItems });
                    }
                })
                .catch((err) => {
                    err.itemsToAdd = appItems;
                    reject(err);
                });
        });
    }

    /**
     * @returns {Boolean}
     */
    addItemsToOffer(offer, offerType, items) {
        return offerType === 'get' ? offer.addTheirItems(items) : offer.addMyItems(items);
    }

    /**
     * Send offer to partner
     * @param {TradeOffer} offer
     * @param {String} offerType
     * @param {EconItem[]} items
     * @returns {Promise}
     */
    sendOffer(offer, offerType) {
        return new Promise((resolve, reject) => {
            //Send offer to partner
            offer.send((err, status) => {
                if (err) {
                    reject(err);
                    return;
                }
                //Confirm send offer   
                let sendOferInfo = { id: offer.id, status, type: offerType, partner: offer.partner };
                if (offerType === 'send') {
                    //Confirm offer with sended items
                    this.offerConfirmation(offer.id)
                        .then((offerConfirmationErr) => {
                            let msg = `Bot ${this.accountName} id ${this.steamId} accept new offer confirmed: ${offer.id} from: ${offer.partner.getSteamID64()}`;
                            if (offerConfirmationErr) {
                                msg += ` error: ${offerConfirmationErr}`;
                                logger.error(msg);
                                this.emit('BotNewOfferCreated', this, null);
                                reject({ message: `BOT send offer confirmation error: ${offerConfirmationErr}`, sendOferInfo });
                            } else {
                                this.emit('BotNewOfferCreated', this, sendOferInfo);
                                resolve(sendOferInfo);
                            }
                        })
                        .catch((confirmOfferError) => {
                            reject(confirmOfferError);
                        });
                } else {
                    resolve(sendOferInfo);
                    this.emit('BotNewOfferCreated', this, sendOferInfo);
                }
            });
        });
    }

    /**
     * Get partner items for adding to offer
     * @param {Number} offer
     * @param {Number} appid
     * @param {Array} soughtItems
     * @returns {Promise}
     */
    loadUserInventoryFromTradOffer(offer, appid, soughtItems) {
        let contextid = this.getContext(appid);

        return new Promise((resolve, reject) => {
            offer.loadPartnerInventory(appid, contextid, (err, inventory, currencies) => {
                if (err) {
                    reject(err);
                    return;
                }
                var result = inventoryFiltrationHandler(inventory, soughtItems);
                resolve(result, currencies);
            });
        });
    }

    /**
     * @param {String} appid
     * @param {Array} soughtItemsId
     * @returns {Promise}
     */
    loadBotInventory(appid, soughtItemsId) {
        let contextid = this.getContext(appid);
        return new Promise((resolve, reject) => {
            this.manager.loadInventory(appid, contextid, true, (err, inventory, currencies) => {
                if (err) {
                    reject(err);
                    return;
                }
                var result = inventoryFiltrationHandler(inventory, soughtItemsId);
                resolve(result, currencies);
            });
        });
    }

    /**
     * Confirm offer. Returns Promise
     * @param {Number} confirmOfferId
     * @returns {Promise}
     */
    offerConfirmation(confirmOfferId) {
        /**
         * Get your account's outstanding confirmations. Only works if you're using two-factor authentication
         */
        return new Promise((resolve, reject) => {
            this.getConfirmations()
                .then((confirmations) => {
                    this.getConfirmationDetails(confirmations, confirmOfferId).then((confirmation) => {
                        if (confirmation) {
                            confirmation.respond(Math.floor(Date.now() / 1000), this.getConfirmationKey(Math.floor(Date.now() / 1000), "allow"), true, (respondErr) => {
                                if (respondErr) {
                                    reject(respondErr);
                                } else {
                                    resolve();
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    /**
     * @returns {Promise}
     */
    getConfirmations() {
        return new Promise((resolve, reject) => {
            this.community.getConfirmations(Math.floor(Date.now() / 1000), this.getConfirmationKey(Math.floor(Date.now() / 1000), "conf"),
                (err, confirmations) => {
                    if (err) {
                        reject(err);
                    } else if (confirmations && confirmations.length === 0) {
                        reject(Error('No confirmations'));
                    } else {
                        resolve(confirmations);
                    }
                }
            );
        });
    }

    /**
     * @param {} confirmations
     * @param {number} confirmOfferId
     * @return {Promise}
     */
    getConfirmationDetails(confirmations, confirmOfferId) {
        let promises = [];
        confirmations.forEach((confirmation) => {
            let prom = new Promise((resolve, reject) => {
                confirmation.getOfferID(Math.floor(Date.now() / 1000), this.getConfirmationKey(Math.floor(Date.now() / 1000), "details"), (getOfferIdErr, offerId) => {
                    if (getOfferIdErr) {
                        reject(getOfferIdErr.message);
                        return;
                    }
                    resolve({ offerId, confirmation });
                });
            });
            promises.push(prom);
        });
        return new Promise((resolve, reject) => {
            Promise.all(promises).then((vals) => {
                    var confirm = vals.filter((item) => {
                        return item.offerId === parseInt(confirmOfferId, 10);
                    });
                    resolve(confirm[0].confirmation);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    /**
     * Retrun application contex id
     * @param {Number} appid
     * @returns {Number}
     */
    getContext(appid) {
        return appid === 753 ? 1 : 2;
    }

    /**
     * Returns a string containing your base64 confirmation key for use with the mobile confirmations web page.
     * 
     * tag = ["conf"],["allow"]["details"] 
     * @param {any} time
     * @param {any} tag
     * @returns {string}
     * 
     * @memberOf SteamBot
     */
    getConfirmationKey(time, tag) {
        return SteamTotp.getConfirmationKey(this.identitySecret, time, tag);
    }



}

/**
 * Utils functions
 */

/**
 * Util function. Get from inventory list searching items
 * @param {Array} arrayToFilter
 * @param {Array} arrayFiltrationTerm
 * @returns {Array}
 */
function inventoryFiltrationHandler(arrayToFilter, arrayFiltrationTerm) {
    if (!arrayToFilter || !arrayFiltrationTerm) {
        return null;
    }
    return arrayToFilter.filter((item) => {
        return ((soughtItems) => {
            for (let soughtItemsIndex = 0; soughtItemsIndex < soughtItems.length; soughtItemsIndex++) {
                let isMatch = item.classid === soughtItems[soughtItemsIndex].classid &&
                    item.instanceid === soughtItems[soughtItemsIndex].instanceid;
                if (isMatch) {
                    return true;
                }
            }
            return false;
        })(arrayFiltrationTerm);
    });
}

module.exports = SteamBot;