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
    console.log(`CART REDIRECT EVENT ${JSON.stringify(event, null, 2)}`);
    console.log(`CART REDIRECT CONTEXT ${JSON.stringify(context, null, 2)}`);
    let querystring = event.params.querystring;
    //Seems like the cart url somehow generates another request to this url...? This is a fix tho
    if (querystring['associate-id']) {
        console.log(`Skipping this request`);
        return;
    }
    console.log(`CART REDIRECT EVENT ${JSON.stringify(event, null, 2)}`);
    console.log(`CART REDIRECT CONTEXT ${JSON.stringify(context, null, 2)}`);

    let uid = querystring.user_id;
    let cartParams = querystring.cart_url.substring(querystring.cart_url.indexOf("?") + 1);
    let ASIN = querystring.ASIN;
    let isMobileRequest = event.params.header['CloudFront-Is-Mobile-Viewer'];
    let cartUrl;
    if (isMobileRequest)
        cartUrl = `https://www.amazon.com/gp/aw/rcart?${cartParams}`;
    else {
        cartUrl = `https://www.amazon.com/gp/cart/aws-merge.html?${cartParams}`;
    }
    purchasedItemDAO.addItem(uid, ASIN).then(()=> {
        console.log(`CART REDIRECTED - ${cartUrl}`);
        context.succeed({location: cartUrl});
    });
}; 