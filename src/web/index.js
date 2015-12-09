import std.uri as URI;
from util.browser import $;


// prevent drag/drop
$.onEvent(document.body, 'dragenter', this, function (evt) { evt.preventDefault(); });
$.onEvent(document.body, 'dragover', this, function (evt) { evt.preventDefault(); });
$.onEvent(document.body, 'dragleave', this, function (evt) { evt.preventDefault(); });
$.onEvent(document.body, 'drop', this, function (evt) { evt.preventDefault(); });

var devkitElement = document.querySelector('#devkit');
devkitElement.addEventListener('scroll', function () {
  if (devkitElement.scrollTop !== 0) {
    devkitElement.scrollTop = 0;
  }

  if (devkitElement.scrollLeft !== 0) {
    devkitElement.scrollLeft = 0;
  }
});

// handle initial uri parameters
var devkit = window.devkit;
var uri = new URI(window.location);
var app = uri.query('app');
var simOpts = uri.hash('device');
if (app && simOpts) {
  devkit.createSimulator(app, merge(JSON.parse(simOpts), {
      parent: document.querySelector('#devkit #simulators')
    }))
    .then(function (simulator) {
      simulator.rebuild();
    });
}
