/**
 * Created by evan on 11/1/16.
 */
"use strict";

var config = require('./../config');

let aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});

let docClient = new aws.DynamoDB.DocumentClient();

const tableName = 'Reminders';

let params = {
    TableName: tableName,
    Key: {
        Date: '2016/11/01'
    }
};

docClient.get(params).promise()
    .then((data) => {
        console.log(`DATA: ${JSON.stringify(data)}`);
    }, (error) => {
        console.log(`ERROR getting item from ItemVariations: ${error}`);
    });