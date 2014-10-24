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
        color:'#218559',
        formFields:[
          {name:'description',type:'textarea'}, 
          {name:'location',type:'text'},
          {name:'image search', type:'image-search'},
          {name:'imageURL', type:'url'}
        ]
      },
      {
        name:'resource',
        color:'#2CA4F9',
        formFields:[
          {name:'description',type:'textarea'}, 
          {name:'location',type:'text'},
          {name:'image search', type:'image-search'},
          {name:'imageURL', type:'url'}
        ]
      },
      {
        name:'project',
        color:'#EBB035',
        formFields:[
          {name:'description',type:'textarea'},
		  {name:'image search', type:'image-search'},
          {name:'imageURL', type:'url'}
        ]
      }, 
      {
        name:'book',
        color:'#876f69',
        formFields:[
          {name:'description',type:'textarea'},
          {name:'image search', type:'image-search'},
          {name:'imageURL', type:'url'}
        ]
      },
      {
        name:'event',
        color:'#551A8B',
        formFields:[
          {name:'title', type:'text'},
          {name:'description',type:'textarea'},
          {name:'start', type:'text'},
          {name:'end', type:'text'}
        ]
      },
      {
      	name:'deleted',
      	color:'#FF2222'
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
			req.body.posted=moment().format();
			//check to see if new image was sent
			if (check.imageURL!==req.body.imageURL){
				//image is different
				
				syncImagePromise = saveImage(req.body);
				req.body.image = 'images/items/'+req.body.uid+'/itemImage.jpg';
				req.body.thumb = 'images/items/'+req.body.uid+'/itemThumb.jpg';
			}

			db.itemdb.update({uid: req.body.uid}, req.body, function (err, doc) {
				if(err){ console.log('(error updating item) '+err); }else{ q.when(syncImagePromise).then(function(){res.send(doc)}); }
			});
		});
	} else {
		req.body.uid=generateUID();
		req.body.posted=moment().format();
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
			if(err){ console.log('(error saving item) '+err); }else{ q.when(syncImagePromise).then(function(){res.send(doc)}); } 
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
