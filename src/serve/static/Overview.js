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
import string.timeAgo;

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

// applied to the ip spinner while reloading
// should match the style
var RELOADING_CLASS = 'reloading';

/**
 * Overview widget.
 */

var AppCell = Class(Cell, function() {
  this._def = {
    className: 'appCell',
    children: [
      {id: 'icon', className: 'appIcon'},
      {id: 'name', type: 'label', className: 'appName'},
      {id: 'path', type: 'label', className: 'appPath'},
      {id: 'lastOpened', type: 'label', className: 'appPath'}
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
    var app = this._item.data;

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

    this.lastOpened.setLabel(string.timeAgo(app.lastOpened));
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
    var action = this._item;
    this.title.setLabel(action.title || '');
    this.subtitle.setLabel(action.subtitle || '');
    this.icon.style.backgroundImage = 'url(/icons/' + action.icon + ')';
  }
});

var ModuleCell = Class(Cell, function () {
  this._def = {
    className: 'moduleCell',
    children: [
      {id: 'title', type: 'label', children: [
        {type: 'label', tag: 'span', id: 'version'}
      ]},
      {id: 'subtitle', type: 'label'},
    ]
  };

  this.render = function () {
    var module = this._item.data;

    var allModules = this.controller.getDataSource().toArray();
    var appRoot = this.controller.getWidgetParent().getModel().get('paths.root');
    var relPath = module.path;
    if (relPath.indexOf(appRoot) == 0) {
      relPath = relPath.substring(appRoot.length + 1);
    }

    var depth = 0;
    var m = module;
    while (m && m.parent) {
      m = allModules.filter(function (item) { return item.data.path == m.parent; })[0];
      if (!m) { break; }
      ++depth;
    }

    this.getElement().style.marginLeft = depth * 30 + 'px';
    if (!depth) {
      this.addClass('primary');
    } else {
      this.removeClass('primary');
    }

    this.title.setLabel(module.name);
    this.subtitle.setLabel(relPath);

    var version = module.version;
    if (/^\d+\.\d+\.\d+$/.test(version)) {
      version = 'v' + version;
    }

    this.version.setLabel(version);
  }
});

var AppInspector = Class(Widget, function () {

  this._def = {
    children: [
      {id: 'simulateBtn', text: 'simulate', type: 'button'},
      {id: 'openBtn', text: 'open', type: 'button'},
      {id: 'title', type: 'label', data: 'title'},
      {id: 'dependenciesTitle', type: 'label', text: 'dependencies'},
      {id: 'dependenciesList', type: 'list', data: 'modules', cellCtor: ModuleCell, sorter: function (item) {
        return item.data.path;
      }}
    ]
  };

  this.delegate = new Delegate(function(on) {
    on.simulateBtn = function () {
      var appPath = this.getModel().get('paths.root');
      var url = new std.uri(window.location)
        .setPath('/simulator/')
        .addQuery({app: appPath})
        .addHash({device: '{"type":"iphone6"}'})
        .toString();

      url = friendlyUnescape(url);

      if (navigator.isNodeWebkit && window.gui) {
        gui.Shell.openExternal(url);
      } else {
        window.open(url);
      }
    };

    on.openBtn = function () {
      var appPath = this.getModel().get('paths.root');
      util.ajax.get('/api/openAppExternal/?app=' + appPath);
    };
  });
});

exports = Class(Widget, function(supr) {

  this._def = {
    className: 'overviewPanel',
    contentsWrapperClassName: 'overviewPanes',
    tabContainerClassName: 'overviewTabs',
    children: [
      {id: 'leftPane', children: [
        {id: 'actions', type: 'list', cellCtor: ActionCell},
        {id: 'logo'},
        {id: 'appList', type: 'list',
            selectable: 'single', cellCtor: AppCell, margin: 3,
            data: 'apps',
            sorter: function (item) {
              var key = '' + (10000000000000 - item.data.lastOpened);
              key = '00000000000000'.substring(0, 14 - key.length) + key;
              return key;
            }},
        {
          id: 'ip',
          type: 'button',
          tag: 'div',
          children: [
            {id: 'ipValue', tag: 'span', text: ''}
          ]
        }
      ]},
      {id: 'separator'},
      {id: 'rightPane', children: [{id: 'appInspector', type: AppInspector}]}
    ]
  };

  this.buildWidget = function() {
    supr(this, 'buildWidget', arguments);

    this.appInspector.hide();

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
      res && this.getModel().set('apps', res);
    }));
  }

  this.getHomeDirectory = function () { return this._homeDirectory; }

  this.refreshIP = function() {
    // prevent repeat clicking
    if ($.hasClass(this.ip._el, RELOADING_CLASS)) {
      return;
    }
    // add reloading class to ip
    $.addClass(this.ip._el, RELOADING_CLASS);
    util.ajax.get({url: '/api/ip', type: 'json'}, bind(this, 'onRefreshIP'));
  };

  this.showApp = function (appPath) {
    this._appPath = appPath;
    var app = this._apps.get(appPath).data;
    this.appInspector.show();
    this.appInspector.setModel(app);
  }

  this.delegate = new Delegate(function(on) {
    on.appList = function () {
      // the target argument was removed from delegate event calls
      // in commit b7c120e65253e902dd7dcc585cf33c9fb77300a1
      // support both old and new parameter (target, appPath) or just (appPath)
      var appPath = void 0;
      var target = void 0;
      if (arguments[0] == 'appList') {
        appPath = arguments[1];
      } else {
        appPath = arguments[0];
      }

      if (appPath) {
        this.appList.selection.deselectAll();
        this.showApp(appPath);
      }
    };

    on.ip = function()  {
      this.refreshIP();
    };
  });

  this.onRefreshIP = function(err, response) {
    // remove the reloading class after a short delay so the user
    // sees feedback when the ip is clicked
    setTimeout(bind(this, function () {
      $.removeClass(this.ip._el, RELOADING_CLASS);
    }), 500);

    if (!err) {
      $.setText(this.ipValue, response.ip.join(', '));
    }
  };
});
