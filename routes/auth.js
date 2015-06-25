var express = require('express');
var uuid = require('node-uuid');
var nodemailer = require('nodemailer');
var sesTransport = require('nodemailer-ses-transport');
var transporter = nodemailer.createTransport(sesTransport())
var crypto = require('crypto');
var db_tools = require('../tools/db_tool.js');
var router = express.Router();

function rand(rlen){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/.+_*&^%%$#@!~";
    for( var i=0; i < rlen; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

router.get('/api/user/:userid', function(req,res){
  var id = req.params.userid;
  var oid = db_tools.to_object_id(id);
  db_tools.get_user({_id: oid}, function(err, results){
    if(err){
     return res.send({Success: false, Error:err});
   }
   console.log(results);
   var userinfo = {
     email: results.email,
     _id: results._id
   };
   return res.send({Success: true, user: userinfo});
  });
});

router.post('/api/login', function(req, res){
  var b = req.body;
  //var shasum = crypto.createHash('sha256');
  db.get_user({email: b.email.toLowerCase(), active:true}, function(err, result){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
    if(!result){
      return res.send({Success: false, Error: 'No such user'});
    }
    var passcheck = result.password;
    //shasum.update(result.salt + b.password);
    //var passhash = shasum.digest('hex');
    if(passcheck === b.password){
      return res.send({Success: true, user: {email: record.email, _id: record._id}});
    }
    else{
      return res.send({Success: false, Error: 'Invalid password'});
    }
  });
});

router.post('/api/register', function(req, res){
  var b = req.body;
  var shasum = crypto.createHash('sha256');
  var salt = rand(10);
  shasum.update(salt + b.password);
  var passhash = shasum.digest('hex');
  var emailconfirm = uuid.v4();
  db.put_user({email: b.email.toLowerCase(), password: passhash, salt: salt, accesskey: b.accesskey, secretkey: b.secretkey, active:false, confirm:emailconfirm}, function(err, results){
    if(err){
      if(err.err.indexOf('duplicate') >= 0){
        return res.send({Success: false, Error: "User with that email already exists!"})
      }
      return res.send({Success: false, Error: err});
    } else{
      var record = results;
      var plaintext = 'Your account is created, but cannot be accessed until you confirm your email by visiting this site: https://cloudseed.cbsitedb.net/api/confirm/'+emailconfirm;
      var html = "<h1>Welcome to Cloudseed!</h1><p>An account has been created for this email, but will not be active until the email is confirmed. If this was not you, please ignore this email. "+"Otherwise, activate the account here <a href='https://cloudseed.cbsitedb.net/api/confirm/"+emailconfirm+"'>https://cloudseed.cbsitedb.net/api/confirm/"+emailconfirm+"</a></p>";
      transporter.sendMail({
        from: 'CloudSeed@cbsitedb.net',
        to: record.email,
        subject: 'Please confirm your CloudSeed account',
        text: plaintext,
        html: html
      }, function(err, info){
        if(err){
          console.log(err);
          return res.send({Success:false, Error: err});
        }
        else{
          return res.send({Success: true});
        }
      });
    }
  });
});

router.get('/api/confirm/:userconfirm', function(req,res){
  var signature = req.params.userconfirm;
  db.update_user({confirm:signature}, {active:true}, function(err, data){
    if(err){
      console.log(err);
      return res.send({Success:false, Error: err});
    }
    else{
      return res.redirect('/');
    }
  });
});


module.exports = router;
