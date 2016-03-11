'use strict';
let lazy = require('lazy-cache')(require);

lazy('fs');
lazy('path');

let BaseCommand = require('devkit-commands/BaseCommand');

class VersionCommand extends BaseCommand {
  constructor () {
    super();
    this.name = 'version';
    this.description = 'prints the version of DevKit';
  }

  exec () {
    console.log(this.getVersion());
    return Promise.resolve();
  }

  getVersion () {
    let packageJson = lazy.path.join(__dirname, '..', '..', 'package.json');
    let packageInfo = JSON.parse(lazy.fs.readFileSync(packageJson));
    return packageInfo.version;
  }
}

module.exports = VersionCommand;
