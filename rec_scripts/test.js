var amazon_api = require("amazon-product-api");
var fuzzy = require('fuzzy');

var config = require('./config');
var userProfile = require('./userprofile');

var amazon_client = amazon_api.createClient({
    awsId: config.AWS_ID,
    awsSecret: config.AWS_SECRET,
    awsTag: "evanm-20"
});


function prettyPrint(json) {
  return JSON.stringify(json, null, 2);
}

function firstItemFromAmazon (keywords) {
  const query = [keywords]
  return amazon_client.itemSearch({
    "searchIndex": "All",
    "keywords": query,
    "responseGroup": ["ItemIds", "ItemAttributes", "Images", "OfferSummary"]
  }).then((result) => {
    var promiseArray = [];
    return result[0];
  });
}

function firstSimilarItemFromAmazon (items) {
  return amazon_client.similarityLookup({
    "itemId": items.join(),
    "responseGroup": ["ItemIds", "ItemAttributes", "Images", "OfferSummary"]
  }).then(result => {
    return result[0];
  });
}

function similarItemsToItem (items) {
  return amazon_client.similarityLookup({
    "itemId": items.join(),
    "responseGroup": ["ItemIds", "ItemAttributes", "Images", "OfferSummary"],
    "similarityType": 'Random'
  }).then(result => {
    return result;
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

function buy(searchString, userProfile) { // 'buys' first item
  return firstItemFromAmazon(searchString).then(item => {
    let ASIN = getASIN(item);
    //console.log('Buying: ', getTitle(item));
    return addToProfile(ASIN, userProfile);
  });
}

function buyTitle(searchString) { // 'buys' first item
  return firstItemFromAmazon(searchString).then(item => {
    let title = getTitle(item);
    console.log('Bought: ', title);
  });
}

function addToProfile(ASIN, userProfile) {
  return getFirstLevelBrowseNodeTitles(ASIN).then(browseNodeTitles => {
    browseNodeTitles.forEach(nodeTitle => {
      if (!(nodeTitle in userProfile))
        userProfile[nodeTitle] = {};

      userProfile[nodeTitle][ASIN] = (ASIN in userProfile[nodeTitle]) ? userProfile[nodeTitle][ASIN] + 1 : 1;
    });
  }).catch(error => {
    console.log('ERROR adding to profile: ', error);
  });
}


function getBrowseNodeTitles(firstLevel) {
  let seen = {};
  let titles = [];
  firstLevel.forEach(node => {
    let title = node[0];
    if (!(title in seen)) {
      titles.push(title);
      seen[title] = true;
    }
  });
  return titles;
}

function getFirstLevelBrowseNodeTitles(ASIN) {
  return amazon_client.itemLookup({
    "ItemId": ASIN,
    "IdType": "ASIN",
    "ResponseGroup": ["ItemAttributes","BrowseNodes"]
  }).then(res => {
    let item = res[0];
    let browseNodes = item.BrowseNodes && item.BrowseNodes[0] && item.BrowseNodes[0].BrowseNode;
    let names = browseNodes.map((node) => node.Name[0]);
    return names;
  }).catch(err => {
    console.log("ERR:",JSON.stringify(err, null, 2));
  });
}
function randomItem (items) {
  let keys = Object.keys(items);
  return keys[Math.floor(keys.length * Math.random())];
};

function getItemsInNode(browseNodeTitle, userProfile) {
  return Object.keys(userProfile[browseNodeTitle]);
}

function recommendMeSome(query, userProfile) {
  console.log('User asked for recommendations for query: ', query);
  let purchaseHistoryNodes = Object.keys(userProfile);
  let intersections = fuzzy.filter(query, purchaseHistoryNodes);
  if (intersections.length > 0) {
    let intersectionBrowseNodeTitle = intersections[0].string;
    let similarItems = Object.keys(userProfile[intersectionBrowseNodeTitle]);
    //let itemASIN = randomItem(userProfile[intersectionBrowseNodeTitle]);
    similarItemsToItem(similarItems).then(items => {
      let itemTitles = items.map(item => getTitle(item));
      console.log('Similar items: ', prettyPrint(itemTitles));
    }).catch(error => {
      console.log('ERROR FINDING SIMILAR SHIT', prettyPrint(error));
    });
  }
  else {
    firstItemFromAmazon(query).then(() => {
      let itemASIN = getASIN(item);
    })
  }
}

let wait = time => new Promise(f => setTimeout(f, time));


function buyThrottle(query, userProfile, time, promises) {
  setTimeout(() => {
    promises.push(buy(query, userProfile));
  }, time);
}

function buyTitleThrottle(query, time, promises) {
  setTimeout(() => {
    promises.push(buyTitle(query));
  }, time);
}

const searchQueries = ['Lord of the Rings', 'Harry Potter', 'Lightning Thief', 'The Fountainhead', 'Atlas Shrugged', 'How to Win friends and Influence People', 'Lord of the Rings return of the king', 'Eragon', '50 shades of grey', 'Twilight', 'Bridge to Terabithia', 'Magic tree house', 'spiderwick chronicles'];

function buildProfile() {
  let userProfile = {};
  let time = 1000;
  let promises = [];

  searchQueries.forEach(query => {
    buyThrottle(query, userProfile, time, promises);
    time += 1000;
  });

  setTimeout(() => {
    Promise.all(promises).then(() => {
      console.log(prettyPrint(userProfile));
    }).catch(error => {
      console.log('error building profile');
    })
  }, time)
}

function buildBoughtItems() {
  let time = 1000;
  let promises = [];

  searchQueries.forEach(query => {
    buyTitleThrottle(query, time, promises);
    time += 1000;
  });
}




//buildProfile(); // node test.js > userProfile.json COMMENT OUT REQUIRE AT TOP
//buildBoughtItems();
recommendMeSome('fantasy', userProfile);
