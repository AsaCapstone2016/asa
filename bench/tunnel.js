const ngrok = require('ngrok');
const AWS = require('aws-sdk');
const apigateway = new AWS.APIGateway();

let config = {
  proto: 'http',
  addr: 3000,
  subdomain: 'asa-dev-sam',
  authtoken: '',
  region: 'us'
}

ngrok.connect(config,(err, url) => {
  console.log('url: ', url);
});
