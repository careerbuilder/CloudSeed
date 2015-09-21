# Copyright 2015 CareerBuilder, LLC
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and limitations under the License.
#


# Convert Multifile Stacks in to single file, CloudSeed Safe stacks.
#

import os
import re
import sys
import json
from collections import OrderedDict

template = {}
profile = {}

script_location = os.path.dirname(os.path.abspath(sys.argv[0]))

new_template = {}
cs_mods = []
cs_parts_map = {}


def solve_template_functions(function):
    if not isinstance(function, dict):
        return function
    if 'Ref' in function:
        return function
    for key in function:
        funcname = key.strip()
        values = function[key]
        args = []
        if not isinstance(values, list) and not isinstance(values, dict):
            return function
        for arg in values:
            if isinstance(arg, dict):
                new_arg = solve_template_functions(arg)
                args.append(new_arg)
            else:
                args.append(arg)
        if funcname == 'Fn::Not':
            return not args[0]
        elif funcname == 'Fn::Equals':
            return args[0] == args[1]
        elif funcname == 'Fn::And':
            return args[0] and args[1]
        elif funcname == 'Fn::Or':
            return args[0] or args[1]
        elif funcname == 'Fn::If':
            if args[0]:
                return args[1]
            else:
                return args[2]
        elif funcname == 'Fn::Join':
            outval = ""
            for i in range(1, len(args)):
                outval += args[i]
                if i < len(args)-1:
                    outval += args[0]
            return outval
        elif funcname == 'Fn::Select':
            return args[1][args[0]]
        else:
            return function


def resolve_template_values():
    parameters = template['Parameters']
    temp_text = json.dumps(template)
    for parameter in parameters:
        found = False
        if 'Default' in template['Parameters'][parameter]:
            parametervalue = template['Parameters'][parameter]['Default']
            found = True
        if parameter in profile['parameters']:
            parametervalue = profile['parameters'][parameter]
            found = True
        if 'List' in template['Parameters'][parameter]['Type']:
            parametervalue = re.split(r'\s*,\s*', str(parametervalue))
            found = True
        if found:
            temp_text = re.sub(r'\{\s*"Ref"\s*:\s*"' + parameter + r'"\}', json.dumps(parametervalue), temp_text)
    temp_two = json.loads(temp_text, object_hook=OrderedDict)
    if 'Conditions' in temp_two:
        for cond in temp_two['Conditions']:
            temp_two['Conditions'][cond] = solve_template_functions(temp_two['Conditions'][cond])
    outs = {}
    if 'Outputs' in temp_two:
        outs = temp_two['Outputs']
    temp_three_string = json.dumps({'Resources': temp_two['Resources'], 'Outputs': outs})
    clean_parts = json.loads(temp_three_string, object_hook=OrderedDict)
    temp_two['Resources'] = clean_parts['Resources']
    if 'Outputs' in temp_two:
        temp_two['Outputs'] = clean_parts['Outputs']
    return temp_two


def gather_resources():
    resources = {}
    for resource in new_template['Resources']:
        if 'Condition' in new_template['Resources'][resource]:
            condname = new_template['Resources'][resource]['Condition']
            include = solve_template_functions(new_template['Conditions'][condname])
            if not include:
                continue
        resources[resource] = new_template['Resources'][resource]
        resources[resource].pop('Condition', None)

    return resources


def check_convertible(parts):
    flat_parts = {}
    for root, dirs, filenames in os.walk(os.path.join(script_location, 'Parts')):
        for filename in filenames:
            if '.part' in filename:
                f = open(os.path.join(root, filename))
                part_obj = json.load(f)
                f.close()
                for obj in part_obj['Resources']:
                    flat_parts[part_obj['Resources'][obj]['Type']] = part_obj
    problems = []
    for part in parts:
        if parts[part]['Type'] not in flat_parts:
            if parts[part]['Type'] not in problems:
                problems.append(parts[part]['Type'])
    return len(problems)==0, problems


def convert_parts(parts):
    flat_parts = {}
    for root, dirs, filenames in os.walk(os.path.join(script_location, 'Parts')):
        for filename in filenames:
            if '.part' in filename:
                f = open(os.path.join(root, filename))
                part_obj = json.load(f)
                f.close()
                for obj in part_obj['Resources']:
                    flat_parts[part_obj['Resources'][obj]['Type']] = part_obj
    mods = []
    mod_map = {}
    for part in parts:
        if parts[part]['Type'] not in flat_parts:
            print(parts[part]['Type'] + " does not have a part parallel")
            print("Cannot build CloudSeed template")
            exit(-1)
        else:
            match_part = flat_parts[parts[part]['Type']]
            count = 0
            for mod in mods:
                if mod['Type'] == match_part['Type'] and mod['Count'] > count:
                    count = mod['Count']
            count += 1
            newguy = prepare_part(match_part, parts[part], part, count)
            if 'Outputs' in newguy['Definition']:
                newguy['Definition']['Outputs'] = replace_names(newguy['Definition']['Outputs'], count)
            mod_map[part] = newguy['LogicalName']
            mods.append(newguy)
    clean_mods = []
    for old_part in mods:
        p_string = json.dumps(old_part)
        for key in mod_map:
            p_string = re.sub(r'\{\s*"Ref"\s*:\s*"' + key + r'"\s*\}', json.dumps({'Ref': mod_map[key]}), p_string)
        clean_mod = json.loads(p_string, object_hook=OrderedDict)
        for p in clean_mod['Definition']['Parameters']:
            param = clean_mod['Definition']['Parameters'][p]
            if 'Value' in param:
                if isinstance(param['Value'], dict) and 'Ref' in param['Value']:
                    value = param.pop('Value', None)['Ref']
                    param['Hidden'] = True
                    if 'Connections' in clean_mod['Definition'] and 'Substitutes' in clean_mod['Definition']['Connections']:
                        subs = clean_mod['Definition']['Connections']['Substitutes']
                        for sub in subs:
                            if sub['Parameter'] == p:
                                sub['Reference'] = {"Ref": value}
        clean_mods.append(clean_mod)
    return clean_mods


def prepare_part(part, resource, orig_name, count):
    definition_string = json.dumps(part)
    definition = json.loads(definition_string, object_hook=OrderedDict)
    for param in definition['Parameters']:
        if 'Value' not in definition['Parameters'][param]:
            if 'Default' in definition['Parameters'][param]:
                definition['Parameters'][param]['Value'] = definition['Parameters'][param]['Default']
        if param in profile['parameters']:
            definition['Parameters'][param]['Value'] = profile['parameters'][param]
    for reso in definition['Resources']:
        flatten_resource(definition['Parameters'], definition['Resources'][reso], resource)
    flat_string = json.dumps(definition)
    for res in part['Resources']:
        flat_string = re.sub(r'\{\s*"Ref"\s*:\s*"' + res + r'"\s*\}', json.dumps({'Ref': orig_name}), flat_string)
    if 'Conditions' in part:
        for cond in part['Conditions']:
            flat_string = re.sub(re.escape('"' + cond + '"'), '"'+cond + str(count)+'"', flat_string)
    definition = json.loads(flat_string, object_hook=OrderedDict)
    definition['Resources'] = replace_names(definition['Resources'], orig_name)
    copy_old_fields(definition['Parameters'], definition['Resources'][orig_name], resource)
    mod = {'Type': part['Type'], 'LogicalName': orig_name, 'Definition': definition, 'Count': count}
    return mod


def replace_names(obj, change):
    new_obj = {}
    for key in obj:
        if isinstance(change, int):
            new_obj[key + str(change)] = obj[key]
        else:
            new_obj[change] = obj[key]
    return new_obj


def flatten_resource(params, obj, ref):
    if isinstance(ref, dict):
        for key in ref:
            ref[key] = solve_template_functions(ref[key])
    for key in obj:
        if key in ref:
            if isinstance(obj[key], dict):
                if 'Ref' in obj[key]:
                    if obj[key]['Ref'] in params:
                        params[obj[key]['Ref']]['Value'] = ref[key]
                else:
                    if isinstance(ref[key], dict):
                        flatten_resource(params, obj[key], ref[key])
                    else:
                        param = re.search(r'\{\s*"Ref"\s*:\s*"([A-Za-z0-9]+)"\}', json.dumps(obj[key])).group(1)
                        if param in params:
                            params[param]['Value'] = ref[key]


def copy_old_fields(params, part, resource):
    for field in resource:
        if "Metadata" in field:
            continue
        if field not in part:
            p_type = "String"
            if isinstance(resource[field], list):
                p_type = "CommaSeparatedList"
            elif isinstance(resource[field], int):
                p_type = "Number"
            params[field] = {'Type': p_type, 'Value': resource[field]}
            part[field] = {'Ref': field}
        else:
            if isinstance(resource[field], dict) and not 'Ref' in resource[field]:
                copy_old_fields(params, part[field], resource[field])


if __name__ == "__main__":
    pro_file = open(sys.argv[1])
    profile = json.load(pro_file, object_hook=OrderedDict)
    pro_file.close()
    template_path = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), '../', profile['template_location']))
    temp_file = open(template_path)
    template = json.load(temp_file, object_hook=OrderedDict)
    temp_file.close()
    new_template = resolve_template_values()
    raw_parts = gather_resources()
    cs_mods = convert_parts(raw_parts)
    name = re.sub(r'(.*?[/\\])*(.*?)\.[Jj][Ss][Oo][Nn]', r'\2', sys.argv[1])
    build = {'Name': name, 'Region': profile['region'], 'Template': {}, 'Parts': cs_mods, 'Ready': False}
    fout = open(os.path.join(script_location, name + '.json'), 'w')
    json.dump(build, fout)
    fout.close()
    print('Done')


''' # Uncomment this block to check which old-style stacks can be safely converted
    good = []
    bad = []
    for root, dirs, files in os.walk(os.path.abspath(sys.argv[1])):
        for file in files:
            if file.endswith('.json') and file != 'aws_credentials.json':
                fullpath = os.path.join(root, file)
                pro_file = open(fullpath)
                name = re.sub(r'(.*?[/\\])*(.*?)\.[Jj][Ss][Oo][Nn]', r'\2', fullpath)
                profile = json.load(pro_file, object_hook=OrderedDict)
                pro_file.close()
                template_path = os.path.join('D:/repos/StackCreation_SiteDB/CloudFormation', re.sub(r'(.*?[/\\])*(.*?\.template)', r'\2', profile['template_location']))
                temp_file = open(template_path)
                template = json.load(temp_file, object_hook=OrderedDict)
                temp_file.close()
                new_template = resolve_template_values()
                raw_parts = gather_resources()
                convertible, objs = check_convertible(raw_parts)
                if convertible:
                    good.append(name)
                else:
                    bad.append({'Name': name, 'Problems': objs})
    print("Good:\n\t", json.dumps(good, indent=2))
    print("Bad:\n\t", json.dumps(bad, indent=2))
    '''