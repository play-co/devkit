import React from 'react';

export default class ConnectionLost extends React.Component {
  constructor(props) {
    super(props);
  }

  render = () => {
    var className = 'cmpt-connection-lost spinnerContainer';
    if (this.props.visible) {
      className += ' visible';
    }

    return (
      <div className={className}>
        <div className="spinner"></div>
        <p>Connection lost to devkit</p>
      </div>
    );
  }

}
