//# Getting and setting a sound's current time <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/sound/time/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This example shows how to get and set the current time of a background track.

import AudioManager;
import ui.View as View;
import ui.TextView as TextView;
import ui.widget.ButtonView as ButtonView;

//## Class: Application
//Create an Application.
exports = Class(GC.Application, function () {

	this.initUI = function () {
		// Load music tracks
		var sound = new AudioManager({
			path: "resources/sound/",
			files: {
				track1: {
					background: true
				},
				track2: {
					background: true
				},
				warning: {
					background: true,
					loop: false
				},
				sfx: {
					background: true,
					loop: false
				}
			}
		});
		// Tell root view to use a vertical linear layout and a white background
		this.view.style.layout = "linear";
		this.view.style.direction = "vertical";
		this.view.style.backgroundColor = "white";
		
		var width = this.style.width - 40;
		// This button plays the first music track
		var btn1 = new SoundButton({
			superview: this.view,
			width: width,
			title: "Play the first music track"
		});
		// This button plays the second music track
		// starting at the current time of the first music track
		var btn2 = new SoundButton({
			superview: this.view,
			width: width,
			title: "Play the second music track, starting at the current time of the first music track"
		});
		// This button pauses and resumes a sound effect
		var btn3 = new SoundButton({
			superview: this.view,
			width: width,
			title: "Pause/resume a sound effect"
		});
		// This button plays a random sound effect from an effects soundsheet
		var btn4 = new SoundButton({
			superview: this.view,
			width: width,
			title: "Play random effect from soundsheet"
		});
		// This is a progress bar
		var timeBar = new View({
			superview: this.view,
			layout: "linear",
			direction: "horizontal",
			layoutHeight: "10%"
		});
		var timeElapsed = new TextView({
			superview: timeBar,
			layout: "box",
			layoutWidth: "1%",
			text: "elapsed",
			color: "white",
			backgroundColor: "blue",
			buffer: false
		});
		var timeRemaining = new TextView({
			superview: timeBar,
			layout: "box",
			flex: 1,
			text: "remaining",
			color: "white",
			backgroundColor: "black",
			buffer: false
		});
		var currentTrack;
		var barInterval;
		var stopUpdate = function() {
			if (barInterval) {
				clearInterval(barInterval);
				barInterval = null;
			}
		};
		var _updateTrack = function() {
			if (!sound.isPlaying(currentTrack)) {
				stopUpdate();
			} else {
				var duration = sound.getDuration(currentTrack);
				var progress = sound.getTime(currentTrack);
				if (progress && duration) {
					timeElapsed.style.layoutWidth = (100 * progress / duration) + "%";
				}
			}
		};
		var followTrack = function(trackName) {
			currentTrack = trackName;
			if (!barInterval) {
				barInterval = setInterval(_updateTrack, 50);
			}
		};

		// positions of sound effects on sfx soundsheet
		var SFX = [
			{ time: 0, duration: 2.5 },
			{ time: 2.5, duration: 0.5 },
			{ time: 3, duration: 2 }
		];
		// button input event handlers
		btn1.on("InputSelect", function() {
			// play the first track
			logger.log("playing first track");
			sound.play("track1");
			followTrack("track1");
		});
		btn2.on("InputSelect", function() {
			// get the first track's current time
			var t = sound.getTime("track1");
			logger.log("playing second track starting at:", t);
			// play the second track
			sound.play("track2", { time: t });
			followTrack("track2");
		});
		btn3.on("InputSelect", function() {
			// pause and resume warning sound
			if (sound.isPlaying("warning")) {
				logger.log("pausing warning sound");
				sound.pause("warning");
			} else {
				logger.log("playing warning sound");
				sound.play("warning");
				followTrack("warning");
			}
		});
		btn4.on("InputSelect", function() {
			// play random effect from soundsheet
			var i = ~~(Math.random() * SFX.length);
			logger.log("playing sound", i);
			sound.play("sfx", SFX[i]);
			followTrack("sfx");
		});
	};
});

//## Class: SoundView
//Create a button which can be clicked to play a sound.
var SoundButton = Class(ButtonView, function(supr) {
	this.init = function(opts) {
		supr(this, "init", [merge(opts, {
			flex: 1,
			margin: 10,
			centerX: true,
			scaleMethod: "9slice",
			images: {
				up: "resources/images/blue1.png",
				down: "resources/images/blue2.png"
			},
			sourceSlices: {
				horizontal: {left: 80, center: 116, right: 80},
				vertical: {top: 10, middle: 80, bottom: 10}
			},
			destSlices: {
				horizontal: {left: 40, right: 40},
				vertical: {top: 4, bottom: 4}
			},
			text: {
				wrap: true
			}
		})]);
	};
});

//The output should look like this screenshot:
//<img src="./doc/screenshot.png" alt="a book screenshot" class="screenshot">