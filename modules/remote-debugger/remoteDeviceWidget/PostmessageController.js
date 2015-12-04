
class PostmessageController {

  /**
  * Post message support between the embedded jsio editor and the main jsio app.
  * Messages should be sent as stringified JSON.  Messages should have a `_jsio`
  * property set to `true`.  Messages which expect a response should have a
  * `_requestId`, and should expect a message with an equal `_responseId`.
  */
  constructor () {
    this.requestPreface = 'brackets_';

    this._messageCallbacks = {};
    this._messageCallbackId = 0;

    window.addEventListener('message', this._handleMessage);
  }

  _handleMessage = (e) => {
    try {
      var data = JSON.parse(e.data);
    } catch(err) {
      return;
    }
    if (!data._jsio) { return; }

    // If this message is targeting a callback
    if (data._responseId !== undefined) {
      var callback = this._messageCallbacks[data._responseId];
      if (!callback) {
        throw new Error('No callback registered for: ' + data._responseId);
      }
      this._messageCallbacks[data._responseId] = undefined;

      callback(data);
      return;
    }
  }

  postMessage = (data, callback) => {
    console.log('jsio postmessage: ', data);
    data._jsio = true;

    if (window.parent === window) {
      console.error('parent is self, not sending message');
      return;
    }

    if (callback) {
      var requestId = this.requestPreface + this._messageCallbackId;
      this._messageCallbackId++;

      data._requestId = requestId;
      this._messageCallbacks[requestId] = callback;
    }

    window.parent.postMessage(JSON.stringify(data), '*');
  }

}


export default new PostmessageController();
