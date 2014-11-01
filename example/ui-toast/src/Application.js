//# Toast: <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/ui/toast/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This is a demonstration of Toasts
import ui.TextView as TextView;
import ui.widget.Toast as Toast;

// test data
var posIndex = -1;
var toastIndex = -1;
var positions = [
	'top',
	'topright',
	'bottomright',
	'bottom',
	'bottomleft',
	'topleft'
];
var toastWords = [
	'something',
	'another thing',
	'good job',
	'you did it'
];

//### Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		// create TextView that triggers a Toast popup on click
		var textview = new TextView({
			superview: this,
			layout: 'box',
			text: 'Toast?',
			color: 'white'
		});
		// create the Toast
		var toast = new Toast({
			superview: this,
			images: {
				top: 'resources/images/top.png',
				bottom: 'resources/images/bottom.png',
				topright: 'resources/images/right.png',
				bottomright: 'resources/images/right.png',
				topleft: 'resources/images/left.png',
				bottomleft: 'resources/images/left.png'
			}
		});
		// create input handler that pops the Toast
		textview.on('InputSelect', function() {
			posIndex = (posIndex + 1) % 6;
			toastIndex = (toastIndex + 1) % 4;
			toast.pop(toastWords[toastIndex], positions[posIndex]);
		});
	};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">