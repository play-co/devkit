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

import sdkPlugin;
import util.ajax;
import squill.Cell;
import squill.TabbedPane;
import squill.models.DataSource as DataSource;

var hitsDataSource = null;
var transText = "You haven't set up any translations yet. Add your language-specific json files to resources/lang.";
var transLink = "http://doc.gameclosure.com/example/images-cover-contain/";
var transLinkText = "Check out our internationalization example";

var HitCell = Class(squill.Cell, function() {
	this._def = {
		className: 'translationCell',
		children: [
			{
				id: 'file', type: 'label', className: 'translationKey'
			},
			{
				id: 'line', type: 'label', className: 'translationValue'
			}
		]
	};

	this.render = function() {
		this.file.setLabel(this._data.file);
		this.line.setLabel('line ' + this._data.line);
	};
});

var TranslationCell = Class(squill.Cell, function() {
	this._def = {
		className: 'translationCell',
		children: [
			{
				id: 'key', type: 'label', className: 'translationKey'
			},
			{
				id: 'value', type: 'label', className: 'translationValue'
			}
		]
	};

	this.onClick = function() {
		hitsDataSource.clear();
		hitsDataSource.add(this._data.hits);
	};

	this.render = function() {
		this.key.setLabel(this._data.key);
		this.value.setLabel(this._data.value);
	};
});

exports = Class(sdkPlugin.SDKPlugin, function(supr) {
	this._def = {
		children: [
			{
				className: 'topTabs',
				id: 'translationTabs',
				type: squill.TabbedPane,
			},
			{
				id: 'hitList',
				className: 'darkPanel',
				margin: 10,
				type: 'list',
				controller: this,
				cellCtor: HitCell
			}
		]
	};

	this.buildTranslations = function(err, response) {
		this.translationTabs.clear();
		if (err) {
			this.translationTabs.newPane({
				className: 'mainPanel',
				title: 'no translations yet!',
				children: [{
					id: 'noTranslations',
					text: transText,
					style: { padding: '20px' }
				}, {
					id: 'noTranslationsLink',
					tag: 'a',
					text: transLinkText,
					attrs: { href: transLink },
					style: { padding: '20px' }
				}]
			});
		} else {
			var trans = response.translations;
			var keys = response.keys;
			hitsDataSource = new DataSource({});
			this.hitList.setDataSource(hitsDataSource);
			for (var k in trans) {
				var ds = new DataSource({ key: 'key' });
				for (var key in trans[k]) {
					ds.add({
						key: key,
						value: trans[k][key],
						hits: keys[key]
					});
				}
				this.translationTabs.newPane({
					className: 'mainPanel',
					title: k,
					children: [{
						id: k + 'List',
						className: 'darkPanel translationList',
						margin: 10,
						type: 'list',
						controller: this,
						cellCtor: TranslationCell,
						dataSource: ds
					}]
				});
			}
		}
	};

	this.onBeforeShow = function() {
		util.ajax.get({
			url: this._project.url + 'lang/all.json',
			type: 'json'
		}, bind(this, 'buildTranslations'));
	};
});
