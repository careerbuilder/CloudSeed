"use strict";

var app = angular.module('cloudseed', ['ngRoute', 'ngCookies', 'toastr']);

app.config(['$routeProvider', '$httpProvider', function($routeProvider, $httpProvider) {
	$routeProvider.when('/', {
		controller: 'PageController',
		templateUrl: 'views/welcome.html'
	})
	.when('/login', {
		controller: 'LoginCtrl',
		templateUrl: 'views/login.html'
	})
	.when('/signup', {
		controller: 'SignupCtrl',
		templateUrl: 'views/signup.html'
	})
	.when('/parts', {
		controller: 'PartCtrl',
		templateUrl: 'views/parts.html'
	})
	.when('/config', {
		controller: 'ConfigCtrl',
		templateUrl: 'views/config.html'
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