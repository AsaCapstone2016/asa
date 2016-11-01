'use strict';
const express = require('express');
const bodyParser = require('body-parser')

let app = express();
let handler = require('../functions/fb-endpoint').facebookLambda;
app.use(bodyParser.json());

let mapEventToLambda = (req) => {
  return {
    body: req.body,
    method: req.method,
    headers: req.headers,
    query: req.query,
    stage: 'dev',
    params: req.params
  };
}

app.post('/', (req, res) => {
  res.sendStatus(200);
  let context = {};
  let event = mapEventToLambda(req);
  handler(event, context, fakeCallback);
});

app.get('/', (req, res) => {
  let context = {};
  let event = mapEventToLambda(req);
  res.send(event.query['hub.challenge']);
});

app.listen(3000, () => {
  console.log('listening on port 3000');
});


function prettyPrint(json) {
  return JSON.stringify(json, null, 4);
}

function fakeCallback(error, response) {
  return;
}
