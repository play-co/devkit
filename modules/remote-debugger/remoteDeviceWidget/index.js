import React from 'react';
import ReactDOM from 'react-dom';

import DevkitController, {DEFAULT_TARGETS} from './DevkitController';
import RemoteDeviceWidget from './RemoteDeviceWidget';


DevkitController.initJsioConnection();

ReactDOM.render(
  React.createElement(RemoteDeviceWidget, {
    items: DevkitController.listItems
  }),
  document.getElementById('main')
);
