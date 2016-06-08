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
app.factory('authservice', ['$q', '$http','$cookies', function($q, $http, $cookies){

  var auth_ID;
  var user;
  var auth_cookie = $cookies.get('c_s66d');
  var authservice = {};

  function load_cookie(){
    var c_promise = $q.defer();
    $http.get('/api/auth/')
    .then(function(res){
      var data = res.data;
      if(data.Success){
        user = data.user;
        auth_ID = data.session;
        c_promise.resolve(user);
      }
      else{
        console.log(data.Error);
        user = null;
        auth_ID = null;
        c_promise.reject(data);
      }
    },
    function(err){
      user = null;
      auth_ID = null;
      c_promise.reject(err);
    });
    return c_promise.promise;
  }

  if(auth_cookie){
    load_cookie().then(function(user){
      console.log('Logged in as',user.email);
    }, function(err){
      console.log(err);
    });
  }

  authservice.saveAuth = function(userinfo){
    auth_ID = userinfo.confirm;
    user = userinfo;
  };

  authservice.clearAuth = function(){
    auth_ID = null;
    user = null;
    cookie= null;
    $cookies.remove('c_s66d');
  };
  authservice.authid = function(){
    return auth_ID;
  };
  authservice.userinfo = function(){
    return user;
  };
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
  };
  return authservice;

}]);
