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
