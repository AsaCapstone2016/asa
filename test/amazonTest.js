'use strict'
var amazon_api = require("amazon-product-api");
var config = require("./../config");
var amazon_client = amazon_api.createClient({
    awsId: config.AWS_ID,
    awsSecret: config.AWS_SECRET,
    awsTag: "evanm-20"
});
var recommend = require("./recommend");


/**
 * Recursive node traverse function
 * @param  Array    browseNodes         [description]
 * @param  Obejct   browseNodeFreq      [reference to the frequency map]
 * @param  Object   doubleCountArray    [doubleCount map to prevent double count]
 * @param  Boolean  doubleCount         [double count or not based on same node name]
 * @param  Int      curLevel            [current level in node traverse]
 * @param  Int      maxLevel            [max level to traverse]
 */
function nodeTraverse(browseNodes, browseNodeFreq, doubleCountArray, doubleCount, curLevel, maxLevel){
    if(curLevel > maxLevel) return;
    for(var idx in browseNodes){
        var browseNode = browseNodes[idx];
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
        //if(browseNode.Ancestors && browseNode.Ancestors[0] &&
        if(!browseNode.IsCategoryRoot && browseNode.Ancestors && browseNode.Ancestors[0] &&
        browseNode.Ancestors[0].BrowseNode && browseNode.Ancestors[0].BrowseNode[0]){
            nodeTraverse(browseNode.Ancestors[0].BrowseNode, browseNodeFreq, doubleCountArray, doubleCount, curLevel+1, maxLevel);
        }

        // if(browseNode.Children && browseNode.Children[0] &&
        // browseNode.Children[0].BrowseNode && browseNode.Children[0].BrowseNode[0]){
        //     nodeTraverse(browseNode.Children[0].BrowseNode, browseNodeFreq, doubleCountArray, doubleCount, curLevel-1, maxLevel);
        // }
    }
}

/**
 * return list of item browseNode frequency map to calculate similarity with user profile
 * @param  String keyword   [search query]
 * @return Array            [list of object with item title and browseNode frequency map]
 */
function browseNodeItemSearch(keyword){
    var pages = 5, curPgae = 1;
    var pArray = [];
    var order = 0;
    while(curPgae <= pages){
        pArray.push(amazon_client.itemSearch({
            "searchIndex": "All",
            "keywords": keyword,
            "responseGroup": ["ItemAttributes","BrowseNodes"],
            "ItemPage" : curPgae
        }).then(function(res){
            //console.log("RES:", JSON.stringify(res, null, 2));
            var items = [];
            for(var idx in res){
                var doubleCount = {};
                var browseNodeFreq = {};
                var item = res[idx];
                //console.log(`Item ${idx}: ASIN: ${item.ASIN[0]} Title: ${item.ItemAttributes[0].Title[0]}`);
                let browseNodes = item.BrowseNodes && item.BrowseNodes[0] && item.BrowseNodes[0].BrowseNode;
                if(browseNodes){
                    nodeTraverse(browseNodes, browseNodeFreq, doubleCount, true, 0, 10);
                }
                items.push({
                    title: item.ItemAttributes[0].Title[0],
                    browseNodes: browseNodeFreq,
                    order: order++
                });
            }
            return items;
        }, function(err){
            return `ERR: ${JSON.stringify(err, null, 2)}`;
        }));
        curPgae++;
    }

    return Promise.all(pArray).then(function(res){
        // console.log(res);
        var result = [];
        res.forEach(function(r){
            result = result.concat(r);
        });
        return result;
    }, function(err){
        return `ERR: ${JSON.stringify(err, null, 2)}`;
    });
}



/**
 * return browseNode frequency map on all items(10 items) from one itemSearch API call
 * @param  String keyword   [search query]
 * @return Array            [browseNode frequency map]
 */
// function browseNodeItemSearch(keyword){
//     return amazon_client.itemSearch({
//         "searchIndex": "All",
//         "keywords": keyword,
//         "responseGroup": ["ItemAttributes","BrowseNodes"]
//     }).then(function(res){
//         //console.log("RES:", JSON.stringify(res, null, 2));
//         var browseNodeFreq = {};
//         for(var idx in res){
//             var doubleCount = {};
//             let item = res[idx];
//             console.log(`Item ${idx}: ASIN: ${item.ASIN[0]} Title: ${item.ItemAttributes[0].Title[0]}`);
//             //console.log(`Item ${idx}: ${JSON.stringify(item, null, 2)}`);
//             let browseNodes = item.BrowseNodes && item.BrowseNodes[0] && item.BrowseNodes[0].BrowseNode;
//             if(browseNodes){
//                 nodeTraverse(browseNodes, browseNodeFreq, doubleCount, true, 0, 3);
//             }
//         }
//
//         return browseNodeFreq;
//     }, function(err){
//         return `ERR: ${JSON.stringify(err, null, 2)}`;
//     });
// }

/**
 * return browseNode frequency map on one item from itemLookup API call
 * @param  String ASIN [item ASIN]
 * @return Object      [browseNode frequency map]
 */
function browseNodeItemLookUp(ASIN){
    return amazon_client.itemLookup({
        "ItemId": ASIN,
        "IdType": "ASIN",
        "ResponseGroup": ["ItemAttributes","BrowseNodes"]
    }).then(function(res){
        var browseNodeFreq = {};
        let item = res[0];
        let browseNodes = item.BrowseNodes && item.BrowseNodes[0] && item.BrowseNodes[0].BrowseNode;
        //console.log("BrowseNodes:",JSON.stringify(browseNodes, null, 2));
        var ASIN = item.ASIN && item.ASIN[0];
        var title = item.ItemAttributes && item.ItemAttributes[0] && item.ItemAttributes[0].Title && item.ItemAttributes[0].Title;
        console.log(`Title:  ${title}\nASIN: ${ASIN}`);

        var doubleCount = {};
        nodeTraverse(browseNodes, browseNodeFreq, doubleCount, true, 0, 10);
        return browseNodeFreq;
    }, function(err){
        return `ERR: ${JSON.stringify(err, null, 2)}`;
    })
}

function buildUserProfile(){
    var purchaseHistory = [
        'B00JG6K7RK',   //Nike Men's Free Flyknit 4.0
        'B000P6GKOO',   //Nike Men's Rosherun Running Shoe.
        'B0051HKG2E',   //Nike Women's Free 5.0+ Running Shoe

        '1449340377',   //Python Cookbook, Third edition
        '1556229038',   //Virtual Machine Design and Implementation C/C++
        '0321714113',   //C++ Primer (5th Edition)
        '0321776402',   //C++ Primer Plus (6th Edition) (Developer's Library)
        '0321563840',   //The C++ Programming Language, 4th Edition
        '0596009208',   //Head First Java, 2nd Edition

        '1338099132',   //Harry Potter and the Cursed Child, Parts 1 & 2, Special Rehearsal Edition Script
        '059035342X',   //Harry Potter and the Sorcerer's Stone
        '054579191X',   //The Hunger Games Box Set: Foil Edition

        'B01DE9DY8S',   //PlayStation VR
        'B01F9HMO2K',   //Battlefield 1 - PlayStation 4
        'B01GKH5Q9G',   //FIFA 17 - PlayStation 4
        'B01EZA0CEE'   //B01EZA0CEE
    ];

    var browseNodeFreq = {};
    var pArray = [];

    purchaseHistory.forEach(function(item){
        pArray.push(browseNodeItemLookUp(item).then(function(res){
            //console.log(JSON.stringify(res, null, 2));
            Object.keys(res).forEach(function(key){
                if(!(key in browseNodeFreq)){
                    browseNodeFreq[key] = res[key];
                }else{
                    browseNodeFreq[key].cnt += res[key].cnt;
                    browseNodeFreq[key].BrowseNodeId += res[key].BrowseNodeId;
                }
            });
        }), function(err){
            return `ERR: ${JSON.stringify(err, null, 2)}`;
        });
    });

    return Promise.all(pArray).then(function(res){
        //console.log(JSON.stringify(browseNodeFreq, null, 2));

        //Print sorted user profile
        var arr = [];
        Object.keys(browseNodeFreq).forEach(function(key){
            let node = {};
            node.key = key;
            node.cnt = browseNodeFreq[key].cnt;
            node.BrowseNodeId = browseNodeFreq[key].BrowseNodeId;
            arr.push(node);
        });

        arr.sort(function(a, b){
            return b.cnt - a.cnt;
        })

        console.log("User Profile:", JSON.stringify(arr, null, 2));

        var profile = {
            uid : 'null',
            itemsPurchased: 10,
            browseNodes: browseNodeFreq
        }

        return profile;

    }, function(err){
        return `ERR: ${JSON.stringify(err, null, 2)}`;
    });
}


function similaritySearch(){
    Promise.all([
        buildUserProfile(),
        browseNodeItemSearch("play station video games")
    ]).then(function(res){
        console.log(JSON.stringify(recommend(res[0], res[1]), null, 2));
    }, function(err){
        console.log(JSON.stringify(err, null, 2));
    });
}

similaritySearch();
