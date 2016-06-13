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
var router = require('express').Router();
var aws = require('aws-sdk');
var async = require('async');
var db = require('../tools/db_tool.js');

router.get('/awsvalues/:awstype', function(req, res){
  var ptype = req.params.awstype;
  var region = req.query.region;
  if(ptype.indexOf('AWS::')!==0){
    return res.send({Success:false, Error: 'Unsupported type. AWS Types begin with AWS::'});
  }
  var aws_obj = {region:region, httpOptions:{timeout:10000}};
  if('Amazon' in global.config){
    aws_obj.AccessKey = global.config.AccessKey;
    aws_obj.SecretKey = global.config.SecretKey;
  }
  if(ptype.indexOf('EC2::')===5){
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
    else if(ptype=='AWS::EC2::Instance::Id'){
      var ec2nextToken = null;
      var rval = [];
      async.doWhilst(function(cb){
        ec2.describeInstances({NextToken:ec2nextToken}, function(err, data){
          if(err){
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
        return !!ec2nextToken;
      }, function(err){
        if(err){
          return res.send({Success: false, Error: err, Values:[]});
        }
        return res.send({Success:true, Values:rval});
      });
    }
    else if(ptype=='AWS::EC2::SecurityGroup::GroupName' || ptype=='AWS::EC2::SecurityGroup::Id'){
      ec2.describeSecurityGroups({}, function(err, data) {
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
    else if(ptype=='AWS::EC2::Image::Id'){
      ec2.describeImages({Owners:['self']}, function(err, data){
        if(err){
          return res.send({Success:false, Error:err});
        }
        var rval = [];
        data.Images.forEach(function(img){
          var id = img.ImageId;
          var name = img.Name || img.ImageId;
          rval.push({ID: id, Name: name});
        });
        return res.send({Success:true, Values:rval});
      });
    }
    else if(ptype=='AWS::EC2::KeyPair::KeyName'){
      ec2.describeKeyPairs({}, function(err, data){
        if(err){
          return res.send({Success:false, Error:err});
        }
        var rval = [];
        data.KeyPairs.forEach(function(kp){
          var id = kp.KeyName;
          var name = id;
          rval.push({ID: id, Name: name});
        });
        return res.send({Success:true, Values:rval});
      });
    }
    else if(ptype=='AWS::EC2::Subnet::Id'){
      ec2.describeSubnets({}, function(err, data){
        if(err){
          return res.send({Success:false, Error:err});
        }
        var rval = [];
        data.Subnets.forEach(function(subnet){
          var id = subnet.SubnetId;
          var name = id;
          if(subnet.Tags){
            for(var i=0; i<subnet.Tags.length; i++){
              var t = subnet.Tags[i];
              if(t.Key.search(/^\s*name\s*$/i)>=0){
                name= t.Value;
                break;
              }
            }
          }
          rval.push({ID: id, Name: name+" ("+ subnet.CidrBlock +")"});
        });
        return res.send({Success:true, Values:rval});
      });
    }
    else if(ptype=='AWS::EC2::Volume::Id'){
      var volnextToken = null;
      var vval = [];
      async.doWhilst(function(cb){
        ec2.describeVolumes({NextToken:volnextToken}, function(err, data){
          if(err){
            return cb(err);
          }
          volnextToken= data.NextToken || null;
          data.Volumes.forEach(function(vol){
            var id = vol.VolumeId;
            var name = id;
            if(vol.Tags){
              for(var i=0; i<vol.Tags.length; i++){
                var t = vol.Tags[i];
                if(t.Key.search(/^\s*name\s*$/i)>=0){
                  name= t.Value;
                  break;
                }
              }
            }
            vval.push({ID: id, Name: name});
          });
          return cb();
        });
      },function(){
        return !!volnextToken;
      }, function(err){
        if(err){
          return res.send({Success:false, Error:err});
        }
        return res.send({Success:true, Values:vval});
      });
    }
    else if(ptype=='AWS::EC2::VPC::Id'){
      ec2.describeVpcs({}, function(err, data){
        if(err){
          return res.send({Success:false, Error:err});
        }
        var rval = [];
        data.Vpcs.forEach(function(vpc){
          var id = vpc.VpcId;
          var name = id;
          if(vpc.Tags){
            for(var i=0; i<vpc.Tags.length; i++){
              var t = vpc.Tags[i];
              if(t.Key.search(/^\s*name\s*$/i)>=0){
                name= t.Value;
                break;
              }
            }
          }
          rval.push({ID: id, Name: name+" ("+ vpc.CidrBlock+")"});
        });
        return res.send({Success:true, Values:rval});
      });
    }
    else if(ptype=='AWS::EC2::NetworkAcl::Id'){
      ec2.describeNetworkAcls({}, function(err, data) {
        if(err){
          return res.send({Success:false, Error:err});
        }
        var rval = [];
        data.NetworkAcls.forEach(function(acl){
          var id = acl.NetworkAclId;
          var name = id;
          if(acl.Tags){
            for(var i=0; i<acl.Tags.length; i++){
              var t = acl.Tags[i];
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
    else if(ptype=='AWS::EC2::EIP::Ip'){
      ec2.describeAddresses({}, function(err, data) {
        if(err){
          return res.send({Success:false, Error:err});
        }
        var rval = [];
        data.Addresses.forEach(function(addr){
          var id = addr.PublicIp;
          var name = id;
          rval.push({ID: id, Name: name});
        });
        return res.send({Success:true, Values:rval});
      });
    }
    else if(ptype=='AWS::EC2::NetworkInterface::Id'){
      ec2.describeNetworkInterfaces({}, function(err, data) {
        if(err){
          return res.send({Success:false, Error:err});
        }
        var rval = [];
        data.NetworkInterfaces.forEach(function(eni){
          var id = eni.NetworkInterfaceId;
          var name = id;
          if(eni.TagSet){
            for(var i=0; i<eni.TagSet.length; i++){
              var t = eni.TagSet[i];
              if(t.Key.search(/^\s*name\s*$/i)>=0){
                name= t.Value;
                break;
              }
            }
          }
          if(eni.PrivateIpAddresses){
            for(var j=0; j<eni.PrivateIpAddresses.length; j++){
              var ip = eni.PrivateIpAddresses[j];
              if(ip.Primary){
                name += " ("+ip.PrivateIpAddress+")";
              }
            }
          }
          rval.push({ID: id, Name: name});
        });
        return res.send({Success:true, Values:rval});
      });
    }
    else if(ptype=='AWS::EC2::InternetGateway::Id'){
      ec2.describeInternetGateways({}, function(err, data){
        if(err){
          return res.send({Success:false, Error:err});
        }
        var rval = [];
        data.InternetGateways.forEach(function(igw){
          var id = igw.InternetGatewayId;
          var name = id;
          if(igw.Tags){
            for(var i=0; i<igw.Tags.length; i++){
              var t = igw.Tags[i];
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
    else if(ptype=='AWS::EC2::VPNGateway::Id'){
      ec2.describeVpnGateways({}, function(err, data){
        if(err){
          return res.send({Success:false, Error:err});
        }
        var rval = [];
        data.VpnGateways.forEach(function(vgw){
          var id = vgw.VpnGatewayId;
          var name = id;
          if(vgw.Tags){
            for(var i=0; i<vgw.Tags.length; i++){
              var t = vgw.Tags[i];
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
    else if(ptype=='AWS::EC2::VPCPeeringConnection::Id'){
      ec2.describeVpcPeeringConnections({}, function(err, data){
        if(err){
          return res.send({Success:false, Error:err});
        }
        var rval = [];
        data.VpcPeeringConnections.forEach(function(peer){
          var id = peer.VpcPeeringConnectionId;
          var name = id;
          if(peer.Tags){
            for(var i=0; i<peer.Tags.length; i++){
              var t = peer.Tags[i];
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
    else if(ptype=='AWS::EC2::RouteTable::Id'){
      ec2.describeRouteTables({}, function(err, data){
        if(err){
          return res.send({Success:false, Error:err});
        }
        var rval = [];
        data.RouteTables.forEach(function(rt){
          var id = rt.RouteTableId;
          var name = id;
          if(rt.Tags){
            for(var i=0; i<rt.Tags.length; i++){
              var t = rt.Tags[i];
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
    else if(ptype=='AWS::EC2::CustomerGateway::Id'){
      ec2.describeCustomerGateways({}, function(err, data){
        if(err){
          return res.send({Success:false, Error:err});
        }
        var rval = [];
        data.CustomerGateways.forEach(function(cgw){
          var id = cgw.CustomerGatewayId;
          var name = id;
          if(cgw.Tags){
            for(var i=0; i<cgw.Tags.length; i++){
              var t = cgw.Tags[i];
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
    else{
      return res.send({Success:false, Error:'Unrecognized part type: '+ptype});
    }
  }
  else if(ptype.indexOf('ElasticLoadBalancer::')===5){
    var elb = new aws.ELB(aws_obj);
    if(ptype == 'AWS::ElasticLoadBalancer::LoadBalancer::Id'){
      var lbnextToken = null;
      var lbval = [];
      async.doWhilst(function(cb){
        elb.describeLoadBalancers({Marker:lbnextToken}, function(err, data){
          if(err){
            return cb(err);
          }
          lbnextToken= data.NextMarker || null;
          data.LoadBalancerDescriptions.forEach(function(lb){
            var id = lb.LoadBalancerName;
            var name = id;
            lbval.push({ID: id, Name: name});
          });
          return cb();
        });
      },function(){
        return !!lbnextToken;
      }, function(err){
        if(err){
          return res.send({Success:false, Error:err});
        }
        return res.send({Success:true, Values:lbval});
      });
    }
    else{
      return res.send({Success:false, Error:'Unrecognized part type: '+ptype});
    }
  }
  else if(ptype.indexOf('RDS::')===5){
    var rds = new aws.RDS(aws_obj);
    if(ptype=='AWS::RDS::DBCluster::Id'){
      var dbnextToken = null;
      var dbval = [];
      async.doWhilst(function(cb){
        rds.describeDBClusters({Marker:dbnextToken}, function(err, data){
          if(err){
            return cb(err);
          }
          dbnextToken= data.Marker || null;
          data.DBClusters.forEach(function(db){
            var id = db.DBClusterIdentifier;
            var name = id;
            dbval.push({ID: id, Name: name});
          });
          return cb();
        });
      },function(){
        return !!dbnextToken;
      }, function(err){
        if(err){
          return res.send({Success:false, Error:err});
        }
        return res.send({Success:true, Values:dbval});
      });
    }
    else if(ptype=='AWS::RDS::SubnetGroup::Name'){
      var sngnextToken = null;
      var sngval = [];
      async.doWhilst(function(cb){
        rds.describeDBSubnetGroups({Marker:sngnextToken}, function(err, data){
          if(err){
            return cb(err);
          }
          sngnextToken= data.Marker || null;
          data.DBSubnetGroups.forEach(function(db){
            var id = db.DBSubnetGroupName;
            var name = id;
            sngval.push({ID: id, Name: name});
          });
          return cb();
        });
      },function(){
        return !!sngnextToken;
      }, function(err){
        if(err){
          return res.send({Success:false, Error:err});
        }
        return res.send({Success:true, Values:sngval});
      });
    }
    else{
      return res.send({Success:false, Error:'Unrecognized part type: '+ptype});
    }
  }
  else if(ptype.indexOf('AutoScaling::')===5){
    var autoscaling = new aws.AutoScaling(aws_obj);
    if(ptype=='AWS::AutoScaling::AutoScalingGroup::Name'){
      var asgnextToken = null;
      var asgval = [];
      async.doWhilst(function(cb){
        autoscaling.describeAutoScalingGroups({NextToken:asgnextToken}, function(err, data){
          if(err){
            return cb(err);
          }
          asgnextToken= data.NextToken || null;
          data.AutoScalingGroups.forEach(function(asg){
            var id = asg.AutoScalingGroupName;
            var name = id;
            asgval.push({ID: id, Name: name});
          });
          return cb();
        });
      },function(){
        return !!volnextToken;
      }, function(err){
        if(err){
          return res.send({Success:false, Error:err});
        }
        return res.send({Success:true, Values:asgval});
      });
    }
    else if(ptype=='AWS::AutoScaling::LaunchConfiguration::Id'){
      var lcnextToken = null;
      var lcval = [];
      async.doWhilst(function(cb){
        autoscaling.describeLaunchConfigurations({NextToken:lcnextToken}, function(err, data){
          if(err){
            return cb(err);
          }
          lcnextToken= data.NextToken || null;
          data.LaunchConfigurations.forEach(function(lc){
            var id = lc.LaunchConfigurationName;
            var name = id;
            asgval.push({ID: id, Name: name});
          });
          return cb();
        });
      },function(){
        return !!lcnextToken;
      }, function(err){
        if(err){
          return res.send({Success:false, Error:err});
        }
        return res.send({Success:true, Values:lcval});
      });
    }
    else{
      return res.send({Success:false, Error:'Unrecognized part type: '+ptype});
    }
  }
  else{
    return res.send({Success:false, Error:'Unrecognized part type: '+ptype});
  }
});

router.get('/', function(req, res){
  db.get_parts({Subpart:false}, function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
    return res.send({Success:true, Data: results});
  });
});

router.get('/:type', function(req, res){
  db.get_part({"Type":req.params.type}, function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
    return res.send({Success:true, Data: results});
  });
});

module.exports = router;
