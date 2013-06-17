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
from util.browser import $;

import squill.TabbedPane;
import squill.Cell;
import squill.models.DataSource as DataSource;

var ProjectCell = Class(squill.Cell, function() {
	this._def = {
		className: 'cell projectCell hoverable',
		children: [
			{
				id: 'icon', className: 'projectIcon'
			},
			{
				id: 'name', type: 'label', className: 'projectName'
			}
		]
	};

	this.render = function () {
		var project = this._data;

		var defaultIcon = '/images/defaultIcon.png';
		this.icon.style.backgroundImage = 'url(' + (project.getIcon(512) || defaultIcon) + ')';

		if (project.manifest.ios && project.manifest.ios.icons && project.manifest.ios.icons.renderGloss) {
			$.addClass(this.icon, 'gloss');
		} else {
			$.removeClass(this.icon, 'gloss');
		}

		this.name.setLabel(project.manifest && (project.manifest.title || project.manifest.name) || '<unknown>');
	};
});

var ExampleCell = Class(squill.Cell, function () {
	this._def = {
		className: 'exampleProjectCell',
		children: [
			{id: 'name', type: 'label', className: 'projectName'},
			{id: 'doc', tag: 'a', className: 'projectDoc'},
			{id: 'description', type: 'label', className: 'projectDescription'}
		]
	};

	this.render = function () {
		var project = this._data;
		this.name.setLabel(project.manifest && (project.manifest.title || project.manifest.name) || '<unknown>');
		this.description.setLabel(project.manifest && (project.manifest.description) || '');
		if (project.manifest.doc) {
			this.doc.href = project.manifest.doc;
			this.doc.innerText = "[doc]";
			this.doc.target = "_blank";
		}
	}
});

exports = Class(sdkPlugin.SDKPlugin, function(supr) {

	this._def = {
		id: 'ProjectsPane',
		children: [
			{className: 'topTabs', id: 'projectTabs', type: squill.TabbedPane, panes: [
				{className: 'mainPanel', title: 'Projects', children: [
					{id: 'projectList', margin: 10, type: 'list', isTiled: true, controller: this,
						selectable: 'single', cellCtor: ProjectCell, margin: 3}
				]}
			]}
		]
	};

	this.showProject = function (project) {
		supr(this, 'showProject', arguments);

		this.refresh();
	};

	this._filteredList = function (type) {
		return this._overview.getProjects().getFilteredDataSource(
				function(item) {
					return item.manifest.group && (item.manifest.group.toLowerCase() === type.toLowerCase());
				}
			);
	};

	this.setDataSource = function (dataSource) {
		this.projectList.setDataSource(dataSource);

		var panes = [];
		var paneNames = {};
		this._overview.getProjects().each(function (item) {
			var group = item.manifest.group;
			if (!paneNames[group]) {
				panes.push(group);
				paneNames[group] = true;
			}
		});
		for (var i = 0; i < panes.length; i++) {
			var group = panes[i];
			if (group) {
				var panel = this._children[0].newPane(
					{
						className: 'mainPanel',
						title: group.toUpperCase()[0] + group.substr(-group.length + 1),
						children: [
							{
								id: 'exampleList',
								className: 'darkPanel',
								margin: 10,
								type: 'list',
								controller: this,
								selectable: 'single', 
								cellCtor: ExampleCell
							}
						]
					}
				);
				var list = panel.getChildren()[0];
				list.setDataSource(this._filteredList(group));
				this._selectDelegate(list);
			}
		}

		this.refresh();
	};

	this.refresh = function () {
		if (!this.projectList || !this.projectList.getDataSource() || !this._project) {
			return;
		}

		this.projectList.selection.select(this._project);
	};

	this.setOverview = function () {
		supr(this, 'setOverview', arguments);

		this.setDataSource(
			this._overview.getProjects().getFilteredDataSource(
				function(item) {
					return !item.manifest.group;
				}
			)
		);
	};

	this._selectDelegate = function(list) {
		list.selection.on('Select', function (project) {
			GLOBAL.overview.selectProject(project);
			localStorage.lastProject = project.id;
		});
	};

	this.buildWidget = function (el) {
		supr(this, 'buildWidget', arguments);

		this._selectDelegate(this.projectList);
	};
});