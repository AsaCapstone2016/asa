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

    //Seems like the cart url somehow generates another request to this url...? This is a fix tho
    if (event.query['associate-id']) {
        console.log(`Skipping this request`);
        return;
    }
    console.log(`CART REDIRECT EVENT ${JSON.stringify(event, null, 2)}`);
    let uid = event.query.user_id;
    let cartUrl = event.query.cart_url;
    let ASIN = event.query.ASIN;

    purchasedItemDAO.addItem(uid, ASIN).then(()=> {
        console.log(`CART REDIRECTED - ${cartUrl}`);
        context.succeed({location: cartUrl});
    });
}; 