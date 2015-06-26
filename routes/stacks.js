var express = require('express');
var db = require('../tools/db_tool.js');
var aws = require('aws-sdk');
var exec = require('child_process').exec;
var fs = require('fs');
var ec2 = new aws.EC2({region:"us-east-1"});
var router = express.Router();

var stacksrepo = process.env['STACKS_REPO'];
if(!stacksrepo){
  console.log("Stacks_Repo not configured");
}

router.get('/regions', function(req, res){
  ec2.describeRegions({}, function(err, data){
    if(err){
      console.log(err);
      return res.send({Success:false, Error: err});
    }
    var regions = []
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
    return res.send({Success:true, Name: results.Name, Ready: results.Ready});
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

router.post('/stacks', function(req, res){
  var build = req.body.build;
  var email = req.body.user;
  var name = build['Name'].trim();
  var template = build['Template'];
  db.put_stack({Name:build['Name']}, build, function(err, result){
    if(err){
      console.log(err);
      return res.send({Code: -1, Error:err});
    }
    else{
      if(stacksrepo){
        var stackspath = stacksrepo + "/" + name +".stack"
        fs.writeFile(stackspath, JSON.stringify(template), function(err){
          if(err){
            console.log(err);
            return res.send({Code: 399, Message: "Stack saved to mongo, but not git"});
          }
          else{
            var child = exec('cd ' + stacksrepo + ' && git add -A && git commit -a -m "Cloudseed stack changes" --author ' + email);
            child.stdout.on('data', function(data){
              console.log(data);
            });
            child.stderr.on('data', function(data){
              console.log(data);
            });
            child.on('close', function(code) {
              console.log("Added stack");
              return res.send({Code: 400, Message: "Stack Saved!"});
            });
          }
        });
      }
      else{
        console.log("Added stack without git hook");
        return res.send({Code: 388, Message: "No Stack Repo configured"})
      }
    }
  });
});

router.post('/build/:name', function(req, res){
  var auth = mongo.helper.toObjectID(req.body.userid);
  db.get_user({"_id":auth}, function(err, result){
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
      var cf = new aws.CloudFormation({accessKeyId: auth['accesskey'], secretAccessKey: auth['secretkey'], region: stack['Region']});
      var stackname = stack['Name'];
      cf.describeStacks({"StackName": stackname}, function(err, data){
        if(err){
          console.log("Creating stack");
          cf.createStack({"StackName": stackname, "Capabilities":['CAPABILITY_IAM'], "TemplateBody":JSON.stringify(stack['Template'],null,2)}, function(err, data){
            if(err){
              console.log(err);
              return res.send({Success: false, Error:err.message});
            }
            return res.send({Success: true, Data: data});
          });
        }
        else{
          cf.updateStack({"StackName": stackname, "Capabilities":['CAPABILITY_IAM'], "TemplateBody":JSON.stringify(stack['Template'],null,2), "UsePreviousTemplate":false}, function(err, data){
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
