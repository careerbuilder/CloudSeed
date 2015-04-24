(function(){
  var app = angular.module('cloudseed', []);

  app.controller('PageController', function($http, $scope){
    $scope.showSide = false;

    $scope.toggleSide = function(){
      $scope.showSide = !$scope.showSide;
    };

  });

  app.controller('PartsController', function($http, $scope){
    $scope.addedParts = [];
    $scope.parts = [];
    $http.get('http://localhost:3000/api/parts').success(function(data){
      $scope.parts = data;
    });

    $scope.addPart=function(type){
      for(i=0; i<$scope.parts.length; i++){
        part = $scope.parts[i];
        copy = part.constructor();
        for (var attr in part) {
          if (part.hasOwnProperty(attr)) copy[attr] = part[attr];
        }
        break;
      }
      num = 0;
      for(j=0; j<$scope.addedParts.length; j++){
        other = $scope.addedParts[j];
        if(other.Type === type){
          if(other.Count > num){
            num = other.Count;
          }
        }
      }
      newcount = num+1;
      mod = {Type: type, Count: newcount, LogicalName:type+""+newcount, Collapsed: true, Definition:copy}
      $scope.addedParts.push(mod);
    }

    $scope.removePart=function(name){
      for(i=0; i<$scope.addedParts.length; i++){
        if($scope.addedParts[i].LogicalName === name){
          $scope.addedParts.splice(i, 1);
        }
      }
    }



  });

})();
