const fs = require('fs');
const path = require('path');

const getFirstJsonFileInDir = (dirPath) => {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (file.endsWith('.json')) {
      return path.join(dirPath, file);
    }
  }
  return null;
};

module.exports = { getFirstJsonFileInDir };
