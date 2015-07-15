var amazon = require('aws-sdk');

var db = new amazon.SimpleDB({
  apiVersion: '2009-04-15',
  credentials: global.config.DB.credentials,
  region: "us-east-1"
});

var user_domain = "TestDomain";

module.exports ={
  to_object_id: function(id){
    return mongo.helper.toObjectID(id);
  },
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

    var select_expr =
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
  },
  test_database_put: function(err, data){

    var params = {
      Attributes:
      [
        {
          Name: 'email',
          Value: 'a.mcmanigal2@gmail.com',
          Replace: true
        },

        {
          Name: 'team',
          Value: 'Search',
          Replace: false
        }

    ],
    DomainName: 'TestDomain',
    ItemName: 'a.mcmanigal2@gmail.com',
    };
    db.putAttributes(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });

  }


  //Create Domain (Table)
  /*
  db.createDomain({
    DomainName: "TestDomain"
  },
  function(err, data){
    if(err) console.log(err, err.stack)
    else console.log(data);
  })
  */

  //Getting Domains (Tables)
  /*
  var params = {
    MaxNumberOfDomains: 10,
    NextToken: 'STRING_VALUE'
  };
  db.listDomains(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
  */

  //Adding Rows
  /*
  var params = {
    Attributes:
    [
      {
        Name: 'email',
        Value: 'a.mcmanigal1@gmail.com',
        Replace: true
      },

      {
        Name: 'team',
        Value: 'Search',
        Replace: false
      }

  ],
  DomainName: 'TestDomain',
  ItemName: 'user',
};
db.putAttributes(params, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});
  */

  //Getting Rows
}
