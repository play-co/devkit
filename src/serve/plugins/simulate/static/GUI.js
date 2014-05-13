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
import.util.resolutions as Resolutions;
import.util.Inspector as Inspector;
import.util.Simulator as Simulator;
import.util.PortManager as PortManager;
import net;
import net.interfaces;
import net.protocols.Cuppa;
var POSTMESSAGE_PORT = '__debug_timestep_inspector__';
var TopBar = Class(squill.Widget, function (supr) {
    this._def = {
        className: 'topBar',
        children: [{
            id: '_buttonContainer',
            children: [{
                id: '_btnSimulatorList',
                type: 'button',
                className: 'button',
                children: [{
                    tag: 'i',
                    className: 'icon-white icon-plus'
                }]
            }, {
                id: '_simulatorList',
                className: 'list',
                children: [{
                    className: 'device',
                    id: '_btnAddSimulator',
                    text: 'Add Simulator...'
                }]
            }, {
                id: '_btnDeviceList',
                attrs: {
                    tooltip: 'change the device type'
                },
                type: 'button',
                className: 'button',
                text: 'Choose Device'
            }, {
                id: '_btnReload',
                attrs: {
                    tooltip: 'reload the game'
                },
                type: 'button',
                className: 'button',
                text: 'Reload'
            }, {
                id: '_btnDebug',
                attrs: {
                    tooltip: 'switch to release build'
                },
                type: 'button',
                className: 'button',
                text: 'Debug'
            }, {
                id: '_btnInspect',
                attrs: {
                    tooltip: 'inspect the view hierarchy'
                },
                type: 'button',
                className: 'button',
                children: [{
                    tag: 'i',
                    className: 'icon-white icon-search'
                }]
            }, {
                id: '_btnDrag',
                attrs: {
                    tooltip: 'lock simulator position'
                },
                type: 'button',
                className: 'button',
                className: 'button',
                children: [{
                    tag: 'i',
                    className: 'icon-white icon-move'
                }]
            }, {
                id: '_btnRotate',
                attrs: {
                    tooltip: 'rotate the device'
                },
                type: 'button',
                className: 'button',
                children: [{
                    tag: 'i',
                    className: 'icon-white icon-repeat'
                }]
            }, {
                id: '_btnNativeBack',
                attrs: {
                    tooltip: 'back button (hardware)'
                },
                type: 'button',
                className: 'button',
                children: [{
                    tag: 'i',
                    className: 'icon-white icon-chevron-left'
                }]
            }, {
                id: '_btnNativeHome',
                attrs: {
                    tooltip: 'home button (hardware)'
                },
                type: 'button',
                className: 'button',
                children: [{
                    tag: 'i',
                    className: 'icon-white icon-home'
                }]
            }, {
                id: '_btnScreenShot',
                attrs: {
                    tooltip: 'take a screenshot'
                },
                type: 'button',
                className: 'button',
                children: [{
                    tag: 'i',
                    className: 'icon-white icon-picture'
                }]
            }, {
                id: '_btnMute',
                attrs: {
                    tooltip: 'mute all sounds'
                },
                type: 'button',
                className: 'button',
                children: [{
                    tag: 'i',
                    className: 'icon-white icon-music'
                }]
            }, {
                id: '_btnPause',
                attrs: {
                    tooltip: 'pause game timer'
                },
                type: 'button',
                className: 'button',
                children: [{
                    tag: 'i',
                    className: 'icon-white icon-pause'
                }]
            }, {
                id: '_btnStep',
                attrs: {
                    tooltip: 'step forward 1 frame'
                },
                type: 'button',
                className: 'button',
                children: [{
                    tag: 'i',
                    className: 'icon-white icon-step-forward'
                }]
            }, {
                id: '_myIP',
                type: 'label'
            }]
        }, {
            id: '_deviceList',
            className: 'list',
            children: []
        }]
    }
    this._isDebugMode = true;
    this._isPaused = false;
    this._isDragEnabled = true;
    this.getContainer = function () {
        return this._buttonContainer;
    }
    var DeviceCell = Class(squill.Widget, function () {
        var FIT_TO = 50;
        this._def = {
            className: 'device',
            children: [{
                id: 'previewBg',
                children: [{
                    id: 'preview'
                }]
            }, {
                id: 'label',
                type: 'label'
            }, {
                id: 'resolution',
                type: 'label'
            }]
        };

        function getScale(w, h) {
            var ratio = w / h;
            return FIT_TO / (ratio > 1 ? w : h)
        }
        this.buildWidget = function () {
            var def = this._opts.def;
            var w = def.width || 1;
            var h = def.height || 1;
            this.label.setText(def.name);
            if (def.width && def.height) {
                this.resolution.setText(w + 'x' + h);
            }
            this.initMouseEvents();
            var setBg = false;
            var scale = getScale(w, h);
            if (def.background) {
                var bg = def.background;
                if (isArray(bg)) {
                    bg = bg[0];
                }
                if (bg.width && bg.height) {
                    setBg = true;
                    var bgScale = getScale(bg.width, bg.height);
                    if (bgScale < scale) {
                        scale = bgScale;
                    }
                }
            }
            this.preview.style.width = w * scale + 'px';
            this.preview.style.height = h * scale + 'px';
            this.preview.style.backgroundImage = 'url(' + this._opts.previewImage +
                ')';
            if (setBg) {
                this.previewBg.style.cssText =
                    'background-image: url(images/' + bg.img + ');' +
                    'width:' + bg.width * scale + 'px;' + 'min-height:' +
                    bg.height * scale + 'px;' + 'padding:' + bg.offsetY *
                    scale + 'px 0 0 ' + bg.offsetX * scale + 'px;'
            }
        }
    });
    var deviceList = []; //NOT this._deviceList
    this.populateDeviceList = function () {
        for (var i in deviceList) {
            deviceList[i].remove();
        }
        deviceList = [];
        var previewImage = _controller.getActiveSimulator().getLoadingImageURL();
        for (var type in Resolutions.defaults) {
            var cell = new DeviceCell({
                parent: this._deviceList,
                type: type,
                def: Resolutions.defaults[type],
                previewImage: previewImage
            }).on('Select', bind(this, function (type) {
                _controller.getActiveSimulator().setType(type);
                $.removeClass(this._deviceList, 'active');
                _controller.updateURI();
            }, type));
            deviceList.push(cell);
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
        var sims = _controller.getAllSimulators();
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
                }]
            }));
        }
        for (i in simulatorList) {
            simulatorList[i]._close_.onclick(function (evt) {
                _controller.removeSimulator(_controller.simulatorNameToIndex(
                    this.attributes.getNamedItem('simName').textContent
                )); //wha
            });
        }
        util.ajax.get({
            url: '/simulate/remote/attachedDevices',
            type: 'json'
        }, bind(this, function (err, devices) {
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
                simulatorList[simulatorList.length - 1].onclick(
                    bind(this, function (evt) {
                        _controller._inspector.startRemoteDebugging(
                            evt.srcElement.id);
                        $.hide(this._simulatorList);
                        this._simulatorList.shown = false;
                    }));
            }
        }));
        for (i = 0; i < simulatorList.length; ++i) {
            simulatorList[i].onclick(bind(this, function (evt) {
                _controller.setActiveSimulator(_controller.simulatorNameToIndex(
                    evt.srcElement.id));
                $.hide(this._simulatorList);
                this._simulatorList.shown = false;
            }));
        }
        this._btnAddSimulator.onclick = bind(this, function () {
            _controller.addSimulator({
                device: 'iphone',
                name: 'Simulator_' + _controller._simulators.length
            });
            _controller.setActiveSimulator(_controller._simulators.length -
                1);
            this.populateSimulatorList(); //refresh the list
            $.hide(this._simulatorList);
            this._simulatorList.shown = false;
            _controller.updateURI();
        });
    }
    this.buildWidget = function () {
        util.ajax.get({
            url: '/api/ip',
            type: 'json'
        }, bind(this, '_onIP'));
    }
    this._onIP = function (err, response) {
        if (!err) {
            this._myIP.setLabel(response.ip.join(", "));
        }
    };
    var sendToActiveSimulator = function (name, args) {
        _controller.getActiveSimulator().sendEvent(name, args || {});
    }
    var sendToAllSimulators = function (name, args) {
        var i; var sims = _controller.getAllSimulators();
        for (i in sims) {
            sims[i].sendEvent(name, args || {});
        };
    }
    this.reloadActiveSimulator = function () {
        sendToActiveSimulator('RELOAD');
    }
    this.delegate = new squill.Delegate(function (on) {
        on._btnSimulatorList = function () {
            this.populateSimulatorList();
            this._simulatorListShown ? $.hide(this._simulatorList) : $.show(
                this._simulatorList);
            this._simulatorListShown ^= true;
        };
        on._btnDeviceList = function () {
            this.populateDeviceList();
            if (/active/.test(this._deviceList.className)) {
                $.removeClass(this._deviceList, 'active');
            } else {
                $.addClass(this._deviceList, 'active');
            }
        };
        on._btnReload = function () {
            sendToActiveSimulator('RELOAD');
        };
        on._btnInspect = function () {
            _controller._inspector.toggle()
        };
        on._btnRotate = function () {
            sendToActiveSimulator('ROTATE');
            _controller.updateURI();
        };
        on._btnScreenShot = function () {
            sendToActiveSimulator('SCREENSHOT');
        };
        on._btnNativeBack = function () {
            sendToActiveSimulator('BACK_BUTTON');
        };
        on._btnNativeHome = function () {
            sendToActiveSimulator('HOME_BUTTON');
            this._isAtHomeScreen = !this._isAtHomeScreen;
            var el = this._btnMute.getElement();
            var el = this._btnNativeHome._el;
            el.setAttribute('tooltip', this._isAtHomeScreen ?
                'return to game' : 'home (hardware button)');
        };
        on._btnMute = function () {
            var sim = _controller.getActiveSimulator();
            var isMuted = !sim.isMuted();
            sim.setMuted(isMuted);
            var el = this._btnMute.getElement();
            el.setAttribute('tooltip', isMuted ? 'unmute all sounds' :
                'mute all sounds');
            if (isMuted) {
                $.addClass(el, 'disabled');
            } else {
                $.removeClass(el, 'disabled');
            }
        };
        on._btnDrag = function () {
            this._isDragEnabled = !this._isDragEnabled;
            sendToAllSimulators('DRAG', this._isDragEnabled);
            var el = this._btnDrag.getElement();
            el.setAttribute('tooltip', this._isDragEnabled ?
                'lock simulator position' : 'unlock simulator position'
            );
            if (!this._isDragEnabled) {
                $.addClass(el, 'disabled');
            } else {
                $.removeClass(el, 'disabled');
            }
        };
        on._btnPause = function () {
            this._isPaused = !this._isPaused;
            sendToActiveSimulator('PAUSE', this._isPaused);
            this._updatePaused();
        };
        on._btnStep = function () {
            if (!this._isPaused) {
                this._isPaused = true;
                this._updatePaused();
            }
            sendToActiveSimulator('STEP');
        };
        on._btnDebug = function () {
            sendToActiveSimulator('DEBUG');
            this._isDebugMode = !this._isDebugMode;
            var el = this._btnDebug._el;
            el.setAttribute('tooltip', this._isDebugMode ?
                'switch to release build' : 'switch to debug build');
        }
    });
    this._updatePaused = function () {
        var icon = this._btnPause._el.childNodes[0];
        if (!this._isPaused) {
            $.addClass(icon, 'icon-pause');
            $.removeClass(icon, 'icon-play');
        } else {
            $.addClass(icon, 'icon-play');
            $.removeClass(icon, 'icon-pause');
        }
        var el = this._btnPause._el;
        el.setAttribute('tooltip', this._isPaused ? 'resume game timer' :
            'pause game timer');
    }
});
/**
 * Visual simulator.
 */
var SimulatorServer = Class([net.interfaces.Server, lib.PubSub], function () {
    this.listen = function () {
        net.listen(this, 'postmessage', {
            port: POSTMESSAGE_PORT
        });
    }
    this.buildProtocol = function () {
        var conn = new net.protocols.Cuppa();
        conn.onEvent.once('HANDSHAKE', bind(this, 'emit', 'HANDSHAKE', conn));
        return conn;
    }
});
var MainController = exports = Class(squill.Widget, function (supr) {
    this._def = {
        children: [{
            id: '_top',
            type: TopBar
        }, {
            id: '_middle',
            children: [{
                id: '_content'
            }]
        }, {
            id: '_bottom'
        }, {
            id: '_autoHideArea'
        }]
    };
    this.init = function (opts) {
        supr(this, 'init', arguments);
        this._server = new SimulatorServer();
        this._server.listen();
        this._server.on('HANDSHAKE', bind(this, '_onHandshake'));
        var basePort = parseInt(window.location.port || '80');
        this._portManager = new PortManager({
            start: basePort + 1,
            end: basePort + 20
        });
        this._simulators = {};
        this._manifest = opts.manifest;
        this._appId = opts.manifest.appId;
        this._shortName = opts.manifest.shortName;
        new squill.Window().subscribe('ViewportChange', this,
            'onViewportChange');
        this.onViewportChange(null, $(window));
        var inspector = this._inspector = new Inspector({
            id: 'inspector',
            parent: this,
            appId: this._shortName || this._appId
        });
        // add simulators
        this.addSimulator(opts.simulators);
        util.ajax.get({
            url: '/simulate/addons/',
            type: 'json'
        }, bind(this, function (err, res) {
            res.forEach(function (name) {
                jsio.__jsio('import ..addons.' + name +
                    '.index').init(this);
            }, this);
        }));
        $.onEvent(this._autoHideArea, 'mouseover', bind(this,
            '_onAutoHideOver', true));
        $.onEvent(this._autoHideArea, 'mouseout', bind(this,
            '_onAutoHideOver', false));
    };
    this._onHandshake = function (conn, evt) {
        if (evt.args.type == 'simulator') {
            var port = evt.args.port;
            var simulator = this._simulators[port];
            if (simulator) {
                simulator.setConn(conn);
            }
        } else {
            // remote device
        }
    }
    this.reloadActiveSimulator = function () {
        this._top.reloadActiveSimulator();
    }
    this.getContainer = function () {
        return this._content || this._el;
    }
    this.getManifest = function () {
        return this._manifest;
    }
    this.onViewportChange = function (e, dim) {};
    this.getAvailableRect = function () {
        var rect = {
            x: 0,
            y: 0,
            width: this._content.offsetWidth,
            height: document.body.offsetHeight
        };
        if (this._top) {
            var el = this._top.getElement();
            rect.y += el.offsetHeight;
            rect.height -= el.offsetHeight;
        }
        if (this._inspector && this._inspector.isOpen()) {
            var offset = Math.max(0, this._inspector.getElement().offsetWidth);
            rect.x += offset;
            rect.width -= offset;
        }
        return rect;
    };
    this.setAutoHide = function (isAutoHide) {
        this._isAutoHide = isAutoHide;
        var el = this._top.getElement();
        if (isAutoHide) {
            $.addClass(el, 'autoHide');
        } else {
            $.removeClass(el, 'autoHide');
        }
        this.positionSimulators();
    }
    this._onAutoHideOver = function (isOver) {
        var el = this._top.getElement();
        if (isOver) {
            $.addClass(el, 'show');
        } else {
            $.removeClass(el, 'show');
        }
    }
    this.addLeftPane = function (def) {
        var widget = this.addWidget(def, this._middle);
        var el = widget.getElement ? widget.getElement() : widget;
        el.style.order = -100;
        this.positionSimulators();
        return widget;
    }
    this.addRightPane = function (def) {
        var widget = this.addWidget(def, this._middle);
        var el = widget.getElement ? widget.getElement() : widget;
        el.style.order = 100;
        this.positionSimulators();
        return widget;
    }
    this.positionSimulators = function () {
        Object.keys(this._simulators).forEach(function (port) {
            this._simulators[port].onViewportChange();
        }, this);
    }
    // simulatorDef defines the parameters for a new simulator
    // can also pass an array of defs to create multiple simulators
    //
    // this.addSimulators([{device: string, name: string}, {device: string, name: string}]);
    this.addSimulator = function (simulatorDef) {
        if (isArray(simulatorDef)) {
            return simulatorDef.map(this.addSimulator, this);
        }
        var port = this._portManager.useEmptyPort();
        var simulator = new Simulator({
            controller: this,
            parent: this,
            manifest: this._manifest,
            appName: this._manifest.shortName || this._manifest.appId,
            port: port,
            rotation: parseInt(simulatorDef.rotation, 10),
            deviceName: simulatorDef.device,
            offsetX: simulatorDef.offsetX,
            offsetY: simulatorDef.offsetY,
            name: simulatorDef.name
        });
        this._simulators[port] = simulator;
        if (!this._activeSimulator) {
            this.setActiveSimulator(simulator);
        }
        return port;
    };
    this.removeSimulator = function (port) {
        var simulator = this._simulators[port];
        if (simulator) {
            this._portManager.clearPort(port);
            simulator.remove();
            this._top.populateSimulatorList();
            this.updateURI();
        }
    };
    this.getActiveSimulator = function () {
        return this._activeSimulator;
    };
    this.getAllSimulators = function () {
        return this._simulators;
    };
    this.getTopBar = function () {
        return this._top;
    }
    this.setActiveSimulator = function (simulator) {
        if (this._activeSimulator != simulator) {
            if (this._activeSimulator) {
                this._activeSimulator.setActive(false);
            }
            this._activeSimulator = simulator;
            simulator.setActive(true);
            this._inspector.setSimulator(simulator);
        }
    };
    this.createClients = function (clients, inviteURL) {
        if (inviteURL) {
            var inviteCode = new URI(inviteURL).query('i');
        }
        var numClients = clients.length;
        for (var i = 0; i < numClients; ++i) {
            var params = merge({
                inviteCode: inviteCode
            }, clients[i]);
            this.addSimulator([{
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
        window.location.hash = 'simulators=' + JSON.stringify(simulators);
    };
});
var _controller;

function getIcon(manifest) {
    var icon;
    if (manifest) {
        if (manifest.icon) {
            icon = manifest.icon;
        }
        if (!icon && manifest.icons) {
            var min = Infinity;
            Object.keys(manifest.icons).forEach(function (size) {
                size = parseInt(size);
                if (size && size < min) {
                    min = size;
                }
            });
            icon = manifest.icons[min];
        }
    }
    return icon || manifest.android && getIcon(manifest.android) || manifest.ios &&
        getIcon(manifest.ios) || '../../../images/defaultIcon.png';
}
/**
 * Launch simulator.
 */
exports.start = function () {
    import ff;
    import util.ajax;
    import squill.cssLoad;
    var appId = window.location.toString().match(/\/simulate\/(.*?)\//)[1];
    var f = new ff(function () {
        squill.cssLoad.get('/simulator.css', f.wait());
        util.ajax.get({
            url: '/projects/' + appId + '/files/manifest.json',
            type: 'json'
        }, f.slot());
    }, function (manifest) {
        document.title = manifest.title;
        document.querySelector('link[rel=icon]').setAttribute('href',
            '/projects/' + appId + '/files/' + getIcon(manifest));
        var uri = new URI(window.location);
        var simulators = JSON.parse(uri.hash('simulators') || '[]');
        if (!simulators.length) {
            simulators[0] = {
                device: 'iphone'
            };
        }
        for (var i in simulators) {
            if (!simulators[i].name) {
                simulators[i].name = 'Simulator_' + i;
            }
        }
        _controller = new MainController({
            id: 'mainUI',
            parent: document.body,
            manifest: manifest,
            simulators: simulators
        });
    }).error(function (err) {
        alert(err);
    });
};
$.onEvent(document.body, 'dragenter', this, function (evt) {
    evt.preventDefault();
});
$.onEvent(document.body, 'dragover', this, function (evt) {
    evt.preventDefault();
});
$.onEvent(document.body, 'dragleave', this, function (evt) {
    evt.preventDefault();
});
$.onEvent(document.body, 'drop', this, function (evt) {
    evt.preventDefault();
});
