'use strict';
const fs = require('fs');
let setup = () => {
  let s = __dirname + '/core';
  let d = __dirname + '/node_modules/core';
  fs.exists(d, (e) => { 
    if (e) {
      console.log('destination already exists');
    }
    else {
      fs.symlinkSync(s,d,'dir')
      console.log(`Linked ${s} to ${d}`);
    }

  });
};
setup();
