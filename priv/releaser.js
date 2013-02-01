var argv = require("optimist")
	.usage('Usage: $0 -p --type [major|minor|patch] --branch --channel')
	.boolean("production")
	.string("author")
	.default("type", "patch")
	.default("branch", "master")
	.default("channel", "beta")
	.default("test", false)
	.default("server", "http://dev.gameclosure.com:9091/")
	.argv;

var http = require("http");
var common = require("../src/common");
var clc = require("cli-color");
var path = require("path");
var fs = require("fs");
var ff = require("ff");
var url = require("url");

var f = ff(function () {
	if (!argv.author) {
		var onName = f.slotPlain();
		var onEmail = f.slotPlain();

		var exec = require("child_process").exec;
		exec('git config user.name', function (error, stdout, stderr) {
			onName(stdout.replace(/^\s+|\s+$/g, '') || '');
		});

		exec('git config user.email', function (error, stdout, stderr) {
			onEmail(stdout.replace(/^\s+|\s+$/g, '') || '');
		});
	}
}, function (name, email) {
	var author = argv.author;
	if (!author && name && email) {
		author = name + ' <' + email + '>';
	}

	var urlObj = url.parse(argv.server, true);
	urlObj.pathname = (argv.production ? "approve-release" : "test-release") + "/" + argv.type;
	urlObj.query = merge(urlObj.query, {
		branch: argv.branch,
		channel: argv.channel,
		test: (!!argv.test).toString(),
		author: author,
		version: argv.version
	});

	var uri = url.format(urlObj);

	console.log("Pinging dev server to release:", uri);
	var req = http.get(uri, f.slotPlain());
	req.on("error", function(res) {
		console.log("ERROR:", res);
	});

}, function (res) {
	res.on('data', function (data) {
		_buf += data.toString();
		handleBuffer();
	});

	res.on('close', function () {
		if (_buf) {
			_buf += "\n";
			handleBuffer();
		}
		
		console.log("Release complete!");
	});
});

var _buf = "";
function handleBuffer() {
	while (/\n/.test(_buf)) {
		var i = _buf.indexOf('\n');
		var line = _buf.substring(0, i);
		try {
			line = JSON.parse(line);
		} catch (e) {
			console.log(">>", line);
			line = null;
		}

		if (line) {
			if (line.cmd) {
				logCommand(line);
			} else if (line.stdout) {
				console.log("\n" + clc.green.bright(line.stdout) + "\n");
			}

			if (line.diff) {
				
				if (line.diff.code) {
					console.log("diff exited with code", line.diff.code);
					console.log(line.diff.stderr);
				} else {
					var out = path.resolve("basil-release-" + (line.type || Date.now()) + ".patch");
					fs.writeFileSync(out, line.diff.stdout);
					console.log("wrote diff to", out);
				}
			}
		}

		_buf = _buf.substring(i + 1);
	}
}

function logCommand(cmd) {
	console.log(clc.blue.bright("> " + cmd.cmd.map(function (piece) { return JSON.stringify(piece); }).join(" ")));

	var stdout = cmd.stdout.replace(/(^\s+|\s+$)/g, '').replace(/\n/g, clc.green.bright("\n || "));
	var stderr = cmd.stderr.replace(/(^\s+|\s+$)/g, '').replace(/\n/g, clc.red.bright("\n || "));

	stdout && console.log(clc.green.bright(" || ") + stdout);
	stderr && console.log(clc.red.bright(" || ") + stderr);
	
	console.log(!cmd.code ? "(exit code 0)" : clc.red.bright("(exit code " + cmd.code + ")"));
}

