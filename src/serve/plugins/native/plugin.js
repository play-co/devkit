var spawn = require("child_process").spawn;
var path = require("path");

var common = require("../../../common");
var logger = new common.Formatter("native");

var _child = null;
function kill (cb) {
	if (_child) {
		_child.on('exit', function (code) {
			if (cb) cb();
		});

		setTimeout(function () {
			if (_child) {
				//console.log('(native inspector sent SIGKILL)');
				_child.kill('SIGKILL');
			}
		}, 5000);

		//console.log('(native inspector sent SIGTERM)');
		_child.kill('SIGTERM');
	} else {
		if (cb) cb();
	}
}

process.on('exit', function () { kill(); });

exports.load = function (app) {
	//grab the path of the inspector
	var inspector = path.join(__dirname, "../../../../lib/NativeInspector/NativeInspector");

	kill();

	_child = spawn("node", [inspector]);

	_child.on('exit', function (code) {
		_child = null;
		if (code) {
			logger.log('native inspector exited with code ' + code);
		}
	});
};

