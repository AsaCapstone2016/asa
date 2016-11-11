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
    console.log(`*** SEARCH QUERY METRICS ***`);
    let count = data.Count;
    let items = data.Items;
    let users = {};
    let searchCount = 0;
    let userCount = 0;
    items.forEach((item)=> {
        if (users[item.uid] == null) {
            userCount++;
            users[item.uid] = item.uid;
        }
        if (item.uid != '1061868600596425' && item.uid != '1079809842088638' && item.uid != '1205605186160963'
            && item.uid != '797001537069627' && item.uid != '1126031090811765') {
            searchCount++;
        }
    });
    console.log(`      UNIQUE USERS: ${userCount}`);
    console.log(`      QUERY COUNT: ${searchCount}`);
});

let purcahseParams = {
    TableName: `${tablePrefix}PurchasedItems`,
    Count: true
};
docClient.scan(purcahseParams).promise().then((data)=> {
    console.log(`*** PURCHASE METRICS ***`);
    let count = 0;
    data.Items.forEach((item)=> {
        if (item.uid != '1061868600596425' && item.uid != '1079809842088638' && item.uid != '1205605186160963'
            && item.uid != '797001537069627' && item.uid != '1126031090811765') {
            count++;
        }
    });
    console.log(`      PURCHASE COUNT: ${count}`);
});

// Renee - 1061868600596425
// Aaron - 1079809842088638
// Sam - 1205605186160963
// Yiming - 797001537069627
// Evan - 1126031090811765