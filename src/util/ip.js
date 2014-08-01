var os = require('os');
var isWindows = os.platform() == 'win32';

exports.getLocalIP = function () {
	var interfaces = os.networkInterfaces();
	var ips = [];

	for (var name in interfaces) {
		if (/e(n|th)\d+/.test(name) || isWindows) {
			for (var i = 0, item; item = interfaces[name][i]; ++i) {
				// ignore IPv6 and local IPs
				if (item.family == 'IPv4' && !item.internal) {
					ips.push(item.address);
				}
			}
		}
	}

	return ips;
}
