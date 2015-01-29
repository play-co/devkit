
// runs a (ctx, cb) or just a plain (cb) on the next frame.  Use instead of
// setTimeout(0) to guarantee that the layouting in the browser is complete
// and css changes are applied (setTimeout(0) does not make this gaurantee)
var reqAnim = window.requestAnimationFrame;
var cancelAnim = window.cancelAnimationFrame;
var prefixes = ['', 'webkit', 'moz', 'o', 'ms'];
for (var i = 0; i < prefixes.length && !reqAnim; ++i) {
  reqAnim = window[prefixes[i] + 'RequestAnimationFrame'];
  cancelAnim = window[prefixes[i] + 'CancelAnimationFrame'] || window[prefixes[i] + 'CancelRequestAnimationFrame'];
}

module.exports = function (ctx, cb) {
  if (arguments.length == 1) {
    cb = arguments[0];
  } else {
    cb = bind.apply(GLOBAL, arguments);
  }

  reqAnim(cb);
};
