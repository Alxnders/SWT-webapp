const parseCSV = (csvData) => {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
  
    const parsedData = [];
  
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
  
      if (values.length === headers.length) {
        const row = {};
  
        for (let j = 0; j < headers.length; j++) {
          row[headers[j]] = values[j];
        }
  
        parsedData.push(row);
      }
    }
  
    return parsedData;
  };
  
  const parseDAT = (datData) => {
    const lines = datData.trim().split('\n');
    const headers = lines[0].split('\t');
  
    const parsedData = [];
  
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
  
      if (values.length === headers.length) {
        const row = {};
  
        for (let j = 0; j < headers.length; j++) {
          row[headers[j]] = values[j];
        }
  
        parsedData.push(row);
      }
    }
  
    return parsedData;
  };
  
module.exports = {
  parseCSV,
  parseDAT
};