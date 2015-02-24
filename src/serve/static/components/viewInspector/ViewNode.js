from util.browser import $;
from util.underscore import _;

import squill.Widget as Widget;

var ViewNode = exports = Class(Widget, function(supr) {

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
    var client = this._inspector.getClient();

    if (!this.sendGetView) {
      this.sendGetView = _.throttle(bind(this, function () {
        if (!client || !client.isConnected() || !this._getChildren || !this._viewUID) { return; }

        client.sendRequest('GET_VIEW', {uid: this._viewUID}, bind(this, function (err, res) {
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

