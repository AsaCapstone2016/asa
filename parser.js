let parse = require('csv-parse');
let fs = require('fs');

let config = {
  columns: true
}

let parser = parse(config, function(err, data){
  let ASINs = data.map(item => item['ASIN/ISBN']);
  console.log(ASINs);
});

if (process.argv.length < 3) {
  console.log('please specify an input file');
} else {
  let file = '/' + process.argv[2];
  fs.createReadStream(__dirname + file).pipe(parser);
}
