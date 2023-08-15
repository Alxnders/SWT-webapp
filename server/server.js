const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const { saveMachineNamesToJson } = require('./machineUtils');
const { processDirectories } = require('./process.js');
const { count } = require('./counter');
const { spawn } = require('child_process');

//Logs
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Get the current date in the format YYYY-MM-DD_HH-MM-SS
const currentDate = new Date().toISOString().replace(/:/g, '-').replace(/T/g, '_').split('.')[0];

// Create a logger that outputs to the console and log file using winston
const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logsDir, `${currentDate}.log`) })
  ]
});

// Redirect console output to logger
const originalConsoleLog = console.log;
console.log = (...args) => {
  const logMessage = args.map(arg => JSON.stringify(arg)).join(' ');
  logger.info(logMessage);
  originalConsoleLog(...args);
};

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve index.html as the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

let targetDate = '';
let targetMachine = 'f10.2.2.34'; //by default the first default machine shall be 34, not super clean
let length_int = 1; //length of the data to display, initialized at 1 day

let datesFilePath = path.join('server/data',targetMachine,'dates.json');

// ----- Routes -----
// Create route to handle fetching dates
app.get('/dates', (req, res) => {
  fs.readFile(datesFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      try {
        const dates = JSON.parse(data);
        if (dates.length > 0) {
          targetDate = dates[0];
        }
        res.json(dates);
      } catch (error) {
        console.error('Error parsing dates data:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });
});

// Route to fetch machine names
app.get('/machines', (req, res) => {
  const machinesFilePath = 'server/data/machines.json';

  fs.readFile(machinesFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      try {
        const machines = JSON.parse(data);
        res.json(machines);
      } catch (error) {
        console.error('Error parsing machine names data:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });
});

// Route to fetch the loading gif
app.get('/loading', (req, res) => {
  const loadingPath = path.join(__dirname, 'img', 'loading.gif');

  // Send the loading gif as the response
  res.sendFile(loadingPath);
});

// Route to fetch the error icon
app.get('/error', (req, res) => {
  const loadingPath = path.join(__dirname, 'img', 'error.png');

  // Send the loading gif as the response
  res.sendFile(loadingPath);
});

// Route to fetch a specific image (py plots)
app.get('/image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'img', filename);
  
  // Send the image file as the response
  res.sendFile(imagePath);
});
//-----------------------

// Start the server port 3000
const port = process.env.PORT || 3000;
const ipAddress = '10.1.1.9';
const server = app.listen(port, ipAddress, () => {
  logger.info(`Server is running on http://${ipAddress}:${port}`);
  processDirectories('server/data');
  saveMachineNamesToJson();
});


// Create a WebSocket server for front to back communication
const wss = new WebSocket.Server({ server });

// WebSocket connection handling
wss.on('connection', (ws) => {
  const clientId = uuidv4();
  ws.clientId = clientId;

  targetDate = '';
  targetMachine = 'f10.2.2.34';
  length_int=1;
  datesFilePath = path.join('server/data',targetMachine,'dates.json');
  targetDate = '';

  logger.info('WebSocket client connected with id: ' + clientId);

  // Send the client ID to the frontend
  
  ws.send(JSON.stringify({ clientId }));

  // WebSocket message handling
  ws.on('message', (message) => {
    logger.info('Received message from client: '+ message);

    // Parse the received message as JSON
    const parsedMessage = JSON.parse(message);

    if (parsedMessage.date !== undefined) {
      const { date } = parsedMessage;
      targetDate = date;
    }

    else if (parsedMessage.machine !== undefined) {
      const { machine } = parsedMessage;
      targetMachine = machine;

      datesFilePath = path.join('server/data',targetMachine,'dates.json');

      logger.info(parsedMessage.clientId+' has changed the targetMachine :'+targetMachine);
      sendToClient(parsedMessage.clientId, 'refreshdates'); 
    }
    
    else if (parsedMessage.message !== undefined) {
      //tochange
      count(targetMachine, targetDate)
        .then((cycleCount) => {
          sendToClient(parsedMessage.clientId, 'count:' + cycleCount.toString());
        })
        .catch((error) => {
          console.error('Error executing count function:', error);
          sendToClient(parsedMessage.clientId, 'error');
        });
    }


    else if (parsedMessage.plot == "ec_delta") {
      // Get the path to the dates.json file
      const datesFilePath = `server/data/${targetMachine}/dates.json`;
    
      // Read the dates.json file
      fs.readFile(datesFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Error reading dates.json file: ${err}`);
          return;
        }
    
        try {
          const dates = JSON.parse(data);
    
          // Find the index of the targetDate
          const targetIndex = dates.findIndex(date => date === targetDate);
    
          if (targetIndex !== -1 && targetIndex + 1 < dates.length) {
            const endDateIndex = targetIndex + length_int;
            const endDate = dates[endDateIndex] || dates[dates.length - 1];
    
            const dataFilePath = `server/data/${targetMachine}/prep.dat`;
            const pythonScriptPath = 'server/ec_delta4.py';
    
            const pythonProcess = spawn('python', [pythonScriptPath, dataFilePath, targetDate, endDate, targetMachine]);
    
            pythonProcess.stdout.on('data', (data) => {
              console.log(`Python script output: ${data}`);
            });
    
            pythonProcess.stderr.on('data', (data) => {
              console.error(`Error executing Python script: ${data}`);
            });
    
            pythonProcess.on('close', (code) => {
              console.log(`Python script exited with code ${code}`);
              if(code != 0) {
                sendToClient(parsedMessage.clientId, `Error : Target date '${targetDate}' or corresponding end date not found in dates.json`)
              }
              else {
                const imagePath = '/image/plot.png';
                sendToClient(parsedMessage.clientId, imagePath);
              }
            });
          } 
          
          else {
            console.error(`Target date '${targetDate}' or corresponding end date not found in dates.json`);
          }
        } catch (error) {
          console.error(`Error parsing dates.json: ${error}`);
        }
      });
    }

    else if (parsedMessage.plot == "plot") {
      // Get the path to the dates.json file
      const datesFilePath = `server/data/${targetMachine}/dates.json`;

      // Read the dates.json file
      fs.readFile(datesFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Error reading dates.json file: ${err}`);
          return;
        }

        try {
          const dates = JSON.parse(data);

          // Find the index of the targetDate
          const targetIndex = dates.findIndex((date) => date === targetDate);

          if (targetIndex !== -1 && targetIndex + 1 < dates.length) {
            const endDateIndex = targetIndex + length_int;
            const endDate = dates[endDateIndex] || dates[dates.length - 1];
            
            const dataFilePath = `server/data/${targetMachine}/prep.dat`;
            const pythonScriptPath = 'server/plot.py';
            
            const xaxis = parsedMessage.xSelected;
            const yaxis = parsedMessage.ySelected;
            
            const pythonProcess = spawn('python', [
              pythonScriptPath,
              dataFilePath,
              targetDate,
              endDate,
              targetMachine,
              xaxis,
              yaxis,
            ]);

            pythonProcess.stdout.on('data', (data) => {
              logger.info(`Python script output: ${data}`);
            });

            pythonProcess.stderr.on('data', (data) => {
              console.error(`Error executing Python script: ${data}`);
            });

            pythonProcess.on('close', (code) => {
              console.log(`Python script exited with code ${code}`);
              if(code != 0) {
                sendToClient(parsedMessage.clientId, `Error : Target date '${targetDate}' or corresponding end date not found in dates.json`)
              }
              else {
                const imagePath = '/image/plot.png';
                sendToClient(parsedMessage.clientId, imagePath);
              }
            });
          } else {
            console.error(`Target date '${targetDate}' or corresponding end date not found in dates.json`);
            sendToClient(parsedMessage.clientId, `Error : Target date '${targetDate}' or corresponding end date not found in dates.json`)
          }
        } catch (error) {
          console.error(`Error parsing dates.json: ${error}`);
        }
      });
    }

    else if (parsedMessage.plot == "plot2") {
      // Get the path to the dates.json file
      const datesFilePath = `server/data/${targetMachine}/dates.json`;
    
      // Read the dates.json file
      fs.readFile(datesFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Error reading dates.json file: ${err}`);
          return;
        }
    
        try {
          const dates = JSON.parse(data);
    
          // Find the index of the targetDate
          const targetIndex = dates.findIndex((date) => date === targetDate);
    
          if (targetIndex !== -1 && targetIndex + 1 < dates.length) {
            const endDateIndex = targetIndex + length_int;
            const endDate = dates[endDateIndex] || dates[dates.length - 1];
    
            const dataFilePath = `server/data/${targetMachine}/prep.dat`;
            const pythonScriptPath = 'server/plot.py';
    
            const xaxis = parsedMessage.xSelected;
            const yaxis = parsedMessage.ySelected;
            const y2axis = parsedMessage.ySelected2; // Include the optional second y-axis
    
            const pythonProcess = spawn('python', [
              pythonScriptPath,
              dataFilePath,
              targetDate,
              endDate,
              targetMachine,
              xaxis,
              yaxis,
              '--yaxis2',
              y2axis,
            ]);

            pythonProcess.stdout.on('data', (data) => {
              logger.info(`Python script output: ${data}`);
            });
    
            pythonProcess.stderr.on('data', (data) => {
              console.error(`Error executing Python script: ${data}`);
            });
    
            pythonProcess.on('close', (code) => {
              logger.info(`Python script exited with code ${code}`);
              if(code != 0) {
                sendToClient(parsedMessage.clientId, `Error : Target date '${targetDate}' or corresponding end date not found in dates.json`)
              }
              else {
                const imagePath = '/image/plot.png';
                sendToClient(parsedMessage.clientId, imagePath);
              }
            });
          } else {
            console.error(`Target date '${targetDate}' or corresponding end date not found in dates.json`);
          }
        } catch (error) {
          console.error(`Error parsing dates.json: ${error}`);
        }
      });
    }
    

    else if(parsedMessage.length != undefined) {
      const length = parsedMessage.length;
      if(length == "day") {length_int=1;}
      else if (length == "week") {length_int=7;}
      else if (length == "month") {length_int=30;}
      else if (length == "3 months") {length_int=90;}
      else if (length == "6 months") {length_int=180;}
      else if (length == "year") {length_int=360;}
    }

    else {
      logger.info('Invalid message received:', parsedMessage);
    }
  });

  // WebSocket connection closing
  ws.on('close', () => {
    targetDate = '';
    targetMachine = 'f10.2.2.34';
    length_int=1;
    datesFilePath = path.join('server/data',targetMachine,'dates.json');
    targetDate = '';
    logger.info('WebSocket client disconnected, reseting var values ');
  });
});

// Function to send a message to a specific client (used to send specific commands to front and back)
const sendToClient = (clientId, message) => {
  wss.clients.forEach((client) => {
    if (client.clientId === clientId && client.readyState === WebSocket.OPEN) {
      client.send(message);
      logger.info('message sent to client '+clientId +' : '+message);
    }
  });
};

// Broadcast a message to all connected clients
const broadcast = (message) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      logger.info('message broadcasted to all clients : '+message)
    }
  });
};