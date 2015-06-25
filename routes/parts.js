var express = require('express');
var db = require('../tools/db_tool.js');
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
        var reserves = data.Reservations;
        for(var i=0; i<reserves.length; i++){
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
  else if(ptype==='AWS::EC2::Image::Id'){return res.send({Success:true, Values:[]})}
  else if(ptype==='AWS::EC2::KeyPair::KeyName'){return res.send({Success:true, Values:[]})}
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
  else if(ptype==='AWS::EC2::Subnet::Id'){return res.send({Success:true, Values:[]})}
  else if(ptype==='AWS::EC2::Volume::Id'){return res.send({Success:true, Values:[]})}
  else if(ptype==='AWS::EC2::VPC::Id'){return res.send({Success:true, Values:[]})}
  else{return res.send({Success:true, Values:[]})}
});

router.get('/api/parts', function(req, res){
  db.get_parts({Subpart:false}, function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
    // console.log(results);
    return res.send(results);
  });
});

router.get('/api/parts/:type', function(req, res){
  db.get_part({"Type":req.params.type}, function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
  //  console.log(results);
    return res.send(results);
  });
});

module.exports = router;
