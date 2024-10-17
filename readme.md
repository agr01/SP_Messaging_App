# OLAF's neighbourhood implementation 
By Alex Gramss (a1756431) and William Godfrey (a1743033) 

## Important note - CLI
The following commands can be executed using the following CLIs: cmd, powershell or bash.
However, the example bash commands provided have not been tested. 

Windows powershell is preferred.

## Before running the program for the first time:

1. Install node.js. This can be done be downloading the installer from https://nodejs.org/en/download/package-manager. The recommended configuration on Windows is v20.17.0 LTS and Chocolatey. This will allow you to use npm
2. Install angular. This can be done using by running the following command (in a terminal of your choice) ```npm i @angular/cli```
3. Run ```npm ci``` in the messaging-server directory. 
4. Run ```npm ci``` in the messaging-client directory.
5. Install the self-signed server certificate as a trusted certificate. How this is done will vary between OS's. Located in ```./messaging-server/ssl/```.

## Simulated environment

The following commands will create two servers, each with two connected clients
```
C       C
 \     /
  S - S
 /     \
C       C
```

This will require 6 separate terminals.

For steps 1 and 2 open terminals in or change to the messaging-server directory:

1. In terminal 1, run ```node server.js server1.env```
2. In terminal 2, run ```node server.js server2.env```

For steps 3-6 open terminals in the messaging-client directory: 

Powershell:

3. In terminal 3, run ```$env:DEFAULT_SERVER="localhost:3000"; ng serve --port 4200 --open```
4. In terminal 4, run ```$env:DEFAULT_SERVER="localhost:3000"; ng serve --port 4201 --open```
5. In terminal 5, run ```$env:DEFAULT_SERVER="localhost:3001"; ng serve --port 4202 --open```
6. In terminal 6, run ```$env:DEFAULT_SERVER="localhost:3001"; ng serve --port 4203 --open```

cmd:

3. In terminal 3, run ```set DEFAULT_SERVER="localhost:3000" && ng serve --port 4200 --open```
4. In terminal 4, run ```set DEFAULT_SERVER="localhost:3000" && ng serve --port 4201 --open```
5. In terminal 5, run ```set DEFAULT_SERVER="localhost:3001" && ng serve --port 4202 --open```
6. In terminal 6, run ```set DEFAULT_SERVER="localhost:3001" && ng serve --port 4203 --open```

bash (untested):

3. In terminal 3, run ```DEFAULT_SERVER="localhost:3000" ng serve --port 4200 --open```
4. In terminal 4, run ```DEFAULT_SERVER="localhost:3000" ng serve --port 4201 --open```
5. In terminal 5, run ```DEFAULT_SERVER="localhost:3001" ng serve --port 4202 --open```
6. In terminal 6, run ```DEFAULT_SERVER="localhost:3001" ng serve --port 4203 --open```


## Client App Usage
To send a public message, select public from the sidebar.</br>
To send a private message, select any recipient from the sidebar.</br>
To send a private group message, select multiple recipients from the sidebar.</br>
To view group messages, you must select all recipients in the group.</br>

Note: The client application has a group chat size limit of 10

# Running individual clients / servers

## Running the Server

To run a one of instance of the server, ensure you are in the messaging-server directory in your terminal and run the following:
```node server.js```
- Base server url will be localhost:3000.
- To connect using a WebSocket, use  wss://localhost:3000. 
- Server will accept any of the client messages OLAF's Neighbourhood protocol.
- Server will validate other servers before adding them to the neighbourhood.
- To change the allowed neighbourhood servers, modify the 2 arrays function ```setupNeighbourhood```. A neighbourhood server will have an address and a publicKey, one in each array respectively. The array indexes of servers will match.  

There is also the option of running more than server using the same code. 2 sample .env files have been provided.
To run these, 2 separate terminals are required. In each, run one of the following:

```node server.js server1.env``` -> Runs localhost:3000

```node server.js server2.env``` -> Runs localhost:3001

## Running the Client

To run a one of instance of the client, ensure you are in the messaging-client directory in your terminal and run the following:
```ng serve```
- Base server will be localhost:4200
- By default it will connect to the messaging server localhost:3000.
- Opening this in a browser will provide the chat UI.
- Messages can be sent to other online clients or to the public channel by clicking the respective bubble.
- To send a private group chat message, Click on all of the participants for the group chat so that they are all highlighted 
- To upload a file click the paper clip icon next to the send button.
- To download a file, paste the download link in your browser.

Adding more servers:</br>
The list of available servers is set in the app/constants.ts file.</br>
Simply modify the SERVERS array to add more available servers.

Specifying port: ```ng serve --port 4201```
This is the port that the web app will be served on.
    
Specifying a messaging-server to connect to:
powershell: ```$env:DEFAULT_SERVER="localhost:3001"; ng serve```
cmd: ```set DEFAULT_SERVER="localhost:3001" && ng serve```
bash (untested - code was developed using windows): ```DEFAULT_SERVER="localhost:3001" ng serve```

To immediatly open the web app in your default browser, add the --open flag: ```ng serve --open```

Full examples:</br>
powershell: ```$env:DEFAULT_SERVER="localhost:3001"; ng serve --port 4201 --open```</br>
cmd: ```set DEFAULT_SERVER="localhost:3001" && ng serve --port 4201 --open```</br>
bash (untested): ```DEFAULT_SERVER="localhost:3001" ng serve --port 4201 --open```</br>