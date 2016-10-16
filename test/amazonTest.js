'use strict'
var amazon_api = require("amazon-product-api");
var config = require("./config.js");
var amazon_client = amazon_api.createClient({
    awsId: config.AWS_ID,
    awsSecret: config.AWS_SECRET,
    awsTag: "evanm-20"
});

function nodeTravese(browseNodes, browseNodeFreq, doubleCount){
    for(var idx in browseNodes){
        var browseNode = browseNodes[idx];
        //if(!browseNode.IsCategoryRoot && browseNode.Name && browseNode.Name[0]){
        if(!browseNode.IsCategoryRoot && browseNode.Name && browseNode.Name[0]){
            if(!(browseNode.Name[0] in browseNodeFreq)){
                browseNodeFreq[browseNode.Name[0]] = {
                    cnt: 0,
                    BrowseNodeId: []
                }
            }
            // if(!(browseNode.Name[0] in doubleCount)){
            doubleCount[browseNode.Name[0]] = 1;
            browseNodeFreq[browseNode.Name[0]].cnt += 1;
            browseNodeFreq[browseNode.Name[0]].BrowseNodeId.push(browseNode.BrowseNodeId[0]);
            // }
        }
        //if(!browseNode.IsCategoryRoot && browseNode.Ancestors && browseNode.Ancestors[0] &&
        if(browseNode.Ancestors && browseNode.Ancestors[0] &&
        browseNode.Ancestors[0].BrowseNode && browseNode.Ancestors[0].BrowseNode[0]){
            nodeTravese(browseNode.Ancestors[0].BrowseNode, browseNodeFreq, doubleCount);
        }

        if(browseNode.Children && browseNode.Children[0] &&
        browseNode.Children[0].BrowseNode && browseNode.Children[0].BrowseNode[0]){
            nodeTravese(browseNode.Children[0].BrowseNode, browseNodeFreq, doubleCount);
        }
    }
}

function browseNodeItemSearch(keyword){
    return amazon_client.itemSearch({
        "searchIndex": "All",
        "keywords": keyword,
        "responseGroup": ["ItemAttributes","BrowseNodes"]
    }).then(function(res){
        //console.log("RES:", JSON.stringify(res, null, 2));
        var browseNodeFreq = {};
        for(var idx in res){
            var doubleCount = {};
            let item = res[idx];
            console.log(`Item ${idx}: ASIN: ${item.ASIN[0]} Title: ${item.ItemAttributes[0].Title[0]}`);
            //console.log(`Item ${idx}: ${JSON.stringify(item, null, 2)}`);
            let browseNodes = item.BrowseNodes && item.BrowseNodes[0]
            && item.BrowseNodes[0].BrowseNode;
            if(browseNodes){
                nodeTravese(browseNodes, browseNodeFreq, doubleCount);
            }
        }

        return browseNodeFreq;
    }, function(err){
        console.log("ERR:", JSON.stringify(err, null, 2));
    });
}

function browseNodeItemLookUp(ASIN){
    return amazon_client.itemLookup({
        "ItemId": ASIN,
        "IdType": "ASIN",
        "ResponseGroup": ["ItemAttributes","BrowseNodes"]
    }).then(function(res){
        var browseNodeFreq = {};
        let item = res[0];
        let browseNodes = item.BrowseNodes && item.BrowseNodes[0]
        && item.BrowseNodes[0].BrowseNode;

        var doubleCount = {};
        nodeTravese(browseNodes, browseNodeFreq, doubleCount);
        return browseNodeFreq;
    }, function(err){
        console.log("ERR:",JSON.stringify(err, null, 2));
    })
}


var itemBought = [
    '1449340377',   //Python Cookbook, Third edition
    '0321714113',   //C++ Primer (5th Edition)
    '0596009208',   //Head First Java, 2nd Edition
    '1338099132',   //Harry Potter and the Cursed Child, Parts 1 & 2, Special Rehearsal Edition Script
    '059035342X',   //Harry Potter and the Sorcerer's Stone
    '054579191X',   //The Hunger Games Box Set: Foil Edition
    'B01DE9DY8S',   //PlayStation VR
    'B01F9HMO2K',   //Battlefield 1 - PlayStation 4
    'B01GKH5Q9G',   //FIFA 17 - PlayStation 4
    'B01EZA0CEE',   //B01EZA0CEE
];

var browseNodeFreq = {};
var pArray = [];
itemBought.forEach(function(item){
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
        console.log("ERR", JSON.stringify(err, null, 2));
    });
});

Promise.all(pArray).then(function(res){
    //console.log(JSON.stringify(browseNodeFreq, null, 2));
    var arr = [];

    Object.keys(browseNodeFreq).forEach(function(key){
        let node = browseNodeFreq[key];
        node.key = key;
        arr.push(node);
    });

    arr.sort(function(a, b){
        return b.cnt - a.cnt;
    })

    console.log(JSON.stringify(arr, null, 2));
}, function(err){
    cosnole.log(JSON.stringify(err, null, 2));
});

// var arr = [];
// Object.keys(browseNodeFreq).forEach(function(key){
//     let node = res[key];
//     node.key = key;
//     arr.push(node);
// });
// arr.sort(function(a, b){
//     return b.cnt - a.cnt;
// })
// console.log(JSON.stringify(arr, null, 2));






// browseNodeItemSearch("python 3").then(function(res){
//     //console.log(Object.keys(res).length);
//     //console.log("RES:", JSON.stringify(res, null, 2));
//
//     var arr = [];
//
//     Object.keys(res).forEach(function(key){
//         let node = res[key];
//         node.key = key;
//         arr.push(node);
//     });
//
//     arr.sort(function(a, b){
//         return b.cnt - a.cnt;
//     })
//
//     console.log(JSON.stringify(arr, null, 2));
//
//     //console.log("------SORT------");
//     //Object.keys(res).sort(function(a,b){ return res[a].cnt - res[b].cnt });
//     //console.log("RES:", JSON.stringify(res, null, 2));
// }, function(err){
//     console.log("ERR:", JSON.stringify(err, null, 4));
// });



// browseNodeItemLookUp("0439023521").then(function(res){
//     console.log(Object.keys(res).length);
//     console.log("RES:", JSON.stringify(res, null, 2));
// }, function(err){
//     console.log("ERR:", JSON.stringify(err, null, 4));
// });
