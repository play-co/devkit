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

exports.get = function(name, /*optional*/ override) {
	return Class.defaults({
			name: name,
			key: override
		}, exports[override || 'defaults'][name]);
};

exports.defaults = {
	fullScreen: {
		name: 'Full Screen',
		target: 'browser-desktop',
		canRotate: false,
		canResize: true
	},
	browser: {
		name: 'Browser',
		target: 'browser-desktop',
		canRotate: false,
		canResize: true,
		width: 800,
		height: 600,
		background: {
			img: 'browser-chrome.png',
			width: 820,
			height: 620,
			offsetX: 10,
			offsetY: 10,
			style: {
				WebkitBoxShadow: '0px 0px 5px #222',
				borderRadius: '10px'
			}
		}
	},
	facebook: {
		name: 'Facebook',
		target: 'browser-desktop',
		canRotate: false,
		canResize: false,
		height: 600,
		width: 760,
		background: {
			img: 'facebook-header.png',
			width: 1002,
			height: 158,
			offsetX: 0,
			offsetY: 70
		}
	},
	ipad: {
		name: 'iPad',
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
		name: 'iPhone',
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
	'iphone5': {
		name: 'iPhone 5',
		target: 'native-mobile',
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
	'iphone-browser': {
		name: 'Mobile Safari',
		target: 'browser-mobile',
		userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3',
		canRotate: true,
		canResize: false,
		width: 320,
		height: 480,
		screenSize: [ // override the default width/height to account for browser chrome
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

exports.demo = {
	facebook: {
		canRotate: false,
		height: 320,
		width: 480,
		chromeImage: 'facebook-header-small.png',
		imageHeight: 523,
		imageWidth: 720,
		xChromeOffset: '20px',
		yChromeOffset: '141px'
	},
	nexus: {
		canRotate: true,
		height: 194,
		width: 321,
		chromeImage: 'nexus-horiz-small.png',
		imageHeight: 264,
		imageWidth: 462,
		xChromeOffset: '73px',
		yChromeOffset: '37px'
	},
	ipad: {
		canRotate: true,
		height: 376,
		width: 492,
		chromeImage: 'ipad-horiz-small.png',
		imageHeight: 417,
		imageWidth: 540,
		xChromeOffset: '24px',
		yChromeOffset: '20px' 
	},
	iphone: {
		canRotate: true,
		height: 212,
		width: 318,
		chromeImage: 'iphone-horiz-small.png',
		imageHeight: 255,
		imageWidth: 485 ,
		xChromeOffset: '88px',
		yChromeOffset: '20px' 
	}
};
