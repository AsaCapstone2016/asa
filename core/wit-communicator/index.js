/**
 * Created by evan on 9/25/16.
 */
var Wit = require('cse498capstonewit').Wit;
var log = require('cse498capstonewit').log;
var facebookMessageSender = require('facebook-message-sender');
var config = require('./../../config');
// Our bot actions
const actions = {
    send: function (sessionId, text) {
        console.log('here-send');
        // Our bot has something to say!
        // Let's retrieve the Facebook user whose session belongs to
        const recipientId = sessions[sessionId].fbid;
        if (recipientId) {
            // Yay, we found our recipient!
            // Let's forward our bot response to her.
            // We return a promise to let our bot know when we're done sending
            return facebookMessageSender.sendTextMessage({recipient_id: recipientId, text: text})
                .then(function () {
                })
                .catch(function (err) {
                    console.error(
                        'Oops! An error occurred while forwarding the response to',
                        recipientId,
                        ':',
                        err.stack || err
                    );
                });
        } else {
            console.error('Oops! Couldn\'t find user for session:', sessionId);
            // Giving the wheel back to our bot
            return Promise.resolve()
        }
    },
    // You should implement your custom actions here
    // See https://wit.ai/docs/quickstart
    search: function (context, entities) {
        console.log('here-search');
        return new Promise(function (resolve, reject) {
            if ("search_query" in entities) {
                console.log("here");
                context.items = entities.search_query[0].value;
                console.log(context.items);
                delete context.missing_keywords;
            } else {
                console.log("over here now");
                context.missing_keywords = true;
                delete context.items;
            }
            console.log("context: " + JSON.stringify(context, null, 2));
            return resolve(context);
        });
    }
};

const wit = new Wit({
    accessToken: config.WIT_TOKEN,
    actions: actions,
    logger: new log.Logger(log.INFO)
});

var sessions = {};

var witCommunicator = {
    findOrCreateSession: function (fbid) {
        var sessionId;
        // Let's see if we already have a session for the user fbid
        Object.keys(sessions).forEach(function (k) {
            if (sessions[k].fbid === fbid) {
                // Yep, got it!
                sessionId = k;
            }
        });
        if (!sessionId) {
            // No session found for user fbid, let's create a new one
            sessionId = new Date().toISOString();
            sessions[sessionId] = {fbid: fbid, context: {}};
        }

        return sessionId;
    },

    runActions: function (sessionId, text) {
        return wit.runActions(
            sessionId, // the user's current session
            text, // the user's message
            sessions[sessionId].context // the user's current session state
        ).then(function (context) {
                // Our bot did everything it has to do.
                // Now it's waiting for further messages to proceed.
                console.log('Waiting for next user messages');

                // Based on the session state, you might want to reset the session.
                // This depends heavily on the business logic of your bot.
                // Example:
                // if (context['done']) {
                //   delete sessions[sessionId];
                // }

                // Updating the user's current session state
                sessions[sessionId].context = context;
            })
            .catch(function (err) {
                console.error('Oops! Got an error from Wit: ', err.stack || err);
            });
    }
};

module.exports = witCommunicator;