import React from 'react';

export default class PathCrumbs extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  render() {
    var folder = this.props.folder;
    var crumbs = [];
    if (folder) {
      crumbs = folder.path.split('/').filter(a => a);
    }

    return <div className="PathCrumbs">
      {crumbs.map((crumb, index) => <div className="crumb" key={index}>
          {crumb}
        </div>)}
    </div>;
  }
}
