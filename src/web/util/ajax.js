import util.ajax;
import .bluebird as Promise;

exports.get = Promise.promisify(util.ajax.get);
exports.post = Promise.promisify(util.ajax.post);

var _host;
var _protocol;
exports.setHost = function (host) {
  _host = host;
};

exports.setProtocol = function (protocol) {
  _protocol = protocol;
};

exports.resolveURL = function (url) {
  if (_host && !/^https?:|^\/\//.test(url)) {
    url = '//' + _host + url;
  }

  if (!/^https?:/.test(url) && /\/\//.test(url)) {
    url = (_protocol || window.location.protocol) + url;
  }

  return url;
};
