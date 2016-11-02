/**
 * Created by evan on 11/2/16.
 */
'use strict';
var config = require('./../config');
let facebookMessageSender = require('facebook-message-sender');
let aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});

let docClient = new aws.DynamoDB.DocumentClient();
const tableName = 'Reminders1';

/**
 * Lambda function for purchase redirect that logs some information about the purchase click
 * uid, redirect_url, ASIN, and is_cart all need to be passed in as queries on the url
 * @param event
 * @param context
 * @param callback
 */
module.exports.reminderPoll = function (event, context, callback) {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    console.log(`CONTEXT: ${JSON.stringify(context)}`);

    let arr = event.time.split("T");
    let date = arr[0];
    console.log(`DATE: ${date}`);
    var params = {
        TableName: tableName,
        KeyConditionExpression: "#date = :day",
        ExpressionAttributeNames: {
            "#date": "Date"
        },
        ExpressionAttributeValues: {
            ":day": date
        }
    };

    docClient.query(params).promise()
        .then((data) => {
            data.Items.forEach((item)=> {
                let fbid = item.fbid.substr(0, item.fbid.indexOf(' '));
                let command = item.fbid.substr(item.fbid.indexOf(' ') + 1);
                facebookMessageSender.sendTextMessage(fbid, `Hey you asked me to remind you: ${command}`)
                    .then((data)=> {

                    }, (error)=> {
                    });
            });
            console.log(`DATA: ${JSON.stringify(data)}`);
        }, (error) => {
            console.log(`ERROR getting item from ItemVariations: ${error}`);
        });
};
