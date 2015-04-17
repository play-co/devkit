import squill.Widget as Widget;
import squill.Menu as Menu;

import .onNextFrame;
from util.browser import $;

var Button = Class(Widget, function(supr) {
  this._def = {
    tag: 'button',
    children: [
    ]
  };

  this.init = function (opts) {
    opts.id = opts.id + 'Button';
    opts.attrs = {tooltip: opts.tooltip || ''};
    opts.className = opts.tooltip ? 'withTooltip' : '';
    opts.children = [];

    if (opts.text) {
      opts.children.push({
        text: opts.text
      });

      delete opts.text;
    }

    if (opts.icon) {
      opts.children.push({
        id: 'icon',
        type: Widget,
        tag: 'i',
        className: 'glyphicon glyphicon-' + opts.icon
      });
    }

    supr(this, 'init', arguments);

    this.initMouseEvents();
  };

  this.setTooltip = function (tooltip) {
    this._el.setAttribute('tooltip', tooltip);
  };
});

module.exports = Class(Widget, function () {
  this._def = {
    id: 'toolbar', children: [
      {id: 'buttonContainer'}
    ]
  };

  this.buildWidget = function () {
    this._buttons = {};

    this._el.addEventListener('webkitTransitionEnd', bind(this, 'removeClass', 'transition'));
  };

  this.setSimulator = function (simulator) {
    // simulator.on('resize', bind(this, 'onResize'));

    this._createButtons(simulator, this.buttonContainer, [
      {
        id: 'reload',
        tooltip: 'reload the game',
        icon: 'refresh',
        onClick: function (simulator) {
          simulator.reload();
        }
      },
      {
        id: 'rotate',
        tooltip: 'rotate the device',
        icon: 'repeat',
        onClick: function (simulator) {
          simulator.rotate();
        }
      },
      {
        id: 'mute',
        tooltip: 'mute all sounds',
        icon: 'volume-up',
        event: 'change:mute',
        onChange: function (simulator) {
          var isMuted = simulator.isMuted();
          this.setTooltip(isMuted ? 'unmute all sounds' : 'mute all sounds');
          this.icon.toggleClass('glyphicon-volume-off', isMuted);
          this.icon.toggleClass('glyphicon-volume-up', !isMuted);
        },
        onClick: function (simulator) {
          simulator.toggleMuted();
        }
      },
      {
        id: 'pause',
        tooltip: 'pause game timer',
        icon: 'pause',
        event: 'change:pause',
        onChange: function (simulator) {
          var isPaused = simulator.isPaused();
          this.icon.toggleClass('glyphicon-pause', !isPaused);
          this.icon.toggleClass('glyphicon-play', isPaused);
          this.setTooltip(isPaused ? 'resume game timer' : 'pause game timer');
        },
        onClick: function (simulator) {
          simulator.togglePaused();
        }
      },
      {
        id: 'step',
        tooltip: 'step forward 1 frame',
        icon: 'step-forward',
        onClick: function (simulator) {
          simulator.step();
        }
      },
      {
        id: 'overflow',
        tooltip: 'more options',
        icon: 'chevron-down',
        menu: [
          // {
          //   id: 'debug',
          //   text: 'switch to release build',
          //   event: 'change:debug',
          //   onChange: function (simulator) {
          //     var isDebugMode = simulator.isDebugMode();
          //     this.setText(isDebugMode ? 'switch to release build' : 'switch to debug build');
          //   }
          // },
          {
            id: 'drag',
            text: 'lock simulator position',
            icon: 'move',
            event: 'change:drag',
            onChange: function () {
              var isDragEnabled = simulator.isDragEnabled();
              this.toggleClass('disabled', !isDragEnabled);
              this.setTooltip(isDragEnabled ? 'lock simulator position' : 'unlock simulator position');
            },
            onClick: function (simulator) {
              simulator.toggleDragEnabled();
            }
          },
          {
            id: 'screenShot',
            text: 'take a screenshot',
            icon: 'picture',
            onClick: function (simulator) {
              simulator.takeScreenshot();
            }
          },
          {
            id: 'deviceType',
            text: 'change the device type',
            icon: 'phone',
            onClick: function (simulator) {
              simulator.editDevice();
            }
          },
          {
            id: 'nativeBack',
            text: 'back button (hardware)',
            icon: 'chevron-left',
            onClick: function (simulator) {
              simulator.nativeBackButton();
            }
          },
          {
            id: 'nativeHome',
            text: 'home button (hardware)',
            icon: 'home',
            event: 'change:home',
            onChange: function (simulator) {
              var isHomeScreen = simulator.isHomeScreen();
              this.setTooltip(isHomeScreen ? 'return to game' : 'home (hardware button)');
              this.toggleClass('disabled', isHomeScreen);
            },
            onClick: function (simulator) {
              simulator.nativeHomeButton();
            }
          },
          // {id: 'addSimulator', text: 'add simulator', type: 'button'},
        ]
      }
    ]);
  }

  this._createButtons = function (simulator, parent, buttons) {

    for (var i = 0, opts; opts = buttons[i]; ++i) {
      var button = this._buttons[opts.id] = new Button(merge({parent: parent}, opts));

      if (opts.menu) {
        var menu = new Menu(merge({
          parent: this.buttonContainer,
          type: 'menu',
          className: 'list'
        }));

        this._createButtons(simulator, menu, opts.menu);

        button.on('Select', bind(menu, 'show'));
      }

      if (opts.event && opts.onChange) {
        simulator.on(opts.event, bind(button, opts.onChange, simulator));
      }

      if (opts.onClick) {
        button.on('Select', bind(button, opts.onClick, simulator));
      }
    }
  };

  this.getButton = function (id) {
    return this._buttons[id];
  };

  this.setValidOrientations = function (orientations) {
    var btnRotate = this.getButton('rotate');
    if (orientations.portrait && orientations.landscape) {
      btnRotate.show();
    } else {
      btnRotate.hide();
    }
  };

  this.setOffset = function (viewport, offset) {
    $.style(this._el, {
      top: offset.y - 35 + 'px',
      left: offset.x + 'px',
      width: offset.width + 'px'
    });

    var rect = this._el.getBoundingClientRect();
    $.style(this._el, {
      paddingTop: Math.max(0, -rect.top) + 'px',
      paddingLeft: Math.max(0, -rect.left) + 'px'
    });
  }

  this.hide = function () {
    this.addClass('transition');
    onNextFrame(this, function () {
      this.addClass('hidden');
    });
  }

  this.show = function () {
    this.addClass('transition');
    onNextFrame(this, function () {
      this.removeClass('hidden');
    });
  }
});
