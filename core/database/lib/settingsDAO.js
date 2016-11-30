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
                timezone: "America/Detroit",
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
            console.log("here1");
            let settings = data.Items[0];

            if (settings === undefined) {
                settings = {
                    uid: `${platform}-${uid}`,
                    timezone: "America/Detroit",
                    sendSuggestions: true
                };

                let params = {
                    TableName: tableName,
                    Item: settings
                };

                return docClient.put(params).promise().then(() => settings);
            } else {
                return settings;
            }
            
        }, (error) => {
            console.log("here2");
            throw Error(`ERROR retrieving session: ${error}`);
        });
    },

    /**
     * Update settings for a user
     * @param uid user id
     * @param platform message platform
     * @param settingsObject settings to update
     * @returns {*|Promise|Promise.<T>}
     */
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

    /**
     * Turn suggestions off for a user.
     *
     * @param uid
     * @param platform
     * @returns {*|Promise|Promise.<T>}
     */
    turnSuggestionsOff: (uid, platform) => {
        return settingsDAO.getUserSettings(uid, platform).then((settings) => {
            settings.sendSuggestions = false;
            return settingsDAO.updateUserSettings(uid, platform, settings);
        });
    },

    /**
     * Turn suggestions on for a user.
     * @param uid
     * @param platform
     * @returns {*|Promise|Promise.<T>}
     */
    turnSuggestionsOn: (uid, platform) => {
        return settingsDAO.getUserSettings(uid, platform).then((settings) => {
            settings.sendSuggestions = true;
            return settingsDAO.updateUserSettings(uid, platform, settings);
        });
    }
};

module.exports = settingsDAO;
