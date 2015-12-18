import DevkitController from './DevkitController';

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

    this._windows = {};

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

  postMessage(data, callback) {
    console.log('jsio postmessage:', data);
    data._jsio = true;

    if (window.parent === window || data.newWindow) {
      // No parent, just open devkit in a new tab
      console.log('not sending message, handling internally');
      if (data.target === 'simulator' && data.action === 'run') {
        let windowsKey = 'simulator:' + data.runTarget + ':' + DevkitController.appPath;
        let existingWindow = this._windows[windowsKey];

        if (existingWindow && !existingWindow.closed) {
          console.log('Existing window still open, focussing');
          existingWindow.focus();
          if (data.runTarget === 'local') {
            existingWindow.postMessage('devkit:reload', '*');
          }
        }
        else if (data.targetURL) {
          console.log('Opening child window for:', data.targetURL);
          var newWindow = window.open(data.targetURL, '_blank');
          this._windows[windowsKey] = newWindow;
          newWindow.postMessage('devkit:focus', '*');
        }
        else {
          console.log('No existing window, and no targetURL. Nothing to do');
        }
      }
      else if (data.target === 'ui' && data.action === 'alert') {
        window.alert(data.message);
      }
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
