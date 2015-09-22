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
"use strict";

app.factory('authservice', ['$q', '$http','$cookieStore', function($q, $http, $cookieStore){

  var auth_ID;
  var user;

  var cookie = $cookieStore.get('c_s66d');

  if(cookie){
    console.log("found session in progress");
    $http.get('/api/users/'+cookie)
    .then(function(res){
      var data = res.data;
      if(data.Success){
        user = data.user;
        auth_ID = cookie;
      }
      else{
        console.log(data.Error);
        user = null;
        auth_ID = null;
      }
    },
    function(res){
      user = null;
      auth_ID = null;
    });
  }

  var authservice = {};

  function load_cookie(){
    var cookie = $cookieStore.get('c_s66d');
    var c_promise = $q.defer();
    if(cookie){
      $http.get('/api/users/'+cookie)
      .then(function(res){
        var data = res.data;
        if(data.Success){
          user = data.user;
          auth_ID = cookie;
          c_promise.resolve(cookie);
        }
        else{
          console.log(data.Error);
          user = null;
          auth_ID = null;
          c_promise.reject(data);
        }
      },
      function(res){
        user = null;
        auth_ID = null;
        c_promise.reject(data);
      });
    }
    else{
      c_promise.reject('No Cookie');
    }
    return c_promise.promise;
  }

  authservice.saveAuth = function(userinfo){
    $cookieStore.put('c_s66d', userinfo._id);
    auth_ID = userinfo.confirm;
    user = userinfo;
  }

  authservice.clearAuth = function(){
    auth_ID = null;
    user = null;
    cookie= null;
    $cookieStore.remove('c_s66d');
  }
  authservice.authid = function(){
    return auth_ID;
  }
  authservice.userinfo = function(){
    return user;
  }
  authservice.hasAccess=  function(){
    var deferred = $q.defer();
    load_cookie().then(
      function(data){
        if(data){
          deferred.resolve(data);
        }
        else{
          deferred.reject({authenticated: false});
        }
      },
      function(err){
        deferred.reject({authenticated: false});
      }
    );
    return deferred.promise;
  }
  return authservice;

}]);
