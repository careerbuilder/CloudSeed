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
from collections import OrderedDict
from pymongo import MongoClient
import json
import sys
import os
import re

tld = os.path.dirname(os.path.abspath(sys.argv[0]))

conf_file = os.path.join(tld, 'config.json')
try:
    conf = open(conf_file)
except FileNotFoundError:
    print("No Config file!")
    exit(-1)

config = json.load(conf)
conf.close()

DB = config['DB']
client = MongoClient(DB['Host'], DB['Port'])
db = client[DB['Database']]
parts = db.parts
#stacks = db.stacks

for root, dirs, files in os.walk(os.path.join(tld, 'Parts')):
    for file in files:
	print(file)
        f = open(os.path.abspath(os.path.join(root, file)))
        obj = json.load(f, object_pairs_hook=OrderedDict)
        f.close()
        if '.subpart' in file:
            obj['Subpart'] = True
        else:
            obj['Subpart'] = False
        if '.subassembly' in file:
            obj['SubAssembly'] = True
        else:
            obj['SubAssembly'] = False
        parts.replace_one({'Type': obj['Type']}, obj, True)
        print("updated: ", file)

'''
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
'''
