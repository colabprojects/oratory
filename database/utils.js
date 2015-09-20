var fs = require('fs');
var r = require('rethinkdb');
var request = require('request');
var q = require('q');
var url = require('url');
var _ = require('underscore');
var __ = require('lodash');
var moment = require('moment');
var gm = require('gm').subClass({ imageMagick: true });

var globalState = require("../server"),
    io = globalState.io;

/**
  * @desc creates the images directory if it does not exist
*/
if (!fs.existsSync('/vagrant/www/media/images')) {
	fs.mkdir('/vagrant/www/media/images/');
}

//default item image:
var defaultImage = 'images/default.jpg';

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

module.exports = {
    respondCursor : function(res, cursor) {
        cursor.toArray(function(err, docs) {
            res.send(docs);
        });
    },
    //ITEMS --------------------------------
    updateItem : function(db, newItem, oldItem, unlock){
        //returns a promise
        var saveItemPromise = q.defer();
        var syncImagePromise;
        var syncMediaImagePromise;

        //the image for the item (not media)
        if (oldItem.imageURL!==newItem.imageURL){
            console.log('saving new item image')
                var mediaUID = generateUID();
            syncImagePromise = saveImage(db, newItem.imageURL,mediaUID);
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

                syncMediaImagePromise = saveMediaImage(db, newMediaImage.rawImage, mediaImageUID);
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
                findItem(db, uid).then(function(item){
                    var itemCopy = __.cloneDeep(item);
                    itemCopy.parents = _(itemCopy.parents).without(newItem.uid);
                    updateItem(db, itemCopy,item);
                });
            });

            _.each(addLoopUids, function(uid){
                findItem(db, uid).then(function(item){
                    var itemCopy = __.cloneDeep(item);
                    itemCopy.parents = itemCopy.parents || [];
                    itemCopy.parents.push(newItem.uid);
                    updateItem(db, itemCopy,item);
                });
            });
        }

        //event comparasion
        if (!_.isEqual(oldItem.events,newItem.events)){
            var removeLoopUids = _.difference(oldItem.events, newItem.events);
            var addLoopUids = _.difference(newItem.events, oldItem.events);

            console.log('remove: '+JSON.stringify(removeLoopUids)+'   add:       '+JSON.stringify(addLoopUids));

            _.each(removeLoopUids, function(uid){
                findItem(db, uid).then(function(item){
                    var itemCopy = __.cloneDeep(item);
                    itemCopy.parents = _(itemCopy.parents).without(newItem.uid);
                    updateItem(db, itemCopy,item);
                });
            });

            _.each(addLoopUids, function(uid){
                findItem(db, uid).then(function(item){
                    var itemCopy = __.cloneDeep(item);
                    itemCopy.parents = itemCopy.parents || [];
                    itemCopy.parents.push(newItem.uid);
                    updateItem(db, itemCopy,item);
                });
            });
        }

        var historyItem;
        historyItem=oldItem;
        historyItem.uid=generateUID();
        historyItem.historical=true;
        historyItem.proposedChanges=false;
        
        console.log("updating history");
        //update and store history
        r.table("history").insert({
            type:'history', 
            forUID:newItem.uid, 
            historyItem:historyItem 
        }).run(db, function (err, doc) {});

        newItem.edited=moment().format();
        if (unlock) { newItem.lock=false; }
        delete newItem._id;
        //check to see if new image was sent

        console.log("updating item");
        r.table("items").get(newItem.uid).update(newItem).run(db, function (err, doc) {
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
    },

    newItem : function(db, newItem){
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
            syncImagePromise = saveImage(db, newItem.imageURL,mediaUID);
            newItem.image = 'media/images/'+mediaUID+'/image.jpg';
            newItem.thumb = 'media/images/'+mediaUID+'/thumb.jpg';
        }else{
            //no image, use default
            newItem.image = defaultImage;
            newItem.thumb = defaultImage;
        }
        r.table("items").insert(newItem).run(db, function (err, doc) { 
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
    },

    //IMAGES --------------------------------
    //takes a where (url), a uid to use, and who (opt - used for user added)
    saveImage : function(db, where,theUID,who) {
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
    },

    saveMediaImage : function(db, rawImage, uid) {
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
    },

    //LOCKS --------------------------------
    changeLock : function(db,item,who,value){
        var changeLockPromise = q.defer();
        var time = moment().format();
        item.lock=value;
        item.lockChangedBy=who;
        item.lockChangedAt=time;

        r.table("items").get(item.uid).update({
            lock:value, 
            lockChangedBy:who, 
            lockChangedAt:time
        }).run(db, function (err, doc) {
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
    },

    changeDecision : function(db, staged, who, what, value){
        var changeDecisionPromise = q.defer();
        var time = moment().format();

        _.find(staged.changes, function(change, i){
            if (change['what']===what){ staged.changes[i].decision=value; }
        });

        // TODO: is this actually correct?
        r.table("items").find({key: staged.key}).update({changes:staged.changes})
            .run(db, function (err, doc) {
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
    } ,

    findItem : function(db, uid){
        var p=q.defer();
        r.table("items").get(uid).run(db, function (err, doc) {
            if(err){ console.log('(error getting item) '+err); p.reject(err); }else{ p.resolve(doc); }
        });
        return p.promise;
    },

    generateUID : generateUID,

    generateKey : generateKey,
}
