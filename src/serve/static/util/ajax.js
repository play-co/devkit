import util.ajax;
import .bluebird as Promise;

exports.get = Promise.promisify(util.ajax.get);
exports.post = Promise.promisify(util.ajax.post);
