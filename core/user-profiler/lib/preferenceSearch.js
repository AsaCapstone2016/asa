'use strict';

let utils = require('./utils');
let userProfilesDAO = require('database').userProfilesDAO;

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
        console.log(`Profile: ${JSON.stringify(profile, null, 2)}`);
        // Get pages of item results from Amazon using the search query
        return utils.getCandidateItems(query, 1).then(result => {
            // console.log(`All 5 pages: ${JSON.stringify(result, null, 2)}`);
            // Rank items against user profile using cosine similarity
            return utils.sortItemsBySimilarity(profile, result);
        }, error => {
            return `ERROR: ${JSON.stringify(error, null, 2)}`;
        })
    });
};


module.exports = queryAgainstUserProfile;

let query = {
    keywords: "The Pillars of the Earth"
};

queryAgainstUserProfile('yiming', 'fb', query).then(items => {
    console.log(`Results: ${JSON.stringify(items, null, 2)}`);
}, error => {
    console.log(`ERROR: ${JSON.stringify(error, null, 2)}`);
});
