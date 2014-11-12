//be careful with plurals - all the singular words are dealing with one object, and the plurals are dealing with multiple
//database types:
//	item
//	location
//	staged
//	history
//  stageLock
//  settings
//allowable push changes:
//	lock
//	flag
//	comment

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
//the following are used for images (but can also be used for a shit-ton of other things)
var fs = require('fs');
var request = require('request');
var q = require('q');
var url = require('url');
var _ = require('underscore');
var moment = require('moment');
//image manipulation (for thumbnails)
var gm = require('gm').subClass({ imageMagick: true });
//make directory for item images:
if (!fs.existsSync('/vagrant/www/images/items/')) {
	fs.mkdir('/vagrant/www/images/items/');
}
//default item image:
var defaultImage = 'images/default.jpg';

var dbInfo = {
    formElements:['text', 'textarea', 'url'],
    types:[
      {
        name:'tool',
        color:{r:'76',g:'164',b:'84'},
        formFields:[
          {name:'need', type:'radio', options:['have','want'], default:'have'},
          {name:'description',type:'textarea'}, 
          {name:'location',type:'text'},
          {name:'image search', type:'image-search'},
          {name:'imageURL', type:'url'}
        ]
      },
      {
        name:'resource',
        color:{r:'68',g:'114',b:'185'},
        formFields:[
          {name:'need', type:'radio', options:['have','want'], default:'have'},
          {name:'description',type:'textarea'}, 
          {name:'location',type:'text'},
          {name:'image search', type:'image-search'},
          {name:'imageURL', type:'url'}
        ]
      },
      {
        name:'project',
        color:{r:'225',g:'135',b:'40'},
        formFields:[
          {name:'description',type:'textarea'},
		  {name:'image search', type:'image-search'},
          {name:'imageURL', type:'url'}
        ]
      }, 
      {
        name:'book',
        color:{r:'190',g:'76',b:'57'},
        formFields:[
          {name:'need', type:'radio', options:['have','want'], default:'have'},
          {name:'description',type:'textarea'},
          {name:'image search', type:'image-search'},
          {name:'imageURL', type:'url'}
        ]
      },
      {
        name:'event',
        color:{r:'147',g:'81',b:'166'},
        formFields:[
          {name:'title', type:'text'},
          {name:'description',type:'textarea'},
          {name:'start', type:'text'},
          {name:'end', type:'text'}
        ]
      },
      {
      	name:'deleted',
      	color:{r:'225',g:'20',b:'20'}
      }
    ]
};


//API ---------------------------------------------------------------------------------------
//ITEMS  --------------------------------
app.get('/api/getDatabase', function (req, res) {
	db.itemdb.find(function (err, docs) {
		if(err){ console.log('(error getting database) '+err);}else { res.send(docs); }
	});
});//end GET database

app.post('/api/getItems', express.json(), function (req, res) {
	var query = {};
	if (req.body.type) { query['type'] = req.body.type; }
	else { query = { $or:_(dbInfo.types).map(function(item){ return {'type':item.name}; }) }; }
	db.itemdb.find(query,function (err, docs) {
		if(err){ console.log('(error getting items) '+err); }else{ res.send(docs); }
	});
});//end GET items

app.post('/api/getItemHistory', express.json(), function (req, res) {
	db.itemdb.find({type:'history', forUID:req.body.uid},function (err, docs) {
		if(err){ console.log('(error getting item history) '+err); }else{ res.send(docs); }
	});
});//end GET item history

app.post('/api/getItem', express.json(), function (req, res) {
	db.itemdb.findOne(req.body, function (err, doc) {
		if(err){ console.log('(error getting item) '+err); }else{ res.send(doc); }
	});
});//end 'GET' (single) item - send the uid and retrieve item (untested - send multiple uid's?)

app.post('/api/saveItem', express.json(), function (req, res) {
	var syncImagePromise;
	if (req.body.uid) {
		db.itemdb.find({uid:req.body.uid}, function (err, check) {
			if (!check.length||check[0].uid!==req.body.uid) {
				return res.send(500);
			}
			//it is there - update and store history
			delete req.body._id;
			db.itemdb.insert({type:'history', forUID:req.body.uid, data:req.body }, function (err, doc) {});
			req.body.edited=moment().format();
			//check to see if new image was sent
			if (check.imageURL!==req.body.imageURL){
				//image is different
				
				syncImagePromise = saveImage(req.body);
				req.body.image = 'images/items/'+req.body.uid+'/itemImage.jpg';
				req.body.thumb = 'images/items/'+req.body.uid+'/itemThumb.jpg';
			}

			//remove edit lock
			delete req.body.lock;

			db.itemdb.update({uid: req.body.uid}, req.body, function (err, doc) {
				if(err){ console.log('(error updating item) '+err); }else{ q.when(syncImagePromise).then(function(){res.send(doc)}); }
			});
		});
	} else {
		//brand new item!!!
		req.body.uid=generateUID();
		req.body.totalPriority=0;
		req.body.created=moment().format();
		//set owner as creator if not specified
		if (!req.body.owner) { req.body.owner = req.body.createdBy; }

		if (req.body.imageURL) {
			//image url provided
			syncImagePromise = saveImage(req.body);
			req.body.image = 'images/items/'+req.body.uid+'/itemImage.jpg';
			req.body.thumb = 'images/items/'+req.body.uid+'/itemThumb.jpg';
		}else{
			//no image, use default
			req.body.image = defaultImage;
			req.body.thumb = defaultImage;
		}
		db.itemdb.insert(req.body, function (err, doc) { 
			if(err){ console.log('(error saving item) '+err); }else{ q.when(syncImagePromise).then(function(){res.send(doc);}); } 
		});
	}
});//end SAVE single item

app.post('/api/deleteItem', express.json(), function (req, res){
	req.body.oldType = req.body.type;
	req.body.type = 'deleted';
	delete req.body._id;
	db.itemdb.update({uid:req.body.uid}, req.body, function (err, doc){
		if(err){ consold.log('(error deleting item) '+err); }else { res.send(doc); }
	});
});//end DELETE item

app.post('/api/requestLock', express.json(), function (req, res){
	var syncLockPromise;
	db.itemdb.findOne({uid:req.body.uid}, function (err, item){
		if(err||!item){ console.log('(error requesting lock on item) '+err); }
		else { 
			if (item.lock){
				//already has a lock
				res.send(item);
			} else {
				//does not have lock yet
				syncLockPromise = changeLock(item,req.body.email, true);
				q.when(syncLockPromise).then(function(){
					res.send(item);
				});
				
			}
		}
	});
});//end request lock item

app.post('/api/removeLock', express.json(), function (req, res){
	var syncLockPromise;
	console.log('removing lock for item: '+req.body.uid)
	db.itemdb.findOne({uid:req.body.uid}, function (err, item){
		if(err||!item){ console.log('(error removing lock on item) '+err); }
		else { 
			syncLockPromise = changeLock(item,req.body.email, false);
			q.when(syncLockPromise).then(function(){
				res.send(item);
			});
		}
	});
});//end remove lock item

//needs in post:  {uid:uidofitem, email:usermakingedit, value:1or-1or0}
app.post('/api/setPriority', express.json(), function (req, res){
	var currentPriority;
	db.itemdb.findOne({uid:req.body.uid},function (err, doc) {
		if(err){ console.log('(error finding item) '+err); }
		else { 
			if (doc.priority){
				//exists
				currentPriority=doc.priority;
			} else {
				currentPriority=[];
			}
			//find if user already added
			var userPriority = _.findWhere(currentPriority,{email:req.body.email});
			if (userPriority) {
		 		var index = currentPriority.indexOf(userPriority);
		 		var newPriority = currentPriority;
		 		newPriority[index] = {email:req.body.email, value:req.body.value};
		 	} else {
		 		//not added yet
		 		var newPriority=currentPriority;
		 		newPriority.push({email:req.body.email, value:req.body.value});
		 	}

		 	//add up all priorities:
		 	var totalPriority = _.reduce(newPriority, function(memo,element){ return memo + element.value; },0);

		 	doc.totalPriority = totalPriority;

		 	if (newPriority){
		 		doc.priority=newPriority;
			 	db.itemdb.update({uid:req.body.uid}, {$set:{priority:newPriority, totalPriority:totalPriority}}, function (err,doc2){
			 		if(err){ console.log('(error updating priority) '+err); }else{ 
			 			res.send(doc); 
			 		}
			 	});
			}
		}
	});
});

//of the form {pushToUID: something, push: thekey, value: thevalue}
app.post('/api/pushToItem', express.json(), function (req, res) {
	var pushValue = {};
	pushValue.$set = {};
	pushValue.$set[req.body.push] = req.body.value; 
	db.itemdb.update({uid: req.body.pushToUID}, pushValue, function (err, doc) {
		if(err){ console.log('(error updating item) '+err); }else{ res.send(doc); }
	});

});//end PUSH to single item

app.post('/api/stageItem', express.json(), function (req, res) {
	db.itemdb.insert({type:'staged', key:req.body.actionKey, modifiedItem:req.body.data}, function (err, doc) {
		if(err){ console.log('(error staging item) '+err); }else{ res.send(doc); }
	});
});//end 'STAGE' single item

app.get('/api/unStage/:key/:decision', function (req, res) {
	if (req.params.decision) { //true!
		//find the staged item based on key
		db.itemdb.find({type:'staged', key:req.params.key}, function (err, doc) {
			//for some reason - it is returning an array......
			modifiedItem = doc[0].modifiedItem;
			//slap in the historical item
			db.itemdb.find({uid:modifiedItem.uid}, function (err, old) {
				db.itemdb.insert({type:'history', forUID:old[0].uid, data:old[0] }, function (err, doc) {});
			});
			//remove stageLock
			modifiedItem.stageLock = false;
			modifiedItem.lock = false;
			//update with new item data
			db.itemdb.update({uid:modifiedItem.uid}, modifiedItem);
		});
		//remove the staged item
		db.itemdb.remove({type:'staged', key:req.params.key}, function (err, doc) {});
	} else { //false
		console.log('decided against it...');
	}
});//end 'UNSTAGE' single item


//IMAGES --------------------------------
function saveImage(item) {
	var saveImagePromise = q.defer();
	request.get({url: url.parse(item.imageURL), encoding: 'binary'}, function (err, response, body) {
		console.log('trying to save the image for item: '+item.name);
		var path = '/vagrant/www/images/items/'+item.uid+'/';
		if (fs.exists(path, function (){ return true; })) {
			//path exists (remove then make fresh)
			fs.rmdir(path);
		}
		fs.mkdir(path);
	    fs.writeFile(path+"itemImage.jpg", body, 'binary', function(err) {
	    	if(err) { 
	    		console.log(err); 
	    		saveImagePromise.reject();
	    	}else{ 
	    		//save image thumbnail
	    		console.log("The file was saved!"); 
	    		gm(path+'itemImage.jpg').resize('60','60').gravity('center').write(path+'itemThumb.jpg', function(err) {
	    			if(err) { 
	    				console.log(err); 
	    				saveImagePromise.reject();
	    			}else{ 
	    				//successful image save chain:
	    				saveImagePromise.resolve();
	    				console.log("Image thumbnail saved"); 
	    			}
	    		});//end save image thumb
	    	}//end save image
	    }); 
	});
	return saveImagePromise.promise;
}//end SAVE image


//EMAILS --------------------------------
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

//LOCKS --------------------------------
function changeLock(item,who,value){
	var changeLockPromise = q.defer();

	db.itemdb.update({uid: item.uid}, {$set:{lock:value, lockChangedBy:who}}, function (err, doc) {
		if(err){ 
			console.log('(error changing lock on item) '+err); 
			changeLockPromise.reject();
		} else {
			//success
			changeLockPromise.resolve();
		}
	});

	return changeLockPromise.promise;
}

	

//DICTIONARIES --------------------------------

app.get('/api/getDbInfo', function (req,res){
	res.send(dbInfo);
});






function generateUID() {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });
}

app.listen(80);
