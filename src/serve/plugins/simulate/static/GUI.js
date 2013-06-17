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

from util.browser import $;
import std.uri as URI;
import lib.PubSub;
import util.Animation;
import util.ajax;
import squill.Window;
import squill.Widget;
import squill.Delegate;

import .util.resolutions as Resolutions;
import .util.Inspector as Inspector;
import .util.Simulator as Simulator;
import .util.PortManager as PortManager;

/**
 * Visual simulator GUI.
 */

var GUI = exports = Class(squill.Widget, function(supr) {

	this._def = {
		children: [
			{id: '_content'},
			{id: '_bottomPanel'}
		]
	};

	this.init = function(opts) {
		supr(this, 'init', arguments);

		this._portManager = new PortManager({ range: ''+window.location.port + '-' + (window.location.port + 20) + ' exclusive' });

		this._manifest = opts.manifest;
		this._appID = opts.manifest.appID;
		this._shortName = opts.manifest.shortName;

		this._leftWidth = 0;

		new squill.Window().subscribe('ViewportChange', this, 'onViewportChange');
		this.onViewportChange(null, $(window));

		this._container = $({
			parent: this._content,
			style: {
				position: 'absolute',
				top: '0px',
				left: '-110%',
				width: '100%',
				height: '100%',
				border: '0px'
			}
		});

		// UI inspector. This must be created before adding simulators.
		var inspector = this._inspector = new Inspector({
		 	id: 'inspector',
		 	parent: this._container,
		 	appID: this._shortName || this._appID
		});
		GLOBAL.top.inspector = inspector;

		// add simulators
		this.addSimulators(opts.simulators);

		this.setActiveSimulator(0); //use the first one as default
		simulator = this.getActiveSimulator();

		this._container.topBar = new TopBar({parent: this._container, gui: this});

		this.showFrame(this._container);
	};

	this.onViewportChange = function (e, dim) { };

	this.getAvailableRect = function () {

		var rect = {
			x: 0,
			y: 0,
			width: this._content.offsetWidth,
			height: document.body.offsetHeight
		};

		if (this._topBar) {
			rect.y += this._topBar.offsetHeight;
			rect.height -= this._topBar.offsetHeight;
		}

		if (this._inspector && this._inspector.isOpen()) {
			var offset = Math.max(0, this._inspector.getElement().offsetWidth);
			rect.x += offset;
			rect.width -= offset;
		}

		return rect;
	};

	this.getContainer = function () {
		return this._container || this._el;
	};

	this.addSimulators = function (optsArr) {
		// opts is an array of options for simulators.
		// this.createSimulators([{device: string, name: string}, {device: string, name: string}]);
		if (!this._simulators) this._simulators = [];

		var i;
		for (i = 0; i < optsArr.length; i++) {
			optsArr[i]['index'] = i;
			this._simulators.push(new Simulator({
				parent: this,
				appName: this._manifest.shortName || this._manifest.appID,
				port: this._portManager.useEmptyPort(),
				rotation: parseInt(optsArr[i].rotation, 10),
				deviceName: optsArr[i].device,
				offsetX: optsArr[i].offsetX,
				offsetY: optsArr[i].offsetY,
				name: optsArr[i].name
			}));
			this.setActiveSimulator(i); //we do this to set up some things like the inspector connection
		}

		this.setActiveSimulator(0);
	};

	this.removeSimulator = function (simulatorIndex) {
		this._portManager.clearPort(this._simulators[simulatorIndex]);

		$.remove(this._simulators.splice(simulatorIndex, 1)[0].remove());
		
		this._container.topBar.populateSimulatorList();
		this.updateURI();
	};

	this.getActiveSimulator = function () {
		if (!this._simulator) this._simulator = this._simulators[0];
		return this._simulator;
	};

	this.getAllSimulators = function () {
		return this._simulators;
	};

	this.simulatorNameToIndex = function (name) {
		for (var i = 0; i < this._simulators.length; i++) {
			if (name === this._simulators[i]._name) {
				return i;
			}
		}
	};

	this.setActiveSimulator = function (activeSimulatorIndex) {
		if (activeSimulatorIndex === undefined) return; 
		if (this._simulator) this._simulator.publish('BECOME_INACTIVE');
		this._simulator = this._simulators[activeSimulatorIndex];
		this._simulator.publish('BECOME_ACTIVE');

		if (this._inspector) this._inspector.startLocalDebugging(this._simulator);

		GLOBAL.top.simulator = this._simulators[activeSimulatorIndex];
	};

	this.showFrame = function (frame) {
		if (this._currentFrame) {
			$.style(this._currentFrame, {left: '-110%'});
			if (this._currentFrame.tab) {
				$.removeClass(this._currentFrame.tab, 'selected');
			}
		}

		this._currentFrame = frame;
		$.style(this._currentFrame, {left: '0px'});
		if (this._currentFrame.tab) {
			$.addClass(this._currentFrame.tab, 'selected');
		}
	};

	this.createClients = function (clients, inviteURL) {
		if (inviteURL) {
			var inviteCode = new URI(inviteURL).query('i');
		}

		var numClients = clients.length;
		for (var i = 0; i < numClients; ++i) {
			var params = merge({inviteCode: inviteCode}, clients[i]);
			this.addSimulators([{
				def: params, //TODO this is broken
				name: numClients == 1 ? null : clients[i].displayName
			}]);
		}
	};

	this.updateURI = function () {
		var simulators = [];

		for (var i in this._simulators) {
			simulators.push({
				name: this._simulators[i]._name,
				device: this._simulators[i]._deviceName,
				rotation: this._simulators[i]._rotation
			});
		}

		//TODO: this simulators= thing is a little off, probably need to use the js.io URI class.
		window.location.hash = "simulators="+JSON.stringify(simulators);
	};
});

/**
 * Launch simulator.
 */
exports.start = function () {
	import ff;
	import util.ajax;
	import squill.cssLoad;

	var appID = window.location.toString().match(/\/simulate\/(.*?)\//)[1];

	var f = new ff(function () {
		squill.cssLoad.get('/simulator.css', f.wait());
		util.ajax.get({url: '/projects/' + appID + '/files/manifest.json', type: 'json'}, f.slot());
	}, function (manifest) {
		document.title = manifest.title;

		var uri = new URI(window.location);
		var simulators = JSON.parse(uri.hash('simulators') || '[]');
		if (!simulators.length) {
			simulators[0] = {
				device: 'iphone'
			};
		}

		for (var i in simulators) {
			if (!simulators[i].name) {
				simulators[i].name = "Simulator_" + i;
			}
		}

		var gui = GLOBAL.GUI = new GUI({
			parent: document.body,
			manifest: manifest,
			simulators: simulators
		});
	}).error(function (err) {
		alert(err);
	});
};

var TopBar = Class(squill.Widget, function(supr) {
	this._def = {
		className: 'topBar',
		children: [
			{id: '_btnSimulatorList', type: 'button', className: 'button', text: 'Choose Simulator'},
			{id: '_simulatorList', className: 'list', children: [
				{className: 'device', id: '_btnAddSimulator', text: 'Add Simulator...'}
			]},
			{id: '_btnDeviceList', type: 'button', className: 'button', text: 'Choose Device'},
			{id: '_deviceList', className: 'list', children: []},
			{id: '_btnReload', type: 'button', className: 'button', text: 'Reload'},
			{id: '_btnInspect', type: 'button', className: 'button', text: 'UI Inspector'},
			{id: '_btnRotate', type: 'button', className: 'button', text: 'Rotate'},
			{id: '_btnScreenShot', type: 'button', className: 'button', text: 'Screenshot'},
			{id: '_btnNativeBack', type: 'button', className: 'button', text: 'Hardware Back'},
			{id: '_btnNativeHome', type: 'button', className: 'button', text: 'Home Screen'},
			{id: '_btnMute', type: 'button', className: 'button', text: 'Mute'},
			{id: '_btnDrag', type: 'button', className: 'button', text: 'Enable Drag'},
			{id: '_btnPause', type: 'button', className: 'button', text: 'Pause'},
			{id: '_btnStep', type: 'button', className: 'button', text: 'Step'}
		]
	}

	var gui;
	this.init = function (opts) {
		gui = opts.gui;
		supr(this, 'init', arguments);

		this.populateSimulatorList();
		this.populateDeviceList();

		this._btnMute._el.textContent = (gui.getActiveSimulator().isMuted() ? 'Unmute':'Mute');
	}

	var deviceList = []; //NOT this._deviceList
	this.populateDeviceList = function () {
		//this doesn't actually need to be public, just done for completeness
		var i;
		for (i in deviceList) {
			deviceList[i].remove();
		}
		deviceList = [];
		i = null;

		for (i in Resolutions.defaults) {
			deviceList.push(new squill.Widget({
				parent: this._deviceList,
				id: i,
				text: Resolutions.defaults[i].name,
				className: 'device'
			}));
		}

		for(i = 0; i < deviceList.length; ++i) {
			deviceList[i].onclick(bind(this, function (evt) {
				gui.getActiveSimulator().setType(evt.srcElement.id);
				$.hide(this._deviceList);
				this._deviceList.shown = false;
				gui.updateURI();
			}));
		}
	}

	var simulatorList = [];
	this.populateSimulatorList = function () {
		//clear old list first
		var i;
		for (i in simulatorList) {
			simulatorList[i].remove();
		}
		simulatorList = [];
		i = null;

		var sims = gui.getAllSimulators();
		for (i in sims) {
			simulatorList.push(new squill.Widget({
				parent: this._simulatorList,
				id: sims[i]._name,
				text: sims[i]._name,
				className: 'device',
				before: this._btnAddSimulator,
				children: [{
						id: '_close_',
						type: 'button',
						attrs: {
							simName: sims[i]._name
						},
						className: 'closeButton',
						text: 'close'
					}
				]
			}));
		}

		for (i in simulatorList) {
			simulatorList[i]._close_.onclick(function (evt) {
				gui.removeSimulator(gui.simulatorNameToIndex(this.attributes.getNamedItem('simName').textContent)); //wha
			});
		}

		util.ajax.get({url: '/simulate/remote/attachedDevices', type: 'json'}, bind(this, function (err, devices) {
			var i;
			var devList;
			for (i in devices) {
				simulatorList.push(new squill.Widget({
					parent: this._simulatorList,
					id: i,
					text: devices[i],
					className: 'device',
					before: this._btnAddSimulator
				}));
				simulatorList[simulatorList.length-1].onclick(bind(this, function (evt) {
					gui._inspector.startRemoteDebugging(evt.srcElement.id);
					$.hide(this._simulatorList);
					this._simulatorList.shown = false;
				}));
			}
		}));

		for (i = 0; i < simulatorList.length; ++i) {
			simulatorList[i].onclick(bind(this, function (evt) {
				gui.setActiveSimulator(gui.simulatorNameToIndex(evt.srcElement.id));
				$.hide(this._simulatorList);
				this._simulatorList.shown = false;
			}));
		}

		this._btnAddSimulator.onclick = bind(this, function () {
			gui.addSimulators([{
				device: 'iphone',
				name: "Simulator_" + gui._simulators.length
			}]);
			gui.setActiveSimulator(gui._simulators.length - 1);
			this.populateSimulatorList(); //refresh the list
			$.hide(this._simulatorList);
			this._simulatorList.shown = false;
			gui.updateURI();
		});
	}

	var sendToActiveSimulator = function (name, args) {
		gui.getActiveSimulator().publish(name, args || {});
	}

	var sendToAllSimulators = function (name, args) {
		var i, sims = gui.getAllSimulators();
		for (i in sims) {
			sims[i].publish(name, args || {});
		};
	}

	this.delegate = new squill.Delegate(function(on) {
		on._btnSimulatorList = function () {
			this.populateSimulatorList();
			this._simulatorListShown ? $.hide(this._simulatorList) : $.show(this._simulatorList);
			this._simulatorListShown ^= true;
		};

		on._btnDeviceList = function () {
			this.populateDeviceList();
			this._deviceList.shown ? $.hide(this._deviceList) : $.show(this._deviceList);
			this._deviceList.shown ^= true;
		};

		on._btnReload = function() {
			sendToActiveSimulator('RELOAD');
		};

		on._btnInspect = function () {
			gui._inspector.toggle()
		};

		on._btnRotate = function () {
			sendToActiveSimulator('ROTATE');
			gui.updateURI();
		};

		on._btnScreenShot = function () {
			sendToActiveSimulator('SCREENSHOT');
		};

		on._btnNativeBack = function () {
			sendToActiveSimulator('BACK_BUTTON');
		};

		on._btnNativeHome = function () {
			sendToActiveSimulator('HOME_BUTTON');
			this._btnNativeHome._el.textContent = (this._btnNativeHome._el.textContent === 'Home Screen'? 'Resume':'Home Screen')
		};

		on._btnMute = function () {
			sendToActiveSimulator('MUTE', this._btnMute._el.textContent === 'Mute');
			this._btnMute._el.textContent = (this._btnMute._el.textContent === 'Mute'? 'Unmute':'Mute');
		};

		on._btnDrag = function () {
			sendToAllSimulators('DRAG', this._btnDrag._el.textContent === 'Enable Drag');
			this._btnDrag._el.textContent = (this._btnDrag._el.textContent === 'Enable Drag'? 'Disable Drag':'Enable Drag');
		};

		on._btnPause = function () {
			sendToActiveSimulator('PAUSE', this._btnPause._el.textContent === 'Pause');
			this._btnPause._el.textContent = (this._btnPause._el.textContent === 'Pause'? 'Unpause':'Pause');
		};

		on._btnStep = function () {
			sendToActiveSimulator('STEP');
			this._btnPause._el.textContent = 'Unpause';
		};
	});
});
