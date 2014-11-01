//# Muting sounds <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/sound/mute/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This file shows how mute sounds and effects

//Import device to get the width of the screen, import the AudioManager class to play music and effects.
import device as device;
import AudioManager;

import ui.widget.ButtonView as ButtonView;

//Import View and TextView to display elements.
import ui.View as View;
import ui.TextView as TextView;

//## Class: Application
//Create an application and set the default properties.
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		this._textView = new TextView({
			superview: this.view,
			color: "#000044",
			width: this.style.width,
			height: this.style.height,
			autoSize: false,
			autoFontSize: false,
			wrap: true
		});
		this._paused = false;

		this._sound = new AudioManager({
			path: "resources/audio/",
			files: {
				// This index is the name of the file,
				// the extension is depending on the system.
				// If you run this demo in Chromium the file
				// will be "resources/audio/background.ogg"
				// else the file will be "resources/audio/background.mp3"
				background: {
					volume: 0.8,
					loop: true,
					background: true
				},
				sound1: {
					volume: 0.5
				}
			}
		});
		this._sound.play("background", {loop: true});

		var func = ["setMusicMuted", "setEffectsMuted"];
		var titles = ["Music", "Sound"];

		for (var i = 0; i < 2; i++) {
			new SoundButton({
				superview: this.view,
				width: 200,
				height: 60,
				x: device.width / 2 - 100,
				y: 50 + i * 80,
				callback: bind(this._sound, func[i]),
				func: func[i],
				title: titles[i]
			}).subscribe("Change", this, "onChangeMute");
		}

		this.onChangeMute();

		setInterval(bind(this._sound, "play", "sound1"), 1500);
	};

	this.onChangeMute = function() {
		var text = "Click the top view to mute the music,\n" +
					"the bottom view to mute the effects\n";

		text += "Music is " + (this.view.getSubviews()[1].muted ? "" : "not ") + "muted\n";
		text += "Effects are " + (this.view.getSubviews()[2].muted ? "" : "not ") + "muted\n";

		this._textView.setText(text);
	};

	this.launchUI = function () {};
});


//## Class: SoundView
//Create a view which will call a mute callback when clicked.
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

		this._callback = opts.callback;
		this._sound = opts.sound;

		this.muted = false;
	};

	this.onChange = function() {
		this.muted = !this.muted;
		// Call the mute function
		this._callback(this.muted);
		this.publish("Change");
	};
});
//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">