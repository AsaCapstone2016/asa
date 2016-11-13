/**
 * Created by cse498 on 11/4/16.
 */
'use strict';

let config = require('./../../../config');

let aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});

let docClient = new aws.DynamoDB.DocumentClient();
const tableName = `${config.TABLE_PREFIX}Subscriptions`;
const notificationInterval = 7;

var subscriptionsDAO = {

    /**
     * Function used to add a user subscription to our subscription table. As of now, this should only happen
     * when a user clicks the get started buttion.
     * @param uid Unique id for a platform
     * @param platform the platform that this subscription is for
     * @returns {Promise} promise to notify when this put is done.
     */
    addUserSubscription: (uid, platform) => {

        let date = new Date();
        date.setDate(date.getDate() + notificationInterval);
        date = date.toISOString();
        date = date.substring(0, date.indexOf(':'));
        return createUserSubscription(date, platform, uid);
    },

    /**
     * Gets records from subscription table for a given date
     * @param date ISO formatted date (MUST BE ISO)
     * @returns {*} promise with data;
     */
    getUsersForDate: (date) => {
        date = date.substring(0, date.indexOf(':'));
        console.log(`DATE: ${date}`);

        let params = {
            TableName: tableName,
            KeyConditionExpression: "#date = :day",
            ExpressionAttributeNames: {
                "#date": "date"
            },
            ExpressionAttributeValues: {
                ":day": date
            }
        };

        return docClient.query(params).promise();
    },

    /**
     * Get one subscription record based on date and uid
     * @param date range key
     * @param uid sort key
     * @returns {*} results from get, empty if not found
     */
    getSubscriptionRecord: (date, uid) => {
        let params = {
            TableName: tableName,
            Key: {
                date: date,
                uid: uid
            }
        };

        return docClient.get(params).promise();
    },

    /**
     * Updates a subscription record to have a new date. This function actually deletes the record and then
     * creates a new one since we cannot update a range key in Dynamo.
     *
     * @param oldDate date in database
     * @param uid uid we want to change
     * @param newDate date that we want to update to.
     * @returns {*|Promise|Promise.<T>} promise that eventually returns result of createUserSubscription
     */
    updateUserSubscription: (oldDate, uid, newDate) => {
        return subscriptionsDAO.getSubscriptionRecord(oldDate, uid).then((results)=> {

            //We didn't find a matching item with oldDate and uid, so punt
            if (results.Item === undefined)
                throw Error("ITEM NOT FOUND IN DATABASE WITH PARAMS, CALL addUserSubscription TO ADD RECORD");

            let params = {
                Key: {
                    "date": oldDate,
                    "uid": uid
                },
                TableName: tableName
            };

            return docClient.delete(params).promise().then((a)=> {
                return createUserSubscription(newDate, uid.substring(0, uid.indexOf("-")),
                    uid.substring(uid.indexOf("-") + 1));
            }, (error)=> {
                throw Error(error);
            });
        });
    }
};

/**
 * Paramaterized function to create user subscription record in Dynamo
 *
 * @param date date to add
 * @param platform (fb, slack, etc.)
 * @param uid unique id based on platform
 * @returns {*} Promise of dynamo put
 */
var createUserSubscription = function (date, platform, uid) {
    let params = {
        TableName: tableName,
        Item: {
            "date": date,
            "uid": `${platform}-${uid}`
        }
    };

    return docClient.put(params).promise();
};

module.exports = subscriptionsDAO;
