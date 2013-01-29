var argv = require('optimist')
	.default('env', 'browser').describe('env', 'runtime to compile for (browser, native)')
	.boolean('compress')
		.default('compress', true)
		.describe('compress', '[js] minifies JavaScript files')
	.boolean('eval')
		.default('eval', false)
		.describe('eval', '[js] compile preprocessors for evaling scripts at runtime')
	.boolean('appendImport')
	.string('out')
		.describe('out', 'filename to write to')
	// TODO:
	// .boolean('debug')
	// 	.default('debug', false)
	// 	.describe('debug', '[debug] builds a version with debugging support')
	// .string('servicesURL')
	// 	.describe('servicesURL', '[server] internal use only')
	.argv;

var build = require('tealeaf-build');
var compiler = new build.JsioCompiler();
compiler.inferOptsFromEnv(argv.env);
compiler.setCompressEnabled(argv.compress);

// remove the basil command
var files = argv._.slice(1);

if (argv.eval) {
	files.push('preprocessors.import', 'preprocessors.cls');
}

if (argv.appendImport) {
	compiler.opts.appendImport = true;
}

compiler.compile('import ' + files.join(','), function (err, src) {
	if (err) {
		console.log(err);

		process.exit(1);
	} else {
		if (argv.out) {
			var fs = require('fs');
			fs.writeFileSync(argv.out, src);
			console.log("wrote", argv.out);
		} else {
			console.log(src);
		}

		process.exit(0);
	}
});
