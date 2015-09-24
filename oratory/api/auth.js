var global = require("../server"),
    app = global.app, 
    express = global.express;
var users = require('../users');


/**
  * @api - authentication
  * @desc creates the "session" that allows users to make edits - should definitely be changed
  * @param string email
  		   string token
  		   string useSpecial 
  * @return bool - success or failure
*/
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
});


/**
  * @api - auth gen
  * @desc generates and emails an authentication key to the email that was provided (returning http status codes - should be changed)
  * @param string email
  * @return int - 200 (ok) or 500 (error...)
*/
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
});
