(function(){
  var app = angular.module('cloudseed', []);

  app.controller('PartsController', function($http, $scope){
    $http.get('http://localhost:3000/api/parts').success(function(data){
      $scope.parts = data;
    });
  });

})();
