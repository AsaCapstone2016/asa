/**
 * Created by cse498 on 11/4/16.
 */
'use strict';
var config = require('./../config');
var subscriptionsDAO = require('database').subscriptionsDAO;

/**
 * Lambda function for purchase redirect that logs some information about the purchase click
 * uid, redirect_url, ASIN, and is_cart all need to be passed in as queries on the url
 * @param event
 * @param context
 * @param callback
 */
module.exports.suggestionEvent = function (event, context, callback) {
    console.log(`EVENT: ${JSON.stringify(event)}`);

};
