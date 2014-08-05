var path = require('path');
var color = require('cli-color');

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
          result.func = match[1]
          detailsStr = match[2];
        } else {
          detailsStr = line;
        }

        var details = detailsStr.match(/(?:\s*at )?(.*?):(\d+):(\d+)/);
        if (details && details[1]) {
          var filename = details[1]; //path.relative(exports.paths.root(), match[2]);
          var dirname = path.dirname(filename);
          result.file = path.basename(filename);
          result.details = (dirname == '.' ? '' : dirname + path.sep) + result.file;
          result.line = details[2];
        } else {
          result.details = detailsStr;
        }

        return result;
      });

      var n = data.length;
      data.slice(0, n - 1).map(function (data, i) {
        if (typeof data == 'string') {
          out.push(data);
        } else {
          out.push(new Array(i + 1).join(' ') + '└ '
            + color.green(data.file) + ':' + color.blueBright(data.line)
            + ' ' + color.whiteBright(data.func)
            + color.yellowBright(' (' + data.details + ')'));
        }
      });

      var lastLine = data[n - 1];
      if (lastLine) {
        var indent = new Array(n).join(' ');
        var msgLines = msg.join('\n').split('\n');
        var msgText = msgLines.join('\n   ' + indent);
        out.push(indent + '└ '
          + color.green(lastLine.file) + ':' + color.blueBright(lastLine.line) + ' '
          + color.redBright(
            msgText
            + (msgLines.length > 1 ? '\n' + indent : '')
            + ' ' + color.whiteBright('at ' + lastLine.func)
            + color.yellowBright(' (' + lastLine.details + ')')
          ));
      }
    } catch (e) {
      out.push(e.stack);
      out.push(error.stack);
    }

    return out.join('\n');
}
