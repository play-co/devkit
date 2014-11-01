//# Internationalization: Languages <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/text/internationalization/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This demo demonstrates language swapping
import ui.View as View;
import ui.TextView as TextView;

//## Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.layout = 'linear';
		this.style.direction = 'vertical';
		var hello = new TextView({
			superview: this,
			layout: 'box',
			text: 'hello',
			color: 'pink',
			flex: 3
		});
		var bottomRow = new View({
			superview: this,
			layout: 'linear',
			direction: 'horizontal',
			backgroundColor: 'red',
			flex: 1
		});
		var english = new TextView({
			superview: bottomRow,
			layout: 'box',
			text: 'english',
			flex: 1
		});
		var spanish = new TextView({
			superview: bottomRow,
			layout: 'box',
			text: 'spanish',
			color: 'white',
			flex: 1
		});

		var translations = {
			english: JSON.parse(CACHE['resources/lang/en.json']),
			spanish: JSON.parse(CACHE['resources/lang/sp.json'])
		};
		english.on('InputSelect', function() {
			english.updateOpts({ color: 'black' });
			spanish.updateOpts({ color: 'white' });
			hello.setText(translations.english.hello);
		});
		spanish.on('InputSelect', function() {
			english.updateOpts({ color: 'white' });
			spanish.updateOpts({ color: 'black' });
			hello.setText(translations.spanish.hello);
		});
	};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">