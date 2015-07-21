var mongo = require('mongoskin');
var db = mongo.db('mongodb://localhost:27017/cloudseed');

module.exports ={
  to_object_id: function(id){
    return mongo.helper.toObjectID(id);
  },
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
