/**
 * Created by evan on 11/11/16.
 */
'use strict';

let config = require('./../../../config');
let uuid = require('node-uuid');
let aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});

let docClient = new aws.DynamoDB.DocumentClient();
const tableName = `${config.TABLE_PREFIX}Reminders`;

var remindersDAO = {

    /**
     * Function used to add a reminder to the reminders table
     *
     * @param datetime datetime that we want the reminder to be sent
     * @param uid Unique identifier of the user
     * @param platform messaging platform
     * @returns {*} Promise from Dynamo
     */
    addReminder: (datetime, uid, platform, message) => {
        datetime = datetime.substring(0, datetime.indexOf(':') + 3);

        let id = uuid.v1();
        let params = {
            TableName: tableName,
            Item: {
                date: datetime,
                id: id,
                uid: uid,
                platform: platform,
                message: message
            }
        };

        return docClient.put(params).promise();
    },

    /**
     * Function that gets all of the reminders for a certain datetime
     * @param datetime date and time of the reminders that want to be sent
     * @returns {*} Promise from dynamo
     */
    getRemindersForDateTime: (datetime) => {

        datetime = datetime.substring(0, datetime.indexOf(':') + 3);

        let params = {
            TableName: tableName,
            KeyConditionExpression: "#date = :day",
            ExpressionAttributeNames: {
                "#date": "date"
            },
            ExpressionAttributeValues: {
                ":day": datetime
            }
        };

        return docClient.query(params).promise();
    },

    removeReminder: (datetime, id)=> {
        let params = {
            Key: {
                date: datetime,
                id: id
            },
            TableName: tableName
        };

        return docClient.delete(params).promise();
    }
};

module.exports = remindersDAO;
