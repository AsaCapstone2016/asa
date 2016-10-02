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

        itemSearch: function (keywords) {
            return amazon_client.itemSearch({
                "searchIndex": "All",
                "keywords": keywords,
                "responseGroup": ["ItemIds", "ItemAttributes", "Images", "OfferSummary"]
            }).then(function (res, err) {
                if (err) {
                    console.log("err:", JSON.stringify(err, null, 2));
                }
                
                var promiseArray = [];
                for (var itemIdx = 0; itemIdx < res.length; itemIdx++) {
                    let curItem = res[itemIdx];
                    console.log('on item' + itemIdx);
                    //When item has ParentASIN, which means has options
                    if (curItem["ParentASIN"] !== undefined && curItem["ParentASIN"].length > 0) {
                        curItem["HasVariations"] = true;
                    }
                    //When item doesn't have ParentASIN, which means has no options
                    else if (curItem["ASIN"] !== undefined && curItem["ASIN"].length > 0) {
                        //Build virtual cart here
                        promiseArray.push(amazonProduct.createCart(curItem["ASIN"], 1).then((url) => {
                            //console.log(`cart url: ${url}`);
                            if (url === undefined) {
                                url = curItem.DetailPageURL[0];
                            }
                            curItem["CartUrl"] = url;
                        }));
                    }
                    else {
                        // *** ERROR *** no ASIN or something
                        curItem["CartUrl"] = "https://amazon.com";
                    }
                }
                return Promise.all(promiseArray).then(()=> {
                    console.log('Done getting/building item search response');
                    //console.log(`response: ${JSON.stringify(res,null,2)}`);
                    return res;
                });
            });
        },

        createCart: function (ASIN, quantity) {
            console.log('Asin' + ASIN);
            return amazon_client.cartCreate({
                "Item.1.ASIN": ASIN,
                "Item.1.Quantity": quantity
            }).then(function (res) {
                if (res.CartItems !== undefined && res.CartItems.length > 0) {
                    if (res.PurchaseURL !== undefined) {
                        return res.PurchaseURL[0];
                    }
                }
            },function(err){
                // *** ERROR *** something bad happend when creating a temp cart... handle this better
                return 'https://amazon.com';
            });
        }

    };

module.exports = amazonProduct;