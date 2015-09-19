var globalState = require("../server"),
    app = globalState.app, 
    express = globalState.express,
    io = globalState.io;

/**
  * @desc various dependencies 
*/
var r = require('rethinkdb');
var __ = require('lodash');

var dbInfo = require("../database/dbInfo");
var dbHelper = require("../database/utils");

/**
  * @api - proposal result
  * @desc updates a "member's" proposal decision and runs a check for total approval for item (depends stuff created by "saveProposal")
  * @param object - results (proposal uid, who, result, member key)
  * @return int - 200 (ok) or 500 (error...)
*/
app.post('/api/proposalResult', express.json(), function (req, res) {
	console.log('secrets: '+JSON.stringify(proposalSecrets));
	var syncItemPromise;
	if (req.body.uid) {
		var theOne;
		_(proposalSecrets[req.body.uid]).each(function(member){
			if (member.name===req.body.who) {
				theOne = member;
			}
		});
		if(theOne.key===req.body.key) {
            r.table("items").get(req.body.uid).run(req.db, function (err, check) {
				if (check.uid!==req.body.uid) {
					return res.send(500);
				}
				//it is there
				var pushStuff = {};
				pushStuff.uid=req.body.uid;
				pushStuff[req.body.who]=req.body[req.body.who];

				var extendedItem = __.cloneDeep(check);
				_.extend(extendedItem,pushStuff);

				syncItemPromise=dbUtils.updateItem(req.db, extendedItem, check);
				q.when(syncItemPromise).then(function(){
					//check if the project has been approved by everyone
					var approved = true;
					_(members).each(function(member){
						if(extendedItem[member.name].what !== "approve"){ approved = false; }
					});
					console.log("approval is currently: "+approved);
					if (approved){ 
						//update the item
                        r.table("items").get(extendedItem.forUID).run(req.db,function (err, check2){
							if(err){ console.log('(error getting item) '+err); }else{ 
								//clone and add approval
								var approvalItem = __.cloneDeep(check2);
								_.extend(approvalItem,{approval:true});
								console.log('approval item: '+approvalItem);
								dbUtils.updateItem(req.db, approvalItem, check2);
							}
						});
					}
					res.send(200);
				}); 
			});
		} else { res.send(500); }
	} else { res.send(500); }
});

/**
  * @api - save proposal
  * @desc creates a proposal object and stores some unique keys on the server for specific "links" send to each member 
  * for voting/commenting (requires server variable "members")
  * @param object - the proposal 
  * @return string - uid
*/
app.post('/api/saveProposal', express.json(), function (req, res) {
	if(!req.session.user){
		res.send({});
	} else {
		req.body.uid = dbUtils.generateUID();
		proposalSecrets[req.body.uid]=[];
		var keys={};

		//put in the members
		_(members).each(function(member){ 
			req.body[member.name]={};
			req.body[member.name].who = member.name;
			keys[member.name] = dbUtils.generateUID();
		});

		r.table("items").insert(req.body)
            .run(req.db, function (err, doc) { 
		    if(err){ 
		    	console.log('(error saving proposal) '+err);
		    }else{ 
		    	console.log('proposal: ' + doc.uid);
		    	io.emit('newProposal', doc.uid); 

		    	//email all members
		    	_(members).each(function(member){
		    		if (member.email){
		    			var key = keys[member.name];
		    		
		    			console.log('trying to send email to ' + member.email);
		    			smtpTrans.sendMail({
		    			    from: 'Robot <colabrobot@gmail.com>',
		    			    to: member.email,
		    			    subject: 'new project proposal for colab',
		    			    text: 'text body',
		    			    html: "<p>Human,</p><p>A new proposal has been created. Please follow the link below to review everything, and fill in your decision and/or comments. The link was generated specifically for you so don't share. Please reply to me if you have any questions. I am a robot. Thank you.</p><p><a href='http://colablife.info/#/proposal/"+req.body.uid+"/"+key+"'>"+member.name+"'s response</a>"
		    			}, function (err, doc){
		    			    if(err){ console.log(err); }else{ 
		    			    	//email was sent!
		    			    	proposalSecrets[req.body.uid].push({name:member.name,key:key});
		    			    	console.log('Message sent: ' + doc.response); 
		    			    }
		    			});

		    		}
		    	});

		    	res.send(doc.uid);
		    } 
	    });
	}
});

/**
  * @api - check resultee
  * @desc used when a "member" follows link send via email for a proposal. Checks to see which "member" should be able to edit
  * @param object - results (proposal uid, who, result, member key)
  * @return string (ish) - either someone or false
*/
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


