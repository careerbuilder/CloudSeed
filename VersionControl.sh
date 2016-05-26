#!/bin/bash

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

#This script checks in and pushes any stack changes to the configured Repo

author=$1
repo=$2
{
cd "$repo" &&
git add -A &&
echo Added all new files &&
git commit -a -m "Cloudseed stack update" --author "$author" &&
echo commit completed &&
git push &&
echo code pushed
}||{
echo git update failed
}
