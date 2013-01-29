colorTxt = function(txt, color, italic) {
	return '<span style="color:' + color + '' + (italic ? ';font-style:italic;' : '') + '">' + txt + '</span>';
};

exports = function(data) {
	var s = colorTxt(' // Use color bitmap font...', '#FFBB00') + '<br />' +
			'ctx.font ' +
			colorTxt('=', '#DD9900') + ' ' + 
			colorTxt('\'40px ' + data.contextName + ' color\'', '#00DDAA', true) + ';' +
			'<br />' +

			'ctx.fillText(' +
			colorTxt('\'The quick brown fox jumped...\'', '#00DDAA', true) +
			', ' +
			colorTxt('0', '#FFEE00') +
			', ' +
			colorTxt('5', '#FFEE00') +
			');<br />' +

			'<br />' +
			colorTxt(' // Use font with fillStyle or strokeStyle...', '#FFBB00') + '<br />' +
			'ctx.font ' +
			colorTxt('=', '#DD9900') + ' ' + 
			colorTxt('\'15px ' + data.contextName + ' composite\'', '#00DDAA', true) +
			';<br />' +

			'ctx.strokeStyle ' +
			colorTxt('=', '#DD9900') + ' ' + 
			colorTxt('"#0033DD"', '#FFEE00') +
			';<br />' +

			'ctx.strokeText(' +
			colorTxt('\'over the lazy dogs back...\'', '#00DDAA', true) +
			', ' +
			colorTxt('20', '#FFEE00') +
			', ' +
			colorTxt('30', '#FFEE00') +
			');<br />' +

			'ctx.fillStyle ' +
			colorTxt('=', '#DD9900') + ' ' + 
			colorTxt('"#FFDD00"', '#FFEE00') +
			';<br />' +

			'ctx.fillText(' +
			colorTxt('\'over the lazy dogs back...\'', '#00DDAA', true) +
			', ' +
			colorTxt('20', '#FFEE00') +
			', ' +
			colorTxt('30', '#FFEE00') +
			');<br />';

	return s;
};