__author__ = 'ayost'

import os
import re
import sys
from time import sleep
import boto.cloudformation
import boto.cloudformation.stack

SCRIPT_LOCATION = os.path.abspath(os.path.dirname(sys.argv[0]))


def send(stacks):
    regions = []
    for r in boto.cloudformation.regions():
        regions.append(r.name.upper())
    region = ""
    while len(region) < 1:
        answer = input("CF region: ")
        if answer.upper() in regions:
            region = answer.lower()
        else:
            print("Invalid region")
    names = []
    for stack in stacks:
        stackname = str(re.sub(r'.*[/\\]([^/\\\.]*?)\.stack', r'\1', stack)).strip()
        cf_conn = boto.cloudformation.connect_to_region(region)
        exists = False
        try:
            cf_stack = cf_conn.describe_stacks(stack_name_or_id=stackname)
            exists = True
        except:
            print("Stack does not exist. Creating...")
            exists = False
        if exists:
            print("Stack exists. updating...")
            cf_conn.update_stack(stack_name=stackname, template_body=get_template_text(stackname), capabilities=['CAPABILITY_IAM'])
        else:
            cf_stack = cf_conn.create_stack(stack_name=stackname, capabilities=['CAPABILITY_IAM'], template_body=get_template_text(stackname))
        names.append(stackname)
    results(names, region)


def results(stacks, region):
    done = []
    failed = []
    cf_success = ['CREATE_COMPLETE', 'DELETE_COMPLETE', 'UPDATE_COMPLETE']
    cf_failed = ['CREATE_FAILED', 'ROLLBACK_FAILED', 'ROLLBACK_COMPLETE', 'DELETE_FAILED']
    cf_conn = boto.cloudformation.connect_to_region(region)
    while len(done) + len(failed) < len(stacks):
        for stack in stacks:
            if stack not in failed and stack not in [d['Name'] for d in done]:
                stack_obj = cf_conn.describe_stacks(stack_name_or_id=stack)[0]
                status = stack_obj.stack_status
                if status in cf_success:
                    done.append({"Name": stack, "Outputs": stack_obj.outputs})
                if status in cf_failed:
                    failed.append(stack)
        sleep(1)
    print("All Stacks Complete")
    if len(failed) > 0:
        print("These stacks failed: ")
        print(failed)
        print("Outputs of successful stacks")
    for success in done:
        print(success['Name'])
        for output in success['Outputs']:
            print('\t' + output.key + ": " + output.value)
    return done


def get_template_text(stackname):
    template = os.path.join(SCRIPT_LOCATION, 'Stacks', stackname + '.stack')
    t_file = open(template)
    text = t_file.read()
    t_file.close()
    return text

if __name__ == '__main__':
    #send(sys.argv[1:])
    results(sys.argv[1:], 'us-east-1')