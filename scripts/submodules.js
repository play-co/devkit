// switch submodules to ssh if this repo was cloned with ssh
var fs = require('fs');
var exec = require('child_process').exec;

// check origin's remote for ssh protocol
exec('git remote -v', function (err, stdout, stderr) {
  if (err) { throw err; }

  var remote = stdout.split('\n').filter(function (line) { return /^origin.*?\(fetch\)$/.test(line); })[0];

  // looks like ssh?
  if (!/https:\/\//.test(remote)) {

    // rewrite .gitmodules
    var modules = fs.readFileSync('.gitmodules', 'utf8');
    var lines = modules.split('\n').map(function (line) {
      return line.replace(/(^\s*)url\s*=\s*https:\/\/(.*?)\/(.*?)$/, '$1url = git@$2:$3');
    });

    console.log('rewriting .gitmodules...');
    fs.writeFileSync('.gitmodules', lines.join('\n'));
  }
});
