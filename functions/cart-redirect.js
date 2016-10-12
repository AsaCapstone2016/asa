'use strict';
var purchasedItemDAO = require('database').purchasedItemDAO;
var config = require('./../config');

/**
 * Lambda function for cart redirect that logs some information about the purchase click
 * uid, cart_url, and ASIN all need to be passed in as queries on the url
 * @param event
 * @param context
 * @param callback
 */
module.exports.cartRedirect = function (event, context, callback) {
    let uid = event.query.uid;
    let cartUrl = event.query.cart_url;
    let ASIN = event.query.ASIN;

    purchasedItemDAO.addItem(uid, ASIN).then(()=> {
        context.succeed({location: cartUrl});
    });
}; 