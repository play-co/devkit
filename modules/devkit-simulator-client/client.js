/* globals CONFIG, GC, logger */

var dispatchWindowEvent = function(eventName) {
  var e = document.createEvent('Event');
  e.initEvent(eventName, true, true);
  window.dispatchEvent(e);
};

exports.onLaunch = function () {
  var deviceId = CONFIG.simulator.deviceId;
  var deviceType = CONFIG.simulator.deviceType;
  var deviceInfo = CONFIG.simulator.deviceInfo;

  import .simulateDevice;
  simulateDevice.simulate(deviceInfo);

  import devkit.debugging;
  var channel = devkit.debugging.getChannel('devkit-simulator');

  var _isHomeScreen = false;
  channel.on('button:home', function () {
    var app = GC.app;

    _isHomeScreen = !_isHomeScreen;
    if (_isHomeScreen) {
      dispatchWindowEvent('pagehide');
      app.engine.pause();

      var canvas = document.getElementsByTagName('canvas');
      if (canvas.length) {
        canvas = canvas[0];
        if (canvas.getContext) {
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    } else {
      dispatchWindowEvent('pageshow');
      app.engine.resume();
    }
  });

  channel.on('button:back', function (evt) {
    GLOBAL.NATIVE.onBackButton && GLOBAL.NATIVE.onBackButton(evt);
  });

  channel.on('screenshot', function (data, req) {
    devkit.debugging.screenshot(function (err, res) {
      if (err) {
        req.error(err);
      } else {
        req.send(res);
      }
    });
  });

  channel.on('mute', function (evt) {
    console.log('MUTE', evt.shouldMute);
    import AudioManager;
    AudioManager.muteAll(evt.shouldMute);
  });

  channel.on('pause', function () { exports.setPaused(true); });
  channel.on('resume', function () { exports.setPaused(false); });
  channel.on('step', function () { GC.app.engine.stepFrame(); });

  logger.log('waiting for devkit simulator client...');

  import device;
  if (device.isMobileBrowser) {
    import .mobileUI;
  }

  return channel.connect()
    .timeout(1000)
    .then(function () {
      logger.log('simulator client connected!');
      channel.emit('handshake', {
        deviceId: deviceId,
        deviceType: deviceType,
        userAgent: navigator.userAgent,
        screen: {
          width: device.screen.width,
          height: device.screen.height
        }
      });
    });
};

var _isPaused = false;
exports.setPaused = function (isPaused) {
  _isPaused = isPaused;

  var app = GC.app;
  if (_isPaused) {
    console.log("app paused");
    app.engine.pause();
  } else {
    app.engine.resume();
  }
};
