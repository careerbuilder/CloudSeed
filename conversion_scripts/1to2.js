// Copyright 2015 CareerBuilder, LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and limitations under the License.
//

//Converts Cloudseed 1 compatible stacks to cloudseed 2.0 stacks

var fs = require('fs');
var path = require('path');
var async = require('async');
global.config = require('../config.json');
var mysql = require('mysql');
var pool;
var dbName = global.config.DB.database;
if(global.config.DB.Type == 'mysql'|| global.config.DB.Type == 'aurora'){
  var pool = mysql.createPool(global.config.DB);
}

/*

if(process.argv.length !==3){
  console.error('please provide a partsfile');
  process.exit(1);
}

var filepath;
if(path.isAbsolute(process.argv[2])){
  filepath = process.argv[2];
}
else{
  filepath = path.join(process.cwd(), process.argv[2]);
}
*/

function replaceNames(obj, append){
  var newobj = {};
  for(var key in obj){
    newobj[key+""+append] = obj[key];
  }
  return newobj;
}

var types ={};
var stacks = [];

async.series([function(callback){
  pool.getConnection(function(err, connection) {
    if(err) {
      console.log('Error connecting to database');
      return callback(err);
    }
    var q = 'Select * from ' + mysql.escapeId(dbName + '.old_stacks')+' ORDER BY `Name`;';
    connection.query(q, function(err, results) {
      connection.release();
      if(err){
        return callback(err);
      }
      if(results.length<1){
        return callback('no stacks found!');
      }
      stacks = results.map(function(obj){
        obj.Template = JSON.parse(obj.Template);
        obj.Parts = JSON.parse(obj.Parts);
        return obj;
      });
      return callback();
    });
  });
}, function(callback){
  //Load new version of parts
  var partsdir = path.join(__dirname, '../Parts');
  var pfiles = fs.readdirSync(partsdir);
  var allparts = [];
  async.each(pfiles, function(f, cb){
    if(f.indexOf('.part')<0){
      allparts = allparts.concat(fs.readdirSync(path.join(partsdir, f)).map(function(x){return path.join(f, x);}));
      return cb();
    }
    else{
      allparts.push(f);
      return cb();
    }
  }, function(err){
    async.each(allparts, function(p, cb2){
      var part = JSON.parse(fs.readFileSync(path.join(partsdir, p)));
      if(p.indexOf('.subpart')>-1){
        part.Subpart = true;
      }
      if(p.indexOf('.subassembly')>-1){
        part.SubAssembly = true;
      }
      types[part.Type] = part;
      return cb2();
    }, function(err){
      if(err){
        return callback(err);
      }
      return callback();
    });
  });
}, function(callback){
  async.eachSeries(stacks, function(s, callback2){
    var cparts ={};
    //Read in partslist
    var parts = s.Parts;
    //foreach part, attempt to map to new version of part
    async.each(parts, function(ap, cb3){
      var newcount = ap.Count;
      var copy, type;
      if(!(ap.Type in types)){
        if(ap.Type == 'IGWRoute'){
          type = 'Route';
          copy = JSON.parse(JSON.stringify(types.Route));
        }
        else{
          console.log('No parallel for', ap.Type);
          return cb3();
        }
      }
      else{
        copy = JSON.parse(JSON.stringify(types[ap.Type]));
        type = ap.Type;
      }
      var connections = copy.Connections || {};
      var partstring = JSON.stringify(copy);
      for(var cond in copy.Conditions){
        var cre = new RegExp('"'+cond+'"', 'g');
        partstring = partstring.replace(cre, '"'+cond+''+newcount+'"');
      }
      var newresname = null;
      if(!copy.SubAssembly){
        newresname = ap.LogicalName;
      }
      for(var res in copy.Resources){
        var re = new RegExp('\\{\\s*"Ref"\\s*:\\s*'+ JSON.stringify(res) +'\\s*\\}', 'g');
        var re2 = new RegExp('\\{\\s*"Fn::GetAtt"\\s*:\\s*\\['+ JSON.stringify(res) +',\\s*', 'g');
        var re3 = new RegExp('"'+res+'\\|', 'g');
        partstring = partstring.replace(re, JSON.stringify({Ref:newresname||(res+""+newcount)}));
        partstring = partstring.replace(re2, '{"Fn::GetAtt":['+JSON.stringify(newresname||(res+""+newcount))+',');
        partstring = partstring.replace(re3, '"'+res+newcount+'|');
      }
      copy = JSON.parse(partstring);
      for(var resname in copy.Resources){
        copy.Resources[newresname||(resname+""+newcount)] = copy.Resources[resname];
        delete copy.Resources[resname];
      }
      copy.Outputs = replaceNames(copy.Outputs || {}, newcount);
      for(var par in copy.Parameters){
        var cpar = par;
        if(par == 'IGW'){
          cpar = 'Gateway';
        }
        if(par in ap.Definition.Parameters){
          if('Value' in ap.Definition.Parameters[par]){
            copy.Parameters[cpar].Value = ap.Definition.Parameters[par].Value;
            if('AllowedValues' in copy.Parameters[cpar]){
              for(var x=0; x<copy.Parameters[cpar].AllowedValues.length; x++){
                var av = copy.Parameters[cpar].AllowedValues[x];
                if(copy.Parameters[cpar].Value.toUpperCase()==av.toUpperCase()){
                  copy.Parameters[cpar].Value = av;
                  break;
                }
              }
            }
          }
          else{
            if(ap.Definition.Connections && ap.Definition.Connections.Substitutes && ap.Definition.Connections.Substitutes.length>0){
              for(var i=0; i<ap.Definition.Connections.Substitutes.length; i++){
                var sub = ap.Definition.Connections.Substitutes[i];
                if(sub.Parameter == par){
                  copy.Parameters[cpar].Value = sub.Reference;
                  break;
                }
              }
            }
          }
        }
      }
      var mod = {Type: type, Count: newcount, RefID:ap.LogicalName, Name:ap.LogicalName, Collapsed: false, Definition:copy, EditingName: false, Origin: 'Local'};
      if(ap.subparts){
        mod.subparts={};
        for(var subp in ap.subparts){
          mod.subparts[ap.LogicalName+'|'+subp] = ap.subparts[subp];
        }
      }
      //add to Parts object instead of List
      cparts[mod.RefID]= mod;
      return cb3();
    }, function(err){
      if(err){
        return callback2(err);
      }
      else{
        pool.getConnection(function(err, connection) {
          if(err) {
            return callback2(err);
          }
          var q ='INSERT INTO ' + mysql.escapeId(dbName + '.stacks')+' (`Name`, `Region`, `Ready`, `Template`, `Parts`) VALUES(?, ?, ?, ?, ?);';
          connection.query(q, [s.Name, s.Region, s.Ready||false, '{}', JSON.stringify(cparts)], function(err, result) {
            connection.release();
            if(err){
              return callback2(err);
            }
            return callback2();
          });
        });
      }
    });
  },function(err){
    if(err){
      return callback(err);
    }
    return callback();
  });
}], function(err){
  var returncode =0;
  if(err){
    console.log(err);
    returncode=1;
  }
  pool.end(function(error){
    return process.exit(returncode);
  });
});
