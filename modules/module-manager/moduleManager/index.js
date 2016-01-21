import React from 'react';
import ReactDOM from 'react-dom';

// import DevkitController, {DEFAULT_TARGETS} from './DevkitController';
import ModuleManager from './ModuleManager';


// DevkitController.initJsioConnection();

let dropdown = ReactDOM.render(
  React.createElement(ModuleManager, {}),
  document.getElementById('main')
);
