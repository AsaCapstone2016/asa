'use strict';

/**
 * Find the items in a category which are the most relevant to a user
 * 
 * @param userid Platform specific identifier string for a user
 * @param platform Name of the platform ('fb', 'slack')
 * @param query Object with search query parameters which defines the "category"
 */
function queryAgainstUserProfile(userid, platform, query) {

    // Get user profile

    // Get pages of item results from Amazon using the search query

    // Rank items against user profile using cosine similarity

    // Return items in order from most compatible to least
};

module.exports = queryAgainstUserProfile;