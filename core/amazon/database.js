const aws = require('aws-sdk');
aws.config.update({ region: 'us-east-1' });

let docClient = new aws.DynamoDB.DocumentClient();
const tableName = "ItemVariations";

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
			}, (error) => {
				console.log(`error adding asin ${asin} to ItemVariations: ${error}`);
			});
	}
}
