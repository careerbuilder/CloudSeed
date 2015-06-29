var express = require('express');
var db = require('../tools/db_tool.js');
var router = express.Router();

router.get('/:confirm', function(req,res){
  var id = req.params.confirm;
  db.get_user({confirm: id}, function(err, results){
    if(err){
     return res.send({Success: false, Error:err});
   }
   var userinfo = {
     email: results.email,
     confirm: results.confirm
   };
   return res.send({Success: true, user: userinfo});
  });
});

router.get('/confirm/:userconfirm', function(req,res){
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
