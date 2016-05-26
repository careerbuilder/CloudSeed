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

router.use('/auth/', require('./auth.js'));

router.use(function(req, res, next){
  var authZ = req.headers.authorization || req.headers.authorization;
  if(!authZ){
    return res.send({Success:false, Error:"No valid Auth token"});
  }
  db.get_user({confirm: authZ, active:true}, function(err, result){
    if(err){
      return res.send({Success: false, Error: err});
    }
    if(!result){
      return res.send({Success: false, Error: "Invalid Auth!"});
    }
    next();
  });
});

router.use('/users/', require('./users.js'));
router.use('/parts/', require('./parts.js'));
router.use('/stacks/', require('./stacks.js'));


module.exports=router;
