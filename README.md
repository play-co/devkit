# Install the Game Closure DevKit

	  $ git clone git@github.com:gameclosure/devkit.git
	  $ cd devkit
	  $ ./install.sh

Type `basil` to begin. At any time, you can update to the latest tag:

    $ basil update

This gets the latest version, or `basil update -c (alpha, beta...)` to update
to the latest version of that channel.

Initialize a new project:

	$ basil init myapp

And in your application directory:

	$ basil serve

## Build Android

Set `android.root` in config.json to your
[android](https://github.com/gameclosure/native-android) path.

	{
		"android": {
			"root": "your/path",
	    "key": "your key",
	    "keystore": "/path/to/your/keystore",
	    "keypass": "yourpass",
	    "storepass": "storepass"
	  }
	}

Then run:

	$ basil debug native-android

Or:

	$ basil release native-android

## Build iOS

Set `ios.root` in config.json to your 
[ios](https://github.com/gameclosure/native-ios) path.

	{
		"ios": { "root": "your/path" }
	}

Then run:

	$ basil debug native-ios

Or:

	$ basil release native-ios

## Dependencies

* Node 0.8+
* Git 1.7.10+
* Java Runtime

## Code Layout

	basil
	|-- bin
	|   `-- basil 					# the basil executable
	|-- lib 						# libraries (most of these are submodules). Check the 
	|   | 							#     Submodule Overview section below.
	|   |-- NativeInspector
	|   |-- gcapi
	|   |-- js.io
	|   |-- squill
	|   |-- timestep
	|   `-- tealeaf-build-tools.jar # java tools (xslt, closure compiler, spriter).
	|-- node_modules 				# the typical node_modules directory created by npm
	|-- priv 						# private developer tools.
	|-- sdk 						# check the sdk Directory section below.
	|-- src
	|   |-- basil.js 				# the main basil script
	|   |-- common.js 				# helpful functions for basil development
	|   |-- git.js 					# utility class to manage git
	|   |-- projectManager.js 		# utility class to manage game projects
	|   |-- about
	|   |   `-- about.js 			# standard about/credits text printer
	|   |-- deploy
	|   |   `-- index.js 			# to deploy your app to the game closure dev portal
	|   |-- init
	|   |   |-- index.js 			# initialise a new project, optionally with a template
	|   |   `-- templates 			# templates for the init function
	|   |-- register
	|   |   `-- index.js 			# register an existing project to show it in basil
	|   |-- reinstall
	|   |   `-- index.js 			# (re)install a built game on a connected android phone
	|   |-- serve 					# server. more information below in the Server section.
	|   |-- update 
	|   |   |-- list.js 			# list available versions of the DevKit
	|   |   `-- update.js 			# update the DevKit
	|   `-- update-android
	|       `-- index.js 			# update the android project (very deprecated)
	|-- test 						# unit tests for basil using mocha
	`-- tools
	    |-- shims
	    |   |-- shimMaker.js
	    |   `-- timestepShims.json
	    |-- timestepShims
	    `-- upgradeTargets


#### Server

	src/serve
	|-- index.js 		# the javascript that configures and launches an express server
	|-- plugins
	|   |-- about 		# the pane that shows the GC logo and the version updater
	|   |-- fonts 		# the font builder pane
	|   |-- native 		# the pane showing the native inspector
	|   |-- projects 	# the project selection pane
	|   `-- simulate 	# the plugin serving the simulation page
	`-- public 			# base html and some utility classes

The server frontend is built using [jsio](http://github.com/gameclosure/js.io)
and [squill](http://github.com/gameclosure/squill). The server itself is built
using [express](http://expressjs.com).

Each plugin in the `plugins` directory is a pane, and each plugin also has
some plain javascript that should set up the express routes and some other
functionality.

For example, the `about` plugin:

	src/serve/plugins/about
	|-- manifest.json
	|-- plugin.js
	`-- static
		|-- Pane.js
		`-- style.css

 * `manifest.json` is a manifest for the pane, including the display name of
   the pane, version, author, etc.
 * `plugin.js` contains some javascript to update the DevKit, and as such has
   the main functionality of this pane.
 * `static` contains the css (`style.css`) and the javascript (`Pane.js`) that
   contains the layout of the pane.


#### sdk Directory

	sdk
	|-- api  			-> basil/lib/gcapi/api/
	|-- jsio 			-> basil/lib/js.io/packages/
	|-- lib   			-> basil/lib/timestep/lib/
	`-- squill 			-> basil/lib/squill/

The sdk directory points to several js.io modules. These are added to the js.io
import path by default, so that you'll be able to import anything inside these
directories via jsio.


### Submodule Overview

	lib
	|-- NativeInspector
	|-- gcapi
	|-- js.io
	|-- squill
	`-- timestep

#### NativeInspector

NativeInspector is the Webkit Inspector, but for attached android phones
running Game Closure DevKit games.

#### gcapi

Non-game engine related javascript that is still necessary for projects that
don't use timestep.

#### js.io

[js.io](http://github.com/gameclosure/js.io) is used for all Game Closure
DevKit games, and the DevKit itself. In particular, js.io gives you import
statements

	import ui.View as View;

and a class structure

	exports = new Class(/*superclass*/ ui.View, function(supr) {
		this.init = function(opts){
			//called on constructor

			//call the superconstructor
			supr(this, 'init', opts);
		}
	});

This allows for 'proper' object-oriented programming in javascript.

#### squill

[squill](http://github.com/gameclosure/squill) is a ui library using
javascript. The web frontend of the DevKit is built using squill, as are some
UI components in timestep.

#### timestep

timestep is the game engine behind Game Closure DevKit games. It includes a
view hierarchy, audio, multiple ui components, etc.

## Addons

Addons exist under `basil/addons`. In basil they are stored as submodules.
When releasing, harvester will grab the submodule at the commited reference
and tag it with the same version as basil. The install script will look inside
the [`addon-registry`](http://github.com/gameclosure/addon-registry) to
determine what type of addon. There are two types of addons.

**Core:** Core addons are released with the DevKit so they are always in sync.

**User:** User addons are not as closely tied and need to specify in the
registry what version of the DevKit it supports.

For core addons, the install script will checkout the same version as the
DevKit. User addons will checkout the latest version supported.

## Ports

Basil uses ports in the range 9200 - 9240. 9200 - 9220 are used for simulating
projects, and other utilities and services use the remaining ports.

* 9220 - Native Webkit Inspector
* 9221 - Native Webkit Inspector
* 9222 - Native Webkit Inspector
* 9223 - Unused
* 9224 - Unused
* 9225 - Native View Inspector
* 9226 - Native View Inspector
* 9227-9240 - Unused
