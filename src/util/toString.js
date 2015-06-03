var path = require('path');
var chalk = require('chalk');
var printf = require('printf');

exports.errorToString = function (error) {
  if (!error.stack) {
    return error;
  }

  var out = [];

  try {
    var errStr = error.stack;
    var lines = errStr.split('\n');
    var i = 0;
    var msg = [];
    while (lines[i] && !/^\s*at/.test(lines[i])) {
      msg.push(lines[i]);
      ++i;
    }

    var parser = /^\s*at (.*?)\s+\((.*?)\)/;
    lines = lines.slice(i).reverse();
    var data = lines.map(function (line) {
      var result = {};
      var detailsStr;
      var match = line.match(parser);
      if (match) {
        result.func = match[1];
        detailsStr = match[2];
      } else {
        detailsStr = line;
      }

      var details = detailsStr.match(/(?:\s*at )?(.*?):(\d+):(\d+)/);
      if (details && details[1]) {
        var filename = details[1]; // path.relative(exports.paths.root(), match[2]);
        var dirname = path.dirname(filename);
        result.file = path.basename(filename);
        result.line = details[2];
        result.fullPath = (dirname == '.' ? '' : dirname + path.sep)
                        + chalk.white(result.file + ':' + result.line);
      } else {
        result.details = detailsStr;
      }

      return result;
    });

    var n = data.length;
    if (n) {
      data.map(function (data, i) {
        if (typeof data == 'string') {
          out.push(data);
        } else {
          out.push(new Array(i + 1).join(' ')
            + '\u2937  ' + chalk.white(data.func)
            + ' (' + (data.fullPath || data.details) + ')');
        }
      });

      var lastLine = data[n - 1];
      if (lastLine) {
        var indent = new Array(n).join(' ');
        var msgLines = msg.join('\n').split('\n');
        var msgText = msgLines.join('\n   ' + indent);
        out.push(indent
          + chalk.red(
            msgText
            + (msgLines.length > 1 ? '\n' + indent : '')
          ));
      }
    } else {
      out.push(error.stack);
      if (error.cause && typeof error.cause == 'object') {
        Object.keys(error.cause).forEach(function (key) {
          out.push(printf(chalk.yellow('%15s') + ': %s', key, error.cause[key]));
        });
      }
    }
  } catch (e) {
    out.push(e.stack);
    out.push(error.stack);
  }

  return out.join('\n');
};
