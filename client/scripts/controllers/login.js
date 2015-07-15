'use strict';

app.controller('LoginCtrl', function($http, $scope, $location, authservice, toastr){

  $scope.login=function(){
    $http.post('https://cloudseed.cbsitedb.net/api/auth/login', $scope.auth).success(function(data, status){
      if(status != 200){
        err = "Endpoint cannot be reached";
        $scope.loginResult = {Success:false, Message:err};
      }
      else{
        if(data.Success){
          $scope.loginResult = {Success: true, Message: "Log in successful!"};
          authservice.saveAuth(data.user);
          $location.path('/parts');
        }
        else{
          var err = data.Error;
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
