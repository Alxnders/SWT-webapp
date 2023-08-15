const fs = require('fs');
const path = require('path');
const { dataToJson } = require('./dataToJson.js');

const processDirectories = (dataFolderPath) => {
  fs.readdir(dataFolderPath, (err, directories) => {
    if (err) {
      console.error('Error reading data directory:', err);
      return;
    }

    directories.forEach((directory) => {
      const directoryPath = path.join(dataFolderPath, directory);
      fs.stat(directoryPath, (err, stats) => {
        if (err) {
          console.error(`Error retrieving stats for ${directoryPath}:`, err);
          return;
        }

        if (stats.isDirectory()) {
          console.log(`Processing directory: ${directoryPath}`);
          dataToJson(directoryPath);
          console.log('Done');
        }
      });
    });
  });
};

module.exports = {
  processDirectories
};
