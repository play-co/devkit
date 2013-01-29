var common = require('../common');
var clc = require('cli-color');
var fs = require('fs');
var path = require('path');
var ff = require('ff');
var Version = require('../shared/Version');

var argv = require('optimist')
	.usage('basil update [options]')
	.describe('tag', 'Update to a specific tag.').alias('tag', 't').string('')
	.describe('channel', 'Specify a channel (e.g "beta").').alias('channel', 'c').string('release')
	.describe('list-channel', 'List possible channels.').alias('list-channel', 'l').boolean('false')
	.describe('list-version', 'List possible channels.').alias('list-version', 'v').boolean('false')
	.describe('help', 'Show options.').alias('help', 'h').boolean('help')
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
		data = String(data).split('\n');
		data = data.map(function (tag) { return Version.parse(tag); });
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

	var fileName = "lib/tealeaf-build-tools-" + common.buildVersion + ".jar";

	var f = ff(this, function () {
		common.child('git', ['fetch', '--tags'], defaultChildArgs, f.wait()); //we don't care about output
		
		if (!tag) {

			var wait = f.wait();

			common.child('git', ['tag', '-l'], defaultChildArgs, function(c, data){
				//let's sort this manually
				data = String(data);
				data = data.split('\n');
		
				var tagData = [];
				for (var i in data){
					//for some reason we prefix with v
					data[i] = (data[i][0] === 'v') ? (data[i].substr(1)) : (data[i]);
					if (!channel || data[i].search(channel) != -1) {
						tagData.push(data[i]);
					}
				}
				
				tagData = tagData.map(function (tag) { return Version.parse(tag); });

				// filter out versions that arent in the specified channel
				if (channel)
					tagData = tagData.filter(function (v) { return v && v.channel == channel; });

				tagData = tagData.sort(Version.sorterDesc);
				tag = tagData[0];
				if (!tag)
					return console.log(clc.red('No version found'));

				wait();
			});
		}
		tag = Version.parse(tag);
	}, function () {
		console.log(clc.green('Attempting to switch to ' + tag.toString()));
		common.child('git', ['stash', 'save'], defaultChildArgs, f.wait()); //don't care about output
	}, function () {
		console.log("Extracting changes to SDK");
		common.child('git', ['stash', 'show'], defaultChildArgs, f());
	}, function (data) {
		console.log("Save the changes to", stashDir);
		fs.writeFile(path.join(stashDir, 'stash_'+(new Date())), String(data), f.wait());
		console.log("Checking out version", tag);
		common.child('git', ['checkout', tag], defaultChildArgs, f.wait());
	}, function () {
		console.log("Installing node dependencies");
		common.child('npm', ['install'], defaultChildArgs, f.wait());
	}, function () {
		console.log("Linking paths");
		common.child('npm', ['link', '--local'], defaultChildArgs, f.wait());

		//kick off the dependency checker
		console.log("Run dependency checker");
		common.child('node', ['./src/dependencyCheck.js'], defaultChildArgs, f.wait());	
	})
	.error(function(err) {
		console.log(clc.red("ERROR"), err);
	})
	.cb(next);
};
