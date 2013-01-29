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
				id: 'icon', className: 'project-icon'
			},
			{
				id: 'name', type: 'label', className: 'project-name'
			}
		]
	};

	this.render = function () {
		var project = this._data;

		var defaultIcon = '/images/defaultIcon.png';
		this.icon.style.backgroundImage = 'url(' + (project.getIcon(512) || defaultIcon) + ')';

		if (project.manifest.icons.renderGloss) {
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
			{id: 'name', type: 'label', className: 'project-name'},
			{id: 'doc', tag: 'a', className: 'project-doc'},
			{id: 'description', type: 'label', className: 'project-description'}
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
			{className: 'topTabs', type: squill.TabbedPane, panes: [
				{className: 'mainPanel', title: 'Projects', children: [
					{id: 'projectList', margin: 10, type: 'list', isTiled: true, controller: this,
						selectable: 'single', cellCtor: ProjectCell, margin: 3}
				]},
				{className: 'mainPanel', title: 'Examples', children: [
					{id: 'exampleList', className: 'darkPanel', margin: 10, type: 'list', controller: this,
						selectable: 'single', cellCtor: ExampleCell}
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
					return item.manifest.group &&  (item.manifest.group.toLowerCase() === type);
				}
			);
	};

	this.setDataSource = function (dataSource) {
		this.projectList.setDataSource(dataSource);

		this.exampleList.setDataSource(this._filteredList('examples'));

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
		this._selectDelegate(this.exampleList);
	};
});
