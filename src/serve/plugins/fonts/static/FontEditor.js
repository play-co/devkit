"use import";

from util.browser import $;

import lib.PubSub as PubSub;
import lib.Enum as Enum;

import squill.cssLoad;
import squill.Delegate;
import squill.Widget;
import squill.Cell;
import squill.models.DataSource as DataSource;

import .FontSettings as FontSettings;
import .FontInfo as FontInfo;

import .generator.FontRenderer as FontRenderer;
import .generator.FontMapper as FontMapper;

import .panels.RangePanel as RangePanel;
import .panels.CharListPanel as CharListPanel;
import .panels.SettingsPanel as SettingsPanel;
import .panels.OutlinePanel as OutlinePanel;
import .panels.EmbossPanel as EmbossPanel;
import .panels.DropShadowPanel as DropShadowPanel;

import util.ajax;

var editStates = Enum('OPTIONS', 'PROGRESS', 'FINISHED');

exports = FontEditor = Class(squill.Widget, function(supr) {
	this.init = function() {
		this._editState = editStates.SETTINGS;

		this._bufferSize = 512;

		this._buffer = document.createElement('canvas');
		this._buffer.width = this._bufferSize;
		this._buffer.height = this._bufferSize;
		this._bufferCtx = this._buffer.getContext('2d');

		this._previewChar = 'A';

		this._fontSettings = new FontSettings({});
		this._fontRenderer = new FontRenderer({bufferSize: this._bufferSize});
		this._fontMapper = new FontMapper({fontRenderer: this._fontRenderer});

		this._fontMapper.subscribe('Progress', this, this._onProgress);
		this._fontMapper.subscribe('FinishedGenerate', this, this._onFinishedGenerate);
		this._fontMapper.subscribe('Finished', this, this._onFinished);

		this._fontName = '-';
		this._zoom = 1;
		this._previewBackgroundColor = '#808080';

		this._def = {
			className: 'mainPanel',
			children: [
				{
					id: 'fontEditorNoFont',
					className: 'toolWrapper',
					children: [
						{id: 'fontNoneLabel', type: 'label', label: 'No font selected'}
					]
				},

				{
					id: 'fontEditorRightCol',
					className: 'fontContentRow fontContentRightExtraSize',
					children: [{id: 'characterListWrapper', className: 'darkPanel'}]
				},

				{
					id: 'fontEditorLeftCol',
					className: 'fontContentRow fontContentLeftExtraSize darkPanel',
					children: [
						{
							id: 'fontProgressWrapper',
							className: 'fontGroup center',
							children: [
								{id: 'creatingLabel', type: 'label', label: 'creating bitmap...', className: 'label statusLabel'},
								{
									className: 'progressWrapper',
									children: [
										{tag: 'img', src: 'images/ajax-loader.gif'},
										{id: 'progressLabel', type: 'label', label: '0%', className: 'smallLabel'}
									]
								},
								{id: 'cancel', type: 'button', label: 'Cancel', className: 'button'}
							]
						},

						{
							id: 'fontFinishedWrapper',
							className: 'fontGroup center',
							children: [
								{id: 'finishedLabel', type: 'label', label: 'Done, have fun with your font!', className: 'label'},
								{id: 'done', type: 'button', label: 'Continue', className: 'button'}
							]
						},

						{id: 'fontOptionsWrapper', children: [
							{
								className: 'fontGroup',
								children: [
									{
										children: [{type: 'label', label: 'fonts', className: 'label'}]
									},
									{
										children: [{id: 'fontsList', tag: 'select'}]
									}
								]
							},

							{id: 'rangeWrapper'},
							{id: 'settingsWrapper'},
							{id: 'outlineWrapper'},
							{id: 'embossWrapper'},
							{id: 'dropShadowWrapper'}
						]}
					]
				},

				{
					id: 'fontEditorTopWrapper',
					children: [
						{
							id: 'fontPreview',
							className: 'darkPanel',
							children: [
								{id: 'preview', type: 'canvas', 'width': 308, 'height': 128}
							]
						},
						{
							id: 'fontPreviewSettings',
							className: 'darkPanel',
							children: [
								{
									className: 'fontPreviewLabel',
									type: 'label',
									label: 'preview settings'
								},
								{
									className: 'row',
									children: [
										{className: 'label', type: 'label', label: 'color', className: 'fontPreviewOptionLabel'},
										{id: 'fontPreviewBackground', type: 'color'}
									]
								},
								{
									className: 'row',
									children: [
										{className: 'label', type: 'label', label: 'zoom', className: 'fontPreviewOptionLabel'},
										{id: 'fontPreviewZoom', type: 'slider', min: 1, max: 8, step: 1, width: 120}
									]
								}
							]
						},
						{
							id: 'create',
							type: 'button',
							label: 'Create bitmap'
						}
					]
				}
			]
		};

		supr(this, 'init', arguments);
	};

	this._showFontList = function(fontList) {
		this._fontsLoaded = true;

		var list = $.id('fontsList'),
			font,
			fontName,
			type,
			i, j, k;

		list.style.width = '165px';

		this._fontInfoByName = {};

		list.options.length = 0;
		list.options[list.options.length] = new Option('=== Select a font ===', '-');

		type = 'local';
		for (j = 0; j < 2; j++) {
			for (i = 0, k = fontList.length; i < k; i++) {
				font = fontList[i];
				if (font.type === type) {
					fontName = font.name;
					list.options[list.options.length] = new Option(
						fontName.substr(0, 1).toUpperCase() + fontName.substr(1, fontName.length - 1),
						fontName
					);
				}
			}
			if (j === 0) {
				k = list.options.length;
				list.options[k] = new Option('', '-');
				list.options[k].disabled = true;
			}
			type = 'system';
		}

		list.value = '-';

		$.onEvent(list, 'change', this, this._onChangeFont);
	};

	this._loadFontList = function() {
		if (this._fontsLoaded) {
			return;
		}
		util.ajax.get(
			{
				url: '/fonts/installed',
				data: {
					id: this._project.id
				},
				type: 'json'
			},
			bind(
				this, 
				function(err, response) {
					if (err) { 
						return alert(JSON.stringify(err));
					} else {
						this._showFontList(response);
					}
				}
			)
		);
	};

	this.buildWidget = function() {
		this._charListPanel = new CharListPanel({
			parent: $.id('characterListWrapper'),
			fontEditor: this,
			fontSettings: this._fontSettings
		});
		this._charListPanel.subscribe('Select', this, '_onSelectCharacter');

		this._rangePanel = new RangePanel({
			parent: $.id('rangeWrapper'),
			fontEditor: this,
			charListPanel: this._charListPanel
		});

		this._settingsPanel = new SettingsPanel({
			parent: $.id('settingsWrapper'),
			fontEditor: this,
			fontSettings: this._fontSettings
		});
		this._settingsPanel.subscribe('ChangeCharacter', this, '_onChangeCharacter');
		this._settingsPanel.subscribe('ChangeFont', this, '_onChangeFont');

		this._outlinePanel = new OutlinePanel({
			parent: $.id('outlineWrapper'),
			fontEditor: this,
			fontSettings: this._fontSettings
		});
		this._outlinePanel.subscribe('ChangeCharacter', this, '_onChangeCharacter');

		this._embossPanel = new EmbossPanel({
			parent: $.id('embossWrapper'),
			fontEditor: this,
			fontSettings: this._fontSettings
		});
		this._embossPanel.subscribe('ChangeCharacter', this, '_onChangeCharacter');

		this._dropShadowPanel = new DropShadowPanel({
			parent: $.id('dropShadowWrapper'),
			fontEditor: this,
			fontSettings: this._fontSettings
		});
		this._dropShadowPanel.subscribe('ChangeCharacter', this, '_onChangeCharacter');

		this.fontPreviewBackground.subscribe('Change', this, '_onChangePreviewBackground');
		this.fontPreviewZoom.subscribe('Change', this, '_onChangePreviewZoom');

		$.id('fontPreviewBackground').value = this._previewBackgroundColor;

		this.create.setEnabled(true);

		// $.hide('fontSettingsScrollWrapper');
		$.hide(this.fontEditorTopWrapper);
		$.hide(this.characterListWrapper);
	};

	this._renderPreviewChar = function(destCtx, srcCtx, x, y, size) {
		var zoom = this._zoom;
		
		if (zoom === 1) {
			destCtx.drawImage(srcCtx.canvas, 0, 0, size.width, size.height, x, y, size.width, size.height);
		} else {
			var imageData = srcCtx.getImageData(0, 0, size.width, size.height),
				data = imageData.data,
				red, grb, blu,
				alpha,
				offset = 0,
				a, b;

			for (b = 0; b < size.height; b++) {
				for (a = 0; a < size.width; a++) {
					alpha = data[offset + 3];
					if (alpha != 0) {
						red = data[offset];
						grn = data[offset + 1];
						blu = data[offset + 2];
						destCtx.fillStyle = 'rgba(' + red + ',' + grn + ',' + blu + ',' + alpha / 255 + ')';
						destCtx.fillRect(x + a * zoom, y + b * zoom, zoom + 0.5, zoom + 0.5);
					}
					offset += 4;
				}
			}
		}
	};

	this._createRenderOpts = function() {
		var fontSettings = this._fontSettings;

		return {
			x: 0,
			y: 0,
			color: fontSettings.getColor(),
			alpha: fontSettings.getAlpha(),

			outline: fontSettings.getOutline() * 2,
			outlineColor: fontSettings.getOutlineColor(),
			outlineAlpha: fontSettings.getOutlineAlpha(),
			outlineRect: fontSettings.getOutlineRect(),
			outlineX: fontSettings.getOutlineX() * 2,
			outlineY: fontSettings.getOutlineY() * 2,

			dropShadow: fontSettings.getDropShadow() * 2,
			dropShadowColor: fontSettings.getDropShadowColor(),
			dropShadowX: fontSettings.getDropShadowX() * 2,
			dropShadowY: fontSettings.getDropShadowY() * 2,

			emboss: fontSettings.getEmboss() * 2,
			embossColor1: fontSettings.getEmbossColor1(),
			embossAlpha1: fontSettings.getEmbossAlpha1(),
			embossColor2: fontSettings.getEmbossColor2(),
			embossAlpha2: fontSettings.getEmbossAlpha2(),

			font: fontSettings.getName(),
			size: fontSettings.getSize() * 2,
			bold: fontSettings.getBold(),
			italic: fontSettings.getItalic(),
			char: this._previewChar
		};
	};

	this._renderPreview = function() {
		var zoom = this._zoom,
			fontSettings = this._fontSettings,
			canvas = this.preview._el,
			ctx = canvas.getContext('2d'),
			opts = this._createRenderOpts(),
			size,
			x, y;

		this._bufferCtx.clearRect(0, 0, this._bufferSize, this._bufferSize);

		ctx.fillStyle = this._previewBackgroundColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		if (this._fontName === '-') {
			return;
		}

		this._fontRenderer.clear();

		size = this._fontRenderer.measureCharacter(opts);

		size.width = size.maxX - size.minX;
		size.height = size.maxY - size.minY;
		opts.x = 0;
		opts.y = 0;
		this._fontRenderer.renderCharacter(this._bufferCtx, opts);

		x = 154 - (size.width * zoom * 0.5);
		y = 64 - (size.height * zoom * 0.5) / 2;
		if (fontSettings.getOutlineX() > 0) {
			x += fontSettings.getOutlineX();
		}
		if (fontSettings.getOutlineY() > 0) {
		 	y += fontSettings.getOutlineY();
		}
		if (fontSettings.getDropShadowX() > 0) {
			x += fontSettings.getDropShadowX();
		}
		if (fontSettings.getDropShadowY() > 0) {
		 	y += fontSettings.getDropShadowY();
		}
		this._renderPreviewChar(ctx, this._bufferCtx, x, y, size);

		x = 154 + (fontSettings.getTracking() - fontSettings.getOutline() - Math.abs(fontSettings.getOutlineX())) * zoom * 0.5;
		y = 64 - (size.height * zoom * 0.5) / 2;
		if (fontSettings.getOutlineX() > 0) {
			x += fontSettings.getOutlineX();
		}
		if (fontSettings.getOutlineY() > 0) {
		 	y += fontSettings.getOutlineY();
		}
		if (fontSettings.getDropShadowX() > 0) {
			x += fontSettings.getDropShadowX();
		}
		if (fontSettings.getDropShadowY() > 0) {
		 	y += fontSettings.getDropShadowY();
		}
		this._renderPreviewChar(ctx, this._bufferCtx, x, y, size);
	};

	this._onSelectCharacter = function(character) {
		this._previewChar = character;
		this._renderPreview();
	};

	this._onChangeCharacter = function() {
		this._renderPreview();
	};

	this._onFontReady = function(fontInfo) {
		this._fontMapper.setFontInfo(fontInfo);
		this._charListPanel.setFontInfo(fontInfo);
		this._charListPanel.refresh();

		this._previewChar = 'A';
		this._renderPreview();
	};

	this._onChangeFont = function() {
		var fontName = this.fontsList.value;

		this._fontName = fontName;
		this._charListPanel.clear();

		if (fontName === '-') {
			this.create.setEnabled(false);
			this._renderPreview();
		} else {
			this.create.setEnabled(true);

			this._fontSettings.setName(fontName);

			if (this._fontInfoByName[fontName]) {
				this._onFontReady(this._fontInfoByName[fontName]);
			} else {
				this._charListPanel.setFontInfo(false);

				this._fontInfo = false;

				var fontInfo = new FontInfo({project: this._project, name: fontName});
				fontInfo.subscribe('Ready', this, this._onFontReady);
				this._fontInfoByName[fontName] = fontInfo;
			}
		}
	};

	this._onProgress = function(layer, perc) {
		this.progressLabel.setLabel('Layer ' + (layer + 1) + ', ' + perc + '%');
	};

	this._onFinishedGenerate = function() {
		this.creatingLabel.setLabel('Saving bitmap...');
		this.progressLabel.setLabel('0%');
	};

	this._onFinished = function(count) {
		this._fontSettings.setCount(count);
		this._fontSettings.addToManifest(this._project.manifest);
		this._project.saveManifest();
		this.setEditState(editStates.FINISHED);

		this.publish('NewFont');
	};

	this._onChangePreviewBackground = function() {
		this._previewBackgroundColor = $.id('fontPreviewBackground').value;
		if (this._previewBackgroundColor.charAt(0) !== '#') {
			this._previewBackgroundColor = '#' + this._previewBackgroundColor;
		}
		this._renderPreview();
	};

	this._onChangePreviewZoom = function() {
		this._zoom = parseInt($.id('fontPreviewZoom').slider.value, 10);
		this._renderPreview();
	};

	this.getFontSettings = function() {
		return this._fontSettings;
	};

	this._createBitmap = function() {
		var fontSettings = this._fontSettings,
			list = [];

		this.creatingLabel.setLabel('creating bitmap...');

		this._charListPanel.get().each(function(data) {
			if (data.isSelected) {
				list.push(data.character);
			}
		});

		if (list.length) {
			opts = this._createRenderOpts();
			opts.id = this._project.id;
			opts.list = list;
			opts.filename = fontSettings.getFilename();

			this.progressLabel.setLabel('0%');
			this.setEditState(editStates.PROGRESS);
			this._fontMapper.createMap(opts);
		}
	};

	this.delegate = new squill.Delegate(function(on) {
		on.create = function() {
			this._createBitmap();
		};

		on.cancel = function() {
			this._fontMapper.cancel();
			this.setEditState(editStates.OPTIONS);
		};

		on.done = function() {
			this.setEditState(editStates.OPTIONS);
		};
	});

	this.refresh = function() {
		this._charListPanel.refresh();
	};

	this.setEditState = function(editState) {
		var progress = 'none',
			finished = 'none',
			options = 'none';

		this._editState = editState;

		switch (editState) {
			case editStates.OPTIONS:
				options = 'block';
				this.create.setEnabled(true);
				break;

			case editStates.PROGRESS:
				progress = 'block';
				this.create.setEnabled(false);
				break;

			case editStates.FINISHED:
				finished = 'block';
				this.create.setEnabled(false);
				break;
		}

		this.fontProgressWrapper.style.display = progress;
		this.fontFinishedWrapper.style.display = finished;
		this.fontOptionsWrapper.style.display = options;
	};

	this.setProject = function(project) {
		if (project != this._project) {
			this._project = project;
			this._loadFontList();

			//alert('Gotta fix the cssLoad issue for custom fonts!');
			squill.cssLoad.get({url: '/plugins/font_editor/font_css?' + project.id});
		}
	};

	this.setSettings = function (font) {
		$.id('fontsList').value = font.name;
		this._onChangeFont();

		this._fontSettings.setFilename(font.filename);
		this._fontSettings.setContextName(font.contextName);

		this._fontSettings.setSize(font.size || 12);
		this._fontSettings.setBold(font.bold || false);
		this._fontSettings.setItalic(font.italic || false);
		this._fontSettings.setTracking(font.tracking || 0);

		this._fontSettings.setColor(font.color || [{p:0, v:'#FFFFFF'}]);
		this._fontSettings.setAlpha(font.alpha || [{p:0, v:100}]);

		this._fontSettings.setOutline(font.outline || 0);
		this._fontSettings.setOutlineRect(font.outlineRect || false);
		this._fontSettings.setOutlineColor(font.outlineColor || [{p:0, v:'#880000'}]);
		this._fontSettings.setOutlineAlpha(font.outlineAlpha || [{p:0, v:100}]);
		this._fontSettings.setOutlineX(font.outlineX || 0);
		this._fontSettings.setOutlineY(font.outlineY || 0);

		this._fontSettings.setEmboss(font.emboss || 0);
		this._fontSettings.setEmbossColor1(font.embossColor1 || [{p:0, v:'#000000'}]);
		this._fontSettings.setEmbossAlpha1(font.embossAlpha1 || [{p:0, v:100}]);
		this._fontSettings.setEmbossColor2(font.embossColor2 || [{p:0, v:'#FFFFFF'}]);
		this._fontSettings.setEmbossAlpha2(font.embossAlpha2 || [{p:0, v:100}]);

		this._fontSettings.setDropShadow(font.dropShadow || 0);
		this._fontSettings.setDropShadowColor(font.dropShadowColor || '#000000');
		this._fontSettings.setDropShadowX(font.dropShadowX || 0);
		this._fontSettings.setDropShadowY(font.dropShadowY || 0);

		this._settingsPanel.updateSettings();
		this._outlinePanel.updateSettings();
		this._embossPanel.updateSettings();
		this._dropShadowPanel.updateSettings();

		$.hide('fontEditorNoFont');
		// $.show('fontSettingsScrollWrapper');
		$.show(this.fontEditorTopWrapper);
		$.show(this.characterListWrapper);

		util.ajax.get(
			{
				url: '/projects/' + this._project.id + '/files/resources/fonts/' + font.filename + '.json'
			},
			bind(
				this,
				function(err, response) {
					if (!err) { 
						this._charListPanel.selectCharacters(JSON.parse(response));
					}
				}
			)
		);

		this._renderPreview();
	};

	this.duplicateFont = function(font) {
		var manifest = this._project.manifest,
			fonts = manifest.fonts || [],
			newFont = JSON.parse(JSON.stringify(font));

		manifest.fonts = fonts;
		newFont.filename = 'customFont' + (fonts.length + 1);
		newFont.contextName = newFont.filename;

		this.setSettings(newFont);
	};

	this.createFont = function() {
		var manifest = this._project.manifest;
		this._fontSettings.setFilename('customFont' + ((manifest.fonts ? manifest.fonts.length : 1) + 1));

		$.hide('fontEditorNoFont');
		// $.show('fontSettingsScrollWrapper');
		$.show('fontEditorTopWrapper');
		$.show('characterListWrapper');
	};
});
