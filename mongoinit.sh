#!/bin/bash

mongo cloudseed mongoinit.js
echo "collections created"
python mongorefresh.py

echo "collections up to date"
