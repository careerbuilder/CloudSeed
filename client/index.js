'use strict';

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


app.controller('PageController', function($http, $scope, $location, $cookies, $cookieStore, toastr){
  $scope.auth = $cookies.c_s66d || null;
  if($scope.auth){
    $http.get('http://localhost:3000/api/users/'+$scope.auth).success(function(err, results){
      if(results.Success){
        $scope.user = results.user;
      }
    });
  }

  $scope.stacks = [];

  $scope.$on('loginSuccess', function(event, user){
    $scope.auth = user._id;
    $scope.user = user;
    toastr.success("Welcome to Cloudseed!");
  });

  $scope.$on('stacksUpdated', function(event, data){
    $scope.stacks = data;
  });

  $scope.loggedin = function(){
    if($scope.auth || $cookies.c_s66d){
      return true;
    }
    return false;
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
