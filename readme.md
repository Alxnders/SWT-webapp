# Webapp Setup

This repository contains the necessary files to set up and run the webapp.

## Prerequisites

Make sure you have the following software installed on your machine:

- Node.js (https://nodejs.org) - Ensure you have the latest LTS version installed.

## Getting Started

1. Clone the repository or download the ZIP file.

2. Open a terminal or command prompt and navigate to the project directory.

3. Install the project dependencies by running the following command:

> npm install

4. Start the server using the following command at the root of the project:

> npm start

5. Open a web browser and visit `http://localhost:3000` to view the webapp. (change the IP and port in server.js) 

## Directory Structure

The directory structure of the project is as follows:

# Backend (outdated)
- `server/`: The directory containing all the server side components for the webapp.
- `server/server.js`: The Node.js server file that handles the routing and serves the webapp.
- `server/parse.js`: Js file that selects how to handle a given file, .dat or .csv.
- `server/dataToJson.js`: Js file that converts parse data into a json format ready to be read by frontend.
- `server/getFirstJsonFileinDir.js`: Utils js file for sending the first file on server start to front.
- `server/machineUtils.js`: Js file that is used to collect and store all the different machines names that have data saved on the server.
- `server/process.js`: Js file that automates the process of reading through each dat file to convert into json format using previously stated js files functions.

- `server/raw/`: The directory where all the raw files from each machine is copied, each machine has its own file saved in the raw directory.
- `server/data/`: The directory where all the processed data files are stored, they are processed from the raw files into json format.

# Frontend (outdated)
- `public/`: The directory containing static files, such as HTML, CSS, JavaScript, and images.
- `public/index.html`: The main HTML file for the webpage.
- `public/style/`: The directory containing CSS files.
- `public/js/`: The directory containing JavaScript files.
- `public/img/`: The directory containing image files.

# Author
Alexander SAUVIGNET alexander.sauvignet@stockholmwater.com
