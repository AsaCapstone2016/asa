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
            for (var itemIdx = 0; itemIdx < result.length; itemIdx++) {
                let curItem = result[itemIdx];
                //When item has ParentASIN and ParentASIN not same as ASIN, which means has options
                if (curItem.ParentASIN !== undefined &&
                    curItem.ParentASIN.length > 0 &&
                    curItem.ASIN !== undefined &&
                    curItem.ASIN != curItem.ParentASIN) {

                    console.log(`Item #${itemIdx}:${curItem.ASIN} has variations`);
                    curItem.HasVariations = true;
                }
                //When item doesn't have ParentASIN, which means has no options
                else if (curItem.ASIN !== undefined && curItem.ASIN.length > 0) {
                    console.log(`Item #${itemIdx}:${curItem.ASIN} has no variations`);
                    //Build virtual cart here
                    promiseArray.push(amazonProduct.createCart(curItem.ASIN, 1)
                        .then((url) => {
                            if (url === undefined) {
                                url = curItem.DetailPageURL[0];
                            }
                            curItem.CartUrl = url;
                        }));
                } else {
                    // *** ERROR *** no ASIN
                    console.log(`Item #${itemIdx} has no ASIN: `, JSON.stringify(curItem, null, 2));
                    curItem.CartUrl = "https://amazon.com";
                }
            }
            return Promise.all(promiseArray).then(() => {
                console.log('Done getting/building item search response');
                return result;
            });
        }, (error) => {
            console.log(`ERROR searching for items on Amazon: ${error}`);
        });
    },

    createCart: function(ASIN, quantity) {
        return amazon_client.cartCreate({
            "Item.1.ASIN": ASIN,
            "Item.1.Quantity": quantity
        }).then(function(result) {
            if (result.CartItems !== undefined && result.CartItems.length > 0) {
                if (result.PurchaseURL !== undefined) {
                    console.log(`${ASIN} cart url: ${result.PurchaseURL[0]}`);
                    return result.PurchaseURL[0];
                }
            }
        }, function(err) {
            // *** ERROR *** something bad happend when creating a temp cart... handle this better
            console.log(`ERROR creating cart for ${ASIN}`);
            return 'https://amazon.com';
        });
    },

    variationPick: function(ASIN, variationValues, variationMap){
        return new Promise(function(resolve, reject){
            return new Promise(function(inResolve, inReject){
                if (variationMap === null) {
                    amazonProduct.variationFind(ASIN)
                        .then(function(result) {
                            console.log(`got variations map: ${JSON.stringify(result)}`);
                            inResolve(result);
                        }, function(err) {
                            console.log("didn't get variation map...");
                            inReject(err);
                        });
                } else {
                    console.log(`Already have variation map for ${ASIN}`);
                    inResolve(variationMap);
                }
            }).then(function(json) {
                //console.log("JSON:", JSON.stringify(json, null, 2));
                var variationKeys = json.variationKeys;
                var parentTitle = json.parentTitle;
                var map = json.map;
                //console.log("resolve variationKeys:", JSON.stringify(variationKeys, null, 2));
                //console.log("resolve map:", JSON.stringify(map, null, 2));
                for (var i = 0; i < variationValues.length; i++) {
                    map = map[variationValues[i]];
                    //console.log(`Map after idx ${i}: ${JSON.stringify(map)}`);
                }
                if (variationValues.length === variationKeys.length) {
                    if (map.ASIN !== undefined) {
                        // At specific item level... no more variations
                        map.parentTitle = parentTitle;
                        map.variationNames = variationKeys;
                        map.variationValues = variationValues;
                        resolve(map);
                    } else {
                        reject("ITEM WITHOUT ASIN");
                    }
                } else {
                    resolve({
                        ASIN : ASIN,
                        variationKey : variationKeys[variationValues.length],
                        variationOptions : variationValues.length+1 == variationKeys.length ? map : Object.keys(map),
                        lastVariation : variationValues.length+1 == variationKeys.length ? true : false
                    });
                }
            }, function(err) {
                reject(err);
            });
        });
    },

    variationFind: function(ASIN) {
        return amazon_client.itemLookup({
            "ItemId": ASIN,
            "IdType": "ASIN",
            "ResponseGroup": ["ItemAttributes","Variations","VariationOffers"]
        }).then(function(result) {
            //console.log("VARIATION_FIND:", JSON.stringify(result, null, 2));
            if (result[0].Variations !== undefined && result[0].Variations.length > 0 &&
                result[0].Variations[0].VariationDimensions !== undefined &&
                result[0].Variations[0].VariationDimensions.length > 0 &&
                result[0].Variations[0].VariationDimensions[0].VariationDimension != undefined &&
                result[0].Variations[0].VariationDimensions[0].VariationDimension.length > 0) {

                var map = {};
                var variationKeys = result[0].Variations[0].VariationDimensions[0].VariationDimension;
                var parentTitle = result[0].ItemAttributes && result[0].ItemAttributes[0]
                && result[0].ItemAttributes[0].Title && result[0].ItemAttributes[0].Title[0];

                if (result[0].Variations[0].Item !== undefined && result[0].Variations[0].Item.length > 0) {
                    var items = result[0].Variations[0].Item;
                    for (var idx = 0; idx < items.length; ++idx) {
                        var item = items[idx];
                        var ref = map;
                        if (item.ItemAttributes !== undefined && item.ItemAttributes.length > 0) {
                            var itemAttributes = item.ItemAttributes[0];
                            for (var variationIdx in variationKeys) {
                                var variation = variationKeys[variationIdx];
                                var value = itemAttributes[variation][0];
                                if (!(value in ref)) {
                                    if (variationIdx == variationKeys.length - 1) {
                                        ref[value] = {
                                            "ASIN": item.ASIN[0],
                                            "image": item.LargeImage[0].URL[0],
                                            "price" : item.Offers && item.Offers[0] && item.Offers[0].Offer
                                            && item.Offers[0].Offer[0] && item.Offers[0].Offer[0].OfferListing
                                            && item.Offers[0].Offer[0].OfferListing[0]
                                            && item.Offers[0].Offer[0].OfferListing[0].Price
                                            && item.Offers[0].Offer[0].OfferListing[0].Price[0]
                                            && item.Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice
                                            && item.Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0],
                                            "title" : item.ItemAttributes && item.ItemAttributes[0]
                                            && item.ItemAttributes[0].Title && item.ItemAttributes[0].Title[0]
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
                    return {
                        variationKeys: variationKeys,
                        map: map,
                        parentTitle: parentTitle
                    };
                } else {
                    console.log("This item no Variatios item is empty")
                }
            } else {
                console.log("This item no Variatios")
            }
        }, function(err) {
            console.log("ERROR in variationFind:", JSON.stringify(err, null, 2));
        });
    }
};




module.exports = amazonProduct;
