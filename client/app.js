(function(){
  var app = angular.module('cloudseed', ['ngAnimate', 'ngCookies', 'toastr']);


  app.controller('PartsController', function($http, $scope, $cookies, toastr){
    $.material.init();
    $scope.register = "Log in";
    $scope.notRegister= "Register";
    $scope.auth = {};
    $scope.user = {};
    $scope.regions = [];
    $scope.addedParts = [];
    $scope.parts = [];
    $scope.stacks = [];
    $scope.build = {};
    $http.get('http://52.6.247.162:3000/api/parts').success(function(data){
      $scope.parts = data;
    });
    $http.get('http://52.6.247.162:3000/api/stacks').success(function(data){
      $scope.stacks = data;
    });
    if($cookies.c_s66d){
      $http.get('http://52.6.247.162:3000/api/user/'+$cookies.c_s66d).success(function(data){
        $scope.user = data.user;
        $http.post('http://52.6.247.162:3000/api/regions/', {accesskey: $scope.user.accesskey, secretkey: $scope.user.secretkey}).success(function(data){
          if(data.Success){
            $scope.regions = data.Regions;
          }
        });
      });
    }


    $scope.toggleSignup=function(){
      var temp = $scope.register;
      $scope.register = $scope.notRegister;
      $scope.notRegister = temp;
    }

    $scope.UserInfoBtn_click=function(){
      var err = "";
      if($scope.register === 'Log in'){
        $http.post('http://52.6.247.162:3000/api/login', $scope.auth).success(function(data, status){
          if(status != 200){
            err = "Endpoint cannot be reached";
          }
          else{
            if(data.Success){
              $scope.user = data.user;
              $cookies.c_s66d = data.user._id;
              toastr.success("Welcome to Cloudseed!");
            }
            else{
              err = data.Error;
              toastr.error(err);
            }
          }
        }).
        error(function(data, status, headers, config) {
          console.log(data);
          toastr.error('Check back soon!', 'Endpoint cannot be reached');
        });
      }
      else if($scope.register === 'Register'){
        $http.post('http://52.6.247.162:3000/api/register', $scope.auth).success(function(data, status){
          if(status != 200){
            err = "Endpoint cannot be reached";
            toastr.warning(err, "This is awkward...");
          }
          else{
            if(data.Success){
              $cookies.c_s66d = data.user._id;
              $scope.user = data.user;
              toastr.success("Welcome to Cloudseed!");
            }
            else{
              toastr.error(data.Error);
            }
          }
        }).
        error(function(data, status, headers, config) {
          console.log(data);
          toastr.error('Check back soon!', 'Endpoint cannot be reached');
        });
      }
      else{
        console.log('Nice try...');
      }
    }

    $scope.loggedin=function(){
      var valid = $cookies.c_s66d;
      return valid;
    }

    $scope.logOut=function(){
      $scope.user={};
      $scope.auth={};
      $cookies.c_s66d = undefined;
    }

    $scope.addPart=function(type){
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
      copy = {};
      for(var i=0; i<$scope.parts.length; i++){
        var part = $scope.parts[i];
        if(part.Type === type){
            copy = JSON.parse(JSON.stringify(part));
            break;
        }
      }
      var partstring = JSON.stringify(copy);
/*
      for(var mapp in copy.Mappings){
        var re = new RegExp('\{\s*"Ref"\s*:\s*'+ JSON.stringify(mapp) +'\s*\}', 'g');
        partstring = partstring.replace(re, JSON.stringify({Ref:mapp+""+newcount}));
      }
*/
      for(var cond in copy.Conditions){
        var re = new RegExp('"'+cond+'"', 'g');
        partstring = partstring.replace(re, '"'+cond+''+newcount+'"');
      }
      for(var res in copy.Resources){
        var re = new RegExp('\{\s*"Ref"\s*:\s*'+ JSON.stringify(res) +'\s*\}', 'g');
        partstring = partstring.replace(re, JSON.stringify({Ref:res+""+newcount}));
      }
      copy = JSON.parse(partstring);
      //copy.Mappings = $scope.replaceNames(copy.Mappings || {}, newcount);
      //copy.Conditions = $scope.replaceNames(copy.Conditions || {}, newcount);
      copy.Resources = $scope.replaceNames(copy.Resources || {}, newcount);
      copy.Outputs = $scope.replaceNames(copy.Outputs || {}, newcount);
      for(var par in copy.Parameters){
        if(copy.Parameters[par].Default){
          copy.Parameters[par].Value = copy.Parameters[par].Default;
        }
      }
      var mod = {Type: type, Count: newcount, LogicalName:type+""+newcount, Collapsed: false, Definition:copy}
      $scope.addedParts.push(mod);
    }

    $scope.requiredName=function(param, value){
      if($scope.checkRequiredParam(value)){
        return param+" *";
      }
      else{
        return param;
      }
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
      if($scope.addedParts.length === 0){
        $scope.build = {};
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
      if(!sub.Reference){
        if(sub.Type.lastIndexOf('List::', 0) === 0){
          sub.Reference = [];
        }
        else{
          sub.Reference = 'None';
        }
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

    $scope.canAddSubPart=function(part, name, index){
      if(index != part.subparts[name].length-1){
        return false;
      }
      var complete = true;
      for(var param in part.subparts[name][index]){
        if(!part.subparts[name][index][param].Value || part.subparts[name][index][param].Value.length <1){
          complete = false;
          break;
        }
      }
      return complete;
    }

    $scope.addSubPart=function(part,key){
      var subpart = part.Definition.Connections.SubParts[key];
      if(!part.subparts){
        part.subparts = {};
      }
      if(!part.subparts[key]){
        part.subparts[key] = [];
      }
      if($scope.canAddSubPart(part, key, part.subparts[key].length-1)){
        var isList = (subpart.Type.lastIndexOf('List::', 0) === 0);
        if(isList){
          part.subparts[key].push(JSON.parse(JSON.stringify(subpart['Model'])));
        }
        else{
          part.subparts[key] = [JSON.parse(JSON.stringify(subpart['Model']))];
        }
      }
    }

    $scope.removeSubPart=function(part, key, index){
      part.subparts[key].splice(index, 1);
    }

    $scope.checkRequired=function(part, key, index){
      //console.log("key: " + key +", index" +index);
      var required = (index != part.subparts[key].length-1);
      return required;
    }

    $scope.checkRequiredParam=function(value){
      //console.log(value);
      var req = !value.Hidden && (value.Default === null || value.Default === undefined);
      //console.log(req);
      return(req);
    }

    $scope.visibleParams=function(part){
      var num = 0;
      for(var param in part.Definition.Parameters){
        if(!part.Definition.Parameters[param].Hidden){
          num++;
        }
      }
      return num;
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

    $scope.refreshStacks=function(){
      $http.get('http://52.6.247:3000/api/stacks').success(function(data){
        $scope.stacks = data;
      });
    }

    $scope.saveTemplate=function(){
      if($scope.build.Name){
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
        //$scope.build.Name = $scope.build.Name;
        $http.post('http://52.6.247.162:3000/api/stacks', $scope.build).success(function(data){
            console.log(data);
            if(data['Code'] === 400){
              toastr.success('Stack Saved', 'Your stack was saved successfully!');
            }
            else if(data['Code'] === 399){
              toastr.warning('Stack Saved with Errors', data['Message']);
            }
            else{
              toastr.error(data['Message'], data['Error']||"");
            }
            $scope.refreshStacks();
        });
      }
    }

    $scope.loadTemplate=function(name){
      $http.get('http://52.6.247.162:3000/api/stacks/'+name).success(function(data){
        $scope.build = data[0];
        $scope.addedParts = data[0]['Parts'];
      });
    }

    $scope.buildTemplate=function(stackname){
      var auth = {accesskey: $scope.user.accesskey, secretkey: $scope.user.secretkey};
      $http.post('http://52.6.247.162:3000/api/build/' + stackname, auth).success(function(data){
        toastr.success("Template Built!");
      }).
      error(function(err){
        toastr.error(err, "Something went wrong...");
      });
    }

  });

  app.directive("compareTo", function() {
    return {
        require: "ngModel",
        scope: {
            otherModelValue: "=compareTo"
        },
        link: function(scope, element, attributes, ctrl) {
            ctrl.$validators.compareTo = function(modelValue) {
                return modelValue === scope.otherModelValue;
            };
        }
    };
  });

  app.directive('parameter', function(){
    return {
      require: 'ngModel',
      link: function(scope, elm, attrs, ctrl) {
        var info = JSON.parse(attrs.validationModel);
        //console.log(JSON.stringify(info,null,2));
        ctrl.$validators.parameter = function(modelValue, viewValue) {
          var ok = true;
          if(ctrl.$isEmpty(viewValue)) {
            if(!attrs.required){
              return true;
            }
            return false;
          }
          var typedvalue = JSON.parse(JSON.stringify(viewValue));
          if(info.AllowedValues){
            var avs = info.AllowedValues;
            var found = false;
            for(var i=0; i<avs.length; i++){
              if(typedvalue===avs[i]){
                found = true;
                break;
              }
            }
            ok &= found;
          }
          if(info.AllowedPattern){
            var re = new RegExp('^'+info.AllowedPattern+'$', 'g');
            ok = (re.test(typedvalue));
          }
          //types
          if(info.Type === "Number"){
            var intval = parseInt(typedvalue);
            ok &= (intval != null && intval != undefined);
            if(info.MaxValue){
              ok &= (intval <= parseInt(info.MaxValue));
            }
            if(info.MinValue){
              ok &= (intval >= parseInt(info.MinValue));
            }
          }
          if(info.Type === "String"){
            ok &= (typeof(typedvalue)===typeof(""));
            if(info.MaxLength){
              ok &= (typedvalue.length <= JSON.parse(info.MaxLength));
            }
            if(info.MinLength){
              ok &= (typedvalue.length >= JSON.parse(info.MinLength));
            }
          }
          return (ok == 1);
        };
      }
    };
  });

  })();
