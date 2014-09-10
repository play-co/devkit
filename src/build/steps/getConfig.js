var ip = require('../../util/ip');
var path = require('path');
var sdkVersion = require('../../../package.json').version;

exports.getConfig = function(app, argv, cb) {
  // NOTICE: we don't change the argv object
  var config = {};

  // keep a copy of the original argv unmodified
  config.argv = JSON.parse(JSON.stringify(argv));

  // app base directory
  config.appPath = app.paths.root;

  // supply some defaults
  config.debug = 'debug' in argv ? !!argv.debug : true;
  config.scheme = argv.scheme || (config.debug ? 'debug' : 'release');
  config.target = argv.target || 'browser-mobile';
  config.schemePath = path.join('build/', config.scheme);
  config.outputPath = argv.output || path.resolve(config.appPath, path.join('build/', config.scheme, config.target));
  config.jsioPath = Array.isArray(argv.jsioPath) ? argv.jsioPath.slice(0) : [];
  config.sdkVersion = sdkVersion;
  config.isTestApp = argv.isTestApp;
  config.isSimulated = argv.simulated;
  config.simulator = {
    deviceId: argv.simulateDeviceId,
    deviceType: argv.simulateDeviceType,
    port: argv.port
  };

  var serverName;
  if (config.isSimulated) {
    // local for serving
    // use window.location + path to basil server proxy
    serverName = 'local';
  } else if (/^browser-/.test(config.target)) {
    // we don't want to set the host:port here - just use window.location
    serverName = 'inherit';
  } else if (config.argv && argv.server) {
    serverName = config.argv && argv.server;
  } else if (config.debug) {
    serverName = 'local';
  } else {
    serverName = 'production';
  }

  config.ip = argv.ip || ip.getLocalIP()[0];

  if (serverName == 'local') {
    config.localServerURL = argv.localServerURL || (config.ip + ':' + (argv.port || 9200));
  }

  config.serverName = serverName;

  // Note: may be overwritten later, e.g. for native builds
  config.outputResourcePath = config.outputPath;

  // studio domain name from manifest under studio.domain
  var studio = app.manifest.studio;
  config.studio = studio && studio.domain || 'gameclosure.com';

  // build version from command line or manifest
  config.version = argv.version || config.scheme == 'debug' && 'debug' || app.manifest.version || '';

  // build target
  config.target = argv.target;

  // enable JavaScript compression
  config.compress = !!argv.compress;

  // enable JavaScript compression
  if ('compress' in argv) {
    config.compress = !!argv.compress;
  } else {
    config.compress = config.scheme == 'release';
  }

  // useful for simulated builds with --single-port
  if (argv.baseURL) {
    config.baseURL = argv.baseURL;
  }

  cb(null, config);
}
