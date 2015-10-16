/* globals Class, bind, logger */

from util.browser import $;
import util.path;
import squill.Widget as Widget;

import .DetailsWidget;
import .ViewNode;
import .BatchGetView;
import squill.Button as Button;

if (!devkit) {
  console.error('no devkit api available?');
} else {
  var module = devkit.getSimulator().getModules()['devkit-view-inspector'];
  var directory = util.path.splitPath(module.path).directory;
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = util.path.join(directory, 'inspector.css');
  document.querySelector('head').appendChild(link);
}

var ViewInspector = Class(Widget, function(supr) {
  this._def = {
    id: 'devkit-view-inspector',
    style: {
      width: '650px',
      display: 'none'
    },
    children: [
      {id: '_tree', children: [
        // {id: '_moveBtn', tag: 'button', text: 'move'},
        // {id: '_clearViewBtn', tag: 'button', text: 'clear'}
      ]},
      {id: '_details', type: DetailsWidget}
    ]
  };

  this.init = function () {
    this._highlight = {timer: 0};
    this._t = 0;
    this._highlighted = {};

    this._trace = {
      list: [],
      hash: {}
    };

    // keep a dictionary of all tree nodes for fast highlighting based on view uid
    this._nodeIndex = {};

    var simulator = devkit.getSimulator();
    var node = simulator.getParent();
    var contentArea = node && node.parentNode || document.body;

    this._deepTrace = document.createElement("div");
    this._deepTrace.setAttribute("id", "_deepTrace");
    contentArea.appendChild(this._deepTrace);

    supr(this, 'init', [{parent: contentArea}]);

    this._details.setInspector(this);

    $.onEvent(this._tree, 'mouseover', this, function () {
      this._disableHighlight = false;
    });

    this.setSimulator(simulator);
    var getViews = this._channel.request.bind(this._channel, 'getViews');
    this._batchGetView = new BatchGetView(getViews);

    new Button({
      id: 'devkit-view-inspector-toggle-button',
      parent: contentArea,
      children: [{
        tagName: 'span',
        className: 'glyphicon glyphicon-search'
      }]
    }).on('Select', bind(this, 'toggleVisibility'));
  };

  this.setSimulator = function (simulator) {
    this._simulator = simulator;

    this._channel = simulator
      .getChannel('devkit.debugging.viewInspector')

      .on('inputMove', bind(this, 'onInputMove'))
      .on('inputSelect', bind(this, 'onInputSelect'))
      .on('inputTrace', bind(this, 'onInputTrace'))
      .on('viewPollData', bind(this, function (data) {
        if(data.uid === this._highlightUID) {
          this._highlightPos = data;
        }

        if(data.uid === this._selectedUID) {
          this._selectedPos = data;
        }
      }));
  };

  this.getViewProps = function (uid) {
    return this._channel.request('getViewProps', uid);
  };

  this.setViewProp = function (uid, key, value) {
    return this._channel.request('setViewProp', {
        uid: uid,
        key: key,
        value: value
      });
  };

  this.setImage = function (uid, image) {
    return this._channel.request('replaceImage', {
        uid: uid,
        image: image
      });
  };

  this.startDebugging = function () {
    if (!this._simulator) { return; }

    if (this._unbindMouseout) {
      this._unbindMouseout();
      this._unbindMouseout = null;
    }

    var mouseOut = bind(this, 'onMouseOut');
    var mouseOver = bind(this, 'onMouseOver');

    var frame = this._simulator.getFrame();
    if (frame) {
      this._unbindMouseout = bind(frame, 'removeEventListener', 'mouseout', mouseOut, true);
      frame.addEventListener('mouseout', mouseOut, true);
      frame.addEventListener('mouseover', mouseOver, true);
    }

    this._connectMouseEvents();

    if (this._node) {
      this._node.destroy();
    }

    this._channel
      .request('getRootUID')
      .bind(this)
      .then(function (uid) {
        this._node = new ViewNode({
            parent: this._tree,
            inspector: this,
            viewUID: uid,
            id: 'rootNode'
          });
      }, function (e) {
        logger.warn(e);
      });
  };

  this.requestView = function (uid) {
    return this._batchGetView.request(uid);
  };

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

  this.onInputMove = function (evt) {
    if (!this._timer) { return; }

    this._trace.hash = {};
    this._trace.list = evt.parents;
    this._trace.autoExpand = {};
    for (var i = 0, uid; uid = evt.parents[i]; ++i) {
      this._trace.hash[uid] = true;
      this._trace.autoExpand[uid] = true;
    }

    var targetUID = evt.parents[i - 1];
    this.highlightView(targetUID);
    this._mouseHoverView = targetUID;

    this.updateTrace();
  };

  this.onInputSelect = function (evt) {
    if (!this._timer) { return; }

    this._trace.hash = {};
    this._trace.list = evt.parents;
    for (var i = 0, uid; uid = evt.parents[i]; ++i) {
      this._trace.hash[uid] = true;
    }

    var targetUID = evt.parents[i - 1];

    this.selectView(targetUID);
    //this.highlightView(targetUID);
    //this._mouseHoverView = targetUID;

    this.updateTrace();

  };

  this.onInputTrace = function (evt) {
    if (!this._timer) { return; }

    this.updateDeepTrace(evt);
  };

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
    var simulator = this._simulator;
    var offset = simulator.getFrame().getBoundingClientRect();
    var ratio = simulator.getDevicePixelRatio();
    this._deepTrace.style.display = "block";
    this._deepTrace.style.left = offset.left + evt.x / ratio + 5 + "px";
    this._deepTrace.style.top = offset.top + evt.y / ratio + "px";

    // document fragments perform much better for large amount of nodes
    var frag = document.createDocumentFragment();
    var i = evt.trace.length;
    while (i--) {
      // create the element
      var el = document.createElement("div");
      el.innerText = evt.trace[i].tag;

      el.setAttribute("data-id", evt.trace[i].uid);
      if (evt.trace[i].uid == evt.target) {
        el.setAttribute("class", "active");
      }

      el.style.paddingLeft = indent * evt.trace[i].depth + 8 + "px";

      // bind events
      el.onmouseover = bind(this, onOver);
      el.onclick = bind(this, onSelect);

      // add to the fragment
      frag.appendChild(el);
    }

    // cheap way to remove all children
    this._deepTrace.innerHTML = "";
    this._deepTrace.appendChild(frag);
  };

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
        if (this._trace.autoExpand[uid]) {
          delete this._trace.autoExpand[uid];
          if (!node.isToggled()) {
            node.toggle();
          }
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

      // disable any further highlighting until mouse over
      this._disableHighlight = true;
    }
  };

  // on mouse over, let highlighting happen again
  this.onMouseOver = function () {
    this._disableHighlight = false;
  };

  this.highlightView = function (viewUID) {
    var highlight = this._highlight;
    highlight.target = viewUID;
    this._highlightUID = viewUID;

    // this._disableHighlight flag prevents race conditions between mouse out
    // and move
    if (!viewUID || this._disableHighlight) {
      viewUID = this._selectedUID;
    }

    this._channel.emit('highlightView', viewUID);
    this._details.showView(viewUID);
  };

  this.selectView = function (viewUID) {
    var node;
    if (this._selectedUID) {
      node = this._nodeIndex[this._selectedUID];
      node && node.setSelected(false);
    }

    node = this._nodeIndex[viewUID];
    if (!node) {
      return console.error("No node found for", viewUID);
    }

    node.setSelected(true);
    this._details.imageView(viewUID, node);

    this._selectedUID = viewUID;

    this._channel.emit('selectView', viewUID);
  };

  var PERIOD = 8000;

  this.tick = function() {
    if (!this._node) { return; }

    this._node.refresh();
    this._batchGetView.dispatch();

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

  this.toggleVisibility = function () {
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
    style.display = 'flex';
    style.left = '0px';
    style.opacity = 1;
    this.startDebugging();

    this.startTimer();
  };

  this.open = function () {
    $.removeClass(this._el, 'closed');

    this._isShowing = true;
    this.show();

    this.emit('open');
  };

  this.close = function() {
    this._isShowing = false;
    this.stopTimer();

    // cancel the view position polling if it's active
    this._disconnectMouseEvents();

    $.addClass(this._el, 'closed');
    var style = this._el.style;
    style.left = -this._el.offsetWidth + 'px';
    style.opacity = 0;

    setTimeout(function () {
      style.display = 'none';
    }, 300);

    this._selectedUID = null;
    this._highlightUID = null;
    this._channel.emit('selectView', {uid: null});
    this._channel.emit('highlightView', {uid: null});

    this.stopTimer();
    this.emit('close');
  };

  this._connectMouseEvents = function () {
    return this._channel.request('enableInputListener');
  };

  this._disconnectMouseEvents = function () {
    this._channel.emit('stopPollView');
    return this._channel.request('disableInputListener');
  };

  this._addNode = function(id, node) { this._nodeIndex[id] = node; };
  this._removeNode = function(id) { delete this._nodeIndex[id]; };
});

module.exports = new ViewInspector();
