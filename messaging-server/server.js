const express = require('express')
const app = express()
var expressWs = require('express-ws')(app);

const port = process.env.PORT || 3000;

app.get('/', function (req, res) {
  res.send('Hello World')
})

app.ws('/echo', function(ws, req) {
  ws.on('message', function(msg) {
    console.log(msg);
    ws.send(msg);
  });
});

  
app.listen(port, () => {
  console.log(`Listening at localhost:${port}`)
}) 