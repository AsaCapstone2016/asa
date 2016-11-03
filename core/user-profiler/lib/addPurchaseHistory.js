'use strict';

var amazon_api = require("amazon-product-api");
var config = require('./../../../config');
let amazon_client = amazon_api.createClient({
    awsId: config.AWS_ID,
    awsSecret: config.AWS_SECRET,
    awsTag: "evanm-20"
});

/**
 * Incorporate information about an item purchased by a user into that user's profile.
 *
 * @param userid Platform specific identifier string for a user
 * @param platform Name of the platform ('fb', 'slack')
 * @params ASIN Item that the user purchased
 */
function addPurchaseEvent(userid, platform, ASIN) {

    //TODO Get current user profile
    let profile = {}

    // Get item browse node information from amazon
    getItem(ASIN).then(item => {
        let browseNodes = item.BrowseNodes && item.BrowseNodes[0] && item.BrowseNodes[0].BrowseNode;
        let ASIN = item.ASIN && item.ASIN[0];
        let title = item.ItemAttributes && item.ItemAttributes[0] && item.ItemAttributes[0].Title && item.ItemAttributes[0].Title;

        // Parse browse node info from response
        let itemBrowseNodeFreq = {};
        let depth = 5;
        traverseItemNodes(browseNodes, itemBrowseNodeFreq, {}, false, 0, depth);

        // Update user profile browse node frequencies
        Object.keys(itemBrowseNodeFreq).forEach((key) => {
            if ( !(key in profile) ) {
                profile[key] = itemBrowseNodeFreq[key];
                profile.ASINS = [ASIN];
            } else {
                profile[key].cnt += itemBrowseNodeFreq[key].cnt;
                profile[key].BrowseNodeId = profile[key].BrowseNodeId.concat(itemBrowseNodeFreq[key].BrowseNodeId);
                profile[key].ASINS.push(ASIN)
            }
        })

        //TODO Save updated profile
        console.log(`Profile: ${JSON.stringify(profile, null, 2)}`);
    });
};

/**
 * Get raw item info
 * @param  ASIN
 * @return raw Item info
 */
function getItem(ASIN) {
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
    })
}

/**
 * Recursive node traverse function
 * @param  Array    browseNodes         [description]
 * @param  Obejct   browseNodeFreq      [reference to the frequency map]
 * @param  Object   doubleCountArray    [doubleCount map to prevent double count]
 * @param  Boolean  doubleCount         [double count or not based on same node name]
 * @param  Int      curLevel            [current level in node traverse]
 * @param  Int      maxLevel            [max level to traverse]
 */
function traverseItemNodes(nodes, browseNodeFreq, doubleCountArray, doubleCount, curLevel, maxLevel) {
    if(curLevel >= maxLevel) return;
    for(let idx in nodes) {
        let browseNode = nodes[idx];
        //if(browseNode.Name && browseNode.Name[0]){
        if(!browseNode.IsCategoryRoot && browseNode.Name && browseNode.Name[0]){
            if(!(browseNode.Name[0] in browseNodeFreq)){
                browseNodeFreq[browseNode.Name[0]] = {
                    cnt: 0,
                    BrowseNodeId: []
                }
            }
            if(doubleCount || !(browseNode.Name[0] in doubleCountArray)){
                doubleCountArray[browseNode.Name[0]] = 1;
                // browseNodeFreq[browseNode.Name[0]].cnt += 1 * (1 - curLevel/maxLevel);
                browseNodeFreq[browseNode.Name[0]].cnt += 1;
                browseNodeFreq[browseNode.Name[0]].BrowseNodeId.push(browseNode.BrowseNodeId[0]);
            }
        }

        // if(browseNode.Ancestors && browseNode.Ancestors[0] &&
        if(!browseNode.IsCategoryRoot && browseNode.Ancestors && browseNode.Ancestors[0] &&
        browseNode.Ancestors[0].BrowseNode && browseNode.Ancestors[0].BrowseNode[0]){
            traverseItemNodes(browseNode.Ancestors[0].BrowseNode, browseNodeFreq, doubleCountArray, doubleCount, curLevel+1, maxLevel);
        }

        // Uncomment to traverse the children node
        // if(browseNode.Children && browseNode.Children[0] &&
        // browseNode.Children[0].BrowseNode && browseNode.Children[0].BrowseNode[0]){
        //     traverseItemNodes(browseNode.Children[0].BrowseNode, browseNodeFreq, doubleCountArray, doubleCount, curLevel-1, maxLevel);
        // }
    }
};

module.exports = addPurchaseEvent;

addPurchaseEvent(null, null, "B01CQTK6GU");
