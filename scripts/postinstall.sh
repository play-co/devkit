# use ssh submodules if necessary
node scripts/submodules.js

git submodule sync
git submodule update --init

# reset .gitmodules
git checkout .gitmodules

# ensure java is installed
if type -p java; then
  java -version
else
  echo "Please install java"
  exit 1
fi
