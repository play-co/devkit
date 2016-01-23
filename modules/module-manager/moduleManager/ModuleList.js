import React from 'react';
import classNames from 'classnames';

import autobind from '../autobind';
import {modalService} from './Modal';
import {moduleVersionService} from './ModuleVersionService';

export default class ModuleList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    autobind(this);
  }

  renderItem(module) {
    return (
      <Module
        data={module}
      ></Module>
    );
  }

  render() {
    let children = [];
    let tree = this.props.moduleTree;

    tree.modules.forEach((module) => {
      children.push(this.renderItem(module));
    });

    return React.DOM.div({
      className: 'module-list',
    }, children);
  }

}

class Module extends React.Component {
  constructor(props) {
    super(props);
    autobind(this);
  }

  handleClickRemove(e) {
    modalService.showModal({
      title: 'Remove Module',
      contents: [
        <div>Are you sure you want to remove {this.props.data.name}</div>
      ],
      type: 'confirm'
    }).then(() => {
      debugger
    }, () => {
      debugger
    });
  }

  handleClickUpdate(e) {
    moduleVersionService.showForModule(this.props.data).then(() => {
      debugger
    });
  }

  renderInfoElement(data) {
    return (
      <InfoElement
        data={data}
      ></InfoElement>
    );
  }

  renderModuleLite(moduleInfo) {
    return (
      <ModuleLite
        data={moduleInfo}
      ></ModuleLite>
    );
  }

  renderUpdateItem() {
    let availableRef = '4.6.7';
    return (
      <div className='update'>
        <div>Version <span className='ref'>{availableRef}</span> available</div>
        <div className='btn btn-success' onClick={this.bound.handleClickUpdate}>update</div>
      </div>
    );
  }

  renderWarningItem() {
    let title = 'Module Version Mismatch';
    let description = 'The version specified in manifest is not the version on disk';

    return (
      <div className='warning'>
        <div className='title'>{title}</div>
        <div className='description'>{description}</div>
      </div>
    );
  }

  render() {
    let children = [];
    let data = this.props.data;

    children.push(
      <div className='title-row'>
        <div className='title'>{data.name}</div>
        <div className='ref'>#{data.ref}</div>
        <div className='spacer'></div>
        <div
          className='btn btn-danger'
          onClick={this.bound.handleClickRemove}
        >remove</div>
      </div>
    );

    let infoElements = [];

    infoElements.push({
      title: 'Warnings',
      className: 'warnings',
      children: [
        this.renderWarningItem()
      ]
    });

    infoElements.push({
      title: 'Updates',
      className: 'updates',
      description: 'Updates are available for this module!',
      children: [
        this.renderUpdateItem()
      ]
    });

    if (data.dependencies.length) {
      infoElements.push({
        title: 'Includes',
        className: 'includes',
        description: 'These modules are included as a result of ' + data.name,
        children: data.dependencies.map(this.renderModuleLite)
      });
    }

    children.push(
      <div className='info-elements'>{infoElements.map(this.renderInfoElement)}</div>
    );

    return React.DOM.div({
      className: 'module',
    }, children);
  }
}

class InfoElement extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let data = this.props.data;
    return (
      <div
        className={classNames('info-item', data.className)}
      >
        <div className='title'>{data.title}</div>
        <div className='description'>{data.description}</div>
        <div className='children'>
          {data.children}
        </div>
      </div>
    );
  }
}


class ModuleLite extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let data = this.props.data;
    return (
      <div
        className='module-lite'
      >
        <div className='name'>{data.name}</div>
        <div className='ref'>#{data.ref}</div>
      </div>
    );
  }
}
