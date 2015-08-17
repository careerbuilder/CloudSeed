/*
* Copyright 2015 CareerBuilder, LLC
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*     http://www.apache.org/licenses/LICENSE-2.0
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and limitations under the License.
*/
var express = require('express');
var db = require('../tools/db_tool.js');
var aws = require('aws-sdk');
var router = express.Router();

router.get('/awsvalues/:awstype', function(req, res){
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

router.get('/', function(req, res){
  db.get_parts({Subpart:false}, function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
    // console.log(results);
    return res.send({Success:true, Data: results});
  });
});

router.get('/:type', function(req, res){
  db.get_part({"Type":req.params.type}, function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
  //  console.log(results);
    return res.send({Success:true, Data: results});
  });
});

module.exports = router;
