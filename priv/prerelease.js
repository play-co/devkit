var fs = require("fs");
var path = require("path");
var common = require("../src/common");
var Version = require("../src/shared/Version");
var addonManager = require("../src/AddonManager");

var dir = path.resolve(__dirname + "/../");

if (!module.parent) {
	var opts = JSON.parse(process.argv[2]);
	opts.version = Version.parse(opts.version);

	prerelease(opts);
}

function prerelease (opts) {
	setVersion(path.join(dir, "package.json"), opts.version);
	setVersion(path.join(opts.sdkPath, "package.json"), opts.version);

	fs.writeFileSync(path.join(opts.sdkPath, ".gitignore"), "lib/*.jar\n.DS_Store\nconfig.json");
}

function setVersion (packagePath, version) {
	var package = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

	// write version without channel to be a valid npm version
	package.version = version.toString(true);

	// store the channel separately
	package.channel = version.channel;

	fs.writeFileSync(packagePath, JSON.stringify(package, null, '\t'));
}
