export function populateDropdown(dates, clientId, socket, bool) {
    const dayDropdown = document.getElementById('dayDropdown');
  
    // Clear previous options
    dayDropdown.innerHTML = '';
  
    // Add new options
    dates.forEach((date) => {
      const option = document.createElement('option');
      option.value = date;
      option.text = date;
      dayDropdown.appendChild(option);
    });
  
    // Add event listener to the dropdown list
    if(bool) {
    dayDropdown.addEventListener('change', () => {
      const selectedDate = dayDropdown.value;

      const message = {
        date: selectedDate,
        clientId: clientId,
      };
      console.log(clientId + " is sending date : " + selectedDate);
      socket.send(JSON.stringify(message));
    });
    }
  }
  
  export function populateMachinesDropdown(machinesData, clientId, socket) {
    const machineDropdown = document.getElementById('machineDropdown');
  
    // Clear previous options
    machineDropdown.innerHTML = '';
  
    // Add new options
    machinesData.forEach((machine) => {
      const option = document.createElement('option');
      option.value = machine;
      option.text = machine;
      machineDropdown.appendChild(option);
    });
  
    // Add event listener to the dropdown list
    machineDropdown.addEventListener('change', () => {
      const selectedMachine = machineDropdown.value;
  
      const message = {
        machine: selectedMachine,
        clientId: clientId,
      };
      console.log(message);
      console.log(clientId + " is sending machine: " + selectedMachine);
      socket.send(JSON.stringify(message));
    });
  }

  export function populateLength(clientId, socket) {
    const lengthDropdown = document.getElementById('lengthDropdown');
  
    // Clear previous options
    lengthDropdown.innerHTML = '';
  
    const day = document.createElement('option');
    day.value = "day";
    day.text = "day";
    lengthDropdown.appendChild(day);

    const week = document.createElement('option');
    week.value = "week";
    week.text = "week";
    lengthDropdown.appendChild(week);

    const month = document.createElement('option');
    month.value = "month";
    month.text = "month";
    lengthDropdown.appendChild(month);

    const tmonth = document.createElement('option');
    tmonth.value = "3 months";
    tmonth.text = "3 months";
    lengthDropdown.appendChild(tmonth);

    const smonth = document.createElement('option');
    smonth.value = "6 months";
    smonth.text = "6 months";
    lengthDropdown.appendChild(smonth);

    const year = document.createElement('option');
    year.value = "year";
    year.text = "year";
    lengthDropdown.appendChild(year);
  
    // Add event listener to the dropdown list
    lengthDropdown.addEventListener('change', () => {
      const selectedLength = lengthDropdown.value;
  
      const message = {
        length: selectedLength,
        clientId: clientId,
      };
      console.log(message);
      console.log(clientId + " is sending length: " + selectedLength);
      socket.send(JSON.stringify(message));
    });
  }