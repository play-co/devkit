# use ssh submodules if necessary
node scripts/submodules.js

git submodule sync
git submodule update --init

# reset .gitmodules
git checkout .gitmodules

# ensure java is installed
command -v java2 >/dev/null 2>&1 || { echo >&2 "java is required. please install java and try again."; exit 1; }
