/**
 * Created by cse498 on 10/1/16.
 */
'use strict';

var amazon_api = require('./../amazon-product-api');
var config = require('./../../config');
var amazon_client = amazon_api.createClient({
    awsId: config.AWS_ID,
    awsSecret: config.AWS_SECRET,
    awsTag: config.AWS_TAG
});

var amazonProduct = {
    /**
     * params: {
     *      index: 'Books',
     *      browseNodes: [4,1]
     * }
     */
    itemSearch: function (keywords, params) {
        params = params || {};

        let search_params = {
            "searchIndex": "All",
            "keywords": keywords,
            "responseGroup": ["ItemIds", "ItemAttributes", "Images", "SearchBins", "Offers"]
        };

        Object.keys(params).forEach(key => {
            search_params[key] = params[key];
        });

        return amazon_client.itemSearch(search_params).then((result) => {
            return amazonProduct.buildItemResponse(result);
        }, (error) => {
            console.log(`ERROR searching for items on Amazon: ${JSON.stringify(error, null, 2)}`);
        });
    },

    similarityLookup: function (ASINs) {
        return amazon_client.similarityLookup({
            "itemId": ASINs,
            "responseGroup": ["ItemIds", "ItemAttributes", "Images", "Offers"],
            "similarityType": "Random"
        }).then((result) => {
            return amazonProduct.buildItemResponse(result);
        });
    },

    createCart: function (ASIN, quantity) {

        let cartObject = {url: undefined, price: undefined};
        return amazon_client.cartCreate({
            "Item.1.ASIN": ASIN,
            "Item.1.Quantity": quantity
        }).then((result) => {

            if (result.CartItems !== undefined && result.CartItems.length > 0) {
                if (result.PurchaseURL !== undefined) {
                    cartObject.url = result.PurchaseURL[0];
                }
                else if (result.MobileCartURL !== undefined) {
                    cartObject.url = result.MobileCartURL[0];
                }

                cartObject.price = result.SubTotal && result.SubTotal[0] && result.SubTotal[0].FormattedPrice
                    && result.SubTotal[0].FormattedPrice[0];
            }

            return cartObject;
        }, (error) => {
            // *** ERROR *** something bad happend when creating a temp cart... handle this better
            console.log(`ERROR creating cart for ${ASIN}: ${JSON.stringify(error)}`);
            return cartObject;
        });
    },

    /**
     * searchResults: raw itemSearch results with search bins
     * numIndices: number of indices to return
     *
     * returns: array of filter results for the first 'numIndices' entries only if the filter name is "Categories"
     */
    topRelevantSearchIndices: function (searchResults, numIndices) {
        let filterList = this.getFilterInfo(searchResults);
        let indexList = [];
        if (filterList[0].name == "Categories") {
            // Grab only the first 'numIndices' search indices
            // Array.slice does not error if the stop index is past the end of the array
            indexList = filterList[0].bins.slice(0, numIndices);
        }
        return indexList;
    },

    /**
     * Array with filter info
     * [
     *      {
     *          name: <filter name>,
     *          bins: [
     *              {
     *                  name: <bin name>,
     *                  params: [
     *                      {type: <param type>, value: <param value>}
     *                  ]
     *              }
     *          ]
     *      }
     * ]
     */
    getFilterInfo: function (searchResults) {

        // let searchBinSet = searchResults.SearchBinSets && searchResults.SearchBinSets[0] && searchResults.SearchBinSets[0].SearchBinSet;
        let searchBinSets = searchResults.SearchBinSets;

        let filterList = [];
        searchBinSets.forEach((set) => {
            let filter = {};
            filter.name = set.$.NarrowBy;
            filter.bins = [];
            let bins = set.Bin;
            bins.forEach((bin)=> {
                let binObj = {};
                binObj.name = bin.BinName && bin.BinName[0];
                binObj.params = bin.BinParameter.map(param => {
                    return {
                        type: param.Name[0],
                        value: param.Value[0]
                    }
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
            result = result.Items;
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

                                        // Offers->Offer->OfferListing->IsEligibleForPrime
                                        let isPrimeEligible = amazonProduct.isItemPrimeEligible(item);

                                        ref[value] = {
                                            "ASIN": item.ASIN && item.ASIN[0],
                                            "image": item.LargeImage && item.LargeImage[0] && item.LargeImage[0].URL && item.LargeImage[0].URL[0] || 'http://webservices.amazon.com/scratchpad/assets/images/amazon-no-image.jpg',
                                            "price": (item.ItemAttributes && item.ItemAttributes[0]
                                            && item.ItemAttributes[0].ListPrice && item.ItemAttributes[0].ListPrice[0]
                                            && item.ItemAttributes[0].ListPrice[0].FormattedPrice
                                            && item.ItemAttributes[0].ListPrice[0].FormattedPrice[0]) ||
                                            (item.Offers && item.Offers[0] && item.Offers[0].Offer
                                            && item.Offers[0].Offer[0] && item.Offers[0].Offer[0].OfferListing
                                            && item.Offers[0].Offer[0].OfferListing[0]
                                            && item.Offers[0].Offer[0].OfferListing[0].Price
                                            && item.Offers[0].Offer[0].OfferListing[0].Price[0]
                                            && item.Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice
                                            && item.Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0]),
                                            "title": item.ItemAttributes && item.ItemAttributes[0]
                                            && item.ItemAttributes[0].Title && item.ItemAttributes[0].Title[0],
                                            "primeEligible": isPrimeEligible
                                        };

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
    },

    buildItemResponse: function (result) {
        let items = result.Items;

        var promiseArray = [];
        for (var itemIdx = 0; itemIdx < items.length; itemIdx++) {
            let curItem = items[itemIdx];

            curItem.primeEligible = amazonProduct.isItemPrimeEligible(curItem);
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
                    .then((cart) => {
                        let url = cart.url;
                        let price = cart.price;

                        if (url !== undefined) {
                            curItem.cartCreated = true;
                            curItem.purchaseUrl = url;
                            curItem.price = cart.price;
                        } else {
                            curItem.cartCreated = false;
                            curItem.purchaseUrl = curItem.DetailPageURL[0];
                        }

                    }));
            } else {
                // *** ERROR *** no ASIN
                console.log(`Item #${itemIdx} has no ASIN: `, JSON.stringify(curItem, null, 2));
                curItem.cartCreated = false;
                curItem.purchaseUrl = `https://amazon.com/?tag=${config.AWS_TAG}`;
            }
        }
        return Promise.all(promiseArray).then(() => {
            return result;
        });
    },

    isItemPrimeEligible: function (item) {

        let offers = item.Offers && item.Offers[0];
        if (!offers || !offers.Offer)
            return false;

        let isPrime = false;

        offers.Offer.forEach((offer)=> {
            let offerListing = offer.OfferListing && offer.OfferListing[0];

            if (!offerListing)
                return;

            let primeEligible = offerListing.IsEligibleForPrime && offerListing.IsEligibleForPrime[0];

            if (primeEligible === "1")
                isPrime = true;
        });

        return isPrime;
    }
};

module.exports = amazonProduct;
