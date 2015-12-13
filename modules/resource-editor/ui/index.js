import path from 'path';
import React from 'react';
import ReactDOM from 'react-dom';
import FileTree from 'react-http-fs-file-tree';
import remoteFS from 'http-fs/src/clients/fs';
import {extractFilesFromItems} from 'html5-upload-reader';

import FolderViewer from './components/FolderViewer';
import PathCrumbs from './components/PathCrumbs';
import FileInspector from './components/FileInspector';
import UploadModal from './components/UploadModal';

export default class ResourceEditor extends React.Component {
  constructor() {
    super();

    this.state = {};

    remoteFS('../../../../http-fs/', {cwd: 'resources'})
      .then(fs => this.setState({fs}));
  }

  handleFolder = (folder) => {
    this.setState({folder});
  }

  handleFile = (file) => {
    this.setState({file});
  }

  handleFilesLoaded = (folder, isSelected, subfiles) => {
    if (folder.path === this.state.folder.path) {
      this.setState({files: subfiles});
    }
  }

  handleDrop = (folder, items) => {
    extractFilesFromItems(items)
      .then(files => {
        UploadModal.open(this.state.fs, folder, files);
      });
  }

  render() {
    return <div className="MainContainer row">
        <FileTree
            fs={this.state.fs}
            onlyFolders={true}
            name="resources"
            onFile={this.handleFolder}
            onDrop={this.handleDrop}
            onFilesLoaded={this.handleFilesLoaded}
          />
        <div className="column">
          <PathCrumbs folder={this.state.folder} />
          <div className="full-height flex">
            <div className="row">
              <FolderViewer
                  className="flex"
                  fs={this.state.fs}
                  folder={this.state.folder}
                  files={this.state.files}
                  onFile={this.handleFile}
                />
              <FileInspector
                  fs={this.state.fs}
                  file={this.state.file} />
            </div>
          </div>
        </div>
      </div>;
  }
}

ReactDOM.render(<ResourceEditor />, document.getElementById('main'));
