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
'use strict';

app.controller('SignupCtrl', function($http, $location, $scope, toastr){

  $scope.signup = function(){
    $http.post('/api/auth/register', $scope.auth).success(function(data, status){
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
