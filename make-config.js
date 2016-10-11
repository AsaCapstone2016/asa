var jsonfile = require('jsonfile');

var flag = process.argv[2];
var inProd = flag === '--prod';
var FB_PAGE_TOKEN = inProd ? process.env.FB_PAGE_TOKEN_PROD
    : process.env.FB_PAGE_TOKEN_DEV;
var TABLE_PREFIX = inProd ? `ASA-prod-`
    : `ASA-dev-`;
var config = {
    FB_PAGE_TOKEN: FB_PAGE_TOKEN,
    AWS_ID: process.env.AWS_ID,
    AWS_SECRET: process.env.AWS_SECRET,
    WIT_TOKEN: process.env.WIT_TOKEN,
    FB_VERIFY_TOKEN: process.env.FB_VERIFY_TOKEN,
    TABLE_PREFIX: TABLE_PREFIX,
    IN_PROD: inProd
};

console.log("CONFIG: ", config);

jsonfile.writeFile('./config.json', config, (err) => {
    if (err)
        console.log('***ERROR WRITING CONFIG: ', err);
});
