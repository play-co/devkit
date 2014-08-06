var logger = require('../util/logging').get('jvmtools');

var javaBridge = require('./tealeaf-build-tools/javaBridge');

exports.exec = javaBridge.exec;
exports.stop = javaBridge.stop;

exports.checkSyntax = function (src, cb) {
  javaBridge.exec({
    tool: "closure",
    args: [
      "--compilation_level", "WHITESPACE_ONLY",
      "--jscomp_off", "internetExplorerChecks",
      "--warning_level", "VERBOSE",
      "--js", "-"
    ],
    stdin: src
  }, function (err, compiler) {
    var out = [];

    compiler.on("err", function (data) {
      out.push(data);
    });

    compiler.on("end", function (data) {
      var errors = [];
      var block = {};
      errors.push(block);

      out.join("").split("\n").forEach(function (line) {
        logger.error(line);
        if (/^\s*$/.test(line)) {
          if (block.code) {
            errors.push(block);
          }
          block = {};
        } else {
          var match = line.match(/^\s*stdin:(\d+):\s*(.*?)$/);
          if (match) {
            block.line = match[1];
            block.err = match[2];
          } else if (!/^\s*$/.test(line)) {
            (block.code || (block.code = [])).push(line);
          }
        }
      });

      if (block.code) { errors.push(block); }

      errors.forEach(function (block) {

        var prefix = '';
        var j = 0;
        var i = 0;
        var chr = null;
        while (true) {
          for (var j = 0; j < block.code.length; ++j) {
            var line = block.code[j];
            if (chr === null) {
              chr = line[i];
            } else if (chr != line[i]) {
              chr = false;
              break;
            }

            if (!/\s/.test(chr)) {
              chr = false;
              break;
            }
          }
          if (chr !== false) {
            prefix += chr;
            ++i;
          } else {
            break;
          }
        }

        if (prefix.length) {
          block.code = block.code.map(function (line) {
            return line.substring(prefix.length);
          });
        }
      });

      cb(null, errors);
    });
  });
}
