import React from 'react';
import ReactDOM from 'react-dom';


class ContextMenu extends React.Component {
  render() {
    const files = this.props.files;
    const fs = this.props.fs;

    let entries = this.props.entries.map(renderEntry.bind(this));

    let menuStyle = {
      left: this.props.x,
      top: this.props.y
    };

    return (
      <div className="ContextMenu" style={menuStyle}>
        {entries}
      </div>
    );
  }
}


class ContextMenuEntry extends React.Component {
  handleOnClick(_event) {
    _event.stopPropagation();
    this.props.closeMenu(null, this.props.entry.data);
  }

  render() {
    const entry = this.props.entry;

    if (entry.entries) {
      let content = entry.entries.map(renderEntry.bind(this));
      content.push(<div className="divider"></div>);
      return <div>{content}</div>;
    }

    return <div
      className="ContextMenuEntry"
      onClick={this.handleOnClick.bind(this)}
    >
      {entry.title}
    </div>;
  }
}

let renderEntry = function(entry) {
  return React.createElement(ContextMenuEntry, {
    entry: entry,
    closeMenu: this.props.closeMenu
  });
}


/** Returns a promise that will reject with the closure method, or resolve with
  *   the selected entry data
  */
export default function openContextMenu(x, y, entries) {
  // Make the overlay
  let overlay = document.createElement('div');
  overlay.className = 'context-menu-container';

  // Close handler
  let _onClose;
  let closeMenu = function(err, res) {
    ReactDOM.unmountComponentAtNode(overlay);
    document.body.removeChild(overlay);

    // Remove listeners
    overlay.removeEventListener('click', handleMouseOut);
    window.removeEventListener('keydown', handleKeyOut);

    if (err) {
      _onClose.reject(err);
    } else {
      _onClose.resolve(res);
    }
  }

  // Close listeners
  let handleMouseOut = function(_event) {
    if (_event.target === overlay) {
      closeMenu('clickOut');
    }
  };
  overlay.addEventListener('click', handleMouseOut);
  let handleKeyOut = function(e) {
    if (e.keyCode == 27) {
      closeMenu('escOut');
    }
  };
  window.addEventListener('keydown', handleKeyOut);

  // Make the menu component
  let menuCmpt = React.createElement(ContextMenu, {
    x: x,
    y: y,
    entries: entries,
    closeMenu: closeMenu
  });

  // Add to screen and render
  document.body.appendChild(overlay);
  ReactDOM.render(menuCmpt, overlay);
  return new Promise((resolve, reject) => {
    _onClose = {resolve, reject};
  });
}
