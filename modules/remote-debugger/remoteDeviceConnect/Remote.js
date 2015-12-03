import React from 'react';

import Instructions from './Instructions';
import Connected from './Connected';
import ConnectionLost from './ConnectionLost';

export default class RemoteDeviceConnect extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      connected: false,
      devtoolsLink: null,
      devtoolsWsId: null,
      qrText: ''
    };

    // TODO: why do we need to know the app?  seems unecessary
    this._app = '/Users/Brown/Documents/workspace/template-scene';

    // connect to the custom namespace '/remote' to avoid any collisions
    GC.RemoteAPI.init(window.location.origin + '/companion/remotesocket/ui');

    GC.RemoteAPI.on('initBrowserResponse', (message) => {
      this.setState({
        devtoolsLink: null,
        qrText: window.location.host + ',' + message.secret
      });
    });

    GC.RemoteAPI.on('clientConnected', (isConnected) => {
      debugger
      // this._ui.setPhoneConnected(isConnected);
    });

    // This is called frequently to sync serverside data with this client
    GC.RemoteAPI.on('browserData', (data) => {
      this.setState({
        devtoolsWsId: data.devtoolsWsId
      });
    });

    // Connection status
    GC.RemoteAPI.on('connectionStatus', (data) => {
      if (data.connected) {
        this.setState({ connected: true });
        GC.RemoteAPI.send('initBrowserRequest');
      } else {
        this.setState({ connected: false });
      }
    });
  }

  render = () => {
    let content;
    if (this.state.devtoolsLink) {
      content = (
        <Connected devtoolsLink={this.state.devtoolsLink} />
      );
    } else {
      content = (
        <Instructions qrText={this.state.qrText} />
      );
    }

    return (
      <div className="remote">
        <h1 className="header">Remote Device</h1>
        {content}
        <ConnectionLost visible={!this.state.connected} />
      </div>
    );
  }

}
