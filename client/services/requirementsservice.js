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
app.factory('requirementsservice', [function(){
  function req_only(args){
    var only = args[0];
    var self = args[args.length-1];
    var current = 0;
    var good = [];
    for(var i=1; i<args.length-1; i++){
      var arg = args[i];
      if((arg.Value && arg.Value !== '') || (arg.Hidden)){
        current ++;
        good.push(i);
      }
    }
    if(current >= only){
      self.Disabled = true;
      return false;
    }
    else{
      self.Disabled = false;
      return true;
    }
  }

  return {
    ResolveRequired: function(part, value){
      var req;
      if('Required' in value){
        if(typeof value.Required === 'boolean' || value.Required instanceof Boolean){
          req = value.Required;
        }
        else if(typeof value.Required === 'object' || value.Required instanceof Object){
          var func = value.Required.Func;
          var args = [];
          value.Required.Args.forEach(function(arg){
            if((typeof arg === 'object' || arg instanceof Object) && 'Param' in arg){
              args.push(part.Definition.Parameters[arg.Param]);
            }
            else{
              args.push(arg);
            }
          });
          switch (func) {
            case 'Only':
              args.push(value);
              return req_only(args);
            default:
              return false;
          }
        }
        else{
          console.log('Invalid Requirements');
          req = false;
        }
      }
      else{
        req = !value.Hidden && (value.Default === null || value.Default === undefined);
      }
      if (req){
        value.Required = true;
      }else{
        value.Required = false;
      }
      return req;
    }
  };

}]);
