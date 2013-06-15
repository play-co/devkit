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

import ....sdkPlugin;
import shared.Version as Version;
import util.ajax;
import string.timeAgo;

import squill.TabbedPane;
import squill.Delegate;
import squill.models.DataSource;
import squill.Cell;

from util.browser import $;

var currentVersion = null;

var VersionCell = Class(squill.Cell, function(supr) {
	this._def = {
		className: 'version',
		children: [
			{id: 'switch', type: 'button', text: 'switch'},
			{id: 'label', type: 'label'}
		]
	};

	this.delegate = new squill.Delegate(function(on) {
		on.switch = function() {
			this.controller.publish('Switch', this._data);
		};
	});

	this.render = function() {
		this.label.setText(this._data.version.toString());

		if (this._data.version == currentVersion) {
			$.addClass(this._el, 'current');
		} else {
			$.removeClass(this._el, 'current');
		}
	};
});

var versionData = new squill.models.DataSource({key: 'src', sorter: function (v) { return Version.sorterKey(v.version); }});

exports = Class(sdkPlugin.SDKPlugin, function(supr) {
	this._def = {
		id: 'aboutPane',
		children: [
			{id: 'aboutMain', className: 'mainPanel', title: 'about', children: [
				{className: 'table-wrapper', children: [
					{className: 'table', children: [
						{className: 'table-row', children: [
							{className: 'table-cell', children: [
								{id: 'bigLogo'},
								{id: 'version', text: ''},
								{id: 'lastChecked', children: [
									{id: 'updateStatus'},
									{id: 'lastCheckedStatus'},
									{id: 'refresh', type: 'button', text: '\u21BB', className: 'circle'}
								]},
								{id: 'btnSwitchVersion', type: 'button', text: 'switch version'}
							]}
						]},
					]},
				]},
				
				{id: 'versionWrapper', children: [
					{id: 'versionHeader', text: 'all versions:'}, // children: [{tag: 'span', text: 'all versions: '}, {tag: 'span', id: 'aboutVersion'}]},
					{id: 'versionListWrapper', className: 'darkPanel', children: [
						{id: 'versions', type: 'list', dataSource: versionData, cellCtor: VersionCell, selectable: 'single'}
					]}
				]}
			]}
		]
	};

	this.delegate = new squill.Delegate(function(on) {

		on.refresh = function() {
			$.setText(this.lastCheckedStatus, 'checking for updates...');
			util.ajax.get({
				url: '/plugins/about/check_now/',
				type: 'json'
			}, bind(this, 'onVersions'));
		};

		on.btnSwitchVersion = function () {
			$.addClass(this._el, 'showVersions');
			this.versions.needsRender();
		}
	});

	this.onSwitchVersion = function(version) {
		$.setText(this.lastCheckedStatus, 'Updating... Please wait.');
		util.ajax.get({
				url: '/plugins/about/update/',
				data: {
					version: version.src
				}
			}, function(err, response) {
				if (err) {
					$.setText(err);
				} else {
					$.setText(this.lastCheckedStatus, 'Complete! Reload the page.');
				}
			});
	};

	this.buildWidget = function() {
		supr(this, 'buildWidget', arguments);

		this.getVersions();
		this.versions.subscribe('Switch', this, 'onSwitchVersion');
	};

	this.getVersions = function() {
		util.ajax.get({
				url: '/plugins/about/version/', 
				type: 'json'
			}, bind(this, 'onVersions'));
	};

	this.onVersions = function(err, response) {
		if (!response) {
			return;
		}

		var lastChecked = response.info ? response.info.lastChecked : -1;
		if (lastChecked == -1) {
			$.setText(this.lastCheckedStatus, 'checking for updates...');
		} else {
			$.setText(this.lastCheckedStatus, 'last checked ' + string.timeAgo(lastChecked));
		}

		//determine the current version
		var version = new Version(response.info.version);

		versionData.clear();

		//loop through the available versions
		for (var name in response.tags) {
			var v = Version.parse(name);
			if (!v) continue;

			if (v.eq(version)) {
				currentVersion = v;
			}

			versionData.add({
				version: v,
				src: v.src
			});
		}

		versionData.sort(Version.sorterDesc);

		var verStr;
		if (!currentVersion) {
			verStr = 'Version unknown';
		} else {
			if (currentVersion.channel == 'release') {
				verStr = 'Version ' + currentVersion.toString(true); // don't show channel
			} else {
				verStr = 'Version ' + currentVersion.toString();
			}
		}

		$.setText(this.version, verStr);
		
		this._checkUpdates();
	};

	this._checkUpdates = function() {
		if (!currentVersion) {
			return;
		}

		var nextVersion = null;

		// find the first non-beta version greater than the current version
		versionData.forEach(function(data) {
			if (currentVersion.lt(data.version)) {
				nextVersion = data.version;
				return true;
			}
		}, this);

		if (nextVersion) {
			this._nextVersion = nextVersion;
			$.setText(this.updateStatus, 'an update is available!');
			logger.log(nextVersion.tag);
		} else {
			$.setText(this.updateStatus, 'no updates');
		}
	};
});
