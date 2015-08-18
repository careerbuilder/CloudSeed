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

app.controller('LoginCtrl', function($http, $scope, $location, authservice, toastr){

  $scope.login=function(){
    $http.post('/api/auth/login', $scope.auth).success(function(data, status){
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
