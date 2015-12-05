import React from 'react';

import { getQuery } from './urlParams';

export default class RunTargetInfo extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      runTargetInfo: null,
      errorMessage: null,

      devtoolsLink: null
    };

    GC.RemoteAPI.on('runTargetInfo', (data) => {
      console.log('got run target info:', data);
      if (data.UUID === this.props.runTarget) {
        this.setState({ runTargetInfo: data });
      }
    });

    GC.RemoteAPI.on('clientConnected', function (isConnected) {
      debugger
    }.bind(this));

    // This is called frequently to sync serverside data with this client
    GC.RemoteAPI.on('browserData', (data) => {
      this._updateDevtoolsLink(data);
    });

    GC.RemoteAPI.on('APIError', (data) => {
      console.error('API Error:', data);
      this.setState({
        errorMessage: data.errorType + ': ' + data.reason
      });
    });
  }

  _updateDevtoolsLink = (data) => {
    if (data && data.devtoolsWsId) {
      var ws, url;
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
  _getDeviceImage = () => {
    return '/images/' + 'iphone6.png';
  }

  render = () => {
    // Update the local run target info
    if (this.props.runTarget && !this.state.errorMessage) {
      if (!this.state.runTargetInfo || this.state.runTargetInfo.UUID !== this.props.runTarget) {
        console.log('requesting run target info:', this.props.runTarget);
        GC.RemoteAPI.send('inspectRunTarget', {
          runTargetUUID: this.props.runTarget
        });
      }
    }

    let content;
    let errorMessage;
    if (this.state.runTargetInfo) {
      let devtoolsButton;
      if (this.state.devtoolsLink) {
        devtoolsButton = <a className="devtools-link btn" href="{this.state.devtoolsLink}">Open dev tools</a>;
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
