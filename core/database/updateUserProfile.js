/**
 * Created by evan on 11/16/16.
 */
'use strict';

let config = require('./../../config');
let limit = require('simple-rate-limiter');
let aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});

let docClient = new aws.DynamoDB.DocumentClient();
let callAddPurchase = limit(require('./../user-profiler').addPurchase).to(1).per(1000);
const tablePrefix = 'ASA-prod-';

let purchaseParams = {
    TableName: `${tablePrefix}PurchasedItems`,
    Count: true
};

docClient.scan(purchaseParams).promise().then((data)=> {

    for (var i = 0; i < data.Count; i++) {
        let purchasedItem = data.Items[i];

        let ASIN = purchasedItem.item;
        let uid = purchasedItem.uid;

        callAddPurchase(uid, 'fb', ASIN);
    }
});