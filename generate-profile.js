var amazon_api = require("amazon-product-api");
var config = require('./config');
var fs = require('fs');
var parse = require('csv-parse');
 

var amazon_client = amazon_api.createClient({
  awsId: config.AWS_ID,
  awsSecret: config.AWS_SECRET,
  awsTag: "evanm-20"
});


function prettyPrint(json) {
  return JSON.stringify(json, null, 2);
}

function getItem(ASIN) {
  return new amazon_client.itemLookup({
    "ItemId": ASIN,
    "IdType": "ASIN",
    "ResponseGroup": ["ItemAttributes","BrowseNodes"]
  }).then(res => {
    let item = res[0];
    return item;
  }).catch(err => {
    if (err.Error[0].Code[0] === 'RequestThrottled') {
      setTimeout(() => {
        return getItem(ASIN);
      }, 2000);
    }
  });
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
let wait = time => new Promise(f => setTimeout(f, time));

let ASIN = '193223604X';
let ASINs = [ 
  'B000L2DSLK',
  '132354187',
  '193223604X',
  '691089825',
  '495107786',
  '840033559',
  '929408233',
  'B00008URUS',
  '486250644',
  '872206556',
  '872200906',
  '091514560X',
  '140446044',
  '486250644',
  '713990724',
  'B00BUIG73U',
  'B0094092XI',
  '130159204',
  '201633612',
  '053849882X',
  'B00E9I1FPI',
  '739019333',
  '739007459',
  '739018655',
  'B00IQS8E5Q',
  '123742609',
  '1118102274',
  '136042597',
  'B00CY9RQ2K',
  '133407152',
  '131873253',
  'B00O9GW8TC',
  'B01IM96BQM' ];

let promises = [];
for (let i = 0; i < 80; i++) {
  //promises.push(getItem(ASIN));
}

let items = [];
Promise.all(promises).then(values => {
  values.forEach(value => {
    if (value)
      items.push(value);
  });
  let i = 0;
  items.forEach(item => {
    console.log(i, getTitle(item));
    i++;
  });
})

