/**
 * Created by cse498 on 11/4/16.
 */
'use strict';
var config = require('./../config');
var amazon = require('amazon');
var facebookMessageSender = require('facebook-message-sender');

/**
 * Lambda function for purchase redirect that logs some information about the purchase click
 * uid, redirect_url, ASIN, and is_cart all need to be passed in as queries on the url
 * @param event
 * @param context
 * @param callback
 */
module.exports.suggestionEvent = function (event, context, callback) {
    let uids = event.body;
    uids.forEach((uid)=> {
        if (uid.substring(0, uid.indexOf('-')) == 'facebook') {
            console.log('sending message');
            facebookMessageSender.sendTextMessage(uid.substring(uid.indexOf('-') + 1), 'HERE IS YOUR SUGGESTION').then(()=> {
                console.log('send message');
            });
        }
    });
};
