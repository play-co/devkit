/**
 * @class UnknownGitRevision
 */

function UnknownGitRevision (message) {
  this.message = 'unknown revision: ' + message;
  this.name = 'UnknownGitRevision';
  Error.captureStackTrace(this, UnknownGitRevision);
}

UnknownGitRevision.prototype = Object.create(Error.prototype);
UnknownGitRevision.prototype.constructor = UnknownGitRevision;

exports.UnknownGitRevision = UnknownGitRevision;

/**
 * @class FatalGitError
 */

function FatalGitError (message) {
  this.message = message.replace(/\n$/, '');
  this.name = 'FatalGitError';
  Error.captureStackTrace(this, FatalGitError);
}

FatalGitError.prototype = Object.create(Error.prototype);
FatalGitError.prototype.constructor = FatalGitError;

exports.FatalGitError = FatalGitError;

/**
 * @class UnknownGitOption
 */

function UnknownGitOption (message) {
  this.message = message;
  this.name = 'UnknownGitOption';
  Error.captureStackTrace(this, UnknownGitOption);
}

UnknownGitOption.prototype = Object.create(Error.prototype);
UnknownGitOption.prototype.constructor = UnknownGitOption;

exports.UnknownGitOption = UnknownGitOption;
