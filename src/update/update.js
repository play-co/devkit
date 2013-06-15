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

var common = require('../common');
var clc = require('cli-color');
var fs = require('fs');
var path = require('path');
var ff = require('ff');
var Version = require('../shared/Version');

var argv = require('optimist')
	.usage('basil update [options]')
	.describe('tag', 'Update to a specific tag.').alias('tag', 't')
	.describe('channel', 'Specify a channel (e.g "beta").').alias('channel', 'c').default('channel', 'release')
	.describe('list-channel', 'List possible channels.').alias('list-channel', 'l').default('list-channel', false)
	.describe('list-version', 'List possible channels.').alias('list-version', 'v').default('list-version', false)
	.describe('help', 'Show options.').alias('help', 'h').default('help', false)
	.argv;


if (argv.help) {
	require('optimist').showHelp();
	process.exit(2);
}

if (argv['list-channel']) {
	common.child('git', ['tag', '-l'], {cwd: common.paths.root(), silent: true}, function (code, data) {
		data = String(data).split('\n');
		var tags = {};
		for (var i in data) {
			var match = data[i].match(/-(.*)-/);
			
			if (match && !(match[1] in tags)) {
				tags[match[1]] = true;
			}
		}
		
		for (i in tags) {
			console.log(i);
		}
		
		process.exit();
	});
}

if (argv['list-version']) {
	common.child('git', ['tag', '-l'], {cwd: common.paths.root(), silent: true}, function (code, data) {
		var lines = String(data).split('\n');
		var data = [];
		for (var i in lines) {
			if (lines[i]) {
				data.push(Version.parse(lines[i]));
			}
		}
		if (argv.channel) data = data.filter(function(tag) { return tag && tag.channel == argv.channel });
		data.sort(Version.sorterDesc);

		for(var i = 0; i < data.length; ++i) {
			if(data[i])
				console.log(data[i].toString());
		}
		
		process.exit();
	});
}

var stashDir = path.join(common.paths.root(), '.stashes');
if (!fs.existsSync(stashDir)) {
	fs.mkdirSync(stashDir);
}

exports.update = function (tag, next) {
	var channel = argv.channel;
	tag = tag || argv.tag;

	var defaultChildArgs = {
		cwd: common.paths.root(),
		silent: true
	};

	var loudChildArgs = {
		cwd: common.paths.root(),
		silent: false
	};

	var fileName = "lib/tealeaf-build-tools-" + common.buildVersion + ".jar";

	var f = ff(this, function () {
		common.child('git', ['fetch', '--tags'], defaultChildArgs, f.wait()); //we don't care about output
	}, function () {
		if (tag) {
			tag = Version.parse(tag);
		} else {
			var wait = f.wait();

			common.child('git', ['tag', '-l'], defaultChildArgs, function (code, data) {
				var tagData = [];
				data.split('\n').forEach(function (raw) {
					var version = Version.parse(raw);
					if (version && version.channel == channel) {
						tagData.push(version);
					}
				});
				
				tagData = tagData.sort(Version.sorterDesc);
				tag = tagData[0];
				if (!tag) {
					return console.log(clc.red('No version found'));
				}

				wait();
			});
		}
	}, function () {
		common.track("BasilUpdate", {"switchTag": tag.toString()});
		console.log(clc.green('Attempting to switch to ' + tag.toString()));
		common.child('git', ['stash', 'save'], defaultChildArgs, f.slotPlain()); //don't care about output
	}, function (err) {
		if (err) {
			f(err);
		} else {
			console.log("Extracting changes to SDK");
			common.child('git', ['stash', 'show'], defaultChildArgs, f.slotPlain(2));
		}
	}, function (err, data) {
		if (!err && data) {
			console.log("Save the changes to", stashDir);
			fs.writeFile(path.join(stashDir, 'stash_'+(new Date())), String(data), f.wait());
		}
		console.log("Checking out version", tag.toString());
		common.child('git', ['checkout', '--force', tag.toString()], defaultChildArgs, f.wait());
	}, function () {
		console.log("Running install script");
		common.child('./install.sh', ["--silent"], loudChildArgs, f.wait());
	}, function () {
		require("../analytics");
	})
	.error(function(err) {
		console.log(clc.red("ERROR"), err);
	})
	.cb(next);
};
