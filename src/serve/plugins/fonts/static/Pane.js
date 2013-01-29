"use import";

import lib.Enum as Enum;

from util.browser import $;

import squill.cssLoad;
import squill.Widget;
import squill.TabbedPane;

import .FontEditor as FontEditor;
import .FontManager as FontManager;

import sdkPlugin;

var fontPanes = Enum(
	'PANE_FONT_MANAGER',
	'PANE_FONT_EDITOR'
);

exports = FontPane = Class(sdkPlugin.SDKPlugin, function(supr) {
	this.init = function() {
		supr(this, 'init', arguments);

		this._tabs = new squill.TabbedPane({
				parent: this._el,
				className: 'topTabs'
			}).subscribe('SelectPane', this, '_onShowPane');

		this._managerPane = this._tabs.newPane({
			title: 'font manager',
			children: [{type: FontManager}]
		});
		this._managerPane.fontPane = fontPanes.PANE_FONT_MANAGER;
		this._fontManager = this._managerPane.getFirstChild();
		this._fontManager.subscribe('CreateFont', this, '_onCreateFont');
		this._fontManager.subscribe('DuplicateFont', this, '_onDuplicateFont');

		this._editorPane = this._tabs.newPane({
			title: 'font editor',
			children: [
				{
					type: FontEditor,
					className: 'fontEditorPanel'
				}
			]
		});
		this._editorPane.fontPane = fontPanes.PANE_FONT_EDITOR;
		this._fontEditor = this._editorPane.getFirstChild();

		this._tabs.showPane(this._managerPane);
	};

	this.showProject = function(project) {
		supr(this, 'showProject', arguments);

		var manifest = project.manifest,
				save = false;

		if (manifest.fonts === undefined) {
			manifest.fonts = [];
			save = true;
		}

		if (save) {
			project.saveManifest();
		}

		this._editorPane.getFirstChild().setProject(project);
		this._editorPane.getFirstChild().subscribe('NewFont', this, '_onNewFont');

		this._managerPane.getFirstChild().setProject(project);
		this._managerPane.getFirstChild().subscribe('EditFont', this, '_onEditFont');
	};

	this.showFont = function(settings) {
		this._onEditFont(settings);
	};

	this._onShowPane = function(pane) {
		switch (pane.fontPane) {
			case fontPanes.PANE_FONT_MANAGER:
				this._fontManager.clear();
				break;

			case fontPanes.PANE_FONT_EDITOR:
				break;
		}
	};

	this._onNewFont = function() {
		this._managerPane._children[0].refresh();
	};

	this._onEditFont = function(font) {
		this._fontEditor.setSettings(font);
		this._tabs.showPane(this._editorPane);
	};
	
	this._onCreateFont = function() {
		this._fontEditor.createFont();
		this._tabs.showPane(this._editorPane);
	};

	this._onDuplicateFont = function(font) {
		this._fontEditor.duplicateFont(font);
		this._tabs.showPane(this._editorPane);
	};
});
