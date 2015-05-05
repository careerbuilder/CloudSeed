var express = require('express');
var db = require('mongoskin').db('mongodb://localhost:27017/cloudseed');
var aws = require('aws-sdk');
var fs = require('fs');
var cf = new aws.CloudFormation({region:'us-east-1'});
var router = express.Router();

router.get('/api/stacks', function(req, res){
  db.collection('stacks').find({},{"Name":true}).toArray(function(err, results){
    if(err){
      throw err;
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
  var body = req.body;
  var name = body['Name'].trim();
  var template = body['Template'];
  db.collection('stacks').update({Name:req.body['Name']}, req.body, {upsert:true}, function(err, result){
    if(err){
      console.log(err);
      return res.send({Success: false, Error:err});
    }
    else{
      console.log("Added stack");
      fs.writeFile("~/Cloud_Seed/CLI/Stacks/"+name+".stack", JSON.stringify(template), function(error) {
        if(error) {
            return console.log(error);
        }
        console.log("The file was saved!");
        //git commit and push
      });
      return res.send({Success: true, Message: "Added Successfully"})
    }
  });
});

router.post('/api/build', function(req, res){
  var body = req.body;
  var template = body['Template'];
  var stackname = body['Name'];
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

router.post('/api/build/:name', function(req, res){
  //region = req.body['region'];
  //aws.config.update({'region': region});
  db.collection('stacks').find({"Name":req.params.name},{"_id":false}).toArray(function(err, results){
    if(err){
      console.log(err);
      return res.send({Success: false, Error:err});
    }
    stack = results[0];
    console.log(stack);
    stackname = stack['Name'];
    cf.describeStacks({"StackName": stackname}, function(err, data){
      if(err){
        console.log("Creating stack");
        cf.createStack({"StackName": stackname, "Capabilities":['CAPABILITY_IAM'], "TemplateBody":JSON.stringify(stack['Template'],null,2)}, function(err, data){
          if(err){
            console.log(err);
            return res.send({Success: false, Error:err});
          }
          return res.send(data);
        });
      }
      else{
        cf.updateStack({"StackName": stackname, "Capabilities":['CAPABILITY_IAM'], "TemplateBody":JSON.stringify(stack['Template'],null,2), "UsePreviousTemplate":false}, function(err, data){
          if(err){
            console.log(err);
            return res.send({Success: false, Error:err});
          }
          return res.send(data);
        });
      }
    });
  });
});


module.exports = router;
