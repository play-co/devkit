var commands = require('./index');
var BaseCommand = require('../util/BaseCommand').BaseCommand;
var color = require('cli-color');

var InstructionsCommand = Class(BaseCommand, function (supr) {

  this.name = 'instructions';
  this.description = 'prints some basic getting started instructions';

  this.exec = function (command, args, cb) {
    var target = args.shift();

    // TODO: make context based coloring and remove all of this cruft
    console.log('-----------------------------------------------');
    console.log("Use " + color.yellowBright("devkit help") +
                 " to see the full command list.\n");

    if (target === 'devkit_install') {
      console.log(
        color.magentaBright("Devkit2 is now installed!") +
        "\n"
      );
      console.log(" * Create your first application with " +
                 color.yellowBright("devkit init <game_name>") +
                 "\n");
    } else if (target === 'new_application') {
      console.log(
        color.magentaBright("Your application is now ready!") + ' ' +
        color.cyanBright("Some quick tips:\n")
      );
      console.log(" * Your application entry point is now src/Application.js" +
                 "\n");
      console.log(" * Start the Devkit simulator with " +
                 color.yellowBright("devkit serve") +
                 ' then open localhost:9200 in your browser.' +
                 "\n");
      console.log(" * Create a debug build for mobile with " +
                color.yellowBright(
                  "devkit debug <build-target> [native-android, native-ios]"
                ) +
                "\n"
              );
      console.log(" * Create a release build for mobile with " +
                color.yellowBright(
                  "devkit release <build-target> [native-android, native-ios]"
                ) +
                "\n"
              );
      console.log(" * Create a build for the browser with " +
                color.yellowBright(
                  "devkit <build-type> [debug, release] " +
                  "<build-target> [browser-desktop, browser-mobile]"
                ) +
                "\n"
              );
    }
    console.log(color.cyanBright(
      "Please report any issues at https://github.com/gameclosure/devkit2."
    ));
    console.log(color.greenBright(
      "The documentation is available online at http://docs.gameclosure.com"
    ));
    console.log(color.cyanBright(
      "Get additional help in IRC - #gameclosure on irc.freenode.net"
    ));
    console.log('-----------------------------------------------');


    cb && cb();
  }
});

module.exports = InstructionsCommand;
