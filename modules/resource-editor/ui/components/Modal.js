import React from 'react';
import ReactDOM from 'react-dom';
import classnames from 'classnames';
import FilePreview from './FilePreview';

export let overlay = null;

let onClose;

let Modal = {
  open: function (Modal) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
    }

    document.body.appendChild(overlay);
    ReactDOM.render(Modal, overlay);
    return new Promise((resolve, reject) => {
      onClose = {resolve, reject};
    });
  },
  close: function (res) {
    _close();
    onClose && onClose.resolve(res);
  },
  cancel: function (err) {
    _close();
    onClose && onClose.reject(err);
  }
};

export default Modal;

function _close() {
  ReactDOM.unmountComponentAtNode(overlay);
  document.body.removeChild(overlay);
}

class FileLineItem extends React.Component {
  render() {
    const file = this.props.file;
    return <div className={classnames('FileLineItem', 'row', this.props.className)}>
      <FilePreview className="small" fs={this.props.fs} file={file} />
      <label className="flex">{file.path}</label>
    </div>;
  }
}

export class ConfirmModal extends React.Component {
  render() {
    const files = this.props.files;
    const fs = this.props.fs;

    return <div className="ConfirmModal modal">
      <div className="title row">
        <div className="flex">{this.props.title || ''}</div>
        <i className="fa fa-times" onClick={this.handleClose} />
      </div>
      <div className="contents">
        <div className="description">{this.props.description || ''}</div>
        {this.props.files && <div className="FileList">
          {files.map(file => <FileLineItem key={file.path} fs={fs} file={file} />)}
        </div>}
      </div>
      <div className="footer">
        <div className="flex" />
        <button onClick={Modal.cancel}>{this.props.cancelText || 'cancel'}</button>
        <button onClick={Modal.close}>{this.props.confirmText || 'ok'} <i className="fa fa-arrow-right" /></button>
      </div>
    </div>;
  }
}

export class AlertModal extends React.Component {
  render() {
    return <div className="AlertModal modal">
      <div className="title row">
        <div className="flex">{this.props.title || ''}</div>
        <i className="fa fa-times" onClick={this.handleClose} />
      </div>
      <div className="contents">
        <div>{this.props.description || ''}</div>
      </div>
      <div className="footer">
        <div className="flex" />
        <button onClick={Modal.close}>{this.props.confirmText || 'ok'} <i className="fa fa-arrow-right" /></button>
      </div>
    </div>;
  }
}
