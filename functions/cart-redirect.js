'use strict';
var purchasedItemDAO = require('core/database').purchasedItemDAO;
var config = require('./../config');
var addPurchase = require('user-profiler').addPurchase;

/**
 * Lambda function for purchase redirect that logs some information about the purchase click
 * uid, redirect_url, ASIN, and is_cart all need to be passed in as queries on the url
 * @param event
 * @param context
 * @param callback
 */
module.exports.cartRedirect = function (event, context, callback) {
    console.log(`PURCHASE REDIRECT EVENT ${JSON.stringify(event, null, 2)}`);
    console.log(`PURCHASE REDIRECT CONTEXT ${JSON.stringify(context, null, 2)}`);
    let querystring = event.query;
    //Seems like the purchase url somehow generates another request to this url...? This is a fix tho
    if (event.query['associate-id']) {
        console.log(`SKIPPING THIS REQUEST`);
        return;
    }

    let uid = querystring.user_id;
    let redirectUrl = querystring.redirect_url;
    let ASIN = querystring.ASIN;
    let isCartUrl = querystring.is_cart;
    let isMobileRequest = event.headers['CloudFront-Is-Mobile-Viewer'];

    console.log(`redirect_url: ${redirectUrl}`);
    console.log(`is cart: ${isCartUrl}`);
    console.log(`is mobile: ${isMobileRequest}`);

    if (isCartUrl === '1') {
        let cartParams = redirectUrl.substring(redirectUrl.indexOf("?") + 1);
        let hmacStart = cartParams.indexOf("hmac=") + 5;
        let hmacENd = cartParams.indexOf("&SubscriptionId");
        let hmac = encodeURIComponent(cartParams.slice(hmacStart, hmacENd));
        cartParams = cartParams.slice(0, hmacStart) + hmac + cartParams.slice(hmacENd);
        if (isMobileRequest === 'true') {
            redirectUrl = `https://www.amazon.com/gp/aw/rcart?${cartParams}`;
        } else {
            redirectUrl = `https://www.amazon.com/gp/cart/aws-merge.html?${cartParams}`;
        }
    }

    addPurchase(uid, 'fb', ASIN).then(()=> {
        return purchasedItemDAO.addItem(uid, ASIN).then(()=> {
            console.log(`PURCHASE REDIRECTED - ${redirectUrl}`);
            context.succeed({location: redirectUrl});
        });
    });
};
