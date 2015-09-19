console.log('server running');

/**
  * @desc contains user information and should definitely be changed - email will not work without the colabrobot gmail creds
  * in the users.js file
*/
var users = require('./users');

/**
  * @desc using rethinkdb and express for all the magic
*/
var r = require('rethinkdb', 'oratory'),
    db = r.connect(
        { host: 'localhost', port: 28015, }
    ).then(function(err, conn) {
        console.log("Connected to rethinkdb");
        if (err) {
            throw(err);
        }
        db = conn;
        r.tableCreate('items', {primaryKey: 'uid'})
            .run(conn, function(err, stat) {
                r.tables("items").indexCreate("types")
                    .run(conn, function(err, stat) { if (err) {throw(err)} });
            });
        r.tableCreate('history', {primaryKey: 'key'})
            .run(conn, function(err, stat) {
                r.tables("history").indexCreate("forUID")
                    .run(conn, function(err, stat) { if (err) {throw(err)} });
            });
    });

//app engine
var express = require('express'),
    app = express();

/**
  * @desc various dependencies 
*/
var http = require('http').Server(app);
var io = require('socket.io')(http);


module.exports = {
    express: express,
    app: app,
    db: db,
    io: io,
}

//app configuration
app.use(express.cookieParser());
app.use(express.session({secret: "This is a secret"}));
app.use(app.router);
app.use(express.static(__dirname + '/www'));
app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));


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
