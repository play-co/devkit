//# Setting the sound volume <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/sound/volume/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This example shows how to set the volume of a sound effect.
//How to use: Click on one of the views to play an effect

//Import device the get the screen size, the AudioManager class for playing sounds and effects and the View class to display views:
import device;

import ui.widget.ButtonView as ButtonView;

import AudioManager;

//## Class: Application
//Create an application.
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.view.style.backgroundColor = "#FFFFFF";

		this._sound = new AudioManager({
			path: "resources/audio/",
			// Load one sound effects:
			//    "resources/audio/bubble_hit_01.mp3"
			// or:
			//    "resources/audio/bubble_hit_01.ogg"
			files: {
				sound1: {
					volume: 0.8
				}
			}
		});

		// Create three views, click on them the hear an effect play...
		var titles = ["Soft", "Louder", "Loudest"];
		var volumes = [0.2, 0.6, 1.0];
		for (var i = 0; i < 3; i++) {
			new SoundButton({
				superview: this.view,
				x: device.width / 2 - 100,
				y: 50 + i * 80,
				width: 200,
				height: 60,
				sound: this._sound,
				volume: volumes[i],
				title: titles[i]
			})
		}
	};

	this.launchUI = function () {};
});

//## Class: SoundView
//Create a button which can be clicked to play a sound.
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
				}
			}
		);

		supr(this, "init", [opts]);

		this._sound = opts.sound;
		this._volume = opts.volume;
	};

	this.onInputSelect = function() {
		this._sound.setVolume("sound1", this._volume);
		this._sound.play("sound1");
	};
});
//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">