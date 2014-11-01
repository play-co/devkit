//# Create a SpriteView <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/ui/spriteview-basic/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//Given the following project layout for resources:
//<pre>
//project
//.
//├── manifest.json
//├── sdk/ -> /path/to/basil/sdk
//├── build/
//├── resources/
//│   └── images/
//│        └── bot/
//│             ├── sdkBot-idle-0001.png
//│             ├── sdkBot-idle-0002.png
//│             ├── sdkBot-idle-0003.png
//│             ├── sdkBot-idle-0004.png
//│             ├── sdkBot-idle-0005.png
//│             ├── sdkBot-idle-0006.png
//│             ├── sdkBot-idle-0007.png
//│             ├── sdkBot-idle-0008.png
//│             ├── sdkBot-idle-0009.png
//│             ├── sdkBot-idle-0010.png
//│             ├── sdkBot-walk-0001.png
//│             ├── sdkBot-walk-0002.png
//│             ├── sdkBot-walk-0003.png
//│             ├── sdkBot-walk-0004.png
//│             ├── sdkBot-walk-0005.png
//│             ├── sdkBot-walk-0006.png
//│             ├── sdkBot-walk-0007.png
//│             ├── sdkBot-walk-0008.png
//│             ├── sdkBot-walk-0009.png
//│             └── sdkBot-walk-0010.png
//└── src/
//    └── Application.js
//</pre>

import ui.SpriteView as SpriteView;

//## Class: Application
exports = Class(GC.Application, function () {
	this.initUI = function () {
		this.style.backgroundColor = "#FFFFFF";

		var sprite = new SpriteView({
			superview: this.view,
			x: this.style.width / 2 - 100,
			y: this.style.height / 2 - 100,
			width: 200,
			height: 200,
			url: "resources/images/bot/sdkBot",
			defaultAnimation: "idle"
		});

		//Play the 'walk' animation once, then return to idle.
		sprite.startAnimation("walk");
	};
});
