console.log('server running');

/**
  * @desc contains user information and should definitely be changed - email will not work without the colabrobot gmail creds
  * in the users.js file
*/
var users = require('./users');

/**
  * @desc using rethinkdb and express for all the magic
*/

//app engine
var express = require('express'),
    app = express();

/**
  * @desc various dependencies 
*/
var http = require('http').Server(app);
var io = require('socket.io')(http);
var db = require("./database/db");


module.exports = {
    express: express,
    app: app,
    io: io,
}

//app configuration
app.use(express.cookieParser());
app.use(express.session({secret: "This is a secret"}));
app.use(db.createConnection);
app.use(app.router);
app.use(express.static(__dirname + '/www'));
app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
app.use(db.closeConnection);


//"schema" for database
var dbInfo = require("./database/dbInfo");

/**
  * @desc used for proposals and generated emails for "members" that cast a vote - this should definitely be changed
*/
var proposalSecrets = {};
//var members = [{name:'micha'},{name:'jackie'},{name:'mike'},{name:'coop'},{name:'steve', email:'steven.c.hein@gmail.com'}];
var memb
ers = [{name:'steve', email:'steven.c.hein@gmail.com'}, {name:'steve2',email:'imaspaceranger@gmail.com'}];

require("./api/auth");
require("./api/items");
require("./api/proposals");
require("./api/lock");


//DICTIONARIES --------------------------------

app.get('/api/getDbInfo', function (req,res){
	res.send(dbInfo);
});


//SOCKETS --------------------------------

io.on('connection', function(socket){
  console.log('a user connected');
});


function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

http.listen(80);
