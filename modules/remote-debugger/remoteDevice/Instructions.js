import React from 'react';
import QRCode from 'qrcode.react';

export default class Instructions extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      appBuildLink: 'https://builds.js.io/#/k6rz/5683555321511936',
      qrSize: 256
    };
  }

  render() {
    return (
      <div className="cmpt-instructions">
        <div className="qrcode">
          <QRCode value={this.props.qrText} size={this.state.qrSize} />
        </div>
        <div className="instructions">
          <p className="bold">Instructions</p>
          <p>
            1. Download and Install the <a href={this.state.appBuildLink} target="_blank">js.io Companion App</a>
          </p>
          <p>2. Open the companion app and scan this QR code</p>
        </div>
      </div>
    );
  }

}
