'use strict';
var config = require('./../config');
var subscriptionsDAO = require('database').subscriptionsDAO;

var aws = require('aws-sdk');
var lambda = new aws.Lambda({
    region: 'us-east-1' //change to your region
});


module.exports.scheduler = function (event, context, callback) {

    let date = event.time;
    subscriptionsDAO.getUsersForDate(date).then((data) => {

        lambda.invoke({
            FunctionName: 'suggestionEvent', // pass params
            Payload: "HAHA"
        }, function (error, data) {
            if (error) {
                console.log(`ERROR: ${error}`);
                context.done('error', error);
            }
            console.log(`DATA: ${data}`);
            if (data.Payload) {
                context.succeed(data.Payload)
            }
        });

        console.log(`SUBSCRIPTION DATA : ${JSON.stringify(data, null, 2)}`);

    }, (error)=> {
        console.log(`ERROR: ${error}`);
    });
};
