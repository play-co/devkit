/** @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

// Support for a long-running Java process to run Java tools.

var net = require('net');
var path = require('path');

var EventEmitter = require('events').EventEmitter;
var spawn = require('child_process').spawn;

var logging = require('../../util/logging');
var logger = logging.get('jvmtools');

var jsio = require('jsio');
var Callback = require('jsio/lib/Callback');

// JVMTools Module
// ===============

var _javaProcess = null;
var _withClient = new Callback();
var _tools = {};

// serializes requests to the same tool for the jvmtools
var ToolQueue = Class(function () {
  this.init = function () {
    this._queue = [];

    // can't run anything until we have a client ref
    getClient().run(this, function (client) {
      this._client = client;
      this._run();
    });
  }

  this.add = function (opts, cb) {
    this._queue.push({opts: opts, cb: cb});
    this._run();
  }

  this.getEmitter = function () {
    return this._emitter;
  }

  this._run = function () {
    if (this._isRunning || !this._client || !this._queue.length) { return; }
    this._isRunning = true;

    var item = this._queue.shift();
    var opts = item.opts;
    var cb = bind(this, function onFinish() {
      // on finish, release the lock and run the next item
      this._isRunning = false;
      process.nextTick(bind(this, '_run'));

      // call the callback, forwarding arguments
      item.cb && item.cb.apply(global, arguments);
    });

    var client = this._client;
    var line = JSON.stringify({
        tool: opts.tool,
        args: opts.args,
        stdin: "\n" + opts.stdin || ''
      });

    client.write(line);
    client.write("\n");

    var emitter = this._emitter = new EventEmitter();
    if (opts.print) {
      emitter.on('out', function (data) {
        console.log(data);
      });

      emitter.on('err', function (data) {
        console.log(data);
      });
    }

    if (opts.buffer) {
      var out = [];
      var err = [];
      emitter.on('out', function (data) { out.push(data); });
      emitter.on('err', function (data) { err.push(data); });
      emitter.on('end', bind(this, function (code) {
        this._emitter = null;

        if (code) {
          logger.error('code:', code, opts);
        }

        cb && cb(code, out.join(''), err.join(''));
      }));
    } else {
      cb && cb(null, emitter);
    }
  }
});

exports.stop = function (cb) {
  if (_withClient.hasFired()) {
    _withClient.run(function (client) {
      client.write(JSON.stringify({tool: 'shutdown'}));
      client.write("\n");

      // and because we don't really trust that to actually work
      // let's kill all the processes ourselves.
      _javaProcess.kill("SIGKILL");
      _withClient.reset();
      _javaProcess = null;

      if (cb) {
        process.nextTick(cb);
      }
    });
  } else if (cb) {
    process.nextTick(cb);
  }
};

exports.exec = function (opts, cb) {
  var tool = opts.tool;
  var queue = _tools[tool] || (_tools[tool] = new ToolQueue());
  queue.add(opts, cb);
}

process.on('exit', function () {
  exports.stop();
});

var CMD = 'java';
var ARGS = ['-jar', path.join(__dirname, 'tealeaf-build-tools.jar')];

function getClient () {
  if (!_javaProcess) {
    var proc = _javaProcess = spawn(CMD, ARGS);
    proc.stdout.once('data', function (data) {
      // Read hostname:port
      var parts = String(data).trim().split(':');
      var ip = parts[0];
      //check if the ip is returned as all zeros
      if (parts[0] == '0.0.0.0') {
        //just use localhost instead since connecting to 0.0.0.0
        //does not work on windows
        ip = 'localhost';
      }
      connectClient(ip, parts[1]);
    });
    proc.stderr.on('data', function (data) {
      // process.stderr.write('TealeafBuildTools: ' + data);
    });
    proc.on('exit', function (code) {
      if (code !== 0 && _javaProcess) {
        logger.error('exited with code ' + code);
      }
      proc.stdin.end();
      _javaProcess = null;
    });
  }

  return _withClient;
}

function connectClient (hostname, port) {

  var out = [];
  var client = net.connect(port, hostname, function () {
    logger.log('connected to ' + hostname + ':' + port);
    process.nextTick(function () { _withClient.fire(client); });
  }).on('data', function (data) {
    out.push(data);
    data = data.toString();
    if (/\n/.test(data)) {
      var lines = out.join('').split(/\n/);
      out = [lines.pop()];
      lines.forEach(function (line) {
        var data = JSON.parse(line);
        var emitter = _tools[data.name].getEmitter();
        if (emitter) {
          if (data.tag == 'exit') {
            emitter.emit('end', data.body);
            out = [];
            return false;
          } else if (data.tag == 'process' && data.body == 'start') {
            emitter.emit('start');
          } else {
            emitter.emit(data.tag, data.body);
          }
        }
      });
    }
  });
}
