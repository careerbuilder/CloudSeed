var express = require('express');
var db = require('mongoskin').db('mongodb://localhost:27017/cloudseed');
var aws = require('aws-sdk');
var router = express.Router();

router.get('/api/awsvalues/:awstype', function(req, res){
  var ptype = req.params.awstype;
  var region = req.query.region;
  var ec2 = new aws.EC2({region:region});
  if(ptype==='AWS::EC2::AvailabilityZone::Name'){
    ec2.describeAvailabilityZones({}, function(err, data) {
      if (err){
        console.log(err, err.stack);
        return res.send({Success: false, Error: err, Values:[]});
      }
      else{
        var rval = []
        for(var i=0; i<data.AvailabilityZones.length; i++){
          rval.push(data.AvailabilityZones[i].ZoneName);
        }
        return res.send({Success:true, Values:rval});
      }
    });
  }
  else if(ptype==='AWS::EC2::Instance::Id'){
    ec2.describeInstances({}, function(err, data) {
      if (err){
        console.log(err, err.stack);
        return res.send({Success: false, Error: err, Values:[]});
      }
      else{
        var rval = [];
        var reserves = data.Values.Reservations
        for(var i=0; i< reserves.length; i++){
          var instances =reserves[i].Instances;
          for(var j=0; j<instances.length; j++){
            var tags = instances[j].Tags
            var name = ""
            for(var k=0; k<tags.length; k++){
              if(tags[k].Key === 'Name'){
                name = tags[k].Value;
              }
            }
            rval.push({Value: instances[j].InstanceId, Name: name})
          }
        }
        return res.send({Success:true, Values:rval});
      }
    });
  }
  else if(ptype==='AWS::EC2::Image::Id'){}
  else if(ptype==='AWS::EC2::KeyPair::KeyName'){}
  else if(ptype==='AWS::EC2::SecurityGroup::GroupName' || ptype==='AWS::EC2::SecurityGroup::Id'){
    ec2.describeSecurityGroups(params, function(err, data) {
      if (err){
        console.log(err, err.stack);
        return res.send({Success: false, Error: err, Values:[]});
      }
      else{
        var rval = []
        for(var i=0; i<data.SecurityGroups.length; i++){
          rval.push(data.Reservations.Instances[i].Tags);
        }
        return res.send({Success:true, Values:rval});
      }
    });
  }
  else if(ptype==='AWS::EC2::Subnet::Id'){}
  else if(ptype==='AWS::EC2::Volume::Id'){}
  else if(ptype==='AWS::EC2::VPC::Id'){}
  else{return res.send([])}
});

router.get('/api/parts', function(req, res){
  db.collection('parts').find({Subpart:false},{"_id":false}).toArray(function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
    // console.log(results);
    return res.send(results);
  });
});

router.get('/api/parts/:type', function(req, res){
  db.collection('parts').find({"Type":req.params.type},{"_id":false}).toArray(function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
  //  console.log(results);
    return res.send(results);
  });
});

module.exports = router;
