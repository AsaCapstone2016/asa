/**
 * Created by evan on 9/25/16.
 */
global.process.env = {
    FB_PAGE_TOKEN: "EAAZAnfcKVNkQBAAchm4tB9PLBTZAFWkDpSBmfRav1ZBkZAri6MJT8evLkUKJ4TZAxtmzTIO6HHqfHDA769hmZB7IJOrqYmnc3TbRS5S5uFER0E8nZCOGM6Kml47VzbGQZApLRh6qVQa5do4d6M7sUt8mX6zfEWpZATuDLYO7tpnhQogZDZD"
};
var facebookMessageSender = require('../modules/facebook-message-sender/index');
var expect = require('chai').expect;

describe('Facebook Messege Sender', function () {

    describe('convertEvent', function () {
        it('returns correct object for given facebook message event', function () {


            //Simple text message.
            var message = {
                recipient_id: 1114852861896648,
                text: "Hey!!!"
            };

            facebookMessageSender.sendTextMessage(message).then(function(json){
                console.log(json);
            });

        });

    });

});