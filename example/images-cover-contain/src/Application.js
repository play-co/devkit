//# Cover/Contain Image Scaling <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/images/cover-contain/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This demo shows how to display images with cover and contain scaling.

//The debugging flag of the `ImageScaleView` is set to true so you can see the view bounds.

import ui.ImageScaleView;
import ui.View as View;
import ui.TextView as TextView;

exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.layout = 'linear';
		this.style.direction = 'vertical';
		this.style.justifyContent = 'space-outside';

		var isv = new ui.ImageScaleView({
			superview: this,
			scaleMethod: 'cover',
			layout: 'box',
			layoutWidth: '80%',
			layoutHeight: '50%',
			debug: true,
			centerX: true
		});

		// first row of buttons: kitten switcher; cover/contain
		var middleView = new View({
			superview: this,
			layout: 'linear',
			direction: 'horizontal',
			justifyContent: 'space-outside',
			layoutHeight: '20%'
		});

		// kitty image (tall/short)
		var isTall = true;
		var kittyImage = new TextView({
			superview: middleView,
			layout: 'box',
			layoutWidth: '40%',
			backgroundColor: 'red',
			wrap: true
		});
		var updateKittyImage = function() {
			isTall = !isTall;
			var cur = isTall ? 'tall' : 'short';
			var next = isTall ? 'short' : 'tall';
			isv.setImage('resources/images/' + cur + '.jpg');
			kittyImage.setText('current: ' + cur + ', next: ' + next);
		};
		kittyImage.on('InputSelect', updateKittyImage);

		// cover/contain
		var isContain = false;
		var coverContain = new TextView({
			superview: middleView,
			layout: 'box',
			layoutWidth: '40%',
			backgroundColor: 'red',
			wrap: true
		});
		var updateCoverContain = function() {
			isContain = !isContain;
			var cur = isContain ? 'contain' : 'cover';
			var next = isContain ? 'cover' : 'contain';
			isv.updateOpts({
				scaleMethod: cur
			});
			coverContain.setText('current: ' + cur + ', next: ' + next);
		};
		coverContain.on('InputSelect', updateCoverContain);

		// second row of buttons: horizontal and vertical alignment
		var bottomView = new View({
			superview: this,
			layout: 'linear',
			direction: 'horizontal',
			justifyContent: 'space-outside',
			layoutHeight: '20%'
		});

		// horizontal alignment
		var halignments = ['left', 'center', 'right'];
		var halignIndex = 0;
		var getHAlign = function() {
			var newHA = halignments[halignIndex];
			halignIndex = (halignIndex + 1) % 3;
			return newHA;
		};
		var horizontalAlign = new TextView({
			superview: bottomView,
			layout: 'box',
			layoutWidth: '40%',
			backgroundColor: 'red',
			wrap: true
		});
		var updateHAlign = function() {
			var cur = getHAlign();
			var next = halignments[halignIndex];
			isv.updateOpts({
				horizontalAlign: cur
			});
			horizontalAlign.setText('current: ' + cur + ', next: ' + next);
		};
		horizontalAlign.on('InputSelect', updateHAlign);

		// vertical alignment
		var valignments = ['top', 'middle', 'bottom'];
		var valignIndex = 0;
		var getVAlign = function() {
			var newVA = valignments[valignIndex];
			valignIndex = (valignIndex + 1) % 3;
			return newVA;
		};
		var verticalAlign = new TextView({
			superview: bottomView,
			layout: 'box',
			layoutWidth: '40%',
			backgroundColor: 'red',
			wrap: true
		});
		var updateVAlign = function() {
			var cur = getVAlign();
			var next = valignments[valignIndex];
			isv.updateOpts({
				verticalAlign: cur
			});
			verticalAlign.setText('current: ' + cur + ', next: ' + next);
		};
		verticalAlign.on('InputSelect', updateVAlign);

		// update all properties
		updateKittyImage();
		updateCoverContain();
		updateHAlign();
		updateVAlign();
	};
});

//Run this code as the `Application.js` file in your project, and you should see something
//like this in the simulator:
//<img src="./doc/screenshot.png" alt="cover/contain screenshot" class="screenshot">