var lazy = require('lazy-cache')(require);

lazy('fs');
lazy('../util/logging');
lazy('../apps');
lazy('../serve');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var ServeCommand = Class(BaseCommand, function (supr) {

  this.name = 'serve';
  this.description = 'starts the web simulator';

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .describe('port', 'port on which to run the DevKit server')
        .alias('port', 'p')
        .default('port', 9200)
      .describe('single-port', 'host apps on same port as primary web server')
        .default('single-port', false)
      .describe('separate-build-process',
                'spawn a new process for simulator builds')
      .describe('test-app',
                'broadcasts address using mdns for test app clients')
      .describe('remote-debugging',
                'starts the built in remote debugging proxy. See https://github.com/gameclosure/devkit-remote-debugger-server')
      .describe('remote-debugging-host',
                'Sets the host for the remote debugging connection to use (overrides the client just guessing the URL that devkit is served on)');
  };

  this.exec = function () {
    lazy.utilLogging.install();

    if (lazy.fs.existsSync('manifest.json')) {
      lazy.apps.get('.');
    }

    var argv = this.argv;

    lazy.serve.serveWeb({
      port: argv.port,
      singlePort: !!argv['single-port'],
      separateBuildProcess: !!argv['separate-build-process'],
      remoteDebugging: !!argv['remote-debugging'],
      remoteDebuggingHost: argv['remote-debugging-host']
    });
  };
});

module.exports = ServeCommand;
