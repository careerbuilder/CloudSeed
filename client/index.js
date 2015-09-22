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

var app = angular.module('cloudseed', ['ngRoute', 'ngCookies', 'toastr']);

app.config(['$routeProvider', '$httpProvider', function($routeProvider, $httpProvider) {
	$routeProvider.when('/login', {
		controller: 'LoginCtrl',
		templateUrl: 'views/login.html'
	})
	.when('/signup', {
		controller: 'SignupCtrl',
		templateUrl: 'views/signup.html'
	})
	.when('/config', {
		controller: 'ConfigCtrl',
		templateUrl: 'views/config.html',
		resolve:{
			auth: ["authservice", function(authservice) {return authservice.hasAccess();}]
		}
	})
	.when('/', {
		controller: 'PartCtrl',
		templateUrl: 'views/parts.html',
		resolve:{
			auth: ["authservice", function(authservice) {return authservice.hasAccess();}]
		}
	})
	.otherwise({redirectTo: '/'});
  $httpProvider.interceptors.push('httpRequestInterceptor');
}]);


app.controller('PageController', function($http, $scope, $location, toastr, authservice){

	$scope.auth = authservice;

  $scope.loggedin = function(){
    if(authservice.authid()){
			return true;
		}
		return false;
	}

	$scope.logOut=function(){
		$scope.user={};
		authservice.clearAuth();
		$location.path('/login');
	}

});

app.directive('partsSidebar', function() {
  return {
    restrict: 'E',
    controller: 'PartsCtrl',
		templateUrl: 'views/sidebar.html'
	}
});

app.factory('httpRequestInterceptor', function ($cookieStore) {
  return {
    request: function(config){
      var auth_token = $cookieStore.get('c_s66d') || "";
      config.headers['Authorization'] = auth_token;
      return config;
    }
  };
});

app.run(["$rootScope", "$location", "toastr", function($rootScope, $location, toastr) {
  $rootScope.$on("$routeChangeError", function(event, current, previous, eventObj) {
    if (eventObj.authenticated === false) {
      toastr.error('Please Log in First');
      $location.path("/login");
    }
  });
}]);
