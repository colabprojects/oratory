//be careful with plurals - all the singular words are dealing with one object, and the plurals are dealing with multiple
//database types:
//	item
//	location
//	staged
//	history

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
	db.itemdb.find({type:'item'},function (err, docs) {
		if(err){ console.log('(error getting items) '+err); }else{ res.send(docs); }
	});
});//end GET items

//for an example of this - see "testing calls" bottom of item.js
app.post('/api/getItem', function (req, res) {
	db.itemdb.findOne(req.body, function (err, doc) {
		if(err){ console.log('(error getting item) '+err); }else{ res.send(doc); }
	});
});//end 'GET' (single) item - send the uid and retrieve item (untested - send multiple uid's?)

app.post('/api/saveItem',express.json(), function (req, res) {
	db.itemdb.insert(req.body, function (err, doc) { 
		if(err){ console.log('(error saving item) '+err); }else{ res.send(doc); } 
	});
});//end SAVE single item

app.post('/api/removeItem', express.json(), function (req, res) {
	db.itemdb.remove(req.body, function (err, doc) {
		if(err){ console.log('(error removing item) '+err); }else{ res.send(doc); }
	});
});//end REMOVE single item

app.post('/api/updateItem', express.json(), function (req, res) {
	db.itemdb.update({uid: req.body.uid}, req.body, function (err, doc) {
		if(err){ console.log('(error updating item) '+err); }else{ res.send(doc); }
	});
});//end UPDATE single item

app.post('/api/stageItem', express.json(), function (req, res) {
	db.itemdb.insert({type:'staged', key:req.body.actionKey, modifiedItem:req.body.data}, function (err, doc) {
		if(err){ console.log('(error staging item) '+err); }else{ res.send(doc); }
	});
});//end 'STAGE' single item

app.get('/api/unStage/:key/:decision', function (req, res) {
	//find the staged item based on key
	db.itemdb.find({type:'staged', key:req.params.key}, function (err, doc) {
		//for some reason - it is returning an array......
		modifiedItem = doc[0].modifiedItem;
		//slap in the historical item
		db.itemdb.find({type:'item', uid:modifiedItem.uid}, function (err, old) {
			db.itemdb.insert({type:'history', forUID:old[0].uid, data:old[0] }, function (err, doc) {});
		});
		//update with new item data
		db.itemdb.update({uid:modifiedItem.uid}, modifiedItem);
	});
	//remove the staged item
	db.itemdb.remove({type:'staged', key:req.params.key}, function (err, doc) {});
});//end 'UNSTAGE' single item

//EMAILS ----------------------------------------

app.post('/api/sendEmail', express.json(), function (req, res){

	console.log('trying to send email to ' + req.body.to);
	smtpTrans.sendMail({
	    from: 'Robot <colabrobot@gmail.com>',
	    to: req.body.to,
	    subject: req.body.subject,
	    text: 'text body',
	    html: req.body.HTMLbody
	}, function (err, doc){
	    if(err){ console.log(err); }else{ 
	    	//email was sent!
	    	res.send(250);
	    	console.log('Message sent: ' + doc.response); }
	});
    
});
	
//DICTIONARIES --------------------------------

//locations:
app.get('/api/getLocations', function (req,res) {
	db.itemdb.find({type:'location'}, function (err, doc) {
		if(err){ console.log(err); }else{ res.send(doc); }
	});
});//end GET locations
app.post('/api/saveLocation', express.json(), function (req, res) {
	db.itemdb.insert(req.body, function (err, doc) {
		if(err){ console.log(err); }else{ res.send(doc); }
	});
});//end SAVE location

//form fields:
//GET form fields....
//app.post('/api/saveField', express.json(), function (req, res) {
//	db.itemdb.insert(req.body);
//});//end SAVE form field





app.listen(80);
