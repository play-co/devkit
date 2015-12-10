#!/bin/bash
set -e
# Must be invoked by npm install
DEVKIT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )"


echo "ensuring java is installed"
command -v java >/dev/null 2>&1 || { echo >&2 "java is required. please install java and try again."; exit 1; }


echo "building builtin modules"
PLUGIN_BUILDER="$DEVKIT_DIR/node_modules/devkit-plugin-builder/bin/pluginBuilder.js"

function build_module {
  MODULE=$1
  cd $MODULE
  npm install
  $PLUGIN_BUILDER .
}

build_module $DEVKIT_DIR/modules/devkit-view-inspector
build_module $DEVKIT_DIR/modules/remote-debugger
