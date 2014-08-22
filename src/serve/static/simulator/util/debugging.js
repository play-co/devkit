// TODO we should be able to check syntax at compile-time!

import util.path;

var originalSyntax = jsio.__env.checkSyntax.bind(jsio.__env);

// jsio.__env.debugPath = function (path) {
//   return util.path.resolveRelativePath('http://devkit.simulator/' + path);
// }

jsio.__env.checkSyntax = function (code, filename) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/syntax', false);
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  xhr.onreadystatechange = function () {
    if (xhr.readyState != 4) { return; }

    if (xhr.status == 200 && xhr.responseText) {
      var err;
      try {
        var response = JSON.parse(xhr.responseText);
        err = response[1];
      } catch(e) {
        err = xhr.responseText;
      }

      if (console.group) {
        console.group('%c' + filename + '\n', 'color: #33F; font-weight: bold');
        err.forEach(function (e) {
            if (e.err) {
              console.log('%c' + e.err.replace(/error - parse error.\s+/i, ''), 'color: #F55');
              console.log('%c' + e.line + ':%c' + e.code[0], 'color: #393', 'color: #444');
              console.log(new Array(('' + e.line).length + 2).join(' ') + e.code[1]);
            } else {
              console.log('%c ' + e.code.join('\n'), 'color: #F55');
            }
          });
        console.groupEnd();
      } else {
        console.log(filename);
        err.forEach(function (e) {
            if (e.err) {
              console.log(e.err.replace(/error - parse error.\s+/i, ''));
              console.log(e.line + ':' + e.code[0]);
              console.log(new Array(('' + e.line).length + 2).join(' ') + e.code[1]);
            } else {
              console.log(e.code.join('\n'));
            }
          });
      }

      document.body.style.background = 'black';
      document.body.innerHTML = '<pre style=\'margin-left: 10px; font: bold 12px Consolas, "Bitstream Vera Sans Mono", Monaco, "Lucida Console", Terminal, monospace; color: #FFF;\'>'
        + '<span style="color:#AAF">' + filename + '</span>\n\n'
        + err.map(function (e) {
            if (e.err) {
              return '<span style="color:#F55">' + e.err.replace(/error - parse error.\s+/i, '') + '</span>\n'
                + ' <span style="color:#5F5">' + e.line + '</span>: '
                  + ' <span style="color:#EEE">' + e.code[0] + '</span>\n'
                  + new Array(('' + e.line).length + 5).join(' ') + e.code[1];
            } else {
              return'<span style="color:#F55">' + e.code.join('\n') + '</span>';
            }
          }).join('\n')
        + '</pre>';
    } else if (xhr.status > 0) {
      originalSyntax(code, filename);
    }
  }

  xhr.send('javascript=' + encodeURIComponent(code));
}

jsio('import base').logging.setPrefix('simulator');
