import path from 'path';
import React from 'react';
import filesize from 'filesize';

import mime from 'mime';
import FilePreview from './FilePreview';

const FILE_SIZE_OPTS = {
  spacer: ''
};

export default class FileInspector extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  handleImageSize = (width, height) => {
    this.setState({dimensions: width + 'x' + height});
  }

  render() {
    const file = this.props.file;
    if (!file) { return <div className="FileInspector" />; }

    const mimeType = mime.lookup(file.path);

    return <div className="FileInspector">
      <FilePreview
        fs={this.props.fs}
        file={file}
        onImageSize={this.handleImageSize} />
      <div className="metadata">
        <div className="filePath">directory: {path.dirname(file.path)}</div>
        <div className="mimeType">mime type: {mimeType}</div>
        {('size' in file) && <div className="fileSize">file size: {filesize(file.size, FILE_SIZE_OPTS).toUpperCase()}</div>}
        {this.state.dimensions && <div className="dimensions">dimensions: {this.state.dimensions}</div>}
      </div>
    </div>;
  }
}
