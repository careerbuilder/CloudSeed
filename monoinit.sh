#!/bin/bash

mongodb cloudseed mongoinit.js
echo "collections created"
python mongoreresh.py

echo "collections up to date"
