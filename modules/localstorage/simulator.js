import util.ajax;
import device;

var MODULE_URL = 'modules/localstorage/';

exports.onLaunch = function () {

  // only active in debug mode
  if (DEBUG && device.isSimulator) {
    var store = Object.create(null, {
      'getItem': {
        value: function (key) {
          return store[key];
        }
      },
      'setItem': {
        value: function (key, value) {
          return (store[key] = '' + value);
        }
      },
      'removeItem': {
        value: function (key) {
          delete store[key];
        }
      },
      'clear': {
        value: function () {
          for (var key in store) {
            delete store[key];
          }
        }
      }
    });

    Object.defineProperty(window, 'localStorage', {
      get: function () {
        return store;
      }
    });
    //   get: function () {
    //     return store;
    //   },
    //   set: function () {
    //     logger.warn('cannot assign to localStorage');
    //   }
    // });

    var persist = function () {
      util.ajax.post({
        url: MODULE_URL,
        async: false,
        data: JSON.stringify(store)
      });
    };

    window.addEventListener('beforeunload', persist, false);
    window.addEventListener('unload', persist, false);

    return new Promise(function (resolve, reject) {
      util.ajax.get({
        url: MODULE_URL,
        type: 'json'
      }, function (err, res) {
        if (err) { return reject(); }

        for (var key in res) {
          store.setItem(key, res[key]);
        }

        resolve();
      });
    });
  }
};
