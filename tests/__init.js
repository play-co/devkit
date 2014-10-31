// ensure globals are created before trying to import any devkit code.
require('../src/devkit');

var path = require('path');

// Add a test-only global __src for nicer imports
__src = path.normalize(path.join(__dirname, '..', 'src'));

// Let assert be a global to reduce imports in tests
assert = require('assert');
