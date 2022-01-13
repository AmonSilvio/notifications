var http = require('http')
var fs = require('fs')
var path = require('path')
const APP_PORT = process.env.APP_PORT || 8000
const app = http.createServer(requestHandler)

var EventEmitter = require('events');
var util = require('util');

// Build and instantiate our custom event emitter
function DbEventEmitter(){
  EventEmitter.call(this);
}

util.inherits(DbEventEmitter, EventEmitter);
var dbEventEmitter = new DbEventEmitter;

const { Pool, Client } = require('pg')
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'hovimaki7',
  port: 5432,
})



app.listen(APP_PORT)
console.log(`🖥 HTTP Server running at ${APP_PORT}`)

// handles all http requests to the server
function requestHandler(request, response) {
  console.log(`🖥 Received request for ${request.url}`)
  // append /client to serve pages from that folder
  var filePath = './client' + request.url
  if (filePath == './client/') {
    // serve index page on request /
    filePath = './client/index.html'
  }
  var extname = String(path.extname(filePath)).toLowerCase()
  console.log(`🖥 Serving ${filePath}`)
  var mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  }
  var contentType = mimeTypes[extname] || 'application/octet-stream'
  fs.readFile(filePath, function (error, content) {
    if (error) {
      if (error.code == 'ENOENT') {
        fs.readFile('./client/404.html', function (error, content) {
          response.writeHead(404, { 'Content-Type': contentType })
          response.end(content, 'utf-8')
        })
      } else {
        response.writeHead(500)
        response.end('Sorry, there was an error: ' + error.code + ' ..\n')
      }
    } else {
      response.writeHead(200, { 'Content-Type': contentType })
      response.end(content, 'utf-8')
    }
  })
}


// SOCKET.IO CHAT EVENT HANDLING
const io = require('socket.io')(app, {
  path: '/socket.io',
})

io.attach(app, {
  // includes local domain to avoid CORS error locally
  // configure it accordingly for production
  cors: {
    origin: 'http://localhost',
    methods: ['GET', 'POST'],
    credentials: true,
    transports: ['websocket', 'polling'],
  },
  allowEIO3: true,
})


io.on('connection', (socket) => {
  console.log('👾 New socket connected! >>', socket.id)

  // handles new connection
  // Define the event handlers for each channel name
dbEventEmitter.on('new_exam', (msg) => {
  // Custom logic for reacting to the event e.g. firing a webhook, writing a log entry etc
  console.log('New exam received: ' + msg);
  socket.emit('notification', {
    message: msg
  })
});

// Connect to Postgres (replace with your own connection string)
pool.connect((err, client, release) => {
    if (err) {
      return console.error('Error acquiring client', err.stack)
    }

  // Listen for all pg_notify channel messages
  client.on('notification', function(msg) {
    /* let payload = JSON.parse(msg.payload); */
    dbEventEmitter.emit(msg.channel, msg.payload);
  });
  
  // Designate which channels we are listening on. Add additional channels with multiple lines.
  client.query('LISTEN new_exam');
});


  })

















