import path from 'path';
import React from 'react';

import FilePreview from './FilePreview';

export default class FileInspector extends React.Component {
  constructor() {
    super();

    this.actions = [
      {name: 'delete'},
      {name: 'move'},
      {name: 'copy'}
    ];

    this.state = {};
  }

  render() {
    let file = this.props.file;

    return <div className="FileInspector">
      {file && <div>
        <FilePreview cwd={path.join(this.props.fs.MOUNT_POINT, this.props.fs.CWD)} file={file} />
        <div className="filePath">{file.path}</div>
        {this.actions.map(action => <div className="action" key={action.name}>
          {action.name}
        </div>)}
      </div>}
    </div>;
  }
}
