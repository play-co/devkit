import path from 'path';
import React from 'react';
import classnames from 'classnames';
import FilePreview from './FilePreview';

export default class extends React.Component {

  componentDidReceiveProps(props) {
    if (props.folder !== this._folder) {
      this._folder = props.folder;
    }
  }

  render() {
    var files = this.props.files;
    return <div className={classnames("FolderViewer", this.props.className)}>
      {files && files.filter(file => !file.isDirectory).map(file => <FilePreview
          key={file.path}
          cwd={path.join(this.props.fs.MOUNT_POINT, this.props.fs.CWD)}
          file={file}
          onClick={this.props.onFile} />)}
    </div>;
  }
}
