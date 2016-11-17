/**
 * Created by evan on 11/17/16.
 */
'use strict';

let config = require('./../../config');
let aws = require('aws-sdk');
let fetch = require('node-fetch');
aws.config.update({region: 'us-east-1'});

let docClient = new aws.DynamoDB.DocumentClient();
//let callAddPurchase = limit(require('./../user-profiler').addPurchase).to(1).per(1000);
const tablePrefix = 'ASA-prod-';

let sessionParams = {
    TableName: `${tablePrefix}Sessions`,
    Count: true
};

let message = "hey man";

docClient.scan(sessionParams).promise().then((data)=> {

    for (var i = 0; i < data.Count; i++) {
        let purchasedItem = data.Items[i];

        let uid = purchasedItem.uid;

        // UNCOMMENT THIS AND ENTER MESSAGE ABOVE TO ACTUALLY SEND BROADCAST
        // WITH GREAT POWER COMES GREAT RESPONSIBILITY.

        //sendTextMessage(uid,message).then(()=>{
        //    console.log('sent message');
        //});
    }
});

function sendTextMessage(recipient_id, message, quick_replies) {
    // Quick reply field defaults to empty array
    quick_replies = quick_replies === undefined ? [] : quick_replies;

    if (quick_replies.length > 10) {
        console.log(`ERROR: trying to send more than 10 quick replies ${JSON.stringify(quick_replies, null, 2)}`);
    }

    var json = {
        recipient: {
            id: recipient_id
        },
        message: {
            text: message
        }
    };

    quick_replies = quick_replies.map(reply => {
        return {
            content_type: 'text',
            title: reply.text,
            payload: reply.payload
        }
    });

    if (quick_replies.length > 0) {
        json.message.quick_replies = quick_replies;
    }

    return callSendAPI(json);
}

function callSendAPI(messageData) {

    var qs = 'access_token=' + encodeURIComponent('EAAPqNnpscTcBAG2gZB9tXXPvsZChcxTTV6uwBqwBtZAp99sZAmZANUvOlp6h9425y7ebA9NTRMn4JCmJarTxDbIU5aJZCcwNXK7ZB5Ii4CFmeUrtWRwNaFjVOTZAdxR6pgS5oYX0zqe19aJFtwXzeilhB88WQVPJlAYpdZBteUc3fPQZDZD');

    return fetch('https://graph.facebook.com/v2.6/me/messages?' + qs, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(messageData)
    })
        .then(function (rsp) {
            return rsp.json();
        })
        .then(function (json) {
            if (json.error && json.error.message) {
                throw new Error(json.error.message);
            }
        });
}