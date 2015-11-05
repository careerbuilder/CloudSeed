from collections import OrderedDict
import boto3
import json
import sys
import os
import re


def parse_params(template, paramlist):
    param_values = {}
    parameters = template.pop("Parameters", None)
    for parameter in parameters:
        if 'Default' in parameters[parameter]:
            param_values[parameter] = parameters[parameter]['Default']
        else:
            param_values[parameter] = ''
    for param in paramlist:
        param_values[param['ParameterKey']] = param['ParameterValue']
    return replace_params(template, param_values)


def replace_params(template, param_values):
    temp_string = json.dumps(template)
    for key in param_values:
        temp_string = re.sub(r'\s*\{\s*"Ref"\s*:\s*"' + key + r'"\s*\}\s*', json.dumps(param_values[key]), temp_string)
    template2 = json.loads(temp_string)
    return resolve_conditions(template2)


def resolve_conditions(temp):
    conditions = temp.pop('Conditions', None)
    include = []
    temp_string = json.dumps(temp)
    if conditions is None:
        return include
    maps = None
    if 'Mappings' in temp:
        maps = temp['Mappings']
    for cond in conditions:
        value = solve_functions(conditions[cond], maps)
        temp_string = re.sub(r'\s*"' + cond + r'"\s*', json.dumps(value), temp_string)
    return select_parts(json.loads(temp_string))


def select_parts(temp):
    parts = {}
    for resource in temp['Resources']:
        cond = temp['Resources'][resource].pop('Condition', None)
        if cond is not None:
            if cond:
                parts[resource] = temp['Resources'][resource]
        else:
            parts[resource] = temp['Resources'][resource]
    maps = None
    if 'Mappings' in temp:
        maps = temp['Mappings']
    return resolve_parts(parts, maps)


def resolve_parts(parts, maps):
    for part in parts:
        for key in parts[part]['Properties']:
            if key == 'Tags':
                tags = []
                for tag in parts[part]['Properties'][key]:
                    tags.append({'Key':tag['Key'], 'Value':solve_functions(tag['Value'], maps)})
                value = tags
            else:
                value = solve_functions(parts[part]['Properties'][key], maps)
            parts[part]['Properties'][key] = value
    return export_parts(parts)


def export_parts(parts):
    flat_parts = {}
    for root, dirs, filenames in os.walk(os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), 'Parts')):
        for filename in filenames:
            if '.part' in filename:
                f = open(os.path.join(root, filename))
                part_obj = json.load(f, object_hook=OrderedDict)
                f.close()
                for obj in part_obj['Resources']:
                    flat_parts[part_obj['Resources'][obj]['Type']] = part_obj
    mods = []
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
            newguy = prepare_part(match_part, parts[part], part)
            newguy_string = json.dumps(newguy)
            if 'Conditions' in newguy:
                newconds = {}
                for cond in newguy['Conditions']:
                    val = newguy['Conditions'][cond]
                    newguy_string = re.sub(json.dumps(cond), json.dumps(cond+str(count)), newguy_string)
                    newconds[cond+str(count)] = val
                newguy = json.loads(newguy_string)
                newguy['Conditions'] = newconds
            if 'Outputs' in newguy:
                newouts = {}
                for outs in newguy['Outputs']:
                    val = newguy['Outputs'][outs]
                    newouts[outs+str(count)] = val
                newguy['Outputs'] = newouts
            mod = {'LogicalName': part, 'Count': count, 'Definition': newguy, 'Type': match_part['Type']}
            mods.append(mod)
    return mods


def prepare_part(csp, part, key):
    csp_copy = json.loads(json.dumps(csp))
    newparams = {}
    if 'Connections' in csp_copy and 'Substitutes' in csp_copy['Connections']:
        for sub in csp_copy['Connections']['Substitutes']:
            if 'Reference' not in sub:
                if sub['Type'].startswith('List::'):
                    sub['Reference'] = []
                else:
                    sub['Reference'] = 'None'
    for param in csp_copy['Parameters']:
        newparams[param] = csp_copy['Parameters'][param]
        if 'Default' in csp_copy['Parameters'][param]:
            newparams[param]['Value'] = csp_copy['Parameters'][param]['Default']
    csp_copy['Parameters'] = newparams
    csr = None
    replace_name = None
    for resource in csp_copy['Resources']:
        if csp_copy['Resources'][resource]['Type'] == part['Type']:
            replace_name = resource
            csr = csp_copy['Resources'].pop(resource, None)
            break
    if csr is None:
        print('No resource matches!')
        exit(1)
    for prop in csr['Properties']:
        if isinstance(csr['Properties'][prop], dict):
            rep_param, reference = find_param(csr['Properties'][prop], csp_copy['Parameters'])
            if prop in part['Properties']:
                if isinstance(part['Properties'][prop], dict):
                    if 'Ref' in part['Properties'][prop]:
                        if reference:
                            csp_copy['Parameters'][rep_param]['Hidden'] = True
                            csp_copy['Parameters'][rep_param]['Value'] = part['Properties'][prop]['Ref']
                            fill_substitute(csp_copy, rep_param, part['Properties'][prop]['Ref'])
                    else:
                        for pkey in part['Properties'][prop]:
                            if pkey in csr['Properties'][prop] and 'Ref' in csr['Properties'][prop][pkey]:
                                csp_copy['Parameters'][csr['Properties'][prop][pkey]['Ref']]['Value'] = part['Properties'][prop][pkey]
                else:
                    if 'AllowedValues' in csp_copy['Parameters'][rep_param]:
                        for av in csp_copy['Parameters'][rep_param]['AllowedValues']:
                            if str(part['Properties'][prop]).upper().strip() == av.upper().strip():
                                csp_copy['Parameters'][rep_param]['Value'] = av
                    else:
                        csp_copy['Parameters'][rep_param]['Value'] = part['Properties'][prop]
        else:
            csr['Properties'][prop] = part['Properties'][prop]
    for propt in part['Properties']:
        if propt not in csr['Properties']:
            if isinstance(csr['Properties'][prop], dict):
                rep_param, reference = find_param(csr['Properties'][prop], csp_copy['Parameters'])
                if reference:
                    csp_copy['Parameters'][csr['Properties'][propt]['Ref']]['Hidden'] = True
                    csp_copy['Parameters'][rep_param]['Value'] = part['Properties'][prop]['Ref']
                    print(propt, 'is a sub and is not accounted for','\nCannot create at this time')
                    exit(1)
            else:
                csr['Properties'][propt] = part[propt]  # add any missing properties
    csp_copy['Resources'][key] = csr
    csp_string = json.dumps(csp_copy)
    csp_string = re.sub(r'\s*\{\s*"Ref"\s*:\s*"' + replace_name + r'"\s*\}', json.dumps({'Ref': key}), csp_string)
    return json.loads(csp_string)


def find_param(prop, params):
    if not isinstance(prop, dict):
        return None, False
    if 'Ref' in prop:
        if prop['Ref'] in params:
            return prop['Ref'], True
    for key in prop:
        if isinstance(prop[key], dict):
            param, found = find_param(prop[key], params)
            if found:
                return param, True
        elif isinstance(prop[key], list):
            for item in prop[key]:
                param, found = find_param(item, params)
                if found:
                    return param, True
    return None, False


def fill_substitute(part, param, value):
    if 'Connections' in part and 'Substitutes' in part['Connections']:
        for sub in part['Connections']['Substitutes']:
            if 'Reference' not in sub:
                if sub['Type'].startswith('List::'):
                    sub['Reference'] = []
                else:
                    sub['Reference'] = 'None'
            if sub['Parameter'] == param:
                if sub['Type'].startswith('List::'):
                    sub['Reference'].push({'Ref':value})
                else:
                    sub['Reference'] = {'Ref': value}


def solve_functions(block, mappings):
    if isinstance(block, list):
        flatlist = []
        for item in block:
            flatlist.append(solve_functions(item, mappings))
        return flatlist
    if isinstance(block, dict):
        for key in block:
            funcname = key.strip()
            values = block[key]
            args = []
            if funcname == 'Ref':
                return block
            if not isinstance(values, list) and not isinstance(values, dict):
                return block
            for arg in values:
                if isinstance(arg, dict):
                    new_arg = solve_functions(arg, mappings)
                    args.append(new_arg)
                elif isinstance(arg, list):
                    for innerarg in arg:
                        if isinstance(arg, dict):
                            new_arg = solve_functions(innerarg, mappings)
                            args.append(new_arg)
                        args.append(innerarg)
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
                delim = args[0]
                for i in range(1, len(args)):
                    outval += str(args[i])
                    if i < len(args) - 1:
                        outval += str(delim)
                return outval
            elif funcname == 'Fn::Select':
                return args[1][args[0]]
            elif funcname == 'Fn::FindInMap':
                return mappings[args[0]][args[1]][args[2]]
            else:
                return block
    else:
        return block


def main(stackname, isFile):
    pl = []
    t = {}
    if not isFile:
        cfn = boto3.client('cloudformation')
        pl = cfn.describe_stacks(StackName=stackname)['Stacks'][0]['Parameters']
        t = cfn.get_template(StackName=stackname)['TemplateBody']
    else:
        pro_file = open(sys.argv[1])
        profile = json.load(pro_file, object_hook=OrderedDict)
        pro_file.close()
        for key in profile['parameters']:
            pl.append({'ParameterKey': key, 'ParameterValue': profile['parameters'][key]})
        template_path = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(stackname)), '../', profile['template_location']))
        temp_file = open(template_path)
        t = json.load(temp_file, object_hook=OrderedDict)
        temp_file.close()
    finishedparts = parse_params(t, pl)
    region = 'us-east-1'
    cleanname = re.sub(r'.*?[/\\]([^/\\]*?)(\.[Jj][Ss][Oo][Nn])', r'\1', stackname)
    if cleanname.startswith('US'):
        region = 'us-east-1'
    elif cleanname.startswith('Ireland'):
        region = 'eu-west-1'
    build = {'Name': cleanname, 'Region': region, 'Template': {}, 'Parts': finishedparts, 'Ready': False}
    outpath = os.path.join(os.path.curdir, cleanname + '.json')
    fout = open(outpath, 'w')
    json.dump(build, fout)
    fout.close()
    print('DONE!')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Need name of stack or file name')
        exit(1)
    stackdesc = sys.argv[1]
    isjson = re.search(r'\.json$', stackdesc, re.IGNORECASE) is not None
    main(stackdesc, isjson)



