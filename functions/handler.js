'use strict';

var amazon = require('amazon-product-api');
var facebookEventConverter = require('facebook-event-converter');
var facebookMessageSender = require('facebook-message-sender');
var witCommunicator = require('wit-communicator');
var config = require('./../config');
var Wit = require('cse498capstonewit').Wit;

module.exports.facebookLambda = function (event, context, callback) {

    console.log(JSON.stringify(event));
    if (event.method === "POST") {
        const client = new Wit({accessToken: config.WIT_TOKEN});
        var messageObjects = facebookEventConverter.convertEvent(event);
        messageObjects.forEach((messageObject) => {
            var sender = messageObject.UID;
            if (messageObject.message.action == 'text') {
                facebookMessageSender.sendTypingMessage(sender); // Let the user know we are thinking!

                //var sessionId = witCommunicator.findOrCreateSession();
                var text = messageObject.message.payload;

                //var session = witCommunicator.findOrCreateSession(sender);
                //witCommunicator.runActions(session, text).then(function(){
                //    console.log('after runActions');
                //});
                client.message(text, {}).then(function (response) {
                    console.log('wit response ' + JSON.stringify(response));
                    if (response.entities.intent[0].value != "search") {
                        return facebookMessageSender.sendTextMessage({
                            recipient_id: sender,
                            text: response.entities.search_query[0].value
                        });
                    }
                    else {
                        var aws = amazon.createClient({
                            awsId: config.AWS_ID,
                            awsSecret: config.AWS_SECRET,
                            awsTag: "evanm-20"
                        });

                        aws.itemSearch({
                            searchIndex: 'All',
                            keywords: response.entities.search_query[0].value,
                            responseGroup: 'ItemAttributes,Offers,Images'
                        }).then(function (results) {
                            facebookMessageSender.sendGenericTemplateMessage(sender, results);
                        });
                    }
                });
            }
        });
    }
    else if (event.method === "GET") {
        // Process GET request for webhook setup
        var params = event.query;
        var responseBody;
        if (params['hub.mode'] === 'subscribe' && params['hub.verify_token'] === 'token') {
            let challenge = params['hub.challenge'];
            responseBody = parseInt(challenge);
        } else {
            responseBody = 'Error, wrong validation token';
        }

        callback(null, responseBody);
    }

};
