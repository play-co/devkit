import React from 'react';
import Modal from './Modal';
import FileTree from 'react-http-fs-file-tree';

export default class FolderModal extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  handleSelect = (_event) => {
    Modal.close(this.state.folder);
  };

  handleFolder = (folder) => {
    this.setState({folder});
  };

  handleClose = () => {
    Modal.cancel();
  };

  render() {
    return <div className="FolderModal modal">
      <div className="title row">
        <div className="flex">{this.props.title}</div>
        <i className="fa fa-times" onClick={this.handleClose} />
      </div>
      <div className="contents">

        {this.props.description && <div className="description">
          {this.props.description}
        </div>}

        <FileTree
            fs={this.props.fs}
            onlyFolders={true}
            name="resources"
            onFile={this.handleFolder}
            />
      </div>
      <div className="footer row">
        <div className="flex">
          selected: <span className="selection">resources/{this.state.folder && this.state.folder.path}</span>
        </div>
        <button onClick={this.handleSelect}>select <i className="fa fa-arrow-right" /></button>
      </div>
    </div>;
  }
}
