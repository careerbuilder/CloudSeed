__author__ = 'ayost'

import os
import re
import sys
import json
from collections import OrderedDict

parts = OrderedDict()
SCRIPT_LOCATION = os.path.abspath(os.path.dirname(sys.argv[0]))


def verify_input(value, obj):
    if obj['Type'] == "Number":
        try:
            x = int(value)
        except:
            print("Expecting number!")
            return None
    elif obj['Type'] == "List<Number>":
        num_list = re.split(r'\s*,\s*', value)
        for num in num_list:
            try:
                x = int(num)
            except:
                print("Must be a list of numbers!")
                return None
    typed_value = value
    if "MinLength" in obj:
        if len(str(typed_value)) < int(obj['MinLength']):
            return None
    if "MaxLength" in obj:
        if len(str(typed_value)) > int(obj['MaxLength']):
            return None
    if "MinValue" in obj:
        if int(typed_value) < int(obj['MinValue']):
            return None
    if "MaxValue" in obj:
        if int(typed_value) > int(obj['MaxValue']):
            return None
    if "AllowedValues" in obj:
        matched = False
        for v in obj['AllowedValues']:
            if re.match(r'(?i)' + re.escape(v), typed_value):
                typed_value = v
                matched = True
                break
        if not matched:
            print("Allowed values: " + json.dumps(obj['AllowedValues']))
            return None
    if "AllowedPattern" in obj:
        if not re.match(obj['AllowedPattern'], str(typed_value)):
            print('Does not match allowed pattern')
            return None
    return typed_value


def prompt(params):
    options = OrderedDict()
    for key in params:
        input_message = key + " "
        if "Default" in params[key]:
            input_message += "[" + params[key]['Default'] + "]"
        input_message += ":"
        accepted = False
        while not accepted:
            value = input("\t" + input_message)
            if len(value) < 1:
                if "Default" in params[key]:
                    if "Reference" in params[key]:
                        options[key] = params[key]['Default']
                    accepted = True
                else:
                    print("No default value specified, please enter a value")
            else:
                verified_value = verify_input(value, params[key])
                if verified_value is not None:
                    options[key] = verified_value
                    accepted = True
    return options


def makesub(subpart):
    partf = open(os.path.join(SCRIPT_LOCATION, 'Parts', subpart + '.subpart'))
    part = json.load(partf, object_pairs_hook=OrderedDict)
    partf.close()
    subobj = OrderedDict()
    variables = prompt(part['Variables'])
    for key in part['Object']:
        if key in variables:
            subobj[key] = variables[key]
        else:
            subobj[key] = part['Object'][key]
    return subobj


def map_part(part, template):
    if 'Conditions' in part:
        for condition in part['Conditions']:
            template['Conditions'][condition] = part['Conditions'][condition]
    if 'Mappings' in part:
        for mapping in part['Mappings']:
            template['Mappings'][mapping] = part['Mappings'][mapping]
    if 'Resources' in part:
        for res in part['Resources']:
            template['Resources'][res] = part['Resources'][res]
    if 'Outputs' in part:
        for output in part['Outputs']:
            template['Outputs'][output] = part['Outputs'][output]
    if 'Connections' in part:
        if 'SubParts' in part['Connections']:
            for subpart in part['Connections']['SubParts']:
                subpartName = re.sub(r'^[Ll]ist::', "", part['Connections']['SubParts'][subpart]['Type'])
                answer = ""
                addPart = False
                while len(answer.strip()) < 1:
                    answer = input("Add a " + subpartName + "? (y/n): ")
                    addPart = re.match(r'[yY]', answer)
                subs = []
                isList = re.match(r'^[Ll]ist::', part['Connections']['SubParts'][subpart]['Type'])
                while addPart:
                    subs.append(makesub(subpartName))
                    if isList:
                        answer = ""
                        while len(answer.strip()) < 1:
                            answer = input("Add another " + subpartName + "? (y/n): ")
                            addPart = re.match(r'[yY]', answer)
                    else:
                        addPart = False
                for res in part['Resources']:
                    if subpart in part['Resources'][res]['Properties']:
                        if isList:
                            part['Resources'][res]['Properties'][subpart] = subs
                        else:
                            part['Resources'][res]['Properties'][subpart] = subs[0]


def replace_ref(part, key, value):
    typed_value = json.dumps(value)
    part_string = json.dumps(part)
    clean_string = re.sub(r'\{\s*"\s*Ref\s*"\s*:\s*"\s*' + re.escape(key) + r'\s*"\s*\}', typed_value, part_string)
    clean_part = json.loads(clean_string, object_pairs_hook=OrderedDict)
    return clean_part


def changeNames(part, mod):
    resources = OrderedDict()
    for res in part['Resources']:
        resources[res + str(mod['Count'])] = part['Resources'][res]
    if 'Conditions' in part:
        resstring = json.dumps(resources)
        conditions = OrderedDict()
        for cond in part['Conditions']:
            conditions[cond + str(mod['Count'])] = part['Conditions'][cond]
            resstring = re.sub(r'"' + re.escape(cond) + r'"', '"' + (cond + str(mod['Count'])) + '"', resstring)
        part['Conditions'] = conditions
        part['Resources'] = json.loads(resstring, object_pairs_hook=OrderedDict)
    else:
        part['Resources'] = resources
    if 'Outputs' in part:
        outs = OrderedDict()
        for out in part['Outputs']:
            outs[out+str(mod['Count'])] = part['Outputs'][out]
        part['Outputs'] = outs


def build_objects(part_list, template):
    added = []
    for part in part_list:
        max_count = 0
        for module in added:
            if module['Type'] == part['Type']:
                if module['Count'] > max_count:
                    max_count = module['Count']
        numAppend = max_count + 1
        mod = {
            'LogicalName': part['Type'] + str(numAppend),
            'Type': part['Type'],
            'Count': numAppend
        }
        changeNames(part, mod)
        part = replace_ref(part, mod['Type'], {"Ref": mod['LogicalName']})
        params = part['Parameters']
        if ('Connections' in part) and ('Substitutes' in part['Connections']):
            for sub in part['Connections']['Substitutes']:
                typestring = re.sub(r'^[Ll]ist::', "", sub['Type'])
                if typestring in (module['Type'] for module in added):
                    for module in added:
                        if module['Type'] == typestring:
                            part = replace_ref(part, sub['Parameter'], {"Ref": module['LogicalName']})
                            try:
                                params.pop(sub['Parameter'])
                            except KeyError:
                                pass
                            break
        print("Parameters for " + mod['LogicalName'])
        filled_params = prompt(params)
        for fp in filled_params:
            part = replace_ref(part, fp, filled_params[fp])
        map_part(part, template)
        added.append(mod)
        if mod['Type'] == "ACL" or mod['Type'] == "ACLEntry":
            answer = ""
            addRule = False
            while len(answer) < 1:
                if mod['Type'] == "ACL":
                    answer = (input("Add an ACL Rule? (y/n): ")).strip()
                else:
                    answer = (input("Add another ACL Rule? (y/n): ")).strip()
                if answer[0].upper() == 'Y':
                    addRule = True
                elif answer[0].upper() == 'N':
                    addRule = False
                else:
                    answer = ""
            if addRule:
                part_list.insert(len(added), parts['ACLEntry'].copy())


def build_template():
    template = OrderedDict()
    template['Description'] = input("Describe this stack: ")
    template['Parameters'] = OrderedDict()
    template['Mappings'] = OrderedDict()
    template['Conditions'] = OrderedDict()
    template['Resources'] = OrderedDict()
    template['Outputs'] = OrderedDict()
    return template


def order_parts(parts_list):
    num_parts = len(parts_list)
    order = []
    temp_list = []
    while len(order) < num_parts:
        for p in parts_list:
            part = parts[p.upper()].copy()
            deps = []
            count = 0
            if ('Connections' in part) and ('Substitutes' in part['Connections']):
                for sub in part['Connections']['Substitutes']:
                    deps.append(re.sub(r'^[Ll]ist::', "", sub['Type']))
            for dep in deps:
                if dep.upper() in [partname.upper() for partname in parts_list]:
                    count += 1
            if count < 1:
                order.append(part)
            else:
                temp_list.append(p)
        parts_list.clear()
        for t in temp_list:
            parts_list.append(t)
        temp_list.clear()
    return order


def load_parts():
    for root, dirs, files in os.walk('Parts'):
        for file in files:
#            print(file)
            f = open(os.path.abspath(os.path.join(root, file)))
            obj = json.load(f, object_pairs_hook=OrderedDict)
            f.close()
            parts[obj['Type'].upper()] = obj


def generate(layers):
    load_parts()
    name = input("Stack Name: ")
    temp = build_template()
    ordered_parts = order_parts(layers)
    build_objects(ordered_parts, temp)
    # print(json.dumps(temp, indent=2))
    outfile = open('Stacks/' + name + '.stack', 'w')
    json.dump(temp, outfile, indent=2)
    outfile.close()
    print("Stack File " + name + " Saved!")


if __name__ == '__main__':
    generate(sys.argv[1:])