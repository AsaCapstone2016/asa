/**
 * Created by cse498 on 11/4/16.
 */
'use strict';
var config = require('./../config');
var amazon = require('amazon');
var facebookMessageSender = require('facebook-message-sender');
var getSuggestions = require('user-profiler').getSuggestions;
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
        let platform = uid.substring(0, uid.indexOf('-'));
        let id = uid.substring(uid.indexOf('-') + 1);

        let suggestions = getSuggestions(id, platform);
        console.log(`SUGGESTIONS: ${JSON.stringify(suggestions)}`);

        //No suggestions
        if (!suggestions.length)
            return;

        if (platform == 'facebook') {
            console.log('sending message');
            facebookMessageSender.sendSearchResults(id, suggestions).then(()=> {
                console.log(`SENT USER ${id} SOME SUGGESTIONS`);
            });
        }
    });
};
