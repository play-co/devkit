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
			.default('port', 9200)
			.alias('port', 'p');
	}

	this.exec = function () {
		var serve = require('../serve');
		serve.serveWeb(this.opts.argv.port);
	}
});

module.exports = ServeCommand;
