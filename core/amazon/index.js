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
                //Only check the first item form the list
                var promiseArray = [];
                for (var itemIdx = 0; itemIdx < res.length; itemIdx++) {
                    let curItem = res[itemIdx];
                    console.log('on item' + itemIdx);
                    //When item has ParentASIN, which means has options
                    if (curItem["ParentASIN"] !== undefined && curItem["ParentASIN"].length > 0) {
                        console.log('Found an item with variations');
                        curItem["HasVariations"] = true;
                    }
                    //When item doesn't have ParentASIN, which means has no options
                    else if (curItem["ASIN"] !== undefined && curItem["ASIN"].length > 0) {
                        //Build virtual cart here
                        console.log('item without variation');
                        promiseArray.push(amazonProduct.createCart(curItem["ASIN"], 1).then((url) => {
                            console.log(`cart url: ${url}`);
                            curItem["CartUrl"] = url;
                        }));
                    }
                }
                return Promise.all(promiseArray).then(()=> {
                    console.log('done');
                    console.log(res);
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

                    return res.PurchaseURL[0];
                }
            },function(err){
                return 'https://google.com';
            });
        }

    }
    ;

module.exports = amazonProduct;