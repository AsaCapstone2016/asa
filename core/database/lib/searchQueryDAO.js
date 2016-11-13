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

        return documentClient.put(params).promise()
            .then((success) => {
                console.log(`Successfully logged search query for user ${params.Item.uid}`);
            }, (error) => {
                console.log(`Error logging search query for user ${params.Item.uid}: ${JSON.stringify(error)}`);
            });
    }
};

module.exports = searchQueryDAO;
