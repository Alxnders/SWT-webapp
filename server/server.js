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
  }),
  winston.format.errors({ stack: true }) 
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

// Redirect console error output to logger
const originalConsoleError = console.error;
console.error = (...args) => {
  const logMessage = args.map(arg => JSON.stringify(arg)).join(' ');
  logger.error(logMessage);
  originalConsoleError(...args);
};

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve index.html as the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

let targetDate = '';
let targetMachine = ''; 
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
        logger.info("Fetched dates succesfully")
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
        if (machines.length > 0) {
          targetMachine = machines[0];
        }
        res.json(machines);
        logger.info("Feteched machines succesfully")
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
  res.sendFile(loadingPath);
  logger.info("Feteched loading img succesfully")
});

// Route to fetch the error icon
app.get('/error', (req, res) => {
  const loadingPath = path.join(__dirname, 'img', 'error.png');
  res.sendFile(loadingPath);
  logger.info("Feteched error img succesfully")
});

// Route to fetch a specific image (py plots)
app.get('/image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'img', filename);
  res.sendFile(imagePath);
  logger.info("Feteched plot img succesfully")
});

//-----------------------


// Function needed for when a new user connects
const resetTargetMachine = (id) => {
  const machinesFilePath = 'server/data/machines.json';
  fs.readFile(machinesFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    try {
      const machines = JSON.parse(data);
      if (machines.length > 0) {
        userTargetValues[id].targetMachine = machines[0];
        datesFilePath = path.join('server/data', userTargetValues[id].targetMachine, 'dates.json');

        fs.readFile(datesFilePath, 'utf8', (err, data) => { //also reduce to func
          if (err) {
            console.error(err);
            return;
          }
      
          try {
            const dates = JSON.parse(data);
            if (dates.length > 0) {
              userTargetValues[id].targetDate = dates[0];
              logger.info('Reset targetDate to: ' + userTargetValues[id].targetDate);
            }
          } 
          catch (error) {
            console.error('Error parsing machine names data:', error);
          }
        });

        
        logger.info('Reset targetMachine to: ' + userTargetValues[id].targetMachine);
      }
    } 
    catch (error) {
      console.error('Error parsing machine names data:', error);
    }
  });
};



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
const userTargetValues = {};

// WebSocket connection handling
wss.on('connection', (ws) => {
  const clientId = uuidv4();
  ws.clientId = clientId;

  targetDate = '';
  resetTargetMachine(clientId);
  length_int=1;

  userTargetValues[clientId] = {
    targetDate: '',
    targetMachine: '',
    length_int: 1,
  };

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

      userTargetValues[parsedMessage.clientId].targetDate = date;
    }

    else if (parsedMessage.machine !== undefined) {
      const { machine } = parsedMessage;
      targetMachine = machine;

      userTargetValues[parsedMessage.clientId].targetMachine=machine;

      datesFilePath = path.join('server/data',targetMachine,'dates.json');
      fs.readFile(datesFilePath, 'utf8', (err, data) => { //reduce to func
        if (err) {
          console.error(err);
          return;
        }
    
        try {
          const dates = JSON.parse(data);
          if (dates.length > 0) {
            userTargetValues[parsedMessage.clientId].targetDate = dates[0];
            logger.info('Set targetDate to: ' + userTargetValues[parsedMessage.clientId].targetDate);
          }
        } 
        catch (error) {
          console.error('Error parsing machine names data:', error);
        }
      });

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
      const datesFilePath = `server/data/${userTargetValues[parsedMessage.clientId].targetMachine}/dates.json`;
    
      // Read the dates.json file
      fs.readFile(datesFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Error reading dates.json file: ${err}`);
          return;
        }
    
        try {
          const dates = JSON.parse(data);
    
          // Find the index of the targetDate
          const targetIndex = dates.findIndex(date => date === userTargetValues[parsedMessage.clientId].targetDate);
    
          if (targetIndex !== -1 && targetIndex + 1 < dates.length) {
            const endDateIndex = targetIndex + userTargetValues[parsedMessage.clientId].length_int;
            const endDate = dates[endDateIndex] || dates[dates.length - 1];
    
            const dataFilePath = `server/data/${userTargetValues[parsedMessage.clientId].targetMachine}/prep.dat`;
            const pythonScriptPath = 'server/ec_delta4.py';
    
            const pythonProcess = spawn('python', [pythonScriptPath, dataFilePath, userTargetValues[parsedMessage.clientId].targetDate, endDate, userTargetValues[parsedMessage.clientId].targetMachine]);
    
            pythonProcess.stdout.on('data', (data) => {
              console.log(`Python script output: ${data}`);
            });
    
            pythonProcess.stderr.on('data', (data) => {
              console.error(`Error executing Python script: ${data}`);
            });
    
            pythonProcess.on('close', (code) => {
              console.log(`Python script exited with code ${code}`);
              if(code != 0) {
                sendToClient(parsedMessage.clientId, `Error : Target date '${userTargetValues[parsedMessage.clientId].targetDate}' or corresponding end date not found in dates.json`)
              }
              else {
                const imagePath = '/image/plot.png';
                sendToClient(parsedMessage.clientId, imagePath);
              }
            });
          } 
          
          else {
            console.error(`Target date '${userTargetValues[parsedMessage.clientId].targetDate}' or corresponding end date not found in dates.json`);
          }
        } catch (error) {
          console.error(`Error parsing dates.json: ${error}`);
        }
      });
    }

    else if (parsedMessage.plot == "plot") {
      // Get the path to the dates.json file
      const datesFilePath = `server/data/${userTargetValues[parsedMessage.clientId].targetMachine}/dates.json`;

      console.log("targetDate : " + userTargetValues[parsedMessage.clientId].targetDate);
      console.log("targetMachine : " + userTargetValues[parsedMessage.clientId].targetMachine);
      console.log("length : " + userTargetValues[parsedMessage.clientId].length_int);

      // Read the dates.json file
      fs.readFile(datesFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Error reading dates.json file: ${err}`);
          return;
        }

        try {
          const dates = JSON.parse(data);

          const targetIndex = dates.findIndex((date) => date === userTargetValues[parsedMessage.clientId].targetDate);

          if (targetIndex !== -1 && targetIndex + 1 < dates.length) {
            const endDateIndex = targetIndex + userTargetValues[parsedMessage.clientId].length_int;
            const endDate = dates[endDateIndex] || dates[dates.length - 1];
            
            const dataFilePath = `server/data/${userTargetValues[parsedMessage.clientId].targetMachine}/prep.dat`;
            const pythonScriptPath = 'server/plot.py';
            
            const xaxis = parsedMessage.xSelected;
            const yaxis = parsedMessage.ySelected;
            
            const pythonProcess = spawn('python', [
              pythonScriptPath,
              dataFilePath,
              userTargetValues[parsedMessage.clientId].targetDate,
              endDate,
              userTargetValues[parsedMessage.clientId].targetMachine,
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
                sendToClient(parsedMessage.clientId, `Error : Target date '${userTargetValues[parsedMessage.clientId].targetDate}' or corresponding end date not found in dates.json`)
              }
              else {
                const imagePath = '/image/plot.png';
                sendToClient(parsedMessage.clientId, imagePath);
              }
            });
          } else {
            console.error(`Target date '${userTargetValues[parsedMessage.clientId].targetDate}' or corresponding end date not found in dates.json`);
            sendToClient(parsedMessage.clientId, `Error : Target date '${userTargetValues[parsedMessage.clientId].targetDate}' or corresponding end date not found in dates.json`)
          }
        } catch (error) {
          console.error(`Error parsing dates.json: ${error}`);
        }
      });
    }

    else if (parsedMessage.plot == "plot2") {
      // Get the path to the dates.json file
      const datesFilePath = `server/data/${userTargetValues[parsedMessage.clientId].targetMachine}/dates.json`;
    
      // Read the dates.json file
      fs.readFile(datesFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Error reading dates.json file: ${err}`);
          return;
        }
    
        try {
          const dates = JSON.parse(data);
    
          // Find the index of the targetDate
          const targetIndex = dates.findIndex((date) => date === userTargetValues[parsedMessage.clientId].targetDate);
    
          if (targetIndex !== -1 && targetIndex + 1 < dates.length) {
            const endDateIndex = targetIndex + userTargetValues[parsedMessage.clientId].length_int;
            const endDate = dates[endDateIndex] || dates[dates.length - 1];
    
            const dataFilePath = `server/data/${targetMachine}/prep.dat`;
            const pythonScriptPath = 'server/plot.py';
    
            const xaxis = parsedMessage.xSelected;
            const yaxis = parsedMessage.ySelected;
            const y2axis = parsedMessage.ySelected2; // Include the optional second y-axis
    
            const pythonProcess = spawn('python', [
              pythonScriptPath,
              dataFilePath,
              userTargetValues[parsedMessage.clientId].targetDate,
              endDate,
              userTargetValues[parsedMessage.clientId].targetMachine,
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
                sendToClient(parsedMessage.clientId, `Error : Target date '${userTargetValues[parsedMessage.clientId].targetDate}' or corresponding end date not found in dates.json`)
              }
              else {
                const imagePath = '/image/plot.png';
                sendToClient(parsedMessage.clientId, imagePath);
              }
            });
          } else {
            console.error(`Target date '${userTargetValues[parsedMessage.clientId].targetDate}' or corresponding end date not found in dates.json`);
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
      userTargetValues[parsedMessage.clientId].length_int = length_int;
    }

    else {
      logger.info('Invalid message received:', parsedMessage);
    }
  });

  // WebSocket connection closing
  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
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