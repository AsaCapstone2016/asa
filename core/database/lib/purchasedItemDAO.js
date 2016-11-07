/**
 * Created by cse498 on 10/11/16.
 */
'use strict';

var AWS = require("aws-sdk");
var config = require('./../../../../config');

AWS.config.update({
    region: "us-east-1",
    endpoint: "dynamodb.us-east-1.amazonaws.com"
});

const documentClient = new AWS.DynamoDB.DocumentClient();
const tableName = `${config.TABLE_PREFIX}PurchasedItems`;

var purchasedItemDAO = {
    addItem: function (uid, ASIN) {
        let date = new Date();

        let params = {
            TableName: tableName,
            Item: {
                "uid": uid,
                "date": date.toISOString(),
                "item": ASIN

            }
        };

        return new Promise(function (resolve, reject) {
            documentClient.put(params, function (err, data) {
                if (err) {
                    console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                }
                resolve();
            });
        });

    }
};

module.exports = purchasedItemDAO;
