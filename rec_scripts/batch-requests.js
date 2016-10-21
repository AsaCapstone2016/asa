'use strict';

var amazon_api = require("amazon-product-api");
var config = require('./../config');

var amazon_client = amazon_api.createClient({
  awsId: config.AWS_ID,
  awsSecret: config.AWS_SECRET,
  awsTag: "evanm-20"
});


function prettyPrint(json) {
  return JSON.stringify(json, null, 2);
}


function getItem(ASIN) {
  return amazon_client.itemLookup({
    "ItemId": ASIN,
    "IdType": "ASIN",
    "ResponseGroup": ["ItemAttributes","BrowseNodes"]
  }).then(res => {
    if (res) {
      let item = res[0];
      return item;
    }
  }).catch(err => {
    console.log(err.Error[0]);
    if (err.Error[0].Code[0] === 'RequestThrottled') {
      setTimeout(() => {
        return getItem(ASIN);
      }, 3000);
    }
  });
}

function getItemsBatched(ASINs) {
  return amazon_client.itemLookup({
    "ItemId": ASINs,
    "IdType": "ASIN",
    "ResponseGroup": ["ItemAttributes","BrowseNodes"]
  })
}

function getTitle(product) {
  return product.ItemAttributes[0].Title[0];
}

function getASIN(product) {
  return product.ASIN[0];
}

function getProductGroup(product) {
  return product.ItemAttributes[0].ProductGroup[0];
}

function getBrowseNodes(product) {
  return product.getBrowseNodes[0].getBrowseNode;
}

let wait = time => new Promise(f => setTimeout(f, time));

let ASINs = [ 
  'B000L2DSLK',
  '193223604X',
  'B00008URUS',
  '091514560X',
  'B00BUIG73U',
  'B0094092XI',
  '053849882X',
  'B00E9I1FPI',
  'B00IQS8E5Q',
  '1118102274',
  'B00CY9RQ2K',
  'B00O9GW8TC',
  'B01IM96BQM',
  'B004HYK956',
  'B00006IJJK'];

function getBatches(ASINs) {
  let results = [];
  for (let i = 0; i < ASINs.length; i += 10) {
    let end = (i + 10 > ASINs.length) ? ASINs.length : i + 10;
    results.push(ASINs.slice(i, end).join());
  }
  return results;
}

let promises = [];
getBatches(ASINs).forEach(query => {
  promises.push(getItemsBatched(query));
});

let items = [];
Promise.all(promises).then(responses => {
  responses.forEach(response => {
    response.forEach(item => {
      items.push(item);
    })
  })
  console.log(prettyPrint(items));
}).catch(err => {
  console.log('error: ', prettyPrint(err))
})
