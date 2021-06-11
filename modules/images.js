const fetch = require('node-fetch');

const ImageServer = 'https://images.evetech.net/types/';

exports.getImageTypes = function(type_id) {
  return new Promise((resolve, reject) => {
    fetch(ImageServer + type_id).then((res) => {
      res.json().then((json) => {
        resolve(json);
      }, (error) => {
        if (error) {
          console.log(error);
          reject(error);
        }
      });
    });
  });
}
