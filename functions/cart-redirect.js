'use strict';
var purchasedItemDAO = require('database').purchasedItemDAO;
var config = require('./../config');

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
    let querystring = event.params.querystring;
    //Seems like the purchase url somehow generates another request to this url...? This is a fix tho
    if (querystring['associate-id']) {
        console.log(`Skipping this request`);
        return;
    }
    console.log(`PURCHASE REDIRECT EVENT ${JSON.stringify(event, null, 2)}`);
    console.log(`PURCHASE REDIRECT CONTEXT ${JSON.stringify(context, null, 2)}`);

    let uid = querystring.user_id;
    let redirectUrl = querystring.redirect_url;
    let ASIN = querystring.ASIN;
    let isCartUrl = querystring.is_cart;
    let isMobileRequest = event.params.header['CloudFront-Is-Mobile-Viewer'];
    
    if (isCartUrl === '1') {
        let cartParams = redirectUrl.substring(redirectUrl.indexOf("?") + 1);
        if (isMobileRequest)
            redirectUrl = `https://www.amazon.com/gp/aw/rcart?${cartParams}`;
        else {
            redirectUrl = `https://www.amazon.com/gp/cart/aws-merge.html?${cartParams}`;
        }
    }
    purchasedItemDAO.addItem(uid, ASIN).then(()=> {
        console.log(`PURCHASE REDIRECTED - ${redirectUrl}`);
        context.succeed({location: redirectUrl});
    });
}; 