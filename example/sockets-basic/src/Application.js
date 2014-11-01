//# Basic TCP Client
//This examples demostrates how to connect to a TCP server to send and receive data.
//*NOTE: Native ONLY.*

//Import various useful UI elements
import ui.TextView as TextView;
import ui.View as View;
import ui.widget.ButtonView as ButtonView;

//**IMPORTANT:** Plug in your server's IP address
var ipAddr = '';

//## Class: Application
//The entry point of the application.
exports = Class(GC.Application, function () {

	this.initUI = function () {
		//Make sure that the IP has been set
		if (ipAddr === '') {
			//Otherwise, display an error
			new TextView({
				superview: this.view,
				backgroundColor: '#000',
				layout: 'box',
				text: 'PLEASE ENTER SERVER IP THROUGH THE CODE!!',
				layoutWidth: '80%',
				layoutHeight: '100%',
				wrap: true,
				centerX: true,
				centerY: true,
				color: '#FFF',
				size: 40,
			});

			return;
		};
		//Setup the UI
		this.view.updateOpts({
			backgroundColor: '#000',
			layout: 'linear',
			direction: 'vertical',
			justifyContent: 'space-outside'
		});
		//Simple buttons with their respective functionality
		var connectBtn = this._menuButton('Connect', '#666666', connect.bind(this));
		var sendBtn = this._menuButton('Send Data', '#888888', send.bind(this));
		var disconnectBtn = this._menuButton('Disconnect', '#AAAAAA', disconnect.bind(this));
		//A logging area
		this.logArea = new TextView({
			superview: this.view,
			layoutWidth: '95%',
			layoutHeight: '40%',
			text: 'Press Connect to Start',
			color: '#FFF',
			wrap: true,
			size: 32
		});
	};
	//Button click event handlers 
	//Connect button handler
	function connect () {
		//Specify the host and port number of the TCP server
		var host = ipAddr;
		var port = 8338;

		var logger = _logger.bind(this);
		logger('Connecting to ' + ipAddr + ':' + port);

		//Create a socket object:
		//1- Import the native socket library
		import gc.native.socketTransport;
		//2- hold a reference to the `Socket` class
		var Socket = gc.native.socketTransport.Socket;
		//3- Instantiate a socket by passing the IP and port
		//NOTE: creating a socket object will attempt to connect automatically
		this._socket = new Socket(host, port);
		//Hook the event handlers that will simply update the UI:
		this._socket.onError = function () { logger('Error ... :/') }
		this._socket.onClose = function () { logger('Socket closed') }
		this._socket.onConnect = function () { logger('Connected!') }
		this._socket.onRead = function (data) { logger('Received Data!\n' + data) }
	}
	//Send data button handler
	function send () {
		console.log('send button tapped');
		//Simply call send method on your socket object.
		this._socket.send('This should work, no?');
	}
	//Disconnect button handler
	function disconnect () {
		console.log('disconnect button pressed');

		this._socket.close();
	}

	//A function to help us with the logging process
	function _logger (text) {
		var append = this.logArea.getText() + '\n' + text;
		this.logArea.setText(append);
	}
	//Simple helper function to construct a button
	this._menuButton = function (text, color, callback) {
		return new ButtonView({
			superview: this.view,
			title: text,
			backgroundColor: color,
			text: {
				color: '#FFFFFF',
				size: 36,
				autoFontSize: false,
				autoSize: false
			},
			layoutWidth: '90%',
			layoutHeight: '15%',
			centerX: true,
			on : {
				up: callback
			}
		});
	}
	
	this.launchUI = function () {};

});
//<img src="./doc/screenshot.png" alt="trail screenshot" class="screenshot">