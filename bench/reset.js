const ngrok = require('ngrok');
const AWS = require('aws-sdk');
const cloudformation = new AWS.CloudFormation({region: process.env.SLS_REGION});
const STACK_NAME = `ASA-${process.env.SLS_USER}`;

function deleteStack() {
  var params = {
    StackName: STACK_NAME
  }
  cloudformation.deleteStack(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
}

function getEndpointId(name, next) {
  var params = {
    limit: 100
  };
  apigateway.getRestApis(params, (err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
    else {
      next(data.items.filter(api => api.name === name)[0].id);
    } 
  });
}

function getResources(apiId, next) {
  const params = {
    restApiId: apiId
  };
  apigateway.getResources(params, (err, data) => {
    if (err) console.log('error', err);
    else {
      next(data.items);
    }
  })
}

function deleteResource(apiId, resourceId) {
  const params = {
    restApiId: apiId,
    resourceId: resourceId
  };
  apigateway.deleteResource(params, (err, data) => {
    if (err) console.log('error', err);
    else {
      console.log('Resource deleted');
      //next(data.items);
    }
  })

}

function deleteIntegration(apiId, resourceId, next) {
  var params = {
    httpMethod: 'POST',
    resourceId: resourceId,
    restApiId: apiId,
  };

  apigateway.deleteIntegration(params, function (err, data) {
    if (err) {
      console.log('DeleteIntegration Error', err);
    } else {
      console.log('Integration Deleted');
    }
  });
}

function reset() {
  //getEndpointId(`${process.env.SLS_USER}-ASA`, (restId) => {
    //getResources(restId, (items) => {
      //let fbWebhookEndpoint = items.filter(item => item.path === '/fb-webhook')[0];
      ////deleteIntegration(restId, fbWebhookEndpoint.id);
      //deleteResource(restId, fbWebhookEndpoint.id);
    //})
  //});
  deleteStack();
}

reset();
