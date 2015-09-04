/**
 * @license
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

/* globals GC, Class, bind, logging, merge */

import ui.resource.Image as Image;
import ui.ImageView as ImageView;

import devkit.debugging;
import devkit.debugging.InputMoveListener as InputMoveListener;

import .OverlayRenderer;

var CHANNEL_ID = 'devkit.debugging.viewInspector';

// mapping for reading/writing style properties on a view
// map: inspector id -> style property
var INSPECTOR_PROPERTIES = {
  relX: 'x',
  relY: 'y',
  relR: 'r',
  relWidthPercent: 'widthPercent',
  relHeightPercent: 'heightPercent',
  relWidth: 'width',
  relHeight: 'height',
  relScale: 'scale',
  opacity: 'opacity',
  zIndex: 'zIndex',
  visible: 'visible',
  anchorX: 'anchorX',
  anchorY: 'anchorY',
  offsetX: 'offsetX',
  offsetY: 'offsetY',
  clip: 'clip',
  layout: 'layout',
  inLayout: 'inLayout',
  top: 'top',
  left: 'left',
  bottom: 'bottom',
  right: 'right',
  flex: 'flex',
  direction: 'direction',
  justifyContent: 'justifyContent',
  order: 'order',

  layoutWidth: 'layoutWidth',
  layoutHeight: 'layoutHeight',
  centerX: 'centerX',
  centerY: 'centerY',
  minWidth: 'minWidth',
  minHeight: 'minHeight',
  maxWidth: 'maxWidth',
  maxHeight: 'maxHeight',
};

var ViewInspectorClient = Class(function () {
  this.init = function () {};

  function getParentUIDs(view) {
    var uids = view.getSuperviews().map(function (view) { return view.uid; });
    uids.push(view.uid);
    return uids;
  }

  function findBetterTag (view) {
    var parent = view.getSuperview();
    for (var key in parent) {
      if (parent[key] === view) {
        return key;
      }
    }

    return null;
  }

  this.onLaunch = function () {
    this._overlay = new OverlayRenderer();

    var channel = devkit.debugging.getChannel(CHANNEL_ID);

    this._channel = channel
      .on('setName', bind(this, function (name) {
        GLOBAL._name = name;
        logging.setPrefix(name + ': ');
      }))
      .on('enableInputListener', bind(this, function (req, res) {
        if (!this._inputListener) {
          this._inputListener = new InputMoveListener({requireShiftClick: true})
            .on('trace', function (evt) {
              channel.emit('inputTrace', {
                x: evt.x,
                y: evt.y,
                target: evt.target.uid,
                trace: evt.trace.map(function (item) {
                  return {
                    uid: item.view.uid,
                    tag: item.view.getTag(),
                    depth: item.depth
                  };
                })
              });
            })
            .on('move', function (evt) {
              channel.emit('inputMove', {
                parents: getParentUIDs(evt.target)
              });
            })
            .on('select', function (evt) {
              channel.emit('inputSelect', {
                parents: getParentUIDs(evt.target)
              });
            });
        }

        this._inputListener.connect();
        res.send();
      }))
      .on('disableInputListener', bind(this, function (req, res) {
        if (this._inputListener) {
          this._inputListener.disconnect();
        }

        res.send();
      }))
      .on('highlightView', bind(this._overlay, 'setHighlight'))
      .on('selectView', bind(this._overlay, 'setSelected'))
      .on('getRootUID', bind(this, function (req, res) {
        if (GLOBAL.GC && GLOBAL.GC.app && GLOBAL.GC.app.uid) {
          res.send(GC.app.uid);
        } else {
          res.error('no root view');
        }
      }))
      .on('getViews', bind(this, function (req, res) {
        var data = {};
        req.uids.forEach(function (uid) {
          var view = devkit.debugging.getViewById(uid);
          if (view) {
            var sup = view.getSuperview();

            //create the optimal tag
            var tag = view.getTag && view.getTag() || view.toString();
            var betterTag = findBetterTag(view);
            if (betterTag) tag = betterTag + ":" + tag;

            data[uid] = {
              uid: uid,
              superviewId: sup && sup.uid,
              tag: tag,
              subviewIds: view.getSubviews().map(function (view) { return view.uid; })
            };
          }
        }, this);

        res.send(data);
      }))
      .on('replaceImage', bind(this, function (req, res) {
        var image = req.image;
        var uid = req.uid;

        var view = devkit.debugging.getViewById(uid);
        var newImg = new Image();

        newImg._srcImg.addEventListener("load", function () {
          var map = newImg._map;
          map.width = newImg._srcImg.width,
          map.height = newImg._srcImg.height,
          map.x = 0;
          map.y = 0;
          view.setImage(newImg);
          view.needsRepaint();
        }, false);

        newImg._srcImg.src = image;

        res.send();
      }))
      .on('getViewProps', bind(this, function (req, res) {
        var uid = req.uid;
        var view = devkit.debugging.getViewById(uid);
        if (!view) {
          return res.error('view ' + uid + ' not found');
        }

        var s = view.style;
        var p = view.getPosition();
        var layout = view.__layout;
        var data = {};
        var key;
        for (key in INSPECTOR_PROPERTIES) {
          data[key] = s[INSPECTOR_PROPERTIES[key]];
        }

        merge(data, {
          absX: p.x,
          absY: p.y,
          absR: p.r,
          absWidth: p.width,
          absHeight: p.height,
          absScale: p.scale,

          subviews: layout && (typeof layout.getSubviews == 'function') && layout.getSubviews().length,
          direction: layout && (typeof layout.getDirection == 'function') && layout.getDirection(),
          padding: s.padding && s.padding.toString()
        });

        for (key in data) {
          if (data[key] === undefined || data[key] === null) {
            data[key] = '-';
          }
        }

        data.isImageView = view instanceof ImageView;

        if (data.isImageView) {
          data.imagePath = view._opts.image || (view._img && view._img._map && view._img._map.url);
          if (data.imagePath && data.imagePath._map) {
            data.imagePath = data.imagePath._map.url;
          }
        }

        data.uuid = uid;
        data.description = (view.constructor.name || 'View') + ' ' + req.uid + '\n' + view.getTag();

        res.send(data);
      }))
      .on('setViewProp', bind(this, function (req, res) {
        var uid = req.uid;
        var key = req.key;
        var value = req.value;

        var view = devkit.debugging.getViewById(uid);
        if (!view) {
          return res.error('VIEW_NOT_FOUND');
        }

        if (key in INSPECTOR_PROPERTIES) {
          view.style[INSPECTOR_PROPERTIES[key]] = value;
        } else {
          switch (key) {
            case 'absX': break;
            case 'absY': view.style.y = value; break;
            case 'absWidth': view.style.width = value; break;
            case 'absHeight': view.style.height = value; break;
            case 'absScale': view.style.scale = value; break;
            case 'padding': view.style.padding = value; break;
          }
        }
      }))
      .on('stopPollView', bind(this, function () {
        if (this._pollTimer) {
          clearTimeout(this._pollTimer);
          this._pollTimer = null;
        }
      }))
      .on('pollView', bind(this, function (evt) {

        if (this._pollTimer) {
          clearTimeout(this._pollTimer);
          this._pollTimer = null;
        }

        function poll() {
          if (this._pollView) {
            var eventData = this._pollView.getPosition();
            eventData.uid = this._pollView.uid;

            channel
              .request('viewPollData', eventData)
              .bind(this)
              .then(function () {
                this._pollTimer = setTimeout(poll, 250);
              });
          }
        }

        this._pollView = devkit.debugging.getViewById(evt.uid);
        if (!this._pollTimer && this._pollView) {
          this._pollTimer = setTimeout(poll, 500);
        }
      }));
  };

  this.onApp = function (app) {
    this._channel.emit('appReady', {uid: app.view.uid});
    app.engine.unsubscribe('Render', this._overlay);
    app.engine.subscribe('Render', this._overlay, 'render');

    app.engine.on('resume', bind(this._overlay, 'stopTick'));
    app.engine.on('pause', bind(this._overlay, 'startTick'));
  };

});

module.exports = new ViewInspectorClient();
