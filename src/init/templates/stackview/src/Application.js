/** @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */

import src.TitleScreen as TitleScreen;
import src.GameScreen as GameScreen;

exports = Class(GC.Application, function () {

	this.initUI = function () {
		var titlescreen = new TitleScreen(),
				gamescreen = new GameScreen();
		
		this.view.push(titlescreen);

		titlescreen.on('InputSelect', function () {
			GC.app.view.push(gamescreen);
		});

		gamescreen.on('InputSelect', function () {
			GC.app.view.pop();
		});
	};
	
	this.launchUI = function () {};
});
