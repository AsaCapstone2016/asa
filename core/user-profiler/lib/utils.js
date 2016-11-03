'use strict';

const config = require('./../../../config');
let amazon_api = require('amazon-product-api');


let amazon_client = amazon_api.createClient({
    awsId: config.AWS_ID,
    awsSecret: config.AWS_SECRET,
    awsTag: config.AWS_TAG
});


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
                    cnt: 0,
                    BrowseNodeId: []
                };
            }

            // Add 1 to the browse node frequency if we're double counting or haven't
            // seen this browse node yet
            if (doubleCount || !(name in alreadySeen)) {
                alreadySeen[name] = 1;
                frequencies[name].cnt += 1;
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
    collectBrowseNodeFreq(item, doubleCount, maxLevel) {
        let browseNodes = item.BrowseNodes && item.BrowseNodes[0] && item.BrowseNodes[0].BrowseNode;
        let freq = {};

        traverseItemNodes(browseNodes, freq, {}, doubleCount, 0, maxLevel);

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
    sortItemsBySimilarity(profile, items) {

    },

    /**
     * Get raw item info
     * 
     * @param ASIN Unique item identifier for Amazon
     * 
     * @returns Raw item info from Amazon Advertising API
     */
    getItem(ASIN) {
        return amazon_client.itemLookup({
            "ItemId": ASIN,
            "IdType": "ASIN",
            "ResponseGroup": ["ItemAttributes", "BrowseNodes"]
        }).then(res => {
            // console.log(`Raw Item Info: ${console.log(JSON.stringify(res, null, 2))}`);
            if (res && res.Item && res.Item[0]) {
                return res.Item[0];
            }else{
                console.log("ERROR: INVALID ASIN");
            }
        }, err => {
            console.log(`Error: ${JSON.stringify(err, null, 2)}`);
        });
    }
};