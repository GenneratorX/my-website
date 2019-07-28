const brotli = require('brotli');
const fs = require('fs');
const path = require('path');

const walk = function(dir) {
  fs.readdir(dir, (e, items) => {
    items.forEach((item) => {
      const itemPath = path.join(dir, item);
      fs.stat(itemPath, (e, stats) => {
        if (stats.isDirectory()) {
          walk(itemPath);
        } else {
          if (['.css', '.js', '.xml', '.svg', '.webmanifest'].includes(path.extname(itemPath))) {
            console.log(itemPath);
            const c = brotli.compress(fs.readFileSync(itemPath), {
              mode: 0,
              quality: 11,
              lgwin: 24,
            });
            fs.writeFile(itemPath + '.br', c, (e)=>{});
          }
        }
      });
    });
  });
};

walk('./static');
