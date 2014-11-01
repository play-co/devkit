import device;
import ui.ImageView as ImageView;
import ui.ParticleEngine as ParticleEngine;

exports = Class(GC.Application, function(supr) {

	// constants
	var FLAME_WIDTH = 51,
		FLAME_HEIGHT = 76,
		FLAME_R = -Math.PI / 18,
		FLAMES = [
			"resources/images/fire1Left.png",
			"resources/images/fire2Left.png",
			"resources/images/fire3Left.png",
			"resources/images/fire4Left.png",
			"resources/images/fire1Right.png",
			"resources/images/fire2Right.png",
			"resources/images/fire3Right.png",
			"resources/images/fire4Right.png"
		],
		SPARK_IMAGE = "resources/images/spark.png",
		SMOKE_IMAGE = "resources/images/smoke.png";

	// initialization
	this.initUI = function() {
		// create the torch image
		this.torch = new ImageView({
			parent: this,
			layout: 'box',
			image: "resources/images/torch.png",
			bottom: 0,
			centerX: true,
			autoSize: true
		});

		// create the particle engine
		this.torchFlame = new ParticleEngine({
			parent: this.torch,
			r: FLAME_R,
			width: FLAME_WIDTH,
			height: FLAME_HEIGHT,
			centerAnchor: true
		});
	};

	this.launchUI = function() {
		// subscribe to GC engine's tick event
		this.engine.on('Tick', bind(this, function(dt) {
			// trigger new particles about half the time
			if (Math.random() < 0.5) {
				// emit ten flame/spark/smoke particles
				this.emitFlameParticles();
			}

			// tick particle engine
			this.torchFlame.runTick(dt);
		}));
	};

	this.emitFlameParticles = function() {
		// obtain 10 particle objects from particle engine
		var data = this.torchFlame.obtainParticleArray(10);

		// iterate through particle objects
		for (var i = 0; i < 10; i++) {
			// take particle object i
			var pObj = data[i];

			// roll to see which fire-related particle to emit
			var roll = Math.random();

			// build particle object determined by roll
			if (roll < 0.8) {
				// flame
				var ttl = Math.random() * 1200 + 400;
				var width = Math.random() * FLAME_WIDTH / 3 + 2 * FLAME_WIDTH / 3;
				var height = FLAME_HEIGHT * width / FLAME_WIDTH;

				pObj.image = FLAMES[~~(Math.random() * FLAMES.length)];
				pObj.x = Math.random() * FLAME_WIDTH / 3 - FLAME_WIDTH / 6 + 3 + Math.random() * 3;
				pObj.y = FLAME_HEIGHT - 1.2 * height;
				pObj.dr = -FLAME_R * 1000 / ttl;
				pObj.ax = width / 2;
				pObj.ay = height / 2;
				pObj.width = width;
				pObj.height = height;
				pObj.dheight = pObj.ddheight = Math.random() * 150;
				pObj.dy = pObj.ddy = -pObj.dheight;
				pObj.dscale = 0.1;
				pObj.opacity = 0;
				pObj.dopacity = 4000 / ttl;
				pObj.ddopacity = -4 * pObj.dopacity;
				pObj.ttl = ttl;
			} else if (roll < 0.9) {
				// spark
				var ttl = Math.random() * 6000 + 2000;
				var width = Math.random() * 10 + 2;
				var height = width;

				pObj.image = SPARK_IMAGE;
				pObj.x = FLAME_WIDTH / 2 - width / 2 + Math.random() * 16 + 8;
				pObj.y = Math.random() * FLAME_HEIGHT - height;
				pObj.dx = Math.random() * 50 - 25;
				pObj.dy = -Math.random() * 150 - 75;
				pObj.dr = Math.random() * 2 * Math.PI;
				pObj.ddx = Math.random() * 100 - 50;
				pObj.ddy = -Math.random() * 75;
				pObj.ax = width / 2;
				pObj.ay = height / 2;
				pObj.dax = Math.random() * 60 - 30;
				pObj.day = Math.random() * 60 - 30;
				pObj.ddax = -pObj.dax / 2;
				pObj.dday = -pObj.day / 2;
				pObj.width = width;
				pObj.height = height;
				pObj.dopacity = -1000 / ttl;
				pObj.ttl = ttl;
			} else if (roll < 1) {
				// smoke
				var ttl = Math.random() * 20000 + 10000;
				var width = Math.random() * 32 + 32;
				var height = width;

				pObj.image = SMOKE_IMAGE;
				pObj.x = FLAME_WIDTH / 2 - width / 2 + Math.random() * 16 + 8;
				pObj.y = -height;
				pObj.dx = Math.random() * 10 - 5;
				pObj.dy = -Math.random() * 140 - 70;
				pObj.dr = Math.random() * Math.PI / 4;
				pObj.ddx = Math.random() * 36 - 18;
				pObj.ddy = -Math.random() * 44 + 6;
				pObj.ax = width / 2;
				pObj.ay = height / 2;
				pObj.width = width;
				pObj.height = height;
				pObj.dscale = Math.random() * 0.5 + 0.25,
				pObj.opacity = 0.6,
				pObj.dopacity = -1000 / ttl;
				pObj.ddopacity = -Math.random() * 1000 / ttl;
				pObj.ttl = ttl;
			}
		}

		// emit all 10 particles
		this.torchFlame.emitParticles(data);
	};
});