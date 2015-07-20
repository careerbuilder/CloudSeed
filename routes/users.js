var express = require('express');
var db = require('../tools/db_tool.js');
var router = express.Router();

router.get('/:id', function(req,res){
  var id = req.params.id;
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

module.exports = router;
