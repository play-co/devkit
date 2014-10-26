git submodule sync
git submodule update --init

# create a cache directory
mkdir -p cache

# create an empty config.json file
if [ ! -e config.json ]; then
	echo "{}" > config.json
fi

# ensure java is installed
command -v java >/dev/null 2>&1 || { echo >&2 "java is required. please install java and try again."; exit 1; }

# print the instructions
devkit instructions devkit_install
