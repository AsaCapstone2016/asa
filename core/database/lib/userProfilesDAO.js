'use strict';

let config = require('./../../../config');

let aws = require('aws-sdk');
aws.config.update({ region: 'us-east-1' });

let docClient = new aws.DynamoDB.DocumentClient();
const tableName = `${config.TABLE_PREFIX}UserProfiles`;

var userProfilesDAO = {
	getUserProfile: (uid, platform) => {
		// construct compound unique identifier
		uid = `${platform}-${uid}`;

		let params = {
			TableName: tableName,
			Key: {
				uid: uid
			}
		};

		return docClient.get(params).promise()
			.then((data) => {
				if (Object.keys(data).length != 0) {
					// if user profile exists, get it
					return data.Item.profile;
				} else {
					// if user profile doesn't exist, create it
					let params = {
						TableName: tableName,
						Item: {
							uid: uid,
							profile: {}
						}
					};
					return docClient.put(params).promise()
						.then((success) => params.Item.profile);
				}
			});
	},
	updateUserProfile: (uid, platform, profile) => {
		// construct compound unique identifier
		uid = `${platform}-${uid}`;

		let params = {
			TableName: tableName,
			Key: {
				uid: uid
			},
			UpdateExpression: 'set profile = :profile',
			ExpressionAttributeValues: {
				':profile': profile
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return docClient.update(params).promise()
			.then((success) => {
				console.log(`Updated user profile for ${uid} to ${JSON.stringify(profile)}`);
			}, (error) => {
				console.log(`ERROR updating context: ${error}`);
			});
	}
};

module.exports = userProfilesDAO;
