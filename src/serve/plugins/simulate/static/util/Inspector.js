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

import squill.Widget as Widget;
import util.ajax;
from util.browser import $;
from util.underscore import _;
import math.geom.Point as Point;
import lib.PubSub;

import net;

//which node in the view heirarchy is selected
var currentNode;
//current appID
var appID;

var InputWidget = Class(Widget, function (supr) {
	this._def = {
		children: [
			{type: 'text', id: '_value'}
		]
	};

	this.buildWidget = function () {
		this._value.subscribe('ValueChange', this, 'publish', 'ValueChange');
		this._value.subscribe('Blur', this, '_onBlur');
		this._value.subscribe('Focus', this, '_onFocus');

		this._value.subscribe('Down', this, '_onMouseDown');
		this._value.subscribe('KeyDown', this, '_onKeyDown');

		var inputEl = this._value.getInputElement();

		var prop = this._opts.prop || {};

		if (prop.readOnly) {
			this._isReadyOnly = true;
			inputEl.style.cursor = 'default';
		}

		switch (prop.type) {
			case 'boolean':
				this._type = 'boolean';
				inputEl.style.cursor = 'pointer';
				break;
			case 'string':
				this._type = 'string';
				break;
			case 'number':
			default:
				this._type = 'number';
				if ('min' in prop) {
					this._min = prop.min;
				}

				if ('max' in prop) {
					this._max = prop.max;
				}

				this._increment = prop.increment;
				break;
		}

		this.initMouseEvents();
	};

	this._onMouseDown = function (e) {
		if (this._isReadyOnly) {
			$.stopEvent(e);
			return;
		}

		if (this._type == 'boolean') {
			this._setValue(!this.getValue());
			$.stopEvent(e);
		}
	};

	this._onFocus = function () {
		switch (this._type) {
			case 'boolean':
				this._value.getElement().blur();
				break;
		}
	};

	this._onBlur = function () {
		this.setValue(this.getValue());
	};

	// set and publish
	this._setValue = function (value) {
		this.setValue(value);
		this.publish('ValueChange', this._value.getValue());
	};

	this.setValue = function (value) {
		this._lastValue = value;

		switch (this._type) {
			case 'number':
				if (value == undefined) { value = '-'; }
				this._value.setValue(value);
				break;
			case 'boolean':
				this._value.setValue(value ? 'true' : 'false');
				break;
			case 'string':
			default:
				this._value.setValue('' + value);
				break;
		}
	};


	// ugly way to do fixed-point sum
	// e.g. 0.06 - 0.01 should be 0.05 (not 0.049999999999999996)
	function add(value, incr) {
		var sum = value + incr;
		var str = incr.toString().split(".");
		if (str.length > 1) {
			var frac = str[1].length;
			sum = +sum.toFixed(frac);
		}

		return sum;
	}

	this._onKeyDown = function (evt) {
		switch (evt.keyCode) {
			case 37: // left
				break;
			case 38: // up
				this._setValue(add(this.getValue(), (this._increment || 1)));
				$.stopEvent(evt);
				break;
			case 39: // right
				break;
			case 40: // down
				this._setValue(add(this.getValue(), -(this._increment || 1)));
				$.stopEvent(evt);
				break;
		}
	};

	this.getValue = function () {
		switch (this._type) {
			case 'number':
				var val = this._value.getValue();
				if (val == '-') { return undefined; }

				val = parseFloat(val);
				if (('_max' in this) && val > this._max) {
					val = this._max;
				}

				if (('_min' in this) && val < this._min) {
					val = this._min;
				}

				if (isNaN(val)) {
					return this._lastValue;
				} else {
					return val;
				}
			case 'boolean':
				return this._value.getValue() == 'true';
			default:
			case 'string':
				return this._value.getValue();
		}
	};
});

function noop(e) {
	e.stopPropagation();
	e.preventDefault();
	return false;
}

var currentImage;

var PropRow = Class(Widget, function (supr) {
	this.init = function (opts) {

		var children = [];

		this._def = {
			className: 'propRow',
			children: children
		};

		if (typeof opts.prop == 'string') { opts.prop = {title: opts.prop, id: opts.prop}; }

		var props = opts.props || [opts.prop];
		props.forEach(function (prop) {
			children.push({className: 'propTitle', text: prop.title || prop.id}, {id: prop.id, type: InputWidget, prop: prop});
		});

		this._def.className += ' propCount' + props.length;

		supr(this, 'init', arguments);

		this.props = props;

	}
});

var DetailsWidget = Class(Widget, function (supr) {
	this._def = {
		children: [
			{id: '_header', children: [
				{text: 'editing: ', tag: 'span'},
				{id: '_editorType', tag: 'span', text: 'simulator', type: 'label'},
				{id: '_closeBtn', type: 'button', text: 'x'}
			]},
			{id: 'details', children: [
				{id: 'viewDetails', type: 'label'},
				{id: 'detailsOverlay'},
				{id: 'detailsScroller', children: [
					{className: 'propRow propSection', text: 'position'},
					{type: PropRow, props: [{title: 'x', id: 'relX'}, {title: 'y', 'id': 'relY'}]},
					{type: PropRow, prop: {title: 'r', id: 'relR', increment: 0.01}},
					{type: PropRow, props: [{title: 'width', id: 'relWidth'}, {title: 'height', id: 'relHeight'}]},
					{type: PropRow, prop: {title: 'scale', id: 'relScale'}},

					{className: 'propRow propSection', text: 'style'},
					{type: PropRow, prop: {id: 'opacity', min: 0, max: 1, increment: 0.01}},
					{type: PropRow, prop: 'zIndex'},
					{type: PropRow, prop: {id: 'visible', type: 'boolean'}},
					{type: PropRow, props: [{title: 'anchor x', id: 'anchorX'}, {title: 'y', id: 'anchorY'}]},
					{type: PropRow, props: [{title: 'offset x', id: 'offsetX'}, {title: 'y', id: 'offsetY'}]},
					{type: PropRow, prop: {id: 'clip', type: 'boolean'}},
					{type: PropRow, prop: {id: 'inLayout', type: 'boolean'}},
					{type: PropRow, prop: 'order'},
					{type: PropRow, prop: 'flex'},
					{type: PropRow, prop: 'layout'},
					
					{id: 'boxProps', children: [
						{className: 'propRow propSection', text: 'box layout'},
						{type: PropRow, props: [{id: 'left'}, {id: 'right'}]},
						{type: PropRow, props: [{id: 'top'}, {id: 'bottom'}]},

						{type: PropRow, props: [{id: 'minWidth'}, {title: 'height', id: 'minHeight'}]},
						{type: PropRow, props: [{id: 'maxWidth'}, {title: 'height', id: 'maxHeight'}]},
						{type: PropRow, props: [{id: 'layoutWidth'}, {title: 'height', id: 'layoutHeight'}]},
						{type: PropRow, props: [{id: 'centerX', type: 'boolean'}, {id: 'centerY', type: 'boolean'}]},

					]},

					{id: 'linearProps', children: [
						{className: 'propRow propSection', text: 'linear layout'},
						{type: PropRow, prop: 'subviews'},
						{type: PropRow, prop: 'direction'},
						{type: PropRow, prop: 'justifyContent'},
						{type: PropRow, prop: {id: 'padding', type: 'string'}},
					]},

					{className: 'propRow propSection', text: 'absolute position'},
					{type: PropRow, props: [{title: 'x', id: 'absX'}, {title: 'y', 'id': 'absY'}]},
					{type: PropRow, prop: {title: 'r', id: 'absR', increment: 0.01}},
					{type: PropRow, props: [{title: 'width', id: 'absWidth'}, {title: 'height', id: 'absHeight'}]},
					{type: PropRow, prop: {title: 'scale', id: 'absScale'}},
					
					{tag: 'div', id: 'dropArea', text: 'Drop Here \u2193', children: [
						{tag: 'button', id: 'saveImg', text: "save image"}
					]}
				]}
			]}
		]
	};

	this.buildWidget = function () {

		this._children.forEach(function (child) {
			if (child instanceof PropRow) {
				child.props.forEach(function (prop) {
					this[prop.id] = child[prop.id];
					this[prop.id].subscribe('ValueChange', this, '_onValueChange', prop.id);
				}, this);
			}
		}, this);
	};

	this.delegate = function (key) {
		if (key == '_closeBtn') {
			this._inspector.close();
		}
	}

	this._onValueChange = function (key) {
		if (this._viewUID) {
			var value = this[key].getValue();
			this._inspector.setViewProp(this._viewUID, key, value);
		}
	};

	this.setInspector = function (inspector) {
		this._inspector = inspector;
	};

	this.imageView = function (uid, node) {
		// get the view properties
		this._inspector.getViewProps(uid, bind(this, function (err, res) {
			if (err) return;

			// show the drop area
			this.dropArea.style.display = res.isImageView ? "block" : "none";

			//if already data set, show save button
			if (!node.currentImage || !node.currentImage.data) {
				this.saveImg.style.display = "none";
			} else {
				this.saveImg.style.display = "block";
			}

			if (res.isImageView) {
				//create the object if not set
				if (!node.currentImage) {
					node.currentImage = {};
				}

				//update the uid and path
				node.currentImage.uid = uid;
				node.currentImage.path = res.imagePath;
			} else {
				//delete the property
				delete node['currentImage'];
			}
		}));
	}

	this.showView = function (uid) {
		this._viewUID = uid;

		if (uid) {
			this._inspector.getViewProps(uid, bind(this, function (err, res) {
				if (res) {
					this.viewDetails.setText(res.description);
					if (res.layout == 'linear') {
						$.show(this.linearProps);
					} else {
						$.hide(this.linearProps);
					}

					for (var key in res) {
						if (this[key] && this[key].setValue) {
							this[key].setValue(res[key]);
						}
					}
				}
			}));
		}
	};

	this.hideProps = function () {
		for (var i = 0, p; p = arguments[i]; ++i) {
			$.hide(this['_row' + p]);
		}
	}

	this.showProps = function () {
		for (var i = 0, p; p = arguments[i]; ++i) {
			$.show(this['_row' + p]);
		}
	}

	this.init = function() {
		supr(this, "init", arguments);

		this.dropArea.addEventListener("dragenter", noop, false);
		this.dropArea.addEventListener("dragexit", bind(this, function(e) {
			this.dropArea.className = "";
			return noop(e);
		}), false);

		//modify the styles
		this.dropArea.addEventListener("dragover", bind(this, function(e) {
			this.dropArea.className = "over";
			return noop(e);
		}), false);

		this.dropArea.addEventListener("drop", bind(this, this.dropImage), false);

		this.saveImg.addEventListener("click", bind(this, this.saveImage), false);
	};

	this.dropImage = function(e) {
		var files = e.dataTransfer.files;
		var count = files.length;
		var file  = files[0];

		if (count < 1) {
			return console.log("No image found");
		}

		var reader = new FileReader();
		reader.onload = bind(this, function(evt) {
			//set the preview
			if (!currentNode || !currentNode.currentImage) return;

			this._inspector.setImage(currentNode.currentImage.uid, evt.target.result);
			currentNode.currentImage.data = evt.target.result;
		});

		reader.readAsDataURL(file);

		this.saveImg.style.display = "block";
		return noop(e);
	}

	this.saveImage = function() {
		var img = currentNode && currentNode.currentImage;
		if (!img) return;

		var path = encodeURIComponent(img.path.substr(10));

		util.ajax.post({
			url: "/art/replaceImage/" + appID + "/" + path,
			data: {data: img.data},
			headers: {
				'Content-Type': 'application/json'
			}
		}, bind(this, function(err, resp) {
			if (!err) {
				delete currentNode.currentImage.data;
				this.saveImg.style.display = "none";
			}
		}));
	}
});

exports = Class(Widget, function(supr) {
	this._def = {
		style: {
			left: '-550px',
			width: '650px'
		},
		children: [
			
			{id: '_tree', style: {width: '350px'}, children: [
				// {id: '_moveBtn', tag: 'button', text: 'move'},
				// {id: '_clearViewBtn', tag: 'button', text: 'clear'}
			]},
			{id: '_details', type: DetailsWidget, style: {left: '350px'}}
		]
	};

	this.init = function(opts) {
		if (opts.simulator) {
			this.setSimulator(opts.simulator);
		}

		this._highlight = {timer: 0};
		this._t = 0;
		this._highlighted = {};
		
		this._trace = {
			list: [],
			hash: {}
		};

		appID = opts.appID;

		// keep a dictionary of all tree nodes for fast highlighting based on view uid
		this._nodeIndex = {};

		this._deepTrace = document.createElement("div");
		this._deepTrace.setAttribute("id", "_deepTrace");
		document.body.appendChild(this._deepTrace);
		
		supr(this, 'init', arguments); //Widget.init

		this._details.setInspector(this);

		$.onEvent(this._tree, 'mouseover', this, function () {
			this._disableHighlight = false;
		});
	};

	this.getConn = function () { return this._conn; };

	this.onConnection = function (conn, uid) {
		this._conn = conn;

		// conn.sendRequest('ADD_MOUSE_EVT');

		conn.onEvent.removeAllListeners();

		conn.onEvent.subscribe('INPUT_MOVE', this, function (evt) {
			this.onMouseMove(evt.args);
		});

		conn.onEvent.subscribe('INPUT_SELECT', this, function (evt) {
			this.onMouseSelect(evt.args);
		});

		conn.onEvent.subscribe('INPUT_TRACE', this, function (evt) {
			this.onTrace(evt.args);
		});

		conn.onEvent.subscribe('POLL_VIEW_POSITION', this, function (evt) {
			if(evt.args.uid === this._highlightUID) this._highlightPos = evt.args;
			if(evt.args.uid === this._selectedView) this._selectedPos = evt.args;
		});

		if (this._node) {
			this._node.destroy();
		}

		this._node = new ViewNode({id: 'rootNode', inspector: this, viewUID: uid, parent: this._tree});

		if (this._isShowing) {
			this._connectMouseEvents();
		}
	};

	this.getViewProps = function (uid, cb) {
		if (this._conn && this._conn.isConnected()) {
			return this._conn.sendRequest('GET_VIEW_PROPS', {uid: uid}, null, cb);
		}
	};

	this.setViewProp = function (uid, key, value, cb) {
		if (this._conn && this._conn.isConnected()) {
			return this._conn.sendRequest('SET_VIEW_PROP', {uid: uid, key: key, value: value}, null, cb);
		}
	};

	this.setImage = function (uid, data, cb) {
		if (this._conn && this._conn.isConnected()) {
			cb = cb || function(){};
			this._conn.sendRequest('REPLACE_IMAGE', {uid: uid, imgData: data}, null, cb)
		}
	};

	this.startLocalDebugging = function (simulator) {
		if (this._unbindMouseout) {
			this._unbindMouseout();
			this._unbindMouseout = null;
		}

		var mouseOut = bind(this, 'onMouseOut');
		var mouseOver = bind(this, 'onMouseOver');
		var frame = simulator.getFrame();
		
		this._unbindMouseout = bind(frame, 'removeEventListener', 'mouseout', mouseOut, true);
		
		frame.addEventListener('mouseout', mouseOut, true);
		frame.addEventListener('mouseover', mouseOver, true);
		
		this._simulator = simulator;
		
		this._server = simulator.getDebugLoggerServer();

		if (this._server.built) {
			var conn = this._conn = this._server.getConn();
			conn.sendRequest("GET_ROOT_UID", {}, null, bind(this, function (err, res) {
				this.onConnection(conn, res.uid)
			}));
		} else {
			this._server.subscribe('NewConnection', this, 'onConnection');
			var port = '__debug_timestep_inspector_' + this._simulator._port + '__';
			net.listen(this._server, 'postmessage', {port: port});
		}
	};
	
	this.startRemoteDebugging = function (deviceID) {
		import lib.PubSub;

		import net;
		import net.interfaces;
		import net.protocols.Cuppa;

		//send a request to the NativeInspectorServer to use the correct remote connection
		util.ajax.post({
			url: '/simulate/remote/enableDevice/',
			data: {id: deviceID},
			headers: {
				"Content-Type": "application/json"
			}
		}, bind(this, function(err, res) {
			var conn = new net.protocols.Cuppa();
	
			conn.onEvent.subscribeOnce('APP_READY', this, function(evt) {
				this.onConnection(conn, evt.args.uid);
			});
	
			conn.onConnect(this, function () {
				conn.sendEvent("HANDSHAKE", {
					"type": "inspector"
				});
	
				conn.sendRequest("GET_ROOT_UID", {}, null, bind(this, function (err, res) {
					this.onConnection(conn, res.uid);
				}));
				this._details.show();
			});
	
			net.connect(conn, 'csp', {url: 'http://localhost:9225'});
	
			this._conn = conn;
		}));
	}
	
	this.startTimer = function() {
		if (!this._timer) {
			this._timer = setInterval(bind(this, 'tick'), 20);
		}
	};
	
	this.stopTimer = function() {
		if (this._timer) {
			clearInterval(this._timer);
			this._timer = null;
		}
	};
	
	this.buildWidget = function(el) { };

	this.onMouseMove = function (evt) {
		if (!this._timer) { return; }

		this._trace.hash = {};
		this._trace.list = evt.trace;
		for (var i = 0, uid; uid = evt.trace[i]; ++i) {
			this._trace.hash[uid] = true;
		}

		var targetUID = evt.trace[i - 1];
		this.highlightView(targetUID);
		this._mouseHoverView = targetUID;

		this.updateTrace();
	};

	this.onMouseSelect = function (evt) {
		if (!this._timer) { return; }

		this._trace.hash = {};
		this._trace.list = evt.trace;
		for (var i = 0, uid; uid = evt.trace[i]; ++i) {
			this._trace.hash[uid] = true;
		}

		var targetUID = evt.trace[i - 1];
		
		this.selectView(targetUID);
		//this.highlightView(targetUID);
		//this._mouseHoverView = targetUID;

		this.updateTrace();
		
	};

	this.onTrace = function (evt) {
		if (!this._timer) { return; }

		this.updateDeepTrace(evt);
	}

	function onOver(e) {
		this._disableHighlight = false;
		var uid = e.target.getAttribute("data-id");
		this.highlightView(+uid);
	}

	function onSelect(e) {
		var uid = e.target.getAttribute("data-id");
		this.selectView(+uid);
		this._deepTrace.style.display = "none";
	}

	var indent = 15; //indentation in pixel

	this.updateDeepTrace = function (evt) {
		var offset = this._simulator.getFrame().getBoundingClientRect();
		this._deepTrace.style.display = "block";
		this._deepTrace.style.left = offset.left + evt.pt.x + 5 + "px";
		this._deepTrace.style.top = offset.top + evt.pt.y + "px";

		//document fragments perform much better for large amount of nodes
		var frag = document.createDocumentFragment();
		for (var i = 0; i < evt.trace.length; ++i) {
			//create the element
			el = document.createElement("div");
			el.innerText = evt.trace[i].tag;

			el.setAttribute("data-id", evt.trace[i].uid);
			if (evt.trace[i].uid === evt.active) {
				el.setAttribute("class", "active");
			}

			el.style.paddingLeft = indent * evt.trace[i].depth + 8 + "px";

			//bind events
			el.onmouseover = bind(this, onOver);
			el.onclick = bind(this, onSelect);

			//add to the fragment
			frag.appendChild(el);
		}

		//cheap way to remove all children
		this._deepTrace.innerHTML = "";
		this._deepTrace.appendChild(frag);
	}

	// since expanding a node is async, we need to call updateTrace
	// every time a new node expands so we can highlight the nodes
	// along the trace.
	this.updateTrace = function () {
		for (var uid in this._highlighted) {
			if (!(uid in this._trace.hash)) {
				delete this._highlighted[uid];
				var node = this._nodeIndex[uid];
				node && node.highlight(false);
			}
		}

		var end = this._trace.list.length - 1;
		for (var i = 0, uid; uid = this._trace.list[i]; ++i) {
			var node = this._nodeIndex[uid];
			if (node) {
				if (!node.isToggled()) {
					node.toggle();
				}

				node.highlight(true, i == end);
				this._highlighted[uid] = true;
			}
		}
	};

	this.onMouseOut = function () {
		if (this._mouseHoverView == this._highlight.target) {
			for (var uid in this._highlighted) {
				var node = this._nodeIndex[uid];
				node && node.highlight(false);
			}
			
			this._highlighted = {};
			this.highlightView();
			//disable any further highlighting until mouse over
			this._disableHighlight = true;
		}
	};

	//on mouse over, let highlighting happen again
	this.onMouseOver = function () {
		this._disableHighlight = false;
	};

	this.highlightView = function (viewUID) {
		var highlight = this._highlight;
		highlight.target = viewUID;

		var detailView = viewUID || this._selectedView;

		//this flag prevents race conditions between mouse out and move
		if (this._disableHighlight) {
			detailView = this._selectedView;
		}

		var conn = this._conn;
		this._highlightUID = viewUID;
		if (conn && conn.isConnected()) {
			conn.sendEvent('SET_HIGHLIGHT', {uid: detailView});
		}

		this._details.showView(detailView);
	};

	this.selectView = function (viewUID) {
		if (this._selectedView) {
			var node = this._nodeIndex[this._selectedView];
			node && node.setSelected(false);
		}

		var node = this._nodeIndex[viewUID];
		if (!node) {
			return console.error("No node found for", viewUID);
		}

		node.setSelected(true);
		currentNode = node;
		this._details.imageView(viewUID, node);

		this._selectedView = viewUID;

		var conn = this._conn;
		if (conn && conn.isConnected()) {
			conn.sendEvent('SET_SELECTED', {uid: viewUID});
		}
	};

	var PERIOD = 8000;
	
	this.tick = function() {
		if (!this._node) { return; }

		var conn = this._conn;

		this._node.refresh();

		var highlight = this._highlight;
		if (!highlight.target) { return; }
		
		var t = +new Date();
		var dt = t - this._t;
		this._t = t;
		
		highlight.timer += dt;
		if (highlight.timer > PERIOD) {
			highlight.timer -= PERIOD;
		}
	};

	this.toggle = function () {
		this._isShowing = !this._isShowing;
		if (this._isShowing) {
			this.open();
		} else {
			this.close();
		}
	};

	this.isOpen = function () { return this._isShowing; };

	this.onShow = function() {
		supr(this, 'onShow', arguments);

		var style = this.getElement().style;
		style.left = '0px';
		style.opacity = 1;

		this._connectMouseEvents();

		this.startTimer();
	};

	this.open = function () {
		this._isShowing = true;
		this.show();
		this._simulator.onViewportChange();
	};

	this.close = function() {
		this._isShowing = false;
		this.stopTimer();

		// cancel the view position polling if it's active
		this._disconnectMouseEvents();

		var style = this._el.style;
		style.left = -this._el.offsetWidth + 'px';
		style.opacity = 0;

		this._selectedView = null;
		this._highlightUID = null;
		this._conn.sendEvent('SET_SELECTED', {uid: null});
		this._conn.sendEvent('SET_HIGHLIGHT', {uid: null});

		this.stopTimer();
		this._simulator.onViewportChange();
	};

	this._connectMouseEvents = function () {
		if (this._conn && this._conn.isConnected()) {
			this._conn.sendRequest('ADD_MOUSE_EVT');
		}
	};

	this._disconnectMouseEvents = function () {
		if (this._conn && this._conn.isConnected()) {
			this._conn.sendEvent('POLL_VIEW_POSITION', {uid: null});
			this._conn.sendRequest('REMOVE_MOUSE_EVT');
		}
	};

	this._addNode = function(id, node) { this._nodeIndex[id] = node; };
	this._removeNode = function(id) { delete this._nodeIndex[id]; };
});

var ViewNode = Class(Widget, function(supr) {

	this._def = {
		className: 'viewNode',
		children: [
			{id: '_label', className: 'label', children: [
				{id: '_toggleBtn', className: 'toggleBtn'},
				{id: '_labelText', tag: 'span', type: 'label'}
			]},
			{id: '_childNodes', className: 'children'}
		]
	};

	this.init = function (opts) {
		this._inspector = opts.inspector;
		
		this._viewUID = opts.viewUID;
		this._indent = opts.indent || 0;
		this._subs = [];
		this._nodes = [];
		this._getChildren = opts.getChildren === undefined ? true : !!opts.getChildren;

		supr(this, 'init', arguments);
	};

	this.getViewUID = function() { return this._viewUID; };
	
	this.buildWidget = function(el) {
		var uid = this._viewUID;
		
		$.style(this._label, {paddingLeft: 10 + this._indent * 15 + 'px'});

		this._isToggled = false;

		this.refresh();
		
		this._subs.push(
			$.onEvent(this._label, 'click', this, 'toggle'),
			$.onEvent(this._label, 'click', this, 'select'),
			$.onEvent(this._label, 'mouseover', this._inspector, 'highlightView', uid),
			$.onEvent(this._label, 'mouseout', this._inspector, 'highlightView', null)
		);
		
		this._inspector._addNode(this._viewUID, this);
	};

	this.select = function () {
		this._inspector.selectView(this._viewUID);
		this._inspector.highlightView(this._viewUID);
	};
	
	this.highlight = function (isHighlighted, atTarget) {
		var state = '' + isHighlighted + atTarget;
		if (this._state == state) { return; }
		this._state = state;
		
		if (isHighlighted) {
			if (atTarget === false) {
				$.addClass(this._el, 'highlightParent');
				$.removeClass(this._el, 'highlight');
			} else {
				$.addClass(this._el, 'highlight');
				$.removeClass(this._el, 'highlightParent');
			}
		} else {
			$.removeClass(this._el, 'highlight');
			$.removeClass(this._el, 'highlightParent');
		}
	};
	
	this.show = function() {
		this._inspector.highlightView(this._viewUID);
	};
	
	this.destroy = function() {
		for (var i = 0, unsubscribe; unsubscribe = this._subs[i]; ++i) {
			unsubscribe();
		}
		
		for (var i = 0, node; node = this._nodes[i]; ++i) {
			node.destroy();
		}
		
		$.remove(this._el);

		this._inspector._removeNode(this._viewUID);
		this._viewUID = null;
	};

	var SEND_GET_RATE = 500; //how much in milliseconds the GET_VIEW event should be throttled
	this.refresh = function() {
		if (!this._inspector) return;
		var conn = this._inspector.getConn();

		if (!this.sendGetView) {
			this.sendGetView = _.throttle(bind(this, function () {
				if (!conn || !conn.isConnected() || !this._getChildren || !this._viewUID) { return; }

				conn.sendRequest('GET_VIEW', {uid: this._viewUID}, null, bind(this, function (err, res) {
					if (err || !this._inspector) {
						logger.warn(err);
						return;
					}

					var view = this._view = res;

					// update the view style of the node
					if (view.tag != this._tag) {
						this._tag = view.tag;
						$.setText(this._labelText, view.tag);
					}

					this._hasChildren = view.subviewIDs && (view.subviewIDs.length > 0);
					this.updateToggleText();

					// if toggled, refresh the children
					if (this._isToggled) {
						// make a copy of the nodes
						var uids = {};
						for (var i = 0, n; n = this._nodes[i]; ++i) {
							uids[n.getViewUID()] = n;
						}

						// refresh the list of nodes, reusing existing nodes
						this._nodes = [];
						for (var i = 0, uid; uid = view.subviewIDs[i]; ++i) {
							if (uid in uids) {
								// reuse and reorder
								this._nodes[i] = uids[uid];
								delete uids[uid];
								this._nodes[i].refresh();
								if (i > 0 && this._nodes[i]._el.previousSibling != this._nodes[i - 1]._el) {
									this._childNodes.insertBefore(this._nodes[i]._el, this._nodes[i - 1]._el.nextSibling);
								}
							} else {
								// or create a new one
								this._nodes[i] = new ViewNode({
									inspector: this._inspector,
									viewUID: uid,
									parent: this._childNodes,
									indent: this._indent + 1
								});							
							}
						}

						// destroy any nodes that weren't reused
						for (var uid in uids) {
							uids[uid].destroy();
						}

						// trace is displayed asynchronously
						this._inspector.updateTrace();
					}
				}));
			}), SEND_GET_RATE); //change this if it's too slow
		}

		this.sendGetView();
	};

	this.setSelected = function (isSelected) {
		if (isSelected) {
			$.addClass(this._el, 'selected');
		} else {
			$.removeClass(this._el, 'selected');
		}
	};
	
	this.updateToggleText = function () {
		var text = !this._hasChildren ? '\u25CF'
				: this._isToggled ? '\u25BC'
				: '\u25B6';

		if (text != this._toggleText) {
			$.setText(this._toggleBtn, text);
			this._toggleText = text;
		}
	};

	this.isToggled = function() { return this._isToggled; };

	this.toggle = function() {
		this._isToggled = !this._isToggled;
		this.updateToggleText();
		$.style(this._childNodes, {display: this._isToggled ? 'block' : 'none'});
	};
});

