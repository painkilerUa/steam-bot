module.exports = {
    'InTrade': 1, //Item placed in sell.
    'WaitTransferingYoeurItemToBot': 2, //You sold the thing and you must give it to the bot.
    'WaitTransferingToBotBougthItem': 3, //Waiting for the bot to transfer the item you bought from the seller.
    'ReadyToGetFromBot': 4, //You can get items.
    'ItemTransferedToYou': 5,
    '1': 'InTrade',
    '2': 'WaitTransferingYoeurItemToBot',
    '3': 'WaitTransferingToBotBougthItem',
    '4': 'ReadyToGetFromBot',
    '5': 'ItemTransferedToYou'
}