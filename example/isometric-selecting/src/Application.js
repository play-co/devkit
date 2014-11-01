import device;

import ui.TextView as TextView;

import isometric.Isometric as Isometric;

import menus.views.components.ButtonView as ButtonView;

// Create two groups: the plain background and the cursor tiles:
var tileSettings = [
	{group: 1, images: [{index: 0, url: 'resources/images/demoGround0.png'}], width: 150, height: 120},
	{cursorYes: 'resources/images/cursorYes.png', cursorNo: 'resources/images/cursorNo.png'}
];

// Create a single layer with tiles of 150x120:
var gridSettings = {tileWidth: 150, tileHeight: 120, layers: [{}]};

// Create 3 different tools:
var editorSettings = {
	line: {type: 'line'},
	area: {type: 'area'},
	point: {type: 'item'}
};

exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.engine.updateOpts({
			alwaysRepaint: true,
			clearEachFrame: false, // Don't clear the isometric tiles always cover the entire screen
			keyListenerEnabled: false,
			logsEnabled: true,
			noTimestep: false,
			noReflow: true, // Don't use the reflow manager
			showFPS: false,
			resizeRootView: false,
			scaleUI: true,
			preload: ['resources/images']
		});

		// Create an instance of Isometric, this class wraps the isometric models and views.
		this._isometric = new Isometric({
			superview: this,
			gridSettings: gridSettings, // Core settings: grid size and layers
			tileSettings: tileSettings, // Information about the graphics
			editorSettings: editorSettings // Define the tools
		}).
			show().
			on('Edit', bind(this, 'onEdit'));

		// Create the tool buttons:
		this._tools = ['Drag', 'Point', 'Line', 'Area'];
		for (var i = 0; i < 4; i++) {
			new ButtonView({
				superview: this,
				x: 20 + i * 185,
				y: -20,
				width: 180,
				height: 90,
				title: this._tools[i],
				style: 'BLUE',
				on: {
					up: bind(this, 'onTool', i)
				}
			});
		}

		// Text showing which tool is active:
		this._modeText = new TextView({
			superview: this,
			x: this.baseWidth - 180,
			y: 0,
			width: 150,
			height: 60,
			size: 40,
			color: '#FFFFFF',
			strokeColor: '#000000',
			strokeWidth: 6,
			horizontalAlign: 'right',
			text: 'Drag',
			autoFontSize: false,
			autoSize: false,
			blockEvents: true
		});

		// Text displaying the last selection:
		this._selectedText = new TextView({
			superview: this,
			x: 20,
			y: this.baseHeight - 60,
			width: 400,
			height: 60,
			size: 40,
			color: '#FFFFFF',
			strokeColor: '#000000',
			strokeWidth: 6,
			horizontalAlign: 'left',
			autoFontSize: false,
			autoSize: false,
			blockEvents: true,
			visible: false
		});
		this._selectedTextTimeout = null;

		// The active tool:
		this._index = 0;
		this._isometric.setTool(false);
	};

	this.tick = function (dt) {
		this._isometric.tick(dt);
	};

	/**
	 * This function is called when an area is selected.
	 */
	this.onEdit = function (selection) {
		var text = '';
		var rect = selection.rect; // The selected rectangle

		switch (this._index) { // Which tool is active?
			case 1:
				text = 'Point (' + rect.x + ',' + rect.y + ')';
				break;

			case 2:
				if (rect.w === rect.h) {
					text = 'Point (' + rect.x + ',' + rect.y + ')';
				} else if (rect.w > rect.h) {
					text = 'Horizontal line (' + rect.x + ',' + rect.y + ') length: ' + rect.w;
				} else {
					text = 'Vertical line (' + rect.x + ',' + rect.y + ') length: ' + rect.h;
				}
				break;

			case 3:
				text = 'Area (' + selection.rect.x + ',' + selection.rect.y + ') width: ' + rect.w + ', height: ' + rect.h;
				break;
		}

		this._selectedTextTimeout && clearTimeout(this._selectedTextTimeout);

		this._selectedText.setText(text);
		this._selectedText.style.visible = true;

		this._selectedTextTimeout = setTimeout(
			bind(
				this._selectedText,
				function () {
					this.style.visible = false;
				}
			),
			2000
		);
	};

	/**
	 * Select a tool...
	 */
	this.onTool = function (index) {
		this._index = index;
		this._isometric.setTool(index ? this._tools[index].toLowerCase() : false); // Set the tool, setting to false enables dragging...
		this._modeText.setText(this._tools[index]);	
	};
});