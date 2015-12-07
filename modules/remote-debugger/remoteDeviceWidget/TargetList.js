import React from 'react';
import autobind from '../autobind';

export default class TargetList extends React.Component {
  constructor(props) {
    super(props);
    autobind(this);
  }

  handleClick(e) {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    this.props.doToggleOpen();
  }

  render() {
    var items = this.props.items.map(this.bound.renderItem);
    return React.DOM.ul({
      className: 'target-list'
    }, items);
  }

  renderItem(item) {
    if (item.spacer) {
      return React.DOM.li({
        key: 'target-list-spacer-' + Math.floor(Math.random() * 100000),
        className: 'spacer'
      });
    } else {
      return React.createElement(TargetListItem, {
        key: 'target-list-item-' + item.UUID,
        item: item,
        selected: this.props.selectedItem === item,
        doSelectItem: this.props.doSelectItem
      });
    }
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
    this.props.doSelectItem(item);
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
