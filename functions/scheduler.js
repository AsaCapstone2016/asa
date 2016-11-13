'use strict';
let config = require('./../config');
let subscriptionsDAO = require('./../core/database').subscriptionsDAO;

let fetch = require('node-fetch');
let aws = require('aws-sdk');
let lambda = new aws.Lambda({
    region: 'us-east-1' //change to your region
});

const notificationInterval = 7;

module.exports.scheduler = function (event, context, callback) {

    let date = event.time;
    subscriptionsDAO.getUsersForDate(date).then((data) => {
        let count = data.Count;

        //Exit scheduler if no items to publish for
        if (count == 0) {
            return;
        }

        let uids = data.Items.map((item)=> {
            return item.uid
        });
        return fetch(config.SUGGESTION_EVENT_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(uids)
        })
            .then(function (rsp) {
                console.log("HANDLING RESPONSE.");
                let promiseArray = [];

                //Get date into our format.
                let newDate = new Date();
                newDate.setDate(newDate.getDate() + notificationInterval); //Adding 7 days for now, can change.
                newDate = newDate.toISOString();
                newDate = newDate.substring(0, newDate.indexOf(':'));

                data.Items.forEach((item)=> {
                    promiseArray.push(subscriptionsDAO.updateUserSubscription(item.date, item.uid, newDate));
                });
                return Promise.all(promiseArray).then(()=> {
                    return rsp.json()
                });
            })
            .then(function (json) {
                if (json.error && json.error.message) {
                    throw new Error(json.error.message);
                }
            });

    }, (error)=> {
        console.log(`ERROR: ${error}`);
    });
};
