'use strict';
const express = require('express');
const bodyParser = require('body-parser')

let app = express();
let facebookLambda = require('../functions/fb-endpoint').facebookLambda;
let cartRedirect = require('../functions/cart-redirect.js').cartRedirect;

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

app.get('/cart-redirect', (req, res) => {
  let context = {};
  context.succeed = (obj) => {
    res.redirect(obj.location);
  }

  let event = mapEventToLambda(req);
  cartRedirect(event, context, fakeCallback);
});

app.post('/fb-webhook', (req, res) => {
  res.sendStatus(200);
  let context = {};
  let event = mapEventToLambda(req);
  facebookLambda(event, context, fakeCallback);
});

app.get('/fb-webhook', (req, res) => {
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
