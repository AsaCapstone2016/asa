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
var itemResponseGroup = ["ItemIds", "ItemAttributes", "Images", "Offers", "SearchBins"];


var amazonProduct = {
    /**
     * params: {
     *      index: 'Books',
     *      browseNodes: [4,1]
     * }
     */
    itemSearch: function (keywords, params) {
        const index = params.index !== undefined ? params.index : 'All';
        return amazon_client.itemSearch({
            "searchIndex": index,
            "keywords": keywords,
            "responseGroup": itemResponseGroup
        }).then((result) => {
            return buildItemResponse(result.Item);
        }, (error) => {
            console.log(`ERROR searching for items on Amazon: ${error}`);
        });
    },

    similarityLookup: function (ASIN) {
        return amazon_client.similarityLookup({
            "itemId": ASIN,
            "responseGroup": itemResponseGroup
        }).then((result) => {
            result = result.Item;
            return buildItemResponse(result);
        }, (error) => {
            console.log(`ERROR finding similar items: ${error}`);
        });
    },

    createCart: function (ASIN, quantity) {
        return amazon_client.cartCreate({
            "Item.1.ASIN": ASIN,
            "Item.1.Quantity": quantity
        }).then((result) => {
            if (result.CartItems !== undefined && result.CartItems.length > 0) {
                if (result.PurchaseURL !== undefined) {
                    return result.PurchaseURL[0];
                }
                else if (result.MobileCartURL !== undefined) {
                    return result.MobileCartURL[0];
                }
            }
        }, (error) => {
            // *** ERROR *** something bad happend when creating a temp cart... handle this better
            console.log(`ERROR creating cart for ${ASIN}: ${error}`);
            return undefined;
        });
    },

    /**
     * searchResults: raw itemSearch results with search bins
     * numIndices: number of indices to return
     *
     * returns: array with index name for top numIndices indices
     */
    topRelevantSearchIndices: function (searchResults, numIndices) {
        let filterList = this.getFilterInfo(searchResults);
        filterList.forEach((filter)=>{
            if(filter.bins.length > numIndices){
                filter.bins = filter.bins.slice(0, numIndices);
            }
        })
        return filterList;
    },

    /**
     * Array with filter info including browse node bins
     * [
     *      {
     *          name: <filter name>,
     *          bins: [
     *              {name: <bin name>, value: <bin value>}
     *          ]
     *      },
     *      {
     *          name: <filter name>,
     *          bins: [
     *              {name: <bin name>, value: <bin value>}
     *          ]
     *      }
     * ]
     */
    getFilterInfo: function (searchResults) {
        //console.log(JSON.stringify(searchResults, null, 2));
        //return searchResults;
        let searchBinSet = searchResults.SearchBinSets && searchResults.SearchBinSets[0] && searchResults.SearchBinSets[0].SearchBinSet;
        //return searchBinSet;
        let filterList = [];
        searchBinSet.forEach((searchBin)=>{
            let filter = {};
            filter.name = searchBin.$.NarrowBy;
            filter.bins = [];
            let bins = searchBin.Bin;
            bins.forEach((bin)=>{
                let binObj = {};
                binObj.name = bin.BinName && bin.BinName[0];
                binObj.value = {};
                bin.BinParameter.forEach((param)=>{
                    let key = param.Name && param.Name[0];
                    let value = param.Value && param.Value[0];
                    binObj.value[key] = value;
                });
                filter.bins.push(binObj);
            })
            filterList.push(filter);
        });
        return filterList;
    },

    variationPick: function (ASIN, variationValues, variationMap) {
        return new Promise(function (resolve, reject) {
            return new Promise(function (inResolve, inReject) {
                if (variationMap === null) {
                    amazonProduct.variationFind(ASIN)
                        .then(function (result) {
                            inResolve(result);
                        }, function (err) {
                            inReject(err);
                        });
                } else {
                    inResolve(variationMap);
                }
            }).then(function (json) {
                var variationKeys = json.variationKeys;
                var parentTitle = json.parentTitle;
                var map = json.map;
                var conversational = json.conversational;
                for (var i = 0; i < variationValues.length; i++) {
                    map = map[variationValues[i]];
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
                        ASIN: ASIN,
                        variationKey: variationKeys[variationValues.length],
                        variationOptions: variationValues.length + 1 == variationKeys.length ? map : Object.keys(map),
                        lastVariation: variationValues.length + 1 == variationKeys.length ? true : false,
                        conversational: conversational
                    });
                }
            }, function (err) {
                reject(err);
            });
        });
    },

    variationFind: function (ASIN) {
        return amazon_client.itemLookup({
            "ItemId": ASIN,
            "IdType": "ASIN",
            "ResponseGroup": ["ItemAttributes", "Variations", "VariationOffers"]
        }).then(function (result) {
            result = result.Item;
            if (result[0].Variations !== undefined && result[0].Variations.length > 0 &&
                result[0].Variations[0].VariationDimensions !== undefined &&
                result[0].Variations[0].VariationDimensions.length > 0 &&
                result[0].Variations[0].VariationDimensions[0].VariationDimension != undefined &&
                result[0].Variations[0].VariationDimensions[0].VariationDimension.length > 0) {

                var conversational = true;
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
                            var itemAttributes = {};
                            var variationAttributes = item.VariationAttributes && item.VariationAttributes[0]
                                && item.VariationAttributes[0].VariationAttribute;

                            for (let variationAttributeIdx in variationAttributes) {
                                let variationAttribute = variationAttributes[variationAttributeIdx];
                                itemAttributes[variationAttribute.Name[0]] = variationAttribute.Value[0]
                            }

                            for (var variationIdx in variationKeys) {
                                var variation = variationKeys[variationIdx];
                                var value = itemAttributes[variation];
                                if (!(value in ref)) {
                                    // Otherwise, add value to map
                                    if (variationIdx == variationKeys.length - 1) {
                                        ref[value] = {
                                            "ASIN": item.ASIN && item.ASIN[0],
                                            "image": item.LargeImage && item.LargeImage[0] && item.LargeImage[0].URL && item.LargeImage[0].URL[0] || "no image",
                                            "price": item.Offers && item.Offers[0] && item.Offers[0].Offer
                                            && item.Offers[0].Offer[0] && item.Offers[0].Offer[0].OfferListing
                                            && item.Offers[0].Offer[0].OfferListing[0]
                                            && item.Offers[0].Offer[0].OfferListing[0].Price
                                            && item.Offers[0].Offer[0].OfferListing[0].Price[0]
                                            && item.Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice
                                            && item.Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0],
                                            "title": item.ItemAttributes && item.ItemAttributes[0]
                                            && item.ItemAttributes[0].Title && item.ItemAttributes[0].Title[0]
                                        }

                                        // Check if the last level variations are too numerous for selection through conversation
                                        if (Object.keys(ref).length > 10) {
                                            conversational = false;
                                        }
                                    } else {
                                        ref[value] = {};
                                        ref = ref[value];

                                        // Check if variation values are too long or too numerous for selection through conversation
                                        if (value.length > 20 || Object.keys(ref).length > 9) {
                                            conversational = false;
                                        }
                                    }
                                } else {
                                    ref = ref[value];
                                }
                            }
                        } else {
                            console.log("no item attributes");
                        }
                    }


                    return {
                        conversational: conversational,
                        variationKeys: variationKeys,
                        map: map,
                        parentTitle: parentTitle
                    };
                } else {
                    console.log("This item no Variatios item is empty");
                }
            } else {
                console.log("This item no Variatios");
            }
        }, function (err) {
            console.log("ERROR in variationFind:", JSON.stringify(err, null, 2));
        });
    }
};

function buildItemResponse(items) {
    var promiseArray = [];
    for (var itemIdx = 0; itemIdx < items.length; itemIdx++) {
        let curItem = items[itemIdx];
        //When item has ParentASIN and ParentASIN not same as ASIN, which means has options
        if (curItem.ParentASIN !== undefined &&
            curItem.ParentASIN.length > 0 &&
            curItem.ASIN !== undefined &&
            curItem.ASIN != curItem.ParentASIN) {
            curItem.HasVariations = true;
        }
        //When item doesn't have ParentASIN, which means has no options
        else if (curItem.ASIN !== undefined && curItem.ASIN.length > 0) {
            //Build virtual cart here
            promiseArray.push(amazonProduct.createCart(curItem.ASIN, 1)
                .then((url) => {

                    if (url !== undefined) {
                        curItem.cartCreated = true;
                        curItem.purchaseUrl = url;
                    } else {
                        curItem.cartCreated = false;
                        curItem.purchaseUrl = curItem.DetailPageURL[0];
                    }

                }));
        } else {
            // *** ERROR *** no ASIN
            console.log(`Item #${itemIdx} has no ASIN: `, JSON.stringify(curItem, null, 2));
            curItem.cartCreated = false;
            curItem.purchaseUrl = "https://amazon.com";
        }
    }
    return Promise.all(promiseArray).then(() => {
        return items;
    });
}

module.exports = amazonProduct;
