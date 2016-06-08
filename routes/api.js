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
var express = require('express');
var router = express.Router();
var db = require('../tools/db_tool.js');

router.use(function(req, res, next){
  if(!req.signedCookies || !req.signedCookies.c_s66d){
    res.locals.user = null;
    return next();
  }
  else{
    var a_sess = req.signedCookies.c_s66d;
    db.get_user({confirm:a_sess, active:true}, function(err, result){
      if(err){
        console.log('Error connecting to auth service');
        return res.send({Success: false, Error: 'Could not retrieve user'});
      }
      if(result){
        res.locals.user = result;
        return next();
      }
      else{
        res.locals.user = null;
        return next();
      }
    });
  }
});

router.use('/auth/', require('./auth.js'));

router.use(function(req, res, next){
  if(res.locals.user){
    return next();
  }
  else{
    return res.send({Success: false, Error: 'Unauthorized!'});
  }
});

router.use('/users/', require('./users.js'));
router.use('/parts/', require('./parts.js'));
router.use('/stacks/', require('./stacks.js'));


module.exports=router;
