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

import lib.Callback;

from util.browser import $;
import std.uri;

import squill.Widget;
import squill.TabbedPane;
import squill.Delegate as Delegate;
import squill.cssLoad;
import util.ajax;

/**
 * Groups of plugins.
 */

var PluginGroup = Class(function() {
	var PRIORITIES = {
		header: "a",
		main: "b",
		project: "c",
		debug: "d",
		footer: "z"
	};

	var DEFAULT_PRIORITY = "z";

	this.init = function(name) {
		this.plugins = [];
		this.priority = PRIORITIES[name] || DEFAULT_PRIORITY;
	};

	this.add = function(plugin) { this.plugins.push(plugin); };
	this.toString = function() { return this.priority; };
});

/**
 * A lazily-loaded pane.
 */

var LazyPane = Class(squill.Widget, function(supr) {
	this.init = function(opts) {
		this.lazyPane = opts.pane;
		this.css = opts.css;

		supr(this, "init", arguments);
	};
});

/**
 * Overview widget.
 */

exports = Class(squill.TabbedPane, function(supr) {

	this._def = {
		className: "overviewPanel",
		contentsWrapperClassName: "overviewPanes",
		tabContainerClassName: "overviewTabs",
		tabChildren: [
			{
				id: "projectSelector",
				className: "hoverable",
				type: "button",
				tag: "div",
				children: [
					{
						className: "projectIcon",
						id: "_overviewProjectIcon",
						src: "/images/defaultIcon.png"
					},
					{
						className: "projectName",
						id: "_overviewProjectName",
						text: "no project selected"
					}
				]
			},
			{
				id: "simulateButton",
				text: "Simulate",
				type: "button"
			},
			{className: "separator"},
			{id: "logo"},
			{
				id: "ip",
				className: "monospace",
				children: [
					{id: "ipValue", tag: "span", text: ""}
				]
			}
		]
	};

	this.buildWidget = function() {
		supr(this, "buildWidget", arguments);

		var project = null;
		if(localStorage.lastProject) {
			project = this.getProjects().getItemForID(localStorage.lastProject);
		} else {
			project = this.getProjects().getItemForIndex(0);
		}

		this._currentProject = project;

		this._pluginByTitle = {};

		this.subscribe("SelectPane", this, function (pane) {
			localStorage.lastPane = pane._opts.title;
		});

		this.subscribe("ShowPane", this, function (pane) {
			this.onShowPane(pane);
		});

		this.refreshIP();

		util.ajax.get(
			{
				url: "/plugins/",
				type: "json"
			},
			(function () {
				var that = this;
				return function (err, data, headers) {
					// For now, transform data into a useable form
					var plugins = [];
					for (var name in data) {
						if (name === "simulate") continue;

						plugins.push({
							lazy: true,
							group: data[name].scope,
							"pane": name + ".Pane",
							"title": data[name].name

						});
					}
					that.onPaneSetup(err, plugins);
				};
			}).apply(this)
		);
	};

	this.refreshIP = function() {
		util.ajax.get({url: "/api/ip", type: "json"}, bind(this, "onRefreshIP"));
	};

	this.delegate = new Delegate(function(on) {
		on.simulateButton = function () {
			var proj = this.getCurrentProject();
			var orient = (proj.manifest.supportedOrientations || [])[0];
			var rot = orient === "portrait" ? "0" : "1";

			var loc = window.location;
			var targetHost = loc.hostname;

			/*
			 * Because the browser sees localhost and 127 as different domains,
			 *  this allows us to pause javascript in the simulator and not break the rest of the interface.
			 */
			//we still need this with the new simulator stuff, because we don't want to freeze the main UI.
			if (loc.hostname == "localhost") {
				targetHost = "127.0.0.1";
			} else if (loc.hostname == "127.0.0.1") {
				targetHost = "localhost";
			}

			var simulateURL = "//" + targetHost + ":" + (+loc.port + 1) + "/simulate/" + proj.id + '/#simulators=[{"name":"Simulator_0","device":"iphone","rotation":'+rot+"}]";

			//var simulateURL = "//" + targetHost + ":" + (+loc.port + 1) + "/simulate/" + proj.id + "/";

			/*
			 * a new window shares the js process with the parent window in chrome by default,
			 *  since we want a new process we need to set opener to null (which contains a reference to the parent window)
			 *  and then redirect to a cross-origin url.
			 */
			var win = window.open("about:blank");

			win.opener = null;
			win.location = simulateURL;
		};

		on.projectSelector = function () {
			this.showPane(this._pluginByTitle["Projects"]);
		}

		on.ipValue = function()  {
			this.refreshIP();
		};
	});

	this._setupPlugins = function(plugins) {
		var cssLoaded = new lib.Callback();

		function buildPlugin(plugin) {
			var child = {
				type: LazyPane,
				pane: plugin.pane,
				css: plugin.css
			};

			var pane = this.newPane({
				title: plugin.title,
				children: [child]
			});

			this._pluginByTitle[plugin.title] = pane;
			if (plugin.title === (localStorage.lastPane || "About")) {
				this.showPane(pane);
			}
		}

		// sort the plugins by group
		var groups = [];
		plugins.forEach(function(plugin) {
				var group = groups[plugin.group];
				if (!group) {
					group = new PluginGroup(plugin.group);
					groups.push(group); // index twice for hash lookup and sorting
					groups[plugin.group] = group;
				}

				group.add(plugin);
			});

		groups.sort();

		// build the tabs in order
		var isFirstGroup = true;
		groups.forEach(function (group) {
			if (!isFirstGroup) {
				this.addTabWidget({className: "separator"});
			} else {
				isFirstGroup = false;
			}

			group.plugins.forEach(buildPlugin, this);
		}, this);

		this.refresh();
	};

	this.selectProject = function(project) {
		if (!this.getCurrentProject()) {
			this.getTabs().show();
		}

		this.setCurrentProject(project);
	};

	this.onSelectPane = function (pane) {

		var child = pane.getFirstChild();
		var Constructor;

		// Load lazy panes.
		if (child.lazyPane) {
			var paneName = child.lazyPane;
			child.lazyPane = false;

			// Check that we haven't run this more than once.
			Constructor = jsio("import " + paneName);
			child = new Constructor({
				parent: pane,
				className: "pluginPanel"
			});

			pane._children[0] = child;

			try {
				if (child.showProject) child.showProject(this._currentProject);
				if (child.setOverview) child.setOverview(this);
			} catch (e) {
				logger.log(e);
			}

			pane.onBeforeShow();
		}
	};

	this.onShowPane = function(pane) {
		this.onSelectPane(pane);
	};

	this.onPaneSetup = function(err, response) {
		if (!err) {
			this._setupPlugins(response);
		}
	};

	this.onRefreshIP = function(err, response) {
		if (!err) {
			$.setText(this.ipValue, response.ip.join(","));
		}
	};

	this.getLaunchConfigurator = function() {
		return this._launchConfigurator;
	};

	this.setLaunchConfigurator = function(launchConfigurator) {
		this._launchConfigurator = launchConfigurator;
	};

	this.getTabs = function() {
		return this;
	};

	this.getProjects = function() {
		return this._opts.dataSource;
	};

	this.getCurrentProject = function() {
		return this._currentProject;
	};

	this.setCurrentProject = function(currentProject) {
		this._currentProject = currentProject;
		this.refresh();
	};

	this.getPluginByTitle = function(title) {
		return this._pluginByTitle[title] || null;
	};

	this.refresh = function() {
		var project = this._currentProject;
		if (!project) { return; }

		this._overviewProjectIcon.style.backgroundImage = "url(" + (project.getIcon(512) || "/images/defaultIcon.png") + ")";
		this.simulateButton.setLabel(project.manifest.launchTitle || "Simulate");

		if (project.manifest.ios && project.manifest.ios.icons && project.manifest.ios.icons.renderGloss) {
			$.addClass(this._overviewProjectIcon, "gloss");
		} else {
			$.removeClass(this._overviewProjectIcon, "gloss");
		}

		$.setText(this._overviewProjectName, project.manifest.title);

		var tabs = this.getTabs();
		var panes = tabs.getPanes();
		for (var title in panes) {
			var pane = panes[title];
			var child = pane.getFirstChild();
			if (child && child.showProject) {
				child.showProject(project);
			}
		}
	};
});
