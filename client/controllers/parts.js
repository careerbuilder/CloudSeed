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

app.controller('PartCtrl', function($q, $http, $scope, $cookies, toastr, authservice, requirementsservice){
  $scope.auth = authservice;
  $scope.regions = [];
  $scope.addedParts = {};
  $scope.parts = {};
  $scope.stacks = [];
  $scope.partCount = 0;
  $scope.types = [{Label: 'None', Value: undefined}];
  $scope.build = {};
  $scope.build.Region = 'us-east-1';
  $scope.awspartsExpanded = true;
  $scope.subassembliesExpanded = false;
  $scope.showFilter = false;
  $scope.showSort = false;
  $scope.showGlobalVariables = false;
  $scope.globalVariables = [];
  $scope.sortOptions = [
    {Label: 'None', Value: {predicate: undefined, reverse: false}},
    {Label: 'Type: Ascending', Value: {predicate: 'Type', reverse: false}},
    {Label: 'Type: Descending', Value: {predicate: 'Type', reverse: true}},
    {Label: 'Name: Ascending', Value: {predicate: 'Name', reverse: false}},
    {Label: 'Name: Descending', Value: {predicate: 'Name', reverse: true}}];

  $scope.Resources={};

  $http.get('/api/parts').then(function(res){
    var data = res.data;
    if(data.Success){
      data.Data.forEach(function(x){
        $scope.parts[x.Type] = x;
      });
    }
    else{
      console.log(data.Error);
    }
  }, function(err){
    console.log(err);
    toastr.error('Error fetching parts');
  });

  $http.get('/api/stacks').then(function(res){
    var data = res.data;
    if(data.Success){
      $scope.stacks = data.Data;
      $scope.$emit('stacksUpdated', data.Data);
    }
    else{
      console.log(data.Error);
    }
  }, function(err){
    console.log(err);
    toastr.error('Error fetching stacks');
  });

  $http.get('/api/stacks/regions').then(function(res){
    var data = res.data;
    if(data.Success){
      $scope.regions = data.Regions;
    }
    else{
      console.log(data.Error);
    }
  }, function(err){
    console.log(err);
    toastr.error('Error fetching regions');
  });

  function replaceNames(obj, append){
    var newobj = {};
    for(var key in obj){
      newobj[key+""+append] = obj[key];
    }
    return newobj;
  }

  $scope.addPart=function(type){
    var num = 0;
    var others = [];
    for(var key in $scope.addedParts){
      var other = $scope.addedParts[key];
      if(other.Type == type){
        if(other.Count > num){
          num = other.Count;
        }
      }
    }
    var newcount = num+1;
    var copy = JSON.parse(JSON.stringify($scope.parts[type]));
    var connections = copy.Connections || {};
    var partstring = JSON.stringify(copy);
    for(var cond in copy.Conditions){
      var cre = new RegExp('"'+cond+'"', 'g');
      partstring = partstring.replace(cre, '"'+cond+''+newcount+'"');
    }
    for(var res in copy.Resources){
      var re = new RegExp('\\{\\s*"Ref"\\s*:\\s*'+ JSON.stringify(res) +'\\s*\\}', 'g');
      var re2 = new RegExp('\\{\\s*"Fn::GetAtt"\\s*:\\s*\\['+ JSON.stringify(res) +',\\s*', 'g');
      var re3 = new RegExp('"'+res+'\\|', 'g');
      partstring = partstring.replace(re, JSON.stringify({Ref:res+""+newcount}));
      partstring = partstring.replace(re2, '{"Fn::GetAtt":['+JSON.stringify(res+""+newcount)+',');
      partstring = partstring.replace(re3, '"'+res+newcount+'|');
    }
    copy = JSON.parse(partstring);
    copy.Resources = replaceNames(copy.Resources || {}, newcount);
    copy.Outputs = replaceNames(copy.Outputs || {}, newcount);
    for(var par in copy.Parameters){
      if ('Default' in copy.Parameters[par]){
        copy.Parameters[par].Value = copy.Parameters[par].Default;
      }
    }
    var mod = {Type: type, Count: newcount, RefID:type+""+newcount, Name:type+""+newcount, Collapsed: false, Definition:copy, EditingName: false, Origin: 'Local'};
    $scope.addedParts[mod.RefID]= mod;
    $scope.getTypes();
    $scope.countParts();
  };

  $scope.editPartName = function(part, name){
    part.Name = name;
    part.EditingName = false;
    part.inputName = undefined;
  };

  $scope.expandAll = function(partList){
    for (var i = 0; i < partList.length; i++){
      partList[i].Collapsed = false;
    }
  };

  $scope.collapseAll = function(partList){
    for (var i = 0; i < partList.length; i++){
      partList[i].Collapsed = true;
    }
  };

  $scope.showRequiredFields = function(){
    var invalidParts = [];
    var form = $scope.PartsForm;
    if (form.$invalid){
      for (var key in form){
        if (key.split('-')[0] == 'parametersForm' && form[key].$invalid){
          var name = key.split("-")[1];
          var added = false;
          for (var i = 0; i < invalidParts.length; i++){
            if (invalidParts[i] == name){
              added = true;
            }
          }
          if (!added){
            invalidParts.push(name);
          }
        }
      }
    }
    for(var j in $scope.addedParts){
      $scope.addedParts[j].Collapsed = true;
    }
    for (var k = 0; k < invalidParts.length; k++){
      $scope.addedParts[invalidParts[k]].Collapsed = false;
    }
  };

  $scope.getTypes = function(){
    var typesArr = [{Label: 'None', Value: undefined}];
    for (var key in $scope.addedParts){
      var type = $scope.addedParts[key].Type;
      var typeObj = {Label: type, Value: type};
      var found = false;
      for (var i = 0; i < typesArr.length; i++){
        if (typesArr[i].Label == type){
          found = true;
        }
      }
      if (!found){
        typesArr.push(typeObj);
      }
    }
    $scope.types = typesArr;
  };

  $scope.setGlobalVariable = function(varObj, index){
    if (varObj.inputName && varObj.inputName.length > 0){
      for (var i = 0; i < $scope.globalVariables.length; i++){
        if (varObj.inputName == $scope.globalVariables[i].Name){
          if (i !== index){
            return;
          }
        }
      }
      varObj.Name = '$' + varObj.inputName + ';';
      varObj.ID = varObj.inputID;
      varObj.editing = false;
    }
  };

  $scope.cancelGlobalVariableEdit = function(varObj, i){
    if (varObj.inputName && varObj.inputName.length > 0){
      varObj.editing = false;
    }else{
      $scope.globalVariables.splice(i, 1);
    }
  };

  $scope.getAWSOptions = function(type){
    var deferred;
    if(!($scope.build.Region in $scope.Resources)){
      $scope.Resources[$scope.build.Region]={};
    }
    if(type in $scope.Resources[$scope.build.Region] && $scope.Resources[$scope.build.Region][type].Values){
      deferred = $q.defer();
      deferred.resolve($scope.Resources[$scope.build.Region][type].Values);
    }
    else if(type in $scope.Resources[$scope.build.Region] && $scope.Resources[$scope.build.Region][type].Promise){
      deferred = $scope.Resources[$scope.build.Region][type].Promise;
    }
    else{
      deferred = $q.defer();
      $scope.Resources[$scope.build.Region][type] = {};
      $scope.Resources[$scope.build.Region][type].Promise = deferred;
      $http.get('/api/parts/awsvalues/' + type + '/?region=' + $scope.build.Region).then(function(res){
        var data = res.data;
        if(data.Success){
          for (var i = 0; i < data.Values.length; i++){
            data.Values[i].Origin = 'AWS';
          }
          $scope.Resources[$scope.build.Region][type].Values = data.Values;
          deferred.resolve(data.Values);
        }
        else{
          console.log(data.Error);
          deferred.reject("Fail");
        }
      }, function(err){
        console.log(err);
        deferred.reject("Fail");
        toastr.error('Error fetching ' + type + ' list');
      });
    }
    return deferred.promise;
  };

  $scope.getLocalOptions = function(type){
    var results = [];
    for (var key in $scope.addedParts){
      var part = $scope.addedParts[key];
      if (part.Type == type){
        part.ID = {"Ref": part.RefID};
        results.push(part);
      }
    }
    for (var i = 0; i < $scope.globalVariables.length; i++){
      var global = $scope.globalVariables[i];
      global.Origin = 'Global';
      results.push(global);
    }
    return results;
  };

  $scope.refreshOptions = function(paramValues){
    var newOptions = [];
    var type, locals;
    var promises = [];
    if(paramValues.Type.constructor === Array){
      for (var j = 0; j < paramValues.Type.length; j++){
        type = paramValues.Type[j];
        if (type.indexOf("List::") === 0){
          type = type.substring(6);
        }
        if (type.indexOf("AWS::") !== 0){
          locals = $scope.getLocalOptions(type);
          newOptions = newOptions.concat(locals);
        }
        else{
          promises.push($scope.getAWSOptions(type));
        }
      }
    }
    else{
      type = paramValues.Type;
      if (type.indexOf("List::") === 0){
        type = type.substring(6);
      }
      if (type.indexOf("AWS::") !== 0){
        locals = $scope.getLocalOptions(type);
        newOptions = newOptions.concat(locals);
      }
      else{
        promises.push($scope.getAWSOptions(type));
      }
    }
    $q.all(promises).then(function(awsResults){
      var merged = newOptions.concat(awsResults);
      var flattened = [].concat.apply([], merged);
      if (flattened.length > 0){
        paramValues.dropdownOptions = flattened;
      }
    });
  };

  $scope.getAllOptions = function(paramValues){
    var multi = false;
    var results = [];
    var promises = [];
    var typeList = paramValues.Type;
    var type;
    if (typeList.constructor === Array){
      for (var i = 0; i < typeList.length; i++){
        type = typeList[i];
        if (type.indexOf("List::") === 0){
          type = type.substring(6);
          multi = true;
        }
        if (type.indexOf("AWS::") === 0){
          promises.push($scope.getAWSOptions(type));
        }else{
          var locals = $scope.getLocalOptions(type);
          results = results.concat(locals);
        }
      }
    }
    else{
      type = typeList;
      if (type.indexOf("List::") === 0){
        type = type.substring(6);
        multi = true;
      }
      if (type.indexOf("AWS::") === 0){
        promises.push($scope.getAWSOptions(type));
      }else{
        results.push.apply($scope.getLocalOptions(type));
      }
    }
    $q.all(promises).then(function(awsResults){
      var merged = results.concat(awsResults);
      var flattened = [].concat.apply([], merged);
      if (flattened.length > 0){
        paramValues.dropdownOptions = flattened;
        paramValues.multipleOptions = multi;
      }
    });
  };

  $scope.requiredName=function(param, part, value){
    if($scope.checkRequiredParam(part, value)){
      return param+" *";
    }
    else{
      return param;
    }
  };

  $scope.removePart=function(refID){
    delete $scope.addedParts[refID];
    $scope.getTypes();
    $scope.countParts();
    $scope.globalVariables = [];
  };

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
  };

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
        part.subparts[key].push(JSON.parse(JSON.stringify(subpart.Model)));
      }
      else{
        part.subparts[key] = [JSON.parse(JSON.stringify(subpart.Model))];
      }
    }
  };

  $scope.removeSubPart=function(part, key, index){
    part.subparts[key].splice(index, 1);
  };

  $scope.checkRequired=function(part, key, index){
    return (index != part.subparts[key].length-1);
  };

  $scope.checkRequiredParam=function(part, value){
    return requirementsservice.ResolveRequired(part, value);
  };

  $scope.replaceRefs = function(apart){
    var partstring = angular.toJson(apart.Definition);
    for(var param in apart.Definition.Parameters){
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
      var pre = new RegExp('\\{\\s*"Ref"\\s*:\\s*'+ angular.toJson(param) +'\\s*\\}', 'g');
      if(apart.Definition.Parameters[param].Type === 'CommaDelimitedList'){
        paramValue = paramValue.split(/\s*,\s*/g);
      }
      partstring = partstring.replace(pre, angular.toJson(paramValue));
    }
    apart.Definition = JSON.parse(partstring);
    if(apart.subparts){
      for(var subp in apart.subparts){
        var models = apart.subparts[subp];
        var path = subp.split('|');
        var res = apart.Definition.Resources[path[0]];
        for(var x=1; x<path.length; x++){
          res = res[path[x]];
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
  };

  $scope.refreshStacks=function(){
    $http.get('/api/stacks/').then(function(res){
      var data = res.data;
      if(data.Success){
        $scope.stacks = data.Data;
        $scope.$emit('stacksUpdated', data.Data);
      }
    }, function(err){
      console.log(err);
      toastr.error('Error refreshing stacks');
    });
  };

  $scope.saveTemplate=function(){
    if($scope.build.Name){
      $scope.build.Ready = true;
      $scope.build.Variables = $scope.globalVariables;
      var template = {};
      template.Description = ($scope.build.Template || {Description:''}).Description;
      template.Resources = {};
      template.Outputs = {};
      template.Conditions = {};
      template.Mappings = {};
      var pieces = JSON.parse(JSON.stringify($scope.addedParts));
      for(var key in pieces){
        var piece = pieces[key];
        $scope.replaceRefs(piece);
        var part = piece.Definition;
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

      for (var i = 0; i < $scope.globalVariables.length; i++){
        var globalObj = $scope.globalVariables[i];
        var quoteName = globalObj.Name.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        var re = new RegExp(quoteName, "g");
        var templateString = angular.toJson($scope.build.Template);
        templateString = templateString.replace(re, JSON.parse(angular.toJson(globalObj.ID)));
        $scope.build.Template = JSON.parse(templateString);
      }

      $scope.build.Parts = JSON.parse(JSON.stringify($scope.addedParts));
      $http.post('/api/stacks', {build: $scope.build, user: $scope.auth.userinfo().email}).then(function(res){
        var data = res.data;
        if(data.Code === 400){
          toastr.success('Stack Saved', 'Your stack was saved successfully!');
        }
        else if(data.Code === 388){
          toastr.warning('Stack Saved with Errors', data.Message);
          console.log(data);
        }
        else{
          toastr.error(data.Message, data.Error||"");
          console.log(data);
        }
        $scope.refreshStacks();
      }, function(err){
        console.log(err);
        toastr.error('Error building stack');
      });
    }
  };

  $scope.loadTemplate=function(name){
    console.log("parts loading " + name);
    $http.get('/api/stacks/'+name).then(function(res){
      var data = res.data;
      if(data.Success){
        $scope.addedParts = data.Data.Parts;
        $scope.globalVariables = data.Data.Variables;
        delete data.Data.Variables;
        delete data.Data.Parts;
        delete data.Data.Template;
        $scope.build = data.Data;
        $scope.getTypes();
        $scope.countParts();
      }
    }, function(err){
      console.log(err);
      toastr.error('Error loading template');
    });
  };

  $scope.buildTemplate=function(stackname){
    $http.post('/api/stacks/build/' + stackname, {userid:$scope.auth.userinfo().confirm}).then(function(res){
      var data = res.data;
      if(data.Success){
        toastr.success("Template Built!");
        return true;
      }
      else{
        toastr.error(data.Error, "Something went wrong...");
        return false;
      }
    }, function(err){
      toastr.error(err, "Something went wrong...");
      return false;
    });
  };

  $scope.discardStack = function(){
    $scope.build ={Region:'us-east-1'};
    $scope.addedParts ={};
    $scope.getTypes();
    $scope.countParts();
    $scope.globalVariables = [];
  };

  $scope.toArray= function(object){
    var arr = [];
    for(var key in object){
      arr.push(object[key]);
    }
    return arr;
  };

  $scope.countParts = function(){
    var count = 0;
    for(var key in $scope.addedParts){
      count++;
    }
    $scope.partCount = count;
    return count;
  };

  $scope.$watch('build.Region', function(){
    for (var partKey in $scope.addedParts){
      var part = $scope.addedParts[partKey];
      for (var paramKey in part.Definition.Parameters){
        var paramValue = part.Definition.Parameters[paramKey];
        $scope.refreshOptions(paramValue);
      }
    }
  });
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
          ok &= (intval !== null && intval !== undefined);
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
