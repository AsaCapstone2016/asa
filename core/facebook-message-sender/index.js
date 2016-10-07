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
                    payload: {
                        METHOD: "SELECT_VARTIONS",
                        ASIN: product.ParentASIN
                    }
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
        if (variation_results.lastVariation) {
            return sendLastVariationSelectionPrompt(recipient_id, variation_results);
        }

        let quick_replies = [];

        variation_results.variationOptions.forEach((variation)=> {
            let payload = {
                METHOD: "VARIATION_PICK",
                ASIN: variation_results.ASIN,
                VARIATION_VALUE: variation
            };

            let reply = {
                content_type: 'text',
                title: variation,
                payload: payload
            };

            quick_replies.push(reply);
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
        variation_results.variationOptions.forEach(function (variation,product) {
            let payload = {
                METHOD: "ITEM_DETAILS",
                ASIN: product.ASIN
            };

            var element = {};
            element.title = variation;
            element.item_url = product.image_url;
            element.subtitle = product.price;
            element.buttons = [{
                type: "postback",
                title: "Select",
                payload: payload
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
     * @param recipient_id
     * @param product the single result that we are looking up. { title, image_url (LARGE), variation_arry,cart_url, price }
     */
    sendVariationSummary: function (recipient_id, product) {
        var elements = [];

        // For now we are returning 10 products, can change this to limit min {max_items, 5}
        var element = {};
        element.title = product.title;
        element.item_url = product.cart_url;
        element.image_url = product.cart_url;
        element.subtitle = product.price;

        element.buttons = [{
            type: "web_url",
            url: product.cart_url,
            title: "Purchase"
        }, {
            type: 'postback',
            title: 'ReSelect',
            payload: {
                METHOD: 'RESELECT',
                ASIN: 'test' //put parent asin here?
            }
        }];


        elements.push(element);

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
    }
};

function callSendAPI(messageData) {

    console.log(config.FB_PAGE_TOKEN);
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
            console.log(json);
        });
}

module.exports = facebookMessageSender;
