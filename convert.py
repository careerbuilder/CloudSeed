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
        #elif funcname == 'Fn::FindInMap':
        #    refmap = new_template['Mappings'][args[0]]
        #    if len(args) > 2:
        #        return refmap[args[1]][args[2]]
        #    else:
        #        return refmap[args[1]]
        else:
            return function


def resolve_template_values():
    parameters = template['Parameters']
    temp_text = json.dumps(template)
    for parameter in parameters:
        if 'Default' in template['Parameters'][parameter]:
            parametervalue = template['Parameters'][parameter]['Default']
        if parameter in profile['parameters']:
            parametervalue = profile['parameters'][parameter]
        else:
            parametervalue = {'Ref': parameter}
        if 'List' in template['Parameters'][parameter]['Type']:
            parametervalue = re.split(r'\s*,\s*', parametervalue)
        temp_text = re.sub(r'\{\s*"Ref"\s*:\s*"' + parameter + r'"\}', json.dumps(parametervalue), temp_text)
    temp_two = json.loads(temp_text, object_hook=OrderedDict)
    for cond in temp_two['Conditions']:
        temp_two['Conditions'][cond] = solve_template_functions(temp_two['Conditions'][cond])
    outs = {}
    if 'Outputs' in temp_two:
        outs = temp_two['Outputs']
    temp_three_string = json.dumps({'Resources': temp_two['Resources'], 'Outputs': outs})
    for cond in temp_two['Conditions']:
        temp_three_string = re.sub('"' + cond + '"', json.dumps(temp_two['Conditions'][cond]), temp_three_string)
    clean_parts = json.loads(temp_three_string, object_hook=OrderedDict)
    temp_two['Resources'] = clean_parts['Resources']
    temp_two['Outputs'] = clean_parts['Outputs']
    return temp_two


def gather_resources():
    resources = {}
    for resource in new_template['Resources']:
        if 'Condition' in new_template['Resources'][resource] and not new_template['Resources'][resource]['Condition']:
            pass
        else:
            resources[resource] = new_template['Resources'][resource]
            resources[resource].pop('Condition', None)
    return resources


def convert_parts(parts):
    flat_parts = {}
    for root, dirs, filenames in os.walk('./Parts'):
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
            newguy = prepare_part(match_part, parts[part], count)
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
                                sub['Reference'] = value
        clean_mods.append(clean_mod)
    return clean_mods


def prepare_part(part, resource, count):
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
        flat_string = re.sub(r'\{\s*"Ref"\s*:\s*"' + res + r'"\s*\}', json.dumps({'Ref': res + str(count)}), flat_string)
    if 'Conditions' in part:
        for cond in part['Conditions']:
            flat_string = re.sub('"' + cond + '"', '"' + cond + str(count) + '"', flat_string)
    definition = json.loads(flat_string, object_hook=OrderedDict)
    definition['Resources'] = replace_names(definition['Resources'], count)
    if 'Outputs' in part:
        definition['Outputs'] = replace_names(definition['Outputs'], count)

    mod = {'Type': part['Type'], 'Count': count, 'LogicalName': part['Type'] + str(count), 'Definition': definition}

    return mod


def replace_names(obj, numappend):
    new_obj = {}
    for key in obj:
        new_obj[key + str(numappend)] = obj[key]
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


def build_template(parts):
    final_template = {}
    for part in parts:
        part_piece = {}
        for key in part['Definition']:
            if 'Parameters' != key and 'Connections' != key:
                part_piece[key] = part['Definition'][key]
        part_string = json.dumps(part_piece)
        for param in part['Definition']['Parameters']:
            hidden = False
            if 'Hidden' in part['Definition']['Parameters'][param]:
                hidden = part['Definition']['Parameters'][param]['Hidden']
            if hidden:
                continue
            value = None
            if 'Default' in part['Definition']['Parameters'][param]:
                value = part['Definition']['Parameters'][param]['Default']
            if 'Value' in part['Definition']['Parameters'][param]:
                value = part['Definition']['Parameters'][param]['Value']
            if value is None:
                if 'name' in param or 'Name' in param:
                    value = part['LogicalName']
            part_string = re.sub(r'\{\s*"Ref"\s*:\s*"' + param + r'"\s*\}', json.dumps(value), part_string)
        if 'Connections' in part['Definition'] and 'Substitutes' in part['Definition']['Connections']:
            subs = part['Definition']['Connections']['Substitutes']
            for sub in subs:
                if 'Reference' in sub:
                    part_string = re.sub(r'\{\s*"Ref"\s*:\s*"' + sub['Parameter'] + r'"\s*\}', json.dumps({'Ref': sub['Reference']}), part_string)
        rep_part = json.loads(part_string, object_hook=OrderedDict)
        for key in rep_part:
            if isinstance(rep_part[key], dict):
                if key not in final_template:
                    final_template[key] = {}
                for subkey in rep_part[key]:
                    final_template[key][subkey] = rep_part[key][subkey]
    final_template['Description'] = template['Description']
    return final_template

if __name__ == "__main__":
    pro_file = open(sys.argv[1])
    profile = json.load(pro_file, object_hook=OrderedDict)
    pro_file.close()
    template_path = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), '../', profile['template_location']))
    temp_file = open(template_path)
    template = json.load(temp_file, object_hook=OrderedDict)
    temp_file.close()
    new_template = resolve_template_values()
    # print(json.dumps(new_template, indent=2))
    raw_parts = gather_resources()
    cs_mods = convert_parts(raw_parts)
    # print(json.dumps(cs_mods, indent=2))
    cs_template = build_template(cs_mods)
    # print(json.dumps(cs_template, indent=2))
    name = re.sub(r'.*[/\\](.*)\.[Jj][Ss][Oo][Nn]', r'\1', sys.argv[1])
    build = {'Name': name, 'Region': profile['region'], 'Template': cs_template, 'Parts': cs_mods}
    print(json.dumps(build, indent=2))