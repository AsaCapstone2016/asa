'use strict';

let utils = require('./utils');
let userProfilesDAO = require('./../../database').userProfilesDAO;
let amazon = require('./../../amazon');

/**
 * Find the items in a category which are the most relevant to a user
 *
 * @param userid Platform specific identifier string for a user
 * @param platform Name of the platform ('fb', 'slack')
 * @param query Object with search query parameters which defines the "category"
 */
function queryAgainstUserProfile(userid, platform, query) {
    // Get user profile
    return userProfilesDAO.getUserProfile(userid, platform).then(profile => {
        // Get pages of item results from Amazon using the search query
        return utils.getCandidateItems(query, 5).then(result => {
            // Rank items against user profile using cosine similarity
            result = utils.sortItemsBySimilarity(profile, result);
            return amazon.buildItemResponse(result);
        }, error => {
            return `ERROR: ${JSON.stringify(error, null, 2)}`;
        })
    });
};


module.exports = queryAgainstUserProfile;
