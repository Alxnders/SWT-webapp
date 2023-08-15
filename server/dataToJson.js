const csv = require('csv-parser');
const { parseCSV, parseDAT } = require('./parse.js');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

// Function to parse the data file and save into JSON
const dataToJson = (dataFolderPath) => {
  try {
    const dataFilePath = path.join(dataFolderPath, 'prep.dat');
    const fileData = fs.readFileSync(dataFilePath, 'utf-8');
    
    const datesFilePath = path.join(dataFolderPath,'dates.json')

    let parsedData;

    if (dataFilePath.endsWith('.csv')) {
      parsedData = parseCSV(fileData);
    } else if (dataFilePath.endsWith('.dat')) {
      parsedData = parseDAT(fileData);
    } else {
      throw new Error('Unsupported file format');
    }

    const jsonData = {};
    const uniqueDates = new Set(); // To store unique dates

    for (let i = 0; i < parsedData.length; i += 6) {
      const row = parsedData[i];
      const time = moment(row.time, 'YYYY-MM-DD HH:mm:ss');
      const formattedTime = time.format('HH:mm:ss');
      const formattedRowDate = time.format('MM-DD-YYYY');

      uniqueDates.add(formattedRowDate); // Add the formatted date to the set
    }

    // Generate sorted dates array
    const sortedDates = Array.from(uniqueDates).sort((a, b) => {
      const dateA = moment(a, 'MM-DD-YYYY');
      const dateB = moment(b, 'MM-DD-YYYY');
      return dateA.isBefore(dateB) ? -1 : 1;
    });

    const jsonDataArray = sortedDates.map(date => jsonData[date]);

    // Write data JSON files per day
    Object.entries(jsonData).forEach(([date, data]) => {
      const jsonFilePath = path.join(dataFolderPath, `${date}.json`);
      fs.writeFileSync(jsonFilePath, JSON.stringify(data), (err) => {
        if (err) {
          console.error(`Error writing data JSON file for ${date}:`, err);
        } else {
          console.log(`Data JSON file for ${date} saved successfully`);
        }
      });
    });

    // Write dates JSON file
    fs.writeFileSync(datesFilePath, JSON.stringify(sortedDates), (err) => {
      if (err) {
        console.error('Error writing dates JSON file:', err);
      } else {
        console.log('Dates JSON file saved successfully');
      }
    });
    
  } catch (error) {
    console.error('Error parsing file:', error);
  }
};

module.exports = {
  dataToJson
};
