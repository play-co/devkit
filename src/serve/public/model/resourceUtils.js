exports.IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', '.bmp', 'svg'];
exports.AUDIO_EXTS = ['au', 'snd', 'mid', 'rmi', 'mp3', 'aif', 'aifc', 'aiff', 'm3u', 'm4a', 'ra', 'ram', 'wav'];
exports.FONT_EXTS = ['ttf', 'eot', 'woff'];
exports.JS_EXTS = ['js', 'json'];

exports.isExt = function(filename, exts) {
	var test = filename.toLowerCase();
	var ext;
	var i = exts.length;

	while (i) {
		ext = exts[--i];
		if (filename.substr(-(ext.length + 1)) === '.' + ext) {
			return true;
		}
	}

	return false;
};
