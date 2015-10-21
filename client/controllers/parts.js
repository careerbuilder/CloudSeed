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
'use strict';

app.controller('PartCtrl', function($http, $scope, $cookies, toastr, authservice, requirementsservice){
  $scope.auth = authservice;
  $scope.regions = [];
  $scope.addedParts = [];
  $scope.parts = [];
  $scope.stacks = [];
  $scope.build = {};
  $scope.awspartsExpanded = true;
  $scope.subassembliesExpanded = false;

  $http.get('/api/parts').success(function(data){
    if(data.Success){
      $scope.parts = data.Data;
    }
    else{
      console.log(data.Error);
    }
  });
  $http.get('/api/stacks').success(function(data){
    if(data.Success){
      $scope.stacks = data.Data;
      $scope.$emit('stacksUpdated', data.Data);
    }
    else{
      console.log(data.Error);
    }
  });
  $http.get('/api/stacks/regions').success(function(data){
    if(data.Success){
      $scope.regions = data.Regions;
    }
    else{
      console.log(data.Error);
    }
  });

  $scope.addPart=function(type){
    var num = 0;
    var newcount = 1;
    var others = [];
    for(var j=0; j<$scope.addedParts.length; j++){
      var other = $scope.addedParts[j];
      if(other.Type === type){
        others.push(other.Count);
        if(other.Count > num){
          num = other.Count;
        }
      }
    }
    for(var k=1; k<=num+1; k++){
      if(others.indexOf(k) == -1){
        newcount = k;
        break;
      }
    }
    var copy = {};
    for(var i=0; i<$scope.parts.length; i++){
      var part = $scope.parts[i];
      if(part.Type === type){
          copy = JSON.parse(JSON.stringify(part));
          break;
      }
    }
    var connections = copy.Connections || {Substitutes:[]};
    var subs = connections.Substitutes || [];
    var partstring = JSON.stringify(copy);
    var subsString = JSON.stringify(subs);
    for(var cond in copy.Conditions){
      var re = new RegExp('"'+cond+'"', 'g');
      partstring = partstring.replace(re, '"'+cond+''+newcount+'"');
    }
    for(var res in copy.Resources){
      var re = new RegExp('\{\s*"Ref"\s*:\s*'+ JSON.stringify(res) +'\s*\}', 'g');
      var re2 = new RegExp('\{\s*"Fn::GetAtt"\s*:\s*\['+ JSON.stringify(res) +',\s*', 'g');
      partstring = partstring.replace(re, JSON.stringify({Ref:res+""+newcount}));
      partstring = partstring.replace(re2, '{"Fn::GetAtt":['+JSON.stringify(res+""+newcount)+','));
      subsString = subsString.replace('\"' + res + '\"', '\"' + res+""+newcount + '\"');
    }
    copy = JSON.parse(partstring);
    copy.Connections.Substitutes = JSON.parse(subsString);
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

  $scope.requiredName=function(param, part, value){
    if($scope.checkRequiredParam(part, value)){
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
    for(var j=0; j<$scope.addedParts.length; j++){
      var part = $scope.addedParts[j];
      if(part.Definition.Connections){
        var subs = part.Definition.Connections.Substitutes || [];
        for(var k=0; k<subs.length; k++){
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
      var ct = subtype.replace('List::', '');
    }
    else{
      var ct = subtype;
    }
    var subs = [];
    for(var i=0; i<$scope.addedParts.length; i++){
      var part = $scope.addedParts[i];
      if(part.Type === ct){
        subs.push(part.LogicalName);
      }
    }
    return subs;
  }

  $scope.getReferences=function(sub){
    var refstring = "";
    if(!sub.Reference || sub.Reference.length<1 || sub.Reference === 'None'){
      return "None";
    }
    if(sub.Type.lastIndexOf('List::', 0) === 0){
      if(sub.Reference)
      sub.Reference.forEach(function(ref, i){
        refstring += ref.Ref + ", ";
      });
      return refstring.substring(0,refstring.length-2);
    }
    else{
      return sub.Reference.Ref;
    }
  }

  $scope.RefInit=function(sub){
    if(!sub.Reference){
      if(sub.Type.lastIndexOf('List::', 0) === 0){
        sub.Reference = [];
      }
      else{
        sub.Reference = {Ref:'None'};
      }
    }
  }

  $scope.subdisabled=function(part, sub){
    return requirementsservice.isSubDisabled(part, sub);
  }

  $scope.setParam=function(part, sub, name){
    var param = sub.Parameter;
    var isList = (sub.Type.indexOf("List::") == 0);
    if(!isList){
      sub.Reference = {Ref: name};
    }
    else if(isList){
      if(name === 'None'){
        sub.Reference = [];
      }else{
        var found = false;
        for(var i=0; i<sub.Reference.length; i++){
          if(sub.Reference[i].Ref === name){
            found = true;
            sub.Reference.splice(i,1);
            break;
          }
        }
        if(!found){
          sub.Reference.push({Ref:name});
        }
      }
    }
    part.Definition.Parameters[param].Hidden=((isList && sub.Reference.length > 0) || (!isList && sub.Reference.Ref!='None'));
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
    var required = (index != part.subparts[key].length-1);
    return required;
  }



  $scope.checkRequiredParam=function(part, value){
    return requirementsservice.ResolveRequired(part, value);
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
        var paramValue = apart.Definition.Parameters[param].Value;
        if(!paramValue || apart.Definition.Parameters[param].Disabled){
          if('Default' in apart.Definition.Parameters[param]){
            paramValue = apart.Definition.Parameters[param].Default;
          }
          else{
            console.log('No default on excluded value!', apart);
            return;
          }
        }
        var re = new RegExp('\{\s*"Ref"\s*:\s*'+ JSON.stringify(param) +'\s*\}', 'g');
        if(apart.Definition.Parameters[param].Type === 'CommaDelimitedList'){
          paramValue = paramValue.split(/\s*,\s*/g);
        }
        partstring = partstring.replace(re, JSON.stringify(paramValue));
      }
    }
    var replace_conds = [];
    if(apart.Definition.Connections){
      var subs = apart.Definition.Connections.Substitutes || [];
      for(var i=0; i<subs.length; i++){
        var sub = subs[i];
        if(apart.Definition.Conditions){
          replace_conds.push(sub.Reference.Ref);
        }
        var isList = (sub.Type.indexOf("List::")==0);
        if((isList && sub.Reference.length > 0) || (!isList && sub.Reference.Ref!='None')){
          var re = new RegExp('\{\s*"Ref"\s*:\s*'+ JSON.stringify(sub.Parameter) +'\s*\}', 'g');
          partstring = partstring.replace(re, JSON.stringify(sub.Reference));
        }
      }
    }
    apart.Definition = JSON.parse(partstring);
    if(apart.Definition.Conditions){
      var condstring = JSON.stringify(apart.Definition.Conditions);
      replace_conds.forEach(function(rc){
        var rcname = JSON.stringify(rc);
        var cre = new RegExp('\{\s*"Ref"\s*:\s*'+ rcname +'\s*\}', 'g');
        condstring = condstring.replace(cre, rcname);
      });
      apart.Definition.Conditions = JSON.parse(condstring);
    }
    if(apart.Definition.Connections && apart.Definition.Connections.Substitutes){
      var subs = apart.Definition.Connections.Substitutes;
      subs.forEach(function(sub, i){
        var isList = (sub.Type.indexOf("List::")==0);
        if(sub.Dependent){
          if((isList && sub.Reference.length > 0) || (!isList && sub.Reference.Ref!='None')){
            var dep;
            if(isList){
              dep = [];
              sub.Reference.forEach(function(ref){
                dep.push(ref.Ref);
              });
            }
            else{
              dep = sub.Reference.Ref;
            }
            apart.Definition.Resources[sub.Dependent].DependsOn = dep;
          }
        }
      });
    }
    if(apart.subparts){
      for(var subp in apart.subparts){
        var models = apart.subparts[subp];
        var path = subp.split('|');
        var res = apart.Definition.Resources[apart.LogicalName];
        for(var i=0; i<path.length; i++){
          res = res[path[i]];
        }
        for(var j=0; j<models.length; j++){
          var sm = {};
          var model = models[j];
          var empty = false;
          for(var mparam in model){
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
    $http.get('/api/stacks/').success(function(data){
      if(data.Success){
        $scope.stacks = data.Data;
        $scope.$emit('stacksUpdated', data.Data);
      }
    });
  }

  $scope.saveTemplate=function(){
    if($scope.build.Name){
      $scope.build.Ready = true;
      var template = {};
      template.Description = $scope.build.Template.Description;
      template.Resources = {};
      template.Outputs = {};
      template.Conditions = {};
      template.Mappings = {};
      var pieces = JSON.parse(JSON.stringify($scope.addedParts));
      for(var i=0; i<pieces.length; i++){
        $scope.replaceRefs(pieces[i]);
        var part = pieces[i].Definition;
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
      $http.post('/api/stacks', {build: $scope.build, user: $scope.auth.userinfo().email}).success(function(data){
          if(data['Code'] === 400){
            toastr.success('Stack Saved', 'Your stack was saved successfully!');
          }
          else if(data['Code'] === 388){
            toastr.warning('Stack Saved with Errors', data['Message']);
            console.log(data);
          }
          else{
            toastr.error(data['Message'], data['Error']||"");
            console.log(data);
          }
          $scope.refreshStacks();
      });
    }
  }

  $scope.loadTemplate=function(name){
    console.log("parts loading " + name);
    $http.get('/api/stacks/'+name).success(function(data){
      if(data.Success){
        $scope.build = JSON.parse(JSON.stringify(data.Data));
        $scope.addedParts = JSON.parse(JSON.stringify(data.Data.Parts));
      }
    });
  }

  $scope.buildTemplate=function(stackname){
    $http.post('/api/stacks/build/' + stackname, {userid:$scope.auth.userinfo().confirm}).success(function(data){
      if(data.Success){
        toastr.success("Template Built!");
        return true;
      }
      else{
        toastr.error(data.Error, "Something went wrong...");
        return false;
      }
    }).
    error(function(err){
      toastr.error(err, "Something went wrong...");
      return false;
    });
  }

  $scope.discardStack = function(){
    $scope.build ={};
    $scope.addedParts =[];
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
