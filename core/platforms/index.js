'use strict';

module.exports = {
    fbMessenger: {
        eventConverter: require('./lib/facebook-event-converter'),
        messageSender: require('./lib/facebook-message-sender')
    }
};