import PostmessageController from './PostmessageController';


export let LSKEY = 'bracketsExtensionJsio.';
export let DEFAULT_TARGETS = [
  { UUID: 'local', name: 'Simulator', icon: 'desktop', postMessage: true },
  { UUID: 'remote', name: 'Add Remote Device', icon: 'plus', postMessage: true }
];


class DevkitController {

  constructor () {
    this.listItems = null;
  }

  /**
  * @param  {Object}  targetInfo
  * @param  {String}  targetInfo.UUID
  * @param  {String}  targetInfo.name
  * @return {Object}  newRunTarget
  */
  addRunTarget = (targetInfo) => {
    if (!targetInfo.UUID) {
      console.error('error adding run target', targetInfo);
      throw new Error('run targets require a UUID');
    }
    if (this.getRunTargetById(targetInfo.UUID) !== null) {
      console.error('error adding run target', targetInfo);
      throw new Error('run targets require a UUID (one already exists)');
    }

    var newTarget = {
      UUID: targetInfo.UUID,
      name: targetInfo.name || targetInfo.UUID,
      status: targetInfo.status || 'unavailable'
    };

    this.listItems.splice(this.listItems.length - 1, 0, newTarget);
    this.reactDropdown && this.reactDropdown.render();

    return newTarget;
  }

  /** only checks for matching id's */
  removeRunTarget = (targetUUID) => {
    for (var i = this.listItems.length - 1; i >= 0; i--) {
      if (this.listItems[i].UUID === targetUUID) {
        this.listItems.splice(i, 1);
      }
    }

    this.validateCurrentSelection();
    this.reactDropdown && this.reactDropdown.forceUpdate();
  }

  /**
   * Will create a new run target with this UUID if one does not already exist
   * @param  {Object}  targetInfo
   * @param  {String}  targetInfo.UUID
   * @param  {String}  [targetInfo.name]
   * @param  {String}  [targetInfo.status]
   */
  updateRunTarget = (targetInfo) => {
    if (!targetInfo.UUID) {
      console.error('error updating run target', targetInfo);
      throw new Error('run targets require a UUID');
    }

    var targetTarget = this.getRunTargetById(targetInfo.UUID);
    if (!targetTarget) {
      targetTarget = this.addRunTarget(targetInfo);
    }

    targetTarget.status = targetInfo.status;
    if (targetInfo.name) {
      targetTarget.name = targetInfo.name;
    }

    this.validateCurrentSelection();
    this.reactDropdown && this.reactDropdown.forceUpdate();
  }

  getRunTargetById = (targetId) => {
    for (var i = this.listItems.length - 1; i >= 0; i--) {
      var testTarget = this.listItems[i];
      if (testTarget.UUID === targetId) {
        return testTarget;
      }
    }
    return null;
  }

  setRunTarget = (target) => {
    window.localStorage[LSKEY + 'runTarget'] = target;
    this.postmessageRunTarget();
  }

  postmessageRunTarget = () => {
    var target = window.localStorage[LSKEY + 'runTarget'];
    if (target) {
      PostmessageController.postMessage({
        target: 'simulator',
        action: 'setTarget',
        runTarget: target
      });
    }
  }

  validateCurrentSelection = () => {
    // Validate the currect selection (and select simulator if the current selection is no longer valid)
    /*var target = this.reactDropdown.state.selectedItem;
    if (target.status === 'unavailable' || listItems.indexOf(target) === -1) {
      this.reactDropdown.setState({
        selectedItem: listItems[0]
      });
    }*/
  }

  /** Return the TARGET object currently set by localstorage */
  getSelectedTarget = () => {
    var target = window.localStorage[LSKEY + 'runTarget'];
    if (!target) {
      return null;
    }
    for (var i = 0; i < DEFAULT_TARGETS.length; i++) {
      var testTarget = DEFAULT_TARGETS[i];
      if (testTarget.id === target) {
        return testTarget;
      }
    }
    return null;
  }

  resetListItems = () => {
    // These will be the actual items displayed in the list
    this.listItems = DEFAULT_TARGETS.slice(0);
    // Add a spacer after the local run target
    this.listItems.splice(1, 0, { spacer: true });

    // Need to make sure our dropdown is referencing the right array
    this.reactDropdown && this.reactDropdown.setState({
      items: this.listItems
    });
  }

  initJsioConnection = () => {
    // Prime the parent app with the saved run target
    this.postmessageRunTarget();
    this.resetListItems();

    var RemoteAPI = GC.RemoteAPI;
    var socketProtocol;
    if(window.location.protocol === 'http:') {
      socketProtocol = 'ws:';
    } else {
      socketProtocol = 'wss:';
    }
    var socketUrl = socketProtocol + '//' + window.location.host + '/companion/remotesocket/ui';
    RemoteAPI.init(socketUrl);

    RemoteAPI.on('connectionStatus', (data) => {
      if (data.connected) {
        RemoteAPI.send('requestRunTargetList');
      }
      this.reactDropdown && this.reactDropdown.forceUpdate();
    });

    RemoteAPI.on('runTargetList', (data) => {
      if (!Array.isArray(data.runTargets)) {
        console.error('error while consuming getRunTargetList response');
        return;
      }

      this.resetListItems();
      data.runTargets.forEach(this.addRunTarget);
    });

    RemoteAPI.on('removeRunTarget', (data) => {
      this.removeRunTarget(data.UUID);
    });
    RemoteAPI.on('updateRunTarget', (data) => {
      this.updateRunTarget(data.runTargetInfo);
    });
  }

  setDropdownInstance = (instance) => {
    this.reactDropdown = instance;
  }

}


export default new DevkitController();
