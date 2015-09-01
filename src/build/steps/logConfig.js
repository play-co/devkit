var printf = require('printf');
var chalk = require('chalk');
var logger = require('../../util/logging').get('build');

var MAX_LENGTH = 120;
function truncate(str) {
  if (str.length > MAX_LENGTH) {
    return str.substring(0, MAX_LENGTH) + ' …';
  }

  return str;
}

exports.log = function (app, config, cb) {

  console.log();
  logger.log(chalk.blue("Prebuild phase completed for", app.manifest.title || app.manifest.shortName));
  logger.log("\tbuild for:", chalk.yellow(config.target), "\t\tscheme:", config.scheme);
  console.log();

  console.log(chalk.white(" --- start config ---"));

  for (var key in config) {
    if (key == 'argv') { continue; }

    var value = config[key];
    var strValue;
    if (typeof value == 'object') {
      console.log(chalk.yellow(printf('%25s', key + ':')));
      for (key in value) {
        strValue = typeof value[key] == 'object' ? JSON.stringify(value[key]) : '' + value[key];
        console.log(chalk.yellow(printf('%29s', key + ':')), truncate(strValue));
      }
    } else {
      strValue = '' + value;
      console.log(chalk.yellow(printf('%29s', key + ':')), truncate(strValue));
    }
  }

  console.log(chalk.white(" --- end config ---"));

  cb && cb();
};
