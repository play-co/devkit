var common = require("../common");

/*
 * Lists versions of basil.
 */

function updateTags(cont) {
	common.child("git", ["fetch", "--tags"], {cwd: __dirname, slient: true}, cont);
}

/**
*
*/
exports.listAll = function(checkServer, cb) {
	//if checkServer is function, must be next
	if(typeof checkServer === "function") {
		cb = checkServer;
		checkServer = false;
	}

	checkServer = !!checkServer;

	var str = "";
	if(checkServer) {
		//if check server, do a fetch of latest tags
		updateTags(function() {
			common.child("git", ["tag", "-l"], {cwd: __dirname, silent: true}, function(err, out) {
				str += out.toString();
				cb(str);
				return str;
			});
		});
	} else {
		//if not, go straight to listing current tags
		common.child("git", ["tag", "-l"], {cwd: __dirname, silent: true}, function(err, out) {
			str += out.toString();
			cb(str);
			return str;
		});
	}
};

exports.listSearch = function(term, cb) {
	var str = "";

	updateTags(function() {
		common.child("git", ["tag"], {cwd: __dirname, silent: true}, function(err, out) {
			var result = out.toString().split("\n");
			var counter = 0;
			
			//loop over results
			for(var i = 0; i < result.length; ++i) {
				if(result[i].indexOf(term) !== -1) {
					str += result[i] + "\n";
					counter++;
				}
			}

			if(counter === 0) {
				str = "No versions found";
			}

			cb(str);
		});
	});
};

exports.list = function(args) {
	if(args[0]) {
		exports.listSearch(args[0], function(out) {
			console.log(out);
		});
	} else {
		exports.listAll(function(out) {
			console.log(out);	
		});
	}
};
