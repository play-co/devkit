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

import squill.Widget as Widget;
import squill.Cell as Cell;
import squill.models.DataSource as DataSource;
import squill.Delegate as Delegate;

import util.ajax;

var encodedChars = {
  '%2F': '/',
  '%7B': '{',
  '%7D': '}',
  '%22': '"',
  '%3A': ':',
  '%20': ' '
};

var unescapeRe = new RegExp(Object.keys(encodedChars).join('|'), 'g');
function friendlyUnescape(url) {
  return url.replace(unescapeRe, function (key) { return encodedChars[key]; });
}

/**
 * Overview widget.
 */

var AppCell = Class(Cell, function() {
  this._def = {
    className: 'appCell',
    children: [
      {id: 'icon', className: 'appIcon'},
      {id: 'name', type: 'label', className: 'appName'},
      {id: 'path', type: 'label', className: 'appPath'}
    ]
  };

  var _imageCache = {};

  this.setIcon = function (icon) {
    if (icon in _imageCache) {
      this._setIcon(icon);
    } else {
      var img = new Image();
      img.onload = bind(this, '_setIcon', icon);
      img.src = icon;

      $.addClass(this.icon, 'noIcon');
    }
  };

  this._setIcon = function (icon) {
    _imageCache[icon] = true;
    $.removeClass(this.icon, 'noIcon');
    this.icon.style.backgroundImage = 'url(' + icon + ')';
  };

  this.render = function () {
    var app = this._data;

    var iconURL = '/api/icon?app=' + app.paths.root;
    this.setIcon(iconURL);

    var label = app.manifest && (app.manifest.title || app.manifest.name) || '<unknown>';
    if (label != this._label) {
      this._label = label;
      this.name.setLabel(label);
    }

    var homeDir = this.controller.getWidgetParent().getHomeDirectory();
    var root = app.paths.root;
    if (new RegExp('^' + homeDir).test(root.replace(/\//g, '\/'))) {
      root = '~' + root.substring(homeDir.length);
    }

    this.path.setLabel(root);
  };
});

var ExampleCell = Class(Cell, function () {
  this._def = {
    className: 'exampleAppCell',
    children: [
      {id: 'name', type: 'label', className: 'appName'},
      {id: 'doc', tag: 'a', className: 'appDoc'},
      {id: 'description', type: 'label', className: 'appDescription'}
    ]
  };

  this.render = function () {
    var app = this._data;
    this.name.setLabel(app.manifest && (app.manifest.title || app.manifest.name) || '<unknown>');
    this.description.setLabel(app.manifest && (app.manifest.description) || '');
    if (app.manifest.doc) {
      this.doc.href = app.manifest.doc;
      this.doc.innerText = "[doc]";
      this.doc.target = "_blank";
    }
  }
});

var ActionCell = Class(Cell, function () {
  this._def = {
    className: 'actionCell',
    children: [
      {id: 'icon'},
      {id: 'title', type: 'label'},
      {id: 'subtitle', type: 'label'}
    ]
  };

  this.render = function () {
    var action = this._data;
    this.title.setLabel(action.title || '');
    this.subtitle.setLabel(action.subtitle || '');
    this.icon.style.backgroundImage = 'url(/icons/' + action.icon + ')';
  }
});

exports = Class(Widget, function(supr) {

  this._def = {
    className: "overviewPanel",
    contentsWrapperClassName: "overviewPanes",
    tabContainerClassName: "overviewTabs",
    children: [
      {id: "leftPane", children: [
        {id: 'actions', type: 'list', cellCtor: ActionCell},
        {id: "logo"},
        {
          id: "ip",
          children: [
            {id: "ipValue", tag: "span", text: ""}
          ]
        }
      ]},
      {id: "separator"},
      {id: "rightPane", children: [
        {id: 'appList', margin: 10, type: 'list',
            selectable: 'single', cellCtor: AppCell, margin: 3}
      ]}
    ]
  };

  this.buildWidget = function() {
    supr(this, "buildWidget", arguments);

    this._apps = new DataSource();

    var actions = new DataSource();
    actions.add([
        {id: 'create', title: 'create new game...', icon: 'icon_new.png'},
        {id: 'open', title: 'open existing game...', icon: 'icon_open.png'},
        {id: 'help', title: 'view documentation', icon: 'icon_help.png'},
      ]);

    if (navigator.isNodeWebkit) {
      this.actions.show();
    } else {
      this.actions.hide();
    }

    this.actions.setDataSource(actions);

    this.appList.setDataSource(this._apps);
    window.addEventListener('resize', bind(this.appList, 'needsRender'), false);

    this._homeDirectory = this._opts.homeDirectory;

    this.loadApps();
    this.refreshIP();
  };

  this.loadApps = function () {
    util.ajax.get('/api/apps', bind(this, function (err, res) {
      res && this._apps.add(res);
    }));
  }

  this.getHomeDirectory = function () { return this._homeDirectory; }

  this.refreshIP = function() {
    util.ajax.get({url: "/api/ip", type: "json"}, bind(this, "onRefreshIP"));
  };

  this.delegate = new Delegate(function(on) {
    on.appList = function (target, appPath) {
      if (appPath) {
        this.appList.selection.deselectAll();

        var url = new std.uri(window.location)
          .setPath('/simulator/')
          .addQuery({app: appPath})
          .addHash({device: '{"type":"iphone5"}'})
          .toString();

        url = friendlyUnescape(url);

        if (navigator.isNodeWebkit && window.gui) {
          gui.Shell.openExternal(url);
        } else {
          window.open(url);
        }
      }
    };

    on.ipValue = function()  {
      this.refreshIP();
    };
  });

  this.onRefreshIP = function(err, response) {
    if (!err) {
      $.setText(this.ipValue, response.ip.join(","));
    }
  };
});
