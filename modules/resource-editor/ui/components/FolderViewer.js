import path from 'path';
import React from 'react';
import classnames from 'classnames';
import FilePreview from './FilePreview';
import FileDrop from 'react-file-drop';

export default class extends React.Component {

  componentDidReceiveProps(props) {
    if (props.folder !== this._folder) {
      this._folder = props.folder;
    }
  }

  handleDrop = (files, event) => {
    event.stopPropagation();

    let items = event.dataTransfer && event.dataTransfer.items;
    this.props.onDrop && this.props.onDrop(this.props.folder, items || files);
  }

  render() {
    var files = this.props.files;
    return <FileDrop
              targetAlwaysVisible={true}
              className={classnames('FolderViewer', this.props.className)}
              onDrop={this.handleDrop}>
      {files && files.filter(file => !file.isDirectory).map(file => <FilePreview
          key={file.path}
          cwd={path.join(this.props.fs.MOUNT_POINT, this.props.fs.CWD)}
          file={file}
          onClick={this.props.onFile} />)}
    </FileDrop>;
  }
}
