import { populateDropdown, populateLength, populateMachinesDropdown } from './droplist.js';
import { addChart} from './addChart.js';
import { handleButtonClick } from './cycButton.js';

let datesData;
let machinesData
let Id;

//use the dates route
const fetchDates = async () => {
  try {
    const response = await fetch('/dates');
    if (!response.ok) {
      throw new Error('Error fetching dates: ' + response.statusText);
    }
    datesData = await response.json();
  } catch (error) {
    console.error('Error fetching dates:', error);
  }
};

// Function to fetch machines array from the server
const fetchMachines = async () => {
  try {
    const response = await fetch('/machines');
    if (!response.ok) {
      throw new Error('Error fetching machines array: ' + response.statusText);
    }
    machinesData = await response.json();
  } catch (error) {
    console.error('Error fetching machines array:', error);
  }
};


async function loadApp() {
  //Fetch the dates and machines from back to display in the droplists
  await fetchDates();
  await fetchMachines();

  //Pop the droplists
  populateDropdown(datesData, Id, socket);
  populateMachinesDropdown(machinesData, Id, socket);
  populateLength(Id, socket);

  //Creates the first chart, re-creates its children afterwards
  addChart('chart1', Id, socket);

  // Add logic to the cycle button
  const button = document.getElementById('cycleButton');
  button.addEventListener('click', () => {
      handleButtonClick(socket, Id);
  });
}


//----------- Websocket ------------
const socket = new WebSocket('ws://10.1.1.9:3000');

//WebSocket connection opened
socket.addEventListener('open', () => {
  console.log('WebSocket connection opened');
});

//WebSocket message handling
socket.addEventListener('message', (event) => {
  console.log('Received message from server:', event.data);

  //refresh the charts data
  if (event.data === 'refreshchart') {
    fetchData().then(() => {
      refreshChart();
    });
  } 
  
  //Refresh the dates data
  //i.e when user changes machines, they get a new array of dates that need to populate the dropdown
  else if (event.data === 'refreshdates') {
    console.log('Fetching dates');
    fetchDates().then(() => {
      populateDropdown(datesData, Id);
    });
  }

  //Alerts the user of the cycle count they asked for
  else if (event.data.startsWith('count:')) {
    const cycleCount = event.data.split(':')[1];
    alert('Cycle count: ' + cycleCount);
  }

  else if (event.data.startsWith('/image') ) {
    console.log("image received");
  }

  else if(event.data.startsWith("Error")) {
    console.log("Error in generating image")
  }
  
  //On initial load, send to front user id from back, then load
  else {
    const parsedMessage = JSON.parse(event.data);
    if (parsedMessage.clientId !== undefined) {
      Id = parsedMessage.clientId;
      loadApp();
    }
  }
});

// WebSocket connection closed
socket.addEventListener('close', () => {
  console.log('WebSocket connection closed');

});

// ----------- Websocket ------------