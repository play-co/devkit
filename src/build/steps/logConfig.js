var printf = require('printf');
var color = require('cli-color');
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
  logger.log(color.blueBright("Prebuild phase completed for", app.manifest.title || app.manifest.shortName));
  logger.log("\tbuild for:", color.yellowBright(config.target), "\t\tscheme:", config.scheme);
  console.log();

  console.log(color.white(" --- start config ---"));

  for (var key in config) {
    if (key == 'argv') { continue; }

    var value = config[key];
    var strValue;
    if (typeof value == 'object') {
      console.log(color.yellowBright(printf('%25s', key + ':')));
      for (var key in value) {
        strValue = typeof value[key] == 'object' ? JSON.stringify(value[key]) : '' + value[key];
        console.log(color.yellow(printf('%29s', key + ':')), truncate(strValue));
      }
    } else {
      strValue = '' + value;
    }

    console.log(color.yellowBright(printf('%29s', key + ':')), truncate(strValue));
  }

  console.log(color.white(" --- end config ---"));

  cb && cb();
}
