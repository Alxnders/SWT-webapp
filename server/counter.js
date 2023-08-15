const fs = require('fs');
const { promisify } = require('util');
const { DateTime } = require('luxon');
const path = require('path');

async function count(machineName, startDate) {
  console.log(machineName)
  console.log(startDate)
  const startDateParts = startDate.split('-');
  const startDateTime = new Date(startDateParts[2], startDateParts[0] - 1, startDateParts[1]);

  let counter = 0;
  
  const filePath = path.join('server/data', machineName, 'prep.dat');
  
  try {
    const readFile = promisify(fs.readFile);
    const fileContent = await readFile(filePath, 'utf8');
  
    console.log('counting');
  
    
    let previousPhase = null;
  
    const lines = fileContent.trim().split('\n').slice(1); // Skip the header line
    lines.forEach((line) => {
      const data = line.trim().split('\t');
      const timestampParts = data[0].split(' ')[0].split('-');
      const timestamp = new Date(timestampParts[0], timestampParts[1] - 1, timestampParts[2]);
      const phase = data[3];
  
      // Compare the dates using the getTime() method to get the timestamp
      if (timestamp.getTime() >= startDateTime.getTime()) {
        if (previousPhase !== phase && phase === 'pr-deionize') {
          counter++;
        }
        previousPhase = phase;
      }
    });
  
    console.log(`The machine has gone through the pr-deionize phase ${counter} times since ${startDate}.`);
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }

  console.log('Cycle count:', counter);
  return counter;
}

module.exports = { count };
