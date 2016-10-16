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
            <node name>: <count>
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
    profile.BrowseNodes.forEach((node, idx) => {
        // Map this browse node to and index
        nodeMap[node] = idx;
        // Add the count to the profile vector
        profileVector.push(count);
    });

    // Calculate cosine similarity b/w an item and the profile
    items.forEach((item) => {
        // Create item vector
        let itemVector = new Array(profileVector.length).fill(0);
        item.BrowseNodes.forEach((node) => {
            if (nodeMap[node.key] !== undefined) {
                itemVector[nodeMap[node.key]] = node.cnt;
            }
        });
        // Add cosine similarity to the result
        result.push({
            item: item.title,
            cosineSim: distance(profileVector, itemVector)
        });
    });

    return result;
}

module.exports = rank;