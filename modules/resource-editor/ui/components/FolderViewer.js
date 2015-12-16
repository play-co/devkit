import path from 'path';
import React from 'react';
import classnames from 'classnames';
import FilePreview from './FilePreview';
import FileDrop from 'react-file-drop';

import FolderModal from './FolderModal';
import Modal, {AlertModal, ConfirmModal} from './Modal';

export default class extends React.Component {

  constructor() {
    super();

    this.state = {
      selected: {},
      selectMultiple: false
    };
  }

  componentDidReceiveProps(props) {
    if (props.folder !== this._folder) {
      this._folder = props.folder;
    }
  }

  handleFile = (file, event) => {
    const hasMeta = event.ctrlKey || event.altKey || event.metaKey || event.shiftKey;
    const filePath = file.path;
    const selected = this.state.selected;
    const isSelected = !(filePath in selected);
    if (isSelected) {
      selected[filePath] = true;
    } else {
      delete selected[filePath];
    }

    if (!this.state.selectMultiple && !hasMeta) {
      Object.keys(selected).forEach(selectedPath => {
        if (filePath !== selectedPath) {
          delete selected[selectedPath];
        }
      });
    }

    this.setState({selected});

    if (isSelected && this.props.onFile) {
      this.props.onFile(file);
    }
  }

  handleMultiSelect = () => {
    const selectMultiple = !this.state.selectMultiple;
    const newState = {selectMultiple};
    if (!selectMultiple) {
      newState.selected = {};
      let lastKey = null;
      for (let key in this.state.selected) { lastKey = key; }
      if (lastKey) {
        newState.selected[lastKey] = true;
      }
    }

    this.setState(newState);
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

  handleDelete = () => {
    const filePaths = Object.keys(this.state.selected);
    const fs = this.props.fs;
    const files = this.props.files.filter(file => file.path in this.state.selected);

    Modal.open(<ConfirmModal
          title="Delete Files..."
          description="Are you sure you want to delete these files?"
          files={files}
          fs={this.props.fs}
        />)
      .then(() => {
        return Promise.all(filePaths.map(filePath => fs.unlink(filePath)))
          .catch(e => {
            Modal.open(<AlertModal contents={e} />);
          })
          .then(() => this.refresh());
      }, () => console.log('delete cancelled'));
  }

  handleCopy = () => {
    const filePaths = Object.keys(this.state.selected);
    const fs = this.props.fs;

    Modal.open(<FolderModal
          fs={this.props.fs}
          title="Copy Files..."
          description="Select a destination folder:"
          action="Copy Files" />)
      .then(folder => filePaths.map(filePath => {
        const dest = path.join(folder.path, path.basename(filePath));
        return fs.copy(filePath, dest);
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
         description="Select a destination folder:"
         action="Move Files" />)
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
    const selectedCount = Object.keys(this.state.selected).length;
    const hasSelection = selectedCount > 0;
    let selectedText;
    if (hasSelection) {
      selectedText = selectedCount + ' item';
      if (selectedCount > 1) {
        selectedText += 's';
      }
    }
    return <FileDrop
              targetAlwaysVisible={true}
              className={classnames('FolderViewer', this.props.className)}
              onDrop={this.handleDrop}>
      <div className="toolbar">
        <button
          className={classnames('selectMultiple', this.state.selectMultiple && 'enabled')}
          onClick={this.handleMultiSelect}>
            Select Multiple
        </button>
        <button onClick={this.handleSelectAll}>Select All</button>
        <button onClick={this.handleUnselectAll}>Unselect All</button>
      </div>

      <div className="toolbar toolbar-selected-items">
        {hasSelection && <span>
          <div>{selectedText}</div>
          <button onClick={this.handleDelete}>
            <i className="fa fa-times" />
            Delete...
          </button>
          <button onClick={this.handleCopy}>
            <i className="fa fa-copy" />
            Copy...
          </button>
          <button onClick={this.handleMove}>
            <span className="icon-move">
              <i className="fa fa-file-o"></i>
              <i className="fa fa-arrow-right"></i>
            </span>
            Move...
          </button>
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
