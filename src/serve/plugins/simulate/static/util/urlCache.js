jsio('import std.uri as URI');
jsio('import math.util');

exports.noCacheURL = function(url) {
	return '/.rand_' + math.util.random(0, 10000) + url;
};

exports.reloadURL = function(url) {
	var oldURI = new URI(url);
	var result = oldURI._path.match(/\/\.rand_\d+\/(.*)$/);
	if (result) {
		oldURI.path = exports.noCacheURL(result[1]);
	}
	return oldURI.toString();
};
