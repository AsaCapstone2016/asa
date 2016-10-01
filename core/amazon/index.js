/**
 * Created by cse498 on 10/1/16.
 */


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
                "responseGroup": "ItemIds"
            }, function (err, res) {
                if (err) {
                    console.log("err:", JSON.stringify(err, null, 2));
                }
                console.log(JSON.stringify(res));
                //Only check the first item form the list
                var promiseArray = [];
                for (var itemIdx = 0; itemIdx < Math.min(res.length, 5); itemIdx++) {
                    var curItem = res[itemIdx];
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
                        promiseArray.push(this.createCart(curItem["ASIN"], 1).then((url) => {
                            curItem["CartUrl"] = url;
                        }));
                    }
                }
                return Promise.all(promiseArray).then(()=> {
                    return res;
                });
            });
        },

        createCart: function (ASIN, quantity) {
            return amazon_client.cartCreate({
                "Item.1.ASIN": ASIN,
                "Item.1.Quantity": quantity
            }, function (err, res) {
                if (err) {
                    console.log("Cart Create Error:", JSON.stringify(err, null, 2));
                } else if (res.CartItems !== undefined && res.CartItems.length > 0) {
                    return res.PurchaseURL[0];
                }
            });
        }

    }
    ;

module.exports = amazonProduct;