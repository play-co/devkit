"use import";

import squill.Widget as Widget;
import squill.models.DataSource as DataSource;

import .CharacterCell as CharacterCell;

var CHARACTER_CELL_WIDTH = 53;
var CHARACTER_CELL_HEIGHT = 69;

exports = CharListPanel = Class(Widget, function(supr) {
	this.init = function(opts) {
		this._fontSettings = opts.fontSettings;

		this._fontInfo = false;

		this._groups = {
			symbols1: {start: 1, end: 15},
			numbers: {start: 16, end: 25},
			symbols2: {start: 26, end: 32},
			uppercase: {start: 33, end: 58},
			symbols3: {start: 59, end: 64},
			lowercase: {start: 65, end: 90},
			rest: {start: 91, end: 223}
		};

		this._groupChars = {};

		for (var group in this._groups) {
			if (this._groups.hasOwnProperty(group)) {
				this._groupChars[group] = {};
				for (var i = this._groups[group].start; i <= this._groups[group].start; i++) {
					this._groupChars[group][String.fromCharCode(i)] = true;
				}
			}
		}

		this._list = new DataSource({key: 'character', sorter: function(item) { return item.character; }});

		this._def = {
						children: [
							{
								id: 'characterList',
								type: 'list',
								margin: 5,
								isTiled: true,
								cellCtor: CharacterCell,
								dataSource: this._list,
								preserveCells: true
							}
						]
					};

		supr(this, 'init', arguments);
	};

	this.buildWidget = function() {
		this.characterList.setCellDim({width: CHARACTER_CELL_WIDTH, height: CHARACTER_CELL_HEIGHT});
		this.characterList.subscribe('Select',
			this, 
			function(data) {
				data.isSelected = !data.isSelected;
				this.publish('Select', data.character);
			}
		);
	};

	this.update = function() {
		this._list.each(function(data) {
			data.cell.render();
		});
	};

	this.unSelectAll = function() {
		var list = this._list,
			item;

		for (var i = 0; i <= 222; i++) {
			item = list.getItemForIndex(i);
			if (item) {
				item.isSelected = false;
				item.cell && item.cell.render();
			}
		}
	};

	this.selectRange = function(group) {
		var list = this._list,
			item;

		for (var i = this._groups[group].start; i <= this._groups[group].end; i++) {
			item = list.getItemForIndex(i);
			if (item) {
				item.isSelected = true;
				item.cell && item.cell.render();
			}
		}
	};

	this.selectCharacters = function(chars) {
		var list = this._list,
			item;

		this.unSelectAll();

		for (var i in chars) {
			item = list.getItemForID(String.fromCharCode(i));
			if (item) {
				item.isSelected = true;
				item.cell && item.cell.render();
			}
		}
	};

	this.deselectRange = function(group) {
		var list = this._list,
			item;

		for (var i = this._groups[group].start; i <= this._groups[group].end; i++) {
			item = list.getItemForIndex(i);
			if (item) {
				item.isSelected = false;
				item.cell.render();
			}
		}
	};

	this._isSelectedInRange = function(group) {
		var list = this._list,
			item;

		for (var i = group.start; i <= group.end; i++) {
			item = list.getItemForIndex(i);
			if (item && item.isSelected) {
				return true;
			}
		}
		return false;
	};

	this.refresh = function() {
		var groups = ['symbols1', 'numbers', 'symbols2', 'uppercase', 'symbols3', 'lowercase', 'rest'],
			colors = ['#855', '#885', '#855', '#585', '#855', '#558', '#888'],
			list = this._list,
			glyphs,
			charsDone = [],
			allow,
			i, j, k;

		list.clear();
		for (i = 0, j = groups.length; i < j; i++) {
			for (k = this._groups[groups[i]].start; k <= this._groups[groups[i]].end; k++) {
				allow = true;
				if (this._fontInfo) {
					allow = this._fontInfo.hasChar(k);
					charsDone[k] = true;
				}
				if (allow) {
					list.add({
						character: String.fromCharCode(k),
						num: k,
						charList: this,
						color: colors[i],
						isSelected: false
					});
				}
			}
		}
		if (this._fontInfo) {
			glyphs = this._fontInfo.getGlyphs();
			for (i in glyphs) {
				if (glyphs.hasOwnProperty(i) && (charsDone[i] === undefined)) {
					list.add({
						character: String.fromCharCode(i),
						num: i,
						charList: this,
						color: '#FFDD00',
						isSelected: false
					});
				}
			}
		}
	};

	this.clear = function() {
		this._list.clear();
	};

	this.getRangeDescription = function() {
		var result = '',
			groups = this._groups,
			description = [],
			i;

		if (this._isSelectedInRange(groups.uppercase)) {
			description.push('upper-case letters');
		}
		if (this._isSelectedInRange(groups.lowercase)) {
			description.push('lower-case letters');
		}
		if (this._isSelectedInRange(groups.numbers)) {
			description.push('numbers');
		}
		if (this._isSelectedInRange(groups.symbols1) || this._isSelectedInRange(groups.symbols2) || this._isSelectedInRange(groups.symbols3)) {
			description.push('symbols');
		}

		switch (description.length) {
			case 0:
				return 'none';
			case 1:
				return description[0];
			case 2:
				return description[0] + ' and ' + description[1];
			default:
				for (i = 0; i < description.length - 1; i++) {
					if (result !== '') {
						result += ', ';
					}
					result += description[i];
				}
				return result + ' and ' + description[description.length - 1];
		}
	};

	this.getFontSettings = function() {
		return this._fontSettings;
	};

	this.get = function() {
		return this._list;
	};

	this.setFontInfo = function(fontInfo) {
		this._fontInfo = fontInfo;
	};
});
