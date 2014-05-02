var mongojs = require('mongojs');
var db = mongojs('mongodb://localhost:27017/itemdb', ['itemdb']);

var express = require('express'),
    app = express();

// Configure the web app
app.configure(function(){
    app.use(app.router);
    app.use(express.static(__dirname + '/www'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.get('/api/getItems', function (req, res) {

	db.itemdb.find(function(err, docs) {
		res.send( docs, "pants" );
	});
});

app.get('/api/getWiki', function (req, res) {

	var jsdom = require('jsdom');

	jsdom.env({  
	  html: "<html><body></body></html>",
	  scripts: [
	    'http://code.jquery.com/jquery-1.5.min.js'
	  ]
	}, function (err, window) {
	  var $ = window.jQuery;

	  $('body').append("<div class='testing'>Hello World</div>");
	  res.send($(".testing").text()); // outputs Hello World
	});
});

app.post('/api/saveItem', express.json(), function (req, res) {
	db.itemdb.save(req.body);
});






app.listen(80);
