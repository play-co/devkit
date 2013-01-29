"use import";

from util.browser import $;

import squill.models.DataSource as DataSource;
import squill.contextMenu as contextMenu;

import SDKContextMenuCell;

import util.ajax;

import .FontPreviewRenderer as FontPreviewRenderer;

var BasicFontItemCell = Class(SDKContextMenuCell, function(supr) {
	this.onClick = function() {
		supr(this, 'onClick', arguments);

		var data = this._data;
		this._parent.publish('Select', data);
		this.controller.showPreview(data);
	};

	this.buildContextMenu = function() {
		var data = this._data;
		var font = data.font;
		var project = this.controller.getProject();
		var contextMenu;

		if (this._el.contextMenu) {
			contextMenu = this._el.contextMenu;
		} else {
			contextMenu = {
				width: 300,
				options: [
					{
						title: 'Edit',
						onclick: bind(
							this,
							function() {
								this.controller.getManager().editFont(font);
							}
						)
					},
					{
						title: 'Duplicate font',
						onclick: bind(
							this,
							function() {
								this.controller.getManager().duplicateFont(font);
							}
						)
					},
					{
						title: '-'
					},
					{
						title: 'Rename',
						onclick: bind(
							this,
							function() {
								this.controller.getManager().renameFont(data);
							}
						)
					},
					{
						title: '-'
					},
					{
						title: 'Delete font',
						onclick: bind(
							this,
							function() {
								this.controller.getManager().removeFont(data);
							}
						)
					},
					{
						title: '-'
					},
					{
						title: 'Preload color image',
						onchange: bind(
							this,
							function(checked) {
								font.preloadColor = checked;
								project.saveManifest();
							}
						),
						checked: false
					},
					{
						title: 'Preload composite images',
						onchange: bind(
							this,
							function(checked) {
								font.preloadComposite = checked;
								project.saveManifest();
							}
						),
						checked: false
					}
				]
			};
			this._el.contextMenu = contextMenu;
		}

		contextMenu.options[0].title = 'Edit font "' + font.contextName + '"';
		contextMenu.options[3].title = 'Rename "' + font.contextName + '"';
		contextMenu.options[7].checked = !!font.preloadColor;
		contextMenu.options[8].checked = !!font.preloadComposite;
	};
});

exports.FontTile = Class(BasicFontItemCell, function(supr) {
	this.init = function() {
		this._def = {
			className: 'largeTile fontTile',
			children: [
				{
					className: 'largeTileContent',
					children: [
						{id: 'cellMenuButton', children: [{type: 'label', label: '+'}]},
						{id: 'img', tag: 'img'}
					]
				},
				{
					className: 'largeTileOverview fontTileOverview',
					children: [
						{id: 'contextName', type: 'label', className: 'center full bold'},
						{id: 'name', type: 'label', className: 'center full italic'},
						{id: 'settings', type: 'label', className: 'left'},
						{id: 'size', type: 'label', className: 'right'}
					]
				}
			]
		};

		supr(this, 'init', arguments);
	};

	this.render = function() {
		var data = this._data;
		var font = data.font;
		var settings = '';

		data.cell = this;
		data.load();

		this.buildContextMenu();

		if (font.bold) {
			settings += 'bold';
		}
		if (font.italic) {
			if (settings !== '') {
				settings += ', ';
			}
			settings += 'italic';
		}

		this.img.src = data.src;
		this.contextName.setLabel(font.contextName);
		this.name.setLabel(font.name);
		this.size.setLabel(font.size + 'px');
		this.settings.setLabel(settings ? settings : '-');
	};
});

exports.FontRow = Class(BasicFontItemCell, function(supr) {
	var PREVIEW_WIDTH = 400, PREVIEW_HEIGHT = 64;

	this.init = function() {
		this._def = {
			className: 'largeRow fontRow',
			children: [
				{id: 'editFont', type: 'label', label: 'Edit font', className: 'rowOption'},
				{id: 'deleteFont', type: 'label', label: 'Delete font', className: 'rowOption'},

				{id: 'img', tag: 'img'},
				{
					className: 'largeRowContent',
					children: [
						{
							className: 'row',
							children: [
								{id: 'contextName', type: 'label', className: 'title'}
							]
						},
						{
							className: 'row',
							children: [
								{id: 'name', type: 'label', className: 'center full italic'},
								{id: 'settings', type: 'label', className: 'left'},
								{id: 'size', type: 'label', className: 'right'}
							]
						}
					]
				},

				{id: 'previewCanvas', tag: 'canvas', attrs: {width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT}}
			]
		};

		supr(this, 'init', arguments);
	};

	this.buildWidget = function() {
		supr(this, 'buildWidget', arguments);

		$.onEvent(this.editFont.getElement(), 'click', this, 'onEditFont');
		$.onEvent(this.deleteFont.getElement(), 'click', this, 'onDeleteFont');
	};

	this.onEditFont = function() {
		this.controller.getManager().editFont(this._data.font);
	};

	this.onDeleteFont = function() {
		this.controller.getManager().removeFont(this._data);
	};

	this.onPreviewLoaded = function() {
		var ctx = this.previewCanvas.getContext('2d');

		ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

		this._fontPreviewRenderer = this._fontPreviewRenderer || new FontPreviewRenderer({});

		this._fontPreviewRenderer.setData(this._data);
		this._fontPreviewRenderer.renderLine(ctx, this._data.colorImages, 0, 20, 'ABC def 1234', null, 40);
	};

	this.render = function() {
		var data = this._data;
		var font = data.font;
		var settings = '';

		data.subscribeOnce('Loaded', this, 'onPreviewLoaded');
		data.load();

		data.cell = this;

		if (font.bold) {
			settings += 'bold';
		}
		if (font.italic) {
			if (settings !== '') {
				settings += ', ';
			}
			settings += 'italic';
		}

		this.img.src = data.src;
		this.contextName.setLabel(font.contextName);
		this.name.setLabel(font.name);
		this.size.setLabel(font.size + 'px');
		this.settings.setLabel(settings ? settings : '-');
	};
});