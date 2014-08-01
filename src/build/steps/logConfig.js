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
  for (var key in config) {
    if (key == 'argv') { continue; }

    var value = config[key];
    var strValue;
    if (typeof value == 'object') {
      logger.log(color.yellowBright(printf('%17s', key + ':')));
      for (var key in value) {
        strValue = typeof value[key] == 'object' ? JSON.stringify(value[key]) : '' + value[key];
        logger.log(color.yellow(printf('%21s', key + ':')), truncate(strValue));
      }
    } else {
      strValue = '' + value;
    }

    logger.log(color.yellowBright(printf('%17s', key + ':')), truncate(strValue));
  }

  cb && cb();
}
