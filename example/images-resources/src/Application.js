//# Packing images in sprite sheets <a title="View raw file" href="https://raw.github.com/gameclosure/examples/master/src/images/resources/src/Application.js"><img src="../../include/download_icon.png" class="icon"></a>
//This file shows different scaling and compression options.
//The metadata.json files in the resources/images subdirectories set the
//properties which are applied to the images by the spriter.

//The SDK allows you to control the scaling of the images in the resource files which are
//created when building the application.

//The properties are set in `metadata.json` files. A metadata file controls the export settings
//of all files and sub directories of the directory where the file is located. The properties
//can be overwritten by metadata files in subdirectories.

//This example shows three different metadata files.

//The file `resources/images/a/metadata.json` lists three targets, when building the application
//these images in `resources/images/a` will be included for all these targets.
//<pre>
//{
//  "targets": [
//    "native-android",
//    "native-ios",
//    "browser-desktop"
//  ]
//}
//</pre>

//The file `resources/images/b/metadata.json` lists three targets and adds a scaling setting.
//<pre>
//{
//  "targets": [
//    "native-android",
//    "native-ios",
//    "browser-desktop"
//  ],
//  "scale": 0.1
//}
//</pre>

//If you only want to apply the scaling to a specific target, let's say `native-ios` then
//you can use the following settings:
//<pre>
//{
//  "targets": [
//    "native-android",
//    "native-ios",
//    "browser-desktop"
//  ],
//  "native-ios": {
//	  "scale": 0.1
//  }
//}
//</pre>

//The file `resources/images/c/metadata.json` lists three targets and adds sets the compression method.
//<pre>
//{
//  "targets": [
//    "native-android",
//    "native-ios",
//    "browser-desktop"
//  ],
//  "scale": 0.5,
//  "png8": true
//}
//</pre>

//Import device to get the screen size and the ImageView class to display images.
import device as device;
import ui.ImageView as ImageView;

//## Class: Application
//Create a class and default settings.
exports = Class(GC.Application, function () {

	this.initUI = function () {
		this.view.updateOpts({backgroundColor: "#808080"});

		var left = (device.width - 80 * 3 + 5) / 2;

		// The first row does not apply any scaling or compression
		// In the second row the images scaled to 10 percent of their original size
		// In the third row the images are scaled 50 percent and png8 compression is used
		for (var y = 0; y < 3; y++) {
			for (var x = 0; x < 3; x++) {
				new ImageView({
					superview: this.view,
					x: left + x * 80,
					y: 10 + y * 80,
					width: 70,
					height: 70,
					image: "resources/images/" + String.fromCharCode(97 + y) + "/window" + (x + 1) + ".png"
				});
			}
		}
	};

	this.launchUI = function () {};
});

//The output should look like this screenshot:

//<img src="./doc/screenshot.png" alt="nine tiles with different resource options" class="screenshot">

//The first row of images uses the original quality, the second scales the image down
//to 10% and the third row scales the images 50% and uses png8 compression.
