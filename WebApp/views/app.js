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
    $scope.build = {};
    $http.get('http://localhost:3000/api/parts').success(function(data){
      $scope.parts = data;
    });

    $scope.addPart=function(type){
      copy = {};
      for(var i=0; i<$scope.parts.length; i++){
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
      for(var i=0; i<$scope.addedParts.length; i++){
        if($scope.addedParts[i].LogicalName === name){
          $scope.addedParts.splice(i, 1);
        }
      }
      for(j=0; j<$scope.addedParts.length; j++){
        var part = $scope.addedParts[j];
        if(part.Definition.Connections){
          var subs = part.Definition.Connections.Substitutes || [];
          for(k=0; k<subs.length; k++){
            var sub = subs[k];
            if(sub.Reference === name){
              $scope.setParam(part, sub, 'None');
            }
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
      for(var i=0; i<$scope.addedParts.length; i++){
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
          for(var i=0; i<sub.Reference.length; i++){
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

    $scope.addSubPart=function(part,key){
      var subpart = part.Definition.Connections.SubParts[key];
      if(!part.subparts){
        part.subparts = {};
      }
      if(!part.subparts[key]){
        part.subparts[key] = [];
      }
      var isList = (subpart.Type.lastIndexOf('List::', 0) === 0);
      if(isList){
        part.subparts[key].push(JSON.parse(JSON.stringify(subpart['Model'])));
      }
      else{
        part.subparts[key] = [JSON.parse(JSON.stringify(subpart['Model']))];
      }
    }

    $scope.removeSubPart=function(part, key, index){
      part.subparts[key].splice(index, 1);
    }

    $scope.replaceNames = function(obj, append){
      var newobj = {};
      for(var key in obj){
        newobj[key+""+append] = obj[key];
      }
      return newobj;
    }

    $scope.replaceRefs = function(apart){
      var partstring = JSON.stringify(apart.Definition);
      for(var mapp in apart.Definition.Mappings){
        var re = new RegExp('\{\s*"Ref"\s*:\s*'+ JSON.stringify(mapp) +'\s*\}', 'g');
        partstring = partstring.replace(re, JSON.stringify({Ref:mapp+""+apart.Count}));
      }
      for(var cond in apart.Definition.Conditions){
        var re = new RegExp('\{\s*"Ref"\s*:\s*'+ JSON.stringify(cond) +'\s*\}', 'g');
        partstring = partstring.replace(re, JSON.stringify({Ref:cond+""+apart.Count}));
      }
      for(var res in apart.Definition.Resources){
        var re = new RegExp('\{\s*"Ref"\s*:\s*'+ JSON.stringify(res) +'\s*\}', 'g');
        partstring = partstring.replace(re, JSON.stringify({Ref:res+""+apart.Count}));
      }
      for(var param in apart.Definition.Parameters){
        if(!apart.Definition.Parameters[param].Hidden){
          var re = new RegExp('\{\s*"Ref"\s*:\s*'+ JSON.stringify(param) +'\s*\}', 'g');
          partstring = partstring.replace(re, JSON.stringify(apart.Definition.Parameters[param].Value));
        }
      }
      if(apart.Definition.Connections){
        var subs = apart.Definition.Connections.Substitutes || [];
        for(var i=0; i<subs.length; i++){
          sub = subs[i];
          if(sub.Reference.length > 0 && sub.Reference != 'None'){
            var re = new RegExp('\{\s*"Ref"\s*:\s*'+ JSON.stringify(sub.Parameter) +'\s*\}', 'g');
            partstring = partstring.replace(re, JSON.stringify({Ref:sub.Reference}));
          }
        }
      }
      apart.Definition = JSON.parse(partstring);
      apart.Definition.Mappings = $scope.replaceNames(apart.Definition.Mappings || {}, apart.Count);
      apart.Definition.Conditions = $scope.replaceNames(apart.Definition.Conditions || {}, apart.Count);
      apart.Definition.Resources = $scope.replaceNames(apart.Definition.Resources || {}, apart.Count);
      apart.Definition.Outputs = $scope.replaceNames(apart.Definition.Outputs || {}, apart.Count);
      if(apart.subparts){
        for(var subp in apart.subparts){
          var models = apart.subparts[subp];
          var path = subp.split('|');
          var res = apart.Definition.Resources[apart.LogicalName];
          for(var i=0; i<path.length; i++){
            res = res[path[i]];
          }
          for(j=0; j<models.length; j++){
            var sm = {};
            var model = models[j];
            var empty = false;
            for(mparam in model){
              if(!model[mparam].Value){
                empty = true;
                break;
              }
              sm[mparam] = model[mparam].Value;
            }
            if(!empty){
              res.push(sm);
            }
          }
        }
      }
    }

    $scope.printPart=function(part){
      $scope.replaceRefs(part);
      var partstring = JSON.stringify(part, null, 2);
      console.log(partstring);
    }

    $scope.saveTemplate=function(){
      var template = {};
      template.Resources = {};
      template.Outputs = {};
      template.Conditions = {};
      template.Mappings = {};
      for(var i=0; i<$scope.addedParts.length; i++){
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
      $scope.build.Template = template;
      $scope.build.Parts = JSON.parse(JSON.stringify($scope.addedParts));
      console.log(template);
      if($scope.build.Name && $scope.build.Region){
        $http.post('http://localhost:3000/api/stacks', $scope.build).success(function(data){
            console.log("saved template!")
        });
      }
    }

  });})();
