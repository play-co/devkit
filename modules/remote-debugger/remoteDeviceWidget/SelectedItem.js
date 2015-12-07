import React from 'react';

import DevkitController from './DevkitController';
import autobind from '../autobind';

export default class SelectedItem extends React.Component {
  constructor(props) {
    super(props);
    autobind(this);
  }

  handleClick(e) {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    this.props.doToggleOpen();
  }

  render() {
    var selectedItem = this.props.selectedItem;
    var selectedItemName = '<none>';

    if (selectedItem) {
      selectedItemName = selectedItem.name;
    }

    let children = [
      React.DOM.div({
        key: 'btn-stop',
        className: 'selected-stop',
        onClick: this.props.doStop,
        disabled: selectedItem && selectedItem.status !== 'occupied'
      }, '■'),
      React.DOM.div({
        key: 'btn-run',
        className: 'selected-run',
        onClick: this.props.doRun,
        disabled: selectedItem && selectedItem.status === 'unavailable'
      }, '▶ Run'),
      React.DOM.div({
        key: 'btn-selected',
        className: 'selected-item',
        onClick: this.bound.handleClick
      }, selectedItemName)
    ];

    if (!DevkitController.appPath) {
      children.push(React.DOM.div({
        key: 'overlay-appPath',
        className: 'overlay app-path'
      }, 'No app specified in URL'));
    }
    else if (!GC.RemoteAPI.isConnected()) {
      children.push(React.DOM.div({
        key: 'overlay-connection',
        className: 'overlay connection'
      }, 'Waiting for devkit'));
    }

    return React.DOM.div({
        className: 'selected-container'
    }, children);
  }

}
