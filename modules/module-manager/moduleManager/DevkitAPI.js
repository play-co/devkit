import Promise from 'bluebird';
import xhr from 'xhr';
import URL from 'url';

import autobind from '../autobind';

class DevkitAPI {

  constructor(props) {
    this._devkitHost = window.location.host;

    autobind(this);
  }

  get(path, params) {
    let url = URL.format({
      host: this._devkitHost,
      pathname: path,
      query: params
    });

    return Promise.promisify(xhr)(url).then((res) => {
      let data = res[0];
      if (data.body && data.body[0] === '{' && data.body[data.body.length - 1] === '}') {
        try {
          data.json = JSON.parse(data.body);
        } catch (e) { }
      }
      return data;
    });
  }
}

export default new DevkitAPI();
