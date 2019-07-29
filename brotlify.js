const brotli = require('brotli');
const fs = require('fs');

process.argv.forEach(function(val, index, array) {
  if (index >= 2) {
    console.log(`${index}: ${val}`);
    fs.writeFile(val + '.br',
        brotli.compress(
            fs.readFileSync(val), {
              mode: 0,
              quality: 11,
              lgwin: 24,
            }
        ), (e) => {});
  }
});
