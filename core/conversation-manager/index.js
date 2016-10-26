'use strict';

let amazon = require('amazon');

let Wit = require('node-wit').Wit;
let log = require('node-wit').log;

// database access objects
let searchQueryDAO = require('database').searchQueryDAO;
let sessionsDAO = require('database').sessionsDAO;

const config = require('./../../config');
const WIT_TOKEN = config.WIT_TOKEN;

// Store messageSender in a variable accessible by the Wit actions
let messageSender;

const actions = {
    send(request, response) {
        return sessionsDAO.getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;

                if (recipientId) {
                    const msg = response.text;
                    const quickreplies = response.quickreplies;
                    console.log(`SEND "${msg}" to ${recipientId}`);
                    console.log(`With quick replies: ${JSON.stringify(quickreplies)}`);
                    return messageSender.sendTextMessage(recipientId, msg, quickreplies)
                        .then(() => null);
                }

            }, (error) => {
                console.log(`ERROR in send action: ${error}`);
            });
    },
    sendHelpMessage(request) {
        return sessionsDAO.getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;

                if (recipientId) {
                    let msg = "Hi! Think of me as your personal shopping assistant.";
                    msg += " I can help you discover and purchase items on Amazon.";
                    msg += " Try saying...\n\n";
                    msg += " • I want to buy something\n";
                    msg += " • Can you find Ocarina of Time?";
                    console.log(`SEND help message to ${recipientId}`);
                    return messageSender.sendTextMessage(recipientId, msg)
                        .then(() => {
                            return request.context;
                        });
                }
            });
    },
    checkQuery(request) {
        return actions.storeKeywords(request)
            .then((context) => {
                delete context.no_keywords;
                let entities = request.entities;

                if ('keywords' in context) {
                    if ('intent' in entities && entities.intent[0].value === 'search') {
                        // Search intent AND keywords -> perform search
                        context.run_search = true;
                        delete context.missing_keywords;
                        delete context.missing_search_intent;
                    } else {
                        // Keywords but no search intent -> confirm desire to search
                        context.missing_search_intent = true;
                        delete context.run_search;
                        delete context.missing_keywords;
                    }
                } else {
                    // Search intent but no keywords -> ask for keywords
                    context.missing_keywords = true;
                    delete context.run_search;
                    delete context.missing_search_intent;
                }
                return context;
            }, (error) => {
                console.log(`ERROR in checkQuery: ${error}`);
            });
    },
    storeKeywords(request) {
        return new Promise((resolve, reject) => {
            let entities = request.entities;
            let context = request.context;

            // If the context has the missing_keywords flag, delete it
            delete context.missing_keywords;

            if ('search_query' in entities) {
                // Grab the keywords
                let keywords = [];
                entities.search_query.forEach((keyword) => {
                    keywords.push(keyword.value);
                });
                context.keywords = keywords.join(' ');
                context.run_search = true;
                delete context.no_keywords;
            } else {
                // No keywords found
                context.no_keywords = true;
                delete context.keywords;
                delete context.run_search;
            }
            return resolve(context);
        })
    },
    confirmSearch(request) {
        return new Promise((resolve, reject) => {
            let context = request.context;
            context.run_search = true;
            delete context.missing_search_intent;
            return resolve(context);
        });
    },
    search(request) {
        return sessionsDAO.getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;

                messageSender.sendTypingMessage(recipientId);

                let entities = request.entities;
                let context = request.context;
                const keywords = context.keywords;
                return new Promise((resolve, reject) => {
                    console.log(`SEARCH: ${keywords}`);
                    // Log search event
                    searchQueryDAO.addItem(recipientId, keywords);
                    // Search Amazon with keywords
                    return amazon.itemSearch(keywords)
                        .then((json) => {
                            context.items = json;
                            delete context.run_search;
                            delete context.missing_search_intent;
                            return resolve(context);
                        });
                });

            }, (error) => {
                console.log(`ERROR in search action: ${error}`);
            });
    },
    sendSearchResults(request) {
        return sessionsDAO.getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;

                messageSender.sendTypingMessage(recipientId);

                let context = request.context;
                const items = context.items;
                if (recipientId) {
                    console.log(`SEND LIST OF ITEMS`);
                    items.forEach((item)=> {
                        let isCart = '0';
                        if (item.cartCreated) {
                            isCart = '1';
                        }
                        item.purchaseUrl = `${config.CART_REDIRECT_URL}?user_id=${recipientId}&redirect_url=${item.purchaseUrl}&ASIN=${item.ASIN}&is_cart=${isCart}`;
                    });
                    return messageSender.sendSearchResults(recipientId, items)
                        .then(() => {
                            delete context.items;
                            return context;
                        });
                }

            }, (error) => {
                console.log(`ERROR in sendSearchResults action: ${error}`);
            });
    },
    stopSearchProcess(request) {
        return sessionsDAO.getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;
                return messageSender.sendTextMessage(recipientId, "Let me know if you need anything else!");
            })
            .then(() => {
                return actions.clearContext(request);
            }, (error) => {
                console.log(`ERROR stopping variation selection: ${error}`);
            })
    },
    resetVariations(request) {
        return sessionsDAO.getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;

                messageSender.sendTypingMessage(recipientId);

                return new Promise((resolve, reject) => {
                    let context = request.context;
                    context.selectedVariations = [];

                    return amazon.variationPick(context.parentASIN, context.selectedVariations, null)
                        .then((result) => {
                            if (result.conversational) {
                                return messageSender.sendVariationSelectionPrompt(recipientId, result)
                                    .catch((error) => {
                                        console.log(`ERROR sending variation prompt: ${error}`);
                                    });
                            } else {
                                // Send message to user explaining they should go to Amazon to select variations
                                let itemLink = `http://asin.info/a/${context.parentASIN}`;
                                delete context.parentASIN;
                                delete context.selectedVariations;
                                return messageSender.outsourceVariationSelection(recipientId, itemLink)
                                    .catch((error) => {
                                        console.log(`ERROR sending outsourcing message for variation selection: ${error}`);
                                    })
                            }
                        }, (error) => {
                            console.log(`ERROR sending variation prompt: ${error}`);
                        })
                        .then(() => {
                            return resolve(context);
                        });
                });
            });
    },
    clearContext(request) {
        return new Promise((resolve, reject) => resolve({}));
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
    return sessionsDAO.getSessionIdFromUserId(sender)
        .then((session) => {

            console.log(`SESSION: ${JSON.stringify(session)}`);

            messageSender = msgSender;

            let uid = session.uid;
            let sessionId = session.sessionId;
            let context = session.context;

            if (message.content.action === 'text') {
                // Handle text messages from the user
                let text = message.content.payload;
                console.log(`MESSAGE content: ${text}`);
                return witClient.runActions(sessionId, text, context)
                    .then((ctx) => {
                        console.log(`UPDATED CONTEXT: ${JSON.stringify(ctx)}`);
                        if (ctx.not_understood !== undefined) {
                            // handle misunderstood messages
                            delete ctx.not_understood;
                            messageSender.sendTypingMessage(uid);
                            console.log(`SEND I don't understand message`);
                            return messageSender.sendTextMessage(uid, "I'm sorry, I don't understand that")
                                .then(sessionsDAO.updateContext(uid, ctx));
                        } else {
                            return sessionsDAO.updateContext(uid, ctx);
                        }
                    }, (error) => {
                        console.log(`ERROR during runActions: ${error}`);
                    });

            } else if (message.content.action === 'postback') {
                // Handle button presses and quick replies
                let payload = JSON.parse(message.content.payload);
                console.log(`POSTBACK: ${JSON.stringify(payload)}`);

                if (payload.METHOD === "GET_STARTED") {
                    // User selected the 'Get Started' button on first conversation initiation
                    return actions.sendHelpMessage(session)
                        .then((success) => {
                            console.log('CONVERSATION INITIATED and help message sent');
                        }, (error) => {
                            console.log(`ERROR sending help message on GET_STARTED: ${error}`);
                        });
                } else if (payload.METHOD === "SELECT_VARIATIONS") {
                    // User pressed "Select Options" button after getting search results
                    context.parentASIN = payload.ASIN;
                    return actions.resetVariations(session)
                        .then((ctx) => {
                            return sessionsDAO.updateContext(uid, ctx);
                        }, (error) => {
                            console.log(`ERROR beginning variation selection: ${error}`);
                        });

                } else if (payload.METHOD === "VARIATION_PICK") {
                    // User selected a variation from a quickreply prompt
                    if (payload.VARIATION_VALUE === "Nevermind") {
                        // Stop selecting variations
                        return actions.stopSelectingVariations(session)
                            .then((ctx) => {
                                return sessionsDAO.updateContext(uid, ctx);
                            }, (error) => {
                                console.log(`ERROR quitting variation selection: ${error}`);
                            });
                    } else {
                        // Add selection to user's context and send next prompt

                        messageSender.sendTypingMessage(uid);

                        context.selectedVariations.push(payload.VARIATION_VALUE);
                        return sessionsDAO.updateContext(uid, context)
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
                                    let isCart = '1';
                                    let redirectUrl = cartUrl;

                                    // If the cart wasn't created, the purchase link should send them to the Amazon page for the specific item
                                    if (cartUrl === undefined) {
                                        isCart = '0';
                                        redirectUrl = `http://asin.info/a/${product.ASIN}`;
                                    }

                                    let modifiedUrl = `${config.CART_REDIRECT_URL}?user_id=${uid}&redirect_url=${redirectUrl}&ASIN=${product.ASIN}&is_cart=${isCart}`;
                                    
                                    // Send variations summary with cart redirect url
                                    console.log('URL WE WANT ' + modifiedUrl);
                                    product.purchaseUrl = modifiedUrl;

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
                                    return sessionsDAO.updateContext(uid, ctx);
                                });
                        });

                } else if (payload.METHOD === "RESELECT") {
                    // User wants to reselect the variations
                    context.parentASIN = payload.ASIN;
                    return actions.resetVariations(session)
                        .then((ctx) => {
                            return sessionsDAO.updateContext(uid, ctx);
                        }, (error) => {
                            console.log(`ERROR resetting selected variations: ${error}`);
                        });

                } else if (payload.METHOD === "SIMILARITY_LOOKUP") {
                    return amazon.similarityLookup(payload.ASIN)
                        .then((items) => {
                            context.items = items;
                            return actions.sendSearchResults(session)
                                .then((ctx) => null);
                        })
                } else {
                    console.log("Unsupported postback method");
                }

            }

        }, (error) => {
            console.log(`ERROR retrieving session from database: ${error}`);
        });
};