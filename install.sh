#!/usr/bin/env bash

# Make sure we are not running as root
if [[ $EUID -eq 0 ]]; then
   echo "This script should not be run as root" 1>&2
   exit 1
fi

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

echo -e "\nInitializing GC SDK libraries ..."

# setup for gc internal repositories
remoteurl=`git config --get remote.origin.url`
PRIV_SUBMODS=false && [[ "$remoteurl" == *devkit-priv* ]] && PRIV_SUBMODS=true
if $PRIV_SUBMODS; then
	echo "Using private submodules..."
	cp .gitmodules-priv .gitmodules
fi

if ! git submodule sync; then
		error "Unable to sync git submodules"
		exit 1
fi

git submodule update --init --recursive

if $PRIV_SUBMODS; then
	git checkout .gitmodules
fi

if ! npm install; then
		error "Running npm install"
		echo "Try running: sudo chown -R \$USER /usr/local"
		exit 1
fi

echo

node bin/checkSymlinks
node src/dependencyCheck.js

if [[ "$1" != "--silent" ]]; then
	node src/analytics.js
fi

echo 

CURRENT_BASIL_PATH=$(which basil)
TARGET_BASIL_PATH="$BASIL_ROOT/bin/basil"
SYSTEM_WIDE_INSTALL=false

read -p "Would you like to link basil to /usr/local/ (Will not work for other users)? [Y/N]" -n 1 -r

if [[ $REPLY =~ ^[Yy]$ ]]; then
	echo 'Trying to execute link basil to /usr/local with sudo'

	if [[ -e /usr/local/bin/basil ]]; then
		sudo sh -c "unlink /usr/local/bin/basil; ln -s '$TARGET_BASIL_PATH' /usr/local/bin/basil"
	else
		sudo ln -s "$TARGET_BASIL_PATH" /usr/local/bin/basil
	fi

	if [[ $? != 0 ]]; then
		error "Could not link basil to /usr/local"
		SYSTEM_WIDE_INSTALL=false
	fi
fi


if [[ $SYSTEM_WIDE_INSTALL == true ]]; then
	echo "Successfully installed. Type $BASIL_ROOT/bin/basil to begin."
	echo "You may wish to add $BASIL_ROOT/bin to your \$PATH"
else
	echo 'Successfully installed. Type "basil" to begin.'
fi

