/**
 * Created by evan on 11/11/16.
 */
'use strict';
var config = require('./../config');
var remindersDAO = require('./../core/database').remindersDAO;

var fetch = require('node-fetch');
var aws = require('aws-sdk');

module.exports.scheduler = function (event, context, callback) {

    let date = event.time;
    console.log(`DATE: ${date}`);
    return remindersDAO.getRemindersForDateTime(date).then((results)=> {
        let count = results.Count;

        //Exit scheduler if no items to publish for
        if (count == 0) {
            return;
        }

        let reminders = results.Items;
        return fetch(config.REMINDER_EVENT_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(reminders)
        })
            .then(function (rsp) {
                return rsp.json();
            })
            .then(function (json) {
                if (json.error && json.error.message) {
                    throw new Error(json.error.message);
                }
            });
    });
};
