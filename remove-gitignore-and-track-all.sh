#!/bin/bash
rm .gitignore
git rm -r --cached .
git add .
git commit --allow-empty -m "​"
git push origin master:main
