var util = require('util');
var CompanionSocketClient = require('./CompanionSocketClient');


/**
 * @param  {String}  [opts.UUID]
 * @param  {String}  [opts.status='unavailable'] available, unavailable, occupied
 */
var RunTargetClient = function(opts) {
  CompanionSocketClient.call(this, opts);

  this.UUID = opts.UUID || null;
  this.status = opts.status || 'unavailable';

  this.name = opts.name || 'noname';
};
util.inherits(RunTargetClient, CompanionSocketClient);
var supr = CompanionSocketClient.prototype;


RunTargetClient.prototype.setSocket = function(socket) {
  supr.setSocket.call(this, socket);

  if (this.socket) {
    // Add the socket listeners
    this.on('clientInfo', this.onClientInfo.bind(this));
    this.on('updateStatus', this.updateStatus.bind(this));
    this.status = 'available';
  } else {
    this.status = 'unavailable';
  }

  // Let the server know that this run target has been updated
  this._server.updateRunTarget(this);
};

/** RunTargets are not ready immediately, they must recieve ID info from the client first */
RunTargetClient.prototype.isReady = function() {
  return this.UUID !== null;
};

/**
 * @param  {Object} runData
 * @param  {String} runData.route
 * @param  {String} runData.shortName
 * @param  {String} [runData.debuggerHost]
 */
RunTargetClient.prototype.run = function(requestor, runData) {
  if (this.status === 'unavailable') {
    if (requestor) {
      requestor._error('run_target_not_available');
    } else {
      this._logger.error('cannot stop, run target unavailable');
    }
    return;
  }

  this.send('run', runData);
};

RunTargetClient.prototype.stop = function(requestor) {
  if (this.status === 'unavailable') {
    if (requestor) {
      requestor._error('run_target_not_available');
    } else {
      this._logger.error('cannot stop, run target unavailable');
    }
    return;
  }

  this.send('stop');
};

/**
 * @param  {Object}  message
 * @param  {String}  message.UUID
 * @param  {String}  [message.name]
 */
RunTargetClient.prototype.onClientInfo = function(message) {
  if (!message.UUID) {
    this._criticalError('missing_UUID', 'onClientInfo: requires message.UUID');
    return;
  }

  //ensure that the client is only in the list once
  this._server.removeRunTargetClient(this);

  // Check for an existing client with this UUID
  var existingClient = this._server.getRunTarget(message.UUID);
  if (existingClient) {

    // Not quite sure why we are treating a newly created client as an existing one
    // We should have a list of existing ones rather then doing this which will dc the new client every time
    // this issue is by this stage the newly added client is available resulting in the following to always be true

    // If it is an active client, throw an error
    //if (existingClient.status === 'available') {
    //  this._criticalError('UUID_collision', 'onClientInfo: message.UUID not unique: ' + message.UUID);
    //  return;
    //}
    // Otherwise merge data with the existing client, and then remove the temporary entry from server memory
    this.name = existingClient.name;
    this._server.removeRunTargetClient(existingClient, {
      onlyInMemory: true
    });
  }

  this.UUID = message.UUID;
  if (message.name) {
    this.name = message.name;
  }

  this._server.addRunTargetClient(this);
  this._server.saveRunTarget(this);
  this._server.updateRunTarget(this, !existingClient);
};

/**
 * @param  {Object}  message
 * @param  {String}  message.status
 */
RunTargetClient.prototype.updateStatus = function(message) {
  if (!message.status) {
    this._criticalError('missing_status', 'updateStatus: requires message.status');
    return;
  }

  this.status = message.status;

  this._server.updateRunTarget(this, false);
};

RunTargetClient.prototype.onDisconnect = function() {
  this._logger.log('RunTargetClient disconnected', this.UUID);
  this.setSocket(null);
};

/** Get the info object to send to ui */
RunTargetClient.prototype.toInfoObject = function() {
  return {
    UUID: this.UUID,
    name: this.name,
    status: this.status
  };
};

/** Get the object containing data to be persisted between saves */
RunTargetClient.prototype.toObject = function() {
  return {
    UUID: this.UUID,
    name: this.name
  };
};

RunTargetClient.fromObject = function(server, logger, obj) {
  return new RunTargetClient({
    server: server,
    logger: logger,
    UUID: obj.UUID,
    name: obj.name
  });
};

module.exports = RunTargetClient;