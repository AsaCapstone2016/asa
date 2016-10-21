'use strict';
console.log();

let config = require("./../config");
let amazon_api = require('amazon-product-api');
let amazon_client = amazon_api.createClient({
    awsId: config.AWS_ID,
    awsSecret: config.AWS_SECRET,
    awsTag: "evanm-20"
});
let recommend = require("./recommend");

let purchaseHistory = process.argv[2];
let query = process.argv[3];
let browseNodeDepth = process.argv[4] !== undefined ? process.argv[4] : 2;
let numItemPages = process.argv[5] !== undefined ? process.argv[5] : 5;

console.log(`profile items: ${purchaseHistory}`);
console.log(`query: ${query}`);
console.log(`pages: ${numItemPages}`);
console.log(`depth: ${browseNodeDepth}`);
console.log();

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
    if(curLevel > maxLevel) return;
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
                browseNodeFreq[browseNode.Name[0]].cnt += 1;
                browseNodeFreq[browseNode.Name[0]].BrowseNodeId.push(browseNode.BrowseNodeId[0]);
            }
        }
        
        if(!browseNode.IsCategoryRoot && browseNode.Ancestors && browseNode.Ancestors[0] &&
        browseNode.Ancestors[0].BrowseNode && browseNode.Ancestors[0].BrowseNode[0]){
            traverseItemNodes(browseNode.Ancestors[0].BrowseNode, browseNodeFreq, doubleCountArray, doubleCount, curLevel+1, maxLevel);
        }

        // if(browseNode.Children && browseNode.Children[0] &&
        // browseNode.Children[0].BrowseNode && browseNode.Children[0].BrowseNode[0]){
        //     traverseItemNodes(browseNode.Children[0].BrowseNode, browseNodeFreq, doubleCountArray, doubleCount, curLevel-1, maxLevel);
        // }
    }
};

let profiler = {
    create(rawItems, depth) {
        console.log(`------- User profile -------`);
        let browseNodeFreq = {};
        let promiseArray = [];
        rawItems.forEach((item) => {
            let browseNodes = item.BrowseNodes && item.BrowseNodes[0] && item.BrowseNodes[0].BrowseNode;
            let ASIN = item.ASIN && item.ASIN[0];
            let title = item.ItemAttributes && item.ItemAttributes[0] && item.ItemAttributes[0].Title && item.ItemAttributes[0].Title;
            console.log(`Bought: ${title}`);

            promiseArray.push(new Promise((resolve, reject) => {
                let itemNodeFreq = {};
                traverseItemNodes(browseNodes, itemNodeFreq, {}, false, 0, depth);
                Object.keys(itemNodeFreq).forEach((key) => {
                    if ( !(key in browseNodeFreq) ) {
                        browseNodeFreq[key] = itemNodeFreq[key];
                    } else {
                        browseNodeFreq[key].cnt += itemNodeFreq[key].cnt;
                        browseNodeFreq[key].BrowseNodeId += itemNodeFreq[key].BrowseNodeId;
                    }
                })
                resolve();
            }));
        });

        return Promise.all(promiseArray).then((result) => {
            // Print sorted user profile
            // let arr = [];
            // Object.keys(browseNodeFreq).forEach((key) => {
            //     arr.push({
            //         key: key,
            //         cnt: browseNodeFreq[key].cnt,
            //         BrowseNodeId: browseNodeFreq[key].BrowseNodeId
            //     });
            // })

            // arr.sort((a, b) => {
            //     return b.cnt - a.cnt;
            // });

            // console.log(`Sorted Browse Node Frequencies: ${JSON.stringify(arr, null, 2)}`);

            return {
                uid: 'null',
                itemsPurchased: rawItems.length,
                browseNodes: browseNodeFreq
            };
        });
    }
};

let amazon = {
    /**
     * return list of item browseNode frequency map to calculate similarity with user profile
     * @param  String keyword   [search query]
     * @return Array            [list of object with item title and browseNode frequency map]
     */
    getCandidateItems(keywords, numPages, depth) {
        let curPage = 1;
        let order = 0;
        let promiseArray = [];

        while (curPage <= numPages) {
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
                        order: order++
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
};

function browseNodeRecommend() {
    
    let rawItemInfo = require(purchaseHistory);

    // Build user profile from purchase history raw item lookups
    profiler.create(rawItemInfo, browseNodeDepth)
        .then((userProfile) => {
            //console.log(`User profile: ${JSON.stringify(userProfile, null, 2)}`);
            // Get pages of items from search query
            return amazon.getCandidateItems(query, numItemPages, browseNodeDepth)
                .then((candidateItems) => {
                    console.log("here");
                    // Rank items based on cosine similarity to user profile
                    let ranking = recommend(userProfile, candidateItems);
                    console.log();
                    console.log("------- Recommendations -------")
                    console.log(`${JSON.stringify(ranking.slice(0,10), null, 2)}`);
                });
        });
};

browseNodeRecommend();