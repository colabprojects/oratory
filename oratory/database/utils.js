var fs = require('fs');
var request = require('request');
var q = require('q');
var url = require('url');
var _ = require('underscore');
var __ = require('lodash');
var moment = require('moment');
var gm = require('gm').subClass({ imageMagick: true });

var globalState = require("../server"),
    db = globalState.db,
    io = globalState.io;

/**
  * @desc creates the images directory if it does not exist
*/
if (!fs.existsSync('/vagrant/www/media/images')) {
	fs.mkdir('/vagrant/www/media/images/');
}

//default item image:
var defaultImage = 'images/default.jpg';


module.exports = {
    //ITEMS --------------------------------
    updateItem : function(newItem, oldItem, unlock){
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
    },

    newItem : function(newItem){
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
    },

    //IMAGES --------------------------------
    //takes a where (url), a uid to use, and who (opt - used for user added)
    saveImage : function(where,theUID,who) {
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

    saveMediaImage : function(rawImage, uid) {
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
    changeLock : function(item,who,value){
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
    },

    changeDecision : function(staged, who, what, value){
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
    } ,

    findItem : function(uid){
        var p=q.defer();
        db.itemdb.findOne({uid:uid}, function (err, doc) {
            if(err){ console.log('(error getting item) '+err); p.reject(err); }else{ p.resolve(doc); }
        });
        return p.promise;
    },

    generateUID : function() {
        return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    },

    generateKey : function() {
        return 'xxxxxxxxxxxx-4xxxyxxxxxx99xx-xxxxx00xxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    },
}
