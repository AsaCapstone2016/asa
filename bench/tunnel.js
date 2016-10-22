const ngrok = require('ngrok');
const AWS = require('aws-sdk');
const apigateway = new AWS.APIGateway();
const config = require('../config');

let options = {
  proto: 'http',
  addr: 3000,
  subdomain: 'asa-dev-sam',
  authtoken: config.NGROK_TOKEN,
  region: 'us'
}

ngrok.connect(options,(err, url) => {
  if (err)
    console.log(err);
  console.log('url: ', url);
});
