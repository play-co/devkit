var clc = require('cli-color');
var fs = require('fs');
var ff = require('ff');
var path = require('path');
var wrench = require('wrench');

var common = require('../common');
var logger = new common.Formatter("install");

var addonManager = require('../AddonManager');
var Version = require('../shared/Version');

var argv = require('optimist')
	.usage('Install packages from github. Defaults to the gameclosure account')
	.boolean('force')
		.alias('force', 'f')
		.default('force', false)
	.boolean('ssh')
	.describe('ssh', 'Install addon through SSH')
	.default('ssh', true);

exports.install = function (addon, version, cb) {
	if (!addon) {
		argv.showHelp();
		process.exit(2);
	}

	argv = argv.argv; //lolz

	addonManager.install(addon, {version: version, force: argv.force, isSSH: argv.ssh}, function (err) {

	});
}

exports.uninstall = function(addon) {
	if (!addon) {
		process.exit(2);
	}

	addonManager.uninstall(addon, function (err) {

	});
};
