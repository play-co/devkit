var express = require('express');
var path = require('path');

exports.getMiddleware = function (api, app) {
  return {
    'debugger': express.static(path.join(__dirname, 'static'))
  };
};
