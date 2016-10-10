'use strict';

var fetch = require('node-fetch');
var config = require('./../../config');

var facebookMessageSender = {

    //Input : {
    //          recipientId: ID of person to send message to.
    //          text: message of text
    //        }
    sendTextMessage: function (recipient_id, message) {
        var json = {
            recipient: {
                id: recipient_id
            },
            message: {
                text: message
            }
        };
        return callSendAPI(json);
    },

    sendTypingMessage: function (recipient_id) {
        var typingJson = {
            recipient: {
                id: recipient_id
            },
            sender_action: "typing_on"
        };

        return callSendAPI(typingJson);
    },

    /**
     *
     * @param recipient_id
     * @param api_results_json this is the results object taken from product api
     */
    sendSearchResults: function (recipient_id, api_results_json) {

        var elements = [];

        // For now we are returning 10 products, can change this to limit min {max_items, 5}
        api_results_json.forEach(function (product) {
            var element = {};
            element.title = product && product.ItemAttributes[0] && product.ItemAttributes[0].Title[0];
            element.item_url = product && product.DetailPageURL[0];
            element.image_url = product && product.LargeImage && product.LargeImage[0] && product.LargeImage[0].URL[0];
            element.subtitle = product && product.OfferSummary && product.OfferSummary[0] &&
                product.OfferSummary[0].LowestNewPrice && product.OfferSummary[0].LowestNewPrice[0].FormattedPrice[0];
            if (product.HasVariations) {
                element.buttons = [{
                    type: 'postback',
                    title: "Select Options",
                    payload: JSON.stringify({
                        METHOD: "SELECT_VARIATIONS",
                        ASIN: product.ParentASIN[0]
                    })
                }]
            }
            else {
                element.buttons = [{
                    type: "web_url",
                    url: product.CartUrl,
                    title: "Purchase"
                }];
            }

            elements.push(element);
        });

        var json = {
            recipient: {id: recipient_id},
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: elements
                    }
                }
            }
        };

        return callSendAPI(json);
    },

    /**
     *
     * @param recipient_id
     * @param variation_array [{ title:'sfsd', ASIN: asin }]
     */
    sendVariationSelectionPrompt: function (recipient_id, variation_results) {
        console.log(`SEND variation prompt: ${JSON.stringify(variation_results)}`);
        if (variation_results.lastVariation) {
            return facebookMessageSender.sendLastVariationSelectionPrompt(recipient_id, variation_results);
        }

        let quick_replies = [];

        variation_results.variationOptions.forEach((variation)=> {
            let payload = {
                METHOD: "VARIATION_PICK",
                ASIN: variation_results.ASIN,
                VARIATION_VALUE: variation
            };
            let text = variation.length <= 20 ? variation : variation.substring(0, 20);
            let reply = {
                content_type: 'text',
                title: text,
                payload: JSON.stringify(payload)
            };

            quick_replies.push(reply);
        });

        if (quick_replies.length > 9) {
            quick_replies = quick_replies.slice(0, 9);
        }

        quick_replies.push({
            content_type: 'text',
            title: 'Nevermind',
            payload: JSON.stringify({
                METHOD: 'VARIATION_PICK',
                VARIATION_VALUE: 'Nevermind'
            })
        });

        let json = {
            recipient: {id: recipient_id},
            message: {
                text: `Select a ${variation_results.variationKey}`,
                quick_replies: quick_replies
            }
        };

        return callSendAPI(json);
    },

    /**
     *
     * @param recipient_id
     * @param api_results_json [{title, image_url, price, ASIN},{},..]
     */
    sendLastVariationSelectionPrompt: function (recipient_id, variation_results) {
        let elements = [];

        // For now we are returning 10 products, can change this to limit min {max_items, 5}
        facebookMessageSender.sendTextMessage(recipient_id, 'Select a ' + variation_results.variationKey);
        let variations = variation_results.variationOptions;
        Object.keys(variations).forEach(function (option) {
            let product = variations[option]
            let payload = {
                METHOD: "ITEM_DETAILS",
                ASIN: product.ASIN,
                VARIATION_VALUE: option
            };

            var element = {};
            element.title = option;
            element.image_url = product.image;
            element.subtitle = product.price;
            element.buttons = [{
                type: "postback",
                title: "Select",
                payload: JSON.stringify(payload)
            }];

            elements.push(element);
        });

        var json = {
            recipient: {id: recipient_id},
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: elements
                    }
                }
            }
        };

        return callSendAPI(json);
    },

    /**
     *
     * @param recipientId
     * @param product the single result that we are sending. { parentTitle, imageUrl (LARGE), variationNames,
     * variationValues, cartUrl, price }
     */
    sendVariationSummary: function (recipientId, product) {
        console.log(`Product to summarize: ${JSON.stringify(product)}`);
        var elements = [];

        var element = {};
        element.title = `${product.parentTitle} - ${product.price}`;
        element.item_url = product.cartUrl;
        element.image_url = product.image;
        var variationSummary = '';
        for (var i = 0; i < product.variationNames.length; i++) {
            variationSummary += `${product.variationNames[i]}: ${product.variationValues[i]}\n`;
        }
        element.subtitle = variationSummary;

        element.buttons = [{
            type: "web_url",
            url: product.cartUrl,
            title: "Purchase"
        }, {
            type: 'postback',
            title: 'Reselect Options',
            payload: JSON.stringify({
                METHOD: 'RESELECT',
                ASIN: product.parentASIN
            })
        }];


        elements.push(element);

        var json = {
            recipient: {id: recipientId},
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: elements
                    }
                }
            }
        };

        return callSendAPI(json);
    }
};

function callSendAPI(messageData) {
    console.log(`messageData: ${JSON.stringify(messageData)}`);

    var qs = 'access_token=' + encodeURIComponent(config.FB_PAGE_TOKEN);

    return fetch('https://graph.facebook.com/v2.6/me/messages?' + qs, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(messageData)
    })
        .then(function (rsp) {
            return rsp.json();
        })
        .then(function (json) {
            if (json.error && json.error.message) {
                throw new Error(json.error.message);
            }
            //console.log(json);
        });
}

module.exports = facebookMessageSender;
