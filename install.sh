#!/usr/bin/env bash

echo $'\033[1;32m-{{{>\033[0m Game Closure "Basil" SDK'
echo 'Installing...'
echo 

# return 0 if program version is equal or greater than check version
function check_version() {
    local version=$1 check=$2
    local winner=`echo -e "$version\\n$check" | sed '/^$/d' | sort -nr | head -1`
		if [[ "$winner" == "$version" ]]; then
				return 0
		else
				return 1
		fi
}

function abs_path() {
	echo "$1" | sed "s@^./@$PWD@"
}

# Check git versions--shouldn't use features not provided with the git installed with xcode
which git
if [ $? != 0 ]; then
	echo 'Please install git before running.'
	exit
fi

# Check node versions.
which node
if [ $? != 0 ]; then
	echo 'Please install node 0.8+ before running.'
	exit 1
fi

nodeversion=$(node --version)
nodeversion=${nodeversion:1}
check_version $nodeversion "0.8.0" 
if [ $? != 0 ]; then
	echo "Please install node 0.8+ before running. Your version: $nodeversion"
	exit 1
fi

# Check npm version.
which npm
if [ $? != 0 ]; then
	echo 'Please reinstall node with npm before running.'
	exit 1
fi
npmversion=$(npm --version)
check_version $npmversion "0.0.1"
if [ $? != 0 ]; then
	echo "Please install npm 0.0.1+ before running. Your version: $npmversion"
	exit 1
fi

#
# Configuration
#

# Chmod /usr/local when necessary
if [ -O /usr/local/bin ]; then
	echo '/usr/local/bin is writeable.'
else
	echo 'Changing permissions to make /usr/local/ writeable by you...'
	sudo chown -R `whoami` /usr/local
	echo
fi

# Chmod ~/.npm for bizarre edge cases.
if [ -O ~/.npm ]; then
	echo '~/.npm is writeable.'
else
	echo 'Changing permissions to make ~/.npm writeable by you...'
	sudo chown -R `whoami` /Users/`whoami`/.npm
	echo
fi

#
# Basil installation.
#

if [ -L $(which basil) ]; then
		echo -n "Basil symlink already exists, removing ... "
		rm $(which basil)
		echo "done."
fi

echo -e "\nInitializing submodules ..."
git submodule sync
git submodule update --init --recursive
echo -e "\nInstalling node.js dependencies ..."
npm link --local

# manually link tealeaf-build as a node_module (to fix npm hang [that I fixed])
echo -e "\nManually linking tealeaf-build ..."
ln -s ../lib/tealeaf-build ./node_modules/tealeaf-build
ln -s ../node_modules/tealeaf-build/src/build.js ./node_modules/.bin/tealeaf-build

which basil
if [ $? != 0 ]; then
	if [ -e /usr/local/share/npm/bin/basil ]; then
		echo '[warn] You should add /usr/local/share/npm/bin/ to your PATH'
		ln -sf $(readlink /usr/local/share/npm/bin/basil) /usr/local/bin/basil
	else
		echo '[warn] We could not find basil in your path. Attempting a manual link...'
		BASIL_PATH=$(abs_path $(dirname $0){/bin/basil})
		echo $BASIL_PATH
		if [ ! -e $BASIL_PATH ]; then
			echo '[error] Could not find basil runtime.'
			exit 1
		fi
		ln -sf $BASIL_PATH /usr/local/bin/basil
	fi
fi

echo

node src/dependencyCheck.js

echo 

if [ $? != 0 ]; then
	echo 'Could not complete installation'
else
	echo 'Successfully installed. Type "basil" to begin.'
fi
