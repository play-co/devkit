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

/**
 * @class DestinationExistsError
 */

function DestinationExistsError (message) {
  this.message = message;
  this.name = 'DestinationExistsError';
  Error.captureStackTrace(this, DestinationExistsError);
}

DestinationExistsError.prototype = Object.create(Error.prototype);
DestinationExistsError.prototype.constructor = DestinationExistsError;

exports.DestinationExistsError = DestinationExistsError;
