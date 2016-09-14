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
var exec = require('child_process').execFile;
var fs = require('fs');
var aws_obj = {region:global.config.Region};
if('Amazon' in global.config){
  if (global.config.AccessKey && global.config.SecretKey){
    aws_obj.accessKeyId = global.config.AccessKey;
    aws_obj.secretAccessKey = global.config.SecretKey;
  }else{
    console.log('Cant find keys in config');
  }

}
var ec2 = new aws.EC2(aws_obj);
var router = express.Router();

var stacksrepo = global.config.STACKREPO;
if(!stacksrepo){
  console.log("Stacks_Repo not configured");
}

router.get('/regions', function(req, res){
  ec2.describeRegions({}, function(err, data){
    if(err){
      console.log('Error describing regions: ', err);
      return res.send({Success:false, Error: err});
    }
    var regions = [];
    for(var i=0; i<data.Regions.length; i++){
      regions.push(data.Regions[i].RegionName);
    }
    return res.send({Success: true, Regions: regions});
  });
});

router.get('/', function(req, res){
  db.get_stacks({},function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
    return res.send({Success:true, Data:results});
  });
});

router.get('/:name', function(req, res){
  db.get_stack({"Name":req.params.name}, function(err, result){
    if(err){
      console.log(err);
      return res.send({Success: false, Error:err});
    }
    return res.send({Success:true, Data: result});
  });
});

router.post('/', function(req, res){
  var build = req.body.build;
  var email = req.body.user;
  var name = build.Name.trim();
  var template = build.Template;
  db.put_stack({Name:build.Name}, build, function(err, result){
    if(err){
      console.log(err);
      return res.send({Code: -1, Error:err});
    }
    else{
      if(stacksrepo){
        var stackspath = stacksrepo + "/" + name +".stack";
        fs.writeFile(stackspath, JSON.stringify(template), function(err){
          if(err){
            console.log(err);
            return res.send({Code: 399, Message: "Stack not saved!", Error:err});
          }
          else{
            try{
              var userstring = '"'+email.split('@')[0].replace('\.', ' ') +' <'+email+'>'+'"';
              exec('./VersionControl.sh', [userstring, stacksrepo], function(err, stdout, stderr){
                if(err){
                  console.log(err);
                  return res.send({Code: 399, Message: "Stack saved to datastore, but not git", Error: err});
                }
                console.log(stdout, '\n', stderr);
                return res.send({Code: 400, Message: "Stack Saved!"});
              });
            } catch(e){
              return res.send({Code: 399, Message: "Stack saved to datastore, but not git", Error: err});
            }
          }
        });
      }
      else{
        console.log("Added stack without git hook");
        return res.send({Code: 388, Message: "No Stack Repo configured"});
      }
    }
  });
});

router.post('/build/:name', function(req, res){
  var auth = req.body.userid;
  db.get_user({"confirm":auth}, function(err, result){
    if(err){
      console.log(err);
      return res.send({Success:false, Error: err});
    }
    var auth = {
      accesskey: result.accesskey,
      secretkey: result.secretkey
    };
    db.get_stack({"Name":req.params.name}, function(err, results){
      if(err){
        console.log(err);
        return res.send({Success: false, Error:err});
      }
      var stack = results;

      // Replace CidrIp with SGsource in

      if (stack.Resources){
        for (var resource in stack.Resources){
          if (resource.Type == "AWS::EC2::SecurityGroup"){
            if (resource.Properties.SecurityGroupIngress){
              for (var i = 0; i < resource.Properties.SecurityGroupIngress.length; i++){
                var model = resource.Properties.SecurityGroupIngress[i];
                if (model.CidrIp.Value && (model.CidrIp.Value.indexOf("sg-") === 0)){
                  model.SourceSecurityGroupId = model.CidrIp;
                  delete model.CidrIp;
                }
              }
            }
          }
        }
      }

      var cf = new aws.CloudFormation({accessKeyId: auth.accesskey, secretAccessKey: auth.secretkey, region: stack.Region});
      var stackname = stack.Name;
      cf.describeStacks({"StackName": stackname}, function(err, data){
        if(err){
          console.log("Creating stack");
          cf.createStack({"StackName": stackname, "Capabilities":['CAPABILITY_IAM'], "TemplateBody":JSON.stringify(stack.Template,null,2)}, function(err, data){
            if(err){
              console.log(err);
              return res.send({Success: false, Error:err.message});
            }
            return res.send({Success: true, Data: data});
          });
        }
        else{
          cf.updateStack({"StackName": stackname, "Capabilities":['CAPABILITY_IAM'], "TemplateBody":JSON.stringify(stack.Template,null,2), "UsePreviousTemplate":false}, function(err, data){
            if(err){
              console.log(err);
              return res.send({Success: false, Error:err.message});
            }
            return res.send({Success: true, Data: data});
          });
        }
      });
    });
  });
});

module.exports = router;
