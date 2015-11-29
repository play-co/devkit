var gulp = require('gulp');
var nib = require('nib');
var path = require('path');
var plugins = require('gulp-load-plugins')();
var fs = require('fs');
var UglifyJS = require('uglify-js');
var resolve = require('resolve');
var Promise = require('bluebird');
var _logger = require('../util/logging');


var logger = _logger.get('gulpTasks');

var paths = {
  'base': path.join(__dirname, '..', '..'),
  'jsio': path.dirname(resolve.sync('jsio')),
  'squill': path.join(__dirname, '..', '..', 'node_modules', 'squill')
};

var compress = true;
var sourcemaps = false;


var getBuildPath = function(modulePath) {
  return path.join(modulePath, 'build');
};


var buildStylus = function (moduleName, modulePath, stylusMainPath, cb) {
  logger.info('Compiling stylus for ' + moduleName + ': ' + stylusMainPath);

  var buildPath = getBuildPath(modulePath);

  var stream = gulp.src(stylusMainPath)
    .pipe(plugins.stylus({
      use: nib(),
      sourcemap: sourcemaps,
      compress: compress
    }))
    .pipe(plugins.concat('main.css'))
    .pipe(gulp.dest(buildPath));

  stream.on('end', function() {
    cb();
  });
  stream.on('error', function(err) {
    cb(err);
  });
};


var buildJS = function (moduleName, modulePath, moduleMain, jsPath, cb) {
  logger.info('Compiling jsMain for ' + moduleName + ': ' + moduleMain);
  logger.debug('jsio path:', paths.jsio);
  logger.debug('module jsPath:', jsPath);

  var basePath = path.dirname(jsPath);
  var buildPath = getBuildPath(modulePath);

  var jsio = require('jsio');
  var compilerPath = path.join(jsio.__env.getPath(), '..', 'compilers');
  jsio.path.add(compilerPath);

  var compiler = jsio('import jsio_compile.compiler');
  compiler.start(['jsio_compile', jsPath, 'import src.' + moduleMain], {
    cwd: basePath,
    environment: 'browser',
    path: [paths.jsio],
    includeJsio: false,
    appendImport: true,
    compressSources: compress,
    compressResult: compress,
    pathCache: {
      jsio: paths.jsio,
      squill: paths.squill,
      src: basePath
    },
    interface: {
      setCompiler: function (compiler) { this.compiler = compiler; },
      run: function (args, opts) { this.compiler.run(args, opts); },
      onError: function (err) {
        logger.error('Error while compiling:', err);
        cb && cb(err);
      },
      onFinish: function (opts, code) {
        if (!fs.existsSync(buildPath)) {
          fs.mkdirSync(buildPath);
        }

        code = ';(function(jsio){' + code + '})(jsio.clone());';
        var filename = path.join(buildPath, moduleMain + '.js');
        fs.writeFile(filename, code, cb);
      },
      compress: function (filename, src, opts, cb) {
        var result = UglifyJS.minify(src, {
          fromString: true,
          compress: {
            global_defs: {
              DEBUG: false
            }
          }
        });

        cb(result.code);
      }
    }
  });
};


module.exports = {
  load: function(modulePath) {
    logger.info('Loading module at:', modulePath);
    try {
      var modulePackage = require(path.join(modulePath, 'package.json'));
      // Get all the main files and compile them
      if (!modulePackage.devkit || !modulePackage.devkit.extensions) {
        logger.warn('module did not specify a devkit.extensions');
        return;
      }
      return modulePackage;
    } catch(e) {
      throw new Error('module contains no package.json');
    }
  },


  compile: function(modulePath, cb) {
    modulePath = path.resolve(modulePath);
    var modulePackage = this.load(modulePath);
    var moduleName = modulePackage.name;
    logger.info('Compiling module:', moduleName);

    var tasks = [];
    // Check for stylus main file
    tasks.push(this.compileStylus(moduleName, modulePath, modulePackage));
    // Check for javascript stuff
    tasks.push(this.compileJS(moduleName, modulePath, modulePackage));

    logger.info('Waiting for tasks to finish');
    Promise.all(tasks)
      .then(function() {
        logger.info('Done!');
        cb && cb();
      });
  },

  compileStylus: function(moduleName, modulePath, modulePackage) {
    var tasks = [];
    var promiseBuildStylus = Promise.promisify(buildStylus);

    var stylusMainPath = path.join(modulePath, 'stylus', 'main.styl');
    if (fs.existsSync(stylusMainPath)) {
      tasks.push(
        promiseBuildStylus(moduleName, modulePath, stylusMainPath)
      );
    }
    return Promise.all(tasks).then(function() {
      logger.info('stylus complete');
    });
  },

  compileJS: function(moduleName, modulePath, modulePackage) {
    var promiseBuildJS = Promise.promisify(buildJS);
    var tasks = [];

    for (var extName in modulePackage.devkit.extensions) {
      var ext = modulePackage.devkit.extensions[extName];
      if (ext.main) {
        tasks.push(
          promiseBuildJS(moduleName, modulePath, ext.main, path.join(modulePath, ext.main))
        );
      }
    }

    return Promise.all(tasks).then(function() {
      logger.info('js complete');
    });
  },


  watch: function(modulePath, cb) {
    modulePath = path.resolve(modulePath);
    var modulePackage = this.load(modulePath);
    var moduleName = modulePackage.name;

    logger.info('Watching module ' + moduleName + ' at: ' + modulePath);

    var runningTask = null;
    var taskQueue = [];
    var queueTask = function(fn) {
      if (runningTask) {
        logger.info('watch task already running, queueing');
        taskQueue.push(fn);
        return;
      }

      runningTask = fn();
      runningTask.then(function() {
        if (taskQueue.length > 0) {
          runningTask = taskQueue.shift()();
        } else {
          runningTask = null;
        }
      });
    };

    gulp.watch(path.join(modulePath, 'stylus', '**', '**.styl'), function() {
      logger.info('stylus changed');
      queueTask(function() {
        return this.compileStylus(moduleName, modulePath, modulePackage);
      }.bind(this));
    }.bind(this));

    gulp.watch([
      path.join(modulePath, '**', '**.js'),
      '!' + path.join(modulePath, 'build', '**', '**.js'),
    ], function() {
      logger.info('js changed');
      queueTask(function() {
        return this.compileJS(moduleName, modulePath, modulePackage);
      }.bind(this));
    }.bind(this));
  }
};
