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

/**
* Present post-install options for collecting anonymous usage data for
* analytics data from our users.  We appreciate your help!
*/

var ff = require('ff');
var clc = require('cli-color');

var common = require('./common');

var logger = new common.Formatter('register');

function postEmail(email, name, next) {
	var data = "entry.1063614987=" + email + "&entry.888373266=" + name;

	// Set up the request
	var req = require('https').request({
		host: 'www.docs.google.com',
		port: '443',
		path: '/a/gameclosure.com/forms/d/1zYBFvzAlmZX4JWmWY1RkPxYlRJXUszLs4aWu2nt_kPs/formResponse',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': data.length
		}
	}, next);
	req.write(data);
	req.end();
}

function ask(question, next) {
	var stdin = process.stdin, stdout = process.stdout;

	stdin.resume();
	stdout.write(question);
	stdin.once('data', function(data) {
		next(data.toString().trim());
	});
}

function run() {
	if (!common.config.get("registerPrompt")) {
		var name;

		var f = ff(function () {
			logger.log(clc.yellow("By default basil will send anonymous usage and crash reports"));
			logger.log(clc.yellow("to help us improve the DevKit."));

			ask("Press " + clc.green.bright("enter") + " to continue.  Or type \"" + clc.red.bright("no") + "\" to opt-out: ", f.slotPlain());
		}, function (optout) {
			common.config.set("optout", optout === "no", f.wait());

			if (optout) {
				logger.log("Opting-out of sending usage and crash reports.");
			} else {
				//logger.log(clc.yellow.bright("Thanks"), "for helping out by sending usage and crash reports!");
			}

			logger.log("Please " + clc.green.bright("register") + " your product by providing us with your name and email address.  Leave these " + clc.red.bright("blank") + " to opt-out:");

			ask("Name: ", f.slotPlain());
		}, function (name_resp) {
			name = name_resp.toString().trim();

			ask("Email: ", f.slotPlain());
		}, function (email_resp) {
			var email = email_resp.toString().trim();

			common.config.set("registerPrompt", true, f.wait());

			if (!email.match(/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/)) {
				logger.log("Sorry you decided not to register.  If you change your mind, the " + clc.yellow.bright("form") + " is available here:");
				logger.log("https://docs.google.com/a/gameclosure.com/forms/d/1zYBFvzAlmZX4JWmWY1RkPxYlRJXUszLs4aWu2nt_kPs/viewform");
				f.slotPlain()(false);
			} else {
				logger.log("Registering with " + name + " <" + email + "> ...");
				common.config.set("registerName", name, f.wait());
				common.config.set("registerEmail", email, f.wait());
				postEmail(email, name, f.slotPlain());
			}
		}, function (registered) {
			if (registered) {
				logger.log("Registration complete.  " + clc.green.bright("Thank you") + " for using the Game Closure Devkit!");
			} else {
				logger.log(clc.green.bright("Thank you") + " for using the Game Closure Devkit!");
			}
			process.exit(0);
		}).error(function (err) {
			logger.error("Error:");
			console.log(err);
			process.exit(1);
		});
	}
}

// Engines ignite!
run();

