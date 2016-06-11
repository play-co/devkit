import React from 'react';
import ReactDOM from 'react-dom';
import classnames from 'classnames';

export let overlay = null;

let onClose;

export default class Menu extends React.Component {
  constructor() {
    super();

    this.state = {};
  }

  handleClick = () => {
    if (currentMenu === this) {
      Menu.close();
    } else {
      Menu.open(this, this._getDropdown());
    }
  }

  componentDidMount() {
    if (currentMenu === this) {
      this._renderMenu();
    }
  }

  componentDidUpdate() {
    if (currentMenu === this) {
      this._renderMenu();
    }
  }

  _getDropdown() {
    return <div className="MenuDropdown">
          {this._children}
        </div>;
  }

  _renderMenu() {
    Menu.rerender(this._getDropdown());
  }

  render() {
    const children = React.Children.toArray(this.props.children);
    const index = children.findIndex(child =>
        child.type === MenuButton
        || child.type.prototype instanceof MenuButton);

    let menuButton;
    if (index !== -1) {
      menuButton = children.splice(index, 1);
    }

    this._children = children;

    return <div className={classnames('Menu', this.props.className)}
                onClick={this.handleClick}>
      {menuButton}
    </div>;
  }
}

export class MenuButton extends React.Component {
  render() {
    return <div className={classnames('MenuButton', this.props.className)} {...this.props}>
      {this.props.children}
    </div>;
  }
}

let currentMenu = null;
const EVENT_CAPTURES = ['mousedown', 'click', 'touchstart', 'touchend'];
const CLOSE_EVENTS = {'click': true, 'touchend': true};

Menu.open = function (component, menu) {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'menu-overlay';

    const onClick = (event) => setTimeout(() => {
      if (!event.defaultPrevented) {
        Menu.close();
      }
    });

    overlay.addEventListener('click', onClick);
    overlay.addEventListener('touchend', onClick);
  }

  if (currentMenu) {
    Menu.close();
  }

  currentMenu = component;

  document.body.appendChild(overlay);
  const dropdown = ReactDOM.findDOMNode(Menu.rerender(menu));
  const button = ReactDOM.findDOMNode(component);
  const rect = button.getBoundingClientRect();
  dropdown.style.top = rect.bottom + 'px';
  dropdown.style.left = rect.left + 'px';

  EVENT_CAPTURES.forEach(type => window.addEventListener(type, onEvent, true));

  function onEvent(event) {
    let el = event.target;
    while (el.parentNode) {
      if (el === overlay || el === button) { return; }
      el = el.parentNode;
    }

    event.stopPropagation();
    event.preventDefault();

    if (event.type in CLOSE_EVENTS) {
      Menu.close();
    }

    return false;
  }

  function unmount() {
    currentMenu = null;
    ReactDOM.unmountComponentAtNode(overlay);
    document.body.removeChild(overlay);
    EVENT_CAPTURES.forEach(type => window.removeEventListener(type, onEvent, true));
  }

  return new Promise((resolve, reject) => {
    onClose = {
      resolve: res => {
        unmount();
        resolve(res);
      },
      reject: err => {
        unmount();
        reject(err);
      }
    };
  });
};

Menu.rerender = function (menu) {
  return ReactDOM.render(menu, overlay);
};

Menu.close = function (res) {
  onClose && onClose.resolve(res);
};

Menu.cancel = function (err) {
  onClose && onClose.reject(err);
};
