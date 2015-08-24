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
var amazon = require('aws-sdk');

var db = new amazon.SimpleDB({
  apiVersion: '2009-04-15',
  credentials: global.config.DB.credentials,
  region: "us-east-1"
});

var user_domain = "TestDomain";

module.exports ={
  put_user: function(user, callback){

    var params = {
      Attributes:[],
      DomainName: user_domain,
      ItemName: user.email
    };
    for(var field in user){
      params.Attributes.push(
        {
          Name: field,
          Value: user[field].toString(),
          Replace: false
        }
      )
    }
    console.log(params);
    db.putAttributes(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     callback(data);           // successful response
    });

  },
  update_user: function(user, k_v, callback){

    //var select_expr =
    var set = {$set: k_v};
    db.collection('users').update(user, set, callback);
  },
  get_user: function(user_args, callback){

    var select_expr = "select * from " + user_domain + " where ";
    var prop_count = Object.keys(user_args).length;
    var current_count = 1;

    for(var field in user_args){
      select_expr  = select_expr + field + " = '" + user_args[field] + "'";
      if(current_count < prop_count){
        select_expr = select_expr + " and ";
      }
      current_count = current_count + 1;
    }

    console.log(select_expr);
    var params = {
      SelectExpression: select_expr, /* required */
      ConsistentRead: true,
    };
    db.select(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     callback(data);           // successful response
    });
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
    db.collection.update(stack, k_v, {upsert:true}, callback);
  },
  test_database: function(whatever, callback){

    var params = {
      DomainName: 'TestDomain', /* required */
      ItemName: 'whatever5@gmail.com', /* required */
      ConsistentRead: true
    };
    db.getAttributes(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });
  }
}
