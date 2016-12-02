'use strict';

let config = require('./../../../config');

let aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});

let docClient = new aws.DynamoDB.DocumentClient();
const tableName = `${config.TABLE_PREFIX}Sessions`;
const indexName = 'sessionId-index';

const DEFAULT_SETTINGS = {
    timezone: 'America/Detroit',
    sendSuggestions: true
};

var sessionsDAO = {
    /**
     * Retrieve session from database or create new one from user id
     * uid: user id of recipient, primary key for db record
     */
    getSessionIdFromUserId: (uid) => {
        let record, sessionId;

        let params = {
            TableName: tableName,
            Key: {
                uid: uid
            }
        };

        return docClient.get(params).promise()
            .then((data) => {
                if (Object.keys(data).length != 0) {
                    // if session exists, grab it
                    let session = data.Item;
                    if (session.settings == null) {
                        return sessionsDAO.updateSettings(uid, DEFAULT_SETTINGS).then(updatedSettings => {
                            session.settings = updatedSettings;
                            return session;
                        });
                    }
                    else {
                        return session;
                    }
                } else {
                    // if session does not exist, create it
                    let params = {
                        TableName: tableName,
                        Item: {
                            uid: uid,
                            sessionId: new Date().getTime(),
                            context: {},
                            settings: DEFAULT_SETTINGS
                        }
                    };
                    return docClient.put(params).promise()
                        .then(success => params.Item);
                }
            });
    },
    /**
     * Retrieve user id from session id
     * sessionId: session id, primary key for sessionId index
     */
    getSessionFromSessionId: (sessionId) => {
        let params = {
            TableName: tableName,
            IndexName: indexName,
            KeyConditionExpression: 'sessionId = :sessionId',
            ExpressionAttributeValues: {
                ':sessionId': sessionId
            }
        };

        return docClient.query(params).promise()
            .then((data) => {
                // We should only ever have one session so just return the first item
                return data.Items[0];
            }, (error) => {
                console.log(`ERROR retrieving session: ${error}`);
            });
    },
    /**
     * Update context in database given user id
     * uid: user id of the user whose context we want to update
     * ctx: new user context
     */
    updateContext: (uid, ctx) => {
        let params = {
            TableName: tableName,
            Key: {
                uid: uid
            },
            UpdateExpression: 'set context = :ctx',
            ExpressionAttributeValues: {
                ':ctx': ctx
            },
            ReturnValues: 'UPDATED_NEW'
        };

        return docClient.update(params).promise()
            .then((success) => {
                console.log(`Updated context for ${uid} to ${JSON.stringify(ctx, null, 2)}`);
            }, (error) => {
                console.log(`ERROR updating context: ${error}`);
            });
    },

    updateSettings: (uid, settings) => {
        let params = {
            TableName: tableName,
            Key: {
                uid: uid
            },
            UpdateExpression: 'set settings = :settings',
            ExpressionAttributeValues: {
                ':settings': settings
            },
            ReturnValues: 'UPDATED_NEW'
        };

        return docClient.update(params).promise().then(result => settings);
    }
};

module.exports = sessionsDAO;
