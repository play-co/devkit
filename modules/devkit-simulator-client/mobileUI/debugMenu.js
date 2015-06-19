from util.browser import $;
import util.ajax;
import std.uri;

var nextTick = requestAnimationFrame || setTimeout;
var url = new std.uri(location.href);
var _disabled = false;

var buttons = [
  {icon: 'fast-backward', onClick: function () {
    window.location.reload();
  }},
  {icon: 'refresh', onClick: function () {
    _disabled = true;

    $.addClass(debugMenu, 'disabled');
    $.addClass(this, 'devkit-debug-menu-spin');
    util.ajax.get({
      url: '../../api/simulate',
      data: {
        app: url.query('app'),
        mobile: true
      }
    }, function (err, res) {
      if (res) {
        location.reload();
      }
    });

  }},
  {icon: 'pause', onClick: function () {
    if (!window.GC || !GC.app || !GC.app.engine) { return; }

    if (/pause/.test(this.className)) {
      GC.app.engine.pause();
      $.removeClass(this, 'glyphicon-pause');
      $.addClass(this, 'glyphicon-play');
    } else {
      GC.app.engine.resume();
      $.removeClass(this, 'glyphicon-play');
      $.addClass(this, 'glyphicon-pause');
    }
  }},
  {icon: 'erase', onClick: function () {
    window.addEventListener('unload', function () {
      localStorage.clear();
    });
    location.reload();
  }}
].map(function (def) {
  def.className = 'devkit-debug-menu-btn glyphicon glyphicon-' + def.icon;
  def.attrs = {noCapture: true};
  var btn = $(def);
  btn.addEventListener('click', function () {
    if (!_disabled) {
      return def.onClick.apply(this, arguments);
    }
  }, true);
  return btn;
});

var debugMenu = $({
  id: 'devkit-debug-menu',
  parent: document.body,
  attrs: {noCapture: true},
  children: [
    {
      id: 'devkit-debug-menu-content',
      className: 'glyphicon glyphicon',
      children: buttons
    }
  ]
});

debugMenu.addEventListener('touchstart', function (evt) {
  if (evt.target == debugMenu) {
    evt.preventDefault();
    exports.hide();
  }
});

exports.show = function () {
  pauseInput();

  $.style(debugMenu, {
    opacity: 0,
    width: window.innerWidth + 'px',
    height: window.innerHeight + 'px'
  });

  $.addClass(debugMenu, 'show');

  nextTick(function () {
    $.style(debugMenu, {opacity: 1});
  });

  var contents = debugMenu.childNodes[0];
  var scale = window.innerWidth / contents.offsetWidth;
  contents.style.WebkitTransform = 'scale(' + 0.75 * scale + ')';
};

exports.hide = function () {
  resumeInput();

  $.style(debugMenu, {opacity: 0});
  setTimeout(function () {
    $.removeClass(debugMenu, 'show');
  }, 500);
};

function pauseInput() {
  try {
    GC.app.engine.getInput().disable();
  } catch (e) {}
}

function resumeInput() {
  try {
    GC.app.engine.getInput().enable();
  } catch (e) {}
}
