/**
 * Created by evan on 11/11/16.
 */
'use strict';
var config = require('./../config');
var amazon = require('./../core/amazon');

// This is what makes this the facebook messenger endpoint
var fb = require('./../core/platforms').fbMessenger;
let remindersDAO = require('./../core/database').remindersDAO;
/**
 * Lambda function for purchase redirect that logs some information about the purchase click
 * uid, redirect_url, ASIN, and is_cart all need to be passed in as queries on the url
 * @param event
 * @param context
 * @param callback
 */
module.exports.reminderEvent = function (event, context, callback) {
    let reminders = event.body;
    reminders.forEach((reminder)=> {
        let date = reminder.date;
        let id = reminder.id;
        let platform = reminder.platform;
        let uid = reminder.uid;
        let message = reminder.message;

        if (platform === 'fb') {
            fb.messageSender.sendTextMessage(uid, `Hey! You asked me to remind you to ${message}`).then(()=> {
                remindersDAO.removeReminder(date, id).then(()=> {

                });
            });
        }
    });
};
