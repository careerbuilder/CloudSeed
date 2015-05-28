#
# Convert Multifile Stacks in to single file, CloudSeed Safe stacks.
#

import os
import re
import sys
import json

template = {}
profile = {}


def solve_template_functions(function):
    for key in function:
        funcname = key.strip()
        values = function[key]
        args = []
        if not isinstance(values, list) and not isinstance(values, dict):
            continue
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
        elif funcname == 'Fn::FindInMap':
            refmap = template['Mappings'][args[0]]
            if len(args) > 2:
                return refmap[args[1]][args[2]]
            else:
                return refmap[args[1]]
        else:
            return function


def resolve_conditions():
    conditions = {}
    parameters = template['Parameters'] or []
    cond_text = json.dumps(template['Conditions'])
    for parameter in parameters:
        if parameter in profile['parameters']:
            parametervalue = profile['parameters'][parameter]
        elif 'Default' in template['Parameters'][parameter]:
            parametervalue = template['Parameters'][parameter]['Default']
        else:
            parametervalue = ""
            print("Insufficient Parameters for this template")
            print("Parameter " + parameter + " has no specified value or default")
            exit(-1)
        if 'List' in template['Parameters'][parameter]['Type']:
            parametervalue = re.split(r'\s*,\s*', parametervalue)
        cond_text = re.sub(r'\{\s*\"Ref\"\s*:\s*\"' + parameter + r'\"\}', json.dumps(parametervalue), cond_text)
    new_cond = json.loads(cond_text)
    for cond in new_cond:
        conditions[cond] = solve_template_functions(new_cond[cond])
    return conditions


def gather_resources(conditions):
    resources = {}
    for resource in template['Resources']:
        if 'Condition' in template['Resources'][resource] and not conditions[template['Resources'][resource]['Condition']]:
            pass
        else:
            resources[resource] = template['Resources'][resource]
    return resources


def build_flat_template(parts):
    flat_template = {
        'Description': template['Description'],
        'Mappings': template['Mappings']
    }
    part_text = json.dumps({'Conditions': template['Conditions'], 'Resources': parts})
    for parameter in template['Parameters']:
        if parameter in profile['parameters']:
            parametervalue = profile['parameters'][parameter]
        elif 'Default' in template['Parameters'][parameter]:
            parametervalue = template['Parameters'][parameter]['Default']
        else:
            parametervalue = ""
            print("Insufficient Parameters for this template")
            print("Parameter " + parameter + " has no specified value or default")
            exit(-1)
        if 'List' in template['Parameters'][parameter]['Type']:
            parametervalue = re.split(r'\s*,\s*', parametervalue)
        part_text = re.sub(r'\{\s*\"Ref\"\s*:\s*\"' + parameter + r'\"\}', json.dumps(parametervalue), part_text)
    new_parts = json.loads(part_text)
    flat_template['Conditions'] = new_parts['Conditions']
    flat_template['Resources'] = new_parts['Resources']
    return flat_template


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
    #print(json.dumps(flat_parts, indent=2))
    for part in parts:
        if parts[part]['Type'] not in flat_parts:
            print(parts[part]['Type'])



if __name__ == "__main__":
    pro_file = open(sys.argv[1])
    profile = json.load(pro_file)
    pro_file.close()
    template_path = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), '../', profile['template_location']))
    temp_file = open(template_path)
    template = json.load(temp_file)
    temp_file.close()
    template_conditions = resolve_conditions()
    raw_parts = gather_resources(template_conditions)
    new_template = build_flat_template(raw_parts)
    convert_parts(raw_parts)
    # print(json.dumps(new_template, indent=2))