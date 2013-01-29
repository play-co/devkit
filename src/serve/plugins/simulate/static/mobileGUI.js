"use import";

from util.browser import $;

exports.start = function() {
	var select = $({
		tag: 'select',
		parent: document.body,
		children: [
			$({tag: 'option', attrs: {value: 'single'}, text: 'single'}),
			$({tag: 'option', attrs: {value: 'multi'}, text: 'multi'}),
			$({tag: 'option', attrs: {value: 'intro'}, text: 'intro'})
		]
	});

	$.onEvent($({
		tag: 'button',
		parent: document.body,
		text: 'launch!'
	}), 'click', function() {
		
		// figure out the device type
		var ua = navigator.userAgent;
		var isIOS = /(iPod|iPhone|iPad)/i.test(ua);
		var isAndroid = !isIOS && /Mobile Safari/.test(ua);
		
		window.location = 'browser-mobile/?device&entry=' + select.value;
	});
};
