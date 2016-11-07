'use strict';
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
    if (err) console.log('Too many requests, retrying...')
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

function pointEndpointLocally(apiId, resource, url) {
  deleteIntegration(apiId, resource, () => {
    putIntegration(apiId, resource, url, () => {
      putIntegrationResponse(apiId, resource, url, () => {
        createDeployment(apiId);
      });
    })
  });
}

function deleteIntegration(apiId, resource, next) {
    var params = {
      httpMethod: resource.method,
      resourceId: resource.id,
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

function putIntegration(apiId, resource, url, next) {
    var params = {
      type: 'HTTP',
      httpMethod: resource.method,
      integrationHttpMethod: resource.method,
      resourceId: resource.id,
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

function putIntegrationResponse(apiId, resource, url, next) {
    var params = {
      httpMethod: resource.method,
      resourceId: resource.id,
      restApiId: apiId,
      statusCode: resource.statusCode 
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
      getResources(restId, (resources) => {
        let endpoints = resources.reduce((endpoints, resource) => {
          for (let method in resource['resourceMethods']) {
            endpoints.push({
              id: resource.id,
              method: method,
              path: resource.path,
              pathPart: resource.pathPart,
              statusCode: resource.pathPart.search('redirect') < 0 ? '200' : '302' // hacky but no way to see current int response from resource
            });
          }
          return endpoints;
        },[]);

        endpoints.forEach(endpoint => {
          let endpointUrl = url + endpoint.pathPart;
          console.log(`Pointing ${endpoint.path} to: ${endpointUrl}`);
          pointEndpointLocally(restId, endpoint, endpointUrl);
        });
      })
    });
  }
});
