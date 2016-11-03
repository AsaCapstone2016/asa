'use strict';

let utils = require('./utils');

// Should we double count browse nodes when adding an item's info to a user profile?
const DOUBLE_COUNT = false;

/**
 * Incorporate information about an item purchased by a user into that user's profile.
 *
 * @param userid Platform specific identifier string for a user
 * @param platform Name of the platform ('fb', 'slack')
 * @param ASIN Item that the user purchased
 */
function addPurchaseEvent(userid, platform, ASIN) {

    //TODO Get current user profile
    let profile = {};

    // Get item browse node information from amazon
    utils.getItemInfo(ASIN).then(item => {
        let ASIN = item.ASIN && item.ASIN[0];

        // Parse browse node info from response
        let itemBrowseNodeFreq = utils.collectBrowseNodeFreq(item, DOUBLE_COUNT);

        // Update user profile browse node frequencies
        Object.keys(itemBrowseNodeFreq).forEach(key => {
            if ( !(key in profile) ) {
                profile[key] = {
                    freq: itemBrowseNodeFreq[key].freq,
                    items: {}
                };
                profile[key].items[ASIN] = itemBrowseNodeFreq[key].BrowseNodeId;
            } else if ( !(ASIN in profile[key].items) ) {
                profile[key].freq += itemBrowseNodeFreq[key].freq;
                profile[key].items[ASIN] = itemBrowseNodeFreq[key].BrowseNodeId;
            } else {
                console.log(`${key} already associated with ${ASIN}`);
            }
        });

        //TODO Save updated profile
        console.log(`Profile: ${JSON.stringify(profile, null, 2)}`);
    });
};

module.exports = addPurchaseEvent;

addPurchaseEvent(null, null, "B01CQTK6GU");
