/**
 * Shallow clone
 */
var clone = function (dest, src) {
  // Clear destination
  Object.keys(dest).forEach(function(key) {
    dest[key] = void 0;
  });
  // Copy source into destination
  Object.keys(src).forEach(function(key) {
    dest[key] = src[key];
  });
};

/**
 * Replace array contents with another array
 */
var setArrayContents = function (contents) {
  // Replace values in existing array with values in other array
  var args = [0, this.length].concat(contents);
  this.splice.apply(this, args);
};

/**
 * Sets the value at an array index
 */
var setElement = function (index, value) {
  // if index is beyond array contents, push the value on the end
  if (index >= this.length) {
    this.push(value);
    return;
  }

  // Handle case where value is an array
  if (Array.isArray(value)) {
    var element = this[index];

    if (!Array.isArray(element)) {
      // Do not try to splice if we dont have an array already
      this[index] = value;
      return;
    }

    setArrayContents.call(element, value);
    return;
  }

  // Set value for element in array. Objects are cloned, arrays are spliced.
  // Undefined removes an element and reindexes.
  switch (typeof value) {
    case 'string':
    case 'number':
      this[index] = value;
      break;
    case 'undefined':
      // remove the element at the index
      this.splice(index, 1);
      break;
    case 'object':
      clone(this[index], value);
      break;
    default:
      console.warn('Unknown type for value');
      break;
  }
};

var setValueForKey = function (obj, key, value) {
  if (typeof key == 'number') {
    setElement.call(obj, key, value);
  } else {
    // not an array
    if (typeof value === 'undefined') {
      // Remove key from object
      obj[key] = void 0;
    } else {
      // Set value on object
      obj[key] = value;
    }
  }
};

/**
 * Tries to read a number value out of a string, if it fails to match the
 * entire string, returns the original string instead
 */
function tryParseNumber(str) {
  var num = parseFloat(str);
  if (num == str) {
    return num;
  }

  return str;
}

/**
 * Tries to read an integer value out of a string, if it fails to match the
 * entire string, returns the original string instead
 */
function tryParseInt(str) {
  var num = parseInt(str);
  if (num == str) {
    return num;
  }

  return str;
}

/**
 * Parses a string key of the form "foo.bar[a=1, b=2].baz[alpha = beta].delta"
 */
function parseKey(key) {
  var pieces = [];
  key.split('.').forEach(function (piece) {
    var match = piece.match(/^(.*?)\[(.*)\]$/);
    if (match) {
      match[1] && pieces.push(match[1]);

      var filter;
      match[2].replace(/,?\s*([^=\s]+)\s*=\s*([^,\s]+)/g, function (str, key, value) {
        if (!filter) { filter = {}; }
        filter[key] = tryParseNumber(value);
      });

      if (filter) {
        pieces.push(filterArray.bind(this, filter));
      } else {
        pieces.push(tryParseInt(match[2]));
      }
    } else {
      pieces.push(piece);
    }
  });

  return pieces;
}

function filterArray(filter, value) {
  for (var key in filter) {
    if (!value || value[key] != filter[key]) { return false; }
  }
  return true;
}

/**
 * Retrieve a value from an object. Supports keys of the format 'foo.bar.baz[5]'
 */
exports.getVal = function (obj, key) {
  if (!obj) { return; }

  var pieces = parseKey(key);
  var index = 0;
  var n = pieces.length;
  while (obj && index < n) {
    var piece = pieces[index++];
    if (typeof piece == 'function' && Array.isArray(obj)) {
      obj = obj.filter(piece)[0];
    } else {
      obj = obj[piece];
    }
  }

  return obj;
};

/**
 * Set value in an object. Supports keys of the format 'foo.bar.baz[5]'
 */
exports.setVal = function (obj, key, value) {
  _setVal(parseKey(key), value, 0, obj);
  return obj;
}

function _setVal(pieces, value, index, obj) {
  // iterate until one before the end (the last piece is the final key to set)
  var max = pieces.length - 1;
  while (index < max) {
    var piece = pieces[index++];
    if (typeof piece == 'function') {
      // filter an array based on a filter function, all matching array items
      // should be set to the proper value recursively
      return obj.filter(piece).forEach(bind(this, _setVal, pieces, value, index));
    }

    // if the next value is not defined or of the wrong type, set it to an
    // empty object or array
    var nextType = typeof pieces[0];
    if (nextType == 'number' || nextType == 'function') {
      if (!Array.isArray(obj[piece])) {
        obj[piece] = [];
      }
    } else {
      if (typeof obj[piece] != 'object' || obj[piece] == null) {
        obj[piece] = {};
      }
    }

    obj = obj[piece];
  }

  if (typeof pieces[max] == 'function') {
    // if the last part of the path is a filter, we need to conditionally set
    // the elements in the array
    var filter = pieces[max];
    var i = obj.length;
    while (i) {
      // iterate backward in case we're deleting elements
      if (filter(obj[--i])) {
        setValueForKey(obj, i, value);
      }
    }
  } else {
    setValueForKey(obj, pieces[max], value);
  }
};
