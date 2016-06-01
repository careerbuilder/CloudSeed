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

var mysql = require('mysql');
var fs = require('fs');
var path = require('path');
var async = require('async');
var numcpus = require('os').cpus().length;

var config = require('../../config.json');

var dbName = config.DB.Database;
var pool;
if(config.DB.Type == 'mysql'|| config.DB.Type == 'aurora'){
  var pool = mysql.createPool(config.DB);
}
else{
  console.log('Database type', config.DB.Type, 'is not supported by this script');
  process.exit(1);
}

var partsdir = path.join(__dirname, '../../', 'Parts');
var parts = fs.readdirSync(partsdir);
var allparts = [];
async.each(parts, function(f, cb){
  if(f.indexOf('.part')<0){
    allparts = allparts.concat(fs.readdirSync(path.join(partsdir, f)).map(function(x){return path.join(f, x);}));
    return cb();
  }
  else{
    allparts.push(f);
    return cb();
  }
}, function(err){
  async.eachLimit(allparts, numcpus, function(p, cb2){
    var part = JSON.parse(fs.readFileSync(path.join(partsdir, p)));
    if(p.indexOf('.subpart')>-1){
      part.Subpart = true;
    }
    if(p.indexOf('.subassembly')>-1){
      part.SubAssembly = true;
    }
    pool.getConnection(function(err, connection) {
      if(err) {
        console.log('Error connecting to database', err);
        return cb2(err);
      }
      var q = 'Insert into ' + dbName + '.parts (`Type`, `Description`, `Subpart`, `SubAssembly`, `Part`) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `Description`=VALUES(`Description`), `Subpart`=VALUES(`Subpart`), `SubAssembly`=VALUES(`SubAssembly`), `Part`=VALUES(`Part`);';
      connection.query(q, [part.Type, part.Description||'', part.Subpart||false, part.SubAssembly||false, JSON.stringify(part)], function(err, result) {
        connection.release();
        if(err){
          console.log('Error inserting part', err);
          return cb2(err);
        }
        return cb2(null, result);
      });
    });
  }, function(err){
    if(err){
      console.log(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
