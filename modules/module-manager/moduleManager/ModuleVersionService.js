import React from 'react';

import autobind from '../autobind';
import xhr from './xhr';
import {modalService} from './Modal';


let MODULE_DATA = [
  {
    title: 'devkit-core',
    url: 'https://github.com/gameclosure/devkit-core'
  },
  {
    title: 'devkit-scene',
    url: 'https://github.com/gameclosure/devkit-scene'
  }
];


class ModuleVersionsModal extends React.Component {
  constructor(props) {
    super(props);
    autobind(this);

    this.state = {
      tags: [],
      fetching: false
    };
  }

  componentDidMount() {
    this.setState({ fetching: true });
    moduleVersionService.getTags('gameclosure', 'devkit-core').then((res) => {
      this.setState({ tags: res.json, fetching: false });
    });
  }

  renderTag(tag) {
    return (
      <div className='tag-item'>
        <div className='name'>{tag.name}</div>
        <div className='btn'>install</div>
      </div>
    );
  }

  render() {
    let data = this.props.data;
    let tags = this.state.tags;

    let tagList;
    if (tags && tags.length > 0) {
      tagList = (
        <div className='tags-list'>
          {tags.map(this.renderTag)}
        </div>
      );
    } else {
      if (this.state.fetching) {
        tagList = (
          <div>Fetching available tags...</div>
        );
      } else {
        tagList = (
          <div>No available tags!</div>
        );
      }
    }

    return (
      <div className='module-versions-modal'>
        <div className='title'>{data.name}</div>
        <div className='description'>Available Versions</div>
        {tagList}
      </div>
    );
  }
}


class ModuleVersionService {
  constructor() {
  }

  getTags(owner, repo) {
    return xhr({
      method: 'post',
      host: 'staging-js.io/api/v1/git/github/api_cache/',
      params: {
        path: '/repos/' + owner + '/' + repo + '/tags'
      }
    });
  }

  showForModule(moduleInfo) {
    return modalService.showModal({
      body: (
        <ModuleVersionsModal
          data={moduleInfo}
        ></ModuleVersionsModal>
      )
    });
  }
}

export var moduleVersionService = new ModuleVersionService();
