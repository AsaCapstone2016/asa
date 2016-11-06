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

    });

    // Get pages of item results from Amazon using the search query

    // Rank items against user profile using cosine similarity

    // Return items in order from most compatible to least
};

/**
 * return list of item browseNode frequency map to calculate similarity with user profile
 * @param  String keyword   [search query]
 * @return Array            [list of object with item title and browseNode frequency map]
 */
function getCandidateItems(keywords, numPages, depth) {
    let curPage = 1;
    let promiseArray = [];

    while (curPage <= numPages) {
        const start = 10 * (curPage - 1);
        promiseArray.push(amazon_client.itemSearch({
            "searchIndex": "All",
            "keywords": keywords,
            "responseGroup": ["ItemAttributes", "BrowseNodes"],
            "ItemPage": curPage
        }).then((result) => {
            let items = [];
            for(let idx in result){
                let browseNodeFreq = {};
                let item = result[idx];
                let browseNodes = item.BrowseNodes && item.BrowseNodes[0] && item.BrowseNodes[0].BrowseNode;
                let ASIN = item.ASIN && item.ASIN[0];
                if(browseNodes){
                    traverseItemNodes(browseNodes, browseNodeFreq, {}, true, 0, depth);
                }
                items.push({
                    title: item.ItemAttributes[0].Title[0],
                    ASIN: ASIN,
                    browseNodes: browseNodeFreq,
                    order: start + parseInt(idx)
                });
            }
            return items;
        }, (error) => {
            return `ERR: ${JSON.stringify(err, null, 2)}`;
        }));
        curPage++;
    }

    return Promise.all(promiseArray).then((result) => {
        let allItems = []
        result.forEach((page) => {
            allItems = allItems.concat(page);
        });
        return allItems;
    }, (error) => {
        return `ERR: ${JSON.stringify(err, null, 2)}`;
    })
}

module.exports = queryAgainstUserProfile;
