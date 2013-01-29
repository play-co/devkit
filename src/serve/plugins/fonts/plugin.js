var path = require("path");
var wrench = require("wrench");
var fs = require("fs");
var common = require("../../../common");

var fontPaths = {
  win32:  ['/Windows/fonts'],
  darwin: [path.join(process.env.HOME, 'Library/Fonts'), '/Library/Fonts'],
  linux:  ['/usr/share/fonts/truetype']
}[process.platform];

function getSystemFontsList(cb) { 
	//loop over font paths
	var fontMap = [];
	for(var i = 0; i < fontPaths.length; ++i) {
		var currentPath = path.resolve(fontPaths[i]);
		
		var fonts = fs.readdirSync(currentPath);
		fontMap = fontMap.concat(
			fonts.map(function (filename) {
				return {
					filename: filename,
					name: path.basename(filename, path.extname(filename)),
					path: path.join(currentPath, filename),
					type: 'system'
				};
			})
		);
	}

	cb(fontMap);
}

var cachedFonts = {};

exports.load = function (app) {
	// ???
	// Data: appID, filename, map
	// Previously: /plugins/font_editor/save_map & save_map()
	app.post("/plugins/font_editor/save_map", function (req, res) {
		fontData = req.body;

		//TODO: This is actually the shortName, change the client to send appID
		var projectID = fontData.projectID;
		if(!projectID) {
			console.log("No shortname found!");
			return;
		}

		var projects = common.getProjectList();
		if (!projects[projectID]) {
			console.log("No project with shortName", projectID);
			return;
		}

		var projPath = projects[projectID].paths.root;
		var fontPath = path.join(projPath, "resources/fonts/");
		//create the directory if not exists
		if(!fs.existsSync(fontPath)) {
			console.log("Creating DIR");
			wrench.mkdirSyncRecursive(fontPath);
		}

		var filename = path.join(fontPath, fontData.filename + ".json");
		console.log("Writing map to file", filename);
		fs.writeFileSync(filename, JSON.stringify(fontData.map));

		res.json({"ok": true});
	});
	
	// ???
	// Data: filename, firstChunk, lastChunk, appID, chunk, index, layer, count
	// Previously: /plugins/font_editor/save_font & save_font()
	app.post("/plugins/font_editor/save_font", function (req, res) {
		fontData = req.body;

		var projectID = fontData.projectID;
		if(!projectID) {
			console.log("No project id found!");
			return;
		}

		var projects = common.getProjectList();
		var projPath = projects[projectID].paths.root;
		if(!projPath) {
			console.log("No project with id", projectID);
			return;
		}

		var fontPath = path.join(projPath, "resources/fonts/");

		//create the directory if not exists
		if(!fs.existsSync(fontPath)) {
			wrench.mkdirSyncRecursive(fontPath);
		}

		//construct file name
		var fontName = fontData.filename + "_" + fontData.layer + "_" + fontData.index;

		//cache the font chunks in a buffer if firstChunk
		if(fontData.firstChunk || !cachedFonts[fontName]) {
			//if the cached font doesnt exist, create new one
			//this chunking system is etrange!
			cachedFonts[fontName] = new Buffer(fontData.chunk.substr(22), "base64");
		} else {
			//write to the existing buffer
			cachedFonts[fontName].write(
				fontData.chunk.substr(22), 
				0, 
				cachedFonts[fontName].length,
				"base64"
			);
		}

		//write everything cached into the font file
		if(fontData.lastChunk) {
			fs.writeFileSync(path.join(fontPath, fontName + ".png"), cachedFonts[fontName]);
		}

		res.json({"ok": true});
	});
	
	// ???
	// Data: appID, list
	// Previously: /plugins/font_editor/remove_fonts & remove_fonts()
	app.post("/plugins/font_editor/remove_fonts", function (req, res) {
		
	});
	
	// ???
	// Data: font_css?<appID>
	// Previously: /plugins/font_editor/font_css & font_css()
	app.get("/plugins/font_editor/font_css", function (req, res) {
		
	});
	
	// System font introspection. This should probably later be changed to /fonts/installed.
	// Data: appID (is this actually necessary?)
	// Previously: /plugins/font_editor/font_list & font_list()
	app.get("/fonts/installed", function (req, res) {
		getSystemFontsList(function (fonts) {
			res.json(fonts);
		});
	});
};
