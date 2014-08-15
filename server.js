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

//GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS GETS

//this is a test one:
app.get('/api/getTest', function (req, res) {
	res.send('yup - working!')
});

//get all items (to get a single item use the searches in posts or search on the resulting object for the single item you are looking for)
app.get('/api/getItems', function (req, res) {
	db.itemdb.find(function(err, docs) {
		res.send( docs );
	});
});


//POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS POSTS
app.post('/api/saveItem', express.json(), function (req, res) {
	db.itemdb.insert(req.body);
});

app.post('/api/removeItem', express.json(), function (req, res) {
	db.itemdb.remove(req.body);
});

app.post('/api/updateItem', express.json(), function (req, res) {
	db.itemdb.update(req.body.uid, {$set: req.body});
});

app.listen(80);
