var express = require('express');
var db = require('mongoskin').db('mongodb://localhost:27017/cloudseed');
var router = express.Router();

router.get('/api/stacks', function(req, res){
  db.collection('stacks').find({},{"_id":false}).toArray(function(err, results){
    if(err){
      throw err;
    }
    console.log(results);
    return res.send(results);
  });
});

router.get('/api/stacks/:name', function(req, res){
  db.collection('stacks').find({"Name":req.params.name},{"_id":false}).toArray(function(err, results){
    if(err){
      console.log(err)
      return res.send({Success: true, Error:err})
    }
    console.log(results);
    return res.send(results);
  });
});

router.post('/api/stacks', function(req, res){
  db.collection('stacks').insert(req.body['Stack'], function(err, result){
    if(err){
      console.log(err)
      return res.send({Success: true, Error:err})
    }
    else{
      console.log("Added stack");
      return res.send({Success: true, Message: "Added Successfully"})
    }
  })
});

module.exports = router;
