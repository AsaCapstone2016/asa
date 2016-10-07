const aws = require('aws-sdk');
aws.config.update({ region: 'us-east-1' });

let docClient = new aws.DynamoDB.DocumentClient();
const tableName = 'ItemVariations';

module.exports.itemVariationsDAO = {
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
				console.log(`successfully added asin ${asin} to ItemVariations`);
				return asin;
			}, (error) => {
				console.log(`error adding asin ${asin} to ItemVariations: ${error}`);
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
					console.log(`successfully retrieved asin ${asin} from ItemVariations`);
					return data.Item;
				} else {
					console.log(`did not find asin ${asin} in ItemVariations`);
					return null;
				}
			}, (error) => {
				console.log(`error getting item from ItemVariations: ${error}`);
			});
	}
}
