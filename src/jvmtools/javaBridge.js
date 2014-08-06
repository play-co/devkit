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

var logging = require('../util/logging');
var logger = logging.get('jvmtools');

var jsio = require('jsio');
var Callback = require('jsio/lib/Callback');

// JVMTools Module
// ===============

var _javaProcess = null;
var _withClient = new Callback();
var _handlers = {};

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
  getClient().run(function (client) {
    var line = JSON.stringify({
        tool: opts.tool,
        args: opts.args,
        stdin: "\n" + opts.stdin || ''
      });

    client.write(line);
    client.write("\n");

    var handler = _handlers[opts.tool] = new EventEmitter();
    if (opts.print) {
      handler.on('out', function (data) {
        console.log(data);
      });

      handler.on('err', function (data) {
        console.log(data);
      });
    }

    if (opts.buffer) {
      var out = [];
      var err = [];
      handler.on('out', function (data) { out.push(data); });
      handler.on('err', function (data) { err.push(data); });
      handler.on('end', function (code) {
        cb(code, out.join(''), err.join(''));
      });
    } else {
      cb(null, handler);
    }
  });
};

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
      if (code !== 0) {
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
    if (data.match(/\n/)) {
      var lines = out.join('').split(/\n/);
      out = [lines.pop()];
      lines.forEach(function (line) {
        var data = JSON.parse(line);
        if (_handlers[data.name]) {
          if (data.tag == 'exit') {
            var handler = _handlers[data.name];
            _handlers[data.name] = null;
            handler.emit('end', data.body);
            out = [];
            return false;
          } else if (data.tag == 'process' && data.body == 'start') {
            _handlers[data.name].emit('start');
          } else {
            _handlers[data.name].emit(data.tag, data.body);
          }
        }
      });
    }
  });
}
