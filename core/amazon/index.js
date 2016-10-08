/**
 * Created by cse498 on 10/1/16.
 */
'use strict';

var amazon_api = require("amazon-product-api");
var config = require('./../../config');
var amazon_client = amazon_api.createClient({
    awsId: config.AWS_ID,
    awsSecret: config.AWS_SECRET,
    awsTag: "evanm-20"
});

var amazonProduct = {
    itemSearch: function(keywords) {
        return amazon_client.itemSearch({
            "searchIndex": "All",
            "keywords": keywords,
            "responseGroup": ["ItemIds", "ItemAttributes", "Images", "OfferSummary"]
        }).then((result) => {

            var promiseArray = [];
            for (var itemIdx = 0; itemIdx < res.length; itemIdx++) {
                let curItem = res[itemIdx];
                //When item has ParentASIN and ParentASIN not same as ASIN, which means has options
                if (curItem["ParentASIN"] !== undefined &&
                    curItem["ParentASIN"].length > 0 &&
                    curItem["ASIN"] !== undefined &&
                    curItem["ASIN"] != curItem["ParentASIN"]) {
                    
                    console.log(`Item #${itemIdx}:${curItem.ASIN} has variations`);
                    curItem["HasVariations"] = true;
                }
                //When item doesn't have ParentASIN, which means has no options
                else if (curItem["ASIN"] !== undefined && curItem["ASIN"].length > 0) {
                    console.log(`Item #${itemIdx}:${curItem.ASIN} has no variations`);
                    //Build virtual cart here
                    promiseArray.push(amazonProduct.createCart(curItem["ASIN"], 1)
                        .then((url) => {
                            if (url === undefined) {
                                url = curItem.DetailPageURL[0];
                            }
                            curItem["CartUrl"] = url;
                        }));
                } else {
                    // *** ERROR *** no ASIN
                    console.log(`Item #${itemIdx} has no ASIN: `, JSON.stringify(curItem, null, 2));
                    curItem["CartUrl"] = "https://amazon.com";
                }
            }
            return Promise.all(promiseArray).then(() => {
                console.log('Done getting/building item search response');
                return res;
            });
        }, (error) => {
            console.log(`ERROR searching for items on Amazon: ${error}`);
        });
    },

    createCart: function(ASIN, quantity) {
        return amazon_client.cartCreate({
            "Item.1.ASIN": ASIN,
            "Item.1.Quantity": quantity
        }).then(function(res) {
            if (res.CartItems !== undefined && res.CartItems.length > 0) {
                if (res.PurchaseURL !== undefined) {
                    console.log(`${ASIN} cart url: ${res.PurchaseURL[0]}`);
                    return res.PurchaseURL[0];
                }
            }
        }, function(err) {
            // *** ERROR *** something bad happend when creating a temp cart... handle this better
            console.log(`ERROR creating cart for ${ASIN}`);
            return 'https://amazon.com';
        });
    },

    variationPick: function(ASIN, variationValues, variationMap){
        var message = {
            text: "Pick a ",
            quick_replies: []
        };

        return new Promise(function(resolve, reject){
            return new Promise(function(inResolve, inReject){
                if(variationMap === null){
                    variationFind(ASIN).then(
                        function(res){
                            inResolve(res);
                        },function(err){
                            inReject(err);
                        }
                    );
                }else{
                    inResolve(variationMap);
                }
            }).then(function(json) {
                //console.log("JSON:", JSON.stringify(json, null, 2));
                var variationKeys = json.variationKeys;
                var map = json.map
                //console.log("resolve variationKeys:", JSON.stringify(variationKeys, null, 2));
                //console.log("resolve map:", JSON.stringify(map, null, 2));
                for (var i = 0; i < variationValues.length; i++) {
                        map = map[variationValues[i]];
                    }
                    if (variationValues.length === variationKeys.length) {
                        if (map.ASIN !== undefined) {
                            //GET INTO LAST LEVEL
                            //CALL VARIATION DETEAIL FOR MORE DATA
                            //itemDetail(ASIN, recipientId, callback);
                        }else{
                            rejct("ITEM WITHOUT ASIN");
                        }
                    } else {
                        resolve({
                            ASIN : ASIN,
                            variationKey : variationKeys[variationValues.length],
                            variationOptions : variationValues.length+1 == variationKeys.length ? map : Object.keys(map),
                            lastVariation : variationValues.length+1 == variationKeys.length ? true : false
                        });
                        // var curVariation = variationKeys[variationValues.length];
                        // if(Object.keys(map).length >= 10){
                        //     resolve({
                        //         text: "Too Much options"
                        //     });
                        // }else{
                        //     message.text += curVariation;
                        //
                        //     var payload = {
                        //         "METHOD": "VARIATION_PICK",
                        //         "ASIN": ASIN,
                        //         "VARIATION_VALUE": variationValues
                        //     };
                        //
                        //     for (var key of Object.keys(map)) {
                        //         payload.VARIATION_VALUE.push(key);
                        //         message.quick_replies.push({
                        //             "content_type": "text",
                        //             //"content-type": "postback",
                        //             "title": key,
                        //             "payload": JSON.stringify(payload)
                        //         });
                        //         payload.VARIATION_VALUE.pop();
                        //     }
                        //     resolve(message);
                        // }
                    }
            }, function(err) {
                reject(err);
            });
        });
    },

    variationFind : function(ASIN) {
        return new Promise(function(resolve, reject){
            amazon_client.itemLookup({
                "ItemId": ASIN,
                "IdType": "ASIN",
                "ResponseGroup": ["Variations","VariationOffers"]
            }).then(function(res) {
                //console.log("VARIATION_FIND:", JSON.stringify(res, null, 2));
                if (res[0]["Variations"] !== undefined && res[0]["Variations"].length > 0 &&
                    res[0]["Variations"][0]["VariationDimensions"] !== undefined &&
                    res[0]["Variations"][0]["VariationDimensions"].length > 0 &&
                    res[0]["Variations"][0]["VariationDimensions"][0]["VariationDimension"] != undefined &&
                    res[0]["Variations"][0]["VariationDimensions"][0]["VariationDimension"].length > 0) {

                    var map = {};
                    var variationKeys = res[0].Variations[0].VariationDimensions[0].VariationDimension;

                    if (res[0].Variations[0].Item !== undefined && res[0].Variations[0].Item.length > 0) {
                        var items = res[0].Variations[0].Item;
                        for (var idx = 0; idx < items.length; ++idx) {
                            var item = items[idx];
                            var ref = map;
                            if (item["ItemAttributes"] !== undefined && item["ItemAttributes"].length > 0) {
                                var itemAttributes = item["ItemAttributes"][0];
                                for (var variationIdx in variationKeys) {
                                    var variation = variationKeys[variationIdx];
                                    var value = itemAttributes[variation][0];
                                    if (!(value in ref)) {
                                        if (variationIdx == variationKeys.length - 1) {
                                            ref[value] = {
                                                "ASIN": item.ASIN[0],
                                                "Image:": item.LargeImage[0].URL[0],
                                                "Price" : item.Offers && item.Offers[0] && item.Offers[0].Offer
                                                && item.Offers[0].Offer[0] && item.Offers[0].Offer[0].OfferListing
                                                && item.Offers[0].Offer[0].OfferListing[0]
                                                && item.Offers[0].Offer[0].OfferListing[0].Price
                                                && item.Offers[0].Offer[0].OfferListing[0].Price[0]
                                                && item.Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice
                                                && item.Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0]
                                            }
                                        } else {
                                            ref[value] = {};
                                            ref = ref[value];
                                        }
                                    } else {
                                        ref = ref[value];
                                    }
                                }
                            }
                        }
                        resolve({
                            variationKeys: variationKeys,
                            map: map
                        });
                    } else {
                        console.log("This item no Variatios item is empty")
                    }
                } else {
                    console.log("This item no Variatios")
                }
            }, function(err) {
                console.log("ERROR in variationFind:", JSON.stringify(err, null, 2));
            });
        })
    }
};




module.exports = amazonProduct;
