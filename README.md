# DevKit

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

### Getting Started

1. Clone this repo

  ```
  git clone https://github.com/gameclosure/devkit2
  cd devkit2/
  ```

2. Install

  ```
  npm link
  ```

3. Type `devkit serve` to start!

## Creating your first game

You need a `shortname` for your game.  The `shortname` should start with a letter and contain only letters and numbers.  For this example, we'll use the `shortname` of `mygame`.

1. Run `devkit init mygame`
2. Navigate to `http://localhost:9200` and select your game. You should now see your game running in the web simulator!
3. Open `mygame/src/Application.js` and start coding!

### Updating the DevKit

DevKit consists of two parts: the command-line interface (the CLI, `devkit`) and the API running in your game.

To update the CLI, run `devkit self-update`.

To update the API in your game, run `devkit upgrade` from inside your game's directory.

### Game Modules

All dependencies (modules) for your game live in the `modules/` folder of your game.  Initially, DevKit games have only one dependency, `devkit`.  You can install additional modules to enable functionality in your game such as analytics or accelerator support.

To install a module:
 * Open a terminal and navigate to your game's directory
 * Run `devkit install [module-name]`

Note that the current version of the installed module is stored in your game's manifest under `dependencies`.  If your game is under version control, you should commit the manifest after adding a dependency.  Anyone else developing your game should run `devkit install` after pulling your changes, which will automatically install all the dependencies required for your game.

For 3rd-party modules, you should provide the full git URL for your module, for example:

  `devkit install https://github.com/gameclosure/accelerometer`

