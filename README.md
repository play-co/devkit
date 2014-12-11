The Game Closure DevKit
=======================

HTML5 JavaScript game development kit. Run in your browser; build to iOS and
Android.

![devkit](https://cloud.githubusercontent.com/assets/4285147/5399582/7ab4683a-8121-11e4-9f15-6f3b1194b2dc.png)

## Installation

### OS X

DevKit requires that you install few dependencies first:

 * [node.js](http://nodejs.org/) v10 or higher
 * [git](http://git-scm.com/)

We recommend using [brew](http://brew.sh/) to install these if you do not have
them already.

### Optional Dependencies

Building games for iOS or Android requires installing the corresponding SDKs:

 * [Xcode](https://developer.apple.com/xcode/) - required for building games for
   iOS
 * [Android SDK](http://developer.android.com/sdk/index.html) - required for
   building games for Android
 * [Android NDK](https://developer.android.com/tools/sdk/ndk/index.html) -
   required for building games for Android
 * [Ant](http://ant.apache.org/manual/install.html) - required for building
   games for Android

NOTE: please ensure the apache build tools and ant are available in your path so
DevKit can find them when trying to build!

### Getting Started

Now, install devkit. You may run into some weird errors if you don't own your
global `node_modules` folder.

    npm install -g devkit


### Linux
Follow the instructions on [the project wiki](https://github.com/gameclosure/devkit2/wiki/Install-Instructions---Linux)

### Windows
Follow the instructions on [the project wiki](https://github.com/gameclosure/devkit2/wiki/Install-Instructions---Windows)



## Creating your first game

You need a `shortname` for your game.  The `shortname` should start with a
letter and contain only letters and numbers.  For this example, we'll use the
`shortname` of `mygame`.

1. Run `devkit init mygame` to create the mygame folder and install the
   dependencies.
2. Run `devkit serve` to start the simulator
3. Navigate to `http://localhost:9200` and select your game. Press the
   **simulate** button on the top right. You should now see your game running in
   the web simulator!
4. Open `mygame/src/Application.js` and start coding!

## Building on Device
First, ensure you have the proper pre-requisites installed and on your path for
the target device. See above for more details.

DevKit can create builds by specifying a build type (debug or release) and a
build target (default options:
native-android, native-ios, browser-desktop, browser-mobile). Debug builds
include all the logs, do not strictly verify everything, and allow debugging on
device via the native inspector. Release builds strip logs and try to verify as
much as possible.

All your builds will be available in your <game-folder>/build/<build-type>
folder.

### Android
Building for native-android will create an apk directly.
```
devkit debug native-android
devkit release native-android
```

Pro-Tip: You can add the --install flag to automatically install the apk on the
connected device, or the --open flag to install and open it.

### iOS
Building for native-ios will create an xcode project and open it with xcode.
Attach your device and click build.
```
devkit debug native-ios
devkit release native-ios
```


## Debugging on Device
As of DevKit2, the Native Inspector is no longer packaged with DevKit itself. To
debug on device, you need to clone and run the
NativeInspector(https://github.com/gameclosure/nativeinspector).

```
git clone git@github.com:gameclosure/nativeinspector
cd nativeinspector
node NativeInspector.js
```

Ensure your device is plugged in, then point your browser to localhost:9220 (or
whatever the NativeInspector console suggests). Now, when you run a debug build
on a connected device you will be able to use the in browser debugger just like
when running the simulator.


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
game.  Initially, DevKit games have only one dependency, `devkit-core`.  You can
install additional modules to enable functionality in your game such as
analytics or accelerator support.

To install a module:
 * Open a terminal and navigate to your game's directory
 * devkit install _devkit module's git repository URL_

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
 * `devkit apps`: logs a list of all registered apps and basic information about
   each one
 * `devkit apps -s`: logs a short list of all registered apps with just their
   titles, paths, and ids
 * `devkit apps --json`: logs a long list of apps and all details about them in
   JSON format
 * `devkit modules`: shows the version of each module in the current app from
   the manifest as well as the current version of the module (if it differs)
 * `devkit modules --save-current`: updates an app's dependencies in the app
   manifest to reflect the current git version for each module on the file
   system
 * `devkit modules devkit-core --save-current`: same as above, but only for the
   devkit-core module
