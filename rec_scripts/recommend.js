'use strict';

/*
    profile:
    {
        uid: <FBID>,
        itemsPurchased: 5,
        browseNodes: {
            <node name>: {
                id:
                count:
            },
            <node name>: {
                id:
                count:
            }
        }
    }

    items:
    [
        {
            title: <name>,
            browseNodes: [{
                key:
                cnt:
            }]
        }
    ]
*/

let distance = require('compute-cosine-distance');

let rank = function (profile, items) {
    let nodeMap = {};
    let profileVector = [];
    let result = [];

    // Create profile vector
    let idx = 0;
    Object.keys(profile.browseNodes).forEach((node) => {
        // Map this browse node to and index
        nodeMap[node] = idx;
        // Add the count to the profile vector
        profileVector.push(profile.browseNodes[node].cnt);
        idx++;
    });

    // Calculate cosine similarity b/w an item and the profile
    items.forEach((item) => {
        // Create item vector
        let itemVector = new Array(profileVector.length).fill(0);

        Object.keys(item.browseNodes).forEach((node) => {
            if (nodeMap[node] !== undefined) {
                itemVector[nodeMap[node]] = item.browseNodes[node].cnt;
            }
        });

        var cosineSim = distance(profileVector, itemVector);
        if(!cosineSim){
            cosineSim = 2;
        }
        result.push({
            item: item.title,
            ASIN: item.ASIN,
            cosineSim: cosineSim,
            order: item.order
        });
    });

    result.sort(function(a,b){
        return a.cosineSim - b.cosineSim;
    })

    return result;
}

module.exports = rank;
