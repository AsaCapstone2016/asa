'use strict';

var facebookEventConverter = require('facebook-event-converter');
var conversation = require('conversation-manager');
let facebookMessageSender = require('facebook-message-sender');

var config = require('./../config');
const VERIFY_TOKEN = config.FB_VERIFY_TOKEN;
const WIT_TOKEN = config.WIT_TOKEN;

module.exports.facebookLambda = function (event, context, callback) {
    //console.log(`event: ${JSON.stringify(event, null, 2)}`);
    if (event.method === "POST") {
        // Convert FB Messenger event object to common event object
        let messages = facebookEventConverter.convertEvent(event);

        // Send each message in the common event object to the conversation manager
        messages.forEach((message) => {
            console.log(`message recevied: ${JSON.stringify(message, null, 2)}`);
            return conversation.handler(message, message.UID, facebookMessageSender);
        });
    } else if (event.method === "GET") {
        let params = event.query;
        let responseBody = 'Error, wrong validation token';

        if (params['hub.mode'] === 'subscribe' && params['hub.verify_token'] === VERIFY_TOKEN) {
            responseBody = parseInt(params['hub.challenge']);
        }

        callback(null, responseBody);
    }
};
