/**
 * Created by evan on 11/11/16.
 */
'use strict';
let fetch = require('node-fetch');
let config = require('../config');
let uids = ['fb-998822520243400'];

fetch(config.SUGGESTION_EVENT_URL, {
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