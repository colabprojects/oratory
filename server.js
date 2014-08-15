//be careful with plurals - all the singular words are dealing with one object, and the plurals are dealing with multiple

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


//API
//this is a test one:
app.get('/api/getTest', function (req, res) {
	res.send('yup - working!')
});


//Items:
app.get('/api/getItems', function (req, res) {
	db.itemdb.find({type:'item'},function(err, docs) {
		res.send(docs);
	});
});//end GET items


//TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST 

app.post('/api/getItem', function (req,res) {
	db.itemdb.findOne(req.body, function(err, doc){
		res.send(doc);
	});
});//end 'GET' (single) item

app.post('/api/updateItem', express.json(), function (req, res) {
	db.itemdb.update(req.body.uid, {$set: req.body});
});//end UPDATE single item

//TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST TEST



app.post('/api/saveItem', express.json(), function (req, res) {
	db.itemdb.insert(req.body);
});//end SAVE single item

app.post('/api/removeItem', express.json(), function (req, res) {
	db.itemdb.remove(req.body);
});//end REMOVE single item






//Item dictionaries:

//locations:
app.get('/api/getLocations', function (req,res) {
	db.itemdb.find({type:'location'}, function(err, doc){
		res.send(doc);
	});
});//end GET locations
app.post('/api/saveLocation', express.json(), function (req, res) {
	db.itemdb.insert(req.body);
});//end SAVE location

//form fields:
//GET form fields....

app.post('/api/saveField', express.json(), function (req, res) {
	db.itemdb.insert(req.body);
});//end SAVE form field







app.listen(80);
