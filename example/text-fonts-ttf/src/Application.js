//# Rendering TTF fonts <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/text/fonts-ttf/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This example shows how to render basic text

import ui.TextView as TextView;

//## Class: Application.js
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.view.style.backgroundColor = "#FFFFFF";

		new TextView({
			superview: this.view,
			layout: 'box',
			fontFamily: 'BPreplayBold',
			text: "The quick brown fox jumped over the lazy dog's back",
			size: 30,
			wrap: true
		});

	};

	this.launchUI = function () {};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">
