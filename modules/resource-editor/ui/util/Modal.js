import ReactDOM from 'react-dom';

export let overlay = null;

let onClose;

export default {
  open: function (Modal) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
    }

    document.body.appendChild(overlay);
    ReactDOM.render(Modal, overlay);
    return new Promise((resolve, reject) => {
      onClose = {resolve, reject};
    });
  },
  close: function (res) {
    _close();
    onClose && onClose.resolve(res);
  },
  cancel: function (err) {
    _close();
    onClose && onClose.reject(err);
  }
};

function _close() {
  ReactDOM.unmountComponentAtNode(overlay);
  document.body.removeChild(overlay);
}
