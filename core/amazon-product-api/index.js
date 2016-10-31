var generateQueryString = require('./utils').generateQueryString,
    request = require('request'),
    parseXML = require('xml2js').parseString;

if (typeof Promise === 'undefined') {
    Promise = require('es6-promise').Promise;
}

var runQuery = function (credentials, method) {

    return function (query, cb) {
        var req = query.request || request;
        delete query.request;
        var url = generateQueryString(query, method, credentials);

        var p = new Promise(function(resolve, reject) {
            var success = function(results) {
                if (typeof cb === 'function') {
                    cb.apply(null, [null].concat(Array.prototype.slice.call(arguments)));
                }else{
                    resolve(results);
                }
            };

            var failure = function(err) {
                if (typeof cb === 'function') {
                    cb.call(null, err);
                } else {
                    reject(err);
                }
            };


            req(url, function (err, response, body) {
                if (err) {
                    failure(err);
                } else if (!response) {
                    failure("No response (check internet connection)");
                } else if (response.statusCode !== 200) {
                    parseXML(body, function (err, resp) {
                        if (err) {
                            failure(err);
                        } else {
                            failure(resp[method + 'ErrorResponse']);
                        }
                    });
                } else {
                    parseXML(body, function (err, resp) {
                        //console.log(JSON.stringify(resp, null, 2));
                        if (err) {
                            failure(err);
                        } else {
                            var respObj = resp[method + 'Response'];

                            if (respObj.Items && respObj.Items.length > 0) {
                                // Request Error
                                if (respObj.Items[0].Request && respObj.Items[0].Request.length > 0 && respObj.Items[0].Request[0].Errors) {
                                    failure(respObj.Items[0].Request[0].Errors);
                                } else if (respObj.Items[0].Item) {
                                    var result = {
                                        "Items": respObj.Items[0].Item
                                    };

                                    if (respObj.Items[0].SearchBinSets && respObj.Items[0].SearchBinSets.length > 0) {
                                        result.SearchBinSets = respObj.Items[0].SearchBinSets[0].SearchBinSet;
                                    }

                                    success(result);
                                }
                            } else if (respObj.BrowseNodes && respObj.BrowseNodes.length > 0) {
                                // Request Error
                                if (respObj.BrowseNodes[0].Request && respObj.BrowseNodes[0].Request.length > 0 && respObj.BrowseNodes[0].Request[0].Errors) {
                                    failure(respObj.BrowseNodes[0].Request[0].Errors);
                                } else if (respObj.BrowseNodes[0].BrowseNode) {
                                    success(
                                        respObj.BrowseNodes[0].BrowseNode
                                        //respObj.BrowseNodes
                                    );
                                }
                            } else if (respObj.Cart && respObj.Cart.length > 0){
                                //console.log("Cart:", JSON.stringify(respObj.Cart, null, 2));
                                if(respObj.Cart[0].Request && respObj.Cart[0].Request.length > 0 && respObj.Cart[0].Request[0].Errors){
                                    failure(respObj.Cart[0].Request[0].Errors);
                                } else if(respObj.Cart){
                                    success(respObj.Cart[0]);
                                }
                            }
                        }
                    });
                }
            });
        });

        if(typeof cb !== 'function') {
            return p;
        }
    };
};

var createClient = function (credentials) {
    return {
        itemSearch: runQuery(credentials, 'ItemSearch'),
        itemLookup: runQuery(credentials, 'ItemLookup'),
        browseNodeLookup: runQuery(credentials, 'BrowseNodeLookup'),
        cartCreate : runQuery(credentials, 'CartCreate'),
        similarityLookup : runQuery(credentials, 'SimilarityLookup')
    };
};

exports.createClient = createClient;
