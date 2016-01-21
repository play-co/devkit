import url from 'url';

import React from 'react';
import Tabs from 'react-simpletabs';

import autobind from '../autobind';

import DevkitAPI from './DevkitAPI';
import CurrentTab from './CurrentTab';
import AvailableTab from './AvailableTab';

export default class ModuleManager extends React.Component {
  constructor(props) {
    super(props);

    let urlObject = url.parse(window.location.href, true);
    let appPath = urlObject.query.app;

    this.state = {
      appData: null,
      error: null,
      appPath: appPath
    };

    autobind(this);
  }

  componentDidMount() {
    DevkitAPI.get('api/app', {
      app: this.state.appPath
    }).then((res) => {
      if (!res.json) {
        this.setState({ error: 'Could not load app data!' });
        console.error(arguments);
        return;
      }

      this.setState({
        appData: res.json
      });
    });
  }

  render() {
    let children = [];
    let appData = this.state.appData;

    let titleText;
    if (appData) {
      titleText = (
        <span className='app-title'>{appData.title}</span>
      );
    }

    children.push(
      <div className='header'>
        <div>Module Manager {titleText}</div>
      </div>
    );

    children.push(
      <Tabs>
        <Tabs.Panel title='Current'>
          <CurrentTab
            appData={appData}
          ></CurrentTab>
        </Tabs.Panel>
        <Tabs.Panel title='Available'>
          <AvailableTab
            appData={appData}
          ></AvailableTab>
        </Tabs.Panel>
      </Tabs>
    );

    return React.DOM.div({
      className: 'module-manager',
    }, children);
  }

}
