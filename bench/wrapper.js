'use strict';
const express = require('express');
const bodyParser = require('body-parser')

let app = express();
let handler = require('../handler').hello;
app.use(bodyParser.json());

app.all('/', (req, res) => {
  let context = {};
  let event = {
    body: req.body,
    method: req.method,
    headers: req.headers,
    query: req.query,
    stage: 'dev',
    params: req.params
  };
  //console.log(prettyPrint(event));
  if (event.method === 'GET')
    res.send(event.query['hub.challenge']);
  else
  handler(event, context, fakeCallback);
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
