var fs = require('fs');
var path = require('path');
var YAML = require('js-yaml');

var filename = path.join(__dirname, '../device-types.yaml');
var raw = fs.readFileSync(filename, 'utf8');
var types;
try {
  types = YAML.load(raw);
} catch (e) {
  console.error("Unable to load device types from", filename, e);
}

module.exports = types || {};
