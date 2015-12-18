import React from 'react';
import autobind from '../autobind';

function checkedClass(isChecked) {
  return 'fa ' + (isChecked ? 'fa-check-square-o' : 'fa-square-o');
}

export default class TargetList extends React.Component {
  constructor(props) {
    super(props);
    autobind(this);

    this.state = {};
  }

  handleClick(e) {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    this.props.doToggleOpen();
  }

  render() {
    return <ul className="target-list">
        {this.props.items.map((item, index) => item.spacer
            ? <li className="spacer" key={index} />
            : <TargetListItem key={index}
                  item={item}
                  selected={this.props.selectedItem === item}
                  doSelectItem={this.props.doSelectItem} />)}
        <li onClick={this.props.onAutoSaveOnRun}>
          <i className={checkedClass(this.props.autoSaveOnRun)} />
          auto-save on run
        </li>
        <li onClick={this.props.onFastReload}>
          <i className={checkedClass(this.props.fastReload)} />
          fast reload
        </li>
      </ul>;
  }
}

class TargetListItem extends React.Component {
  constructor(props) {
    super(props);
    autobind(this);
  }

  handleClick(e) {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    var item = this.props.item;
    this.props.doSelectItem(e, item);
  }

  render() {
    var item = this.props.item;
    var selectedIcon = '';
    var className = 'target-list-item';

    if (this.props.selected) {
      className += ' selected';
      selectedIcon = 'fa fa-check';
    }

    if (item.status) {
      className += ' status-' + item.status;

      if (!item.icon) {
        item.icon = 'circle status-icon';
      }
    }

    var itemChildren = [
      React.DOM.div({
        key: 'item-name-' + item.UUID,
        className: 'name'
      }, item.name),
      React.DOM.div({
        key: 'item-selected-icon-' + item.UUID,
        className: 'selected-icon ' + selectedIcon
      })
    ];

    if (item.icon) {
      itemChildren.unshift(
        React.DOM.div({
          key: 'item-icon-' + item.UUID,
          className: 'icon fa fa-' + item.icon
        })
      );
    } else {
      // Want to keep things in the right position
      itemChildren.unshift(
        React.DOM.div({
          key: 'item-icon-spacer-' + item.UUID,
          className: 'icon icon-spacer'
        })
      );
    }

    return React.DOM.li({
      onClick: this.bound.handleClick,
      className: className,
      title: item.UUID
    }, itemChildren);
  }

}
