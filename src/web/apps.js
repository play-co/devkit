/** @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

import util.ajax;
import .Overview;

var link = document.createElement('link');
link.rel = "stylesheet";
link.href = "home.css";
document.querySelector('head').appendChild(link);

util.ajax.get('/api/home', function (err, homeDirectory) {
  if (err) {
    logger.error(err);
  } else {
    GLOBAL.overview = new Overview({
      parent: document.body,
      homeDirectory: homeDirectory.path
    });
  }
});
