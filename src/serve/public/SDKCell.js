"use import";

import squill.Cell as Cell;

exports = SDKCell = Class(Cell, function(supr) {
	this.buildWidget = function() {
		this.initMouseEvents();
	};

	this.toLength = function(s, maxLength, minLength, moreStr, right) {
		if (s.length <= maxLength) {
			return s;
		}

		var i = maxLength;
		var chr;
		var cutof = '/_.,- ';

		minLength = minLength || 8;
		moreStr = moreStr || '...';

		if (right) {
			while (i > minLength) {
				i++;
				chr = s[s.length - 1 - i];
				if (cutof.indexOf(chr) !== -1) {
					return '...' + s.substr(-i);
				}
			}

			return '...' + s.substr(-maxLength);
		} else {
			while (i > minLength) {
				i--;
				chr = s[i];
				if (cutof.indexOf(chr) !== -1) {
					return s.substr(0, i) + '...';
				}
			}

			return s.substr(0, maxLength) + '...';
		}
	};
});
