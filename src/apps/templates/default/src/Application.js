import ui.TextView as TextView;

exports = Class(GC.Application, function () {

  this.initUI = function () {

    this.tvHelloWorld = new TextView({
      superview: this.view,
      text: 'Hello, world!',
      color: 'white',
      x: 0,
      y: 100,
      width: this.view.style.width,
      height: 100
    });

  };

  this.launchUI = function () {

  };

});
