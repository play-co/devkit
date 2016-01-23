import React from 'react';
import Promise from 'bluebird';
import classNames from 'classnames';

import autobind from '../autobind';


export default class Modal extends React.Component {
  constructor(props) {
    super(props);
    autobind(this);
  }

  onAccept() {
    modalService.close(this.props.id);
    this.props.res();
  }

  onCancel() {
    modalService.close(this.props.id);
    this.props.rej();
  }

  componentDidMount() {
    let opts = this.props.opts;
    if (opts.onShow) {
      opts.onShow(this);
    }
  }

  render() {
    let opts = this.props.opts;
    let buttons = [];

    if (opts.type === 'confirm') {
      buttons.push(
        <div className='btn' onClick={this.bound.onAccept}>yes</div>
      );
      buttons.push(
        <div className='btn' onClick={this.bound.onCancel}>no</div>
      );
    }

    let className = classNames({
      'modal': true
    });

    let backdrop;
    if (opts.withBackdrop !== false) {
      backdrop = (
        <div className='backdrop' onClick={this.bound.onCancel}></div>
      );
    }

    let modalBody;
    if (opts.body) {
      modalBody = opts.body;
    } else {
      modalBody = (
        <div className='body'>
          <div className='title'>
            {opts.title}
          </div>
          <div className='contents'>
            {opts.contents}
          </div>
          <div className='button-row'>
            {buttons}
          </div>
        </div>
      );
    }

    return (
      <div className={className}>
        {backdrop}
        {modalBody}
      </div>
    );
  }
}

class ModalService {
  constructor() {
    this._containers = [];
    this._modals = [];
  }

  _update() {
    this._containers.forEach((container) => {
      container.forceUpdate();
    });
  }

  showModal(opts) {
    return new Promise((res, rej) => {
      let id = this._id++;
      this._modals[id] = (
        <Modal
          opts={opts}
          res={res}
          rej={rej}
          id={id}
        ></Modal>
      );
      this._update();
    });
  }

  getModals() {
    return Object.keys(this._modals).map(key => this._modals[key]);
  }

  close(modalId) {
    delete this._modals[modalId];
    this._update();
  }

  registerContainer(component) {
    this._containers.push(component);
  }
}

export var modalService = new ModalService();
