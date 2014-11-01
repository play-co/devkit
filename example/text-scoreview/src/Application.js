//# ScoreView: <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/text/scoreview/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This is a demonstration of the ScoreView class
import ui.View as View;
import ui.ScoreView as ScoreView;
import ui.widget.ButtonView as ButtonView;

// test values and helper functions
var textNum = 0;
var charNum = 0;
var heightNum = 0;
var texts = [ '12345', '14346764513', '676713154562152352346245' ];
var chars = [ 'blue', 'orange', 'white' ];
var heights = [ '25%', '50%', '75%' ];
var nextCharData = function() {
	// this function returns a new character set
	var d = {};
	for (var i = 0; i < 10; i++) {
		d[i] = {
			image: "resources/images/numbers/" + chars[charNum] + "_" + i + ".png"
		};
	}
	charNum = (charNum + 1) % 3;
	return d;
};
var nextText = function() {
	// this function returns a piece of text
	textNum = (textNum + 1) % 3;
	return texts[textNum];
};
var nextHeight = function() {
	// this function returns a height as a flex value
	heightNum = (heightNum + 1) % 3;
	return heights[heightNum];
};

//## Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.layout = 'linear';
		this.style.direction = 'vertical';
		this.style.backgroundColor = 'white';
		// initialize a new ScoreView
		var svBox = new View({
			superview: this,
			flex: 1
		});
		var scoreView = new ScoreView({
			superview: svBox,
			layout: 'box',
			layoutHeight: nextHeight(),
			characterData: nextCharData(),
			text: nextText()
		});
		// change the ScoreView's active character set
		new ButtonView({
			superview: this,
			flex: 1,
			centerX: true,
			layoutWidth: '80%',
			title: "Change Characters",
			images: {
				up: 'resources/images/blue1.png',
				down: 'resources/images/blue2.png'
			},
			on: {
				up: function() {
					scoreView.setCharacterData(nextCharData());
				}
			}
		});
		// change the ScoreView's text
		new ButtonView({
			superview: this,
			flex: 1,
			centerX: true,
			layoutWidth: '80%',
			title: "Change Text",
			images: {
				up: 'resources/images/blue1.png',
				down: 'resources/images/blue2.png'
			},
			on: {
				up: function() {
					scoreView.setText(nextText());
				}
			}
		});
		// change the ScoreView's height
		new ButtonView({
			superview: this,
			flex: 1,
			centerX: true,
			layoutWidth: '80%',
			title: "Change Height",
			images: {
				up: 'resources/images/blue1.png',
				down: 'resources/images/blue2.png'
			},
			on: {
				up: function() {
					scoreView.style.layoutHeight = nextHeight();
					scoreView.refresh();
				}
			}
		});
	};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">