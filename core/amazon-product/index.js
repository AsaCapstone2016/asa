/**
 * Created by cse498 on 10/1/16.
 */


var amazon_api = require("amazon-product-api");
var amazon_client = amazon.createClient({
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
            //Only check the first item form the list
            return new Promise(function (resolve, reject) {
                    var doneCount = 0;
                    for (var itemIdx = 0; itemIdx < Math.min(res.length, 5); itemIdx++) {
                        var curItem = res[itemIdx];

                        //When item has ParentASIN, which means has options
                        if (curItem["ParentASIN"] !== undefined && curItem["ParentASIN"].length > 0) {
                            curItem["HasVariations"] = true;
                        }
                        //When item doesn't have ParentASIN, which means has no options
                        else if (curItem["ASIN"] !== undefined && curItem["ASIN"].length > 0) {
                            //Build virtual cart here

                            this.createCart(curItem["ASIN"], 1).then((url) => {
                                curItem["CartUrl"] = url;
                                doneCount++;
                                if (doneCount == Math.min(res.length, 5) - 1) {
                                    resolve(res);
                                }
                            });
                        }
                    }
                }
            );

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

};

module.exports = amazonProduct;