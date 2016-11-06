'use strict';

let amazon = require('amazon');
let userProfiler = require('user-profiler');

let Wit = require('node-wit').Wit;
let log = require('node-wit').log;

// database access objects
let searchQueryDAO = require('database').searchQueryDAO;
let sessionsDAO = require('database').sessionsDAO;

const config = require('./../../config');
const WIT_TOKEN = config.WIT_TOKEN;
const ASSOCIATE_TAG = config.AWS_TAG;

// Store messageSender in a variable accessible by the Wit actions
let messageSender;

/**
 * Performs either simple item search or item recommendation based on user's context
 * @param context Current context object for the user
 */
let performSearch = (context, uid) => {
    let keywords = context.keywords;
    let recommendPipeline = context.recommend;
    let queryParams = context.query_params;
    let recommendFilter = queryParams.recommend;

    if (recommendPipeline !== undefined || recommendFilter !== undefined) {
        // perform item recommendation
        console.log('Execute item recommendation');
        queryParams.keywords = keywords;
        return userProfiler.preferenceSearch(uid, 'fb', queryParams);
    } else {
        // perform simple item search
        console.log('Execute simple item search');
        return amazon.itemSearch(keywords, queryParams);
    }
}

const actions = {
    send(request, response) {
        return sessionsDAO.getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;

                if (recipientId) {
                    const msg = response.text;
                    let quickreplies = response.quickreplies;
                    if (quickreplies !== undefined) {
                        quickreplies = quickreplies.map(text => {
                            return {
                                text: text,
                                payload: text
                            };
                        });
                    }
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

                        console.log('User wants a simple search');

                        context.run_search = true;
                        delete context.recommend;
                        delete context.missing_keywords;
                        delete context.missing_search_intent;
                    } else if ('intent' in entities && entities.intent[0].value === 'recommend') {
                        // Recommendation intent AND keywords -> perform recommendation

                        console.log('User wants a recommendation');

                        context.run_search = true;
                        context.recommend = true;
                        delete context.missing_keywords;
                        delete context.missing_search_intent;
                    } else {
                        // Keywords but no search intent -> confirm desire to search
                        context.missing_search_intent = true;
                        delete context.run_search;
                        delete context.recommend;
                        delete context.missing_keywords;
                    }
                } else {
                    // Search or recommendation intent but no keywords -> ask for keywords
                    context.missing_keywords = true;

                    // Toggle flag for recommendation if needed
                    if ('intent' in entities && entities.intent[0].value === 'recommend') {
                        context.recommend = true;
                    }

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
                delete context.query_params;
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
                context.query_params = {};

                return new Promise((resolve, reject) => {
                    // Log search event
                    // todo: add this into promise chain below
                    searchQueryDAO.addItem(recipientId, keywords);

                    return performSearch(context, recipientId)
                        .then((result) => {
                            context.items = result.Items;
                            context.bins = amazon.topRelevantSearchIndices(result, 4);
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
    sendAddFilterPrompt(request) {
        return sessionsDAO.getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;
                let context = request.context;
                if (recipientId) {
                    const quickreplies = context.bins.map(bin => {
                        return {
                            text: bin.name.slice(0, 20),
                            payload: JSON.stringify({
                                METHOD: "ADD_FILTER",
                                params: bin.params
                            })
                        };
                    });

                    let prompt = context.bins[0].params[0].type === "SearchIndex" ? "Keep looking under" : "Add a filter";
                    return messageSender.sendTextMessage(recipientId, prompt, quickreplies)
                        .then(() => {
                            delete context.bins;
                            return context;
                        })
                }
            }, (error) => {
                console.log(`ERROR in sendAddFilterPrompt action: ${error}`);
            })
    },
    sendFilterByPrompt(request) {
        return sessionsDAO.getSessionFromSessionId(request.sessionId)
            .then((session) => {
                let recipientId = session.uid;
                let context = request.context;
                if (recipientId) {
                    let quickreplies = context.filters.map(filter => {

                        return {
                            text: filter.name === "Subject" ? "Category" : filter.name,
                            payload: JSON.stringify({
                                METHOD: "FILTER_BY",
                                filter: filter.name,
                                bins: filter.bins
                            })
                        };
                    });

                    // Add 'Personal Filter' option ONLY when user not in recommendation pipeline
                    // and if they haven't chosen this filter before
                    if (context.recommend === undefined && context.query_params.recommend === undefined) {
                        quickreplies.push({
                            text: 'Personal Filter',
                            payload: JSON.stringify({
                                METHOD: "ADD_FILTER",
                                params: [{
                                    type: 'recommend',
                                    value: true
                                }]
                            })
                        });
                    }

                    quickreplies.push({
                        text: 'Clear Filters',
                        payload: JSON.stringify({
                            METHOD: "CLEAR_FILTERS"
                        })
                    });
                    return messageSender.sendTextMessage(recipientId, "Choose a type of filter", quickreplies)
                        .then(() => {
                            delete context.filters;
                            return context;
                        })
                }
            }, (error) => {
                console.log(`ERROR in sendFilterByPrompt action: ${error}`);
            })
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
                                let itemLink = `http://amazon.com/dp/${context.parentASIN}/?tag=${ASSOCIATE_TAG}`;
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

            //console.log(`SESSION before handler: ${JSON.stringify(session)}`);

            messageSender = msgSender;

            let uid = session.uid;
            let sessionId = session.sessionId;
            let context = session.context;

            if (message.content.action === 'text') {
                // Handle text messages from the user
                let text = message.content.payload;
                //console.log(`MESSAGE: ${text}`);

                return witClient.runActions(sessionId, text, context)
                    .then((ctx) => {
                        if (ctx.not_understood !== undefined) {
                            // handle misunderstood messages
                            delete ctx.not_understood;
                            messageSender.sendTypingMessage(uid);
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
                //console.log(`POSTBACK: ${JSON.stringify(payload)}`);

                if (payload.METHOD === "GET_STARTED") {
                    // User selected the 'Get Started' button on first conversation initiation
                    return actions.sendHelpMessage(session)
                        .then((success) => {
                            console.log(`CONVERSATION INITIATED with ${sessionId}`);
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
                            return amazon.createCart(product.ASIN, 1)
                                .then((cart) => {
                                    let cartUrl = cart.url;
                                    let isCart = '1';
                                    let redirectUrl = cartUrl;

                                    // If the cart wasn't created, the purchase link should send them to the Amazon page for the specific item
                                    if (cartUrl === undefined) {
                                        isCart = '0';
                                        redirectUrl = `http://amazon.com/dp/${product.parentASIN}/?tag=${ASSOCIATE_TAG}`;
                                    }

                                    let modifiedUrl = `${config.CART_REDIRECT_URL}?user_id=${uid}&redirect_url=${redirectUrl}&ASIN=${product.ASIN}&is_cart=${isCart}`;

                                    // Send variations summary with cart redirect url
                                    product.purchaseUrl = modifiedUrl;
                                    product.price = cart.price || product.price;
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
                    // User wants to see the items related to a specific item based on other user's purchases

                    messageSender.sendTypingMessage(uid);

                    return amazon.similarityLookup(payload.ASIN)
                        .then((result) => {
                            context.items = result.Items;
                            return actions.sendSearchResults(session)
                                .then((ctx) => null);
                        });

                } else if (payload.METHOD === "FILTER_BY") {
                    // User wants to filter by either "Brand Name", "Price Range", "Subject", or "Percent Off"
                    // Send the bins available under that filter

                    context.bins = payload.bins;
                    return actions.sendAddFilterPrompt(session)
                        .then((ctx) => null);

                } else if (payload.METHOD === "ADD_FILTER") {
                    /* User selected a new filter
                     * 
                     * Filters are either
                     *      - a search index
                     *      - a bin under the filter categories (see above)
                     */
                    messageSender.sendTypingMessage(uid);

                    // Add the bin parameters to the search query
                    let params = context.query_params;
                    payload.params.forEach(param => {
                        (params[param.type] = params[param.type] || []).push(param.value);
                    });

                    // Run query with updated parameters
                    return performSearch(context, uid)
                        .then((result) => {
                            context.items = result.Items;
                            return actions.sendSearchResults(session)
                                .then((ctx) => {
                                    context = ctx;
                                    session.context = context;

                                    context.filters = amazon.getFilterInfo(result);
                                    return actions.sendFilterByPrompt(session)
                                        .then((ctx2) => {
                                            return sessionsDAO.updateContext(uid, ctx2);
                                        });
                                });
                        });

                } else if (payload.METHOD === "CLEAR_FILTERS") {
                    // User wants to clear all the fiters they have selected up to this point including the search index

                    messageSender.sendTypingMessage(uid);

                    context.query_params = {};
                    return performSearch(context, uid)
                        .then((result) => {
                            context.items = result.Items;
                            return actions.sendSearchResults(session)
                                .then((ctx) => {
                                    context = ctx;
                                    session.context = context;

                                    context.bins = amazon.topRelevantSearchIndices(result, 4);
                                    return actions.sendAddFilterPrompt(session)
                                        .then((ctx2) => {
                                            return sessionsDAO.updateContext(uid, ctx2);
                                        });
                                });
                        });

                } else {
                    console.log(`Unsupported postback method: ${payload.METHOD}`);
                }

            }

        }, (error) => {
            console.log(`ERROR retrieving session from database: ${error}`);
        });
};