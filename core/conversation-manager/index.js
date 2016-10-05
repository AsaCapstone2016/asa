'use strict';

let amazon = require('amazon');
let Wit = require('cse498capstonewit').Wit;
let log = require('cse498capstonewit').log;

const config = require('./../../config');
const WIT_TOKEN = config.WIT_TOKEN;

const sessions = {};
let messageSender

let findOrCreateSession = (fbid) => {
  let sessionId;

  Object.keys(sessions).forEach((key) => {
    if (sessions[key].fbid === fbid) {
      sessionId = key;
    }
  });

  if (!sessionId) {
    sessionId = new Date().toISOString();
    sessions[sessionId] = {
      fbid: fbid,
      context: {}
    };
  }

  return sessionId;
};

const actions = {
  send(request, response) {
    const recipientId = sessions[request.sessionId].fbid;
    if (recipientId) {
      const msg = response.text;
      console.log(msg);
      if (msg === '<send_items>') {
        // console.log(`SEND LIST OF ITEMS`);
        const items = request.context.items;
        return messageSender.sendGenericTemplateMessage(recipientId, items)
          .then(() => null);
      } else {
        console.log(`SEND "${msg}" to ${recipientId}`);
        return messageSender.sendTextMessage(recipientId, msg)
          .then(() => null);
      }
    }
  },
  search(request) {
    messageSender.sendTypingMessage(sessions[request.sessionId].fbid);
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
  }
};

const witClient = new Wit({
  accessToken: WIT_TOKEN,
  actions: actions,
  logger: new log.Logger(log.INFO)
});

module.exports.handler = (message, sender, msgSender) => {
  let sessionId = findOrCreateSession(sender);
  messageSender = msgSender;

  if (message.content.action === 'text') {
    let text = message.content.payload;
    return witClient.runActions(sessionId, text, sessions[sessionId].context)
      .then((ctx) => {
        sessions[sessionId].context = ctx;
      });
  } else if (message.content.action === 'postback') {
    console.log('postback');
  }
}