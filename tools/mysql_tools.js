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
var pool;
var dbName = global.config.DB.database;
if(global.config.DB.Type === 'mysql'|| global.config.DB.Type === 'aurora'){
  var pool = mysql.createPool(global.config.DB);
}

module.exports ={
  put_user: function(user, callback){
    pool.getConnection(function(err, connection) {
    	if(err) {
				console.log('Error connecting to database');
				return callback(err);
			}
      var q = 'Insert into ' + mysql.escapeId(dbName + '.users') + ' SET ?;';
	    connection.query(q, [user], function(err, result) {
	      connection.release();
	      if(err){
					console.log('Error inserting user');
					return callback(err);
				}
	      return callback(null, result);
	    });
		});
  },
  update_user: function(user, k_v, callback){
    pool.getConnection(function(err, connection) {
      if(err) {
        console.log('Error connecting to database');
        return callback(err);
      }
      var where = "";
      for(var key in user){
        if(where.length>0){
          where +=" AND ";
        }
        else{
          where =" WHERE ";
        }
        where+= mysql.escapeId(key)+'='+mysql.escape(user[key]);
      }
      var q = 'Update ' + mysql.escapeId(dbName + '.users')+ ' SET ? ' + where + ';';
      connection.query(q, [k_v], function(err, result) {
        connection.release();
        if(err){
          console.log('Error updating user');
          return callback(err);
        }
        return callback(null, result);
      });
    });
  },
  get_user: function(user_args, callback){
    pool.getConnection(function(err, connection) {
      if(err) {
        console.log('Error connecting to database');
        return callback(err);
      }
      var where = "";
      for(var key in user_args){
        if(where.length>0){
          where +=" AND ";
        }
        else{
          where =" WHERE ";
        }
        where+= mysql.escapeId(key)+'='+mysql.escape(user_args[key]);
      }
      var q = 'Select * from ' + mysql.escapeId(dbName + '.users')+' '+where+' LIMIT 1;';
      connection.query(q,function(err, results) {
        connection.release();
        if(err){
          console.log('Error getting user');
          return callback(err);
        }
        if(results.length<1){
          return callback();
        }
        return callback(null, results[0]);
      });
    });
  },
  get_parts: function(parts, callback){
    var criteria = parts || {};
    pool.getConnection(function(err, connection) {
      if(err) {
        console.log('Error connecting to database');
        return callback(err);
      }
      var where = "";
      for(var key in criteria){
        if(where.length>0){
          where +=" AND ";
        }
        else{
          where =" WHERE ";
        }
        where+= mysql.escapeId(key)+'='+mysql.escape(criteria[key]);
      }
      var q = 'Select * from ' + mysql.escapeId(dbName + '.parts')+' '+where+' ORDER BY Type;';
      connection.query(q, function(err, results) {
        connection.release();
        if(err){
          console.log('Error getting parts');
          return callback(err);
        }
        if(results.length<1){
          return callback("No parts found");
        }
        return callback(null, results.map(function(x){
          var part = JSON.parse(x.Part);
          part.SubAssembly = x.SubAssembly===1;
          part.Subpart = x.Subpart === 1;
          return part;
        }));
      });
    });
  },
  get_part: function(part, callback){
    pool.getConnection(function(err, connection) {
      if(err) {
        console.log('Error connecting to database');
        return callback(err);
      }
      var where = "";
      for(var key in part){
        if(where.length>0){
          where +=" AND ";
        }
        else{
          where =" WHERE ";
        }
        where+= mysql.escapeId(key)+'='+mysql.escape(part[key]);
      }
      var q = 'Select * from ' + mysql.escapeId(dbName + '.parts')+' '+where+' LIMIT 1;';
      connection.query(q, function(err, results) {
        connection.release();
        if(err){
          console.log('Error getting parts');
          return callback(err);
        }
        if(results.length<1){
          return callback("No parts found");
        }
        var part = JSON.parse(results[0].Part);
        part.SubAssembly = results[0].SubAssembly===1;
        part.Subpart = results[0].Subpart === 1;
        return callback(null, part);
      });
    });
  },
  get_stacks: function(stacks, callback){
    var criteria = stacks || {};
    pool.getConnection(function(err, connection) {
      if(err) {
        console.log('Error connecting to database');
        return callback(err);
      }
      var where = "";
      for(var key in criteria){
        if(where.length>0){
          where +=" AND ";
        }
        else{
          where =" WHERE ";
        }
        where+= mysql.escapeId(key)+'='+mysql.escape(criteria[key]);
      }
      var q = 'Select * from ' + mysql.escapeId(dbName + '.stacks')+' '+where+' ORDER BY Name;';
      connection.query(q, function(err, results) {
        connection.release();
        if(err){
          console.log('Error getting stacks');
          return callback(err);
        }
        if(results.length<1){
          return callback("No stacks found");
        }
        return callback(null, results.map(function(obj){
          obj.Template = JSON.parse(obj.Template);
          obj.Parts = JSON.parse(obj.Parts);
          return obj;
        }));
      });
    });
  },
  get_stack: function(stack, callback){
    pool.getConnection(function(err, connection) {
      if(err) {
        console.log('Error connecting to database');
        return callback(err);
      }
      var where = "";
      for(var key in stack){
        if(where.length>0){
          where +=" AND ";
        }
        else{
          where =" WHERE ";
        }
        where+= mysql.escapeId(key)+'='+mysql.escape(stack[key]);
      }
      var q = 'Select * from ' + mysql.escapeId(dbName + '.stacks')+' '+where+' LIMIT 1;';
      connection.query(q, function(err, results) {
        connection.release();
        if(err){
          console.log('Error getting stacks');
          return callback(err);
        }
        if(results.length<1){
          return callback("No stacks found");
        }
        var obj = results[0];
        obj.Template = JSON.parse(obj.Template);
        obj.Parts = JSON.parse(obj.Parts);
        obj.Variables = JSON.parse(obj.Variables);
        return callback(null, obj);
      });
    });
  },
  put_stack: function(stack, k_v, callback){
    if(k_v._id){
      delete k_v._id;
    }
    pool.getConnection(function(err, connection) {
      if(err) {
        console.log('Error connecting to database');
        return callback(err);
      }
      var update = "";
      for(var col in k_v){
        if(update.length>0){
          update+=', ';
        }
        update += mysql.escapeId(col)+'=VALUES('+mysql.escapeId(col)+')';
      }
      var q ='INSERT INTO ' + mysql.escapeId(dbName + '.stacks')+' (`Name`, `Region`, `Ready`, `Template`, `Parts`, `Variables`) VALUES(?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE '+update+';';
      connection.query(q, [k_v.Name, k_v.Region, k_v.Ready||false, JSON.stringify(k_v.Template), JSON.stringify(k_v.Parts), JSON.stringify(k_v.Variables)], function(err, result) {
        connection.release();
        if(err){
          console.log('Error adding stack');
          return callback(err);
        }
        return callback(null, result);
      });
    });
  }
};
