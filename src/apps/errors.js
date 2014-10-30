/**
 * @class ApplicationNotFoundError
 */

function ApplicationNotFoundError (message) {
  this.message = message;
  this.name = 'ApplicationNotFoundError';
  Error.captureStackTrace(this, ApplicationNotFoundError);
}

ApplicationNotFoundError.prototype = Object.create(Error.prototype);
ApplicationNotFoundError.prototype.constructor = ApplicationNotFoundError;

exports.ApplicationNotFoundError = ApplicationNotFoundError;
