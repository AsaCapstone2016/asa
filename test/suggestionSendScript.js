/**
 * Created by evan on 11/11/16.
 */
'use strict';
let fetch = require('node-fetch');
let config = require('../config');
let uids = ['fb-1061868600596425'];

fetch('https://v2x7ya8oca.execute-api.us-east-1.amazonaws.com/dev/suggestion-event', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(uids)
})
    .then(function (rsp) {
        console.log("HANDLING RESPONSE.");
    })
    .then(function (json) {
        if (json.error && json.error.message) {
            throw new Error(json.error.message);
        }
    });