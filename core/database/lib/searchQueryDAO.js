/**
 * Created by evan on 10/6/16.
 */
'use strict';

var AWS = require("aws-sdk");
var config = require('./../../../config');

AWS.config.update({
    region: "us-east-1",
    endpoint: "dynamodb.us-east-1.amazonaws.com"
});

var documentClient = new AWS.DynamoDB.DocumentClient();
const tableName = `${config.TABLE_PREFIX}SearchQueries`;

var searchQueryDAO = {
    addItem: function (uid, search) {
        var date = new Date();

        var params = {
            TableName: tableName,
            Item: {
                "uid": uid,
                "date": date.toISOString(),
                "query": search

            }
        };

        documentClient.put(params, function (err, data) {
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            }
        });
    }
};

module.exports = searchQueryDAO;