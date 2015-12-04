import React from 'react';

import DevkitController from './DevkitController';
import PostmessageController from './PostmessageController';

import SelectedItem from './SelectedItem';
import TargetList from './TargetList';

export default class RemoteDeviceWidget extends React.Component {
  constructor(props) {
    super(props);

    var selectedTarget = DevkitController.getSelectedTarget();
    this.state = {
      open: false,
      selectedItem: selectedTarget || this.props.items[0]
    }
  }

  doSelectItem = (item) => {
    // Special case for remote (fire the run immediately)
    if (item.UUID === 'remote') {
      PostmessageController.postMessage({
        target: 'simulator',
        action: 'run',
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

  doToggleOpen = (forceState) => {
    var open = forceState !== undefined ? forceState : !this.state.open;

    this.setState({
      open: open
    });

    // Click anywhere else to close
    if (open) {
      document.addEventListener('click', this._documentClickListener);
      document.addEventListener('keydown', this._documentKeyListener);
    } else {
      document.removeEventListener('click', this._documentClickListener);
      document.removeEventListener('keydown', this._documentKeyListener);
    }
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
      PostmessageController.postMessage({
        target: 'simulator',
        action: 'run',
        runTarget: runTarget.UUID,
        newWindow: evt && evt.metaKey
      });
    } else {
      GC.RemoteAPI.send('run', {
        runTargetUUID: runTarget.UUID
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
          items: this.props.items,
          selectedItem: this.state.selectedItem,
          doSelectItem: this.doSelectItem
        })
      );
    }

    return React.DOM.div({
      className: 'jsio-run-target',
    }, children);
  }

}
