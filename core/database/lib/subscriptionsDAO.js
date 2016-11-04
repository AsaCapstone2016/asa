/**
 * Created by cse498 on 11/4/16.
 */
'use strict';

let config = require('./../../../config');

let aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});

let docClient = new aws.DynamoDB.DocumentClient();
const tableName = `${config.TABLE_PREFIX}Subscriptions`;

var subscriptionsDAO = {

    /**
     * Function used to add a user subscription to our subscription table. As of now, this should only happen
     * when a user clicks the get started buttion.
     * @param uid Unique id for a platform
     * @param platform the platform that this subscription is for
     * @returns {Promise} promise to notify when this put is done.
     */
    addUserSubscription: (uid, platform) => {
        let params = {
            TableName: tableName,
            Item: {
                "date": date.toISOString(),
                "uid": `${platform}-${uid}`,
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

module.exports = subscriptionsDAO;
