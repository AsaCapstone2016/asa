'use strict';

/**
 * Traverse the browse node tree for an item to collect frequencies.
 * 
 * @param nodes The browse nodes associated with an item
 * @param frequencies An object holding the frequencies of browse nodes already counted
 * @param doubleCount Boolean determining if browse nodes should be counted twice if they occur more than once
 * @param curLevel The current level we're traversing
 * @param maxLevel The maximum level we've been asked to traverse
 */
function traverseItemNodes(nodes, frequencies, doubleCount, curLevel, maxLevel) {

};

const utils = {

    /**
     * Count the occurences of browse nodes associated with an item.
     * 
     * @param item A raw item result from the Amazon Advertising API including Browse Nodes
     * @param doubleCount Boolean value determining whether to double count browse nodes that occur more than once
     * @param maxLevel How deep into the browse node tree should this search traverse
     */
    collectBrowseNodeFreq(item, doubleCount, maxLevel) {

    },

    /**
     * Sort group of items against a user profile using cosine similarity between browse node frequencies.
     * 
     * @param profile A user profile containing browse node frequencies from their purchase history
     * @param items A list of raw item results from the Amazon Advertising API including Browse Nodes
     */
    sortItemsBySimilarity(profile, items) {

    }
};