function DirectoryCollision (message) {
  this.message = message;
  this.name = 'DirectoryCollision';
  Error.captureStackTrace(this, DirectoryCollision);
}
DirectoryCollision.prototype = Object.create(Error.prototype);
DirectoryCollision.prototype.constructor = DirectoryCollision;
exports.DirectoryCollision = DirectoryCollision;



function DirtyRepo (message, files) {
  this.message = message;
  this.files = files;
  this.name = 'DirtyRepo';
  Error.captureStackTrace(this, DirtyRepo);
}
DirtyRepo.prototype = Object.create(Error.prototype);
DirtyRepo.prototype.constructor = DirtyRepo;
exports.DirtyRepo = DirtyRepo;


function UnknownLocalCommit (message) {
  this.message = message;
  this.name = 'UnknownLocalCommit';
  Error.captureStackTrace(this, UnknownLocalCommit);
}
UnknownLocalCommit.prototype = Object.create(Error.prototype);
UnknownLocalCommit.prototype.constructor = UnknownLocalCommit;
exports.UnknownLocalCommit = UnknownLocalCommit;
