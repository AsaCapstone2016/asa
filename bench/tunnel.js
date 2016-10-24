const ngrok = require('ngrok');
const AWS = require('aws-sdk');
const apigateway = new AWS.APIGateway({region: process.env.SLS_REGION});

function getDeployments(restId, next) {
  var params = {
    restApiId: restId,
    limit: 100
  };
  apigateway.getDeployments(params, (err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
    else {
      let id = data.items[1].id;
      apigateway.getDeployment({restApiId: restId, deploymentId: id}, (err, data) => {
        console.log(data);
      });
    } 
  });
}

function createDeployment(restId, next) {
  var params = {
    restApiId: restId,
    stageName: process.env.SLS_USER
  };
  apigateway.createDeployment(params, (err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
    else {
      console.log('Deployment created');
    } 
  });
}

function getEndpointObject(name, next) {
  var params = {
    limit: 100
  };
  apigateway.getRestApis(params, (err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
    else {
      next(data.items.filter(api => api.name === name)[0]);
    } 
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

function pointEndpointLocally(apiId, resourceId, url) {
  deleteIntegration(apiId, resourceId, () => {
    putIntegration(apiId, resourceId, url, () => {
      putIntegrationResponse(apiId, resourceId, url, () => {
        createDeployment(apiId);
      });
    })
  });
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
        next();
      }
    });
}

function putIntegration(apiId, resourceId, url, next) {
    var params = {
      type: 'HTTP',
      httpMethod: 'POST',
      integrationHttpMethod: 'POST',
      resourceId: resourceId,
      restApiId: apiId,
      uri: url
    };

    apigateway.putIntegration(params, function (err, data) {
      if (err) {
        console.log('PutIntegration Error', err);
      } else {
        console.log('Put Integration Completed');
        next();
      }
    });
}

function putIntegrationResponse(apiId, resourceId, url, next) {
    var params = {
      httpMethod: 'POST',
      resourceId: resourceId,
      restApiId: apiId,
      statusCode: '200'
    };

    apigateway.putIntegrationResponse(params, function (err, data) {
      if (err) {
        console.log('PutIntegrationResponse Error', err);
      } else {
        console.log('Put Integration Response Completed');
        next();
      }
    });
}

ngrok.connect(3000, (err, url) => {
  if (err)
    console.log(err);
  else {
    url += '/';
    console.log('url: ', url);
    getEndpointId(`${process.env.SLS_USER}-ASA`, (restId) => {
      getResources(restId, (items) => {
        let fbWebhookEndpoint = items.filter(item => item.path === '/fb-webhook')[0];
        pointEndpointLocally(restId, fbWebhookEndpoint.id, url);
      })
    });
  }
});
