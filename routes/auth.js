var express = require('express');
var uuid = require('node-uuid');
var nodemailer = require('nodemailer');
var sesTransport = require('nodemailer-ses-transport');
var transporter = nodemailer.createTransport(sesTransport())
var crypto = require('crypto');
var mongo = require('mongoskin');
var db = mongo.db('mongodb://localhost:27017/cloudseed');
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
  var oid = mongo.helper.toObjectID(id)
  db.collection('users').find({_id: oid}, {email:1, _id:1}).toArray(function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error:err});
    }
    var userinfo = results[0];
    return res.send({Success: true, user: userinfo});
  });
});

router.post('/api/login', function(req, res){
  var b = req.body;
  var shasum = crypto.createHash('sha256');
  db.collection('users').find({email: b.email.toLowerCase(), active:true}).toArray(function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
    if(results.length < 1){
      return res.send({Success: false, Error: 'No such user'});
    }
    var record = results[0];
    var passcheck = record.password;
    shasum.update(record.salt + b.password);
    var passhash = shasum.digest('hex');
    if(passcheck === passhash){
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
  db.collection('users').insert({email: b.email.toLowerCase(), password: passhash, salt: salt, accesskey: b.accesskey, secretkey: b.secretkey, active:false, confirm:emailconfirm}, function(err, results){
    if(err){
      if(err.err.indexOf('duplicate') >= 0){
        return res.send({Success: false, Error: "User with that email already exists!"})
      }
      return res.send({Success: false, Error: err});
    } else{
      var record = results[0];
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
  db.collection('users').update({confirm:signature}, {$set:{active:true}}, function(err, data){
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
