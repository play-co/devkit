import url from 'url';

let urlParams = url.parse(window.location.href, true);

export default urlParams;

export function getQuery(key) {
  if (urlParams.query) {
    return urlParams.query[key];
  }
  return null;
}
