//be careful with plurals - all the singular words are dealing with one object, and the plurals are dealing with multiple
//database types:
//	item
//	staged
//	history
//  settings
//allowable push changes:
//	lock
//	flag
//	comment

console.log('server running');

//USERS and hidden things....
var users = require('./users');

//CONFIG -------------------------------------------------------------------------------------
//database
var mongojs = require('mongojs');
var db = mongojs('mongodb://localhost:27017/itemdb', ['itemdb']);
//app engine
var express = require('express'),
    app = express();

//app configuration

app.use(express.cookieParser());
app.use(express.session({secret: "This is a secret"}));
app.use(app.router);
app.use(express.static(__dirname + '/www'));
app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));


var http = require('http').Server(app);
var io = require('socket.io')(http);

//email auth
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
smtpTrans = nodemailer.createTransport(smtpTransport({
	service:'gmail',
 	auth: {
      	user: "colabrobot@gmail.com",
      	pass: users["colabrobot@gmail.com"]
  	}
}));
//the following are used for images (but can also be used for a shit-ton of other things)
var fs = require('fs');
var request = require('request');
var q = require('q');
var url = require('url');
var _ = require('underscore');
var __ = require('lodash');
var moment = require('moment');
var jquery = require('jquery');
//image manipulation (for thumbnails)
var gm = require('gm').subClass({ imageMagick: true });
//make directory for item images:
if (!fs.existsSync('/vagrant/www/media/images')) {
	fs.mkdir('/vagrant/www/media/images/');
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
          {name:'start', type:'text', default:'TBD'},
          {name:'end', type:'text', default:'TBD'}
        ]
      },
      {
      	name:'deleted',
      	color:{r:'225',g:'20',b:'20'}
      }
    ]
};

var proposalSecrets = {};
//var members = [{name:'micha'},{name:'jackie'},{name:'mike'},{name:'coop'},{name:'steve', email:'steven.c.hein@gmail.com'}];
var members = [{name:'steve', email:'steven.c.hein@gmail.com'}, {name:'steve2',email:'imaspaceranger@gmail.com'}];
//API ---------------------------------------------------------------------------------------
//AUTH
app.post('/api/auth', express.json(), function (req, res) {
	if ((req.body.email !== '')&&(typeof req.body.email !== 'undefined')){ 
		if (req.body.useSpecial === true) {
			//assign a special token
		}
		
		if (users[req.body.email]===req.body.token) {
		
			req.session.user=req.body.email;
			res.send(true);

		} else { req.session.user=false; res.send(false); }

	} else { req.session.user=false; res.send(false); }
});//end auth

app.post('/api/authGen', express.json(), function (req, res) {
	if ((req.body.email !== '')&&(typeof req.body.email !== 'undefined')){ 
		var key = generateKey();

		console.log('trying to send email to ' + req.body.email);
		smtpTrans.sendMail({
		    from: 'Robot <colabrobot@gmail.com>',
		    to: req.body.email,
		    subject: 'is it really you?',
		    text: 'text body',
		    html: "<a href='http://colablife.info/#/auth/"+key+"'>YES!</a>"
		}, function (err, doc){
		    if(err){ console.log(err); }else{ 
		    	//email was sent!
		    	users[req.body.email]=key;
		    	res.send(200);
		    	console.log('Message sent: ' + doc.response); 
		    }
		});

	} else { res.send(500); }
});//end auth


//DB CONFIG


//ITEMS  --------------------------------
app.get('/api/getDatabase', function (req, res) {
	db.itemdb.find(function (err, docs) {
		if(err){ console.log('(error getting database) '+err);}else { res.send(docs); }
	});
});//end GET database

app.post('/api/getItems', express.json(), function (req, res) {
	//if(!req.session.user){
	//	res.send({});
	//} else {
		var query = {};
		if (req.body.type) { query['type'] = req.body.type; }
		if (req.body.forUID) { query['forUID'] = req.body.forUID; }
		if (req.body.forOwner) { query['forOwner'] = req.body.forOwner; }
		else { query = { $or:_(dbInfo.types).map(function(item){ return {'type':item.name}; }) }; }
		db.itemdb.find(query,function (err, docs) {
			if(err){ console.log('(error getting items) '+err); }else{ res.send(docs); }
		});
	//} //end auth check
});//end GET items

app.post('/api/getItemHistory', express.json(), function (req, res) {
	db.itemdb.find({type:'history', forUID:req.body.uid},function (err, docs) {
		if(err){ console.log('(error getting item history) '+err); }else{ 
			res.send(docs); 
		}
	});

});//end GET item history

app.post('/api/getItem', express.json(), function (req, res) {
	db.itemdb.findOne(req.body, function (err, doc) {
		if(err){ console.log('(error getting item) '+err); }else{ res.send(doc); }
	});
});//end 'GET' (single) item - send the uid and retrieve item (untested - send multiple uid's?)

app.post('/api/saveItem', express.json({limit: '50mb'}), function (req, res) {
	if(!req.session.user){
		res.send({});
	} else {
		var syncItemPromise;
		if (req.body.item.uid) {
			db.itemdb.find({uid:req.body.item.uid}, function (err, check) {
				if (!check.length||check[0].uid!==req.body.item.uid) {
					return res.send(500);
				}
				//it is there

				syncItemPromise=updateItem(req.body.item, check[0], req.body.unlock);
				q.when(syncItemPromise).then(function(){
					res.send(200);
				}); 
			});
		} else {
			//brand new item!!!
			syncItemPromise=newItem(req.body.item);
			q.when(syncItemPromise).then(function(){
				res.send(200);
			}); 
			
		}
	}
});//end SAVE single item

app.post('/api/pushToItem', express.json({limit: '50mb'}), function (req, res) {
	if(!req.session.user){
		res.send({});
	} else {
		var syncItemPromise;
		if (req.body.uid) {
			db.itemdb.find({uid:req.body.uid}, function (err, check) {
				if (!check.length||check[0].uid!==req.body.uid) {
					return res.send(500);
				}
				//it is there
				var extendedItem = __.cloneDeep(check[0]);
				_.extend(extendedItem,req.body);

				syncItemPromise=updateItem(extendedItem, check[0]);
				q.when(syncItemPromise).then(function(){
					res.send(200);
				}); 
			});
		} else { res.send(500); }
	}
});//end PUSH single item


app.post('/api/stageItemChanges', express.json(), function (req, res) {
	var newItem=req.body;
	if (newItem.uid) {
		db.itemdb.find({uid:newItem.uid}, function (err, check) {
			if (!check.length||check[0].uid!==newItem.uid) {
				return res.send(500);
			}
			//it is there
			var originalItem=check[0];
			var proposer = newItem.proposedBy;
			if(proposer){
				newKey=generateKey();
				delete newItem.proposedBy;

				var stagedChanges=[];

				//save image if one
				if (originalItem.imageURL!==newItem.imageURL){
					console.log('saving new item image')
					var mediaUID = generateUID();
					saveImage(newItem.imageURL,mediaUID);
					newItem.image = 'media/images/'+mediaUID+'/image.jpg';
					newItem.thumb = 'media/images/'+mediaUID+'/thumb.jpg';
				}
				
				var changeNumber = 0;
				for (key in newItem){
					if (JSON.stringify(newItem[key])!==JSON.stringify(originalItem[key])){
						//console.log('difference in '+key+' is '+JSON.stringify(scope.changed[key])+' -- original:'+JSON.stringify(scope.original[key]));
						if((key!=='lockChangedBy')&&(key!=='lockChangedAt')&&(key!=='edited')&&(key!=='editedBy')&&(key!=='image')&&(key!=='lock')&&(key!=='imageURL')&&(key!=='owners')) {
							var aChange = {};
							aChange['what']=key;
							aChange['value']=newItem[key];
							aChange['decision']='';
							if (key==='thumb'){
								aChange['image']=newItem['image'];
								aChange['imageURL']=newItem['imageURL'];
							}
							stagedChanges[changeNumber]=aChange;
							changeNumber++;
						}
					}
				}

				var promises=[];
				if (stagedChanges.length!==0){
					//insert change for every owner to approve
					_.each(originalItem.owners, function(owner) { 
						var insertFinished=q.defer();
						promises.push(insertFinished.promise);
						db.itemdb.insert({type:'staged', forUID:newItem.uid, key:newKey, proposed:moment().format(), proposedBy:proposer, forOwner:owner, changes:stagedChanges}, function (err, doc) {
							if(err){ 
								console.log('(error staging item changes) '+err);
								insertFinished.reject();
							}else{ 
								originalItem.proposedChanges=true;
								insertFinished.resolve();
							}
						});
					});//end map

					q.all(promises).then(function(){
						db.itemdb.update({uid: newItem.uid}, {$set:{proposedChanges:true}}, function (err, doc2) {
							if(err){ 
								console.log('(error setting staged changes flag on item) '+err); 
							} else {
								//success
								res.send(200);
								io.emit('proposedChange',newItem.uid);
							}
						});
					}, function(error) { res.send('one of the promises fucked up'); });
					
				} else {
					//no mods
				}

			} else {
				//fail - no proposedBy
			}
		});
	} else { 
		//no item found matching that uid
	}
});//end 'STAGE' changes

app.post('/api/decision', express.json(), function (req, res){
	if(!req.session.user){
		res.send({});
	} else {
		var syncItemPromise;
		db.itemdb.find({key:req.body.key, forOwner:req.body.email}, function (err, check) {
			if (!check.length||check[0].key!==req.body.key) {
				return res.send(500);
			}
			//it is there
			syncItemPromise=changeDecision(check[0], req.body.email, req.body.field, req.body.decision);
			q.when(syncItemPromise).then(function(){

				//check if all decisions are made
				db.itemdb.find({key:req.body.key}, function (err, check2) {
					var done = true;
					var allDec = check2[0].changes;
					for (k in allDec) {
						if (allDec[k].decision==='') { done=false; }
					}

					if (done) {
						console.log('all changes are complete');
						req.body.item.proposedChanges=false;
					} else {
						console.log('more changes...');
					}
					//update item
					db.itemdb.find({uid:req.body.item.uid}, function (err, check1) {
						if (!check1.length||check1[0].uid!==req.body.item.uid) {
							return res.send(500);
						}
						//it is there
						syncItemPromise=updateItem(req.body.item, check1[0], true);
						q.when(syncItemPromise).then(function(){
							res.send(200);
						});
					});
				}); 	
			}); 
		});
	}
});


app.post('/api/deleteItem', express.json(), function (req, res){
	if(!req.session.user){
		res.send({});
	} else {
		var syncItemPromise;
		req.body.oldType = req.body.type;
		req.body.type = 'deleted';
		db.itemdb.find({uid:req.body.uid}, function (err, check) {
			if (!check.length||check[0].uid!==req.body.uid) {
				return res.send(500);
			}
			//it is there
			syncItemPromise=updateItem(req.body, check[0]);
			q.when(syncItemPromise).then(function(){
				res.send(200);
			}); 
		});
	}

});//end DELETE item

app.post('/api/saveProposal', express.json(), function (req, res) {
	if(!req.session.user){
		res.send({});
	} else {
		req.body.uid=generateUID();
		proposalSecrets[req.body.uid]=[];
		//put in the members
		_(members).each(function(member){ 
			req.body[member.name]={};
			req.body[member.name].who = member.name;
			var key = generateUID();
			if (member.email){
			
				console.log('trying to send email to ' + member.email);
				smtpTrans.sendMail({
				    from: 'Robot <colabrobot@gmail.com>',
				    to: member.email,
				    subject: 'new project proposal for colab',
				    text: 'text body',
				    html: "<p>Human,</p><p>A new proposal has been created. Please follow the link below to review everything, and fill in your decision and/or comments. The link was generated specifically for you so don't share. Please reply to me if you have any questions. I am a robot. Thank you.</p><p><a href='http://colablife.info/#/proposal/"+req.body.uid+"/"+key+"'>click here to view proposal</a>"
				}, function (err, doc){
				    if(err){ console.log(err); }else{ 
				    	//email was sent!
				    	proposalSecrets[req.body.uid].push({name:member.name,key:key});
				    	console.log('Message sent: ' + doc.response); 
				    }
				});

			}

		});

		db.itemdb.insert(req.body, function (err, doc) { 
		if(err){ 
			console.log('(error saving proposal) '+err);
		}else{ 
			console.log('proposal: ' + doc.uid);
			io.emit('newProposal', doc.uid); 
			res.send(doc.uid);
		} 
	});
	}
});//end SAVE proposal

app.post('/api/checkResultee', express.json(), function (req, res){
	//req.body.uid
	//req.body.key
	var name = '';
	_(proposalSecrets[req.body.uid]).each(function(match){
		if (match.key===req.body.key) { name = match.name; }
	});

	if (name!=='') {
		res.send(name);
	} else { 
		res.send(false); 
	}
});

app.post('/api/requestLock', express.json(), function (req, res){
	if(!req.session.user){
		res.send({});
	} else {
		var syncLockPromise;
		db.itemdb.findOne({uid:req.body.uid}, function (err, item){
			if(err||!item){ console.log('(error requesting lock on item) '+err); }
			else { 
				if (item.lock){
					//already has a lock
					console.log('we are here....')
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
	}
});//end request lock item

app.post('/api/removeLock', express.json(), function (req, res){
	if(!req.session.user){
		res.send({});
	} else {
		var syncLockPromise;
		if (req.body.uid) {
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
		}
	}
});//end remove lock item

app.post('/api/pickLock', express.json(), function (req, res){
	if(!req.session.user){
		res.send({});
	} else {
		var syncLockPromise;
		console.log('breaking lock for item: '+req.body.uid)
		db.itemdb.findOne({uid:req.body.uid}, function (err, item){
			if(err||!item){ console.log('(error removing lock on item) '+err); }
			else { 
				if(_.contains(item.owners, req.body.email)){
					syncLockPromise = changeLock(item,req.body.email, false);
					q.when(syncLockPromise).then(function(){
						res.send(item);
					});
				} else { 
					//send the owner an email 
				}
			}
		});
	}
});//end break lock item

//needs in post:  {uid:uidofitem, email:usermakingedit, value:1or-1or0}
app.post('/api/setPriority', express.json(), function (req, res){
	if(!req.session.user){
		res.send({});
	} else {
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
				 			io.emit('priorityChange', doc);
				 			res.send(doc); 
				 		}
				 	});
				}
			}
		});
	}
});

app.post('/api/addComment', express.json(), function (req, res) {
	if(!req.session.user){
		res.send({});
	} else {
		db.itemdb.findOne({uid:req.body.uid}, function (err, item){
			if(err){ console.log('(error finding item) '+err); }
			else { 
				if(!item.comments) { item.comments = []; }
				var timeTime = moment().format();
				item.comments.push({words:req.body.comment, by:req.body.email, time:timeTime});

				var pushValue = {};
				pushValue.$set = {};
				pushValue.$set['comments'] = item.comments; 
				db.itemdb.update({uid: req.body.uid}, pushValue, function (err, doc) {
					if(err){ console.log('(error updating comments) '+err); }else{ 
						io.emit('comment', item);
						res.send(doc); 
					}
				});
			}
		});
	}
});//end add comment



//ITEMS --------------------------------
function updateItem(newItem, oldItem, unlock){
	//returns a promise
	var saveItemPromise = q.defer();
	var syncImagePromise;
	var syncMediaImagePromise;

	//the image for the item (not media)
	if (oldItem.imageURL!==newItem.imageURL){
		console.log('saving new item image')
		var mediaUID = generateUID();
		syncImagePromise = saveImage(newItem.imageURL,mediaUID);
		newItem.image = 'media/images/'+mediaUID+'/image.jpg';
		newItem.thumb = 'media/images/'+mediaUID+'/thumb.jpg';
	}

	//item media
	if (!_.isEqual(oldItem.media,newItem.media)){
		//new media of some kind
		var newMediaImage = _.find(newItem.media, function(check){ return _.has(check,'rawImage');});
		if (newMediaImage) {
			//new image added
			console.log('saving new media image')
			var mediaImageUID=generateUID();
			
			syncMediaImagePromise = saveMediaImage(newMediaImage.rawImage, mediaImageUID);
			_.each(newItem.media, function (data,index){
				//find the index and replace with new data
				if (_.has(data,'rawImage')) {
					
					delete newItem.media[index].rawImage;
					newItem.media[index].image = 'media/images/'+mediaImageUID+'/image.jpg';
					newItem.media[index].thumb = 'media/images/'+mediaImageUID+'/thumb.jpg';
				}
			});
		}
	}

	//attachment comparasion
	if (!_.isEqual(oldItem.attachments,newItem.attachments)){
		var removeLoopUids = _.difference(oldItem.attachments, newItem.attachments);
		var addLoopUids = _.difference(newItem.attachments, oldItem.attachments);

		console.log('remove: '+JSON.stringify(removeLoopUids)+'   add:       '+JSON.stringify(addLoopUids));

		_.each(removeLoopUids, function(uid){
			findItem(uid).then(function(item){
				var itemCopy = __.cloneDeep(item);
				itemCopy.parents = _(itemCopy.parents).without(newItem.uid);
				updateItem(itemCopy,item);
			});
		});

		_.each(addLoopUids, function(uid){
			findItem(uid).then(function(item){
				var itemCopy = __.cloneDeep(item);
				itemCopy.parents = itemCopy.parents || [];
				itemCopy.parents.push(newItem.uid);
				updateItem(itemCopy,item);
			});
		});
	}

	//event comparasion
	if (!_.isEqual(oldItem.events,newItem.events)){
		var removeLoopUids = _.difference(oldItem.events, newItem.events);
		var addLoopUids = _.difference(newItem.events, oldItem.events);

		console.log('remove: '+JSON.stringify(removeLoopUids)+'   add:       '+JSON.stringify(addLoopUids));

		_.each(removeLoopUids, function(uid){
			findItem(uid).then(function(item){
				var itemCopy = __.cloneDeep(item);
				itemCopy.parents = _(itemCopy.parents).without(newItem.uid);
				updateItem(itemCopy,item);
			});
		});

		_.each(addLoopUids, function(uid){
			findItem(uid).then(function(item){
				var itemCopy = __.cloneDeep(item);
				itemCopy.parents = itemCopy.parents || [];
				itemCopy.parents.push(newItem.uid);
				updateItem(itemCopy,item);
			});
		});
	}

	var historyItem;
	historyItem=oldItem;
	historyItem.uid=generateUID();
	historyItem.historical=true;
	historyItem.proposedChanges=false;
	//update and store history
	db.itemdb.insert({type:'history', forUID:newItem.uid, historyItem:historyItem }, function (err, doc) {});

	newItem.edited=moment().format();
	if (unlock) { newItem.lock=false; }
	delete newItem._id;
	//check to see if new image was sent
	
	db.itemdb.update({uid: newItem.uid}, newItem, function (err, doc) {
		if(err){ 
			console.log('(error updating item) '+err); 
			saveItemPromise.reject(); 
		}else{ 
			q.when(syncImagePromise).then(function(){
				q.when(syncMediaImagePromise).then(function(){
					saveItemPromise.resolve();
					console.log('sending new update io.emit');
					io.emit('update', newItem);
				});
			}); 
		}
	});


	return saveItemPromise.promise;
}

function newItem(newItem){
	//returns a promise
	var saveItemPromise = q.defer();
	var syncImagePromise;

	newItem.uid=generateUID();
	newItem.totalPriority=0;

	newItem.created=moment().format();
	newItem.edited='never';
	//set owner as creator if not specified
	if (!newItem.owners) { newItem.owners =[]; newItem.owners.push(newItem.createdBy); }

	if (newItem.imageURL) {
		//image url provided
		var mediaUID = generateUID();
		syncImagePromise = saveImage(newItem.imageURL,mediaUID);
		newItem.image = 'media/images/'+mediaUID+'/image.jpg';
		newItem.thumb = 'media/images/'+mediaUID+'/thumb.jpg';
	}else{
		//no image, use default
		newItem.image = defaultImage;
		newItem.thumb = defaultImage;
	}
	db.itemdb.insert(newItem, function (err, doc) { 
		if(err){ 
			console.log('(error saving item) '+err);
			saveItemPromise.reject(); 
		}else{ 
			q.when(syncImagePromise).then(function(){
				saveItemPromise.resolve();
				console.log('item: ' + doc.uid);
			    io.emit('new', doc);
			}); 
		} 
	});

	return saveItemPromise.promise;
}

//IMAGES --------------------------------
//takes a where (url), a uid to use, and who (opt - used for user added)
function saveImage(where,theUID,who) {
	//returns a promise
	var saveImagePromise = q.defer();
	request.get({url: url.parse(where), encoding: 'binary'}, function (err, response, body) {
		console.log('trying to save image uid: '+theUID);
		var path = '/vagrant/www/media/images/'+theUID+'/';
		fs.mkdir(path, function(err){
			if (err) {
				console.log('error saving image: '+err); 
	    		saveImagePromise.reject();
			} else {
				fs.writeFile(path+"image.jpg", body, 'binary', function(err) {
			    	if(err) { 
			    		console.log('error saving image: '+err); 
			    		saveImagePromise.reject();
			    	}else{ 
			    		//save image thumbnail
			    		
			    		console.log("the image was saved!"); 
			    		gm(path+'image.jpg').resize('60','60').gravity('center').write(path+'thumb.jpg', function(err) {
			    			if(err) { 
			    				console.log('error saving thumb: '+err); 
			    				saveImagePromise.reject();
			    			}else{ 
			    				//successful image save chain:
			    				saveImagePromise.resolve();
			    				console.log("the image thumb was saved!"); 
			    			}
			    		});//end save image thumb
			    	}//end save image
		    	});
			}
		});
	});

	return saveImagePromise.promise;
}//end SAVE image

function saveMediaImage(rawImage, uid) {
	var saveMediaImagePromise = q.defer();
	var matches = rawImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    var image = {};
    var path = '/vagrant/www/media/images/'+uid+'/';
    fs.mkdir(path, function(err){
		if (err) {
			console.log('error saving image: '+err); 
    		saveMediaImagePromise.reject();
		} else {
			//file path successful
			if (matches.length !== 3) {
				saveMediaImagePromise.reject();
			} else {
				//success - data in buffer
				image.type = matches[1];
				image.data = new Buffer(matches[2], 'base64');

				fs.writeFile(path+'image.jpg', image.data, function(err) { 
					if(err) { 
			    		console.log('error saving media image: '+err); 
			    		saveMediaImagePromise.reject();
			    	}else{ 
			    		//save media image thumbnail
			    		console.log("the f'n image was saved!"); 
			    		gm(path+'image.jpg').resize('300','300').gravity('center').write(path+'thumb.jpg', function(err) {
			    			if(err) { 
			    				console.log('error saving media thumb: '+err); 
			    				saveMediaImagePromise.reject();
			    			}else{ 
			    				//successful image save chain:
			    				saveMediaImagePromise.resolve();
			    				console.log("the image thumb was saved!"); 
			    			}
			    		});//end save image thumb
			    	}//end save image
				});
			}
		}
	});

	return saveMediaImagePromise.promise;
}

//LOCKS --------------------------------
function changeLock(item,who,value){
	var changeLockPromise = q.defer();
	var time = moment().format();
	item.lock=value;
	item.lockChangedBy=who;
	item.lockChangedAt=time;

	db.itemdb.update({uid: item.uid}, {$set:{lock:value, lockChangedBy:who, lockChangedAt:time}}, function (err, doc) {
		if(err){ 
			console.log('(error changing lock on item) '+err); 
			changeLockPromise.reject();
		} else {
			//success
			io.emit('lockChange',item);
			changeLockPromise.resolve();
		}
	});

	return changeLockPromise.promise;
}

function changeDecision(staged, who, what, value){
	var changeDecisionPromise = q.defer();
	var time = moment().format();

	_.find(staged.changes, function(change, i){
		if (change['what']===what){ staged.changes[i].decision=value; }
	});

	db.itemdb.update({key: staged.key}, {$set:{changes:staged.changes}}, function (err, doc) {
		if(err){ 
			console.log('(error changing decisions on item) '+err); 
			changeDecisionPromise.reject();
		} else {
			//success
			io.emit('decisionChange',staged);
			changeDecisionPromise.resolve();
		}
	});

	return changeDecisionPromise.promise;
} 

function findItem(uid){
	var p=q.defer();
	db.itemdb.findOne({uid:uid}, function (err, doc) {
		if(err){ console.log('(error getting item) '+err); p.reject(err); }else{ p.resolve(doc); }
	});
	return p.promise;
}

	

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

function generateUID() {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });
}

function generateKey() {
  return 'xxxxxxxxxxxx-4xxxyxxxxxx99xx-xxxxx00xxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });
}

http.listen(80);
