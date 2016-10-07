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
     * @param variation_array [{ title:'sfsd', payload: 'sadfsdaf'}]
     */
    sendVariationSelectionPrompt: function (recipient_id, text_message, variation_array) {
        let quick_replies = [];
        variation_array.forEach((variation)=> {
            let reply = {
                content_type: 'text',
                title: variation.title,
                payload: variation.payload
            };

            quick_replies.push(reply);
        });

        let json = {
            recipient: {id: recipient_id},
            message: {
                text: text_message, //Possibly customize this later..?
                quick_replies: quick_replies
            }
        };

        return callSendAPI(json);
    },

    /**
     *
     * @param recipient_id
     * @param api_results_json [{title, image_url, price, cart_url},{},..]
     */
    sendLastVariationSelectionPrompt: function (recipient_id, api_results_json) {
        let elements = [];

        // For now we are returning 10 products, can change this to limit min {max_items, 5}
        api_results_json.forEach(function (product) {
            var element = {};
            element.title = product && product.ItemAttributes[0] && product.ItemAttributes[0].Title[0];
            element.item_url = product && product.DetailPageURL[0];
            element.subtitle = product && product.OfferSummary && product.OfferSummary[0] &&
                product.OfferSummary[0].LowestNewPrice && product.OfferSummary[0].LowestNewPrice[0].FormattedPrice[0];
            element.buttons = [{
                type: "web_url",
                url: product.CartUrl,
                title: "Purchase"
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
     * @param product_json
     * @param variation_obj
     */
    sendVariationSummary: function (recipient_id, product_json, variation_obj) {
        var elements = [];

        // For now we are returning 10 products, can change this to limit min {max_items, 5}
        var element = {};
        element.title = product && product.ItemAttributes[0] && product.ItemAttributes[0].Title[0];
        element.item_url = product && product.DetailPageURL[0];
        element.image_url = product && product.LargeImage && product.LargeImage[0] && product.LargeImage[0].URL[0];
        element.subtitle = product && product.OfferSummary && product.OfferSummary[0] &&
            product.OfferSummary[0].LowestNewPrice && product.OfferSummary[0].LowestNewPrice[0].FormattedPrice[0];
        if (product.HasVariations) {
            element.buttons = [{
                type: "web_url",
                url: "https://cse.msu.edu",
                title: "Select Options"
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

    sendGenericTemplateMessage: function (recipient_id, api_results_json) {

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
                    type: "web_url",
                    url: "https://cse.msu.edu",
                    title: "Select Options"
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
