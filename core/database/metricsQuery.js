/**
 * Created by cse498 on 10/28/16.
 */
'use strict';

let config = require('./../../config');

let aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});

let docClient = new aws.DynamoDB.DocumentClient();

const tablePrefix = 'ASA-prod-';

let searchQueryParams = {
    TableName: `${tablePrefix}SearchQueries`,
    Count: true
};

docClient.scan(searchQueryParams).promise().then((data) => {
    console.log(`*** SEARCH QUERY METRICS ***`)
    let count = data.Count;
    console.log(`      QUERY COUNT: ${count}`);
    let items = data.Items;
    let users = {};
    let userCount = 0;
    items.forEach((item)=> {
        if (users[item.uid] == null) {
            userCount++;
            users[item.uid] = item.uid;
        }
    });
    console.log(`      UNIQUE USERS: ${userCount}`);
});

let purcahseParams = {
    TableName: `${tablePrefix}PurchasedItems`,
    Count: true
};
docClient.scan(purcahseParams).promise().then((data)=> {
    console.log(`*** PURCHASE METRICS ***`);
    let count = data.Count;
    console.log(`      PURCHASE COUNT: ${count}`);
});
