#!/usr/bin/env bash

BASIL_ROOT=$(cd -P $(dirname "$0") && pwd)

if [[ -z "$BASH_VERSION" ]]; then
		echo "Error: GC SDK install script should be run in bash."
		exit 1
fi

echo $'\033[1;32m-{{{>\033[0m Game Closure SDK'
echo 'Installing...'

function abs_path() {
	echo "$1" | sed "s@^./@$PWD@"
}

function error () {
	echo -e "\033[1;31mError:\033[0m $@"
}

function warn () {
	echo -e "\033[1;33mWarning:\033[0m $@"
}

if ! which git > /dev/null; then
		error "GC SDK requires git to install. (http://git-scm.com)"
		exit 1
fi

if ! which node > /dev/null; then
		error "GC SDK requires node 0.8+ to install. (http://nodejs.org)"
		exit 1
fi

if ! which npm > /dev/null; then
		error "GC SDK requires npm to install. (http://npmjs.org)"
		exit 1
fi

#
# Permission checks
#
#

if [[ ! -d "$HOME/.npm" ]]; then
		mkdir "$HOME/.npm"
fi

if [[ ! -w "$HOME/.npm" ]]; then
		error "GC SDK install requires write permission to $HOME/.npm"
		echo "Try: sudo chown -R $USER $HOME/.npm"
		exit 1
fi

#
# Install
#

BASIL_PATH=$(which basil)

if [[ -L "$BASIL_PATH" ]]  ; then
		echo "Removing old basil symlink."
		rm "$BASIL_PATH"
fi

echo -e "\nInitializing GC SDK libraries ..."

if ! git submodule sync; then
		error "Unable to sync git submodules"
		exit 1
fi

# setup for gc internal repositories
remoteurl=`git config --get remote.origin.url`
if [[ "$remoteurl" == *gcsdk-priv* ]]; then
	cd lib/timestep
	git remote set-url origin "https://github.com/gameclosure/timestep-priv.git"
	cd ../../lib/gcapi
	git remote set-url origin "https://github.com/gameclosure/gcapi-priv.git"
	cd ../../
fi

if ! git submodule update --init --recursive; then
		error "Unable to update git submodules"
		exit 1
fi

if [ ! -w "/usr/local" ]; then
		error "You need write permissions to /usr/local"
		echo "Try running: sudo chown -R \$USER /usr/local"
		exit 1
fi

if ! npm link --local; then
		error "Linking npm to local"
		echo "Try running: sudo chown -R \$USER /usr/local"
		exit 1
fi

#
# Check if basil on path
#

which basil
if [[ $? != 0 ]]; then
	if [[ ! -w /usr/local/bin ]]; then
			error "GC SDK install requires write permission to /usr/local/bin"
			echo "Try: sudo chown -R $(whoami) /usr/local/bin"
			exit 1
	fi
	if [[ -e /usr/local/share/npm/bin/basil ]]; then
		warn "You should add /usr/local/share/npm/bin/ to your PATH"
		ln -sf $(readlink /usr/local/share/npm/bin/basil) /usr/local/bin/basil
	else
		warn "We could not find basil in your path. Attempting a manual link..."
		BASIL_PATH=$(abs_path $(dirname $0){/bin/basil})
		echo $BASIL_PATH
		if [[ ! -e $BASIL_PATH ]]; then
			error 'Could not find basil runtime.'
			exit 1
		fi
		ln -sf $BASIL_PATH /usr/local/bin/basil
	fi
fi

echo

node src/dependencyCheck.js

echo 

if [[ $? != 0 ]]; then
	error 'Could not complete installation'
else
	echo 'Successfully installed. Type "basil" to begin.'
fi
