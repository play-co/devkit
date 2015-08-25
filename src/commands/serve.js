var BaseCommand = require('../util/BaseCommand').BaseCommand;

var ServeCommand = Class(BaseCommand, function (supr) {

  this.name = 'serve';
  this.description = 'starts the web simulator';

  this.init = function () {
    supr(this, 'init', arguments);

    this.opts
      .describe('port', 'port on which to run the DevKit server')
      .alias('port', 'p').default('port', 9200)
      .describe('single-port', 'host apps on same port as primary web server')
      .describe('separate-build-process',
                'spawn a new process for simulator builds')
      .describe('test-app',
                'broadcasts address using mdns for test app clients')
      .default('single-port', false);
  };

  this.exec = function () {
    var fs = require('fs');
    require('../util/logging').install();

    if (fs.existsSync('manifest.json')) {
      require('../apps').get('.');
    }

    var serve = require('../serve');
    var argv = this.opts.argv;

    serve.serveWeb({
      port: argv.port,
      singlePort: !!argv['single-port'],
      separateBuildProcess: !!argv['separate-build-process']
    });
  };
});

module.exports = ServeCommand;
