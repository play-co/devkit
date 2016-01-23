import React from 'react';

import autobind from '../autobind';

import ModuleList from './ModuleList';
import {buildModuleTree} from './ModuleInfo';

export default class AvailableTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      availableModules: [
        {
          title: 'devkit-core',
          url: 'https://github.com/gameclosure/devkit-core'
        },
        {
          title: 'devkit-scene',
          url: 'https://github.com/gameclosure/devkit-scene'
        }
      ]
    };

    autobind(this);
  }

  componentDidMount() {
  }

  renderItem(item) {
    return (
      <div className='available-item'>
        <div className='title'>{item.title}</div>
        <div className='spacer'></div>
        <div className='btn btn-info'>more info</div>
      </div>
    );
  }

  render() {

    return React.DOM.div({
      className: 'available-tab',
    }, this.state.availableModules.map(this.renderItem));
  }

}
