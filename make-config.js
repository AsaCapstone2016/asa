var jsonfile = require('jsonfile');

var flag = process.argv[2];
var FB_PAGE_TOKEN = (flag === '--prod') ? process.env.FB_PAGE_TOKEN_PROD
                                        : process.env.FB_PAGE_TOKEN_DEV;
var config = {
  FB_PAGE_TOKEN: FB_PAGE_TOKEN,
  AWS_ID : process.env.AWS_ID,
  AWS_SECRET: process.env.AWS_SECRET,
  WIT_TOKEN: process.env.WIT_TOKEN,
  FB_VERIFY_TOKEN: process.env.FB_VERIFY_TOKEN
};

console.log("CONFIG: ", config);

jsonfile.writeFile('./config.json', config, (err) => {
  console.log('***ERROR WRITING CONFIG: ', err);
});
