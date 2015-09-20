var globalState = require("../server"),
    app = globalState.app, 
    express = globalState.express;

/**
  * @desc various dependencies 
*/
var q = require('q');
var r = require('rethinkdb');
var _ = require('underscore');
var __ = require('lodash');

var dbInfo = require("../database/dbInfo");
var dbUtils = require("../database/utils");

/* UTILS */
_.mixin({
  compactObject: function(o) {
    _.each(o, function(v, k) {
      if(!v) {
        delete o[k];
      }
    });
    return o;
  }
});
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}


/**
  * @api - get database
  * @desc grabs everything in the database (only used by humans to see the contents of the database)
  * @param none (GET)
  * @return object - full database
*/
app.get('/api/getDatabase', function (req, res) {
    r.map(
        r.table("items"),
        r.table("history"),
        function (items, history) { return {items: items, history: history}; }
    ).run(req.db, function(err, docs) {
        if(err){ console.log('(error getting database) '+err);}else { res.send(docs.toArray()); }
    });
});



/**
  * @api - get items (as in more than one)
  * @desc grabs the "items" in the database based on the criteria defined with the parameters - if nothing is provided, it returns all
  * items of with the "types" defined in the dbInfo object (authentication commented out) - used to generate lists of "projects" or "books", etc.
  * @param string type
             string forUID
             string forOwner 
  * @return object - array of "items"
*/
app.post('/api/getItems', express.json(), function (req, res) {
    var fields = _.compactObject(_.pick(req.body, 'type', 'forUID', 'forOwner'));

    if (isEmpty(fields)) {
        var keys = _(dbInfo.types).map(function(item){ 
                return item.name; 
        });
        r.table("items")
            .getAll('tool', 'resource', 'project', 'book', 'event', 'deleted', {index:"type"})
            .run(req.db, function (err, docs) {
                if(err){ console.log('(error getting items) '+err); }
                else{ dbUtils.respondCursor(res, docs) }
            });
    } else {
        r.table("items")
            .filter(fields)
            .run(req.db, function (err, docs) {
            if(err){ console.log('(error getting items) '+err); }else{ dbUtils.respondCursor(res, docs) }
        });
    }
    //query.run(req.db, function (err, docs) {
    //    if(err){ console.log('(error getting items) '+err); }else{ res.send(docs.toArray()); }
    //});
});


/**
  * @api - get item history
  * @desc pulls all of the history items for a specific UID
  * @param string uid
  * @return object - array of history objects
*/
app.post('/api/getItemHistory', express.json(), function (req, res) {
    r.table('history')
        .get_all(req.body.uid, index='forUID')
        .run(req.db, function (err, docs) {
            if(err){ console.log('(error getting item history) '+err); }
            else{ dbUtils.respondCursor(res, docs); }
    });

});

/**
  * @api - get ONE item
  * @desc used to get only one item - not sure if this is even needed
  * @param string uid
  * @return object - the item that you want
*/
app.post('/api/getItem', express.json(), function (req, res) {
    r.table('items')
        .get(req.body.uid)
        .run(req.db, 
            function (err, doc) {
                if(err){ console.log('(error getting item) '+err); }
                else{ res.send(doc); }
            })
});


/**
  * @api - save item
  * @desc this is a largly used function that does quite a bit.. this is called anytime there is a new item added or an existing item
  * is updated. Two functions, updateItem() and newItem(), do most of the work
  * @param object - item (all item information)
  * @return int - 200 (ok) or 500 (error...)
*/
app.post('/api/saveItem', express.json({limit: '50mb'}), function (req, res) {
    if(!req.session.user){
        res.send({});
    } else {
        var syncItemPromise;
        if (req.body.item.uid) {
            console.log("route1");
            r.table("items").get(req.body.item.uid)
                .run(req.db, function (err, check) {
                    if (check.uid!==req.body.item.uid) {
                        return res.send(500);
                    }
                    //it is there

                    syncItemPromise=dbUtils.updateItem(req.db, req.body.item, check, req.body.unlock);
                    q.when(syncItemPromise).then(function(){
                        res.send(200);
                }); 
            });
        } else {
            console.log("route2");
            //brand new item!!!
            syncItemPromise=dbUtils.newItem(req.db, req.body.item);
            q.when(syncItemPromise).then(function(){
                res.send(200);
            }); 
            
        }
    }
});

/**
  * @api - push to item
  * @desc provides the ability to make changes to specific pieces of an item
  * @param object - must contain item uid, everything else is optional and will be "diff"ed to find the changes that should be added
  * @return int - 200 (ok) or 500 (error...)
*/
app.post('/api/pushToItem', express.json({limit: '50mb'}), function (req, res) {
    if(!req.session.user){
        res.send({});
    } else {
        var syncItemPromise;
        if (req.body.uid) {
            r.table("items").get(req.body.item.uid)
                .run(req.db, function (err, check) {
                    if (check.uid!==req.body.uid) {
                        return res.send(500);
                    }
                    //it is there
                    var extendedItem = __.cloneDeep(check);
                    _.extend(extendedItem,req.body);

                    syncItemPromise=dbUtils.updateItem(req.db, extendedItem, check);
                    q.when(syncItemPromise).then(function(){
                        res.send(200);
                    }); 
                });
        } else { res.send(500); }
    }
});


/**
  * @api - decision
  * @desc accepts or rejects staged changes on an item that that users is an item owner
  * @param object - "decision object" (decision key, user, field, yes or no, the item)
  * @return int - 200 (ok) or 500 (error...)
*/
app.post('/api/decision', express.json(), function (req, res){
    if(!req.session.user){
        res.send({});
    } else {
        var syncItemPromise;
        req.db.itemdb.find({key:req.body.key, forOwner:req.body.email}, function (err, check) {
            if (check.key!==req.body.key) {
                return res.send(500);
            }
            //it is there
            syncItemPromise=dbUtils.changeDecision(req.db, check, req.body.email, req.body.field, req.body.decision);
            q.when(syncItemPromise).then(function(){

                //check if all decisions are made
                req.db.itemdb.find({key:req.body.key}, function (err, check2) {
                    var done = true;
                    var allDec = check2.changes;
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
                    r.table("items").get(req.body.item.uid)
                        .run(req.db, function (err, check1) {
                            if (check1.uid!==req.body.item.uid) {
                                return res.send(500);
                            }
                            //it is there
                            syncItemPromise=dbUtils.updateItem(req.db, req.body.item, check1, true);
                            q.when(syncItemPromise).then(function(){
                                res.send(200);
                            });
                    });
                });     
            }); 
        });
    }
});

/**
  * @api - delete item
  * @desc changes the type of an item to deleted
  * @param object - the item to be "deleted"
  * @return int - 200 (ok) or 500 (error...)
*/
app.post('/api/deleteItem', express.json(), function (req, res){
    if(!req.session.user){
        res.send({});
    } else {
        var syncItemPromise;
        req.body.oldType = req.body.type;
        req.body.type = 'deleted';
        r.table("items").get(req.body.item.uid)
            .run(req.db, function (err, check) {
                if (check.uid!==req.body.uid) {
                    return res.send(500);
                }
                //it is there
                syncItemPromise=dbUtils.updateItem(req.db, req.body, check);
                q.when(syncItemPromise).then(function(){
                    res.send(200);
                }); 
        });
    }

});

/**
  * @api - stage item changes
  * @desc this is called when a non-owner of an item makes a change. Creates an object of type "staged" and flags the original object
  * to indicate that a change was suggested by another user. This has a lot of problems with the design.. works, but not cool
  * @param object - item (all item information (new and old))
  * @return int - 200 (ok) or 500 (error...)
*/
app.post('/api/stageItemChanges', express.json(), function (req, res) {
    var newItem=req.body;
    if (newItem.uid) {
        r.table("items").get(newItem.uid)
            .run(req.db, function (err, check) {
                if (check.uid!==newItem.uid) {
                    return res.send(500);
                }
                //it is there
                var originalItem=check;
                var proposer = newItem.proposedBy;
                if(proposer){
                    newKey=dbUtils.generateKey();
                    delete newItem.proposedBy;

                    var stagedChanges=[];

                    //save image if one
                    if (originalItem.imageURL!==newItem.imageURL){
                        console.log('saving new item image')
                        var mediaUID = dbUtils.generateUID();
                        dbUtils.saveImage(newItem.imageURL,mediaUID);
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
                            r.table("history")
                                .insert({
                                    type:'staged', 
                                    forUID:newItem.uid, 
                                    key:newKey, 
                                    proposed:moment().format(), 
                                    proposedBy:proposer, 
                                    forOwner:owner, 
                                    changes:stagedChanges
                                })
                                .run(req.db, function (err, doc) {
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
                            r.table("items").get(newItem.uid)
                                .update({proposedChanges:true})
                                .run(req.db, function (err, doc2) {
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
});

/**
  * @api - set priority
  * @desc - sets item priority for a given email (reddit style upvoting) - either 1, -1 or 0 gets added to the priority for a
  * specific user - total priority is updated to reflect sum of each user priority
  * @param object - priority object ({uid:uidofitem, email:usermakingedit, value:1or-1or0})
  * @return int - the item
*/
app.post('/api/setPriority', express.json(), function (req, res){
    if(!req.session.user){
        res.send({});
    } else {
        var currentPriority;
        r.table("items").get(req.body.uid)
            .run(req.db, function (err, doc) {
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
                         req.db.itemdb.update({uid:req.body.uid}, {$set:{priority:newPriority, totalPriority:totalPriority}}, function (err,doc2){
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

/**
  * @api - add comment
  * @desc - pushes a comment to an item
  * @param object - comment object ({uid:item.uid,email:master.sharedData.email,comment:scope.comment})
  * @return int - the item
*/
app.post('/api/addComment', express.json(), function (req, res) {
    if(!req.session.user){
        res.send({});
    } else {
        r.table("items").get(reg.body.uid).update(
                r.row('comments').append({
                    words:req.body.comment, 
                    by:req.body.email, 
                    time:moment().format(),
                })
            ).run(req.db, function (err, item){
                if(err){ console.log('(error updating comments) '+err); }
                else{ 
                    io.emit('comment', item);
                    res.send(doc); 
                }
            });
    }
});//end add comment


