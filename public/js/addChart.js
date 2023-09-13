let cond = false;


function addChart(divId, clientId, websocket) {
    // Find the div element by its ID
    const divElement = document.getElementById(divId);


    // Create the new chart select options :

    const plusButton = document.createElement('button');
    plusButton.innerText = '+';
    plusButton.addEventListener('click', () => {

      plusButton.remove();
  
      // Create x-axis dropdown list
        const xAxisDropdown = document.createElement('select');
        xAxisDropdown.id = 'xaxis-'+divId;
        populateDropdown(xAxisDropdown, ["time","batch","cycle","phase","en","rp","ec","cur","prs_md","prs_pf","vol_di","vol_rg","vol_fw"]);
  
      // Create y-axis dropdown list
        const yAxisDropdown = document.createElement('select');
        yAxisDropdown.id = 'yaxis-'+divId;
        populateDropdown(yAxisDropdown, ["time","batch","cycle","phase","en","rp","ec","cur","prs_md","prs_pf","vol_di","vol_rg","vol_fw","ec delta","q_charge","ec_int"]);

      // Create y2-axis dropdown list for another variable
        const y2AxisDropdown = document.createElement('select');
        y2AxisDropdown.id = 'y2axis-'+divId;
        populateDropdown(y2AxisDropdown,["time","batch","cycle","phase","en","rp","ec","cur","prs_md","prs_pf","vol_di","vol_rg","vol_fw"]);
        y2AxisDropdown.style.display = 'none';

  
      // Create plus button for adding more y-axis values
      const addButtonY = document.createElement('button');
      addButtonY.innerText = '+';
      addButtonY.addEventListener('click', () => {
        y2AxisDropdown.style.display = 'block';
        addButtonY.style.display = 'none';
        cond = true;
      })
  
      // Create go button for generating the chart
      const goButton = document.createElement('button');
      goButton.innerText = 'Go';
      goButton.addEventListener('click', () => {
        const selectedXAxisValue = xAxisDropdown.value;
        const selectedYAxisValue = yAxisDropdown.value;
        const selectedY2AxisValue = y2AxisDropdown.value;

        const imageElement = document.createElement('img');
        imageElement.className = "loading"
        divElement.appendChild(imageElement);
        imageElement.src = "/loading";

        if (selectedXAxisValue === "time" && selectedYAxisValue === "ec delta") {
          const message = {
            plot: "ec_delta",
            xSelected: selectedXAxisValue,
            ySelected: selectedYAxisValue,
            clientId: clientId,
          };
          websocket.send(JSON.stringify(message));
          console.log("message sent");
        
          websocket.onmessage = (event) => {
            const message = event.data;
        
            if (event.data === '/image/plot.png') {
              console.log("img received");
              const cacheBuster = Date.now();

              imageElement.id = 'imageIdDelta';
              imageElement.src = `/image/plot.png?${cacheBuster}`;
              imageElement.className = "plot"

              divElement.appendChild(imageElement);
            }
            else if(event.data.startsWith('Error')) {
              imageElement.src = "/error";
              divElement.appendChild(imageElement);
              console.log(event.data);
            }
          };
        }

        else if (selectedXAxisValue === "time" && selectedYAxisValue === "q_charge") {
          const message = {
            plot: "q_charge",
            xSelected: selectedXAxisValue,
            ySelected: selectedYAxisValue,
            clientId: clientId,
          };
          websocket.send(JSON.stringify(message));
          console.log("message sent");
        
          websocket.onmessage = (event) => {
            const message = event.data;
        
            if (event.data === '/image/plot.png') {
              console.log("img received");
              const cacheBuster = Date.now();

              imageElement.id = 'imageIdCharge';
              imageElement.src = `/image/plot.png?${cacheBuster}`;
              imageElement.className = "plot"

              divElement.appendChild(imageElement);
            }
            else if(event.data.startsWith('Error')) {
              imageElement.src = "/error";
              divElement.appendChild(imageElement);
              console.log(event.data);
            }
          };
        }

        else if (selectedXAxisValue === "time" && selectedYAxisValue === "ec_int") {
          const message = {
            plot: "ec_int",
            xSelected: selectedXAxisValue,
            ySelected: selectedYAxisValue,
            clientId: clientId,
          };
          websocket.send(JSON.stringify(message));
          console.log("message sent");
        
          websocket.onmessage = (event) => {
            const message = event.data;
        
            if (event.data === '/image/plot.png') {
              console.log("img received");
              const cacheBuster = Date.now();

              imageElement.id = 'imageIdEcInt';
              imageElement.src = `/image/plot.png?${cacheBuster}`;
              imageElement.className = "plot"

              divElement.appendChild(imageElement);
            }
            else if(event.data.startsWith('Error')) {
              imageElement.src = "/error";
              divElement.appendChild(imageElement);
              console.log(event.data);
            }
          };
        }

        else {

          if(cond) { //cond means if user has selected two x axis
            const message = {
              plot: "plot2",
              xSelected: selectedXAxisValue,
              ySelected: selectedYAxisValue,
              ySelected2: selectedY2AxisValue,
              clientId: clientId,
            };
            websocket.send(JSON.stringify(message));
            console.log("message sent");
            cond=false;
          }

          else {
            const message = {
              plot: "plot",
              xSelected: selectedXAxisValue,
              ySelected: selectedYAxisValue,
              clientId: clientId,
            };
            websocket.send(JSON.stringify(message));
            console.log("message sent");
          }
        
          websocket.onmessage = (event) => {
            const message = event.data;
        
            if (event.data === '/image/plot.png') {
              console.log("img received");
        
              const cacheBuster = Date.now();
        
              imageElement.id = 'imageId'; 
              imageElement.src = `/image/plot.png?${cacheBuster}`;
              imageElement.className = "plot"
              
              divElement.appendChild(imageElement);
            }
            else if(event.data.startsWith('Error')) {
              imageElement.src = "/error";
              divElement.appendChild(imageElement);
              console.log(event.data);
            }
          };
        }
        
        //On chart display hide all the previous buttons
        xAxisDropdown.style.display = 'none';
        yAxisDropdown.style.display = 'none';
        y2AxisDropdown.style.display = 'none';
        plusButton.style.display = 'none';
        addButtonY.style.display = 'none';
        goButton.style.display = 'none';

        //remove chart button
        const minButton = document.createElement('button');
        minButton.innerText = '-';
        minButton.className = 'chart-buttons';
        minButton.id='minus-button';
        minButton.addEventListener('click', () => {
          divElement.remove();
        })
        divElement.appendChild(minButton);


        // Generate new div ID by incrementing the current divId
        const newDivId = divId.slice(0, -1) + (parseInt(divId.slice(-1)) + 1);

        // Create a new div element with the incremented ID
        const newDivElement = document.createElement('div');
        document.body.appendChild(newDivElement);
        newDivElement.id = newDivId;
        newDivElement.className = 'chartdiv';

        // Call addChart function to create a new chart inside the new div
        addChart(newDivId, clientId, websocket);
      });
  
      // Append the dropdown lists and buttons to the div
      divElement.appendChild(xAxisDropdown);
      divElement.appendChild(yAxisDropdown);
      divElement.appendChild(y2AxisDropdown);
      divElement.appendChild(addButtonY);
      divElement.appendChild(goButton);
    });
  
    // Add the plus button to the div
    divElement.appendChild(plusButton);
  }
  
  function populateDropdown(dropdown, options) {
    options.forEach((option) => {
      const dropdownOption = document.createElement('option');
      dropdownOption.value = option;
      dropdownOption.text = option;
      dropdown.appendChild(dropdownOption);
    });
}

export { addChart};


