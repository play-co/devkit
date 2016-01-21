import React from 'react';

import autobind from '../autobind';

import ModuleList from './ModuleList';
import {buildModuleTree} from './ModuleInfo';

export default class CurrentTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      moduleTree: null
    };

    autobind(this);
  }

  componentDidMount() {
  }

  render() {
    let children = [];
    let appData = this.props.appData;
    let moduleTree = this.state.moduleTree;

    if (appData && !moduleTree) {
      buildModuleTree(appData.modules).then((moduleTree) => {
        this.setState({
          moduleTree: moduleTree
        });
      });
    }

    if (!this.props.appData) {
      children.push(
        <div>Loading app data...</div>
      );
    }

    if (moduleTree) {
      children.push(
        <ModuleList
          moduleTree={moduleTree}
        ></ModuleList>
      );
    }

    return React.DOM.div({
      className: 'current-tab',
    }, children);
  }

}
