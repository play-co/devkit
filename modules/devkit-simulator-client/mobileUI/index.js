import .embeddedCSS;
import .swipeUpListener;
import .debugMenu;

swipeUpListener.on('swipe', function () {
  debugMenu.show();
});
