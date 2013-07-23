exports.load = function (app) {
//  will use app cache, but must tinker first...
//	console.log(GLOBAL.CACHE['resources/i18n/en.json']);
//  for now, use en.json right here
	console.log(require('./en.json'));
};