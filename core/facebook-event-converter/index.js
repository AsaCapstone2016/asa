'use strict';

/**
 * Created by evan on 9/20/16.
 */
var facebookEventConverter = {

    /**
     *  This function converts the incoming facebook event into a generalized event that can be
     *  used by the system. Currently this is returning the following object:
     *  {
     *    UID: unique user Id
     *    content:{
     *      payload: payload of message (could just be text).
     *      action: action of message(text, postback, etc.).
     *    }
     *  }
     *
     */
    convertEvent: function (event) {

        var messageObjects = [];

        // Entry is an array of enrties so we need to make sure to hit all of them.
        event.body.entry.forEach(function (entry) {

            var entry_id = entry.id;

            // Messaging is an array of messaging objects so we need to make sure to hit all of them.
            entry.messaging.forEach(function (messaging) {

                const senderId = messaging.sender.id;
                const message = messaging.message;
                const postback = messaging.postback;

                if (senderId == entry_id)
                    return;

                // If message is part of this object, we are processing simple text message
                if (message) {
                    let payload = message.text;
                    let action = "text";
                    
                    // If this message has a quick reply check if there's a unique payload
                    if (message.quick_reply !== undefined) {
                        payload = message.quick_reply.payload;
                        action = message.text == payload ? "text" : "postback";
                    }

                    messageObjects.push({
                        UID: senderId,
                        content: {
                            payload: payload,
                            action: action
                        }
                    });
                }

                // If postback is part of this object, then we are processing postback message
                else if (postback) {
                    messageObjects.push({
                        UID: senderId,
                        content: {
                            payload: postback.payload,
                            action: "postback"
                        }
                    });
                }

            });

        });

        return messageObjects;
    }
};

module.exports = facebookEventConverter;
