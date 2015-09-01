import squill.Widget;
from util.browser import $;

module.exports = Class(squill.Widget, function (supr) {
  this._def = {
    children: [
      {id: 'header', children: [
        {id: 'title', text: 'log'},
        {type: 'label', format: '%(status.errors)d errors, %(status.warnings)d warnings'}
      ]},
      {id: 'contents'}
    ]
  };

  this.buildWidget = function () {
    supr(this, 'buildWidget', arguments);

    this._timers = {};

    var model = this.getModel();
    model.set('status.warnings', 0)
      .set('status.errors', 0);

    this.header.addEventListener('click', bind(this, 'toggle'));
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
    var client = conn.getClient('devkit.logging');
    this._client = client;
    client.onEvent('LOG', bind(this, '_onLog'));
    client.onRequest('TIMER_START', bind(this, '_onTimerStart'));
    client.onEvent('TIMER_END', bind(this, '_onTimerEnd'))

    this._addLine('system', 'connected to ' + device.getId());
  }

  this._onLog = function (evt) {
    var type = evt.name.toLowerCase();

    this._addLine(type, evt.args.msg);
  }

  var _timerUid = 0;
  this._onTimerStart = function (req) {
    var id = ++_timerUid;

    this._timers[id] = {
      name: req.args.name
    };

    req.respond({timerId: id});
    this._addLine('info', (req.args.name || '') + ' starting...');
  }

  this._onTimerEnd = function (evt) {
    var s = Math.floor(evt.args.delta / 1000);
    var ms = evt.args.delta - s * 1000;
    var time = (s ? s + 's' : '');
    time += (time ? ' ' : '') + ms + 'ms';

    var timer = this._timers[evt.args.timerId];
    var name = timer && timer.name || '';
    this._addLine('info', time + ' ' + name);
  }

  this._addLine = function (type, msg) {
    var model = this.getModel();
    if (type == 'warn') {
      model.set('warnings', model.get('warnings') + 1);
    }

    if (type == 'error') {
      model.set('errors', model.get('errors') + 1);
    }

    $({parent: this.contents, children: [
        {text: Date.now(), className: 'time'},
        {text: msg, className: 'msg'}
      ]});
  }

  this.toggle = function () {
    var el = this.getElement();
    this._isExpanded = !this._isExpanded;
    this.toggleClass('expanded');
  };
});
