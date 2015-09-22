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
var mongo = require('mongoskin');
var conn = "mongodb://localhost:27017/cloudseed"
if(global.config.DB.Type === 'mongo'){
  conn = "mongodb://"+global.config.DB.Host+":"+global.config.DB.Port+"/"+global.config.DB.Database
}
var db = mongo.db(conn);

module.exports ={
  put_user: function(user, callback){
    db.collection('users').insert(user, callback);
  },
  update_user: function(user, k_v, callback){
    var set = {$set: k_v};
    db.collection('users').update(user, set, callback);
  },
  get_user: function(user_args, callback){
    db.collection('users').findOne(user_args, callback);
  },
  get_parts: function(parts, callback){
    var criteria = parts || {};
    db.collection('parts').find(criteria).toArray(callback);
  },
  get_part: function(part, callback){
    db.collection('parts').findOne(part, callback);
  },
  get_stacks: function(stacks, callback){
    var criteria = stacks || {};
    db.collection('stacks').find(criteria).toArray(callback);
  },
  get_stack: function(stack, callback){
    db.collection('stacks').findOne(stack, callback);
  },
  put_stack: function(stack, k_v, callback){
    if(k_v._id){
      delete k_v._id;
    }
    db.collection('stacks').update(stack, k_v, {upsert:true}, callback);
  }
}
