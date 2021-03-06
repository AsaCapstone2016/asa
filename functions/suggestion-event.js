/**
 * Created by cse498 on 11/4/16.
 */
'use strict';
var config = require('./../config');
var amazon = require('./../core/amazon');
var getSuggestions = require('./../core/user-profiler').getSuggestions;
let sessionsDAO = require('./../core/database').sessionsDAO;

// This is what makes this the facebook messenger endpoint
var fb = require('./../core/platforms').fbMessenger;

/**
 * Lambda function for purchase redirect that logs some information about the purchase click
 * uid, redirect_url, ASIN, and is_cart all need to be passed in as queries on the url
 * @param event
 * @param context
 * @param callback
 */
module.exports.suggestionEvent = function (event, context, callback) {
    let uids = event.body;

    let promiseArray = [];

    uids.forEach((uid) => {
        let platform = uid.substring(0, uid.indexOf('-'));
        let id = uid.substring(uid.indexOf('-') + 1);

        promiseArray.push(sessionsDAO.getSessionIdFromUserId(id).then((session) => {

            let settings = session.settings;
            console.log(settings.sendSuggestions);
            if (settings.sendSuggestions === false) {
                return;
            }

            return getSuggestions(id, platform).then((suggestions) => {

                //No suggestions
                if (!suggestions.length)
                    return;

                if (platform == 'fb') {
                    return fb.messageSender.sendSearchResults(id, suggestions)
                        .then(() => fb.messageSender.sendTextMessage(id, 'Hey! I\'ve found some things that you might like.'))
                        .then(() => console.log(`SENT USER ${id} SOME SUGGESTIONS`))
                        .catch(error => console.log(JSON.stringify(error, null, 2)));
                }
            })
        }));

    });

    return Promise.all(promiseArray);
};
