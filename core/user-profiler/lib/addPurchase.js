'use strict';

let utils = require('./utils');
let userProfilesDAO = require('database').userProfilesDAO;

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

    // Get current user profile
    return userProfilesDAO.getUserProfile(userid, platform).then(profile => {

        // Get item browse node information from amazon
        return utils.getItemInfo(ASIN).then(item => {

            let ASIN = item.ASIN && item.ASIN[0];

            // Parse browse node info from response
            let itemBrowseNodeFreq = utils.collectBrowseNodeFreq(item, DOUBLE_COUNT);

            // Update user profile browse node frequencies
            Object.keys(itemBrowseNodeFreq).forEach(key => {
                // If we haven't seen this item before with this browse node, add the
                // frequency for this item to the overall frequency for this browse node
                if ( !(key in profile) ) {
                    // We've never even seen this browse node before, create an entry
                    profile[key] = {
                        freq: itemBrowseNodeFreq[key].freq,
                        items: {}
                    };
                } else if ( !(ASIN in profile[key].items) ) {
                    // We've seen this browse node before but not on this item, increase
                    // the frequency
                    profile[key].freq += itemBrowseNodeFreq[key].freq;
                }
                
                // Even if we've already seen this ASIN, take the chance to update the
                // the browse node ids associated with this item for this node
                profile[key].items[ASIN] = itemBrowseNodeFreq[key].BrowseNodeId;
            });

            // Save updated profile
            return userProfilesDAO.updateUserProfile(userid, platform, profile);
        });
    });
};

module.exports = addPurchaseEvent;

// addPurchaseEvent('aaron', 'fb', 'B00E9I1FPI').then(() => {
//     return addPurchaseEvent('aaron', 'fb', 'B0084QSM7U').then(() => {
//         return addPurchaseEvent('aaron', 'fb', 'B01G4TPI3Y');
//     });
// });
