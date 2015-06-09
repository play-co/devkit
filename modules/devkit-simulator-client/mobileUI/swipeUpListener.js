import lib.PubSub;

exports = new lib.PubSub();

var touches = {};
var SWIPE_DIST = Math.min(100, window.innerHeight * 0.1);
var forEach = Array.prototype.forEach;
var slice = Array.prototype.slice;
var doubleSwipe = null;

document.addEventListener('touchstart', function (evt) {
  if (evt.changedTouches) {
    forEach.call(evt.changedTouches, function (touch) {
      touches[touch.identifier] = {
        x: touch.clientX,
        y: touch.clientY,
        dx: 0,
        dy: 0
      };

      if (evt.touches.length == 2) {
        doubleSwipe = [evt.touches[0].identifier, evt.touches[1].identifier];
      } else {
        doubleSwipe = null;
      }
    });
  }
}, true);

document.addEventListener('touchcancel', function (evt) {
  if (evt.changedTouches) {
    forEach.call(evt.changedTouches, function (touch) {
      delete touches[touch.identifier];
    });
  }
});

function isSwipeUp(point) {
  var dx = point.dx;
  var dy = point.dy;
  return dy * dy > dx * dx && dy < -SWIPE_DIST;
}

document.addEventListener('touchend', function (evt) {
  if (!evt.changedTouches || !doubleSwipe) { return; }

  forEach.call(evt.changedTouches, function (touch) {
    var data = touches[touch.identifier];
    data.dx = touch.clientX - data.x;
    data.dy = touch.clientY - data.y;
  });

  for (var i = 0, n = evt.changedTouches.length; i < n; ++i) {
    if (doubleSwipe.indexOf(evt.changedTouches[i].identifier) >= 0
        && isSwipeUp(touches[doubleSwipe[0]])
        && isSwipeUp(touches[doubleSwipe[1]])) {
      exports.emit('swipe');
      return;
    }
  }
}, true);
