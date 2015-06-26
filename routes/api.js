var express = require('express');
var router = express.Router();
var db = require('../tools/db_tool.js');

router.use('/auth/', require('./auth.js'));

router.use(function(req, res, next){
  var authZ = req.headers.authorization || req.headers.authorization;
  if(!authZ){
    return res.send({Success:false, Error:"No valid Auth token"});
  }
  db.get_user({confirm: authZ, active:true}, function(err, result){
    if(err){
      return res.send({Success: false, Error: err});
    }
    if(!result){
      return res.send({Success: false, Error: "Invalid Auth!"});
    }
    next();
  });
});

router.use('/users/', require('./users.js'));
router.use('/parts/', require('./parts.js'));
router.use('/stacks/', require('./stacks.js'));


module.exports=router;
