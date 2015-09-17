#!/bin/bash

#This script checks in and pushes any stack changes to the configured Repo

repopath=$1
author=$2

cd "$repopath"
echo Changed to cwd: "$repopath"
git add -A
echo Added all new files
git commit -a -m "Cloudseed stack update" --author "$author"
echo commit completed
git push
echo code pushed
