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
      copy = {};
      for(i=0; i<$scope.parts.length; i++){
        var part = $scope.parts[i];
        if(part.Type === type){
            copy = JSON.parse(JSON.stringify(part));
            break;
        }
      }
      var num = 0;
      for(j=0; j<$scope.addedParts.length; j++){
        other = $scope.addedParts[j];
        if(other.Type === type){
          if(other.Count > num){
            num = other.Count;
          }
        }
      }
      var newcount = num+1;
      var mod = {Type: type, Count: newcount, LogicalName:type+""+newcount, Collapsed: true, Definition:copy}
      $scope.addedParts.push(mod);
    }

    $scope.removePart=function(name){
      for(i=0; i<$scope.addedParts.length; i++){
        if($scope.addedParts[i].LogicalName === name){
          $scope.addedParts.splice(i, 1);
        }
      }
      for(j=0; j<$scope.addedParts.length; j++){
        var part = $scope.addedParts[j];
        for(k=0; k<part.Definition.Connections.Substitutes.length; k++){
          var sub = part.Definition.Connections.Substitutes[k];
          if(sub.Reference === name){
            $scope.setParam(part, sub, 'None');
          }
        }
      }
    }

    $scope.getSubs=function(subtype){
      if(subtype.lastIndexOf('List::',0) === 0){
        ct = subtype.replace('List::', '');
      }
      else{
        ct = subtype;
      }
      var subs = [];
      for(i=0; i<$scope.addedParts.length; i++){
        part = $scope.addedParts[i];
        if(part.Type === ct){
          subs.push(part.LogicalName);
        }
      }
      return subs;
    }

    $scope.RefInit=function(sub){
      if(sub.Type.lastIndexOf('List::', 0) === 0){
        sub.Reference = [];
      }
      else{
        sub.Reference = 'None';
      }
    }

    $scope.setParam=function(part, sub, name){
      var param = sub.Parameter;
      if(typeof(sub.Reference) == typeof("")){
        sub.Reference = name;
      }
      if(typeof(sub.Reference) == typeof([])){
        if(name === 'None'){
          sub.Reference = [];
        }else{
          var found = false;
          for(i=0; i<sub.Reference.length; i++){
            if(sub.Reference[i] === name){
              found = true;
              sub.Reference.splice(i,1);
              break;
            }
          }
          if(!found){
            sub.Reference.push(name);
          }
        }
      }
      part.Definition.Parameters[param].Hidden=(sub.Reference.length > 0 && sub.Reference!='None');
    }

    $scope.toggleParamList=function(part, sub, name){
      if(!sub.Reference.length){
        sub.Reference = [];
      }
      var param = sub.Parameter;

      part.Definition.Parameters[param].Hidden=(sub.Reference.length>0);
    }

  });

})();
