import squill.Widget;
import ..util.qrcode as QRCode;

module.exports = Class(squill.Widget, function (supr) {
  this._def = {
    children: [
      {id: 'qr'}
    ]
  };

  this.init = function(opts) {
    this._qrOpts = merge({}, opts.qrOpts);
    supr(this, 'init', [opts]);
  };

  this.buildWidget = function () {
    supr(this, 'buildWidget', arguments);
    this._qrcodeObj = new QRCode(this.qr, this._getOpts());
  };

  // external api, rebuilds qrcode.
  this.updateText = function(text) {
    this._qrOpts.text = text;
    this._rebuildCode();
  };

  this._getOpts = function() {
    /*
      correctLevel refers to the error correction level of the qrcode.
      QRCodes allow for varying degrees of error correction (data redundancy) to allow them to
      withstand physical degredation (eg: a code on a sticker that is speckled with mud or partially obscured)
      while still retaining data integrity. higher correction levels mean denser codes. Because we arent printing our codes
      we dont have to worry about any physical degredation so we can have correctLevel be as low as possible.
      For more information on qrcode error correction see http://www.qrcode.com/en/about/error_correction.html
    */
    return merge({correctLevel: QRCode.CorrectLevel.L}, this._qrOpts);
  };

  this._rebuildCode = function() {
    this._qrcodeObj.clear();
    this._qrcodeObj.makeCode(this._qrOpts.text);
  };

});
