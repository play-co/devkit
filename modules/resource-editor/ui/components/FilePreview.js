import path from 'path';
import React from 'react';
import classnames from 'classnames';
import Promise from 'bluebird';

import {imageLoader} from '../util/ImageLoader';
import {IMAGE_TYPES, AUDIO_TYPES} from '../util/FileTypes';

const ICONS = {
  '.zip': 'fa-file-archive-o',
  '.tar': 'fa-file-archive-o',
  '.pdf': 'fa-file-pdf-o',
  '.mp4': 'fa-film',
  '.mov': 'fa-film',
  '.js': 'fa-file-code-o',
  '.json': 'fa-file-text-o',
  '.txt': 'fa-file-text-o',
  '.otf': 'fa-font',
  '.ttf': 'fa-font',
  '.woff': 'fa-font',
  '.woff2': 'fa-font',
  '.eot': 'fa-font'
};

export default class FilePreview extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  componentDidMount() {
    this.updateProps(this.props);
    if (this.state.src) { this.refresh(); }
  }

  componentWillReceiveProps(props) {
    this.updateProps(props);
  }

  componentWillUnmount() {
    if (this._audio) {
      this._audio.pause();
    }
  }

  getCwd() {
    let cwd = this.props.cwd;
    if (!cwd && this.props.fs) {
      cwd = path.join(this.props.fs.MOUNT_POINT, this.props.fs.CWD);
    }
    return cwd;
  }

  updateProps(props) {
    const file = props.file;
    if (file.path !== this._path) {
      this._path = file.path;

      const extname = path.extname(file.path);
      const isImage = extname in IMAGE_TYPES;

      this.setState({
        canPlay: extname in AUDIO_TYPES,
        icon: !isImage && ICONS[extname]
      });

      if (isImage) {
        this._getSource(file)
          .then(src => this.setState({src}));
      }
    }
  }

  _getSource(file, force) {
    const filePath = file.path;
    const extname = path.extname(filePath);
    const isImage = extname in IMAGE_TYPES;

    const isUpload = file.data && file.data instanceof File;
    if (isUpload && (isImage || force)) {
      return this._readSource(file);
    }

    return Promise.resolve(filePath
        ? path.join(this.getCwd(), filePath)
        : '');
  }

  _readSource(file) {
    return new Promise((resolve, reject) => {
      var reader = new FileReader();
      reader.onload = res => resolve(res.target.result);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file.data);
    });
  }

  handleIconClick = (event) => {
    const filePath = this.props.file.path;
    const extname = path.extname(filePath);
    if (extname in AUDIO_TYPES) {
      event.stopPropagation();

      if (this._audio) {
        if (this._audio.paused) {
          this._audio.play();
          this.setState({playing: true});
        } else {
          this._audio.pause();
          this.setState({playing: false});
        }
      } else {
        this.setState({playing: true});
        this._getSource(this.props.file, true)
          .then(src => {
            this._audio = new Audio();
            this._audio.src = src;
            this._audio.addEventListener('ended', _event => this.setState({playing: false}));
            this._audio.play();
          });
      }
    }
  }

  handleClick = (event) => {
    this.props.onClick && this.props.onClick(this.props.file, event);
  }

  refresh() {
    let src = this.state.src;
    if (src === this._src) { return; }

    this._src = src;
    imageLoader.load(src)
      .then(({width, height}) => {
        let thumbnail = this.refs.thumbnail;
        if (!thumbnail) { return; }

        let isContain = width > thumbnail.offsetWidth
                     || height > thumbnail.offsetHeight;
        thumbnail.style.backgroundSize = isContain ? 'contain' : 'initial';

        this.props.onImageSize && this.props.onImageSize(width, height);
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
          <div ref="thumbnail" className="thumbnail" style={{backgroundImage: 'url("' + src.replace(/"/g, '\\"') + '")'}} >

          {!src && (this.state.icon || this.state.canPlay) &&
            <i className={classnames('fa', (this.state.playing
                  ? 'fa-pause-circle'
                  : this.state.canPlay
                    ? 'fa-play-circle'
                    : this.state.icon),
                this.state.canPlay && 'canPlay')}
              onClick={this.handleIconClick}
            />}

          </div>
        </div>
        <label>{file.name}</label>
      </div>;
  }
}
