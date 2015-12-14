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
import Modal from './components/Modal';

import { createHistory } from 'history';

export default class ResourceEditor extends React.Component {
  constructor() {
    super();

    this.state = {};

    this._onFileSystem = remoteFS('../../../../http-fs/', {cwd: 'resources'})
      .then(fs => this.setState({fs}));

    var match = location.pathname.match(/^(.*?\/extension\/ui\/)(.*?)$/);
    this.basePathname = match[1];
    this.initialPath = match[2];

    this.history = createHistory();
    this.history.listen(location => {
      console.log(location.pathname);
    });
  }

  componentDidMount() {
    if (this.initialPath) {
      this._onFileSystem.then(() => {
        this.refs.fileTree.selectPath(this.initialPath);
      });
    }
  }

  handleFolder = (folder, files) => {
    this.setState({folder, files});
    this.updatePath(folder.path);
  }

  handleFile = (file) => {
    this.setState({file});
  }

  handleFilesLoaded = (folder, isSelected, subfiles) => {
    if (this.state.folder && folder.path === this.state.folder.path) {
      this.setState({files: subfiles});
    }
  }

  handleDrop = (folder, items) => {
    extractFilesFromItems(items)
      .then(files => {
        // remove files that start with a dot
        files = files.filter(file => file.data && file.data.name && !/^\./.test(file.data.name));

        Modal.open(<UploadModal {...{fs: this.state.fs, folder, files}} />);
      });
  }

  handleNavigate = (folderPath) => {
    const fileTree = this.refs.fileTree;
    if (!fileTree) { return; }

    fileTree.selectPath(folderPath);
  }

  updatePath(folderPath) {
    this.history.push({
      pathname: path.join(this.basePathname, folderPath)
    });
  }

  render() {
    return <div className="MainContainer row">
        <FileTree
            ref="fileTree"
            fs={this.state.fs}
            onlyFolders={true}
            name="resources"
            onFile={this.handleFolder}
            onDrop={this.handleDrop}
            onFilesLoaded={this.handleFilesLoaded}
          />
        <div className="column">
          <PathCrumbs folder={this.state.folder} onNavigate={this.handleNavigate} />
          <div className="full-height flex">
            <div className="row">
              <FolderViewer
                  className="flex"
                  fs={this.state.fs}
                  folder={this.state.folder}
                  files={this.state.files}
                  onFile={this.handleFile}
                  onDrop={this.handleDrop}
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
