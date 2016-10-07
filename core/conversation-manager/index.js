'use strict';

let amazon = require('amazon');
let Wit = require('cse498capstonewit').Wit;
let log = require('cse498capstonewit').log;

const config = require('./../../config');
const WIT_TOKEN = config.WIT_TOKEN;

// for dynamodb configuration
let aws = require('aws-sdk');
aws.config.update({ region: 'us-east-1' });

let messageSender;

/**
 * Retrieve session from database or create new one from user id
 * uid: user id of recipient, primary key for db record
 */
let getSessionIdFromUserId = (uid) => {
  let docClient = new aws.DynamoDB.DocumentClient();
  let table = 'Sessions';
  let record, sessionId;

  let params = {
    TableName: table,
    Key: {
      uid: uid
    }
  };

  return docClient.get(params).promise()
    .then((data) => {
      if (Object.keys(data).length != 0) {
        // if session exists, grab it
        console.log('session exists!');
        return data.Item;
      } else {
        // if session does not exist, create it
        console.log('session does not exist!');
        let params = {
          TableName: table,
          Item: {
            uid: uid,
            sessionId: new Date().getTime(),
            context: {}
          }
        };
        return docClient.put(params).promise()
          .then((success) => params.Item);
      }
    });
};

/**
 * Retrieve user id from session id
 * sessionId: session id, primary key for sessionId index
 */
let getUserIdFromSessionId = (sessionId) => {
  let docClient = new aws.DynamoDB.DocumentClient();
  let table = 'Sessions';
  let index = 'sessionId-index';

  let params = {
    TableName: table,
    IndexName: index,
    KeyConditionExpression: 'sessionId = :sessionId',
    ExpressionAttributeValues: {
      ':sessionId': sessionId
    },
    ProjectionExpression: 'uid'
  };

  return docClient.query(params).promise()
    .then((data) => {
      console.log(`successfully got uid from index: ${JSON.stringify(data)}`);
      return data.Items[0].uid; // this seems to potentially be able to return more than one item, should we just always return the first? 
    }, (error) => {
      console.log(`error using index ${error}`);
    });
};

/**
 * Update context in database given user id
 * uid: user id of the user whose context we want to update
 * ctx: new user context
 */
let updateContext = (uid, ctx) => {
  let docClient = new aws.DynamoDB.DocumentClient();
  let table = 'Sessions';

  let params = {
    TableName: 'Sessions',
    Key: {
      uid: uid
    },
    UpdateExpression: 'set context = :ctx',
    ExpressionAttributeValues: {
      ':ctx': ctx
    },
    ReturnValues: 'UPDATED_NEW'
  };

  console.log(`updating context for ${uid} to ${JSON.stringify(ctx)}`);
  return docClient.update(params).promise()
    .then((success) => {
      console.log(`successfully updated context for user ${uid}`);
    }, (error) => {
      console.log(`error updating context: ${error}`);
    });
};

// todo: split this out into different actions
const actions = {
  send(request, response) {
    return getUserIdFromSessionId(request.sessionId)
      .then((recipientId) => {
        console.log(`send() recipientId: ${recipientId}`);

        if (recipientId) {
          const msg = response.text;
          console.log(msg);
          console.log(`SEND "${msg}" to ${recipientId}`);
          return messageSender.sendTextMessage(recipientId, msg)
            .then(() => null);
        }

      }, (error) => {
        console.log(`error in send action: ${error}`);
      });
  },
  sendHelpMessage(request) {
    return getUserIdFromSessionId(request.sessionId)
      .then((recipientId) => {
        if (recipientId) {
          let msg = "Hey, think of me as your personal shopping assistant.";
          msg += " I can help you discover and purchase items on Amazon.";
          msg += " You could ask me...\n\n";
          msg += "  - I'm looking for an xbox\n";
          msg += "  - Can you search for rainboots?\n";
          msg += "  - I want to buy something";
          console.log(`SEND HELP MESSAGE`);
          return messageSender.sendTextMessage(recipientId, msg)
            .then(() => null);
        }
      }, (error) => {
        console.log(`error in sendHelpMessage: ${error}`);
      });
  },
  search(request) {
    return getUserIdFromSessionId(request.sessionId)
      .then((recipientId) => {
        console.log(`search() recipientId: ${recipientId}`);

        messageSender.sendTypingMessage(recipientId);
        let entities = request.entities;
        let context = request.context;
        return new Promise((resolve, reject) => {
          if ('search_query' in entities) {
            return amazon.itemSearch(entities.search_query[0].value).then((json)=> {
              context.items = json;
              delete context.missing_keywords;
              return resolve(context);
            });
          } else {
            context.missing_keywords = true;
            delete context.items;
            return resolve(context);
          }
        });
      }, (error) => {
        console.log(`error in search action: ${error}`);
      });
  },
  sendSearchResults(request) {
    return getUserIdFromSessionId(request.sessionId)
      .then((recipientId) => {
        console.log(`sendSearchResults() recipientId: ${recipientId}`);

        if (recipientId) {
          console.log(`SEND LIST OF ITEMS`);
          const items = request.context.items;
          return messageSender.sendSearchResults(recipientId, items)
            .then(() => null);
        }

      }, (error) => {
        console.log(`error in sendSearchResults action: ${error}`);
      });
  }
};

const witClient = new Wit({
  accessToken: WIT_TOKEN,
  actions: actions,
  logger: new log.Logger(log.INFO)
});

/**
 * message: message sent by sender
 * sender: uid of sender
 * msgSender: messaging platform specific message sender
 */
module.exports.handler = (message, sender, msgSender) => {
  return getSessionIdFromUserId(sender)
    .then((session) => {

      console.log(`session retrieved from database: ${JSON.stringify(session)}`);

      messageSender = msgSender;

      let uid = session.uid;
      let sessionId = session.sessionId;
      let context = session.context;

      console.log(`session: ${JSON.stringify(session)}`);

      if (message.content.action === 'text') {
        console.log(`user sent a text message`);
        let text = message.content.payload;

        console.log(`sent to runActions: ${sessionId}, ${text}, ${JSON.stringify(context)}`);

        return witClient.runActions(sessionId, text, context)
          .then((ctx) => {
            return updateContext(uid, ctx);
          }, (error) => {
            console.log(`error running actions: ${error}`);
          });
      } else if (message.content.action === 'postback') {
        // yiming will be putting stuff here
        console.log('postback');
      }
    }, (error) => {
      console.log(`error retrieving session from database: ${error}`);
    });
}