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

let purcahseParams = {
    TableName: `${tablePrefix}Sessions`,
    Count: true
};

docClient.scan(purcahseParams).promise().then((data)=> {
    console.log(`*** PURCHASE METRICS ***`);
    let count = 0;
    data.Items.forEach((item)=> {
        docClient.scan({TableName: `${tablePrefix}Suggestions`}).then((results)=> {
            let found = false;
            results.items.forEach((result)=> {
                if (result.uid == item.uid)
                    found = true;
            });

            if (!found) {
                subscriptionsDAO.addUserSubscription(item.uid, 'fb');
            }

        });
    });
    console.log(`      PURCHASE COUNT: ${count}`);
});