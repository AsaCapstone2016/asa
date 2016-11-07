'use strict';

const config = require('./../../../config');
let amazon_api = require('core/amazon-product-api');
let amazon = require('core/amazon');
let distance = require('compute-cosine-distance');


let amazon_client = amazon_api.createClient({
    awsId: config.AWS_ID,
    awsSecret: config.AWS_SECRET,
    awsTag: config.AWS_TAG
});

// Should we double count an item's browse node counts when calculating similarity to a user profile?
const DOUBLE_COUNT = true;

// How far up the browse node tree should we traverse when collecting browse node info for an item?
const BROWSE_NODE_DEPTH = 3;

/**
 * Traverse the browse node tree for an item to collect frequencies.
 *
 * @param nodes The browse nodes associated with an item
 * @param frequencies An object holding the frequencies of browse nodes already counted
 * @param alreadySeen Object storing browse nodes already seen for the current item
 * @param doubleCount Boolean determining if browse nodes should be counted twice if they occur more than once
 * @param curLevel The current level we're traversing
 * @param maxLevel The maximum level we've been asked to traverse
 */
function traverseItemNodes(nodes, frequencies, alreadySeen, doubleCount, curLevel, maxLevel) {

    if (curLevel >= maxLevel) return;

    for (let idx in nodes) {
        let browseNode = nodes[idx];

        if (!browseNode.IsCategoryRoot && browseNode.Name && browseNode.Name[0]) {
            let name = browseNode.Name[0];

            // If we haven't seen this browse node yet, initialize it's frequency count
            if (!(name in frequencies)) {
                frequencies[name] = {
                    freq: 0,
                    BrowseNodeId: []
                };
            }

            // Add 1 to the browse node frequency if we're double counting or haven't
            // seen this browse node yet
            if (doubleCount || !(name in alreadySeen)) {
                alreadySeen[name] = 1;
                frequencies[name].freq += 1;
                frequencies[name].BrowseNodeId.push(browseNode.BrowseNodeId[0]);
            }
        }

        // Recurse up the ancestor browse node tree
        if (!browseNode.IsCategoryRoot && browseNode.Ancestors && browseNode.Ancestors[0]
            && browseNode.Ancestors[0].BrowseNode && browseNode.Ancestors[0].BrowseNode[0]) {

            traverseItemNodes(browseNode.Ancestors[0].BrowseNode, frequencies, alreadySeen, doubleCount, curLevel+1, maxLevel);
        }
    }
};

const utils = {

    /**
     * Count the occurences of browse nodes associated with an item.
     *
     * @param item A raw item result from the Amazon Advertising API including Browse Nodes
     * @param doubleCount Boolean value determining whether to double count browse nodes that occur more than once
     * @param maxLevel How deep into the browse node tree should this search traverse
     *
     * @returns Object mapping browse node names to a frequency count and array of ids
     */
    collectBrowseNodeFreq(item, doubleCount) {
        let browseNodes = item.BrowseNodes && item.BrowseNodes[0] && item.BrowseNodes[0].BrowseNode;
        let freq = {};

        traverseItemNodes(browseNodes, freq, {}, doubleCount, 0, BROWSE_NODE_DEPTH);

        return freq;
    },

    /**
     * Sort group of items against a user profile using cosine similarity between browse node frequencies.
     *
     * @param profile A user profile containing browse node frequencies from their purchase history
     * @param items A list of raw item results from the Amazon Advertising API including Browse Nodes
     *
     * @returns Item information sorted from most relevant to the profile to least
     */
    sortItemsBySimilarity(profile, result) {
        let items = result.Items;
        let idxMap = {};        // Map browse node names to a position in the feature vectors
        let itemNodes = [];     // Browse node frequencies for each item

        /*
         * Create taxonomy of browse nodes present in the candidate items
         */
        let idx = 0;
        items.forEach(item => {
            // Get the browse nodes associated with this item (with double counting)
            let browseNodes = utils.collectBrowseNodeFreq(item, DOUBLE_COUNT);
            itemNodes.push(browseNodes);

            // Map any unseen browse nodes to the next index
            Object.keys(browseNodes).forEach(node => {
                if (!(node in idxMap)) {
                    idxMap[node] = idx;
                    idx++;
                }
            });
        });

        /*
         * Create profile vector
         */
        let profileVector = new Array(idxMap.length);
        Object.keys(idxMap).forEach(node => {
            if (node in profile) {
                profileVector[idxMap[node]] = profile[node].freq;
            } else {
                profileVector[idxMap[node]] = 0;
            }
        });

        if (profileVector.every(e => e === 0)) {
            result.CanRecommend = false;
        } else {
            result.CanRecommend = true;
            /*
            * Calculate cosine similarity b/w an item and the profile
            */
            for (let i in itemNodes) {
                let item = itemNodes[i];

                // Create item vector
                let itemVector = new Array(profileVector.length).fill(0);
                Object.keys(item).forEach(node => {
                    itemVector[idxMap[node]] = item[node].freq;
                });

                // Calculate cosine sim
                var cosineSim = distance(profileVector, itemVector);
                if (!cosineSim) {
                    cosineSim = 2;
                }

                items[i].cosineSim = cosineSim;
            }

            /*
            * Sort the items by their cosine similarity with the user profile
            */
            items.sort((a,b) => {
                return a.cosineSim - b.cosineSim;
            });
            result.Items = items;
        }

        result.Items = result.Items.slice(0, 10);
        return result;
    },

    /**
     * return list of item browseNode frequency map to calculate similarity with user profile
     * @param  String keyword   [search query]
     * @return Array            [list of object with item title and browseNode frequency map]
     */
    getCandidateItems(query, numPages) {
        let curPage = 1;
        let promiseArray = [];
        let searchCriteria = {
            "searchIndex": "All",
            "responseGroup": ["ItemIds", "ItemAttributes", "Images", "SearchBins", "Offers", "BrowseNodes"],
            "ItemPage": curPage
        }

        Object.keys(query).forEach(function(param){
            searchCriteria[param] = query[param];
        });

        while (curPage <= numPages) {
            const start = 10 * (curPage - 1);
            searchCriteria.ItemPage = curPage;
            promiseArray.push(amazon_client.itemSearch(searchCriteria)
            .then((result) => {
                // let items = result.Items;
                // return items;
                return result
            }, (error) => {
                console.log(`ERR: ${JSON.stringify(err, null, 2)}`);
            }));
            curPage++;
        }

        return Promise.all(promiseArray).then((result) => {
            let totalResult = {};
            result.forEach(page => {
                if(Object.keys(totalResult).length === 0) totalResult = page;
                else totalResult.Items = totalResult.Items.concat(page.Items);
            });
            return totalResult;
        }, (error) => {
            console.log(`ERR: ${JSON.stringify(err, null, 2)}`);
        })
    },

    /**
     * Get raw item info
     *
     * @param ASIN Unique item identifier for Amazon
     *
     * @returns Raw item info from Amazon Advertising API
     */
    getItemInfo(ASIN) {
        return amazon_client.itemLookup({
            "ItemId": ASIN,
            "IdType": "ASIN",
            "ResponseGroup": ["ItemAttributes", "BrowseNodes"]
        }).then(res => {
            if (res && res.Items && res.Items[0]) {
                return res.Items[0];
            } else {
                console.log("ERROR: INVALID ASIN");
            }
        }, err => {
            console.log(`Error: ${JSON.stringify(err, null, 2)}`);
        });
    },

    /**
     * Find a number of items related to a list of items.
     *
     * @param ASINs A list of item ASINs
     * @param numItems Number of similar items needed
     *
     * @returns Array of raw item results from Amazon
     */
    findSimilarItems(ASINs, numItems) {
        return amazon.similarityLookup(ASINs).then(result => {
            return result.Items.slice(0, numItems);
        });
    }
};

module.exports = utils;
