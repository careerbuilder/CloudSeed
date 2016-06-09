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
  $scope.vpcs = [];
  $scope.subnets = [];
  $scope.awspartsExpanded = true;
  $scope.subassembliesExpanded = false;
  $scope.showFilter = false;
  $scope.sortOptions = [
    {Label: 'None', Value: {predicate: undefined, reverse: false}},
    {Label: 'Type: Ascending', Value: {predicate: 'Type', reverse: false}},
    {Label: 'Type: Descending', Value: {predicate: 'Type', reverse: true}},
    {Label: 'Name: Ascending', Value: {predicate: 'Name', reverse: false}},
    {Label: 'Name: Descending', Value: {predicate: 'Name', reverse: true}}];



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

  $http.get('/api/stacks/vpcs').then(function(res){
    var data = res.data;
    if(data.Success){
      $scope.vpcs = data.Vpcs;
    }
    else{
      console.log(data.Error);
    }
  }, function(err){
    console.log(err);
    toastr.error('Error fetching Vpcs');
  });

  $http.get('/api/stacks/subnets').then(function(res){
    var data = res.data;
    if(data.Success){
      $scope.subnets = data.Subnets;
    }
    else{
      console.log(data.Error);
    }
  }, function(err){
    console.log(err);
    toastr.error('Error fetching Subnets');
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
    var connections = copy.Connections || {Substitutes:[]};
    var subs = connections.Substitutes || [];
    var partstring = JSON.stringify(copy);
    var subsString = JSON.stringify(subs);
    for(var cond in copy.Conditions){
      var cre = new RegExp('"'+cond+'"', 'g');
      partstring = partstring.replace(cre, '"'+cond+''+newcount+'"');
    }
    for(var res in copy.Resources){
      var re = new RegExp('\\{\\s*"Ref"\\s*:\\s*'+ JSON.stringify(res) +'\\s*\\}', 'g');
      var re2 = new RegExp('\\{\\s*"Fn::GetAtt"\\s*:\\s*\\['+ JSON.stringify(res) +',\\s*', 'g');
      partstring = partstring.replace(re, JSON.stringify({Ref:res+""+newcount}));
      partstring = partstring.replace(re2, '{"Fn::GetAtt":['+JSON.stringify(res+""+newcount)+',');
      subsString = subsString.replace('"' + res + '"', '"' + res+""+newcount + '"');
    }
    copy = JSON.parse(partstring);
    copy.Connections.Substitutes = JSON.parse(subsString);
    copy.Resources = replaceNames(copy.Resources || {}, newcount);
    copy.Outputs = replaceNames(copy.Outputs || {}, newcount);
    for(var par in copy.Parameters){
      if(copy.Parameters[par].Default){
        copy.Parameters[par].Value = copy.Parameters[par].Default;
      }
    }
    var mod = {Type: type, Count: newcount, RefID:type+""+newcount, Name:type+""+newcount, Collapsed: false, Definition:copy, EditingName: false};
    $scope.addedParts[mod.RefID]= mod;
    $scope.getTypes();
    $scope.countParts();
  };

  $scope.editPartName = function(part, name){
    part.Name = name;
    part.EditingName = false;
    part.inputName = undefined;
    console.log($scope.addedParts);
  };

  $scope.getTypes = function(){
    var typesArr = [{Label: 'None', Value: undefined}];
    for (var key in $scope.addedParts){
      var type = $scope.addedParts[key].Type;
      if(typesArr.indexOf(type)<0){
        typesArr.push({Label: type, Value: type});
      }
    }
    $scope.types = typesArr;
  };

  $scope.getAWSOptions = function(type, results){

    var deferred = $q.defer();

    $http.get('/api/parts/awsvalues/' + type + '/?region=' + $scope.build.Region).then(function(res){
      var data = res.data;
      if(data.Success){
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
    console.log('local options: ', results);
    return results;
  };

  $scope.refreshLocalOptions = function(paramValues){
    console.log('refreshing local options');
    for (var i = 0; i < paramValues.dropdownOptions.length; i++){
      if ('Definition' in paramValues.dropdownOptions[i]){
        paramValues.dropdownOptions.splice(i, 1);
      }
    }

    var localOptions = [];
    for (var i = 0; i < paramValues.Type.length; i++){
      var type = paramValues.Type[i];
      if (type.indexOf("List::") === 0){
        type = type.substring(6);
      }
      if (type.indexOf("AWS::") !== 0){
        var locals = $scope.getLocalOptions(type);
        localOptions = localOptions.concat(locals);
      }
    }

    paramValues.dropdownOptions = paramValues.dropdownOptions.concat(localOptions);
    console.log(paramValues.dropdownOptions);
  };

  $scope.getAllOptions = function(paramValues){
    var multi = false;
    var results = [];
    var promises = [];
    var typeList = paramValues.Type;

    if (typeList.constructor === Array){
      for (var i = 0; i < typeList.length; i++){
        var type = typeList[i];
        console.log(type);
        if (type.indexOf("List::") === 0){
          type = type.substring(6);
          multi = true;
        }

        if (type.indexOf("AWS::") === 0){
          promises.push($scope.getAWSOptions(type));
        }else{
          var locals = $scope.getLocalOptions(type);
          results = results.concat(locals);
          console.log('After getting local options results are now: ', results);
        }
      }
    }else{
      var type = typeList;
      if (type.indexOf("List::") === 0){
        type = type.substring(6);
        multi = true;
      }
      if (type.indexOf("AWS::") === 0){
        promises.push($scope.getAWSOptions(type, results));
      }else{
        results.push.apply($scope.getLocalOptions(type));
      }
    }
    $q.all(promises).then(function(awsResults){
      var merged = results.concat(awsResults);
      var flattened = [].concat.apply([], merged);
      console.log(flattened);
      paramValues.dropdownOptions = flattened;
      paramValues.multipleOptions = multi;
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

  /* TODO: Update New Substitutes construct */
  $scope.removePart=function(refID){
    delete $scope.addedParts[refID];
    for(var key in $scope.addedParts){
      var part = $scope.addedParts[key];
      if(part.Definition.Connections){
        var subs = part.Definition.Connections.Substitutes || [];
        for(var k=0; k<subs.length; k++){
          var sub = subs[k];
          if(sub.Reference === refID){
            $scope.setParam(part, sub, 'None');
          }
        }
      }
    }
    if(Object.keys($scope.addedParts).length === 0){
      //discard build
      $scope.build = {};
      return;
    }
    $scope.getTypes();
    $scope.countParts();
  };

  $scope.getSubs=function(subtype){
    var ct;
    if(subtype.lastIndexOf('List::',0) === 0){
      ct = subtype.replace('List::', '');
    }
    else{
      ct = subtype;
    }
    var subs = [];
    for(var key in $scope.addedParts){
      var part = $scope.addedParts[key];
      /* TODO: push entinre sub object */
      if(part.Type === ct){
        subs.push(part.RefID);
      }
    }
    return subs;
  };

  /* TODO: build reference to object */
  $scope.getReferences=function(sub){
    var refstring = "";
    if(!sub.Reference || sub.Reference.length<1 || sub.Reference === 'None'){
      return "None";
    }
    if(sub.Type.lastIndexOf('List::', 0) === 0){
      if(sub.Reference){
        sub.Reference.forEach(function(ref, i){
          refstring += ref.Ref + ", ";
        });
      }
      return refstring.substring(0,refstring.length-2);
    }
    else{
      return sub.Reference.Ref;
    }
  };

  $scope.RefInit=function(sub){
    if(!sub.Reference){
      if(sub.Type.lastIndexOf('List::', 0) === 0){
        sub.Reference = [];
      }
      else{
        /* TODO: FIX */
        sub.Reference = {Ref:'None'};
      }
    }
  };

  $scope.subdisabled=function(part, sub){
    return requirementsservice.isSubDisabled(part, sub);
  };

  /* TODO: Remove entirely */
  $scope.setParam=function(part, sub, name){
    var param = sub.Parameter;
    var isList = (sub.Type.indexOf("List::") === 0);
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

  /* Deprecated */
  $scope.visibleParams=function(part){
    var num = 0;
    for(var param in part.Definition.Parameters){
      if(!part.Definition.Parameters[param].Hidden){
        num++;
      }
    }
    return num;
  };

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
        var pre = new RegExp('\\{\\s*"Ref"\\s*:\\s*'+ JSON.stringify(param) +'\\s*\\}', 'g');
        if(apart.Definition.Parameters[param].Type === 'CommaDelimitedList'){
          paramValue = paramValue.split(/\s*,\s*/g);
        }
        partstring = partstring.replace(pre, JSON.stringify(paramValue));
      }
    }
    var replace_conds = [];
    if(apart.Definition.Connections){
      var csubs = apart.Definition.Connections.Substitutes || [];
      for(var i=0; i<csubs.length; i++){
        var sub = csubs[i];
        if(apart.Definition.Conditions){
          replace_conds.push(sub.Reference.Ref);
        }
        var isList = (sub.Type.indexOf("List::")===0);
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
        var isList = (sub.Type.indexOf("List::")===0);
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
        var res = apart.Definition.Resources[apart.Name];
        for(var x=0; x<path.length; x++){
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
      var template = {};
      template.Description = $scope.build.Template.Description;
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
        $scope.build = JSON.parse(JSON.stringify(data.Data));
        $scope.addedParts = JSON.parse(JSON.stringify(data.Data.Parts));
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
    $scope.build ={};
    $scope.addedParts ={};
    $scope.getTypes();
    $scope.countParts();
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
    console.log($scope.addedParts);
    $scope.partCount = count;
    return count;
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
