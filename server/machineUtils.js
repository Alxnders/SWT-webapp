const fs = require('fs');

function saveMachineNamesToJson() {
  const directoryPath = 'server/data';

  try {
    const machineNames = fs.readdirSync(directoryPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    fs.writeFileSync(`${directoryPath}/machines.json`, JSON.stringify(machineNames, null, 2));

    console.log('Machine names saved to JSON successfully.');
  } catch (error) {
    console.error('Error reading directory or saving to JSON:', error);
  }
}

module.exports = {
  saveMachineNamesToJson
};
