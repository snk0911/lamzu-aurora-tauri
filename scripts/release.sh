#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 1 || ! "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo 'Usage: scripts/release.sh 0.1.1' >&2
  exit 1
fi
version="$1"
if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  echo "Tag v$version already exists" >&2
  exit 1
fi
VERSION="$version" python3 - <<'PY'
import json, os, pathlib, re
v = os.environ['VERSION']
for f in ('package.json', 'src-tauri/tauri.conf.json'):
    path = pathlib.Path(f)
    data = json.loads(path.read_text())
    data['version'] = v
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
path = pathlib.Path('src-tauri/Cargo.toml')
s, n = re.subn(r'(?m)^(version\s*=\s*)"[^"]+"', rf'\g<1>"{v}"', path.read_text(), count=1)
assert n == 1
path.write_text(s)
PY
# Update only the root package version in Cargo.lock without touching dependency versions.
VERSION="$version" python3 - <<'PY'
import os, pathlib, re
p=pathlib.Path('src-tauri/Cargo.lock')
s=p.read_text()
pattern=r'(?m)(^name = "lamzu-aurora-tauri"\nversion = ")[^"]+("$)'
s,n=re.subn(pattern, lambda m:m.group(1)+os.environ['VERSION']+m.group(2), s, count=1)
assert n==1, 'Root package missing in Cargo.lock'
p.write_text(s)
PY
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
if ! git diff --cached --quiet; then
  git commit -m "Release v$version"
fi
git tag "v$version"
git push origin main
git push origin "v$version"
