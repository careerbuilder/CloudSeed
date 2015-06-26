'use strict';

app.controller('LoginCtrl', function($http, $scope, $cookies, $cookieStore, toastr){

  $scope.login=function(){
    $http.post('http://localhost:3000/api/auth/login', $scope.auth).success(function(data, status){
      if(status != 200){
        err = "Endpoint cannot be reached";
        $scope.loginResult = {Success:false, Message:err};
      }
      else{
        if(data.Success){
          $cookieStore.put('c_s66d', data.user._id);
          $scope.loginResult = {Success: true, Message: "Log in successful!"};
          //events
          $scope.user = data.user;
          toastr.success("Welcome to Cloudseed!");
        }
        else{
          err = data.Error;
          $scope.loginResult = {Success:false, Message:err};
          toastr.error(err);
        }
      }
    }).
    error(function(data, status, headers, config) {
      console.log(data);
      $scope.loginResult = {Success:false, Message:'Endpoint cannot be reached'};
      toastr.error('Check back soon!', 'Endpoint cannot be reached');
    });
  }
});
