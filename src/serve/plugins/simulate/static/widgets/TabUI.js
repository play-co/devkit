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

"use import";

from util.browser import $;
from ..util.urlCache import reloadURL;

exports = Class(function() {
	var ID = 0;
	
	this.init = function(server) {
		this._clients = {};
		this._numTabs = 0;
		this._frames = [];
		this._selectedTab = null;
		this._id = Math.random() * 1000 | 0;
		this._uid = 0;
		
		$.insertCSSFile('/sdk/runtimeBrowser/sdk.css');
		
		$.style(document.documentElement, {
			overflow: 'hidden',
			margin: '0px',
			padding: '0px',
			width: '100%',
			height: '100%'
		});
		
		$.style(document.body, {
			margin: '0px',
			padding: '0px',
			width: '100%',
			height: '100%'
		});
		
		$.onEvent(window, 'resize', this, 'onResize');
		
		this._leftCol = $({id: 'leftCol', parent: document.body});
		this._rightCol = $({id: 'rightCol', parent: document.body});
		
		this._el = $({id: 'mainPage', parent: this._rightCol});
		this._currentFrame = this._el;
		
		var el = this.createTab('Portal');
		$.onEvent(el, 'click', this, 'showFrame', this._el, el);
		
		this.onResize();
	};
	
	this.getElement = function() { return this._el; };
	
	this.findFrame = function() { return findFrame(); };
	
	this.onResize = function() {
		this._rightCol.style.width = $(window).width - 150 + 'px';
	};
	
	this.createTab = function(text, indent, onClick) {
		var el = $({
			className: 'sdkTab'
		});
		
		$.style(el, { marginLeft: (indent || 0) * 10 + 'px' });
		
		el.text = $({
			text: text,
			parent: el
		});
		
		el._buttons = [];
		el.createButton = bind(this, 'createTabButton', el);
		el.remove = bind(this, 'removeTab', el);
		el.addRightEl = bind(this, 'appendTabRightEl', el);
		
		if (onClick) {
			$.onEvent(el, 'click', onClick);
		}
		
		var status = $({
			className: 'status',
			before: el.text
		});
		
		el.status = function(text) { $.setText(status, text); };
		
		if (this._lastTab) {
			this._leftCol.insertBefore(el, this._lastTab);
		} else {
			this._leftCol.appendChild(el);
		}
		
		return el;
	};
	
	this.createCloseableTab = function(text, indent) {
		var el = this.createTab(text, indent);
		el.close = el.createButton('X');
		return el;
	};
	
	this.onNewTabClick = function() { this.newTab(); };
	
	this.removeTab = function(el) {
		for (var i = 0, len = el._buttons.length; i < len; ++i) {
			$.remove(el._buttons[i]);
		}
		
		$.remove(el._frame);
		$.remove(el);
	};
	
	this.newTab = function(url, text, indent, noActivate) {
		++this._numTabs;
		var text = text || this._numTabs;
		var el = this.createTab(text, indent);
		if (!noActivate) {el.status('...');}
		
		var frame = $({
			tag: 'iframe',
			attrs: {
				border: 0,
				name: 'tab' + this._numTabs
			},
			style: {
				position: 'absolute',
				left: '200%',
				width: '100%',
				height: '100%',
				borderWidth: '0px'
			}
		});
		
		frame.src = url;
		this._rightCol.appendChild(frame);
		
		if (!noActivate) {
			frame.onload = bind(this, 'onFrameLoad', frame, el);
		}
		this._frames.push(frame);
		
		el._frame = frame;
		$.onEvent(el, 'click', this, 'showFrame', frame, el);
		
		el.reload = el.createButton('R', function() {
			el.status('loading...');
			frame.contentWindow.location = reloadURL(frame.contentWindow.location);
		});
		
		this.onResize();
		return el;
	};

	this.newDiv = function(numFrames, url, text, indent) {
		++this._numTabs;
		var text = text || this._numTabs;
		var el = this.createCloseableTab(text, indent);
		
		var frame = $({
			attrs: {
				name: 'tab' + this._numTabs
			},
			style: {
				position: 'absolute',
				left: '200%',
				width: '100%',
				height: '100%',
				borderWidth: '0px'
			}
		});

		this._frames.push(frame);
		
		el._frame = frame;
		$.onEvent(el, 'click', this, 'showFrame', frame, el);
		
		this.onFrameLoad(frame, el);
		
		this._rightCol.appendChild(frame);
		this.onResize();
		return el;
	};
	
	this.appendTabRightEl = function(tab, el) {
		el.style.float = 'right';
		$.insertBefore(this._leftCol, el, tab);
		return el;
	};
	
	this.createTabButton = function(tab, text, onClick) {
		var btn = $({
			text: text,
			className: 'sdkButton',
			before: tab
		});
		
		if (onClick) {
			$.onEvent(btn, 'click', onClick);
		}
		
		tab._buttons.push(btn);
		return btn;
	};
	
	this.onFrameLoad = function(frame, el, text) {
		this.showFrame(frame, el);
		el.status('');
	};
	
	this.showFrame = function(frame, tab) {
		if (this._currentFrame) { $.style(this._currentFrame, {left: '200%'}); }
		this._currentFrame = frame;
		
		if (tab && tab != this._selectedTab) {
			if (this._selectedTab) {
				$.removeClass(this._selectedTab, 'selected');
			}
			this._selectedTab = tab;
			$.addClass(this._selectedTab, 'selected');
		}
		
		$.style(frame, {left: '0%'});
		frame.focus();
	};
});
