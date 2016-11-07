'use strict';

let config = require('./../../../config');

const aws = require('aws-sdk');
aws.config.update({ region: 'us-east-1' });

let docClient = new aws.DynamoDB.DocumentClient();
const tableName = `${config.TABLE_PREFIX}ItemVariations`;

let itemVariationsDAO = {
  addItemVariation: (asin, variations) => {
    let params = {
      TableName: tableName,
      Item: {
        asin: asin,
        variations: variations,
        date: new Date().toISOString()
      }
    };

    return docClient.put(params).promise()
      .then((success) => {
        console.log(`Successfully added ASIN ${asin} to ItemVariations`);
        return asin;
      }, (error) => {
        console.log(`ERROR adding asin ${asin} to ItemVariations: ${error}`);
      });
  },
  getItemVariation: (asin) => {
    let params = {
      TableName: tableName,
      Key: {
        asin: asin
      }
    };

    return docClient.get(params).promise()
      .then((data) => {
        if (Object.keys(data).length != 0) {
          console.log(`Successfully retrieved ASIN ${asin} from ItemVariations`);
          return data.Item;
        } else {
          console.log(`Did not find ASIN ${asin} in ItemVariations`);
          return null;
        }
      }, (error) => {
        console.log(`ERROR getting item from ItemVariations: ${error}`);
      });
  }
};

module.exports = itemVariationsDAO;
