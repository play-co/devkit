import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Redirect } from 'react-router';

import App from './App';
import PageConnect from './PageConnect';
import PageInfo from './PageInfo';

import createBrowserHistory from 'history/lib/createBrowserHistory';
import { useBasename } from 'history';


const history = useBasename(createBrowserHistory)({
  queryKey: false,
  basename: '/modules/remote-debugger/extension/remoteDevice'
});


var wrapComponent = function(Component, props) {
  return React.createClass({
    render: function() {
      return React.createElement(Component, props);
    }
  });
};


ReactDOM.render(
  <Router history={history}>
    <Route path='/' component={App}>
      <Route path="info" component={PageInfo} />
      <Route path="connect" component={PageConnect} />
      <Redirect from="*" to="connect" />
    </Route>
  </Router>,
  document.getElementById('main')
);
