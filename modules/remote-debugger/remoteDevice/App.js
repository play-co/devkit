import React from 'react';

import ConnectionLost from './ConnectionLost';

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      connected: false,
    };

    // Connection status
    GC.RemoteAPI.on('connectionStatus', (data) => {
      if (data.connected) {
        this.setState({ connected: true });
      } else {
        this.setState({ connected: false });
      }
    });
  }

  render = () => {
    return (
      <div>
        {this.props.children}
        <ConnectionLost visible={!this.state.connected} />
      </div>
    );
  }
}
