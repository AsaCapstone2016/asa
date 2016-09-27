/**
 * Created by evan on 9/20/16.
 */
var facebookEventConverter = require('../modules/facebook-event-converter/index');
var expect = require('chai').expect;

//This is a basic FB event
describe('Facebook Event Converter', function () {

    describe('convertEvent', function () {
        it('returns correct object for given facebook message event', function () {


            //Simple text message.
            var facebookEvent = {
                "object": "page",
                "entry": [
                    {
                        "id": "671648416325901",
                        "time": 1474479140224,
                        "messaging": [
                            {
                                "sender": {
                                    "id": "1114852861896648"
                                },
                                "recipient": {
                                    "id": "671648416325901"
                                },
                                "timestamp": 1474479140179,
                                "message": {
                                    "mid": "mid.1474479140172:fddaed0caa2f0e4589",
                                    "seq": 7,
                                    "text": "hey"
                                }
                            }]
                    }]
            };
            var event = facebookEventConverter.convertEvent(facebookEvent);

            expect(event[0]).to.deep.equal({
                UID: "1114852861896648",
                message: {
                    payload: "hey",
                    action: "text"
                }
            });
        });

        it('returns correct object for given facebook postback event', function () {

            var facebookEvent = {
                "object": "page",
                "entry": [
                    {
                        "id": "671648416325901",
                        "time": 1474479140224,
                        "messaging": [
                            {
                                "sender": {
                                    "id": "1114852861896648"
                                },
                                "recipient": {
                                    "id": "671648416325901"
                                },
                                "timestamp": 1474479140179,
                                "postback": {
                                    "payload": "ITEM_LOOKUP"
                                }
                            }
                        ]
                    }
                ]
            };

            var event = facebookEventConverter.convertEvent(facebookEvent);

            expect(event[0]).to.deep.equal({
                UID: "1114852861896648",
                message: {
                    payload: "ITEM_LOOKUP",
                    action: "postback"
                }
            });

        });

    });

});
