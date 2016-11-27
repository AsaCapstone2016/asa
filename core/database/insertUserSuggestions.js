/**
 * Created by evan on 11/11/16.
 */
'use strict';

let config = require('./../../config');

let aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});

let docClient = new aws.DynamoDB.DocumentClient();
let subscriptionsDAO = require('./../../core/database').subscriptionsDAO;
const tablePrefix = 'ASA-prod-';

let purchaseParams = {
    TableName: `${tablePrefix}Sessions`,
    Count: true
};

docClient.scan(purchaseParams).promise().then((data)=> {
    let count = 0;
    docClient.scan({TableName: `${tablePrefix}Subscriptions`}).promise().then((results)=> {
        let promiseArray = [];
        data.Items.forEach((item)=> {

            let found = false;
            results.Items.forEach((result)=> {
                if (result.uid == item.uid)
                    found = true;
            });

            if (!found) {
                let params = {
                    TableName: `${tablePrefix}Subscriptions`,
                    Item: {
                        "date": "2016-11-16T21",
                        "uid": `fb-${item.uid}`
                    }
                };

                promiseArray.push( docClient.put(params).promise());
            }
            return Promise.all(promiseArray);
        });
    });

    console.log(`      PURCHASE COUNT: ${count}`);
});