import Promise from 'bluebird';
import _xhr from 'xhr';
import URL from 'url';


/**
 * @method xhr
 * @param  {Object} opts
 * @param  {String} [opts.method='get']
 * @param  {Object} [opts.params]
 */
export default function xhr(opts) {
  let xhrOpts = {
    protocol: window.location.protocol,
    url: URL.format(opts),
    method: opts.method || 'GET'
  }

  if (xhrOpts.method === 'post' && opts.params) {
    let formData = new FormData();
    Object.keys(opts.params).forEach(key => {
      formData.append(key, opts.params[key]);
    })
    xhrOpts.body = formData;
  }

  return Promise.promisify(_xhr)(xhrOpts).then((res) => {
    let data = res[0];
    try {
      data.json = JSON.parse(data.body);
    } catch (e) { }
    return data;
  });
}
