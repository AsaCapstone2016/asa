/**
 * Created by evan on 9/20/16.
 */
var facebookEventConverter = {

    /**
     *  This function converts the incoming facebook event into a generalized event that can be
     *  used by the system. Currently this is returning the following object:
     *  {
     *    UID: unique user Id
     *    message:{
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
                    messageObjects.push({
                        UID: messaging.sender.id,
                        message: {
                            payload: messaging.message.text,
                            action: "text"
                        }
                    });
                }

                //If postback is part of this object, then we are processing postback message
                else if (messaging.postback) {
                    messageObjects.push({
                        UID: messaging.sender.id,
                        message: {
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

