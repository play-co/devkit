import React from 'react';

import { getQuery } from './urlParams';
import autobind from '../autobind';

export default class RunTargetInfo extends React.Component {
  constructor(props) {
    super(props);

    this.requests = 0;

    this.state = {
      runTargetInfo: null,
      errorMessage: null,

      devtoolsLink: null
    };
    autobind(this);

    // This is called frequently to sync serverside data with this client
    GC.RemoteAPI.on('browserData', this.bound._updateDevtoolsLink);

    GC.RemoteAPI.on('updateRunTarget', (data) => {
      if (data.runTargetInfo.UUID === this.props.runTarget) {
        this.setState({ runTargetInfo: data.runTargetInfo });
      }
    });
  }

  _updateDevtoolsLink(data) {
    if (data && this.props.runTarget === data.runTargetUUID && data.devtoolsWsId) {
      let ws;
      let url;
      if (/js\.io/.test(location.hostname)) {
        ws = location.hostname.replace(/^devkit-/, 'devtools-')
          + '/devtools/page/' + data.devtoolsWsId;
        url = 'http://devtools.js.io/v1/front_end/inspector.html';
      } else {
        ws = 'localhost:9223/devtools/page/' + data.devtoolsWsId;
        url = 'chrome-devtools://devtools/bundled/inspector.html';
      }

      this.setState({
        devtoolsLink: url + '?ws=' + ws
      });
    } else {
      this.setState({
        devtoolsLink: null
      });
    }
  }

  // TODO: one day this should match what your debugging device is
  _getDeviceImage() {
    return '/images/' + 'iphone6.png';
  }

  render() {
    // Update the local run target info
    if (this.props.runTarget && !this.state.errorMessage) {
      if (!this.state.runTargetInfo || this.state.runTargetInfo.UUID !== this.props.runTarget) {
        console.log('requesting run target info:', this.props.runTarget);

        this.requests++;
        if (this.requests > 10) {
          this.setState({ errorMessage: 'Request limit exceeded' });
        }

        GC.RemoteAPI.send('inspectRunTarget', {
          runTargetUUID: this.props.runTarget
        }, (data) => {
          console.log('got run target info:', data);
          if (!data.success) {
            this.setState({ errorMessage: data.message });
            return;
          }
          this.setState({ runTargetInfo: data.runTargetInfo });
        });
      }
    }

    let content;
    let errorMessage;
    if (this.state.runTargetInfo) {
      let devtoolsButton;
      if (this.state.devtoolsLink) {
        devtoolsButton = <a className="devtools-link btn" href={this.state.devtoolsLink} target="_blank">Open dev tools</a>;
      } else {
        devtoolsButton = <a className="devtools-link btn" disabled="true">Open dev tools</a>
      }

      content = (
        <div className="content">
          <p className="name">{this.state.runTargetInfo.name}</p>
          <p className="uuid">{this.state.runTargetInfo.UUID}</p>
          <p className="status">Status: {this.state.runTargetInfo.status}</p>

          <div className="device">
            <img className="device-image" src={this._getDeviceImage()}></img>
            <div className="dimensions">{this.state.runTargetInfo.deviceInfo.width}px X {this.state.runTargetInfo.deviceInfo.height}px</div>
          </div>

          {devtoolsButton}
        </div>
      );
    } else {
      content = (
        <div className="loading-content">
          <p>Loading info for:</p>
          <p className="uuid">{this.props.runTarget}</p>
        </div>
      );
    }

    if (this.state.errorMessage) {
      errorMessage = (
        <div className="error-message">{this.state.errorMessage}</div>
      );
    }

    return (
      <div className="cmpt-run-target-info">
        {content}
        {errorMessage}
      </div>
    );
  }

}
