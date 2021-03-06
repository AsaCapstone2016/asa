'use strict';

// Import platform specific event converter and message sender
let platform = require('./../core/platforms').fbMessenger;

// The conversation manager handles every message and sends responses
var conversation = require('./../core/conversation-manager');

// Import config variables
var config = require('./../config');
const VERIFY_TOKEN = config.FB_VERIFY_TOKEN;

module.exports.facebookLambda = function (event, context, callback) {
    if (event.method === "POST") {
        // Convert FB Messenger event object to common event object
        let messages = platform.eventConverter.convertEvent(event);

        // Send each message in the common event object to the conversation manager
        messages.forEach((message) => {
            console.log(`MESSAGE recieved: ${JSON.stringify(message, null, 2)}`);
            return conversation.handler(message, message.UID, platform.messageSender);
        });
    } else if (event.method === "GET") {
        // Register webhook with FB app by responding with the challenge
        let params = event.query;
        let responseBody = 'Error, wrong validation token';

        if (params['hub.mode'] === 'subscribe' && params['hub.verify_token'] === VERIFY_TOKEN) {
            responseBody = parseInt(params['hub.challenge']);
        }

        callback(null, responseBody);
    }
};
