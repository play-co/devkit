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
