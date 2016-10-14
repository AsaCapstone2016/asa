'use strict'
var amazon_api = require("amazon-product-api");
var config = require("./config.js");
var amazon_client = amazon_api.createClient({
    awsId: config.AWS_ID,
    awsSecret: config.AWS_SECRET,
    awsTag: "evanm-20"
});

function nodeTravese(browseNodes, browseNodeFreq){
    for(var idx in browseNodes){
        var browseNode = browseNodes[idx];
        if(!browseNode.IsCategoryRoot && browseNode.Name && browseNode.Name[0]){
            if(!(browseNode.Name[0] in browseNodeFreq)){
                browseNodeFreq[browseNode.Name[0]] = {
                    cnt: 0,
                    BrowseNodeId: []
                }
            }
            browseNodeFreq[browseNode.Name[0]].cnt += 1;
            browseNodeFreq[browseNode.Name[0]].BrowseNodeId.push(browseNode.BrowseNodeId[0]);
        }

        if(!browseNode.IsCategoryRoot && browseNode.Ancestors && browseNode.Ancestors[0] &&
        browseNode.Ancestors[0].BrowseNode && browseNode.Ancestors[0].BrowseNode[0]){
            nodeTravese(browseNode.Ancestors[0].BrowseNode, browseNodeFreq);
        }

        if(browseNode.Children && browseNode.Children[0] &&
        browseNode.Children[0].BrowseNode && browseNode.Children[0].BrowseNode[0]){
            nodeTravese(browseNode.Children[0].BrowseNode, browseNodeFreq);
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
            let item = res[idx];
            console.log(`Item ${idx}: ASIN: ${item.ASIN[0]} Title: ${item.ItemAttributes[0].Title[0]}`);
            //console.log(`Item ${idx}: ${JSON.stringify(item, null, 2)}`);
            let browseNodes = item.BrowseNodes && item.BrowseNodes[0]
            && item.BrowseNodes[0].BrowseNode;
            if(browseNodes){
                nodeTravese(browseNodes, browseNodeFreq);
            }
        }
        return browseNodeFreq;
    }, function(err){
        console.log("ERR:", JSON.stringify(err, null, 2));
    });
}

browseNodeItemSearch("python 3").then(function(res){
    console.log(Object.keys(res).length);
    console.log("RES:", JSON.stringify(res, null, 2));
}, function(err){
    console.log("ERR:", JSON.stringify(err, null, 4));
});

function browseNode(ASIN){
    return amazon_client.itemLookup({
        "ItemId": ASIN,
        "IdType": "ASIN",
        "ResponseGroup": ["ItemAttributes","BrowseNodes"]
    }).then(function(res){
        var browseNodeFreq = {};

        let item = res[0];
        let browseNodes = item.BrowseNodes && item.BrowseNodes[0]
        && item.BrowseNodes[0].BrowseNode;


        nodeTravese(browseNodes, browseNodeFreq);
        return browseNodeFreq;
    }, function(err){
        console.log("ERR:",JSON.stringify(err, null, 2));
    })
}



// browseNode("0439023521").then(function(res){
//     console.log(Object.keys(res).length);
//     console.log("RES:", JSON.stringify(res, null, 2));
// }, function(err){
//     console.log("ERR:", JSON.stringify(err, null, 4));
// });
