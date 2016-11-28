/**
 * Created by evan on 11/22/16.
 */
'use strict';

let config = require('./../../../config');

let aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});

let docClient = new aws.DynamoDB.DocumentClient();
const tableName = `${config.TABLE_PREFIX}Settings`;

var settingsDAO = {

    /**
     * Adds default settings for a user
     *
     * @param uid user id
     * @param platform platform user is on
     * @returns {*} promise
     */
    addDefaultSettings: (uid, platform) => {

        let params = {
            TableName: tableName,
            Item: {
                uid: `${platform}-${uid}`,
                timezone: "-05:00",
                sendSuggestions: true
            }
        };

        return docClient.put(params).promise();
    },

    /**
     * Get the settings record for a user on a platform
     *
     * @param uid
     * @param platform
     */
    getUserSettings: (uid, platform) => {

        let params = {
            TableName: tableName,
            KeyConditionExpression: "#uid = :uid",
            ExpressionAttributeNames: {
                "#uid": "uid"
            },
            ExpressionAttributeValues: {
                ":uid": `${platform}-${uid}`
            }
        };

        return docClient.query(params).promise().then((data)=> {
            // We should only ever have one settings object
            return data.Items[0];
        }, (error) => {
            throw Error(`ERROR retrieving session: ${error}`);
        });
    },

    updateUserSettings: (uid, platform, settingsObject) => {
        let params = {
            TableName: tableName,
            Key: {
                uid: `${platform}-${uid}`
            },
            UpdateExpression: 'set #timezone = :timezone, sendSuggestions = :sendSuggestions',
            ExpressionAttributeValues: {
                ':timezone': settingsObject.timezone,
                ':sendSuggestions': settingsObject.sendSuggestions
            },
            ExpressionAttributeNames: {
                "#timezone": "timezone"
            },
            ReturnValues: 'UPDATED_NEW'
        };

        return docClient.update(params).promise()
            .then((success) => {
                console.log(`Updated settings for ${uid} to ${JSON.stringify(settingsObject, null, 2)}`);
            }, (error) => {
                console.log(`ERROR updating context: ${error}`);
            });
    },

    turnSuggestionsOff: (uid, platform) => {
        return settingsDAO.getUserSettings(uid, platform).then((settings) => {
            settings.sendSuggestions = false;
            return settingsDAO.updateUserSettings(uid, platform, settings);
        });
    },

    turnSuggestionsOn: (uid, platform) => {
        return settingsDAO.getUserSettings(uid, platform).then((settings) => {
            settings.sendSuggestions = true;
            return settingsDAO.updateUserSettings(uid, platform, settings);
        });
    }
};

module.exports = settingsDAO;
