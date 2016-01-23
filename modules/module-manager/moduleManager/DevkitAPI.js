import xhr from './xhr';
import autobind from '../autobind';


class DevkitAPI {

  constructor(props) {
    this._devkitHost = window.location.host;

    autobind(this);
  }

  get(path, params) {
    return xhr({
      host: this._devkitHost,
      pathname: path,
      query: params
    });
  }
}

export default new DevkitAPI();
