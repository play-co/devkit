import React from 'react';
import QRCode from 'qrcode.react';

export default class Instructions extends React.Component {
  constructor(props) {
    super(props);
  }

  render = () => {
    return (
      <div className="cmpt-connected">
        <div className="device">
          <img className="device-image"></img>
          <div className="dimensions">WWW x HHH</div>
        </div>
        <a className="devtools-link btn" href="{this.props.devtoolsLink}"></a>
      </div>
    );
  }

}
