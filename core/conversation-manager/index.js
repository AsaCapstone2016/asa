'use strict';

let amazon = require('amazon');
let Wit = require('cse498capstonewit').Wit;
let log = require('cse498capstonewit').log;
let searchQueryDAO = require('database').searchQueryDAO;

const config = require('./../../config');
const WIT_TOKEN = config.WIT_TOKEN;
const TABLE_PREFIX = config.TABLE_PREFIX;

// for dynamodb configuration
let aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});

// Store messageSender in a variable accessible by the Wit actions
let messageSender;

/**
 * Retrieve session from database or create new one from user id
 * uid: user id of recipient, primary key for db record
 */
let getSessionIdFromUserId = (uid) => {
    let docClient = new aws.DynamoDB.DocumentClient();
    let table = `${TABLE_PREFIX}Sessions`;
    let record, sessionId;

    let params = {
        TableName: table,
        Key: {
            uid: uid
        }
    };

    return docClient.get(params).promise()
        .then((data) => {
            if (Object.keys(data).length != 0) {
                // if session exists, grab it
                console.log('SESSION exists!');
                return data.Item;
            } else {
                // if session does not exist, create it
                console.log('SESSION does not exist!');
                let params = {
                    TableName: table,
                    Item: {
                        uid: uid,
                        sessionId: new Date().getTime(),
                        context: {}
                    }
                };
                return docClient.put(params).promise()
                    .then((success) => params.Item);
            }
        });
};

/**
 * Retrieve user id from session id
 * sessionId: session id, primary key for sessionId index
 */
let getSessionFromSessionId = (sessionId) => {
    let docClient = new aws.DynamoDB.DocumentClient();
    let table = `${TABLE_PREFIX}Sessions`;
    let index = 'sessionId-index';

    let params = {
        TableName: table,
        IndexName: index,
        KeyConditionExpression: 'sessionId = :sessionId',
        ExpressionAttributeValues: {
            ':sessionId': sessionId
        }
    };

    return docClient.query(params).promise()
        .then((data) => {
            // We should only ever have one session so just return the first item
            return data.Items[0];
        }, (error) => {
            console.log(`ERROR retrieving session: ${error}`);
        });
};

/**
 * Update context in database given user id
 * uid: user id of the user whose context we want to update
 * ctx: new user context
 */
let updateContext = (uid, ctx) => {
    let docClient = new aws.DynamoDB.DocumentClient();
    let table = `${TABLE_PREFIX}Sessions`;

    let params = {
        TableName: table,
        Key: {
            uid: uid
        },
        UpdateExpression: 'set context = :ctx',
        ExpressionAttributeValues: {
            ':ctx': ctx
        },
        ReturnValues: 'UPDATED_NEW'
    };

    return docClient.update(params).promise()
        .then((success) => {
            console.log(`Updated context for ${uid} to ${JSON.stringify(ctx)}`);
        }, (error) => {
            console.log(`ERROR updating context: ${error}`);
        });
};

// todo: split this out into different actions
const actions = {
    send(request, response) {
        return getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;

                if (recipientId) {
                    const msg = response.text;
                    console.log(`SEND "${msg}" to ${recipientId}`);
                    return messageSender.sendTextMessage(recipientId, msg)
                        .then(() => null);
                }

            }, (error) => {
                console.log(`ERROR in send action: ${error}`);
            });
    },
    sendHelpMessage(request) {
        return getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;

                if (recipientId) {
                    let msg = "Think of me as your personal shopping assistant.";
                    msg += " I can help you discover and purchase items on Amazon.";
                    msg += " Try saying...\n\n";
                    msg += " - I want to buy something\n";
                    msg += " - Can you find Ocarina of Time?";
                    console.log(`SEND help message to ${recipientId}`);
                    return messageSender.sendTextMessage(recipientId, msg)
                        .then(() => {
                            return request.context;
                        });
                }

            }, (error) => {
                console.log(`ERROR in sendHelpMessage: ${error}`);
            });
    },
    search(request) {
        return getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;

                messageSender.sendTypingMessage(recipientId);

                let entities = request.entities;
                let context = request.context;
                return new Promise((resolve, reject) => {
                    if ('search_query' in entities) {

                        let keywords = [];
                        entities.search_query.forEach((query) => {
                            keywords.push(query.value);
                        });
                        keywords = keywords.join(' ');

                        console.log(`SEARCH: ${keywords}`);
                        searchQueryDAO.addItem(recipientId, keywords);

                        return amazon.itemSearch(keywords)
                            .then((json) => {
                                context.items = json;
                                delete context.missing_keywords;
                                return resolve(context);
                            });
                    } else {
                        context.missing_keywords = true;
                        delete context.items;
                        return resolve(context);
                    }
                });

            }, (error) => {
                console.log(`ERROR in search action: ${error}`);
            });
    },
    sendSearchResults(request) {
        return getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;

                messageSender.sendTypingMessage(recipientId);

                if (recipientId) {
                    console.log(`SEND LIST OF ITEMS`);
                    const items = request.context.items;
                    return messageSender.sendSearchResults(recipientId, items)
                        .then(() => {
                            delete request.context.items;
                            return request.context;
                        });
                }

            }, (error) => {
                console.log(`ERROR in sendSearchResults action: ${error}`);
            });
    },
    stopSelectingVariations(request) {
        return new Promise((resolve, reject) => {
            let context = request.context;
            delete context.selectedVariations;
            delete context.parentASIN;
            return resolve(context);
        });
    },
    resetVariations(request) {
        return getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;

                messageSender.sendTypingMessage(recipientId);

                return new Promise((resolve, reject) => {
                    let context = request.context;
                    context.selectedVariations = [];

                    return amazon.variationPick(context.parentASIN, context.selectedVariations, null)
                        .then((result) => {
                            return messageSender.sendVariationSelectionPrompt(recipientId, result)
                                .catch((error) => {
                                    console.log(`ERROR sending variation prompt: ${error}`);
                                });
                        }, (error) => {
                            console.log(`ERROR sending variation prompt: ${error}`);
                        })
                        .then(() => {
                            return resolve(context);
                        });
                });
            });
    }
};

const witClient = new Wit({
    accessToken: WIT_TOKEN,
    actions: actions,
    logger: new log.Logger(log.INFO)
});

/**
 * message: message sent by sender
 * sender: uid of sender
 * msgSender: messaging platform specific message sender
 */
module.exports.handler = (message, sender, msgSender) => {
    return getSessionIdFromUserId(sender)
        .then((session) => {

            console.log(`SESSION: ${JSON.stringify(session)}`);

            messageSender = msgSender;

            let uid = session.uid;
            let sessionId = session.sessionId;
            let context = session.context;

            if (message.content.action === 'text') {

                // Handle text messages from the user
                let text = message.content.payload;
                console.log(`user sent a text message: ${text}`);
                return witClient.runActions(sessionId, text, context)
                    .then((ctx) => {
                        return updateContext(uid, ctx);
                    }, (error) => {
                        console.log(`ERROR during runActions: ${error}`);
                    });

            } else if (message.content.action === 'postback') {

                // Handle button presses and quick replies
                let payload = JSON.parse(message.content.payload);
                console.log(`POSTBACK: ${JSON.stringify(payload)}`);

                if (payload.METHOD === "SELECT_VARIATIONS") {
                    // User pressed "Select Options" button after getting search results
                    context.parentASIN = payload.ASIN;
                    return actions.resetVariations(session)
                        .then((ctx) => {
                            return updateContext(uid, ctx);
                        }, (error) => {
                            console.log(`ERROR beginning variation selection: ${error}`);
                        });

                } else if (payload.METHOD === "VARIATION_PICK") {
                    // User selected a variation from a quickreply prompt
                    if (payload.VARIATION_VALUE === "Nevermind") {
                        // Stop selecting variations
                        return actions.stopSelectingVariations(session)
                            .then((ctx) => {
                                return updateContext(uid, ctx);
                            }, (error) => {
                                console.log(`ERROR quitting variation selection: ${error}`);
                            });
                    } else {
                        // Add selection to user's context and send next prompt

                        messageSender.sendTypingMessage(uid);

                        context.selectedVariations.push(payload.VARIATION_VALUE);
                        return updateContext(uid, context)
                            .then(() => {
                                return amazon.variationPick(context.parentASIN, context.selectedVariations, null)
                                    .then((result) => {
                                        return messageSender.sendVariationSelectionPrompt(uid, result);
                                    }, (error) => {
                                        console.log(`ERROR sending next variation prompt: ${error}`);
                                    });
                            }, (error) => {
                                console.log(`ERROR selecting variation: ${error}`);
                            });
                    }

                } else if (payload.METHOD === "ITEM_DETAILS") {
                    // User selected the last variation, add it to their context and send summary

                    messageSender.sendTypingMessage(uid);

                    context.selectedVariations.push(payload.VARIATION_VALUE);
                    return amazon.variationPick(context.parentASIN, context.selectedVariations, null)
                        .then((product) => {
                            console.log(`Specific product after variation selection: ${JSON.stringify(product)}`);
                            return amazon.createCart(product.ASIN, 1)
                                .then((cartUrl) => {
                                    let modifiedUrl = `${config.CART_REDIRECT_URL}?uid=${uid}&cart_url=${cartUrl}&ASIN=${product.ASIN}`;
                                    console.log('URL WE WANT ' + modifiedUrl);
                                    product.cartUrl = modifiedUrl;
                                    product.parentASIN = context.parentASIN;
                                    return messageSender.sendVariationSummary(uid, product)
                                        .catch((error) => {
                                            console.log(`ERROR sending product summary: ${error}`);
                                        });
                                }, (error) => {
                                    console.log(`ERROR creating cart after variation selection: ${error}`);
                                });
                        })
                        .then(() => {
                            return actions.stopSelectingVariations(session)
                                .then((ctx) => {
                                    return updateContext(uid, ctx);
                                });
                        });

                } else if (payload.METHOD === "RESELECT") {
                    // User wants to reselect the variations
                    context.parentASIN = payload.ASIN;
                    return actions.resetVariations(session)
                        .then((ctx) => {
                            return updateContext(uid, ctx);
                        }, (error) => {
                            console.log(`ERROR resetting selected variations: ${error}`);
                        });

                } else {
                    console.log("Unsupported postback method");
                }

            }

        }, (error) => {
            console.log(`ERROR retrieving session from database: ${error}`);
        });
};