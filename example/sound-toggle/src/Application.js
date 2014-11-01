//# Toggle a sound <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/sound/toggle/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>

//Given the following audio files in your project directory:
//<pre>
//project
//.
//├── manifest.json
//├── sdk/ -> /path/to/basil/sdk
//├── build/
//├── resources/
//│   └── audio/
//│       └── background.mp3
//└── src/
//    └── Application.js
//</pre>

import device;

import ui.widget.ButtonView as ButtonView;
import ui.View as View;

import AudioManager;

exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		this.sound = new AudioManager({
			path: "resources/audio",
			files: {
				background: {
					background: true,
					loop: true
				}
			}
		});

		new SoundButton({
			superview: this.view,
			width: 200,
			height: 60,
			x: device.width / 2 - 100,
			y: 50,
			title: "Play",
			on: {
				up: bind(
					this,
					function () {
						this.sound.play("background");
					}
				)
			}
		});

		new SoundButton({
			superview: this.view,
			width: 200,
			height: 60,
			x: device.width / 2 - 100,
			y: 130,
			title: "Pause",
			on: {
				up: bind(
					this,
					function () {
						this.sound.pause("background");
					}
				)
			}
		});
	};
});

//## Class: SoundButton
var SoundButton = Class(ButtonView, function(supr) {
	this.init = function(opts) {
		opts = merge(
			opts,
			{
				images: {
					up: "resources/images/blue1.png",
					down: "resources/images/blue2.png"
				},
				scaleMethod: "9slice",
				sourceSlices: {
					horizontal: {left: 80, center: 116, right: 80},
					vertical: {top: 10, middle: 80, bottom: 10}
				},
				destSlices: {
					horizontal: {left: 40, right: 40},
					vertical: {top: 4, bottom: 4}
				},
				text: {
					color: "#000044",
					size: 16,
					autoFontSize: false,
					autoSize: false
				},
			}
		);

		supr(this, "init", [opts]);
	};
});
//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">