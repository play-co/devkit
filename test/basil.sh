#!/usr/bin/env bash

TEST_ROOT=$(cd -P $(dirname "$0") && pwd)
TEST_PROJECT_ROOT="$TEST_ROOT/testproject"
BASIL_ROOT=$(cd -P "$TEST_ROOT/../.." && pwd)
CONFIG_ROOT="$BASIL_ROOT/config.json"
SERVER_URL="http://localhost:9200"
SERVER_WAIT_TIME=4 #seconds to wait for server start

FAIL_COUNT=0
PASS_COUNT=0
FAIL_CODE=1
PASS_CODE=2

##
## utils
##

function print_msg {
		local cmd="$1" msg="$2" code="$3" tabs="\t\t"

		if [ "${#cmd}" -gt 9 ]; then
				tabs="\t"
		fi
		tput setaf "$code" #red or green
		if [ "$code" = "$FAIL_CODE" ]; then
				echo -n "Fail: "
		else
				echo -n "Pass: "
		fi
		tput sgr0 #reset color
		echo -e "$1$tabs- $2"
}

function warn {
		local msg="$1"
		tput setaf 3
		echo -n "Warning: "
		tput sgr0
		echo "$msg"
}

function pass {
		print_msg "$1" "$2" $PASS_CODE
		PASS_COUNT=$((PASS_COUNT+1))
}

function fail {
		print_msg "$1" "$2" $FAIL_CODE
		FAIL_COUNT=$((FAIL_COUNT+1))
}

function remove_project {
		if [ -d "$TEST_PROJECT_ROOT" ]; then
				if [ $(is_registered) = "y" ]; then
						cd "$TEST_PROJECT_ROOT"
						basil unregister /dev/null 2>&1
						cd "$TEST_ROOT"
				fi
				rm -rf "$TEST_PROJECT_ROOT"
		fi
}

function check_project {
		if [ -d "$TEST_PROJECT_ROOT" ]; then
				cd "$TEST_PROJECT_ROOT"
		else
				warn "Test project directory does not exist."
		fi
}

function test_command {
		local cmd="$1" args="$2"

		if $cmd "$args" > /dev/null 2>&1; then
				pass "$cmd" "Command exited cleanly."
		else
				fail "$cmd" "Command did not exit cleanly."
		fi
}

function test_file_exists {
		local cmd="$1" filename="$2" test="$3"

		case "$test" in
				'dir') test="-d";;
				'symlink') test="-L";;
				'file') test="-f";;
				*) test="-f"
		esac

		if [ "$test" "$filename" ]; then
				pass "$cmd" "$(basename $filename) exists."
		else
				fail "$cmd" "$(basename $filename) does not exist."
		fi
}

function is_registered {
		if grep "$TEST_PROJECT_ROOT" "$BASIL_ROOT/config.json" > /dev/null 2>&1; then
				echo "y"
		else
				echo "n"
		fi
}

function test_is_registered {
		local cmd="$1"
		if [ $(is_registered) = "y" ]; then
				pass "$cmd" "Project is registered."
		else
				fail "$cmd" "Project is not registered."
		fi
}

function test_is_not_registered {
		local cmd="$1"
		if [ $(is_registered) = "n" ]; then
				pass "$cmd" "Project is not registered."
		else
				fail "$cmd" "Project is registered."
		fi
}

function test_is_empty {
		local cmd="$1" varname="$2" varval="$3"
		if [ -z "$varval" ]; then
				pass "$cmd" "$varname is empty."
		else
				fail "$cmd" "$varname is not empty."
		fi
}

function test_is_not_empty {
		local cmd="$1" varname="$2" varval="$3"
		if [ -n "$varval" ]; then
				pass "$cmd" "$varname is not empty."
		else
				fail "$cmd" "$varname is empty."
		fi
}

##
## basil command tests
##

function test_about {
		test_command 'basil about'
}

function test_help {
		test_command 'basil help'
}

function test_version {
		local cmd="basil version" version=$($cmd)

		test_command "$cmd"
		test_is_not_empty "$cmd" "Version" "$version"
}

function test_update {
		fail 'basil update' "Test not implemented."
}

function test_init {
		local cmd="basil init"

		test_command "$cmd" "$TEST_PROJECT_ROOT"

		if [ ! -d "$TEST_PROJECT_ROOT" ]; then
				warn "Subsequent tests require a project, aborting."
				exit 1
		fi

		#check files
		test_file_exists "$cmd" "$TEST_PROJECT_ROOT" 'dir'
		test_file_exists "$cmd" "$TEST_PROJECT_ROOT/manifest.json"
		test_file_exists "$cmd" "$TEST_PROJECT_ROOT/src" 'dir'
		test_file_exists "$cmd" "$TEST_PROJECT_ROOT/resources" 'dir'
		test_file_exists "$cmd" "$TEST_PROJECT_ROOT/sdk" 'symlink'
		test_file_exists "$cmd" "$TEST_PROJECT_ROOT/src/Application.js"

		#should be registered
		test_is_registered "$cmd"
}

function test_register {
		local cmd="basil register"

		## setup ...
		check_project

		#if already registered, unregister
		if [ $(is_registered) = "y" ]; then
				basil unregister > /dev/null 2>&1
		fi

		## tests ...
		test_is_not_registered "$cmd"
		test_command "$cmd"
		test_is_registered "$cmd"
}

function test_unregister {
		local cmd="basil unregister"

		## setup ...
		check_project

		#if not registered, register
		if [ $(is_registered) = "n" ]; then
				basil register > /dev/null 2>&1
		fi

		## tests ...
		test_is_registered "$cmd"
		test_command "$cmd"
		test_is_not_registered "$cmd"
}

function test_serve {
		local cmd="basil serve"

		## set up ...
		check_project

		## tests ...

		if ($cmd > /dev/null 2>&1 &); then
				pass "$cmd" "Server started."
		else
				fail "$cmd" "Server error."
		fi
		
		echo "Waiting for server to start ..."
		sleep "$SERVER_WAIT_TIME"

		local server_pid=$(ps | grep "node .*basil serve" | grep -v "grep" | head -n1 | awk '{print $1}')
		local inspector_pid=$(ps | grep "node .*NativeInspector" | grep -v "grep" | head -n1 | awk '{print $1}')

		if [ -n "$server_pid" ]; then
				pass "$cmd" "Server process is running."
		else
				fail "$cmd" "Server process is not running."
		fi

		if [ -n "$inspector_pid" ]; then
				pass "$cmd" "Native Inspector process is running."
		else
				fail "$cmd" "Native Inspector process is not running."
		fi

		if curl --silent "$SERVER_URL" > /dev/null 2>&1; then
				pass "$cmd" "Server is running."
		else
				fail "$cmd" "Server is not running."
		fi

		if kill "$server_pid" > /dev/null 2>&1; then
				pass "$cmd" "Server process killed."
		else
				fail "$cmd" "No server process to kill."
		fi

		if kill "$inspector_pid" > /dev/null 2>&1; then
				pass "$cmd" "Native Inspector process killed."
		else
				fail "$cmd" "No Native Inspector process to kill."
		fi

		if ps | grep "node .*basil serve" | grep -v "grep" > /dev/null 2>&1; then
				fail "$cmd" "Server process is still running."
		else
				pass "$cmd" "No server process still running."
		fi

		if ps | grep "node .*NativeInspector" | grep -v "grep" > /dev/null 2>&1; then
				fail "$cmd" "Native Inspector process is still running."
		else
				pass "$cmd" "No Native Inspector process still running."
		fi
}

function test_build {
		fail 'basil build' "Test not implemented."
}

##
## setup
##

if [ ! -x "$(which basil)" ]; then
		echo "Fatal: No basil, no tests. Exiting."
		exit 1
fi

if [ -d "$TEST_PROJECT_ROOT" ]; then
		warn "$(basename $TEST_PROJECT_ROOT) already exists, removing and unregistering."
		remove_project
fi

##
## run tests
##

test_about
test_help
test_version
test_update
test_init
test_register
test_serve
test_build
test_unregister

##
## cleanup
##

echo "$(($PASS_COUNT+$FAIL_COUNT)) tests: $PASS_COUNT passed, $FAIL_COUNT failed."
remove_project

if [ $FAIL_COUNT -gt 0 ]; then
		exit 1
fi
