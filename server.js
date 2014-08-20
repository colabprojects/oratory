//be careful with plurals - all the singular words are dealing with one object, and the plurals are dealing with multiple
console.log('server running');

//CONFIG -------------------------------------------------------------------------------------
//database
var mongojs = require('mongojs');
var db = mongojs('mongodb://localhost:27017/itemdb', ['itemdb']);

//app engine
var express = require('express'),
    app = express();

//app configuration
app.configure(function(){
    app.use(app.router);
    app.use(express.static(__dirname + '/www'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

//email auth
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
smtpTrans = nodemailer.createTransport(smtpTransport({
	service:'gmail',
 	auth: {
      	user: "colabrobot@gmail.com",
      	pass: "r0b0tp4r4d3" 
  	}
}));


//API ---------------------------------------------------------------------------------------

//Items  --------------------------------
app.get('/api/getItems', function (req, res) {
	db.itemdb.find({type:'item'},function(err, docs) {
		res.send(docs);
	});
});//end GET items

//for an example of this - see "testing calls" bottom of item.js
app.post('/api/getItem', function (req,res) {
	db.itemdb.findOne(req.body, function(err, doc){
		res.send(doc);
	});
});//end 'GET' (single) item - send the uid and retrieve item (untested - send multiple uid's?)

app.post('/api/saveItem',express.json(), function (req, res) {
	db.itemdb.insert(req.body);
});//end SAVE single item

app.post('/api/removeItem', express.json(), function (req, res) {
	db.itemdb.remove(req.body);
});//end REMOVE single item

app.post('/api/updateItem', express.json(), function (req, res) {
	db.itemdb.update({uid: req.body.uid}, req.body);
});//end UPDATE single item

app.post('/api/stageItem', express.json(), function (req, res) {
	db.itemdb.insert({type:'staged', key:req.body.actionKey, modifiedItem:req.body.data});
});//end UPDATE single item




//Item dictionaries --------------------------------

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




//Emails ----------------------------------------

app.post('/api/sendEmail', express.json(), function (req, res){

	console.log(req.body.to);
	smtpTrans.sendMail({
	    from: 'Robot <colabrobot@gmail.com>',
	    to: req.body.to,
	    subject: req.body.subject,
	    text: 'text body',
	    html: req.body.HTMLbody
	}, function(error, info){
	    if(error){
	        console.log(error);
	    }else{
	        console.log('Message sent: ' + info.response);
	    }
	});
    
});
	


app.listen(80);
