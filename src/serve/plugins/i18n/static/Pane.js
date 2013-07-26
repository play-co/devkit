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

var hitsNode = null;
var transHowTo = "You haven't set up any translations yet. Add your language-specific json files to resources/lang.";
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
		hitsNode.innerHTML = JSON.stringify(this._data.hits);
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
					text: transHowTo,
					style: { padding: '20px' }
				}]
			});
		} else {
			var trans = response.translations;
			var keys = response.keys;
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
			var tt = this.translationTabs.getElement();
			tt.style.height = (tt.parentNode.clientHeight - 200) + 'px';
			var tcw = this.translationTabs.tabContentsWrapper;
			tcw.style.height = (tcw.parentNode.clientHeight - 20) + 'px';
			if (!hitsNode) {
				hitsNode = document.createElement('div');
				hitsNode.style.position = 'absolute';
				hitsNode.style.bottom = '0px';
				hitsNode.style.width = tcw.clientWidth + 'px';
				hitsNode.style.height = '200px';
				hitsNode.style.background = 'red';
				tt.parentNode.appendChild(hitsNode);
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
