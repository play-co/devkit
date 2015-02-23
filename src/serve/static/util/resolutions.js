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

function copy(obj) {
	return JSON.parse(JSON.stringify(obj));
}

exports.get = function(name, opts) {
	var info = exports.defaults[name];
	if (info) { return info; }

	if (!opts) { opts = {}; }

	var match;
	function matchResolution (id) {
		var info = exports.defaults[id];
		if (opts.screen.width == info.width && opts.screen.height == info.height) {
			match = copy(info);
		} else if (opts.screen.width == info.height && opts.screen.height == info.width) {
			match = copy(info);
			match.rotation = 1;
		}
	}

	var fallback = 'mobile';
	if (opts.screen) {
		if (/-ios$/.test(name)) {
			['iphone', 'iphone4', 'iphone5', 'ipad', 'ipad3'].forEach(bind(this, matchResolution));
		} else if (/-android$/.test(name)) {
			['nexus', 'galaxy-nexus'].forEach(bind(this, matchResolution));
		}
	}

	if (!match) {
		match = copy(exports.defaults[fallback]);
		if (opts.width) { match.width = opts.width; }
		if (opts.height) { match.height = opts.height; }
		if (/^browser-/.test(name)) {
			opts.target = 'browser-mobile';
		}
	}

	return match;
};

exports.defaults = {
	fullScreen: {
		name: 'Full Screen',
		target: 'browser-desktop',
		canRotate: false,
		canResize: true,
		centerX: false,
		centerY: false,
	},
	mobile: {
		name: 'Mobile',
		target: 'browser-mobile',
		devicePixelRatio: 2,
		canRotate: true,
		canResize: true,
		width: 640,
		height: 1136,
		background: {
			width: 640,
			height: 1136,
			offsetX: 0,
			offsetY: 0
		},
		style: {
			border: '10px solid #555',
			borderRadius: '5px'
		}
	},
	browser: {
		name: 'Browser',
		target: 'browser-desktop',
		canRotate: false,
		canResize: true,
		width: 800,
		height: 600,
		background: {
			width: 820,
			height: 620,
			offsetX: 10,
			offsetY: 10
		},
		style: {
			border: '10px solid #555',
			borderRadius: '5px'
		}
	},
	facebook: {
		name: 'Facebook',
		target: 'browser-desktop',
		canRotate: false,
		canResize: false,
		canDrag: false,
		height: 600,
		width: 760,
		centerY: false,
		style: {
			marginTop: '200px'
		}
	},
	ipad: {
		name: 'iPad 2',
		target: 'native-ios',
		canRotate: true,
		canResize: false,
		width: 768,
		height: 1024,
		background: [{
			img: 'ipad.png',
			width: 860,
			height: 1125,
			offsetX: 49,
			offsetY: 52
		}, {
			img: 'ipad-horiz.png',
			width: 1125,
			height: 860,
			offsetX: 51,
			offsetY: 49
		}]
	},
	'ipad3': {
		name: 'iPad 3',
		target: 'native-ios',
		devicePixelRatio: 2,
		canRotate: true,
		canResize: false,
		width: 1536,
		height: 2048,
		background: [{
			img: 'ipad.png',
			width: 1720,
			height: 2260,
			offsetX: 98,
			offsetY: 104
		}, {
			img: 'ipad-horiz.png',
			width: 2250,
			height: 1720,
			offsetX: 102,
			offsetY: 98
		}]
	},
	nexus: {
		name: 'Nexus S',
		target: 'native-android',
		canRotate: true,
		canResize: false,
		width: 480,
		height: 800,
		background: [{
			img: 'nexus.png',
			width: 649,
			height: 1135,
			offsetX: 81,
			offsetY: 178
		}, {
			img: 'nexus.png',
			rotation: 90,
			width: 1135,
			height: 649,
			offsetX: 167,
			offsetY: 81
		}]
	},
	iphone: {
		name: 'iPhone 3GS',
		target: 'native-ios',
		canRotate: true,
		canResize: false,
		height: 480,
		width: 320,
		background: {
			img: 'iphone.png',
			width: 400,
			height: 760,
			offsetX: 42,
			offsetY: 141
		}
	},
	'iphone4': {
		name: 'iPhone 4',
		target: 'native-ios',
		devicePixelRatio: 2,
		canRotate: true,
		canResize: false,
		height: 960,
		width: 640,
		background: {
			img: 'iphone.png',
			width: 800,
			height: 1520,
			offsetX: 84,
			offsetY: 282
		}
	},
	'iphone5': {
		name: 'iPhone 5',
		target: 'native-ios',
		devicePixelRatio: 2,
		canRotate: true,
		canResize: false,
		height: 1136,
		width: 640,
		background: {
			img: 'iphone5.png',
			width: 762,
			height: 1600,
			offsetX: 65,
			offsetY: 238
		}
	},
	'iphone6': {
		name: 'iPhone 6',
		target: 'native-ios',
		devicePixelRatio: 2,
		canRotate: true,
		canResize: false,
		height: 1334,
		width: 750,
		background: {
			img: 'iphone6.png',
			width: 853,
			height: 1771,
			offsetX: 52,
			offsetY: 217
		}
	},
	'iphone-browser': {
		name: 'Mobile Safari',
		target: 'browser-mobile',
		userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3',
		canRotate: true,
		canResize: false,
		width: 320,
		height: 480,
		viewportSize: [ // override the default width/height to account for browser chrome
			{ width: 320, height: 416 },
			{ width: 480, height: 268 }
		],
		background: [{
			img: 'iphone-webkit.png',
			width: 400,
			height: 760,
			offsetX: 42,
			offsetY: 161
		}, {
			img: 'iphone-webkit-horiz.png',
			width: 760,
			height: 400,
			offsetX: 139,
			offsetY: 62
		}]
	},
	'galaxy-nexus': {
		name: 'Galaxy Nexus',
		target: 'native-android',
		canRotate: true,
		canResize: false,
		width: 720,
		height: 1184,
		devicePixelRatio: 2,
		background: {
			img: 'galaxy-vert.png',
			width: 854,
			height: 1677,
			offsetX: 66,
			offsetY: 212
		}
	}
};

for (var id in exports.defaults) {
	exports.defaults[id].id = id;
}
