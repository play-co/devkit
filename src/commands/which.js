var lazy = require('lazy-cache')(require);

lazy('path');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var VersionCommand = Class(BaseCommand, function (supr) {

  this.name = 'which';
  this.description = 'prints the full path to DevKit';

  this.exec = function () {
    console.log(this.getLocation());
  };

  this.getLocation = function () {
    return lazy.path.join(__dirname, '..', '..');
  };
});

module.exports = VersionCommand;
