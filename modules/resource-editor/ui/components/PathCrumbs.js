import React from 'react';

export default class PathCrumbs extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  handleClick(index) {
    return () => {
      const folder = this.props.folder.path;
      const selectedPath = folder.split('/').slice(0, index + 1).join('/') || '/';
      this.props.onNavigate && this.props.onNavigate(selectedPath);
    };
  }

  render() {
    const folder = this.props.folder;
    let crumbs = [];
    if (folder) {
      crumbs = folder.path.split('/').filter(a => a);
    }

    return <div className="PathCrumbs">
      <div className="crumb" onClick={this.handleClick(-1)}>/</div>
      {crumbs.map((crumb, index) => <div
            className="crumb"
            key={index} onClick={this.handleClick(index)}>
          {crumb}
        </div>)}
    </div>;
  }
}
