import util.ajax;

/**
 * Load projects.
 */

util.ajax.get({
	url: '/projects',
	type: 'json',
	data: {extended: true}
}, function (err, response) {
	if (err) {
		return handleError(err, 'could not list projects');
	}

	for (var app_id in response) {
		var link = document.createElement('a');
		link.setAttribute('style', 'display: block; padding: 10px 15px; background: #eee; border-bottom: 1px solid black;');
		link.appendChild(document.createTextNode(app_id));
		document.body.appendChild(link);
		link.href = '/simulate/' + app_id + '/browser-mobile/';
	}
});