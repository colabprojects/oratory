console.log('server starting');

/**
  * @desc contains user information and should definitely be changed - email will not work without the colabrobot gmail creds
  * in the users.js file
*/
var users = require('./users');

/**
  * @desc using mongo db and express for all the magic
*/
console.log("Connecting to mongo");
var mongojs = require('mongojs');
var db = module.exports.db = mongojs('mongodb://db:27017/itemdb', ['itemdb']);

//app engine
console.log("Creating app engine and config");
var express = module.exports.express = require('express'),
    app = module.exports.app = express();

//app configuration
app.use(express.cookieParser());
app.use(express.session({secret: "This is a secret"}));
app.use(app.router);
app.use(express.static(__dirname + '/www'));
app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));


/**
  * @desc various dependencies 
*/
console.log("Loading Dependencies");
var http = require('http').Server(app);
var io = module.exports.io = require('socket.io')(http);

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

console.log("Listening on port 80");
http.listen(80);
