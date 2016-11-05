'use strict';

let utils = require('./utils');
let userProfilesDAO = require('database').userProfilesDAO;

const NUM_SUGGESTIONS = 3;

/**
 * Suggest items a user may be interested in.
 * 
 * @param userid Platform specific identifier string for a user
 * @param platform Name of the platform ('fb', 'slack')
 */
function getSuggestions(userid, platform) {

    // Get user profile
    return userProfilesDAO.getUserProfile(userid, platform).then(profile => {
        // Sort the browse nodes in this profile by frequency
        let nodes = [];
        Object.keys(profile).forEach(bnode => {
            nodes.push({
                name: bnode,
                freq: profile[bnode].freq
            });
        });
        nodes.sort((a,b) => {
            return b.freq - a.freq;
        });

        // For the most popular browse nodes, find a similar item to the items already there
        let suggestions = [];
        let promiseArray = [];
        for (let i = 0; i < NUM_SUGGESTIONS && i < nodes.length; i++) {
            let asins = Object.keys(profile[nodes[i].name].items);
            promiseArray.push(utils.findSimilarItems(asins, 1).then(items => {
                suggestions = suggestions.concat(items);
            }, error => {
                console.log(`No related items for ${nodes[i].name}`);
            }));
        }

        // Return item suggestions
        return Promise.all(promiseArray).then(() => {
            return suggestions;
        });
    });
};

module.exports = getSuggestions;

// getSuggestions('aaron', 'fb').then(sugs =>{
//     //console.log(`Suggested items: ${JSON.stringify(sugs, null, 2)}`);
//     console.log(`Number of suggestions: ${sugs.length}`);
// });