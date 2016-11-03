'use strict';

let utils = require('./utils');

const DOUBLE_COUNT_BROWSE_NODES = false;
const BROWSE_NODE_DEPTH = 2;

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
    utils.getItem(ASIN).then(item => {
        let ASIN = item.ASIN && item.ASIN[0];

        // Parse browse node info from response
        let itemBrowseNodeFreq = utils.collectBrowseNodeFreq(item, DOUBLE_COUNT_BROWSE_NODES, BROWSE_NODE_DEPTH);

        // Update user profile browse node frequencies
        Object.keys(itemBrowseNodeFreq).forEach((key) => {
            if ( !(key in profile) ) {
                profile[key] = itemBrowseNodeFreq[key];
                profile.ASINS = [ASIN];
            } else {
                profile[key].cnt += itemBrowseNodeFreq[key].cnt;
                profile[key].BrowseNodeId = profile[key].BrowseNodeId.concat(itemBrowseNodeFreq[key].BrowseNodeId);
                profile[key].ASINS.push(ASIN);
            }
        });

        //TODO Save updated profile
        console.log(`Profile: ${JSON.stringify(profile, null, 2)}`);
    });
};

module.exports = addPurchaseEvent;

addPurchaseEvent(null, null, "B01CQTK6GU");
