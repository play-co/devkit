// initialize the browser runtime
import device;
import platforms.browser.initialize;
device.init();

// initialize the GC runtime
import gc.API;

// install globals
jsio.__jsio("from base import *");

// evaluate inline scripts
try {
	window.addEventListener('load', function () {
		Array.prototype.slice.call(document.getElementsByTagName('script')).forEach(function (tag) {
			if (tag.type == 'text/jsio') {
				jsio.__jsio.eval(tag.innerHTML);
			}
		});
	});
} catch (e) {};
