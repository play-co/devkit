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


var parser = "([a-zA-Z][a-zA-Z0-9-]+-)?" +    // channel
             "[v=]*\\s*([0-9]+)" +            // major
             "\\.([0-9]+)" +                  // minor
             "\\.([0-9]+)" +                  // patch
           
             "(-[0-9]+)?" +                   // build
             "(-[a-zA-Z][a-zA-Z0-9-.:]*)?";  // tag

parser = new RegExp("^\\s*" + parser + "\\s*$");

var Range = Class(function () {
	this.init = function (type, version) {
		this.type = type;
		this.version = version;
	};
});

var Version = Class(function () {
	this.init = function (opts) {
		this.channel = opts.channel || '';

		this.major = opts.major || 0;
		this.minor = opts.minor || 0;
		this.patch = opts.patch || 0;

		this.build = opts.build || 0;
		this.tag = opts.tag || '';

		this.src = this.toString();
	};

	this.getNext = function (which) {
		var clone = new Version(this);
		if (which == 'major') {
			clone.major++;
			clone.minor = 0;
			clone.patch = 0;
			clone.build = 0;
		} else if (which == 'minor') {
			clone.minor++;
			clone.build = 0;
			clone.patch = 0;
		} else if (which == 'build') {
			clone.build++;
			clone.patch = 0;
		} else {
			clone.patch++;
		}
		clone.src = clone.toString();
		return clone;
	};

	this.eq = function (version) {
		if (!(version instanceof Version)) {
			version = Version.parse(version);
		}

		if (!version) {
			return false;
		}

		return this.major == version.major
			&& this.minor == version.minor
			&& this.patch == version.patch
			&& this.build == version.build
			&& this.channel == version.channel;
	};

	this.gt = function (version) {
		if (!(version instanceof Version)) {
			version = Version.parse(version);
		}

		if (!version) {
			return false;
		}

		// can't compare versions between channels
		if (this.channel != version.channel) {
			return undefined;
		}

		return this.major > version.major
			|| (this.major == version.major
				&& (this.minor > version.minor
					|| this.minor == version.minor
						&& (this.patch > version.patch
							|| this.patch == version.patch
								&& (this.build > version.build)
						)
					)
				);
	};

	this.lt = function (version) {
		if (!(version instanceof Version)) {
			version = Version.parse(version);
		}

		return version.gt(this);
	};

	this.inRange = function (range) {

	};

	this.toString = function (skipChannel) {
		return [
			skipChannel ? '' : this.channel,
			this.major + '.' + this.minor + '.' + this.patch,
			this.build,
			this.tag
		].filter(function (v) { return v; }).join('-');
	};
});

Version.parse = function (version) {
	if (!version) { return null; }
	if (version instanceof Version) { return version; }

	var match = version.match(parser);
	if (match) {
		return new Version({
			channel: (match[1] || '').replace(/^-|-$/g, ''),
			major: parseInt(match[2]),
			minor: parseInt(match[3]),
			patch: parseInt(match[4]),
			build: parseInt((match[5] || '').replace(/^-/, '')),
			tag: (match[6] || '').replace(/^-/, ''),
			src: match[0]
		});
	}
};

var prefixes = {
	"<": "lt",
	">": "gt",
	"<=": "lte",
	">=": "gte",
	"=": "eq",
	"~": "not",
	"~>": "not"
};

Version.parseRange = function (range) {
	var tokens = range.split(/\s+/);
	var ranges = [];
	for (var i = 0, n = tokens.length; i < n; ++i) {
		var t = tokens[i];
		if (!t) { continue; }

		var prefix;
		var number;
		if (t in prefixes) {
			// case 1: prefix separated from number by space
			prefix = prefixes[t];
			number = tokens[++i];
		} else {
			var first = t.substring(0, 2);
			if (first in prefixes) {
				// case 2: prefix is length 2
				prefix = prefixes[first];
				number = t.substring(2);
			} else {
				first = t.charAt(0);
				if (first in prefixes) {
					// case 3: prefix is length 3
					prefix = prefixes[first];
					number = t.substring(1);
				} else {
					// case 4: no prefix (exact equivalence)
					prefix = 'eq';
					number = t;
				}
			}
		}

		var version = Version.parse(number);
		if (!version) { return; }

		ranges.push(new Range(prefix, version));
	}

	return ranges;
};

Version.sorterAsc = function (a, b) { 
	if (a.channel > b.channel) return  1;
	if (a.channel < b.channel) return -1;

	var val = a.gt(b);

	if (val === undefined) return 0;
	return val ? 1 : -1;
};

Version.sorterDesc = function (a, b) { 
	return Version.sorterAsc(b, a);
};

Version.sorterKey = function (a) {
	return a.channel + ' ' + pad(a.major) + pad(a.minor) + pad(a.patch) + pad(a.build);
}


var LEN = 8;
var MAX = 99999999;
var MIN = -99999999;
var PAD = "00000000";

function pad (val) {
	val = ~~val;

	if (val < MIN) { val = MIN; }
	if (val > MAX) { val = MAX; }
	if (val < 0) {
		val *= -1;
		return '-' + PAD.substring(0, LEN - ('' + val).length) + val;
	} else {
		return PAD.substring(0, LEN - ('' + val).length) + val;
	}
};


if(module && module.children) {
	module.exports = Version;
} else {
	exports = Version;
}
