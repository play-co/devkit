from util.browser import $;

var _facebookBar;

exports.create = function (simulator) {
  if (!_facebookBar) {
    var bar = _facebookBar = $.create({
      parent: simulator.getElement(),
      style: {
        position: 'absolute',
        top: '0px',
        left: '0px',
        right: '0px',
        bottom: '0px',
        zIndex: 0,
        minWidth: '1052px',
        background: 'url("images/facebook-header-center.png") repeat-x'
      }
    });

    bar.innerHTML = "<div style='position:absolute;top:0px;left:0px;width:636px;height:44px;background:url(images/facebook-header-left.png)'></div>"
      + "<div style='position:absolute;top:0px;right:0px;width:296px;height:44px;background:url(images/facebook-header-right.png)'></div>"
      + "<div style=\"position:absolute;top:13px;left:56px;width:550px;height:20px;cursor:default;color:#141823; white-space: nowrap; overflow: hidden; font: 14px 'Helvetica Neue', Helvetica, Arial, 'lucida grande', tahoma, verdana, arial, sans-serif; font-weight: bold; \"></div>";

    var rightBar = $.create({
      parent: bar,
      style: {
        position: 'absolute',
        top: '44px',
        bottom: '0px',
        right: '10px',
        width: '244px',
        backgroundColor: '#FAFAF9',
        borderColor: '#B3B3B3',
        borderWidth: '0px 1px',
        borderStyle: 'solid',
        zIndex: 1
      }
    });
  }

  $.style(simulator.getElement(), {
    background: '#FFF'
  });
}

exports.destroy = function (simulator) {
  if (_facebookBar) {
    $.remove(_facebookBar);

    $.style(simulator.getElement(), {
      background: ""
    });

    _facebookBar = null;
  }
}
