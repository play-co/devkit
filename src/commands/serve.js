var fs = require('fs');
var path = require('path');
var express = require('express');

var BaseCommand = require('../util/BaseCommand').BaseCommand;

var ServeCommand = Class(BaseCommand, function (supr) {

	this.name = 'serve';
	this.description = 'starts the web simulator';

	this.init = function () {
		supr(this, 'init', arguments);

		this.opts
			.describe('port', 'port on which to run the DevKit server')
			.alias('port', 'p').default('port', 9200)
			.describe('single-port', 'host apps on same port as primary web server')
			.default('single-port', false);
	}

	this.exec = function () {

		if (fs.existsSync('manifest.json')) {
			require('../apps').get('.');
		}

		var serve = require('../serve');
		var argv = this.opts.argv;

		serve.serveWeb({
			port: argv.port,
			singlePort: !!argv['single-port']
		});
	}
});

module.exports = ServeCommand;
