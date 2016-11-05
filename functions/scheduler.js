'use strict';
var config = require('./../config');
var subscriptionsDAO = require('database').subscriptionsDAO;

var fetch = require('node-fetch');
var aws = require('aws-sdk');
var lambda = new aws.Lambda({
    region: 'us-east-1' //change to your region
});

module.exports.scheduler = function (event, context, callback) {

    let date = event.time;
    return subscriptionsDAO.getUsersForDate(date).then((data) => {
        let count = data.Count;

        //Exit scheduler if no items to publish for
        if (count == 0) {
            return;
        }

        let uids = data.Items.map((item)=> {
            return item.uid
        });
        return fetch('https://leshjj62v9.execute-api.us-east-1.amazonaws.com/evan/suggestion-event', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(uids)
        })
            .then(function (rsp) {
                return rsp.json();
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
