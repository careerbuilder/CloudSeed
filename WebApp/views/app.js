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
      var newcount = 1;
      var others = [];
      for(j=0; j<$scope.addedParts.length; j++){
        other = $scope.addedParts[j];
        if(other.Type === type){
          others.push(other.Count);
          if(other.Count > num){
            num = other.Count;
          }
        }
      }
      for(k=1; k<=num+1; k++){
        if(others.indexOf(k) == -1){
          newcount = k;
          break;
        }
      }

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

    $scope.replaceNames = function(obj, append){
      var newobj = {};
      for(var key in obj){
        newobj[key+""+append] = obj[key];
      }
      return newobj;
    }

    $scope.replaceRefs = function(apart){
      var resstring = JSON.stringify($scope.replaceNames(apart.Definition.Resources || {}, apart.Count));
      var outputstring = JSON.stringify($scope.replaceNames(apart.Definition.Outputs || {}, apart.Count));
      var condstring = JSON.stringify($scope.replaceNames(apart.Definition.Conditions || {}, apart.Count));
      for(var param in apart.Definition.Parameters){
        if(!apart.Definition.Parameters[param].Hidden){
          var re = new RegExp('\{\s*"Ref"\s*:\s*"'+ param +'"\s*\}', 'g');
          resstring = resstring.replace(re, JSON.stringify(apart.Definition.Parameters[param].Value));
          outputstring = outputstring.replace(re, JSON.stringify(apart.Definition.Parameters[param].Value));
          condstring = condstring.replace(re, JSON.stringify(apart.Definition.Parameters[param].Value));
        }
      }
      var subs = apart.Definition.Connections.Substitutes || [];
      for(i=0; i<subs.length; i++){
        sub = subs[i];
        if(sub.Reference.length > 0 && sub.Reference != 'None'){
          var re = new RegExp('\{\s*"Ref"\s*:\s*"'+ sub.Parameter +'"\s*\}', 'g');
          resstring = resstring.replace(re, JSON.stringify({Ref:sub.Reference}));
          outputstring = outputstring.replace(re, JSON.stringify({Ref:sub.Reference}));
          condstring = condstring.replace(re, JSON.stringify({Ref:sub.Reference}));
        }
      }
      apart.Definition.Resources = JSON.parse(resstring);
      apart.Definition.Outputs = JSON.parse(outputstring);
      apart.Definition.Conditions = JSON.parse(condstring);
      //apart.Definition.Parameters = {};
    }

    $scope.printPart=function(part){
      $scope.replaceRefs(part);
      var partstring = JSON.stringify(part, null, 2);
      console.log(partstring);
    }

    $scope.buildStack=function(){
      var template = {};
      template.Resources = {};
      template.Outputs = {};
      template.Conditions = {};
      template.Mappings = {};
      for(i=0; i<$scope.addedParts.length; i++){
        $scope.replaceRefs($scope.addedParts[i]);
        var part = $scope.addedParts[i].Definition;
        for(var mapkey in part.Mappings){
          template.Mappings[mapkey] = JSON.parse(JSON.stringify(part.Mappings[mapkey]));
        }
        for(var condkey in part.Conditions){
          template.Conditions[condkey] = JSON.parse(JSON.stringify(part.Conditions[condkey]));
        }
        for(var reskey in part.Resources){
          template.Resources[reskey] = JSON.parse(JSON.stringify(part.Resources[reskey]));
        }
        for(var outkey in part.Outputs){
          template.Outputs[outkey] = JSON.parse(JSON.stringify(part.Outputs[outkey]));
        }
      }
      console.log(template);
      $http.post('http://localhost:3000/api/stacks', {Name: 'TestStack2', Stack: template}).success(function(data){
          console.log("saved template!")
      });
    }

  });})();
