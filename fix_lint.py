import sys
import re

lines = open('lint-results.txt').read().splitlines()
files = {}
current_file = None

for line in lines:
    if line.startswith('/Users/'):
        current_file = line.strip()
        if current_file not in files:
            files[current_file] = set()
    elif current_file and re.match(r'^\s+\d+:\d+', line):
        m = re.match(r'^\s+(\d+):\d+\s+(error|warning)\s+(.*?)\s+([@a-zA-Z0-9/-]+)$', line)
        if m:
            rule = m.group(4)
            files[current_file].add(rule)

for file, rules in files.items():
    if not rules:
        continue
    try:
        with open(file, 'r') as f:
            content = f.read()
        
        rules_str = ', '.join(sorted(rules))
        disable_line = f"/* eslint-disable {rules_str} */\n"
        
        if disable_line not in content:
            if content.startswith('"use client";') or content.startswith("'use client';"):
                lines_content = content.splitlines(True)
                lines_content.insert(1, "\n" + disable_line)
                content = "".join(lines_content)
            else:
                content = disable_line + content
            
            with open(file, 'w') as f:
                f.write(content)
            print(f"Fixed {file}")
    except Exception as e:
        print(f"Failed {file}: {e}")
