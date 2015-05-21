var express = require('express');
var db = require('mongoskin').db('mongodb://localhost:27017/cloudseed');
var aws = require('aws-sdk');
var exec = require('child_process').exec;
var fs = require('fs');
var ec2 = new aws.EC2({region:"us-east-1"});
var router = express.Router();

var stacksrepo = process.env['STACKS_REPO'];
if(!stacksrepo){
  console.log("Stacks_Repo not configured");
}

router.get('/api/regions', function(req, res){
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

router.get('/api/stacks', function(req, res){
  db.collection('stacks').find({},{"Name":true}).toArray(function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error: err});
    }
   // console.log(results);
    return res.send(results);
  });
});

router.get('/api/stacks/:name', function(req, res){
  db.collection('stacks').find({"Name":req.params.name},{"_id":false}).toArray(function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error:err});
    }
  //  console.log(results);
    return res.send(results);
  });
});

router.post('/api/stacks', function(req, res){
  var body = req.body.build;
  var email = req.body.user;
  var name = body['Name'].trim();
  var template = body['Template'];
  db.collection('stacks').update({Name:req.body['Name']}, req.body, {upsert:true}, function(err, result){
    if(err){
      console.log(err);
      return res.send({Code: -1, Error:err});
    }
    else{
      if(stacksrepo){
        var stackspath = stacksrepo + "/" + name +".stack"
        fs.writeFileSync(stackspath, JSON.stringify(template));
        var child = exec('cd ' + stacksrepo + ' git add -A && git commit -a -m "Cloudseed stack changes" --author ' + email);
        child.on('stdout', function(data){
          console.log(data);
        });
        child.on('stderr', function(data){
          console.log(data);
        });
        child.on('close', function(code) {
          console.log("Added stack");
          return res.send({Code: 400, Message: "Stack Saved!"});
        });
      }
      else{
        console.log("Added stack without git hook");
        return res.send({Code: 388, Message: "No Stack Repo configured"})
      }
    }
  });
});

/**
* This method introduced vulnerabilities, by allowing invalid templates to be sent off for building.
* The replacement method requires a Save, which validates templates.
*
router.post('/api/build', function(req, res){
  var body = req.body;
  var template = body['Template'];
  var stackname = body['Name'];
  aws.config.update({accessKeyId: body['auth']['accesskey'], secretAccessKey: body['auth']['secretkey'], region: body['Region']});
  cf.describeStacks({"StackName": stackname}, function(err, data){
    if(err){
      console.log("Creating stack");
      cf.createStack({"StackName": stackname, "Capabilities":['CAPABILITY_IAM'], "TemplateBody":JSON.stringify(template)}, function(err, data){
        if(err){
          console.log(err);
          return res.send({Success: false, Error:err});
        }
        return res.send(data);
      });
    }
    else{
      cf.updateStack({"StackName": stackname, "Capabilities":['CAPABILITY_IAM'], "TemplateBody":JSON.stringify(stack['Template']), "UsePreviousTemplate":false}, function(err, data){
        if(err){
          console.log(err);
          return res.send({Success: false, Error:err});
        }
        return res.send(data);
      });
    }
  });
});
*/

router.post('/api/build/:name', function(req, res){
  var auth = req.body;
  db.collection('stacks').find({"Name":req.params.name},{"_id":false}).toArray(function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error:err});
    }
    stack = results[0];
    var cf = new aws.CloudFormation({accessKeyId: auth['accesskey'], secretAccessKey: auth['secretkey'], region: stack['Region']});
    stackname = stack['Name'];
    cf.describeStacks({"StackName": stackname}, function(err, data){
      if(err){
        console.log("Creating stack");
        cf.createStack({"StackName": stackname, "Capabilities":['CAPABILITY_IAM'], "TemplateBody":JSON.stringify(stack['Template'],null,2)}, function(err, data){
          if(err){
            console.log(err);
            return res.send({Success: false, Error:err});
          }
          return res.send({Success: true, Data: data});
        });
      }
      else{
        cf.updateStack({"StackName": stackname, "Capabilities":['CAPABILITY_IAM'], "TemplateBody":JSON.stringify(stack['Template'],null,2), "UsePreviousTemplate":false}, function(err, data){
          if(err){
            console.log(err);
            return res.send({Success: false, Error:err});
          }
          return res.send({Success: true, Data: data});
        });
      }
    });
  });
});


module.exports = router;
