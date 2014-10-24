# DevKit

This is a developer preview of DevKit2. Some features are not yet implemented,
and others are not yet stable. Please post any issues (and fixes, hopefully!)
on the github issue tracker at https://github.com/gameclosure/devkit2.


## Installation

### OS X

DevKit requires that you install few dependencies first:

 * [node.js](http://nodejs.org/) v10 or higher
 * [git](http://git-scm.com/)

We recommend using [brew](http://brew.sh/) to install these if you do not have them already.

### Optional Dependencies

Building games for iOS or Android requires installing the corresponding SDKs:

 * [Xcode](https://developer.apple.com/xcode/) - required for building games for iOS
 * [Android SDK](http://developer.android.com/sdk/index.html) - required for building games for Android
 * [Android NDK](https://developer.android.com/tools/sdk/ndk/index.html) - required for building games for Android
 * [Ant](http://ant.apache.org/manual/install.html) - required for building games for Android

NOTE: please ensure the apache build tools and ant are available in your path so
DevKit can find them when trying to build!


### Getting Started

1. Clone this repo

  ```
  git clone https://github.com/gameclosure/devkit2
  cd devkit2/
  ```

2. Install - earlier versions of npm and node will NOT work correctly

  ```
  npm install
  ```

3. Add devkit to your path using npm link (or manually add to your path)
  ```
  npm link
  ```

3. Type `devkit serve` to start!


## Creating your first game

You need a `shortname` for your game.  The `shortname` should start with a
letter and contain only letters and numbers.  For this example, we'll use the
`shortname` of `mygame`.

1. Run `devkit init mygame` to create the mygame folder and install the
   dependencies.
2. Run `devkit serve` to start the simulator
3. Navigate to `http://localhost:9200` and select your game. You should now see your game running in the web simulator!
4. Open `mygame/src/Application.js` and start coding!

Pro-tip: You can specify a custom application template by adding the
--local-template <path-to-local-app-template> or
--git-template <path-to-git-repository> parameters to the `devkit init`
command. This will create your new application starting with the given
template file layout. You may want to fork the existing default template from
https://github.com/gameclosure/devkit-application-template and create your own.

## Migrating a DevKit1 Game to DevKit2

Please check docs.gameclosure.com for the latest migration instructions from
DevKit1 to DevKit2. If your existing DevKit1 game has no additional
dependencies, you can install DevKit2 by navigating to the top of the game
directory and running the following command:

```
devkit install
```

This will install the default dependencies and add your game to the DevKit2
simulator. If your app requires additional modules, please see the section about
migrating addons and follow the online app migration instructions.


### Updating the DevKit

DevKit consists of two parts: the command-line interface (the CLI, `devkit`) and
the API running in your game.

To update the API in your game, run `devkit upgrade` from inside your game's
directory.


### Game Modules

All dependencies (modules) for your game live in the `modules/` folder of your
game.  Initially, DevKit games have only one dependency, `devkit`.  You can
install additional modules to enable functionality in your game such as
analytics or accelerator support.

To install a module:
 * Open a terminal and navigate to your game's directory
 * `cd modules`
 * git clone url-of-module-repository modulename

NOTE: be sure you have an updated version of your module that supports DevKit2
(an easy check is that DevKit2 modules require a package.json file). Migrating
DevKit1 modules to support DevKit2 is fairly simple - get the instructions
at docs.gameclosure.com to contribute.


### Inspecting your apps from the command line

The devkit command can be used to query information about your apps.  The
commands `apps` and `modules` describe the apps and their modules, respectively,
that devkit knows about on your system.  Both commands take an optional
flag `--json` (or `-j`) for logging the result to stdout in JSON
format.

Example commands:
 * `devkit apps`: logs a list of all registered apps and basic information about each one
 * `devkit apps -s`: logs a short list of all registered apps with just their titles, paths, and ids
 * `devkit apps --json`: logs a long list of apps and all details about them in JSON format
 * `devkit modules`: shows the version of each module in the current app from the manifest as well as the current version of the module (if it differs)
 * `dekvit modules --save-current`: updates an app's dependencies in the app manifest to reflect the current git version for each module on the file system
 * `dekvit modules devkit-core --save-current`: same as above, but only for the devkit-core module
