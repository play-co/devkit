//# Playing a background sound <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/sound/background/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This example shows how to add a background sound, pausing and resuming it.

//Import the AudioManager class and the TextView class.
import AudioManager;
import ui.TextView as TextView;

//## Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		this._textView = new TextView({
			superview: this.view,
			width: this.style.width,
			height: this.style.height,
			text: "Click to pause",
			size: 18,
			color: "#000044"
		});
		this._textView.onInputSelect = bind(this, "onClick");
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
				}
			}
		});
		this._sound.play("background", {loop: true});
	};

	// Pause or resume the sound.
	this.onClick = function() {
		this._paused = !this._paused;
		this._textView.setText("Click to " + (this._paused ? "resume" : "pause"));
		this._paused ? this._sound.pause("background") : this._sound.play("background");
	};

	this.launchUI = function () {};
});
//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">