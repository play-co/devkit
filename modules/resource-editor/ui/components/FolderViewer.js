import path from 'path';
import React from 'react';
import classnames from 'classnames';
import FilePreview from './FilePreview';
import FileDrop from 'react-file-drop';

import FolderModal from './FolderModal';
import Modal from '../util/Modal';

export default class extends React.Component {

  constructor() {
    super();

    this.state = {
      selected: {}
    };
  }

  componentDidReceiveProps(props) {
    if (props.folder !== this._folder) {
      this._folder = props.folder;
    }
  }

  handleFile = (file) => {

    const filePath = file.path;
    const selected = this.state.selected;
    const isSelected = !(filePath in selected);
    if (isSelected) {
      selected[filePath] = true;
    } else {
      delete selected[filePath];
    }

    this.setState({selected});

    if (isSelected && this.props.onFile) {
      this.props.onFile(file);
    }
  }

  handleSelectAll = () => {
    const selected = this.state.selected;
    this.props.files.forEach(file => selected[file.path] = true);
    this.setState({selected});
  }

  handleUnselectAll = () => {
    this.setState({selected: {}});
  }

  handleDrop = (files, event) => {
    event.stopPropagation();

    let items = event.dataTransfer && event.dataTransfer.items;
    this.props.onDrop && this.props.onDrop(this.props.folder, items || files);
  }

  handleCopy = () => {
    const filePaths = Object.keys(this.state.selected);

    Modal.open(<FolderModal
          fs={this.props.fs}
          title="Copy Files..."
          description="Select a destination folder:" />)
      .then(folder => filePaths.map(filePath => {
        const dest = path.join(folder.path, path.basename(filePath));
        return this.props.fs.copy(filePath, dest);
      }),
      () => {
        console.log('copy cancelled');
      });
  }

  handleMove = () => {
    const filePaths = Object.keys(this.state.selected);

    Modal.open(<FolderModal
         fs={this.props.fs}
         title="Move Files..."
         description="Select a destination folder:" />)
      .then(folder => filePaths.map(filePath => {
        const dest = path.join(folder.path, path.basename(filePath));
        return this.props.fs.move(filePath, dest);
      }),
      () => {
        console.log('move cancelled');
      });
  }

  render() {
    const files = this.props.files;
    const hasSelection = Object.keys(this.state.selected).length > 0;
    return <FileDrop
              targetAlwaysVisible={true}
              className={classnames('FolderViewer', this.props.className)}
              onDrop={this.handleDrop}>
      <div className="toolbar">
        <button onClick={this.handleSelectAll}>Select All</button>
        <button onClick={this.handleUnselectAll}>Unselect All</button>
        {hasSelection && <span>
          <button onClick={this.handleCopy}>Copy...</button>
          <button onClick={this.handleMove}>Move...</button>
        </span>}
      </div>
      <div className="full-height flex">
        <div className="contents">
          {files && files.filter(file => !file.isDirectory).map(file => <FilePreview
              key={file.path}
              cwd={path.join(this.props.fs.MOUNT_POINT, this.props.fs.CWD)}
              file={file}
              className={this.state.selected[file.path] && 'selected'}
              onClick={this.handleFile} />)}
        </div>
      </div>
    </FileDrop>;
  }
}
