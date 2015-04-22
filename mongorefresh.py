from collections import OrderedDict
from pymongo import MongoClient
import json
import os
import re

client = MongoClient('localhost', 27017)
db = client.cloudseed
parts = db.parts
stacks = db.stacks

for root, dirs, files in os.walk(os.path.join('CLI','Parts')):
    for file in files:
        f = open(os.path.abspath(os.path.join(root, file)))
        obj = json.load(f, object_pairs_hook=OrderedDict)
        f.close()
        if '.subpart' in file:
            obj['Subpart'] = True
        else:
            obj['Subpart'] = False
        parts.replace_one({'Type': obj['Type']}, obj, True)

for root, dirs, files in os.walk(os.path.join('CLI','Stacks')):
    for file in files:
        f = open(os.path.abspath(os.path.join(root, file)))
        stack = json.load(f, object_pairs_hook=OrderedDict)
        f.close()
        name = re.sub(r'(.*)\.[Ss][Tt][Aa][Cc][Kk]', r'\1', file)
        obj = OrderedDict()
        obj['Name'] = name
        obj['Stack'] = stack
        stacks.replace_one({'Name':obj['Name']}, obj, True)
