var express = require('express');
var db = require('mongoskin').db('mongodb://localhost:27017/cloudseed');
var router = express.Router();

router.get('/api/test', function(req, res){
  db.collection('testing').find({},{"_id":false}).toArray(function(err, results){
    if(err){
      throw err;
    }
    console.log(results);
    return res.send(results);
  });
});

router.get('/api/parts', function(req, res){
  db.collection('parts').find({Subpart:false},{"_id":false}).toArray(function(err, results){
    if(err){
      throw err;
    }
    // console.log(results);
    return res.send(results);
  });
});

router.get('/api/parts/:type', function(req, res){
  db.collection('parts').find({"Type":req.params.type},{"_id":false}).toArray(function(err, results){
    if(err){
      throw err;
    }
  //  console.log(results);
    return res.send(results);
  });
});

module.exports = router;
