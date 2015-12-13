import path from 'path';
import React from 'react';
import classnames from 'classnames';

import {imageLoader} from '../util/ImageLoader';
import IMAGE_TYPES from '../util/ImageTypes';

export default class FilePreview extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  componentDidMount() {
    this.updateProps(this.props);
  }

  componentWillReceiveProps(props) {
    this.updateProps(props);
  }

  updateProps(props) {
    let file = props.file;
    if (file.path !== this._path) {
      this._path = file.path;

      let cwd = this.props.cwd;
      if (!cwd && this.props.fs) {
        cwd = path.join(this.props.fs.MOUNT_POINT, this.props.fs.CWD);
      }

      let isImage = path.extname(file.path) in IMAGE_TYPES;
      let src = isImage && !file.data
        ? path.join(cwd, file.path)
        : '';

      this.setState({src});

      if (isImage && file.data && file.data instanceof File) {
        var reader = new FileReader();
        reader.onload = res => this.setState({src: res.target.result});
        reader.readAsDataURL(file.data);
      }
    }
  }

  handleClick = (event) => {
    this.props.onClick && this.props.onClick(this.props.file, event);
  }

  refresh() {
    let src = this.state.src;
    imageLoader.load(src)
      .then(({width, height}) => {
        let thumbnail = this.refs.thumbnail;
        let isContain = width > thumbnail.offsetWidth
                     || height > thumbnail.offsetHeight;
        thumbnail.style.backgroundSize = isContain ? 'contain' : 'initial';
      }, () => {
        console.error(`couldn't load ${this.props.file.path}`);
      });
  }

  render() {
    let file = this.props.file;
    let src = this.state.src || '';
    if (src) { this.refresh(); }

    return <div className={classnames('FilePreview', this.props.className)}
                onClick={this.handleClick}>
        <div className="thumbnailWrapper">
          <div ref="thumbnail" className="thumbnail" style={{backgroundImage: 'url("' + src.replace(/"/g, '\\"') + '")'}} />
        </div>
        <label>{file.name}</label>
      </div>;
  }
}
