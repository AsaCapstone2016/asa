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
  let op1 = {
    op: 'replace',
    path: '/uri',
    value: url
  }
  //let op2 = {
    //op: 'replace',
    //path: '/integration',
    //value: 'HTTP'
  //}
  let operations = [op1];//, op2];
    var params = {
      httpMethod: 'POST',
      resourceId: resourceId,
      restApiId: apiId,
      patchOperations: operations
    };

    apigateway.updateIntegration(params, function (err, data) {
      if (err) {
        console.log('AWS Error', err);
      } else {
        console.log('Put Integration Method Created');
      }
    });
}

ngrok.connect(3000, (err, url) => {
  if (err)
    console.log(err);
  else {
    url += '/';
    console.log('url: ', url);
    getEndpointId(`${process.env.SLS_USER}-ASA`, (id) => {
      getResources(id, (items) => {
        console.log(items);
        pointEndpointLocally(id, items[0].id, url);
      })
    });
  }
});
