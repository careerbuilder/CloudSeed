'use strict';

app.controller('SignupCtrl', function($http, $scope, toastr){

  $scope.signup = function(){
    $http.post('http://localhost:3000/api/auth/register', $scope.auth).success(function(data, status){
      if(status != 200){
        err = "Endpoint cannot be reached";
        toastr.warning(err, "This is awkward...");
        $scope.signupResult={Success:false, Message: err};
      }
      else{
        if(data.Success){
          toastr.success("Welcome to Cloudseed!", "Confirmation Email Sent!");
          $scope.auth = {};
          $scope.signupResult={Success:true, Message: "Signup complete! Check your email!"};
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
