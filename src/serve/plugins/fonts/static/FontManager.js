"use import";

from util.browser import $;

import lib.Enum as Enum;

import squill.Delegate;
import squill.Widget;
import squill.Cell;
import squill.contextMenu as contextMenu;

import .fontCells as fontCells;
import .FontPreviewRenderer as FontPreviewRenderer;
import .fontPreviewCode as fontPreviewCode;

import sdkPlugin;

var FONT_CELL_WIDTH = 129;
var FONT_CELL_HEIGHT = 197;

exports = FontManager = Class(squill.Widget, function(supr) {
	this.init = function() {
		this._buffer1 = document.createElement('canvas');
		this._buffer1.width = 128;
		this._buffer1.height = 128;
		this._buffer1Ctx = this._buffer1.getContext('2d');

		this._buffer2 = document.createElement('canvas');
		this._buffer2.width = 128;
		this._buffer2.height = 128;
		this._buffer2Ctx = this._buffer2.getContext('2d');

		this._def = {
			className: 'mainPanel',
			children: [
				{
					id: 'fontListWrapper',
					className: 'darkPanel',
					children: [
						{
							id: 'fontList',
							className: 'largeItemList',
							type: 'list',
							margin: 5,
							isTiled: true,
							preserveCells: true
						}
					]
				},
				{
					id: 'fontManagerButtons',
					className: 'toolWrapper',
					children: [
						{
							className: 'row',
							children: [
								{id: 'viewListBtn', type: 'button', label: '', className: 'viewListButton'},
								{id: 'viewTilesBtn', type: 'button', label: '', className: 'viewTilesButton'},

								{id: 'fontManagerNewFont', type: 'button', label: 'Create new font', className: 'rightItem'}
							]
						},
						{
							id: 'fontManagerPreview',
							className: 'darkPanel'
						},
						{
							id: 'fontManagerCanvas',
							type: 'canvas',
							width: 400,
							height: 132
						}
					]
				},
				{
					id: 'fontManagerConfirmDelete',
					className: 'toolWrapper',
					children: [
						{id: 'fontRemoveLabel', type: 'label', label: 'Are you sure you want to remove this font?', className: 'label'},
						{id: 'fontRemoveYes', type: 'button', label: 'Yes'},
						{id: 'fontRemoveNo', type: 'button', label: 'No'}
					]
				},
				{
					id: 'fontManagerRename',
					className: 'toolWrapper',
					children: [
						{id: 'fontRenameLabel', type: 'label', label: '', className: 'label'},
						{id: 'fontRenameInput', type: 'text'},
						{id: 'fontRenameOk', type: 'button', label: 'Ok'},
						{id: 'fontRenameCancel', type: 'button', label: 'Cancel'},
						{id: 'fontRenameMessage', type: 'label', label: '', className: 'label'}
					]
				}
			]
		};

		supr(this, 'init', arguments);
	};

	this._loadConfig = function() {
		var project = this._project;
		var config = project.config;
		if (!config) { return; }
		if (!config.fontsManagerTab) {
			config.fontsManagerTab = {
				listMode: sdkPlugin.listMode.TILED
			};
			project.saveConfig();
		}

		this._listMode = config.fontsManagerTab.listMode;
		this._showListMode(this._listMode);
	};

	this._saveConfig = function() {
		var project = this._project;
		var config = project.config;

		config.fontsManagerTab.listMode = this._listMode;

		project.saveConfig();
	};

	this.refresh = function() {
		this._fontList.load();
	};

	this._displayConfirmDelete = function(visible) {
		$.style('fontManagerConfirmDelete', {display: visible ? 'block' : 'none'});
		$.style('fontManagerRename', {display: 'none'});
		$.style('fontManagerButtons', {display: visible ? 'none' : 'block'});
	};

	this._displayRename = function(visible) {
		$.style('fontManagerConfirmDelete', {display: 'none'});
		$.style('fontManagerRename', {display: visible ? 'block' : 'none'});
		$.style('fontManagerButtons', {display: visible ? 'none' : 'block'});
	};

	this._removeTimeout = function() {
		if (this._removeFontTimeout) {
			clearTimeout(this._removeFontTimeout);
			this._removeFontTimeout = false;
		}
	};

	this.removeFont = function(data) {
		this._removeTimeout();
		this._removeFontTimeout = setTimeout(
			bind(
				this,
				function() {
					this._displayConfirmDelete(false);
				}
			),
			5000
		);

		this.fontRemoveLabel.setLabel('Are you sure you want to remove this font? (' + data.font.filename + ')');
		this._displayConfirmDelete(true);
		this._removeFilename = data.font.filename;
	};

	this.renameFont = function(data) {
		this.fontRenameMessage.setLabel('');
		this.fontRenameLabel.setLabel('Rename "' + data.font.contextName + '" to:');
		this._displayRename(true);
		this.fontRenameInput.setValue(data.font.contextName);
		this._renameFont = data;
	};

	this.delegate = new squill.Delegate(function(on) {
		on.fontRemoveNo = function() {
			this._removeTimeout();
			this._displayConfirmDelete(false);
		};

		on.fontRemoveYes = function() {
			this._removeTimeout();
			this._displayConfirmDelete(false);

			if (this._removeFilename) {
				this._project.getFontList().remove(
					this._removeFilename,
					bind(
						this,
						function() {
							this.refresh();
							this.clearPreview();
						}
					)
				);
			}
		};

		on.fontManagerNewFont = function() {
			this.publish('CreateFont');
		};

		on.fontRenameOk = function() {
			var newName = this.fontRenameInput.getValue();
			var message = this._fontList.rename(this._renameFont, newName);

			this.fontRenameMessage.setLabel('');

			if (message === true) {
				this._renameFont.cell.render();
				this._displayRename(false);
				this._updateSourceCode(this._renameFont);
			} else {
				this.fontRenameMessage.setLabel(message);
			}
		};

		on.fontRenameCancel = function() {
			this._displayRename(false);
		};

		on.viewListBtn = function() {
			this.viewRows();
		};

		on.viewTilesBtn = function() {
			this.viewTiled();
		};
	});

	this.getManager = function() {
		return this;
	};

	this.getProject = function() {
		return this._project;
	};

	this.setProject = function(project) {
		this._project = project;

		this._fontPreviewRenderer = new FontPreviewRenderer({
			buffer1Ctx: this._buffer1Ctx,
			buffer2Ctx: this._buffer2Ctx,
		});

		if (this._fontList !== project.getFontList()) {
			this._fontList = project.getFontList();
			this._fontList.subscribe('Loaded', this, 'onFontsLoaded');
			this.fontList.setDataSource(this._fontList.getList());
		}

		this.fontList.showPreview = bind(this, '_showPreview');

		this.fontList.getProject = bind(this, 'getProject');
		this.fontList.getManager = bind(this, 'getManager');

		this._loadConfig();
		this.refresh();
	};
/*
	this.getSettingsByFilename = function(filename) {
		var fonts = this._project.manifest.fonts;
		var i, j;

		for (i = 0, j = fonts.length; i < j; i++) {
			if (fonts[i].filename === filename) {
				return fonts[i];
			}
		}

		return null;
	};
*/
	this.editFont = function(font) {
		this.publish('EditFont', font);
	};

	this.duplicateFont = function(font) {
		this.publish('DuplicateFont', font);
	};

	this.saveManifest = function() {
		this._project.saveManifest();
	};

	this._renderFontPreview = function(data) {
		var canvas = this.fontManagerCanvas._el;
		var ctx = canvas.getContext('2d');
		var fontPreviewRenderer = this._fontPreviewRenderer;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		this._fontPreviewRenderer.setData(data);

		fontPreviewRenderer.renderLine(ctx, data.colorImages, 0, 40, 'The quick brown fox jumped...', null, 40);

		fontPreviewRenderer.renderLine(ctx, data.compositeOutlineImages, 0, 100, 'over the lazy dogs back...', '#0033DD', 15);
		fontPreviewRenderer.renderLine(ctx, data.compositeImages, 0, 100, 'over the lazy dogs back...', '#FFDD00', 15);
	};

	this._updateSourceCode = function(data) {
		this.fontManagerPreview.innerHTML = fontPreviewCode(data);
	};

	this._showPreview = function(data) {
		this._updateSourceCode(data);

		this._renderFontPreview(data);
	};

	this._showListMode = function(mode) {
		var listModeButtons = {};
		listModeButtons[sdkPlugin.listMode.TILED] = this.viewTilesBtn;
		listModeButtons[sdkPlugin.listMode.ROWS] = this.viewListBtn;

		this._lastViewButton && $.removeClass(this._lastViewButton, 'selected');
		this._lastViewButton = listModeButtons[mode].getElement();

		$.addClass(this._lastViewButton, 'selected');
	};

	this._showFonts = function() {
		switch (this._listMode) {
			case sdkPlugin.listMode.TILED:
				this.fontList.setTiled(true);
				this.fontList.setCellCtor(fontCells.FontTile);
				this.fontList.setCellDim({width: FONT_CELL_WIDTH, height: FONT_CELL_HEIGHT});
				break;

			case sdkPlugin.listMode.ROWS:
				this.fontList.setTiled(false);
				this.fontList.setCellCtor(fontCells.FontRow);
				break;
		}

		this._displayConfirmDelete(false);
		this._displayRename(false);
	};

	this.clearPreview = function() {
		var canvas = this.fontManagerCanvas._el;
		var ctx = canvas.getContext('2d');

		ctx.clearRect(0, 0, canvas.width, canvas.height);
	};

	this.clear = function() {
		this.clearPreview();
		// @todo reload images...
	};

	this.viewTiled = function() {
		if (this._listMode !== sdkPlugin.listMode.TILED) {
			this._fontList.clear();
			this.fontList.render(); // Rendering clears the internal list!

			this._listMode = sdkPlugin.listMode.TILED;
			this._showListMode(sdkPlugin.listMode.TILED);
			this.refresh();
			this._saveConfig();
		}
	};

	this.viewRows = function() {
		if (this._listMode !== sdkPlugin.listMode.ROWS) {
			this._fontList.clear();
			this.fontList.render(); // Rendering clears the internal list!

			this._listMode = sdkPlugin.listMode.ROWS;
			this._showListMode(sdkPlugin.listMode.ROWS);
			this.refresh();
			this._saveConfig();
		}
	};

	this.onFontsLoaded = function() {
		this._showFonts();
	};
});