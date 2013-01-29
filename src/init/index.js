var fs = require('fs');
var path = require('path');
var wrench = require('wrench');
var optimist = require('optimist');

var common = require('../common');
var register = require('../register').register;

/**
 * Command line.
 */

var argv = require('optimist')
	.usage('basil init [project-dir]')
	.describe('help', 'Show options.').alias('help', 'h').boolean('help')
	.describe('template', 'Pick a template to start building your game').alias('template', 't')
	.argv;

if (argv.help) {
	require('optimist').showHelp();
	process.exit(0);
}

function createUUID (a) {
	return a
				? (a ^ Math.random() * 16 >> a / 4).toString(16)
					: ([1e7]+1e3+4e3+8e3+1e11).replace(/[018]/g, createUUID);
}

//initialise an empty repo
exports.init = function(args) {
	// basil init
	// basil init ./cake

	if (!args[0]) {
		console.log('Usage: basil init [folder path]');
		process.exit(2);
	}
	
	initProject(argv.template || 'empty', args[0]);
};

//copies files from a template.
var initProject = function(template, dest){
	var templatePath = path.join(__dirname, "templates", template);
	var newLocation = dest;
	var sdkLocation = path.join(__dirname, "..", "..", "sdk");

	if (fs.existsSync(path.join(newLocation, 'manifest.json'))){
		console.log("There's already a project at this location!");
		return;
	}

	//create the new project directory
	if (!fs.existsSync(newLocation)) {
		wrench.mkdirSyncRecursive(newLocation);
	}

	//copy files from a template
	wrench.copyDirSyncRecursive(templatePath, newLocation, {preserve:true});

	//create a symlink to the sdk
	fs.symlinkSync(sdkLocation, path.join(newLocation, "sdk"));

	//fill out manifest properties
	var manPath = path.join(newLocation, "manifest.json");
	var man = JSON.parse(fs.readFileSync(manPath).toString());
	man.appID = createUUID();
	man.shortName = newLocation;
	man.title = newLocation;
	fs.writeFileSync(manPath, JSON.stringify(man, null, '\t'));

	console.log('Created a new ' + template + ' project at ' + newLocation);

	//now register the new project
	register(newLocation);
};
