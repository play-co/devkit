import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, Redirect } from 'react-router';

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
      <IndexRoute component={PageConnect} />
      <Route path="info" component={PageInfo} />
      <Redirect from="*" to="/" />
    </Route>
  </Router>,
  document.getElementById('main')
);
