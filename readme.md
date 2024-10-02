
## Before running the program for the first time:

1. make sure angular is installed
2. Run npm ci in the messaging-server directory.
3. Run npm ci in the messaging-client dir


## Running the Server

    DEPRECATED $env:PORT=3000; node server.js
    node server.js server1.env
    node server.js server2.env



## Running the Client

    ng serve

Specifying port

    --port 4201

open on run

    --open

    $env:DEFAULT_SERVER=3001; ng serve