angular.module('login', [])

.controller('LoginController',  ['$scope', function($scope) {
  $scope.template = { name: 'login.html', url: 'login.html'};
  }]);
