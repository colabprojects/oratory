var globalState = require("../server"),
    app = globalState.app, 
    express = globalState.express,
    db = globalState.db;

/**
  * @desc various dependencies 
*/
var q = require('q');
var _ = require('underscore');
var __ = require('lodash');

var dbInfo = require("../database/dbInfo");
var dbHelper = require("../database/utils");
__.assign(root, dbHelper);


/**
  * @api - request lock
  * @desc Items are locked when someone is editing - this function asks if a lock is available or not. if the item is not currently
  * locked, changeLock() is called. SOmething is broken with this, but it mostly works - I like this method, but a more granular 
  * approach to locking would be better - like only lock the pieces that are being edited, not the whole thing
  * @param object - lock object (uid for lock, email of user)
  * @return object - the locked item
*/
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
});

/**
  * @api - remove lock
  * @desc disables the lock on an item
  * @param object - lock object (uid, email)
  * @return object - the item
*/
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
});

/**
  * @api - pick lock
  * @desc this only exists because something about the lock functionality is broken... :)
  * @param object - lock object (uid, email)
  * @return object - the item
*/
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
});

