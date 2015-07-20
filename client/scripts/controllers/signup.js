'use strict';

app.controller('SignupCtrl', function($http, $location, $scope, toastr){

  $scope.signup = function(){
    $http.post('https://cloudseed.cbsitedb.net/api/auth/register', $scope.auth).success(function(data, status){
      if(status != 200){
        err = "Endpoint cannot be reached";
        toastr.warning(err, "This is awkward...");
        $scope.signupResult={Success:false, Message: err};
      }
      else{
        if(data.Success){
          $scope.auth = {};
          $scope.signupResult={Success:true, Message: "Signup complete! Check your email!"};
          toastr.success("Welcome to Cloudseed!", "Confirmation Email Sent!");
        }
        else{
          $scope.signupResult={Success:false, Message: data.Error};
          toastr.error(data.Error);
        }
      }
    }).
    error(function(data, status, headers, config) {
      console.log(data);
      $scope.signupResult={Success:false, Message: "Our bad..."};
      toastr.error('Check back soon!', 'Endpoint cannot be reached');
    });
  }
});
