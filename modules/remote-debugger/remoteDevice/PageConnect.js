import React from 'react';

import Instructions from './Instructions';

export default class PageConnect extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      qrText: ''
    };

    // connect to the custom namespace '/remote' to avoid any collisions
    GC.RemoteAPI.init(window.location.origin + '/companion/remotesocket/ui');

    GC.RemoteAPI.on('initBrowserResponse', (message) => {
      let protocol = window.location.protocol === 'http:' ? '0' : '1';
      let host = window.location.host;

      this.setState({
        qrText: protocol + ',' + host + ',' + message.secret
      });
    });

    GC.RemoteAPI.on('connectionStatus', (data) => {
      if (data.connected) {
        GC.RemoteAPI.send('initBrowserRequest');
      }
    });
  }

  render = () => {
    return (
      <div className="cmpt-page-connect">
        <h1 className="header">Remote Device Connect</h1>
        <Instructions qrText={this.state.qrText} />
      </div>
    );
  }

}
