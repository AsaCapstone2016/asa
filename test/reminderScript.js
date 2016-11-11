/**
 * Created by evan on 11/11/16.
 */
'use strict';
let fetch = require('node-fetch');
let config = require('../config');
let remindersDAO = require('./../core/database').remindersDAO;

let testUID = '998822520243400'; // CHANGE TO RENEE's FOR BETA
let testReminderMessage = 'buy an anniversary present';

//Date doesn't matter here since we are calling reminder event manually
remindersDAO.addReminder("2016-11-11T19:30:02Z", testUID, 'fb', testReminderMessage).then(()=> {
    remindersDAO.getRemindersForDateTime("2016-11-11T19:30:02Z").then((results)=> {
        let items = results.Items;
        fetch(config.REMINDER_EVENT_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(items)
        })
            .then(function (rsp) {
                console.log("HANDLING RESPONSE.");
            })
            .then(function (json) {
                if (json.error && json.error.message) {
                    throw new Error(json.error.message);
                }
            });
    });

});
