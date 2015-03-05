from util.browser import $;
import squill.Widget as Widget;

import .DetailsWidget;
import .ViewNode;

exports.ViewInspector = Class(Widget, function(supr) {
  this._def = {
    style: {
      width: '650px'
    },
    children: [
      {id: '_tree', children: [
        // {id: '_moveBtn', tag: 'button', text: 'move'},
        // {id: '_clearViewBtn', tag: 'button', text: 'clear'}
      ]},
      {id: '_details', type: DetailsWidget}
    ]
  };

  this.init = function(opts) {
    this._highlight = {timer: 0};
    this._t = 0;
    this._highlighted = {};

    this._trace = {
      list: [],
      hash: {}
    };

    this._appID = opts.appID;

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

  this.setDevice = function (device) {
    if (device == this._device) { return; }

    if (this._client) { this._client.end(); }
    this._client = null;

    this._device = device;
    var conn = device.getConn();
    if (conn) {
      this._setConn(device, conn);
    } else {
      device.on('conn', bind(this, '_setConn', device));
    }
  }

  this._setConn = function (device, conn) {
    if (device != this._device) { return; }

    var client = conn.getClient('devkit.viewInspector');
    this._client = client;

    client.onEvent('INPUT_MOVE', bind(this, function (evt) {
      this.onMouseMove(evt.args);
    }));

    client.onEvent('INPUT_SELECT', bind(this, function (evt) {
      this.onMouseSelect(evt.args);
    }));

    client.onEvent('INPUT_TRACE', bind(this, function (evt) {
      this.onTrace(evt.args);
    }));

    client.onEvent('POLL_VIEW_POSITION', bind(this, function (evt) {
      if(evt.args.uid === this._highlightUID) this._highlightPos = evt.args;
      if(evt.args.uid === this._selectedUID) this._selectedPos = evt.args;
    }));

    if (this._isShowing) {
      this.startDebugging();
    }
  };

  this.getClient = function () { return this._client; }

  this.getViewProps = function (uid, cb) {
    var client = this._client;
    if (client && client.isConnected()) {
      client.sendRequest('GET_VIEW_PROPS', {uid: uid}, cb);
    }
  };

  this.setViewProp = function (uid, key, value, cb) {
    var client = this._client;
    if (client && client.isConnected()) {
      client.sendRequest('SET_VIEW_PROP', {uid: uid, key: key, value: value}, cb);
    }
  };

  this.setImage = function (uid, data, cb) {
    var client = this._client;
    if (client && client.isConnected()) {
      client.sendRequest('REPLACE_IMAGE', {uid: uid, imgData: data}, cb);
    }
  };

  this.startDebugging = function () {
    if (!this._client) { return; }

    if (this._unbindMouseout) {
      this._unbindMouseout();
      this._unbindMouseout = null;
    }

    var mouseOut = bind(this, 'onMouseOut');
    var mouseOver = bind(this, 'onMouseOver');

    var frame = this._device.getSimulator().getFrame();
    if (frame) {
      this._unbindMouseout = bind(frame, 'removeEventListener', 'mouseout', mouseOut, true);
      frame.addEventListener('mouseout', mouseOut, true);
      frame.addEventListener('mouseover', mouseOver, true);
    }

    this._connectMouseEvents();

    if (this._node) {
      this._node.destroy();
    }

    this._client.sendRequest('GET_ROOT_UID', bind(this, function (err, res) {
      this._node = new ViewNode({
          parent: this._tree,
          inspector: this,
          viewUID: res.uid,
          id: 'rootNode'
        });
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

  this.onMouseSelect = function (evt) {
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
    var simulator = this._device.getSimulator();
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
      el = document.createElement("div");
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

    var detailView = viewUID || this._selectedUID;

    //this flag prevents race conditions between mouse out and move
    if (this._disableHighlight) {
      detailView = this._selectedUID;
    }

    this._highlightUID = viewUID;

    var client = this._client;
    if (client && client.isConnected()) {
      client.sendEvent('SET_HIGHLIGHT', {uid: detailView});
    }

    this._details.showView(detailView);
  };

  this.selectView = function (viewUID) {
    if (this._selectedUID) {
      var node = this._nodeIndex[this._selectedUID];
      node && node.setSelected(false);
    }

    var node = this._nodeIndex[viewUID];
    if (!node) {
      return console.error("No node found for", viewUID);
    }

    node.setSelected(true);
    this._details.imageView(viewUID, node);

    this._selectedUID = viewUID;

    var client = this._client;
    if (client && client.isConnected()) {
      client.sendEvent('SET_SELECTED', {uid: viewUID});
    }
  };

  var PERIOD = 8000;

  this.tick = function() {
    if (!this._node) { return; }

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
    this._client.sendEvent('SET_SELECTED', {uid: null});
    this._client.sendEvent('SET_HIGHLIGHT', {uid: null});

    this.stopTimer();
    this.emit('close');
  };

  this._connectMouseEvents = function () {
    if (this._client && this._client.isConnected()) {
      this._client.sendRequest('ADD_MOUSE_EVT');
    }
  };

  this._disconnectMouseEvents = function () {
    if (this._client && this._client.isConnected()) {
      this._client.sendEvent('POLL_VIEW_POSITION', {uid: null});
      this._client.sendRequest('REMOVE_MOUSE_EVT');
    }
  };

  this._addNode = function(id, node) { this._nodeIndex[id] = node; };
  this._removeNode = function(id) { delete this._nodeIndex[id]; };
});
