import React from 'react';

import DevkitController from './DevkitController';
import PostmessageController from './PostmessageController';

import SelectedItem from './SelectedItem';
import TargetList from './TargetList';

export default class RemoteDeviceWidget extends React.Component {
  constructor(props) {
    super(props);

    var items = DevkitController.listItems;
    var selectedTarget = DevkitController.getSelectedTarget();

    this.state = {
      open: false,
      items: items,
      selectedItem: selectedTarget || items[0],
      appPath: DevkitController.appPath
    };

    this._lastRenderHeight = 0;
  }

  doSelectItem = (item) => {
    // Special case for remote (fire the run immediately)
    if (item.UUID === 'remote') {
      this._sendRunMessage({
        runTarget: 'remote'
      });
      this.setState({
        open: false
      });
      return;
    }

    this.setState({
      selectedItem: item,
      open: false
    });
    DevkitController.setRunTarget(item.UUID);
  }

  _documentClickListener = (e) => {
    this.doToggleOpen(false);
  }

  _documentKeyListener = (e) => {
    if (e.keyCode === 27) {
      this.doToggleOpen(false);
    }
  }

  _blurListener = (e) => {
    this.doToggleOpen(false);
  }

  doToggleOpen = (forceState) => {
    var open = forceState !== undefined ? forceState : !this.state.open;

    this.setState({
      open: open
    });

    // Click anywhere else to close
    if (open) {
      document.addEventListener('click', this._documentClickListener);
      document.addEventListener('keydown', this._documentKeyListener);
      window.addEventListener('blur', this._blurListener);
    } else {
      document.removeEventListener('click', this._documentClickListener);
      document.removeEventListener('keydown', this._documentKeyListener);
      window.removeEventListener('blur', this._blurListener);
    }
  }

  /** Return the devkit url for a run request */
  _getRunURL = (data) => {
    let windowUrl;
    if (data.runTarget === 'local') {
      windowUrl = location.protocol + '//' + location.host;
      windowUrl += '?app=' + encodeURI(this.state.appPath);
      windowUrl += '#device={"type":"iphone6"}';
    }
    else if (data.runTarget === 'remote') {
      windowUrl = location.protocol + '//' + location.host;
      windowUrl += '/modules/remote-debugger/extension/remoteDevice/connect';
    }
    else if (data.runTarget === 'remote-info') {
      windowUrl = location.protocol + '//' + location.host;
      windowUrl += '/modules/remote-debugger/extension/remoteDevice/info';
      windowUrl += '?runTarget=' + encodeURI(data.UUID);
    }
    else {
      console.error('unknown runTarget', data.runTarget);
      return null;
    }
    return windowUrl;
  }

  _sendRunMessage = (data) => {
    // Tack on the target URL
    data.targetURL = this._getRunURL(data);
    data.target = 'simulator';
    data.action = 'run';
    // Send to parent!
    PostmessageController.postMessage(data);
  }

  /**
   * @param  {MouseEvent} [evt]
   */
  doRun = (evt) => {
    if (evt && evt.target.hasAttribute('disabled')) {
      return;
    }

    var runTarget = this.state.selectedItem;
    if (runTarget.postMessage) {
      this._sendRunMessage({
        runTarget: runTarget.UUID,
        newWindow: evt && evt.metaKey
      });
    } else {
      GC.RemoteAPI.send('run', {
        runTargetUUID: runTarget.UUID,
        appPath: this.state.appPath
      });
      // Open the remote device info
      this._sendRunMessage({
        runTarget: 'remote-info',
        UUID: runTarget.UUID,
        newWindow: evt && evt.metaKey
      });
    }
  }

  /**
   * @param  {MouseEvent} [evt]
   */
  doStop = (evt) => {
    if (evt && evt.target.hasAttribute('disabled')) {
      return;
    }

    var runTarget = this.state.selectedItem;
    if (runTarget.postMessage) {
      PostmessageController.postMessage({
        target: 'simulator',
        action: 'stop',
        runTarget: runTarget.UUID
      });
    } else {
      GC.RemoteAPI.send('stop', {
        runTargetUUID: runTarget.UUID
      });
    }
  }

  render = () => {
    var children = [
      React.createElement(SelectedItem, {
        key: 'selected-item',
        selectedItem: this.state.selectedItem,
        doToggleOpen: this.doToggleOpen,
        doRun: this.doRun,
        doStop: this.doStop
      })
    ];
    if (this.state.open) {
      children.push(
        React.createElement(TargetList, {
          key: 'target-list',
          items: this.state.items,
          selectedItem: this.state.selectedItem,
          doSelectItem: this.doSelectItem
        })
      );
    }

    // Let parent know that the height has changed
    setTimeout(function() {
      let height = document.body.offsetHeight;
      if (height !== this._lastRenderHeight) {
        this._lastRenderHeight = height;
        PostmessageController.postMessage({
          target: 'devkitRemoteWidget',
          action: 'render',
          height: height
        });
      }
    }, 50);

    return React.DOM.div({
      className: 'jsio-run-target',
    }, children);
  }

}
