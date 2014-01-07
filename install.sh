#!/usr/bin/env bash

install_type=""
is_silent=0
while [ $# -gt 0 ]; do
    case $1 in
        --basic) install_type="basic"; shift 1 ;;
        --silent) is_silent=1; shift 1 ;;
        *) shift 1 ;;
    esac
done


# Make sure we are not running as root
if [[ $EUID -eq 0 ]]; then
   echo "This script should not be run as root" 1>&2
   exit 1
fi

BASIL_ROOT=$(cd -P $(dirname "$0") && pwd)

if [[ -z "$BASH_VERSION" ]]; then
		echo "Error: GC DevKit install script should be run in bash."
		exit 1
fi

echo $'\033[1;32m-{{{>\033[0m Game Closure DevKit'
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
		error "GC DevKit requires git to install. (http://git-scm.com)"
		exit 1
fi

if ! which node > /dev/null; then
		error "GC DevKit requires node 0.8+ to install. (http://nodejs.org)"
		exit 1
fi

if ! which npm > /dev/null; then
		error "GC DevKit requires npm to install. (http://npmjs.org)"
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
		error "GC DevKit install requires write permission to $HOME/.npm"
		echo "Try: sudo chown -R $USER $HOME/.npm"
		exit 1
fi

# Prompt for global install early to avoid error: 0 problem
SYSTEM_WIDE_INSTALL=false

if [[ $is_silent != 1 ]]; then
	if [[ `uname` != MINGW32* ]]; then
		read -p "Would you like to install the Game Closure DevKit system-wide in /usr/local/bin [Y/n] ?" -r
		while [[ ($REPLY != 'y') && ($REPLY != 'Y') && ($REPLY != 'n') && ($REPLY != 'N') ]]; do
			read -p "Invalid option \"$REPLY\". Please type either Y or n:" -r
		done

		echo

		if [[ ($REPLY != 'n') && ($REPLY != 'N') ]]; then
			SYSTEM_WIDE_INSTALL=true
		fi
	fi
fi

#
# Install
#

echo -e "\nInitializing GC DevKit libraries ..."

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

git submodule init

if [[ $install_type == "basic" ]]; then
	git submodule deinit projects/whack-that-mole
	git submodule deinit projects/platformer
	git submodule deinit lib/menus
	git submodule deinit lib/shooter
	git submodule deinit projects/demoMenus
	git submodule deinit projects/demoShooter
	git submodule deinit lib/isometric
	git submodule deinit projects/demoIsometricGame
fi

git submodule update --recursive

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
node src/dependencyCheck.js $install_type

if [[ $is_silent != 1 ]]; then
	node src/analytics.js

	CURRENT_BASIL_PATH=$(which basil)
	TARGET_BASIL_PATH="$BASIL_ROOT/bin/basil"

	if [[ `uname` == MINGW32* ]]; then
		npm link --local
		SYSTEM_WIDE_INSTALL=true
	else
		if [[ $SYSTEM_WIDE_INSTALL == true ]]; then
			echo
			echo 'Trying to link from /usr/local with sudo.  You may be prompted for your root password.'
			SYSTEM_WIDE_INSTALL=true

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
	fi

	if [[ $SYSTEM_WIDE_INSTALL == false ]]; then
		echo $'\033[1;32mSuccessfully installed. -{{{>\033[0m'  "Type \"$BASIL_ROOT/bin/basil\" to begin."
		echo "+ Suggestion: You may wish to add $BASIL_ROOT/bin to your \$PATH"
	else
		echo $'\033[1;32mSuccessfully installed. -{{{>\033[0m  Type "basil" to begin.'
	fi

fi
