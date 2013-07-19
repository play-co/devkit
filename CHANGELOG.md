## 0.1.29 (July 19, 2013)
 - new TextEditView: embedded text input field with device keyboard
 - new engine option: scaleUI
 - new device flags: isIOSSimulator, isAndroidSimulator
 - better ImageScaleView
   - cache slice data instead of calculating every time
   - compute cover clipping bounds instead of setting clip to true
 - faster ScoreView
 - full support for base64 images
 - GestureView drag deltas work with scale
 - improved basil path finder
 - improved iOS OpenURL handler
 - addon improvements
   - support frameworks, bundles, and dependencies
   - cleaner error handling for missing addons and JSON configuration
 - new addons
   - AirPush
   - Amplitude
   - AppFlood
   - Appnext
   - Flurry
   - InMobi
   - LeadBolt
   - MoPub
   - TapForTap
   - Tapjoy

## 0.1.28 (July 12, 2013)
 - iOS support for addon frameworks and dynlib, thanks to Mart Roosmaa
 - improved layers and tools for isometric game engine, thanks to Christopher Hiller
 - ButtonView with toggleSelected starts unselected
 - ButtonView can be disabled in onClick handler
 - restart JS and renderer if iOS release build runs out of memory
 - ListView can be initialized with predefined selections
 - draggable views via makeDraggable function
 - restore Android JS viewport regardless of IsEmpty state
 - fixes for iOS static library builds
 - new addons
   - Chartboost
   - GoogleAnalytics
   - Trademob
   - Jumptap

## 0.1.27 (July 3, 2013)
 - draggable Views, new options: dragRadius, unboundDrag
 - SliderView behaves consistently regardless of scale
 - enforce ImageView aspect ratio in flex linear layout
 - reenabled TextView buffering
 - native-core
   - no filter inheritance
   - set current shader before updating
   - bind primary shader in clearRect
   - flush textures before updating active context
 - Android
   - better visibility into build failures
   - more informative plugin warnings
   - fixed NPE on back pressed with malformed plugin
 - fixed iOS testapp crash on reload

## 0.1.26 (June 28, 2013)
 - more efficient collision detection in shooter game engine
 - FingerDown and ClearMulti events for GestureView
 - full support for multitouch drag
 - improved OpenGL visibility on iOS
 - better ButtonView selection state logic
 - simulator launch waits for debugging connect

## 0.1.25 (June 25, 2013)
 - fixed splash copying, thanks to rampr
 - new GestureView with Swipe, Pinch, Rotate, DragSingle, and FingerUp events
 - fixed App Store bundle id setting in plist
 - removed UDID in compliance with Apple's new policies

## 0.1.24 (June 21, 2013)
 - new isometric game engine
 - improved ButtonView selection toggling, thanks to rampr
 - improved installation process
 - addon system support for minimal configuration
 - new engine option: noReflow
 - ButtonView text works without reflow
 - improved native-ios installation
 - basil init doesn't generate outdated license info
 - native-android doesn't crash on missing resource
 - simulator/testapp doesn't crash on missing splash
 - default addons
   - examples
   - billing
   - geoloc
 - new isometric examples
 - new billing example
 - new billing addon

## 0.1.23 (June 18, 2013)
 - Translate 3D support for DOM, thanks to Austin Hammer
 - window.onerror support for iOS
 - autoSized ImageViews play nice with layouts
 - improved compile-time audio selection
 - more efficient resource preloading
 - installation script installs examples

## 0.1.22 (June 14, 2013)
 - addon system
 - TextView font size scales to fit view by default
 - images
   - Image caching for SpriteViews and ImageViews
   - much faster ImageView.setImage
   - ImageScaleView.updateOpts merges in initialization opts
   - Image.destroy only affects native source image
 - layout system
   - more flexible system supports more usage patterns
   - removed regex for faster reflow
   - layouts play nice with web builds
 - menu system - TextDialogView
   - setButtons
   - support back and close buttons, based on opts
 - simulator home screen button triggers pageshow/pagehide events
 - iOS XHR returns status 0 and null data on connection failure
 - device.isSimulator
 - added basic analytics
 - new linear layout example
 - new geolocation plugin

## 0.1.21 (June 3, 2013)
 - menu system
   - titles always centered and never overlap buttons
   - disable input before transitioning out
 - ScoreView works with layout properties
 - View.getBoundingShape works with layout properties
 - fixed TextView alignment with stroke
 - fixed js.io compilation bug
 - ScoreView example style fixes

## 0.1.20 (May 31, 2013)
 - improved sizing rules for menu system, thanks to Duncan Beevers
 - various menu system layout improvements
 - window.open for browser, Android, and iOS
 - fixedAspectRatio option for ImageViews
 - fixed js.io compilation bug
 - fixed TextView.getTag
 - updated ViewPool code in Platformer game engine

## 0.1.19 (May 24, 2013)
 - new Shooter game engine
 - new ScoreView class for high-performance text rendering with images
 - improved ViewPools, including patch from Duncan Beevers
 - always preload browser sounds
 - fixed race condition of trying to play browser sound before it is loaded
 - fixed TextView clipping and color caching
 - fixed two race conditions in native-android
 - device.collectGarbage()
 - new drag and drop example

## 0.1.18 (May 17, 2013)
 - menu system

## 0.1.17 (May 15, 2013)
 - fixed nonexistent GC.app in demo builds
 - fixed platformer submodule reference

## 0.1.16 (May 15, 2013)
 - SpriteView can generate animations from prebuilt spritesheets
 - inactive background volume setting doesn't freeze audio
 - new example of using SpriteViews and ImageViews with prebuilt spritesheets
 - reduced number of Android permissions
 - platformer game engine added to projects

## 0.1.15 (May 8, 2013)
 - fixed web builds
 - AudioManager.setVolume doesn't load inactive sounds
 - fixed TextView buffering on device
 - disabled TextView buffering on web and in simulator

## 0.1.14 (May 6, 2013)
 - fixed package.json wrong version issue
 - fixed about pane version switcher
 - improved filters
 - new AudioManager APIs
   - all sounds: isPaused
   - background: setTime, getTime, getDuration, isPlaying
   - new play options: time, duration
 - fixed iOS pause/resume of background sounds
 - replaced NATIVE APIs with handler setters on device
   - setBackButtonHandler, setRotationHandler
 - fixed zero-dimension edge case for buffered TextView
 - new example of playing with audio time
 - new TextView option: hardWrap
 - fixed TextView clipping
 - disabled verbose logs

## 0.1.13 (Apr. 25, 2013)
 - buffered (more performant) TextViews
 - fixed subtle pause/resume canvas texture bug
 - fixed install read error due to node bug
 - device rotation events
 - fixed version mismatch

## 0.1.12 (Apr. 19, 2013)
 - user can specify engine settings via GC.app._settings
 - removed deprecated circle property
 - windows installer runs npm link instead of asking about global install
 - fixed hanging update script
 - fixed animate resume
 - more robust stream reader
 - password mode for TextPromptView

## 0.1.11 (Apr. 15, 2013)
 - fixed crash on path with non-directory (updated jash version dependency)
 - fixed image view positioning (removed unnecessary rounding)
 - removed browser-only xml mode from reader
 - fixed View.removeFilter on native
 - better installation process
 - improved linux support
 - new socket example
 - fixed TextView UI Inspector tag
 - examples no longer try to register dot files
 - faster blockEvents handling
 - new ParticleEngine
 - fixed basil crash on path with space
 - new particle engine example

## 0.1.10 (Apr. 4, 2013)
- Better Windows support
- All: Fixes for Sockets and new socket stream multi-reader
- Android: Fixed TestApp crash on startup
- iOS: Fixed TestApp JS Remote Debugging on game restart
- All: Fixed animation group Finish event
- iOS: Now delivers orientation change events to JS

## 0.1.9 (Mar. 28, 2013)
- Fixed mute button bug in simulator
- Fixed issue with sound preloader on android
- Fixed splash screen resizing on android
- **Added native support for ctx.createPattern**
- Fixed an issue with ButtonView

## 0.1.8 (Mar. 14, 2013)
- Fixed a bug with node v0.10 and path.join
- No long treat hidden files/folders as projects or addons
- Removed the automatic posting of error logs
- Added --install and --open flags to android builds
- Removed outdated `basil serve` logic and styling

## 0.1.5 - 0.1.7 (Mar. 7, 2013)
- Fixed `basil update` analytics and git usage
- Fixed ListView example
- Fixed looping when loop is set in AudioManager config
- Android: Fixed back button press consumption

## 0.1.4 (Mar. 6, 2013)
- **Offline Documentation cache**
- Added usage statistics tracking
- Added user registration
- Fixed debugging Remote Debugger remotely
- Fixed bug in TextView `setText`
- Fixed ButtonView states
- Fixed a bug with the mobile safari simulator

## 0.1.3 (Feb. 28, 2013)
- **Revamped splash screens**
- Added **ViewPool** class
- Use jmdns instead of dns-sd for cross platform support
- Fix to project title/shortName when running basil init
- Fixed debug logger to allow basil to be served from non-default port
- Fixed `basil update`, `basil clean-register`
- Fixes to ButtonView and ImageScaleView
- Fixed devicePixelRatio bug on native

## 0.1.2 (Feb. 21, 2013)
- Added `basil which` command
- Style upgrade for the WebUI
- Fixed browser font size bug

## 0.1.1 (Feb. 13, 2013)
- Style upgrade for the WebUI
- IE9 compatibility for ui.View
- Added `isRunning` flag to engine
- Fixes to ButtonView, GridView, and ImageView
- Fixes to device.width and device.screen.width for canvas
- Fixed browser mute bug

## 0.1.0 (Feb. 11, 2013)
- **Initial release**
