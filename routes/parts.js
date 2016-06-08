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
  var aws_obj = {region:region};
  if('Amazon' in global.config){
    aws_obj.AccessKey = global.config.AccessKey;
    aws_obj.SecretKey = global.config.SecretKey;
  }
  var ec2 = new aws.EC2(aws_obj);
  if(ptype == 'AWS::EC2::AvailabilityZone::Name'){
    ec2.describeAvailabilityZones({}, function(err, data) {
      if (err){
        console.log(err, err.stack);
        return res.send({Success: false, Error: err, Values:[]});
      }
      else{
        var rval = [];
        data.AvailabilityZones.forEach(function(az){
          rval.push({ID: az.ZoneName, Name:az.ZoneName});
        });
        return res.send({Success:true, Values:rval});
      }
    });
  }
  else if(ptype==='AWS::EC2::Instance::Id'){
    var ec2nextToken = null;
    var rval = [];
    async.doWhilst(function(cb){
      ec2.describeInstances({NextToken:ec2nextToken}, function(err, data){
        if (err){
          console.log(err, err.stack);
          return cb(err);
        }
        var reserves = data.Reservations;
        for(var i=0; i<reserves.length; i++){
          var instances =reserves[i].Instances;
          for(var j=0; j<instances.length; j++){
            var tags = instances[j].Tags;
            var id = instances[j].InstanceId;
            var name = id;
            for(var k=0; k<tags.length; k++){
              if(tags[k].Key === 'Name'){
                name = tags[k].Value;
              }
            }
            rval.push({ID: id, Name: name});
          }
        }
        ec2nextToken=data.NextToken||null;
        return cb();
      });
    }, function test(){
      return ec2nextToken;
    }, function(err){
      if(err){
        return res.send({Success: false, Error: err, Values:[]});
      }
      return res.send({Success:true, Values:rval});
    });
  }
  else if(ptype=='AWS::EC2::SecurityGroup::GroupName' || ptype=='AWS::EC2::SecurityGroup::Id'){
    ec2.describeSecurityGroups(params, function(err, data) {
      if (err){
        console.log(err, err.stack);
        return res.send({Success: false, Error: err, Values:[]});
      }
      else{
        var rval = [];
        data.SecurityGroups.forEach(function(sg){
          var name = sg.GroupName;
          var id = sg.GroupId;
          if(ptype=='AWS::EC2::SecurityGroup::GroupName'){
            id = name;
          }
          rval.push({ID: id, Name: name});
        });
        return res.send({Success:true, Values:rval});
      }
    });
  }
  else if(ptype==='AWS::EC2::Image::Id'){
    ec2.describeImages({}, function(err, data){
      if(err){
        return res.send({Success:false, Error:err});
      }
      var rval = [];
      data.Images.forEach(function(img){
        var id = img.ImageId;
        var name = id;
        if(img.Tags){
          for(var i=0; i<img.Tags.length; i++){
            var t = img.Tags[i];
            if(t.Key.search(/^\s*name\s*$/i)>=0){
              name= t.Value;
              break;
            }
          }
        }
        rval.push({ID: id, Name: name});
      });
      return res.send({Success:true, Values:rval});
    });

  }
  else if(ptype==='AWS::EC2::KeyPair::KeyName'){return res.send({Success:true, Values:[]});}
  else if(ptype==='AWS::EC2::Subnet::Id'){return res.send({Success:true, Values:[]});}
  else if(ptype==='AWS::EC2::Volume::Id'){return res.send({Success:true, Values:[]});}
  else if(ptype==='AWS::EC2::VPC::Id'){return res.send({Success:true, Values:[]});}
  else{return res.send({Success:true, Values:[]});}
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
