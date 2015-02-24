import squill.Widget as Widget;
import squill.Dialog as Dialog;
import squill.Delegate as Delegate;

import ..util.resolutions as resolutions;

module.exports = Class(Dialog, function (supr) {

  this._def = {
    id: 'deviceDialog',
    title: 'Device Properties',
    header: [
      {type: 'label', text: 'zoom:'},
      {id: 'zoom50', type: 'button', text: '50%'},
      {id: 'zoom100', type: 'button', text: '100%'},
      {id: 'zoom200', type: 'button', text: '200%'},
      {id: 'zoomCustom', type: 'button', text: 'other'},
      {id: 'zoomCustomWrapper', type: 'widget', children: [
        {id: 'zoom', tag: 'input', attrs: {type: 'range', value: 100, max: 400, min: 10, step: 1}},
        {id: 'zoomPercent', type: 'label', label: '100%'},
      ]},
      {id: 'retina', type: 'checkbox', text: 'retina', value: true}
    ],
    children: [
      {type: 'label', text: 'select a device' },
      {id: 'deviceList'}
    ]
  };

  this.buildWidget = function () {
    supr(this, 'buildWidget', arguments);

    var simulator = this._simulator = this._opts.simulator;

    var previewImage = this._opts.loadingImage;
    for (var type in resolutions.defaults) {
      var deviceType = resolutions.defaults[type];
      new DeviceCell({
          parent: this.deviceList,
          type: DeviceCell,
          deviceType: deviceType,
          previewImage: previewImage
        })
        .on('Select', bind(this, function (deviceType) {
          this.emit('select', deviceType);
        }, deviceType));
    }

    simulator.on('change:zoom', bind(this, '_onZoomChange'));
    this.zoom.addEventListener('change', bind(this, '_onZoom'));
    this.zoom.addEventListener('input', bind(this, '_onZoom'));
    this._onZoomChange();

    this._isZoomCustom = false;
    this.zoomCustomWrapper.hide();
  }

  this.delegate = new Delegate(function (on) {
    on.zoomCustom = function () {
      this._isZoomCustom = !this._isZoomCustom;
      this._isZoomCustom ? this.zoomCustomWrapper.show()
                         : this.zoomCustomWrapper.hide();
    }

    on.zoom50 = function () { this.zoom.value = 50; this._onZoom(); }
    on.zoom100 = function () { this.zoom.value = 100; this._onZoom(); }
    on.zoom200 = function () { this.zoom.value = 200; this._onZoom(); }

    on.retina = function () {
      this._simulator.setRetina(this.retina.isChecked());
    }
  });

  this._onZoom = function () {
    this._simulator.setZoom(this.zoom.value / 100);
  }

  this._onZoomChange = function () {
    this.zoomPercent.setText((this._simulator.getZoom() * 100).toFixed(0) + '%');
  }
});

var DeviceCell = Class(Widget, function (supr) {

  var FIT_TO = 50;

  this._def = {
    className: 'device',
    children: [
      {id: 'previewBg', children: [
        {id: 'preview'}
      ]},
      {id: 'label', type: 'label'},
      {id: 'resolution', type: 'label'}
    ]
  };

  function getScale(w, h) {
    var ratio = w / h;
    return FIT_TO / (ratio > 1 ? w : h)
  }

  this.buildWidget = function () {

    var def = this._opts.deviceType;
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
    this.preview.style.backgroundImage = 'url(' + this._opts.previewImage + ')';

    if (setBg) {
      this.previewBg.style.cssText =
        'background-image: url(images/' + bg.img + ');'
        + 'width:' + bg.width * scale + 'px;'
        + 'min-height:' + bg.height * scale + 'px;'
        + 'padding:' + bg.offsetY * scale + 'px 0 0 ' + bg.offsetX * scale + 'px;'
    }
  }
});
