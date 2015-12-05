import React from 'react';

import { getQuery } from './urlParams';
import RunTargetInfo from './RunTargetInfo';

export default class PageInfo extends React.Component {
  constructor(props) {
    super(props);

    GC.RemoteAPI.init(window.location.origin + '/companion/remotesocket/ui');

    GC.RemoteAPI.on('clientConnected', (isConnected) => {
      debugger
      // this._ui.setPhoneConnected(isConnected);
    });

  }

  render = () => {
    let runTarget = getQuery('runTarget');
    let content;
    if (runTarget) {
      content = (
        <RunTargetInfo runTarget={runTarget} />
      );
    } else {
      content = (
        <p>No run target specified</p>
      );
    }

    return (
      <div className="cmpt-page-info">
        <h1 className="header">Remote Device Info</h1>
        {content}
      </div>
    );
  }

}
