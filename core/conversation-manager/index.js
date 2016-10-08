'use strict';

let amazon = require('amazon');
let Wit = require('cse498capstonewit').Wit;
let log = require('cse498capstonewit').log;

const config = require('./../../config');
const WIT_TOKEN = config.WIT_TOKEN;

// for dynamodb configuration
let aws = require('aws-sdk');
aws.config.update({ region: 'us-east-1' });

// Store messageSender in a variable accessible by the Wit actions
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
        console.log('SESSION exists!');
        return data.Item;
      } else {
        // if session does not exist, create it
        console.log('SESSION does not exist!');
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
let getSessionFromSessionId = (sessionId) => {
  let docClient = new aws.DynamoDB.DocumentClient();
  let table = 'Sessions';
  let index = 'sessionId-index';

  let params = {
    TableName: table,
    IndexName: index,
    KeyConditionExpression: 'sessionId = :sessionId',
    ExpressionAttributeValues: {
      ':sessionId': sessionId
    }
  };

  return docClient.query(params).promise()
    .then((data) => {
      // We should only ever have one session so just return the first item
      return data.Items[0];
    }, (error) => {
      console.log(`ERROR retrieving session: ${error}`);
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

  return docClient.update(params).promise()
    .then((success) => {
      console.log(`Updated context for ${uid} to ${JSON.stringify(ctx)}`);
    }, (error) => {
      console.log(`ERROR updating context: ${error}`);
    });
};

// todo: split this out into different actions
const actions = {
  send(request, response) {
    return getSessionFromSessionId(request.sessionId)
      .then((session) => {
        let recipientId = session.uid;

        if (recipientId) {
          const msg = response.text;
          console.log(`SEND "${msg}" to ${recipientId}`);
          return messageSender.sendTextMessage(recipientId, msg)
            .then(() => null);
        }

      }, (error) => {
        console.log(`ERROR in send action: ${error}`);
      });
  },
  sendHelpMessage(request) {
    return getSessionFromSessionId(request.sessionId)
      .then((session) => {
        let recipientId = session.uid;

        if (recipientId) {
          let msg = "Hey, think of me as your personal shopping assistant.";
          msg += " I can help you discover and purchase items on Amazon.";
          msg += " You could ask me...\n\n";
          msg += " - I'm looking for an xbox\n";
          msg += " - Can you find rainboots?\n";
          msg += " - I want to buy something";
          console.log(`SEND help message to ${recipientId}`);
          return messageSender.sendTextMessage(recipientId, msg)
            .then(() => null);
        }

      }, (error) => {
        console.log(`ERROR in sendHelpMessage: ${error}`);
      });
  },
  search(request) {
    return getSessionFromSessionId(request.sessionId)
      .then((session) => {
        let recipientId = session.uid;

        messageSender.sendTypingMessage(recipientId);

        let entities = request.entities;
        let context = request.context;
        return new Promise((resolve, reject) => {
          if ('search_query' in entities) {
            console.log(`SEARCH: ${entities.search_query[0].value}`);
            return amazon.itemSearch(entities.search_query[0].value)
              .then((json) => {
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
        console.log(`ERROR in search action: ${error}`);
      });
  },
  sendSearchResults(request) {
    return getSessionFromSessionId(request.sessionId)
      .then((session) => {
        let recipientId = session.uid;

        if (recipientId) {
          console.log(`SEND LIST OF ITEMS`);
          const items = request.context.items;
          return messageSender.sendSearchResults(recipientId, items)
            .then(() => null);
        }

      }, (error) => {
        console.log(`ERROR in sendSearchResults action: ${error}`);
      });
  },
  stopSelectingVariations(request) {
    return getSessionFromSessionId(request.sessionId)
      .then((session) => {
        let context = session.context;
        delete context.selectedVariations;
        return updateContext(session.uid, context);
      }, (error) => {
        console.log(`ERROR in stopSelectingVariations: ${error}`);
      });
  },
  resetVariations(request) {
    return getSessionFromSessionId(request.sessionId)
      .then((session) => {
        let context = session.context;
        context.selectedVariations = [];
        return updateContext(session.uid, context);
      }, (error) => {
        console.log(`ERROR in resetVariations: ${error}`);
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

      console.log(`SESSION: ${JSON.stringify(session)}`);

      messageSender = msgSender;

      let uid = session.uid;
      let sessionId = session.sessionId;
      let context = session.context;

      if (message.content.action === 'text') {

        // Handle text messages from the user
        let text = message.content.payload;
        console.log(`user sent a text message: ${text}`);
        return witClient.runActions(sessionId, text, context)
          .then((ctx) => {
            return updateContext(uid, ctx);
          }, (error) => {
            console.log(`ERROR during runActions: ${error}`);
          });

      } else if (message.content.action === 'postback') {

        // Handle button presses and quick replies
        let payload = JSON.parse(message.content.payload);
        console.log(`POSTBACK: ${JSON.stringify(payload)}`);

        if (payload.METHOD === "SELECT_VARIATIONS") {
          console.log("select variations");
          return actions.resetVariations(session)
            .then(() => {
              return amazon.variationPick(payload.ASIN, [], null)
            })
            .then((result) => {
              return messageSender.sendVariationSelectionPrompt(sender, result);
            }, (error => {
              console.log(`ERROR sending variation prompt: ${error}`);
            }));

        } else if (payload.METHOD === "VARIATION_PICK") {
          console.log("pick variation");
          if (payload.VARIATION_VALUE === "Nevermind") {
            return actions.stopSelectingVariations(session)
              .catch((error) => {
                console.log(`ERROR quitting variation selection: ${error}`);
              });
          } else {
            context.selectedVariations.push(payload.VARIATION_VALUE);
            return updateContext(session.uid, context)
              .then(() => {
                return amazon.variationPick(payload.ASIN, context.selectedVariations, null)
                  .then((result) => {
                    return messageSender.sendVariationSelectionPrompt(sender, result);
                  }, (error) => {
                    console.log(`ERROR sending next variation prompt: ${error}`);
                  });
              }, (error) => {
                console.log(`ERROR selecting variation: ${error}`);
              });
          }

        } else if (payload.METHOD === "ITEM_DETAILS") {
          console.log("item details");
          console.log(`Print summary for item ${payload.ASIN}`);

        } else if (payload.METHOD === "RESELECT") {
          console.log("reselect variations");
          return actions.resetVariations(session)
            .catch((error) => {
              console.log(`ERROR resetting selected variations: ${error}`);
            });

        } else {
          console.log("Unsupported postback method");
        }

      }

    }, (error) => {
      console.log(`ERROR retrieving session from database: ${error}`);
    });
}