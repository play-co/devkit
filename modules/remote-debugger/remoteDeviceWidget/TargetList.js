import React from 'react';


export default class TargetList extends React.Component {
  constructor(props) {
    super(props);

  }

  handleClick = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    this.props.doToggleOpen();
  }

  render = () => {
    var items = this.props.items.map(this.renderItem);
    return React.DOM.ul({
      className: 'target-list'
    }, items);
  }

  renderItem = (item) => {
    if (item.spacer) {
      return React.DOM.li({
        key: 'target-list-spacer-' + Math.floor(Math.random() * 100000),
        className: 'spacer'
      });
    } else {
      return React.createElement(TargetListItem, {
        key: 'target-list-item-' + item.name,
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

  }

  handleClick = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    var item = this.props.item;
    this.props.doSelectItem(item);
  }

  render = () => {
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
        key: 'item-name-' + item.name,
        className: 'name'
      }, item.name),
      React.DOM.div({
        key: 'item-selected-icon-' + item.name,
        className: 'selected-icon ' + selectedIcon
      })
    ];

    if (item.icon) {
      itemChildren.unshift(
        React.DOM.div({
          key: 'item-icon-' + item.name,
          className: 'icon fa fa-' + item.icon
        })
      );
    } else {
      // Want to keep things in the right position
      itemChildren.unshift(
        React.DOM.div({
          key: 'item-icon-spacer-' + item.name,
          className: 'icon icon-spacer'
        })
      );
    }

    return React.DOM.li({
      onClick: this.handleClick,
      className: className,
      title: item.UUID
    }, itemChildren);
  }

}
