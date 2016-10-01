'use strict';

var facebookEventConverter = require('facebook-event-converter');
var facebookMessageSender = require('facebook-message-sender');
//var conversation = require('conversation-manager');
var Wit = require('cse498capstonewit').Wit;
var log = require('cse498capstonewit').log;

const VERIFY_TOKEN = require('./../config').FB_VERIFY_TOKEN;
const WIT_TOKEN = require('./../config').WIT_TOKEN;

// SESSION MANAGEMENT
const sessions = {};
const findOrCreateSession = (fbid) => {
  let sessionId;

  Object.keys(sessions).forEach((k) => {
    if (sessions[k].fbid === fbid) {
      sessionId = k;
    }
  });

  if (!sessionId) {
    sessionId = new Date().toISOString();
    sessions[sessionId] = { fbid: fbid, context: {} };
  }

  return sessionId;
};

// BOT ACTIONS
const actions = {
    send(request, response) {
        console.log("BEGIN SEND");
        const recipientId = sessions[request.sessionId].fbid;
        if (recipientId) {
            console.log(`SEND "${response.text}" to ${recipientId}`);
            return facebookMessageSender.sendTextMessage(recipientId, response.text)
                .then(() => null);
        } else {
            return Promise.resolve();
        }
    },
    // don't know what to call this object, rename it
    search(request) {
        console.log("BEGIN SEARCH");
        let entities = request.entities;
        let context = request.context;
        return new Promise((resolve, reject) => {
            if ('search_query' in entities) {
                context.items = entities.search_query[0].value;
                delete context.missing_keywords;
            } else {
                context.missing_keywords = true;
                delete context.items;
            }
            return resolve(context);
        });
    }
};

const witClient = new Wit({
    accessToken: WIT_TOKEN,
    actions: actions,
    logger: new log.Logger(log.DEBUG)
});

module.exports.facebookLambda = function (event, context, callback) {
    //console.log(`event: ${JSON.stringify(event, null, 2)}`);

    if (event.method === "POST") {
        // Convert FB Messenger event object to common event object
        let messages = facebookEventConverter.convertEvent(event);

        // Send each message in the common event object to the conversation manager
        messages.forEach( (message) => {
            console.log(`message: ${JSON.stringify(message, null, 2)}`);

            // Send to conversation manager
            //conversation.handle(message, facebookMessageSender);

            // Begin conversation manager
            let sender = message.UID;
            let sessionId = findOrCreateSession(sender);
            
            if (message.content.action === "text") {
                console.log(`BEFORE runActions context: ${JSON.stringify(sessions[sessionId].context)}`);
                let text = message.content.payload;
                witClient.runActions(sessionId, text, sessions[sessionId].context)
                    .then( (ctx) => {
                        console.log("waiting for next message from: " + sender);
                        sessions[sessionId].context = ctx;
                    })
                console.log(`AFTER runActions context: ${JSON.stringify(sessions[sessionId].context)}`);
            } else if (message.content.action === "postback") {
                console.log("POSTBACK");
            }
            // End conversation manager
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