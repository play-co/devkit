Migrating DevKit Games from DevKit 0.x to DevKit 2.0
===

A Note on Versioning
---

DevKit versions below 1.0 will collectively be referred to in this document as DevKit 1.0.

DevKit 2.0 makes a number of structural changes to games.  This guide contains all the information you need to convert your game into a DevKit 2.0 game.

File Structure
---

### sdk symlink

DevKit 1.0 created a symlink in every game folder called `sdk/`.  This folder contained all of the client-side library code.

DevKit 2.0 removes this symlink in favor of `npm` packages.  This means that when hosting multiple games, each game has its own copy of the libraries that it depends upon.  Hence you can upgrade a support library in one game without breaking your other games.  These npm packages are managed by the `npm` command-line tool and a `package.json` file.

### package.json

The dependencies in your game are specified using a `package.json` file.  A `package.json` file must have a `name` and a `version`.

The dependencies are specified in the `dependencies` hash:

Minimal DevKit 2.0 game's `package.json`:
```
{
  "name": "mygame",
  "version": "0.0.1",
  "dependencies": {
    "devkit": "git+http://github.com/gameclosure/devkit-api/#2.0.0",
    "devkit-build": "git+http://github.com/gameclosure/devkit-build/#2.0.0",
    "js.io": "git+https://github.com/gameclosure/js.io/#1.0.5",
    "squill": "git+https://github.com/gameclosure/squill/#0.0.1",
    "timestep": "git+https://github.com/gameclosure/timestep/#2.0.0"
  }
}
```

### Installing packages

When you add or modify a dependency in your `package.json`, run `npm install` from the terminal to update all packages.

### Version Control

It's generally recommended to not store your `node_modules` folder in version control.  For users of git, you should add `node_modules` to your game's `.gitignore` file.

### Addons

If your project used DevKit 1.0 addons, these addons must be converted into an npm package to support DevKit 2.0.  Once converted, the package should be added to your `dependencies`:

```
  "dependencies": {
    ...
    "my-addon": "download-url#version",
    ...
  }
```

Note that if the package is published in the npm repository, you need only include the version number.

#### Importing a module (addon)

Previously, addons were imported from the `plugin.[module-name]` namespace.  For example, importing the `flurry` addon looked like:

```
import plugins.flurry.flurry as flurry;
```

The `plugins` namespace no longer exists, and all modules add themselves to your app's path.  The `flurry` import should now look like:

```
import flurry;
```

Consult your addon's documentation for further information.  Addon authors should read the Addon Migration section in this document.

### Native builds

The `devkit-build` module provides the default set of build targets.  Builds proceed from the terminal using `basil debug browser-mobile` or `basil release browser-mobile`.

`devkit-build` does not download `ios` or `android` build libraries by default.  To add support for these, add one or both of the following lines to your game's `package.json`:

```
  "dependencies": {
    ...
    "native-ios": "git+http://github.com/gameclosure/native-ios/#2.0.0",
    "native-android": "git+http://github.com/gameclosure/native-android/#2.0.0"
    ...
  }
```

### Upgrading DevKit

Run `devkit update` to update the core `devkit` runtime.

### Upgrading a game

When a new version of DevKit libraries is released, you can automatically upgrade a single package to the latest version with:

```
devkit upgrade timestep
```

Or all of the modules at once:
```
devkit upgrade all
```
which will upgrade `timestep`, `squill`, `jsio`, `devkit-api`, and `devkit-build`.

### Converting addons to packages

To convert a DevKit 1.0 addon to a package, add a `package.json` file.  The `package.json` file should define the package name and version.  It can optionally define a special `devkit` key:

Sample DevKit 2.0 package `package.json` file:
```
{
  "name": "devkit-flurry",
  "version": "0.0.1",
  "dependencies": {
    ...
  },
  "devkit": { # <-- optional key
    "clientPaths": { # <-- adds to game-side import path
      "flurry": "js/"
    }
  }
}
```

The `clientPaths` dictionary stores mappings between namespaces and file paths.  In this example, `"flurry": "js/"` indicates that the `flurry` import namespace will look for files in the `js/` folder of this package.  Hence `import flurry` will import the file `js/index.js` and `import flurry.util.print` will import the file `js/util/print.js`.

