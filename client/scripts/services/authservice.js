"use strict";

app.factory('authservice', ['$http','$cookieStore', function($http, $cookieStore){

  var auth_ID;
  var user;

  var cookie = $cookieStore.get('c_s66d');

  if(cookie){
    console.log("found session in progress");
    $http.get('https://cloudseed.cbsitedb.net/api/users/'+cookie).success(function(data){
      if(data.Success){
        user = data.user;
        auth_ID = cookie;
      }
      else{
        console.log(data.Error);
      }
    });
  }

  var authservice = {};

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
  return authservice;

}]);
