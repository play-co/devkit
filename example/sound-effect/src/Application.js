//# Playing effects <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/sound/effect/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This example shows how to play different sound effects.
//You can click on one of the views to play an effect

import device;
import AudioManager;
import ui.widget.ButtonView as ButtonView;
import ui.View as View;

//## Class: Application
//Create an application and set the default settings.
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		this._sound = new AudioManager({
			path: "resources/audio/",
			//Load three sound effects:
			//    "resources/audio/sound1.mp3"
			//    "resources/audio/sound2.mp3"
			//    "resources/audio/sound3.mp3"
			//or:
			//    "resources/audio/sound1.ogg"
			//    "resources/audio/sound2.ogg"
			//    "resources/audio/sound3.ogg"
			files: {
				sound1: {
					volume: 0.8
				},
				sound2: {
					volume: 0.8
				},
				sound3: {
					volume: 0.8
				}
			}
		});

		//Create three views, click on them the hear an effect play...
		for (var i = 0; i < 3; i++) {
			var j = i + 1;
			new SoundButton({
				superview: this.view,
				width: 200,
				height: 60,
				x: device.width / 2 - 100,
				y: 50 + i * 80,
				sound: this._sound,
				index: "sound" + j,
				title: "Sound " + j
			})
		}
	};

	this.launchUI = function () {};
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
				on: {
					up: bind(this, "onChange")
				}
			}
		);

		supr(this, "init", [opts]);

		this._sound = opts.sound;
		this._index = opts.index;
	};

	this.onChange = function() {
		this._sound.play(this._index);
	};
});
//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">