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

            //Messaging is an array of messaging objects so we need to make sure to hit all of them.
            entry.messaging.forEach(function (messaging) {
                if (messaging.sender.id == entry_id)
                    return;
                //If message is part of this object, we are processing simple text message
                if (messaging.message) {
                    let msg_content;
                    if (messaging.message.quick_reply !== undefined) {
                        msg_content = {
                            payload: messaging.message.quick_reply.payload,
                            action: "postback"
                        };
                    } else {
                        msg_content = {
                            payload: messaging.message.text,
                            action: "text"
                        };
                    }
                    messageObjects.push({
                        UID: messaging.sender.id,
                        content: msg_content
                    });
                }

                //If postback is part of this object, then we are processing postback message
                else if (messaging.postback) {
                    messageObjects.push({
                        UID: messaging.sender.id,
                        content: {
                            payload: messaging.postback.payload,
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
