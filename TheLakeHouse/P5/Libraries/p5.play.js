/**
 * p5.play
 *
 * @version 3.3
 * @author quinton-ashley
 * @year 2022
 * @license gpl-v3-only
 * @descripton p5.play is a 2D game engine that uses planck (Box2D) to simulate
 * physics and provides sprites, a tile system, input handling, and animations!
 *
 * Created by Quinton Ashley @qashto, 2022
 * https://quintos.org
 *
 * Initiated by Paolo Pedercini @molleindustria, 2015
 * https://molleindustria.org/
 */
p5.prototype.registerMethod('init', function p5PlayInit() {
	const log = console.log; // shortcut
	this.log = console.log;

	// store a reference to the p5 instance that p5play is being added to
	let pInst = this;
	// change the angle mode to degrees
	this.angleMode(p5.prototype.DEGREES);

	if (typeof window.planck == 'undefined') {
		throw new Error('planck.js must be loaded before p5.play');
	}

	const pl = planck;
	// set the velocity threshold to allow for slow moving objects
	pl.Settings.velocityThreshold = 0.19;
	let plScale = 60;

	this.p5play = this.p5play || {
		os: {
			emulated: false
		}
	};
	this.p5play.autoDrawSprites ??= true;
	this.p5play.autoUpdateSprites ??= true;
	this.p5play.mouseTracking ??= true;
	this.p5play.mouseSprite = null;
	this.p5play.mouseSprites = [];
	this.p5play.standardizeKeyboard = false;

	const scaleTo = ({ x, y }, tileSize) => new pl.Vec2((x * tileSize) / plScale, (y * tileSize) / plScale);
	const scaleXTo = (x, tileSize) => (x * tileSize) / plScale;
	const scaleFrom = ({ x, y }, tileSize) => new pl.Vec2((x / tileSize) * plScale, (y / tileSize) * plScale);
	const fixRound = (val) => (Math.abs(val - Math.round(val)) <= pl.Settings.linearSlop ? Math.round(val) : val);
	const isArrowFunction = (fn) =>
		!/^(?:(?:\/\*[^(?:\*\/)]*\*\/\s*)|(?:\/\/[^\r\n]*))*\s*(?:(?:(?:async\s(?:(?:\/\*[^(?:\*\/)]*\*\/\s*)|(?:\/\/[^\r\n]*))*\s*)?function|class)(?:\s|(?:(?:\/\*[^(?:\*\/)]*\*\/\s*)|(?:\/\/[^\r\n]*))*)|(?:[_$\w][\w0-9_$]*\s*(?:\/\*[^(?:\*\/)]*\*\/\s*)*\s*\()|(?:\[\s*(?:\/\*[^(?:\*\/)]*\*\/\s*)*\s*(?:(?:['][^']+['])|(?:["][^"]+["]))\s*(?:\/\*[^(?:\*\/)]*\*\/\s*)*\s*\]\())/.test(
			fn.toString()
		);

	let spriteProps = [
		'bounciness',
		'collider',
		'color',
		'density',
		'd',
		'debug',
		'diameter',
		'direction',
		// 'directionLock',
		'drag',
		'dynamic',
		'friction',
		'h',
		'height',
		'heading',
		'isSuperFast',
		'kinematic',
		'layer',
		'life',
		'mass',
		'rotation',
		'rotationDrag',
		'rotationLock',
		'rotationSpeed',
		'scale',
		'shape',
		'speed',
		'static',
		'text',
		'textColor',
		'tileSize',
		'visible',
		'w',
		'width',
		'x',
		'xLock',
		'y',
		'yLock'
	];

	let eventTypes = {
		_collisions: ['_collides', '_colliding', '_collided'],
		_overlappers: ['_overlaps', '_overlapping', '_overlapped']
	};

	p5.Vector.prototype._angleBetween = p5.Vector.prototype.angleBetween;
	p5.Vector.prototype.angleBetween = function (v) {
		let a = this._angleBetween(v);
		if (!isNaN(a)) return a;
		return 0;
	};

	/**
	 * Look at the Sprite reference pages before reading these docs.
	 *
	 * https://p5play.org/learn/sprite.html
	 *
	 * Every sprite you create is added to the allSprites
	 * group and put on the top layer, in front of all other
	 * previously created sprites.
	 *
	 * @example
	 *
	 *   let rectangle = new Sprite(x, y, width, height);
	 *
	 *   let circle = new Sprite(x, y, diameter);
	 *
	 *   let line = new Sprite(x, y, [length, angle]);
	 *
	 *   let chain = new Sprite(x, y, [length0, angle0, length1, angle1]);
	 *
	 * @class Sprite
	 * @constructor
	 * @param {String|SpriteAnimation|p5.Image} [aniName|ani|image]
	 * @param {Number} x Horizontal position of the sprite
	 * @param {Number} y Vertical position of the sprite
	 * @param {Number} [width|diameter] Width of the placeholder rectangle and of
	 * the collider until an image or new collider are set. *OR* If height is not
	 * set then this parameter becomes the diameter of the placeholder circle.
	 * @param {Number} [height] Height of the placeholder rectangle and of the collider
	 * until an image or new collider are set
	 * @param {String} [physics] collider type is 'dynamic' by default, can be
	 * 'static', 'kinematic', or 'none'
	 */
	class Sprite {
		constructor(x, y, w, h, collider) {
			this.idNum = pInst.world.spritesCreated;
			pInst.world.spritesCreated++;
			this.p = pInst;

			let args = [...arguments];

			let group, ani;

			if (args[0] !== undefined && args[0] instanceof Group) {
				group = args[0];
				args = args.slice(1);
			}

			if (!args.length) this._noArgs = true;

			if (
				args[0] !== undefined &&
				isNaN(args[0]) &&
				(typeof args[0] == 'string' || args[0] instanceof SpriteAnimation || args[0] instanceof p5.Image)
			) {
				// shift
				ani = args[0];
				args = args.slice(1);
			}

			if (args.length == 1 && typeof args[0] == 'number') {
				throw new FriendlyError('Sprite', 0, [args[0]]);
			}

			x = args[0];
			y = args[1];
			w = args[2];
			h = args[3];
			collider = args[4];
			this.originMode = 'center';

			if (Array.isArray(x)) {
				x = undefined;
				y = undefined;
				w = args[0];
				h = args[1];
				collider = args[2];
			}

			// if (w is chain array) or (diameter/side length and h is a
			// collider type or the name of a regular polygon)
			if (Array.isArray(w) || typeof h == 'string') {
				if (!isNaN(w)) w = Number(w);
				if (typeof w != 'number' && Array.isArray(w[0])) {
					this.originMode = 'start';
				}
				if (h !== undefined) {
					if (Array.isArray(h)) {
						throw new FriendlyError('Sprite', 1, [`[[${w}], [${h}]]`]);
					}
					let abr = h.slice(0, 2);
					// h is a collider type
					if (
						h == 'd' ||
						h == 's' ||
						h == 'k' ||
						h == 'n' ||
						abr == 'dy' ||
						abr == 'st' ||
						abr == 'ki' ||
						abr == 'no'
					) {
						collider = h;
					} else {
						// h is the name of a regular polygon
						if (h == 'circle') h == undefined;
						else if (h == 'triangle') w = [w, -120, 3];
						else if (h == 'square') w = [w, -90, 4];
						else if (h == 'pentagon') w = [w, -72, 5];
						else if (h == 'hexagon') w = [w, -60, 6];
						else if (h == 'septagon') w = [w, -51.4285714286, 7];
						else if (h == 'octagon') w = [w, -45, 8];
						else if (h == 'enneagon') w = [w, -40, 9];
						else if (h == 'decagon') w = [w, -36, 10];
						else if (h == 'hendecagon') w = [w, -32.7272727273, 11];
						else if (h == 'dodecagon') w = [w, -30, 12];
					}
					h = undefined;
				}
			} else if (isNaN(w)) {
				collider = w;
				w = undefined;
			}

			/**
			 * Groups the sprite belongs to, including allSprites
			 *
			 * @property groups
			 * @type {Array}
			 */
			this.groups = [];
			this.p.allSprites.push(this);

			/**
			 * Keys are the animation label, values are SpriteAnimation objects.
			 *
			 * @property animations
			 * @type {Object}
			 */
			this.animations = {};

			/**
			 * If false, animations that are stopped before they are completed,
			 * typically by a call to sprite.changeAni, will start at the frame
			 * they were stopped at. If true, animations will always start playing from
			 * frame 0 unless specified by the user in a separate anim.changeFrame
			 * call.
			 *
			 * @property autoResetAnimations
			 * @type {SpriteAnimation}
			 * @default false
			 */
			this.autoResetAnimations;

			/**
			 * True if the sprite was removed from the world
			 *
			 * @property removed
			 * @type {Boolean}
			 * @default false
			 */
			this.removed = false;

			if (group) {
				group.push(this);
				if (!ani) {
					for (let _ani in group.animations) {
						ani = _ani;
						break;
					}
				}
			} else {
				group = this.p.allSprites;
			}

			if (group.dynamic) collider ??= 'dynamic';
			if (group.kinematic) collider ??= 'kinematic';
			if (group.static) collider ??= 'static';
			collider ??= group.collider;

			this._shape = group.shape;

			/**
			 * Cycles before self removal.
			 * Set it to initiate a countdown, every draw cycle the property is
			 * reduced by 1 unit. If less than or equal to 0, this sprite will be removed.
			 *
			 * @property life
			 * @type {Number}
			 * @default 100000000
			 */
			this.life = 100000000;

			/**
			 * The sprite's visibility.
			 *
			 * @property visible
			 * @type {Boolean}
			 * @default true
			 */
			this.visible = true;

			/**
			 * Contains all the collision callback functions for this sprite
			 * when it comes in contact with other sprites or groups.
			 */
			this._collides = {};
			this._colliding = {};
			this._collided = {};

			this._overlap = {};
			/**
			 * Contains all the overlap callback functions for this sprite
			 * when it comes in contact with other sprites or groups.
			 */
			this._overlaps = {};
			this._overlapping = {};
			this._overlapped = {};

			this._collisions = new Map();
			this._overlappers = new Map();

			this.tileSize = group.tileSize || 1;

			let _this = this;

			// this.x and this.y are getters and setters that change this._pos
			// internally and this.pos and this.position get this._position
			this._pos = {
				x: 0,
				y: 0
			};

			this._position = {
				get x() {
					return _this.x;
				},
				set x(val) {
					_this.x = val;
				},
				get y() {
					return _this.y;
				},
				set y(val) {
					_this.y = val;
				}
			};

			// this._vel is used if the Sprite has no physics body
			this._vel = {
				x: 0,
				y: 0
			};

			// this._velocity extends p5.Vector
			this._velocity = pInst.createVector.call(pInst);

			Object.defineProperty(this._velocity, 'x', {
				get() {
					let val;
					if (!_this.body) val = _this._vel.x;
					else val = _this.body.getLinearVelocity().x;
					return fixRound(val / _this.tileSize);
				},
				set(val) {
					val *= _this.tileSize;
					if (_this.body) {
						_this.body.setLinearVelocity(new pl.Vec2(val, _this.body.getLinearVelocity().y));
					} else {
						_this._vel.x = val;
					}
				}
			});

			Object.defineProperty(this._velocity, 'y', {
				get() {
					let val;
					if (!_this.body) val = _this._vel.y;
					else val = _this.body.getLinearVelocity().y;
					return fixRound(val / _this.tileSize);
				},
				set(val) {
					val *= _this.tileSize;
					if (_this.body) {
						_this.body.setLinearVelocity(new pl.Vec2(_this.body.getLinearVelocity().x, val));
					} else {
						_this._vel.y = val;
					}
				}
			});

			this._mirror = {
				x: 1,
				y: 1
			};

			this.mirror = {
				get x() {
					return _this._mirror.x < 0;
				},
				set x(val) {
					_this._mirror.x = val ? -1 : 1;
				},
				get y() {
					return _this._mirror.y < 0;
				},
				set y(val) {
					_this._mirror.y = val ? -1 : 1;
				}
			};

			if (ani) {
				if (ani instanceof p5.Image) {
					this.addAni(ani);
				} else {
					if (typeof ani == 'string') this._changeAni(ani);
					else this._animation = ani.clone();
				}
				let ts = this.tileSize;
				if (!w && this.ani.w != 1) {
					w = this.ani.w / ts;
					if (this.shape != 'circle' && this.ani.h > 1) {
						h = this.ani.h / ts;
					}
				}
			}

			this.layer = group.layer;
			this.layer ??= this.p.allSprites.maxDepth() + 1;
			collider ??= group.collider;

			if (!collider || typeof collider != 'string') {
				collider = 'dynamic';
			}
			this.collider = collider;

			x ??= group.x;
			if (x === undefined) {
				x = this.p.width / this.p.allSprites.tileSize / 2;
				this._vertexMode = true;
			}
			y ??= group.y;
			if (y === undefined) y = this.p.height / this.p.allSprites.tileSize / 2;
			w ??= group.w || group.width || group.diameter;
			h ??= group.h || group.height;

			if (typeof x == 'function') x = x(group.length - 1);
			if (typeof y == 'function') y = y(group.length - 1);

			this.x = x;
			this.y = y;

			this.mouse = new SpriteMouse();

			if (this.collider != 'none') {
				this.addCollider(0, 0, w, h);
			} else {
				this.w = w || (this.tileSize > 1 ? 1 : 50);
				this.h = h;
				if (h === undefined) this._shape = 'circle';
				else this._shape = 'box';
			}

			this._scale = 1;
			this.previousPosition = { x, y };
			this.dest = { x, y };
			this._destIdx = 0;
			this.drag = 0;

			/**
			 * When the sprite.debug property is set to true you can see the
			 * sprite's physics body collider.
			 *
			 * @property debug
			 * @type {boolean}
			 * @default false
			 */
			this.debug = false;

			this._shift = {};

			let gvx = group.vel.x || 0;
			let gvy = group.vel.y || 0;
			if (typeof gvx == 'function') gvx = gvx(group.length - 1);
			if (typeof gvy == 'function') gvy = gvy(group.length - 1);
			this.vel.x = gvx;
			this.vel.y = gvy;

			for (let prop of spriteProps) {
				if (prop == 'collider' || prop == 'x' || prop == 'y') continue;
				let val = group[prop];
				if (val === undefined) continue;
				if (typeof val == 'function') val = val(group.length - 1);
				if (typeof val == 'object') {
					this[prop] = Object.assign({}, val);
				} else {
					this[prop] = val;
				}
			}

			// custom group properties "sprite group traits"
			// that are non-default sprite properties
			for (let g of this.groups) {
				let traits = {};
				let props = Object.keys(g);
				for (let prop of props) {
					if (!isNaN(prop) || prop[0] == '_') continue;
					traits[prop] = null;
				}

				// delete these traits
				let deletes = [
					'collider',
					'idNum',
					'p',
					'parent',
					'length',
					'_collides',
					'_colliding',
					'_collided',
					'_collisions',
					'_overlap',
					'_overlaps',
					'_overlapping',
					'_overlapped',
					'_overlappers',
					'animation',
					'animations',
					'autoCull',
					'Sprite',
					'Group',
					'vel',
					'mirror',
					'mouse'
				];
				for (let d of deletes) {
					delete traits[d];
				}

				for (let prop in traits) {
					let val = g[prop];
					if (val === undefined) continue;
					if (typeof val == 'function') {
						if (isArrowFunction(val)) val = val();
					}
					if (typeof val == 'object') {
						this[prop] = Object.assign({}, val);
					} else {
						this[prop] = val;
					}
				}
			}

			/**
			 * If no image or animations are set this is color of the
			 * placeholder rectangle
			 *
			 * @property color
			 * @type {color}
			 * @default a randomly generated color
			 */
			this.color ??= this.p.color(this.p.random(30, 245), this.p.random(30, 245), this.p.random(30, 245));

			this.textColor ??= this.p.color(0);
			this.textSize ??= this.tileSize == 1 ? (this.p.canvas ? this.p.textSize() : 12) : 0.8;

			let shouldCreateSensor = false;
			for (let g of this.groups) {
				if (g._hasOverlaps) {
					shouldCreateSensor = true;
					break;
				}
			}
			if (shouldCreateSensor && !this._hasOverlaps) this._createSensors();
		}

		/**
		 * Similar to createSprite and the Sprite constructor except
		 * offset is the distance the collider is from the center of the
		 * sprite.
		 *
		 * @param {Number} offsetX distance from the center of the sprite
		 * @param {Number} offsetY distance from the center of the sprite
		 */
		addCollider(offsetX, offsetY, w, h) {
			let path, shape;

			offsetX ??= 0;
			offsetY ??= 0;
			w ??= this._w;
			h ??= this._h;

			if (Array.isArray(w)) {
				path = w;
			} else {
				if (w !== undefined && h === undefined) shape ??= 'circle';
				shape ??= 'box';
			}

			if (shape == 'box' || shape == 'circle') {
				w ??= this.tileSize > 1 ? 1 : 50;
				h ??= w;
			}

			let props = {};

			let dimensions;

			// the actual dimensions of the collider for a box or circle are a
			// little bit smaller so that they can slid past each other
			// when in a tile grid
			if (shape == 'box' || shape == 'circle') {
				dimensions = scaleTo({ x: w - 0.08, y: h - 0.08 }, this.tileSize);
			}

			let s;
			if (shape == 'box') {
				s = pl.Box(dimensions.x / 2, dimensions.y / 2, scaleTo({ x: offsetX, y: offsetY }, this.tileSize), 0);
			} else if (shape == 'circle') {
				s = pl.Circle(dimensions.x / 2);
				s.m_p.x = 0;
				s.m_p.y = 0;
			} else if (path) {
				let vecs = [{ x: 0, y: 0 }];
				let vert = { x: 0, y: 0 };
				let min = { x: 0, y: 0 };
				let max = { x: 0, y: 0 };
				let least = { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER };

				// if the path is an array of position arrays
				let usesVertices = Array.isArray(path[0]);

				function checkVert() {
					if (vert.x < min.x) min.x = vert.x;
					if (vert.y < min.y) min.y = vert.y;
					if (vert.x > max.x) max.x = vert.x;
					if (vert.y > max.y) max.y = vert.y;
				}

				if (usesVertices) {
					if (this._vertexMode) {
						this.x = path[0][0];
						this.y = path[0][1];
					}
					for (let i = 0; i < path.length; i++) {
						if (this._vertexMode) {
							if (i == 0) continue;
							if (path[i][0] < least.x) least.x = path[i][0];
							if (path[i][1] < least.y) least.y = path[i][1];
							vert.x = path[i][0] - this.x;
							vert.y = path[i][1] - this.y;
						} else {
							vert.x += path[i][0];
							vert.y += path[i][1];
						}
						vecs.push({ x: vert.x, y: vert.y });

						checkVert();
					}
				} else {
					let rep = 1;
					if (path.length % 2) rep = path[path.length - 1];
					let mod = rep > 0 ? 1 : -1;
					rep = Math.abs(rep);
					let ang = 0;
					for (let i = 0; i < rep; i++) {
						for (let j = 0; j < path.length - 1; j += 2) {
							let len = path[j];
							ang += path[j + 1];
							vert.x += len * this.p.cos(ang);
							vert.y += len * this.p.sin(ang);
							vecs.push({ x: vert.x, y: vert.y });

							checkVert();
						}
						ang *= mod;
					}
				}
				if (
					Math.round(vert.x * 1e6) / 1e6 == 0 &&
					Math.round(vert.y * 1e6) / 1e6 == 0 &&
					vecs.length - 1 <= pl.Settings.maxPolygonVertices &&
					this._shape != 'chain'
				) {
					shape = 'polygon';
				} else {
					shape = 'chain';
				}
				w = max.x - min.x;
				this._hw = w * 0.5;
				h = max.y - min.y;
				this._hh = h * 0.5;

				if (shape == 'polygon' && this._vertexMode) {
					this.x = least.x + this._hw;
					this.y = least.y + this._hh;
					log(this.x, this.y);
				}

				if (this.originMode == 'start' && shape == 'chain') {
					for (let i = 0; i < vecs.length; i++) {
						let vec = vecs[i];
						vecs[i] = new pl.Vec2((vec.x * this.tileSize) / plScale, (vec.y * this.tileSize) / plScale);
					}
				} else {
					// origin is center
					this.originMode = 'center';
					for (let i = 0; i < vecs.length; i++) {
						let vec = vecs[i];
						vecs[i] = new pl.Vec2(
							((vec.x - this._hw - min.x) * this.tileSize) / plScale,
							((vec.y - this._hh - min.y) * this.tileSize) / plScale
						);
					}
				}
				if (shape == 'polygon') {
					if (this._isConvexPoly(vecs.slice(0, -1))) {
						s = pl.Polygon(vecs);
					} else shape = 'chain';
				}
				if (shape == 'chain') {
					s = pl.Chain(vecs, false);
					props.density = 0;
					props.restitution = 0;
				}
			}
			props.shape = s;
			props.density ??= this.density || 5;
			props.friction ??= this.friction || 0.5;
			props.restitution ??= this.bounciness || 0.2;

			if (!this.body) {
				this.body = this.p.world.createBody({
					position: scaleTo({ x: this.x, y: this.y }, this.tileSize),
					type: this.collider
				});
				this.body.sprite = this;
			}
			this.body.createFixture(props);
			if (!this._shape) {
				this._shape = shape;
			} else if (this.fixture.getNext()) {
				this._shape = 'combo';
			}
			if (shape == 'circle') this._diameter = w;
			else {
				this._h = h;
				this._hh = h * 0.5;
			}

			this._w = w;
			this._hw = w * 0.5;
		}

		/**
		 * Removes the physics body colliders from the sprite but not
		 * overlap sensors.
		 *
		 * @method removeColliders
		 */
		removeColliders() {
			this._collides = {};
			this._colliding = {};
			this._collided = {};
			this._removeFixtures(false);
		}

		/**
		 * Adds a joint between this sprite and another sprite.
		 *
		 * @method addJoint
		 * @param {Sprite} spriteB the sprite to add a joint to
		 * @param {String} [type] the type of joint
		 * @param {Object} [props] the joint options
		 */
		addJoint(spriteB, type, props) {
			let spriteA = this;
			props ??= {};
			/*
			 * frequencyHz, dampingRatio, collideConnected, userData, ratio,
			 * enableLimit, enableMotor, lowerAngle, maxMotorTorque
			 * maxMotorForce, motorSpeed, referenceAngle, upperAngle, maxForce
			 * maxTorque, localAxisA, angularOffset, joint1, joint2,
			 * correctionFactor
			 */
			if (props.motorSpeed) props.enableMotor = true;

			// function genProps(a, b) {
			props = Object.assign(props, {
				bodyA: spriteA.body,
				bodyB: spriteB.body,
				length: props.length != undefined ? scaleXTo(props.length) : null,
				maxLength: props.maxLength != undefined ? scaleXTo(props.maxLength) : null,
				lengthA: props.lengthA != undefined ? scaleXTo(props.lengthA) : null,
				lengthB: props.lengthB != undefined ? scaleXTo(props.lengthB) : null,
				groundAnchorA: props.groundAnchorA ? scaleXTo(props.groundAnchorA) : new pl.Vec2(0, 0),
				groundAnchorB: props.groundAnchorB ? scaleXTo(props.groundAnchorB) : new pl.Vec2(0, 0),
				upperTranslation: props.upperTranslation ? scaleXTo(props.upperTranslation) : 1,
				lowerTranslation: props.lowerTranslation ? scaleXTo(props.lowerTranslation) : 1,
				linearOffset: props.linearOffset ? scaleTo(props.linearOffset) : new pl.Vec2(0, 0)
			});
			if (props.anchorA) {
				props.localAnchorA = scaleTo(props.anchorA);
			} else if (props.localAnchorA) {
				props.localAnchorA = scaleTo(props.localAnchorA);
			} else {
				props.localAnchorA = new pl.Vec2(0, 0);
			}
			if (props.anchorB) {
				props.localAnchorB = scaleTo(props.anchorB);
			} else if (props.localAnchorB) {
				props.localAnchorB = scaleTo(props.localAnchorB);
			} else {
				props.localAnchorB = new pl.Vec2(0, 0);
			}
			// 	return props;
			// }

			type ??= 'distance';
			let j;
			if (type == 'distance') {
				j = pl.DistanceJoint(props);
			} else if (type == 'orbit') {
				// let s = new Sprite([
				// 	[spriteA.x, spriteA.y],
				// 	[spriteB.x, spriteB.y]
				// ]);
				// s.overlaps(allSprites);
				// j = pl.DistanceJoint(genProps(spriteA, s));
				// this.p.world.createJoint(j);
				// genProps(s, spriteB);
				// j = pl.RevoluteJoint(props, s.body, spriteB.body, spriteB.body.getWorldCenter());
			} else if (type == 'pulley') {
				j = pl.PulleyJoint(props);
			} else if (type == 'wheel') {
				j = pl.WheelJoint(props);
			} else if (type == 'rope') {
				j = pl.RopeJoint(props);
			} else if (type == 'weld') {
				j = pl.WeldJoint(props);
			} else if (type == 'revolute') {
				j = pl.RevoluteJoint(props, spriteA.body, spriteB.body, spriteA.body.getWorldCenter());
			} else if (type == 'gear') {
				j = pl.GearJoint(props);
			} else if (type == 'friction') {
				j = pl.FrictionJoint(props);
			} else if (type == 'motor') {
				j = pl.MotorJoint(props);
			} else if (type == 'prismatic') {
				j = pl.PrismaticJoint(props);
			} else if (type == 'mouse') {
				/*j = new box2d.b2MouseJointDef();
        j.bodyA = bodyA!=null?bodyA.body:b2world.CreateBody(new box2d.b2BodyDef());
        j.bodyB = bodyB.body;
        j.target = b2scaleTo(props.xy);
        j.collideConnected = true;
        j.maxForce = props.maxForce||(1000.0 * bodyB.body.GetMass());
        j.frequencyHz = props.frequency||5;  // Try a value less than 5 (0 for no elasticity)
        j.dampingRatio = props.damping||0.9; // Ranges between 0 and 1 (1 for no springiness)
        bodyB.body.SetAwake(true);
        bodyA=bodyB;*/
			}
			return this.p.world.createJoint(j);
		}

		/**
		 * Removes overlap sensors from the sprite.
		 *
		 * @method removeSensors
		 */
		removeSensors() {
			this._overlap = {};
			this._overlaps = {};
			this._overlapping = {};
			this._overlapped = {};
			this._removeFixtures(true);
		}

		// removes sensors or colliders
		_removeFixtures(isSensor) {
			let prevFxt;
			for (let fxt = this.fixtureList; fxt; fxt = fxt.getNext()) {
				if (fxt.m_isSensor == isSensor) {
					let _fxt = fxt.m_next;
					fxt.destroyProxies(this.p.world.m_broadPhase);
					if (!prevFxt) {
						this.body.m_fixtureList = _fxt;
					} else {
						prevFxt.m_next = _fxt;
					}
				} else {
					prevFxt = fxt;
				}
			}
		}

		/**
		 * Clones the collider's props to be transferred to a new collider.
		 * @private
		 */
		_cloneBodyProps() {
			let body = {};
			let props = [...spriteProps];
			let deletes = [
				'w',
				'h',
				'width',
				'height',
				'shape',
				'd',
				'diameter',
				'dynamic',
				'static',
				'kinematic',
				'collider',
				'heading',
				'direction'
			];
			for (let del of deletes) {
				let i = props.indexOf(del);
				if (i >= 0) props.splice(i, 1);
			}
			for (let prop of props) {
				body[prop] = this[prop];
			}
			return body;
		}

		// get aabb() {
		// 	return getAABB(this);
		// }

		// set advance(val) {
		// 	this.body.advance(val);
		// }
		// set angularImpulse(val) {
		// 	this.body.applyAngularImpulse(val, true);
		// }

		/**
		 * This property disables the ability for a sprite to "sleep".
		 *
		 * "Sleeping" sprites are not included in the physics simulation, a
		 * sprite starts "sleeping" when it stops moving and doesn't collide
		 * with anything that it wasn't already _touching.
		 *
		 * @property {Boolean} allowSleeping
		 * @default true
		 */
		get allowSleeping() {
			return this.body.getSleepingAllowed();
		}

		set allowSleeping(val) {
			this.body.setSleepingAllowed(val);
		}

		/**
		 * Reference to the sprite's current animation.
		 *
		 * @property animation
		 * @type {SpriteAnimation}
		 */
		get animation() {
			return this._animation;
		}
		set animation(val) {
			this.changeAni(val);
		}

		get ani() {
			return this._animation;
		}
		set ani(val) {
			this.changeAni(val);
		}

		get anis() {
			return this.animations;
		}

		/**
		 * The bounciness of the sprite's physics body.
		 *
		 * @property bounciness
		 * @type {Number}
		 */
		get bounciness() {
			if (!this.fixture) return;
			return this.fixture.getRestitution();
		}
		set bounciness(val) {
			for (let fxt = this.fixtureList; fxt; fxt = fxt.getNext()) {
				fxt.setRestitution(val);
			}
		}

		/**
		 * The center of mass of the sprite's physics body.
		 *
		 * @property centerOfMass
		 * @type {Number}
		 */
		get centerOfMass() {
			return scaleFrom(this.body.getWorldCenter(), this.tileSize);
		}

		get collider() {
			return this._collider;
		}
		set collider(val) {
			val = val.toLowerCase();
			let c = val[0];
			if (c == 'd') val = 'dynamic';
			if (c == 's') val = 'static';
			if (c == 'k') val = 'kinematic';
			if (c == 'n') val = 'none';

			if (this._collider == val) return;

			let oldCollider = this._collider;

			this._collider = val;
			if (oldCollider !== undefined) this._reset();
		}

		_reset() {
			let bodyProps;
			if (this._collider != 'none') {
				bodyProps = this._cloneBodyProps();
			}

			let v;
			if (this._shape == 'chain' || this._shape == 'polygon') {
				v = this._getVertices(true);
				this._vertexMode = true;
			}

			// remove body
			if (this.body) {
				this.p.world.destroyBody(this.body);
				this.body = undefined;
			}

			// replace colliders and overlap sensors
			if (this._collider != 'none') {
				if (v) {
					this.addCollider(0, 0, v);
				} else {
					this.addCollider();
				}
				if (this._hasOverlaps) {
					this._createSensors();
				}
				for (let prop in bodyProps) {
					this[prop] = bodyProps[prop];
				}
			}
		}

		/**
		 * The sprite's current color. By default sprites get a random color.
		 *
		 * @property color
		 * @type {p5.Color}
		 */
		get color() {
			return this._color;
		}
		set color(val) {
			if (val instanceof p5.Color) {
				this._color = val;
			} else if (typeof val != 'object') {
				this._color = this.p.color(val);
			} else {
				this._color = this.p.color(...val.levels);
			}
		}

		get shapeColor() {
			return this._color;
		}
		set shapeColor(val) {
			this.color = val;
		}

		/**
		 * The sprite's current text color. By default sprites get a random text color.
		 *
		 * @property textColor
		 * @type {p5.Color}
		 */
		get textColor() {
			return this._textColor;
		}
		set textColor(val) {
			if (val instanceof p5.Color) {
				this._textColor = val;
			} else if (typeof val != 'object') {
				this._textColor = this.p.color(val);
			} else {
				this._textColor = this.p.color(...val.levels);
			}
		}

		/**
		 * The density of the sprite's physics body.
		 *
		 * @property density
		 * @type {Number}
		 */
		get density() {
			if (!this.fixture) return;
			return this.fixture.getDensity();
		}
		set density(val) {
			for (let fxt = this.fixtureList; fxt; fxt = fxt.getNext()) {
				fxt.setDensity(val);
			}
		}

		/**
		 * Use .layer instead.
		 *
		 * @deprecated
		 * @property depth
		 */
		get depth() {
			return this.layer;
		}
		set depth(val) {
			this.layer = val;
		}

		/**
		 * The angle of the sprite's movement or it's rotation angle if the
		 * sprite is not moving.
		 *
		 * @property direction
		 * @type {Number}
		 */
		get direction() {
			if (this.body && (this.vel.x !== 0 || this.vel.y !== 0)) {
				return this.p.atan2(this.vel.y, this.vel.x);
			}
			if (!this._direction) return this.rotation;
			return this._direction;
		}
		set direction(val) {
			if (typeof val == 'string') {
				this._heading = val;

				let dir = val.toLowerCase().replaceAll(/[ _-]/g, '');
				let dirs = {
					up: -90,
					down: 90,
					left: 180,
					right: 0,
					upright: -45,
					rightup: -45,
					upleft: -135,
					leftup: -135,
					downright: 45,
					rightdown: 45,
					downleft: 135,
					leftdown: 135,
					forward: this.rotation,
					backward: this.rotation + 180
				};
				val = dirs[dir];
			}

			this._direction = val;
			let speed = this.speed;
			this.vel.x = this.p.cos(val) * speed;
			this.vel.y = this.p.sin(val) * speed;
		}

		/**
		 * The amount of resistance a sprite has to being moved.
		 *
		 * @property drag
		 * @type {Number}
		 */
		get drag() {
			if (this.body) return this.body.getLinearDamping();
			else return Infinity;
		}
		set drag(val) {
			if (this.body) this.body.setLinearDamping(val);
		}

		/**
		 * Manages the visuals of the sprite. It can be overridden with a
		 * custom drawing function in which the center of the sprite is
		 * at (0, 0).
		 *
		 * @example
		 * sprite.draw = function() {
		 *   // an oval
		 *   ellipse(0,0,20,10);
		 * }
		 *
		 * @method draw
		 */
		get draw() {
			return this._display;
		}

		set draw(val) {
			this._draw = val;
		}

		/**
		 * True if the sprite's physics body is dynamic.
		 *
		 * @property dynamic
		 * @type {Boolean}
		 */
		get dynamic() {
			return this.body.isDynamic();
		}
		set dynamic(val) {
			if (val) this.collider = 'dynamic';
		}

		/**
		 * If true the sprite can not rotate.
		 *
		 * @property rotationLock
		 * @type {Boolean}
		 */
		get rotationLock() {
			return this.body.isFixedRotation();
		}
		set rotationLock(val) {
			this.body.setFixedRotation(val);
		}

		/**
		 * Returns the first node in a linked list of the planck physics
		 * body's fixtures.
		 *
		 * @private
		 * @property fixture
		 */
		get fixture() {
			return this.fixtureList;
		}
		/**
		 * Returns the first node in a linked list of the planck physics
		 * body's fixtures.
		 *
		 * @private
		 * @property fixtureList
		 */
		get fixtureList() {
			if (!this.body) return null;
			return this.body.getFixtureList();
		}

		// set force(val) {
		// 	this.body.applyForceToCenter(val, true);
		// }

		/**
		 * The amount the sprite's physics body resists moving
		 * when rubbing against another physics body.
		 *
		 * @property friction
		 * @type {Number}
		 */
		get friction() {
			if (!this.fixture) return;
			return this.fixture.getFriction();
		}
		set friction(val) {
			for (let fxt = this.fixtureList; fxt; fxt = fxt.getNext()) {
				fxt.setFriction(val);
			}
		}

		/**
		 * The sprite's heading. This is a string that can be set to
		 * "up", "down", "left", "right", "upRight", "upLeft", "downRight"
		 *
		 * It ignores cardinal direction word order, capitalization, spaces,
		 * underscores, and dashes.
		 *
		 * @property heading
		 * @type {String}
		 */
		get heading() {
			return this._heading;
		}
		set heading(val) {
			this.direction = val;
		}

		/**
		 * Use .static instead.
		 *
		 * @deprecated
		 * @property immovable
		 */
		get immovable() {
			return this.body.isStatic();
		}
		set immovable(val) {
			if (val) this.body.setStatic();
		}
		// set impulse(val) {
		// 	this.body.applyLinearImpulse(val, this.body.getWorldCenter(), true);
		// }
		// get inertia() {
		// 	return this.body.getInertia();
		// }

		get img() {
			return this._animation;
		}
		set img(val) {
			this.changeAni(val);
		}

		get image() {
			return this._animation;
		}
		set image(val) {
			this.changeAni(val);
		}

		get isMoving() {
			return this.vel.x != 0 || this.vel.y != 0;
		}

		/**
		 * Set this to true if the sprite goes really fast to prevent
		 * inaccurate physics simulation.
		 *
		 * @property isSuperFast
		 * @type {Boolean}
		 */
		get isSuperFast() {
			return this.body.isBullet();
		}
		set isSuperFast(val) {
			this.body.setBullet(val);
		}

		// get joint() {
		// 	return this.body.getJointList().joint;
		// }
		// get jointList() {
		// 	return this.body.getJointList();
		// }

		/**
		 * True if the sprite's physics body is kinematic.
		 *
		 * @property kinematic
		 * @type {Boolean}
		 */
		get kinematic() {
			return this.body.isKinematic();
		}
		set kinematic(val) {
			if (val) this.collider = 'kinematic';
		}
		/**
		 * The mass of the sprite's physics body.
		 *
		 * @property mass
		 * @type {Number}
		 */
		get mass() {
			return this.body.getMass();
		}
		set mass(val) {
			let t = this.massData;
			t.mass = val;
			this.body.setMassData(t);
		}
		/**
		 * @private
		 */
		get massData() {
			const t = { I: 0, center: new pl.Vec2(0, 0), mass: 0 };
			this.body.getMassData(t);
			t.center = scaleFrom(t.center, this.tileSize);
			return t;
		}
		// set massData(val) {
		// 	val.center = scaleTo(val.center);
		// 	this.body.setMassData(val);
		// }

		// get next() {
		// 	return this.body.getNext();
		// }

		/**
		 * The angle of the sprite's rotation, not the direction it is moving.
		 *
		 * @property rotation
		 * @type {Number}
		 */
		get rotation() {
			if (!this.body) return this._angle || 0;
			if (this.p._angleMode === p5.prototype.DEGREES) {
				return p5.prototype.degrees(this.body.getAngle());
			}
			return this.body.getAngle();
		}
		set rotation(val) {
			if (this.body) {
				if (this.p._angleMode === p5.prototype.DEGREES) {
					this.body.setAngle(p5.prototype.radians(val));
				} else {
					this.body.setAngle(val);
				}
			} else {
				this._angle = val;
			}
		}
		/**
		 * The amount of the sprite resists rotating.
		 *
		 * @property rotationDrag
		 * @type {Number}
		 */
		get rotationDrag() {
			return this.body.getAngularDamping();
		}
		set rotationDrag(val) {
			this.body.setAngularDamping(val);
		}
		/**
		 * The speed of the sprite's rotation.
		 *
		 * @property rotationSpeed
		 * @type {Number}
		 */
		get rotationSpeed() {
			if (this.body) return this.body.getAngularVelocity();
			return this._rotationSpeed || 0;
		}
		set rotationSpeed(val) {
			if (this.body) this.body.setAngularVelocity(val);
			else this._rotationSpeed = val;
		}

		/**
		 * Scale of the sprite's physics body. Default is 1.
		 *
		 * @property scale
		 * @type {Number}
		 */
		get scale() {
			return this._scale;
		}
		set scale(val) {
			if (val == this._scale) return;
			this._w *= val;
			this._hw *= val;
			if (this._h) {
				this._h *= val;
				this._hh *= val;
			}
			this._resizeCollider(val);
			this._scale = val;
		}

		/**
		 * Wake a sprite up or put it to sleep.
		 *
		 * "Sleeping" sprites are not included in the physics simulation, a
		 * sprite starts "sleeping" when it stops moving and doesn't collide
		 * with anything that it wasn't already _touching.
		 *
		 * @property {Boolean} isAwake
		 * @default true
		 */
		get sleeping() {
			return this.body.isAwake();
		}

		set sleeping(val) {
			return this.body.setAwake(!val);
		}

		/**
		 * The sprite's speed.
		 *
		 * @property speed
		 * @type {Number}
		 */
		get speed() {
			return this.p.createVector(this.vel.x, this.vel.y).mag();
		}

		/**
		 * @deprecated
		 */
		getSpeed() {
			return this.speed;
		}
		/**
		 * The sprite's speed.
		 *
		 * @property speed
		 * @type {Number}
		 * @param {Number} speed that the sprite will move at in the direction of its current rotation
		 */
		set speed(val) {
			let angle = this.direction;
			this.vel.x = this.p.cos(angle) * val;
			this.vel.y = this.p.sin(angle) * val;
		}

		/**
		 * Is the sprite's physics collider static?
		 *
		 * @property static
		 * @type {Boolean}
		 */
		get static() {
			return this.body.isStatic();
		}
		set static(val) {
			if (val) this.collider = 'static';
		}

		/**
		 * Apply a torque on the sprite's physics body.
		 * Torque is the force that causes rotation.
		 * A positive torque will rotate the sprite clockwise.
		 * A negative torque will rotate the sprite counter-clockwise.
		 *
		 * @property torque
		 * @param {Number} torque The amount of torque to apply.
		 */
		set torque(val) {
			this.body.applyTorque(val, true);
		}

		/**
		 * The sprite's vertices.
		 *
		 * @property vertices
		 * @type {Array} An array of p5.Vector objects.
		 */
		get vertices() {
			return this._getVertices();
		}

		_getVertices(output2DArrays) {
			let s = this.body.getFixtureList().getShape();
			let v = [...s.m_vertices];
			if (s.m_type == 'polygon') v.unshift(v.at(-1));
			let x = this.x;
			let y = this.y;
			if (this.originMode == 'center') {
				let minX = Math.min(...v.map((v) => v.x));
				let minY = Math.min(...v.map((v) => v.y));
				x = this._hw + minX;
				y = this._hh + minY;
			}
			for (let i = 0; i < v.length; i++) {
				let arr = [v[i].x * plScale + x, v[i].y * plScale + y];
				if (output2DArrays) v[i] = arr;
				else v[i] = pInst.createVector(arr[0], arr[1]);
			}
			return v;
		}

		// TODO set vertices

		/**
		 * The horizontal position of the sprite.
		 * @property x
		 * @type {Number}
		 */
		get x() {
			if (!this.body) return this._pos.x;
			let x = (this.body.getPosition().x / this.tileSize) * plScale;
			return fixRound(x);
		}
		set x(val) {
			if (this.body) {
				let pos = new pl.Vec2((val * this.tileSize) / plScale, this.body.getPosition().y);
				this.body.setPosition(pos);
			}
			this._pos.x = val;
		}
		/**
		 * The vertical position of the sprite.
		 * @property y
		 * @type {Number}
		 */
		get y() {
			if (!this.body) return this._pos.y;
			let y = (this.body.getPosition().y / this.tileSize) * plScale;
			return fixRound(y);
		}
		set y(val) {
			if (this.body) {
				let pos = new pl.Vec2(this.body.getPosition().x, (val * this.tileSize) / plScale);
				this.body.setPosition(pos);
			}
			this._pos.y = val;
		}
		/**
		 * Set the position vector {x, y}
		 *
		 * @property pos
		 * @type {Object}
		 */
		set pos(val) {
			let pos = new pl.Vec2((val.x * this.tileSize) / plScale, (val.y * this.tileSize) / plScale);
			_this.body.setPosition(pos);
		}
		/**
		 * The width of the sprite.
		 * @property w
		 * @type {Number}
		 */
		get w() {
			return this._w;
		}
		set w(val) {
			if (val < 0) val = 0.01;
			if (val == this._w) return;
			let scale = val / this._w;
			this._w = val;
			this._hw = val * 0.5;
			this._resizeCollider({ x: scale });
		}
		get hw() {
			return this._hw;
		}
		set hw(val) {
			throw new FriendlyError('Sprite.hw');
		}
		/**
		 * The width of the sprite.
		 * @property width
		 * @type {Number}
		 */
		get width() {
			return this.w;
		}
		set width(val) {
			this.w = val;
		}
		get halfWidth() {
			return this.hw;
		}
		set halfWidth(val) {
			throw new FriendlyError('Sprite.hw');
		}
		/**
		 * The height of the sprite.
		 * @property h
		 * @type {Number}
		 */
		get h() {
			if (this.shape == 'circle') return this._w;
			return this._h;
		}
		set h(val) {
			if (val < 0) val = 0.01;
			if (this.shape == 'circle') {
				this.w = val;
				return;
			}
			if (val == this._h) return;
			let scale = val / this._h;
			this._h = val;
			this._hh = val * 0.5;
			this._resizeCollider({ y: scale });
		}
		get hh() {
			return this._hh;
		}
		set hh(val) {
			throw new FriendlyError('Sprite.hh');
		}
		/**
		 * The height of the sprite.
		 * @property height
		 * @type {Number}
		 */
		get height() {
			return this.h;
		}
		set height(val) {
			this.h = val;
		}
		get halfHeight() {
			return this.hh;
		}
		set halfHeight(val) {
			throw new FriendlyError('Sprite.hh');
		}
		/**
		 * The diameter of a circular sprite.
		 * @property d
		 * @type {Number}
		 */
		get d() {
			this._diameter ??= this.w;
			return this._diameter;
		}
		set d(val) {
			if (val < 0) {
				this.remove();
				return;
			}
			if (this._diameter == val) return;
			this._diameter = val;

			let prevShape = this.shape;
			if (prevShape != 'circle') {
				let bodyProps;
				if (this._collider == 'none') {
					bodyProps = this._cloneBodyProps();
				}
				this.removeColliders();
				this._h = undefined;
				this._shape = undefined;
				if (this._collider != 'none') {
					this.addCollider(0, 0, val);
					for (let prop in bodyProps) {
						this[prop] = bodyProps[prop];
					}
				}
				this._shape = 'circle';
			}
			let scale = val / this._w;
			this._w = val;
			this._hw = val * 0.5;
			if (prevShape != 'circle') return;
			this._resizeCollider(scale);
		}
		/**
		 * The diameter of a circular sprite.
		 * @property diameter
		 * @type {Number}
		 */
		get diameter() {
			return this.d;
		}
		set diameter(val) {
			this.d = val;
		}

		/**
		 * The radius of a circular sprite.
		 * @property r
		 * @type {Number}
		 */
		get r() {
			return this._hw;
		}
		set r(val) {
			this.d = val * 2;
		}

		/**
		 * The radius of a circular sprite.
		 * @property radius
		 * @type {Number}
		 */
		get radius() {
			return this._hw;
		}
		set radius(val) {
			this.d = val * 2;
		}

		// TODO make this work for other shapes
		_resizeCollider(scale) {
			if (!this.body) return;

			if (typeof scale == 'number') {
				scale = { x: scale, y: scale };
			} else {
				if (!scale.x) scale.x = 1;
				if (!scale.y) scale.y = 1;
			}
			if (this.shape == 'circle') {
				let fxt = this.fixture;
				let sh = fxt.m_shape;
				sh.m_radius *= scale.x;
			} else {
				// let bodyProps = this._cloneBodyProps();
				// this.removeColliders();
				// this.addCollider();
				// for (let prop in bodyProps) {
				// 	this[prop] = bodyProps[prop];
				// }

				for (let fxt = this.fixtureList; fxt; fxt = fxt.getNext()) {
					if (fxt.m_isSensor) continue;
					let sh = fxt.m_shape;
					for (let vert of sh.m_vertices) {
						vert.x *= scale.x;
						vert.y *= scale.y;
					}
				}
			}
		}

		/**
		 * Validate convexity.
		 *
		 * @private
		 * @param vecs {Array} an array of planck.Vec2 vertices
		 * @returns true if valid
		 */
		_isConvexPoly(vecs) {
			loopk: for (let k = 0; k < 2; k++) {
				if (k == 1) vecs = vecs.reverse();
				for (let i = 0; i < vecs.length; ++i) {
					const i1 = i;
					const i2 = i < vecs.length - 1 ? i1 + 1 : 0;
					const p = vecs[i1];
					const e = pl.Vec2.sub(vecs[i2], p);

					for (let j = 0; j < vecs.length; ++j) {
						if (j == i1 || j == i2) {
							continue;
						}

						const v = pl.Vec2.sub(vecs[j], p);
						const c = pl.Vec2.cross(e, v);
						if (c < 0.0) {
							if (k == 0) continue loopk;
							else return false;
						}
					}
				}
				break;
			}

			return true;
		}

		/**
		 * The kind of shape: 'box', 'circle', 'chain', or 'polygon'.
		 *
		 * @property shape
		 * @type {String}
		 * @default box
		 */
		get shape() {
			return this._shape;
		}

		set shape(val) {
			if (this._shape == val) return;
			this._shape = val;
			this._reset();
		}

		/**
		 * You can set the sprite's update function to your own custom
		 * update function that will be run after every draw call or when
		 * the updateSprites function is called.
		 *
		 * @method update
		 */
		get update() {
			return this._update;
		}

		set update(val) {
			this._customUpdate = val;
		}

		get pos() {
			return this._position;
		}

		set pos(val) {
			this.x = val.x;
			this.y = val.y;
		}

		get position() {
			return this._position;
		}

		set position(val) {
			this.pos = val;
		}

		get vel() {
			return this._velocity;
		}

		set vel(val) {
			this.vel.x = val.x;
			this.vel.y = val.y;
		}

		set velocity(val) {
			this.vel = val;
		}

		get velocity() {
			return this._velocity;
		}

		/**
		 * Updates the sprite. Called automatically at the end of the draw
		 * cycle.
		 *
		 * @private
		 */
		_update() {
			if (this.animation) this.animation.update();

			if (!this.body) {
				this.rotation += this._rotationSpeed;
				this.x += this.vel.x;
				this.y += this.vel.y;
			}

			if (this.xLock) this.x = this.previousPosition.x;
			if (this.yLock) this.y = this.previousPosition.y;

			for (let prop in this.mouse) {
				if (this.mouse[prop] == -1) this.mouse[prop] = 0;
			}

			let a = this;
			for (let event in eventTypes) {
				for (let entry of this[event]) {
					let contactType;
					let b = entry[0];
					let f = entry[1] + 1;
					this[event].set(b, f);
					if (f == 0) {
						this[event].delete(b);
						continue;
					} else if (f == -1) {
						contactType = eventTypes[event][2];
					} else if (f == 1) {
						contactType = eventTypes[event][0];
					} else {
						contactType = eventTypes[event][1];
					}
					if (b instanceof Group) continue;

					let cb = _findContactCB(contactType, a, b);
					if (typeof cb == 'function') cb(a, b, f);
				}
			}

			if (this._customUpdate) this._customUpdate();
		}

		/**
		 * Default draw
		 *
		 * @private
		 */
		_draw() {
			if (this.animation && !this.debug) {
				this.animation.draw();
			} else if (this.fixture != null) {
				if (this._shape == 'chain') this.p.stroke(this.color);
				for (let fxt = this.fixtureList; fxt; fxt = fxt.getNext()) {
					this._drawFixture(fxt);
				}
			} else {
				this.p.stroke(120);
				if (this._shape == 'box') {
					this.p.rect(0, 0, this.w * this.tileSize, this.h * this.tileSize);
				} else if (this._shape == 'circle') {
					this.p.circle(0, 0, this.d * this.tileSize);
				}
			}
			if (this.text) {
				this.p.textAlign(this.p.CENTER, this.p.CENTER);
				this.p.fill(this.textColor);
				this.p.textSize(this.textSize * this.tileSize);
				this.p.text(this.text, 0, 0);
			}
		}

		/**
		 * Displays the Sprite with rotation and scaling applied before
		 * the sprite's draw function is called.
		 *
		 * @private
		 */
		_display() {
			let x = this.p.width * 0.5 - this.p.world.origin.x + this.x * this.tileSize;
			let y = this.p.height * 0.5 - this.p.world.origin.y + this.y * this.tileSize;

			// skip drawing for out-of-view bodies, but
			// edges can be very long, so they still should be drawn
			if (
				this.shape != 'chain' &&
				this.p.camera.active &&
				(x + this.w < this.p.camera.bound.min.x ||
					x - this.w > this.p.camera.bound.max.x ||
					y + this.h < this.p.camera.bound.min.y ||
					y - this.h > this.p.camera.bound.max.y)
			) {
				return;
			}
			x = fixRound(x);
			x -= (this.w * this.tileSize) % 2 ? 0.5 : 0;
			y = fixRound(y);
			y -= (this.h * this.tileSize) % 2 ? 0.5 : 0;

			// x += this.tileSize * 0.015;
			// y += this.tileSize * 0.015;

			this.p.push();
			this.p.imageMode(p5.prototype.CENTER);
			this.p.rectMode(p5.prototype.CENTER);
			this.p.ellipseMode(p5.prototype.CENTER);

			this.p.translate(x, y);
			if (this.rotation) this.p.rotate(this.rotation);
			this.p.scale(this._mirror.x, this._mirror.y);

			this.p.fill(this.color);

			this._draw();

			this.p.pop();
			this.p.p5play.autoDrawSprites = false;

			this._cameraActiveWhenDrawn = this.p.camera.active;
		}

		/**
		 * Draws a fixture. Used to draw the sprite's physics body.
		 *
		 * @private
		 */
		_drawFixture(fxt) {
			const sh = fxt.m_shape;
			if (sh.m_type == 'polygon' || sh.m_type == 'chain') {
				if (sh.m_type == 'chain') {
					this.p.push();
					this.p.noFill();
				}
				let v = sh.m_vertices;
				this.p.beginShape();
				for (let i = 0; i < v.length; i++) {
					this.p.vertex(v[i].x * plScale, v[i].y * plScale);
				}
				if (sh.m_type != 'chain') this.p.endShape(p5.prototype.CLOSE);
				else {
					this.p.endShape();
					this.p.pop();
				}
			} else if (sh.m_type == 'circle') {
				const d = sh.m_radius * 2 * plScale;
				this.p.ellipse(sh.m_p.x * plScale, sh.m_p.y * plScale, d, d);
			} else if (sh.m_type == 'edge') {
				this.p.line(
					sh.m_vertex1.x * plScale,
					sh.m_vertex1.y * plScale,
					sh.m_vertex2.x * plScale,
					sh.m_vertex2.y * plScale
				);
			}
		}

		/**
		 * Deprecated: use sprite.vel instead.
		 *
		 * Sets the velocity vector.
		 *
		 * @method setVelocity
		 * @deprecated
		 * @param {Number} vector|x vector or horizontal velocity
		 * @param {Number} y vertical velocity
		 * @example
		 * sprite.vel = createVector(1, 2);
		 * // OR
		 * sprite.vel.x = 1;
		 * sprite.vel.y = 2;
		 */
		setVelocity(x, y) {
			if (typeof x == 'object') {
				y = x.y;
				x = x.x;
			}
			this.vel.x = x;
			this.vel.y = y;
		}

		/**
		 * Deprecated: set direction and set speed separately
		 *
		 * Sets the speed of the sprite.
		 * The action overwrites the current velocity.
		 * If direction is not supplied, the current direction is maintained.
		 * If direction is not supplied and there is no current velocity, the
		 * current rotation angle used for the direction.
		 *
		 * @method setSpeed
		 * @deprecated
		 * @param {Number} speed Scalar speed
		 * @param {Number} [direction] angle
		 */
		setSpeed(speed, direction) {
			console.warn('setSpeed is deprecated. Set sprite.direction and sprite.speed separately instead.');
			if (direction) this.direction = direction;
			this.speed = speed;
		}

		/**
		 * Add to the speed of the sprite.
		 * If direction is not supplied, the current direction is maintained.
		 * If direction is not supplied and there is no current velocity, the * current rotation angle used for the direction.
		 *
		 * @method addSpeed
		 * @param {Number} speed Scalar speed
		 * @param {Number} [angle] Direction in degrees
		 */
		addSpeed(speed, angle) {
			angle ??= this.direction;

			this.vel.x += this.p.cos(angle) * speed;
			this.vel.y += this.p.sin(angle) * speed;
		}

		/**
		 * Move a sprite towards a position.
		 *
		 * @method moveTowards
		 * @param {Number|Object} x|position destination x or any object with x and y properties
		 * @param {Number} y destination y
		 * @param {Number} tracking [optional] 1 represents 1:1 tracking, the mouse moves to the destination immediately, 0 represents no tracking. Default is 0.1 (10% tracking).
		 */
		moveTowards(x, y, tracking) {
			if (typeof x != 'number') {
				let obj = x;
				if (obj == this.p.mouse && !this.p.mouse.active) return;
				if (obj.x === undefined || obj.y === undefined) {
					console.error(
						'sprite.moveTowards/moveAway ERROR: movement destination not defined, object given with no x or y properties'
					);
					return;
				}
				tracking = y;
				y = obj.y;
				x = obj.x;
			}
			if (x === undefined && y === undefined) return;
			tracking ??= 0.1;

			// let vec = new pl.Vec2(0, 0);
			if (x !== undefined && x !== null) {
				// vec.x = (destX - this.x) * tracking * this.tileSize * this.mass;
				this.vel.x = (x - this.x) * tracking * this.tileSize;
			}
			if (y !== undefined && y !== null) {
				// vec.y = (destY - this.y) * tracking * this.tileSize * this.mass;
				this.vel.y = (y - this.y) * tracking * this.tileSize;
			}
			// this.body.applyForce(vec, new pl.Vec2(0, 0));
		}

		/**
		 * Move a sprite away from a position.
		 *
		 * @method moveAway
		 * @param {Number|Object} x|position x or any object with x and y properties
		 * @param {Number} y
		 * @param {Number} repel [optional] the higher the value, the faster the sprite moves away. Default is 0.1 (10% repel).
		 */
		moveAway(x, y, repel) {
			this.moveTowards(...arguments);
			this.vel.x *= -1;
			this.vel.y *= -1;
		}

		/**
		 * Move the sprite a certain distance from its current position.
		 *
		 * @method move
		 * @param {Number} distance [optional]
		 * @param {Number|String} direction [optional]
		 * @param {Number} speed [optional]
		 * @returns {Promise} resolves when the movement is complete or cancelled
		 *
		 * @example
		 * sprite.move(distance);
		 * sprite.move(distance, direction);
		 * sprite.move(distance, direction, speed);
		 *
		 * sprite.move(directionName);
		 * sprite.move(directionName, speed);
		 * sprite.move(directionName, speed, distance); // deprecated usage
		 */
		move(distance, direction, speed) {
			let dirNameMode = isNaN(arguments[0]);
			if (dirNameMode) {
				direction = arguments[0];
				speed = arguments[1];
				distance = arguments[2];
				if (distance !== undefined) {
					console.warn(
						`In p5.play v3.3.0 the parameter ordering for the move() function was changed to: move(distance, direction, speed).`
					);
				}
			} else {
				dirNameMode = isNaN(direction);
			}
			if (direction !== undefined) this.direction = direction;
			distance ??= 1;
			let x = this.x + this.p.cos(this.direction) * distance;
			let y = this.y + this.p.sin(this.direction) * distance;
			if (dirNameMode) {
				x = Math.round(x);
				y = Math.round(y);
			}
			return this.moveTo(x, y, speed);
		}

		/**
		 * Move the sprite to a position.
		 *
		 * @method moveTo
		 * @param {Number|Object} x|position destination x or any object with x and y properties
		 * @param {Number} y destination y
		 * @param {Number} speed [optional]
		 * @returns {Promise} resolves when the movement is complete or cancelled
		 */
		moveTo(x, y, speed) {
			if (typeof x == 'undefined') {
				console.error('sprite.move ERROR: movement direction or destination not defined');
				return;
			}
			if (typeof x != 'number') {
				let obj = x;
				if (obj == this.p.mouse && !this.p.mouse.active) return;
				if (obj.x === undefined || obj.y === undefined) {
					console.error(
						'sprite.moveTo ERROR: movement destination not defined, object given with no x or y properties'
					);
					return;
				}
				speed = y;
				y = obj.y;
				x = obj.x;
			}
			this.dest.x = this.x;
			this.dest.y = this.y;

			let direction = true;

			if (x == this.x) x = false;
			else {
				this.dest.x = x;
				x = true;
			}
			if (y == this.y) y = false;
			else {
				this.dest.y = y;
				y = true;
			}

			this._destIdx++;
			if (!x && !y) return true;

			if (this.speed) speed ??= this.speed;
			if (this.tileSize > 1) speed ??= 0.1;
			speed ??= 1;
			if (speed <= 0) {
				console.warn('sprite.move: speed should be a positive number');
				return;
			}

			let a = this.dest.y - this.y;
			let b = this.dest.x - this.x;
			let c = Math.sqrt(a * a + b * b);

			let percent = speed / c;

			this.vel.x = b * percent;
			this.vel.y = a * percent;

			// estimate how many frames it will take for the sprite
			// to reach its destination
			let frames = Math.floor(c / speed) - 5;

			// margin of error
			let margin = speed + 0.01;

			let destIdx = this._destIdx;

			return (async () => {
				let distX = margin + margin;
				let distY = margin + margin;
				do {
					if (destIdx != this._destIdx) return false;

					await p5.prototype.delay();

					// skip calculations if not close enough to destination yet
					if (frames > 0) {
						frames--;
						continue;
					}

					// check if the sprite has reached its destination
					distX = Math.abs(this.x - this.dest.x);
					distY = Math.abs(this.y - this.dest.y);
				} while ((x && distX > margin) || (y && distY > margin));
				// stop moving the sprite, snap to destination
				if (distX < margin) this.x = this.dest.x;
				if (distY < margin) this.y = this.dest.y;
				this.vel.x = 0;
				this.vel.y = 0;
				return true;
			})();
		}

		/**
		 * Pushes the sprite toward a point.
		 * The force is added to the current velocity.
		 *
		 * Legacy method, use attract, move, or moveTowards instead.
		 *
		 * @deprecated
		 * @param {Number}  magnitude Scalar speed to add
		 * @param {Number}  x Direction x coordinate
		 * @param {Number}  y Direction y coordinate
		 */
		attractionPoint(magnitude, x, y) {
			let angle = this.p.atan2(y - this.y, x - this.x);
			this.vel.x += this.p.cos(angle) * magnitude;
			this.vel.y += this.p.sin(angle) * magnitude;
		}

		snap(o, dist) {
			if (o.isMoving || o.x != o.dest.x || o.y != o.dest.y || !this.isMoving) return;
			dist ??= 1 || this.tileSize * 0.1;
			if (Math.abs(this.x) % 1 >= dist || Math.abs(this.y) % 1 >= dist) {
				return;
			}
			this.vel.x = 0;
			this.vel.y = 0;
			this.x = Math.round(this.x);
			this.y = Math.round(this.y);
		}

		/**
		 * @method rotateTowards
		 * @param {*} x position to rotate towards
		 * @param {*} y position to rotate towards
		 * @param {*} facing rotation angle the sprite should be at when "facing" the position, default is 0
		 * @param {*} tracking percent of the distance to rotate on each frame towards the target angle, default is 0.1 (10%)
		 */
		rotateTowards(x, y, facing, tracking) {
			let angle = this.angleTo(x, y, facing);
			tracking ??= 0.1;
			this.rotationSpeed = angle * tracking;
		}

		/**
		 * Finds the minimium amount the sprite would have to rotate to
		 * "face" a position at a rotation.
		 *
		 * @method angleTo
		 * @param {Number|Object} x|position
		 * @param {Number} y
		 * @param {Number} facing rotation angle the sprite should be at when "facing" the position, default is 0
		 * @returns {Number} minimum angle of rotation to face the position
		 */
		angleTo(x, y, facing) {
			if (typeof x != 'number') {
				let obj = x;
				if (obj == this.p.mouse && !this.p.mouse.active) return 0;
				if (obj.x === undefined || obj.y === undefined) {
					console.error(
						'sprite.angleTo ERROR: rotation destination not defined, object given with no x or y properties'
					);
					return 0;
				}
				facing = y;
				y = obj.y;
				x = obj.x;
			}

			if (Math.abs(x - this.x) < 0.01 && Math.abs(y - this.y) < 0.01) {
				return 0;
			}

			facing ??= 0;

			let ang = this.p.atan2(y - this.y, x - this.x) + facing;
			let dist1 = ang - (this.rotation % 360);
			let dist2 = 360 - Math.abs(dist1);
			dist2 *= dist1 < 0 ? 1 : -1;
			return Math.abs(dist1) < Math.abs(dist2) ? dist1 : dist2;
		}

		/**
		 * Rotates the sprite to a position at a rotation.
		 *
		 * @method rotateTo
		 * @param {Number|Object} x|position
		 * @param {Number} y
		 * @param {Number} facing rotation angle the sprite should be at when "facing" the position, default is 0
		 * @param {Number} speed the amount of rotation per frame, default is 1
		 * @returns Promise
		 */
		rotateTo(x, y, facing, speed) {
			let angle = this.angleTo(x, y, facing);

			if (typeof x != 'number') speed = facing;

			this.rotate(angle, speed);
		}

		/**
		 * Rotates the sprite by an amount at a specified angles per frame speed.
		 *
		 * @method rotate
		 * @param {Number} angle the amount to rotate the sprite
		 * @param {Number} speed the amount of rotation per frame, default is 1
		 * @returns Promise
		 */
		rotate(angle, speed) {
			if (isNaN(angle)) throw new FriendlyError();
			if (angle == 0) return;
			let absA = Math.abs(angle);
			speed ??= 1;
			if (speed > absA) speed = absA;

			let ang = this.rotation + angle;
			let cw = angle > 0;
			this.rotationSpeed = speed * (cw ? 1 : -1);

			let frames = Math.ceil(absA / speed);
			this._rotateIdx ??= 0;
			this._rotateIdx++;
			let _rotateIdx = this._rotateIdx;

			return (async () => {
				if (frames > 1) {
					while (frames > 0) {
						if (this._rotateIdx != _rotateIdx) return;
						await p5.prototype.delay();
						frames--;
					}

					while (Math.abs(this.rotationSpeed) < Math.abs(ang - this.rotation)) {
						await p5.prototype.delay();
					}
					if (Math.abs(ang - this.rotation) > 0.01) {
						this.rotationSpeed = ang - this.rotation;
						await p5.prototype.delay();
					}
				} else {
					await p5.prototype.delay();
				}
				this.rotationSpeed = 0;
				this.rotation = ang;
			})();
		}

		/**
		 * Changes the sprite's animation. Use `addAni` to define the
		 * animation(s) first.
		 *
		 * @method ani
		 * @param {...String} anis the names of one or many animations to be played in
		 * sequence
		 * @returns A promise that fulfills when the animation or sequence of animations
		 * completes
		 */
		async changeAni(...anis) {
			if (anis.length == 1 && Array.isArray(anis[0])) {
				anis = anis[0];
			}

			let _ani = (name, start, end) => {
				return new Promise((resolve) => {
					this._changeAni(name);
					if (start < 0) start = this.animation.length + start;
					if (start) this.animation.frame = start;

					if (end !== undefined) this.animation.goToFrame(end);
					else if (this.frame == this.lastFrame) resolve();

					this.animation.onComplete = () => {
						resolve();
					};
				});
			};

			for (let i = 0; i < anis.length; i++) {
				let ani = anis[i];
				if (ani instanceof SpriteAnimation || ani instanceof p5.Image) {
					anis[i] = this.addAni(ani);
					ani = anis[i];
				}
				if (typeof ani == 'string') {
					anis[i] = { name: ani };
					ani = anis[i];
				}
				if (ani.name[0] == '!') {
					ani.name = ani.name.slice(1);
					ani.start = -1;
					ani.end = 0;
				}
			}

			// let count = ++this._aniChanged;

			for (let i = 0; i < anis.length; i++) {
				let ani = anis[i];
				// if () { // TODO repeat
				// 	if (count == this._aniChanged) i = 0;
				// 	continue;
				// }
				let { name, start, end } = ani;
				await _ani(name, start, end);
			}
		}

		changeAnimation() {
			return this.changeAni(...arguments);
		}

		/**
		 * Changes the displayed animation. The animation must be added first
		 * using the sprite.addAnimation method. The animation could also be
		 * added using the group.addAnimation method to a group the sprite
		 * has been added to.
		 *
		 * See SpriteAnimation for more control over the sequence.
		 *
		 * @method changeAnimation
		 * @param {String} label SpriteAnimation identifier
		 */
		_changeAni(label) {
			let ani = this.animations[label];
			if (!ani) {
				for (let g of this.groups) {
					ani = g.animations[label];
					if (ani) {
						ani = ani.clone();
						break;
					}
				}
			}
			if (!ani) {
				this.p.noLoop();
				throw new FriendlyError('Sprite.changeAnimation', [label]);
			}
			this._animation = ani;
			this.animation.name = label;
			// reset to frame 0 of that animation
			if (this.autoResetAnimations || (this.autoResetAnimations !== false && this.p.world.autoResetAnimations)) {
				this.animation.frame = 0;
			}
		}

		/**
		 * Removes the Sprite from the sketch.
		 * The removed Sprite will not be drawn or updated anymore.
		 *
		 * @method remove
		 */
		remove() {
			if (this.body) this.p.world.destroyBody(this.body);
			this.removed = true;

			//when removed from the "scene" also remove all the references in all the groups
			while (this.groups.length > 0) {
				this.groups[0].remove(this);
			}
		}

		/**
		 * Returns the sprite's unique identifier
		 *
		 * @method toString
		 * @returns the sprite's id
		 */
		toString() {
			return 's' + this.idNum;
		}

		_ensureCollide(target, callback) {
			if (!(target instanceof Sprite) && !(target instanceof Group)) {
				throw new FriendlyError('Sprite.collisions', 0, [target]);
			}
			if (callback && typeof callback != 'function') {
				throw new FriendlyError('Sprite.collisions', 1);
			}
		}

		/**
		 * @method collide
		 * @deprecated use collides instead
		 */
		collide(target, callback) {
			return this.collides(target, callback);
		}

		/**
		 * Returns true on the first frame that the sprite collides with the
		 * target sprite or group.
		 *
		 * Custom collision event handling can be done by using this function
		 * in an if statement or adding a callback as the second parameter.
		 *
		 * @method collides
		 * @param {Sprite|Group} target
		 * @param {Function} [callback]
		 */
		collides(target, callback) {
			this._ensureCollide(target, callback);
			this._collides[target] = callback || true;
			return this._collisions.get(target) == 1;
		}

		/**
		 * Returns a truthy value while the sprite is colliding with the
		 * target sprite or group. The value is the number of frames that
		 * the sprite has been colliding with the target.
		 *
		 * @method colliding
		 * @param {Sprite|Group} target
		 * @param {Function} [callback]
		 * @return {Number} frames
		 */
		colliding(target, callback) {
			this._ensureCollide(target, callback);
			this._colliding[target] = callback || true;
			let val = this._collisions.get(target);
			return val > 0 ? val : 0;
		}

		/**
		 * Returns true on the first frame that the sprite no longer overlaps
		 * with the target sprite or group.
		 *
		 * @method collided
		 * @param {Sprite|Group} target
		 * @param {Function} [callback]
		 * @return {Boolean}
		 */
		collided(target, callback) {
			this._ensureCollide(target, callback);
			this._collided[target] = callback || true;
			return this._collisions.get(target) == -1;
		}

		// TODO
		// displaces(target, callback) {}

		_ensureOverlap(target, callback) {
			if (!(target instanceof Sprite) && !(target instanceof Group)) {
				throw new Error('Sprite.overlaps', 0, [target]);
			}
			if (callback && typeof callback != 'function') {
				throw new FriendlyError('Sprite.overlaps', 1);
			}
			if (!this._hasOverlaps) this._createSensors();
			if (target instanceof Sprite) {
				if (!target._hasOverlaps) target._createSensors();
			} else if (target instanceof Group) {
				if (!target._hasOverlaps) {
					for (let s of target) {
						if (!s._hasOverlaps) s._createSensors();
					}
					target._hasOverlaps = true;
				}
			}
			this._overlap[target] = true;
		}

		/**
		 * @method overlap
		 * @deprecated use overlaps instead
		 */
		overlap(target, callback) {
			return this.overlaps(target, callback);
		}

		/**
		 * Returns true on the first frame that the sprite overlaps with the
		 * target sprite or group.
		 *
		 * Custom overlap event handling can be done by using this function
		 * in an if statement or adding a callback as the second parameter.
		 *
		 * @method overlaps
		 * @param {Sprite|Group} target
		 * @param {Function} [callback]
		 */
		overlaps(target, callback) {
			this._ensureOverlap(target, callback);
			this._overlaps[target] = callback || true;
			return this._overlappers.get(target) == 1;
		}

		/**
		 * Returns a truthy value while the sprite is overlapping with the
		 * target sprite or group. The value returned is the number of
		 * frames the sprite has been overlapping with the target.
		 *
		 * @method overlapping
		 * @param {Sprite|Group} target
		 * @param {Function} [callback]
		 * @return {Number} frames
		 */
		overlapping(target, callback) {
			this._ensureOverlap(target, callback);
			this._overlapping[target] = callback || true;
			let val = this._overlappers.get(target);
			return val > 0 ? val : 0;
		}

		/**
		 * Returns true on the first frame that the sprite no longer overlaps
		 * with the target sprite or group.
		 *
		 * @method overlapped
		 * @param {Sprite|Group} target
		 * @param {Function} [callback]
		 * @return {Boolean}
		 */
		overlapped(target, callback) {
			this._ensureOverlap(target, callback);
			this._overlapped[target] = callback || true;
			return this._overlappers.get(target) == -1;
		}

		_createSensors() {
			let shape;
			for (let fxt = this.fixtureList; fxt; fxt = fxt.getNext()) {
				shape = fxt.m_shape;
				this.body.createFixture({
					shape: shape,
					isSensor: true
				});
			}
			this._hasOverlaps = true;
		}

		/**
		 * Use sprite.animation.name instead.
		 *
		 * @deprecated
		 * @returns the name of the sprite's current animation
		 */
		getAnimationLabel() {
			return this.animation.name;
		}
	}

	this.Turtle = function (size) {
		if (pInst.allSprites.tileSize > 1) {
			throw new Error(`Turtle can't be used when allSprites.tileSize is greater than 1.`);
		}
		size ??= 25;
		let t = new Sprite(pInst.width * 0.5, pInst.height * 0.5, [
			[size, size * 0.4],
			[-size, size * 0.4],
			[0, size * -0.8]
		]);
		t.color = 'green';
		t._isTurtleSprite = true;
		let _move = t.move;
		t.move = function (distance) {
			return _move.call(this, this.rotation, 1, distance);
		};
		return t;
	};

	/**
	 * Look at the Animation reference pages before reading these docs.
	 *
	 * https://p5play.org/learn/sprite_animation.html
	 *
	 * A SpriteAnimation object contains a series of images (p5.Image objects)
	 * that can be displayed sequentially.
	 *
	 * A sprite can have multiple labeled animations, see Sprite.addAnimation
	 * and Sprite.changeAnimation, but you can also create animations that
	 * can be used without being added to a sprite first.
	 *
	 * An animation can be created either from a list of images or sequentially
	 * numbered images. p5.play will try to detect the sequence pattern.
	 *
	 * For example if the image file path is "image1.png" and the last frame
	 * index is 3 then "image2.png" and "image3.png" will be loaded as well.
	 *
	 * @example
	 *
	 * let shapeShifter = new SpriteAnimation("dog.png", "cat.png", "snake.png");
	 * let walking = new SpriteAnimation("walking0001.png", 5);
	 *
	 * @class SpriteAnimation
	 * @constructor
	 */
	class SpriteAnimation extends Array {
		constructor() {
			super();
			this.p = pInst;
			let args = [...arguments];

			/**
			 * The name of the animation
			 *
			 * @property name
			 * @type {String}
			 */
			this.name = 'default';

			let parent;

			if (args[0] instanceof Sprite || args[0] instanceof Group) {
				parent = args[0];
				args = args.slice(1);
			}
			parent ??= this.p.allSprites;

			if (typeof args[0] == 'string' && (args[0].length == 1 || !args[0].includes('.'))) {
				this.name = args[0];
				args = args.slice(1);
			}

			/**
			 * The index of the current frame that the animation is on.
			 *
			 * @property frame
			 * @type {Number}
			 */
			this.frame = 0;

			this.cycles = 0;

			this.targetFrame = -1;

			/**
			 * The offset is how far the animation should be placed from
			 * the location it is played at.
			 *
			 * @property offset
			 * @type {Object} x and y keys
			 *
			 * @example
			 * offset.x = 16;
			 */
			this.offset = { x: 0, y: 0 };

			/**
			 * Delay between frames in number of draw cycles.
			 * If set to 4 the framerate of the animation would be the
			 * sketch framerate divided by 4 (60fps = 15fps)
			 *
			 * @property frameDelay
			 * @type {Number}
			 * @default 4
			 */
			this.frameDelay = 4;

			/**
			 * True if the animation is currently playing.
			 *
			 * @property playing
			 * @type {Boolean}
			 * @default true
			 */
			this.playing = true;

			/**
			 * Animation visibility.
			 *
			 * @property visible
			 * @type {Boolean}
			 * @default true
			 */
			this.visible = true;

			/**
			 * If set to false the animation will stop after reaching the last frame
			 *
			 * @property looping
			 * @type {Boolean}
			 * @default true
			 */
			this.looping = true;

			/**
			 * Ends the loop on frame 0 instead of the last frame.
			 * This is useful for animations that are symmetric.
			 * For example a walking cycle where the first frame is the
			 * same as the last frame.
			 *
			 * @property endOnFirstFrame
			 * @type {Boolean}
			 * @default false
			 */
			this.endOnFirstFrame = false;

			/**
			 * True if frame changed during the last draw cycle
			 *
			 * @property frameChanged
			 * @type {Boolean}
			 */
			this.frameChanged = false;

			this.rotation = 0;
			this.scale = { x: 1, y: 1 };

			if (args.length == 0 || typeof args[0] == 'number') return;

			// sequence mode
			if (
				args.length == 2 &&
				typeof args[0] == 'string' &&
				(typeof args[1] == 'string' || typeof args[1] == 'number')
			) {
				let from = args[0];
				let to, num2;
				if (!isNaN(args[1])) num2 = Number(args[1]);
				else to = args[1];

				// print("sequence mode "+from+" -> "+to);

				// make sure the extensions are fine
				if (from.slice(-4) != '.png' || (to && to.slice(-4) != '.png')) {
					throw new FriendlyError('SpriteAnimation', 0, [from]);
				}

				let digits1 = 0;
				let digits2 = 0;

				// skip extension work backwards to find the numbers
				for (let i = from.length - 5; i >= 0; i--) {
					if (!isNaN(from.charAt(i))) digits1++;
					else break;
				}

				if (to) {
					for (let i = to.length - 5; i >= 0; i--) {
						if (!isNaN(to.charAt(i))) digits2++;
						else break;
					}
				}

				let prefix1 = from.slice(0, -4 - digits1);
				let prefix2;
				if (to) prefix2 = to.slice(0, -4 - digits2);

				// images don't belong to the same sequence
				// they are just two separate images with numbers
				if (to && prefix1 != prefix2) {
					this.push(this.p.loadImage(from));
					this.push(this.p.loadImage(to));
				} else {
					// Our numbers likely have leading zeroes, which means that some
					// browsers (e.g., PhantomJS) will interpret them as base 8 (octal)
					// instead of decimal. To fix this, we'll explicity tell parseInt to
					// use a base of 10 (decimal). For more details on this issue, see
					// http://stackoverflow.com/a/8763427/2422398.
					let num1 = parseInt(from.slice(-4 - digits1, -4), 10);
					num2 ??= parseInt(to.slice(-4 - digits2, -4), 10);

					// swap if inverted
					if (num2 < num1) {
						let t = num2;
						num2 = num1;
						num1 = t;
					}

					let fileName;
					if (!to || digits1 == digits2) {
						// load all images
						for (let i = num1; i <= num2; i++) {
							// Use nf() to number format 'i' into the amount of digits
							// ex: 14 with 4 digits is 0014
							fileName = prefix1 + this.p.nf(i, digits1) + '.png';
							this.push(this.p.loadImage(fileName));
						}
					} // case: case img1, img2
					else {
						for (let i = num1; i <= num2; i++) {
							// Use nf() to number format 'i' into four digits
							fileName = prefix1 + i + '.png';
							this.push(this.p.loadImage(fileName));
						}
					}
				}
			} // end sequence mode

			// SpriteSheet mode
			else if (typeof args[args.length - 1] != 'string' && !(args[args.length - 1] instanceof p5.Image)) {
				let sheet = parent.spriteSheet;
				let atlas;
				if (args[0] instanceof p5.Image || typeof args[0] == 'string') {
					if (args.length >= 3) {
						throw new FriendlyError('SpriteAnimation', 1);
					}
					sheet = args[0];
					atlas = args[1];
				} else {
					atlas = args[0];
				}

				let _this = this;

				if (sheet instanceof p5.Image && sheet.width != 1 && sheet.height != 1) {
					this.spriteSheet = sheet;
					_generateSheetFrames();
				} else {
					let url;
					if (typeof sheet == 'string') url = sheet;
					else url = sheet.url;
					this.spriteSheet = this.p.loadImage(url, () => {
						_generateSheetFrames();
					});
					// parent.spriteSheet = this.spriteSheet;
				}

				function _generateSheetFrames() {
					if (Array.isArray(atlas) || Array.isArray(atlas.frames)) {
						if (typeof atlas[0] == 'number') {
							if (atlas.length == 4) {
								atlas = { pos: atlas.slice(0, 2), size: atlas.slice(2) };
							} else {
								atlas = { pos: atlas };
							}
						} else {
							let frames = atlas;
							if (Array.isArray(atlas.frames)) {
								frames = atlas.frames;
								delete atlas.frames;
								for (let i = 0; i < frames.length; i++) {
									frames[i] = {
										pos: frames[i]
									};
									Object.assign(frames[i], atlas);
								}
							}
							for (let frame of frames) {
								atlas = frame;
								_generateSheetFrames();
							}
							return;
						}
					}

					let { w, h, width, height, frameSize, size, pos, line, x, y, frames, delay, rotation } = atlas;
					size ??= frameSize;
					if (delay) _this.frameDelay = delay;
					if (rotation) _this.rotation = rotation;

					w ??= width;
					h ??= height;

					let tileSize;
					if (parent) {
						w ??= parent.w;
						h ??= parent.h;
						tileSize = parent.tileSize;
					}

					x ??= 0;
					y ??= 0;
					pos ??= line;
					// if pos is a number or only y is defined but not x
					// the animation's first frame is at x = 0
					// the line number is the location of the animation line
					// given as a distance from the top of the image
					if (typeof pos == 'number') {
						y = pos;
					} else if (pos) {
						// pos is the location of the animation line
						// given as a [row,column] coordinate pair of distances in tiles
						// from the top left corner of the image
						x = pos[0]; // column
						y = pos[1]; // row
					}

					if (typeof size == 'number') {
						w = h = size;
					} else if (size) {
						w = size[0];
						h = size[1];
					}

					// get the real dimensions and position of the frame
					// in the sheet
					x *= tileSize;
					y *= tileSize;

					if (!w || !h) {
						if (tileSize) {
							w = h = 1 * tileSize;
						} else if (_this.spriteSheet.width < _this.spriteSheet.height) {
							w = h = _this.spriteSheet.width;
						} else {
							w = h = _this.spriteSheet.height;
						}
					} else {
						w *= tileSize;
						h *= tileSize;
					}

					let frameCount = frames || 1;

					// add all the frames in the animation to the frames array
					for (let i = 0; i < frameCount; i++) {
						_this.push({ x, y, w, h });
						x += w;
						if (x >= _this.spriteSheet.width) {
							x = 0;
							y += h;
							if (y >= _this.spriteSheet.height) y = 0;
						}
					}
				}
			} // end SpriteSheet mode
			else {
				// list of images
				for (let i = 0; i < args.length; i++) {
					if (args[i] instanceof p5.Image) this.push(args[i]);
					else this.push(this.p.loadImage(args[i]));
				}
			}
		}

		clone() {
			let ani = new SpriteAnimation();
			ani.spriteSheet = this.spriteSheet;
			for (let i = 0; i < this.length; i++) {
				ani.push(this[i]);
			}
			ani.offset.x = this.offset.x;
			ani.offset.y = this.offset.y;
			ani.frameDelay = this.frameDelay;
			ani.playing = this.playing;
			ani.looping = this.looping;
			ani.rotation = this.rotation;
			return ani;
		}

		/**
		 * Draws the animation at coordinate x and y.
		 * Updates the frames automatically.
		 *
		 * Optional parameters effect the current draw cycle only and
		 * are not saved between draw cycles.
		 *
		 * @method draw
		 * @param {Number} x horizontal position
		 * @param {Number} y vertical position
		 * @param {Number} [r] rotation
		 * @param {Number} [sx] scale x
		 * @param {Number} [sy] scale y
		 */
		draw(x, y, r, sx, sy) {
			this.x = x || 0;
			this.y = y || 0;

			if (!this.visible) return;

			this.p.push();
			this.p.imageMode(p5.prototype.CENTER);
			this.p.translate(this.x, this.y);
			this.p.rotate(r || this.rotation);
			this.p.scale(sx || this.scale.x, sy || this.scale.y);
			let img = this[this.frame];
			if (img !== undefined) {
				if (this.spriteSheet) {
					let { x, y, w, h } = img; // image info
					this.p.image(this.spriteSheet, this.offset.x, this.offset.y, w, h, x, y, w, h);
				} else {
					this.p.image(img, this.offset.x, this.offset.y);
				}
			} else {
				this.p.print('Warning undefined frame ' + this.frame);
			}

			this.p.pop();
		}

		/**
		 * @private
		 */
		update() {
			this.cycles++;
			var previousFrame = this.frame;
			this.frameChanged = false;

			//go to frame
			if (this.length === 1) {
				this.playing = false;
				this.frame = 0;
			}

			if (this.playing && this.cycles % this.frameDelay === 0) {
				this.frameChanged = true;

				if ((this.targetFrame == -1 && this.frame == this.lastFrame) || this.frame == this.targetFrame) {
					if (this.endOnFirstFrame) this.frame = 0;
					if (this.looping) this.targetFrame = -1;
					else this.playing = false;
					this.onComplete(); //fire when on last frame
					if (!this.looping) return;
				}

				//going to target frame up
				if (this.targetFrame > this.frame && this.targetFrame !== -1) {
					this.frame++;
				}
				//going to target frame down
				else if (this.targetFrame < this.frame && this.targetFrame !== -1) {
					this.frame--;
				} else if (this.targetFrame === this.frame && this.targetFrame !== -1) {
					this.playing = false;
				} else if (this.looping) {
					//advance frame
					//if next frame is too high
					if (this.frame >= this.lastFrame) {
						this.frame = 0;
					} else this.frame++;
				} else {
					//if next frame is too high
					if (this.frame < this.lastFrame) this.frame++;
				}
			}
		}

		/**
		 * Plays the animation, starting from the specified frame.
		 *
		 * @method play
		 */
		play(frame) {
			this.playing = true;
			if (frame !== undefined) this.frame = frame;
			this.targetFrame = -1;
		}

		/**
		 * Stops the animation.
		 *
		 * @method stop
		 */
		stop(frame) {
			this.playing = false;
			if (frame) this.frame = frame;
		}

		/**
		 * Plays the animation backwards.
		 * Equivalent to ani.goToFrame(0)
		 *
		 * @method rewind
		 */
		rewind() {
			this.looping = false;
			this.goToFrame(0);
		}

		/**
		 * Plays the animation forwards and loops it.
		 *
		 * @method loop
		 */
		loop() {
			this.looping = true;
			this.playing = true;
		}

		/**
		 * Prevents the animation from looping
		 *
		 * @method noLoop
		 */
		noLoop() {
			this.looping = false;
		}

		/**
		 * fire when animation ends
		 *
		 * @method onComplete
		 * @return {SpriteAnimation}
		 */
		onComplete() {
			return undefined;
		}

		/**
		 * Deprecated, change the frame property directly.
		 *
		 * Changes the current frame.
		 *
		 * @deprecated
		 * @param {Number} frame Frame number (starts from 0).
		 */
		changeFrame(f) {
			if (f < this.length) this.frame = f;
			else this.frame = this.length - 1;

			this.targetFrame = -1;
			//this.playing = false;
		}

		/**
		 * Goes to the next frame and stops.
		 *
		 * @method nextFrame
		 */
		nextFrame() {
			if (this.frame < this.length - 1) this.frame = this.frame + 1;
			else if (this.looping) this.frame = 0;

			this.targetFrame = -1;
			this.playing = false;
		}

		/**
		 * Goes to the previous frame and stops.
		 *
		 * @method previousFrame
		 */
		previousFrame() {
			if (this.frame > 0) this.frame = this.frame - 1;
			else if (this.looping) this.frame = this.length - 1;

			this.targetFrame = -1;
			this.playing = false;
		}

		/**
		 * Plays the animation forward or backward toward a target frame.
		 *
		 * @method goToFrame
		 * @param {Number} toFrame Frame number destination (starts from 0)
		 */
		goToFrame(toFrame) {
			if (toFrame < 0 || toFrame >= this.length) {
				return;
			}

			// targetFrame gets used by the update() method to decide what frame to
			// select next.  When it's not being used it gets set to -1.
			this.targetFrame = toFrame;

			if (this.targetFrame !== this.frame) {
				this.playing = true;
			}
		}

		/**
		 * Use .frame instead.
		 *
		 * Returns the current frame number.
		 *
		 * @deprecated
		 * @return {Number} Current frame (starts from 0)
		 */
		getFrame() {
			return this.frame;
		}

		/**
		 * Use .lastFrame instead.
		 *
		 * Returns the last frame number.
		 *
		 * @deprecated
		 * @return {Number} Last frame number (starts from 0)
		 */
		getLastFrame() {
			return this.lastFrame;
		}

		get lastFrame() {
			return this.length - 1;
		}

		/**
		 * Returns the current frame image as p5.Image.
		 *
		 * @method getImage
		 * @return {p5.Image} Current frame image
		 */
		get frameImage() {
			let f = this.frame;
			let img = this[f];
			if (img instanceof p5.Image) return img;

			let { x, y, w, h } = img; // image info
			let g = createGraphics(w, h);
			g.image(this.spriteSheet, this.offset.x, this.offset.y, w, h, x, y, w, h);
			return g;
		}

		get w() {
			return this.width;
		}

		get width() {
			if (this[this.frame] instanceof p5.Image) {
				return this[this.frame].width;
			} else if (this[this.frame]) {
				return this[this.frame].w;
			}
			return 1;
		}

		get h() {
			return this.height;
		}

		get height() {
			if (this[this.frame] instanceof p5.Image) {
				return this[this.frame].height;
			} else if (this[this.frame]) {
				return this[this.frame].h;
			}
			return 1;
		}

		get frames() {
			let frames = [];
			for (let i = 0; i < this.length; i++) {
				frames.push(this[i]);
			}
			return frames;
		}

		get images() {
			return this.frames;
		}
	}

	/**
	 * Look at the Group reference pages before reading these docs.
	 *
	 * https://p5play.org/learn/group.html
	 *
	 * In p5.play groups are collections of sprites with similar behavior.
	 * For example a group may contain all the coin sprites that the
	 * player can collect.
	 *
	 * Group extends Array. You can use them in for loops just like arrays
	 * since they inherit all the functions and properties of standard
	 * arrays such as group.length
	 *
	 * Since groups just contain references to sprites, a sprite can be in
	 * multiple groups.
	 *
	 * sprite.remove() removes the sprite from all the groups
	 * it belongs to. group.removeAll() removes all the sprites from
	 * a group.
	 *
	 * The top level group is a p5 instance level variable named
	 * 'allSprites' that contains all the sprites added to the sketch.
	 *
	 * @class Group
	 * @constructor
	 */
	class Group extends Array {
		constructor(...args) {
			let parent;
			if (args[0] instanceof Group) {
				parent = args[0];
				args = args.slice(1);
			}
			super(...args);
			this.idNum = 0;
			this.p = pInst;

			// if all sprites doesn't exist yet,
			// this group is the allSprites group
			if (!this.p.allSprites) this._isAllSpritesGroup = true;

			if (!this._isAllSpritesGroup) this.parent = 0;
			if (parent) this.parent = parent.idNum;

			/**
			 * Keys are the animation label, values are SpriteAnimation objects.
			 *
			 * @property animations
			 * @type {Object}
			 */
			this.animations = {};

			/**
			 * Contains all the collision callback functions for this group
			 * when it comes in contact with other sprites or groups.
			 * @property _collides
			 */
			this._collides = {};
			this._colliding = {};
			this._collided = {};

			this._overlap = {};
			/**
			 * Contains all the overlap callback functions for this group
			 * when it comes in contact with other sprites or groups.
			 * @property _overlaps
			 */
			this._overlaps = {};
			this._overlapping = {};
			this._overlapped = {};

			this._collisions = new Map();
			this._overlappers = new Map();

			// mainly for internal use
			// autoCull as a property of allSprites only refers to the default allSprites cull
			// in the post draw function, if the user calls cull on allSprites it should work
			// for any other group made by users autoCull affects whether cull removes sprites or not
			// by default for allSprites it is set to true, for all other groups it is undefined
			this.autoCull;

			if (this.p.world) {
				this.idNum = this.p.world.groupsCreated;
				this.p.world.groups[this.idNum] = this;
				this.p.world.groupsCreated++;
			}

			let _this = this;

			class GroupSprite extends Sprite {
				constructor() {
					super(_this, ...arguments);
				}
			}

			this.Sprite = GroupSprite;

			class SubGroup extends Group {
				constructor() {
					super(_this, ...arguments);
				}
			}

			this.Group = SubGroup;

			this.mouse = {
				presses: null,
				pressing: null,
				pressed: null,
				holds: null,
				holding: null,
				held: null,
				released: null,
				hovers: null,
				hovering: null,
				hovered: null
			};
			for (let state in this.mouse) {
				this.mouse[state] = function (inp) {
					for (let s of _this) {
						if (s.mouse[state](inp)) return true;
					}
					return false;
				};
			}

			let props = [...spriteProps, 'spriteSheet'];
			for (let prop of props) {
				Object.defineProperty(this, prop, {
					get() {
						let val = _this['_' + prop];
						let i = _this.length - 1;
						if (val === undefined && this.p.world && !_this._isAllSpritesGroup) {
							let parent = this.p.world.groups[_this.parent];
							if (parent) {
								val = parent[prop];
								i = parent.length - 1;
							}
						}
						return val;
					},
					set(val) {
						_this['_' + prop] = val;

						// change the prop in all the sprite of this group
						for (let i = 0; i < _this.length; i++) {
							let s = _this[i];
							let v = val;
							if (typeof val == 'function') v = val(i);
							s[prop] = v;
						}
					}
				});
			}

			this.vel = pInst.createVector.call(pInst);
			this.mirror = {};

			let objProps = { vel: ['x', 'y'], mirror: ['x', 'y'] };
			for (let objProp in objProps) {
				for (let prop of objProps[objProp]) {
					Object.defineProperty(this[objProp], prop, {
						get() {
							let val = _this[objProp]['_' + prop];
							let i = _this.length - 1;
							if (val === undefined && _this.p.world && !_this._isAllSpritesGroup) {
								let parent = _this.p.world.groups[_this.parent];
								if (parent) {
									val = parent[objProp][prop];
									i = parent.length - 1;
								}
							}
							return val;
						},
						set(val) {
							_this[objProp]['_' + prop] = val;

							// change the prop in all the sprite of this group
							for (let i = 0; i < _this.length; i++) {
								let s = _this[i];
								let v = val;
								if (typeof val == 'function') v = val(i);
								s[objProp][prop] = v;
							}
						}
					});
				}
			}

			this.orbitAngle = 0;
		}

		/**
		 * Reference to the current animation.
		 *
		 * @property ani
		 * @type {SpriteAnimation}
		 */
		get ani() {
			return this._animation;
		}
		set ani(val) {
			this.addAni(val);
			for (let s of this) s.changeAni(val);
		}

		get animation() {
			return this._animation;
		}
		set animation(val) {
			this.ani = val;
		}

		get anis() {
			return this.animations;
		}

		get img() {
			return this._animation;
		}
		set img(val) {
			this.ani = val;
		}

		get image() {
			return this._animation;
		}
		set image(val) {
			this.ani = val;
		}

		set amount(val) {
			let diff = val - this.length;
			let shouldAdd = diff > 0;
			diff = Math.abs(diff);
			for (let i = 0; i < diff; i++) {
				if (shouldAdd) this.add(new this.Sprite());
				else this[this.length - 1].remove();
			}
		}

		resetCentroid() {
			let x = 0;
			let y = 0;
			for (let s of this) {
				x += s.x;
				y += s.y;
			}
			this.centroid = { x: x / this.length, y: y / this.length };
			return this.centroid;
		}

		resetDistancesFromCentroid() {
			for (let s of this) {
				s.distCentroid = {
					x: s.x - this.centroid.x,
					y: s.y - this.centroid.y
				};
			}
		}

		snap(o, dist) {
			dist ??= 1 || this.tileSize * 0.1;
			for (let s of this) {
				s.snap(o, dist);
			}
		}

		_ensureCollide(target, callback) {
			if (!(target instanceof Sprite) && !(target instanceof Group)) {
				throw new Error('collide target must be a sprite or a group');
			}
		}

		/**
		 * @method collide
		 * @deprecated use collides instead
		 */
		collide(target, callback) {
			return this.collides(target, callback);
		}

		/**
		 * Returns true on the first frame that the group collides with the
		 * target sprite or group.
		 *
		 * Custom collision event handling can be done by using this function
		 * in an if statement or adding a callback as the second parameter.
		 *
		 * @method collides
		 * @param {Sprite|Group} target
		 * @param {Function} [callback]
		 */
		collides(target, callback) {
			this._ensureCollide(target, callback);
			this._collides[target] = callback || true;
			return this._collisions.get(target) == 1;
		}

		/**
		 * Returns a truthy value while the group is colliding with the
		 * target sprite or group. The value is the number of frames that
		 * the group has been colliding with the target.
		 *
		 * @method colliding
		 * @param {Sprite|Group} target
		 * @param {Function} [callback]
		 * @return {Number} frames
		 */
		colliding(target, callback) {
			this._ensureCollide(target, callback);
			this._colliding[target] = callback || true;
			let val = this._collisions.get(target);
			return val > 0 ? val : 0;
		}

		/**
		 * Returns true on the first frame that the group no longer overlaps
		 * with the target sprite or group.
		 *
		 * @method collided
		 * @param {Sprite|Group} target
		 * @param {Function} [callback]
		 * @return {Boolean}
		 */
		collided(target, callback) {
			this._ensureCollide(target, callback);
			this._collided[target] = callback || true;
			return this._collisions.get(target) == -1;
		}

		// TODO
		// displaces(target, callback) {}

		_ensureOverlap(target, callback) {
			if (!(target instanceof Sprite) && !(target instanceof Group)) {
				throw new Error('collide target must be a sprite or a group');
			}
			if (!this._hasOverlaps) {
				for (let s of this) {
					if (!s._hasOverlaps) s._createSensors();
				}
				this._hasOverlaps = true;
			}
			if (target instanceof Sprite) {
				if (!target._hasOverlaps) target._createSensors();
			} else if (target instanceof Group) {
				if (!target._hasOverlaps) {
					for (let s of target) {
						if (!s._hasOverlaps) s._createSensors();
					}
					target._hasOverlaps = true;
				}
			}
			this._overlap[target] = true;
		}

		/**
		 * @method overlap
		 * @deprecated use overlaps instead
		 */
		overlap(target, callback) {
			return this.overlaps(target, callback);
		}

		/**
		 * Returns true on the first frame that the group overlaps with the
		 * target sprite or group.
		 *
		 * Custom overlap event handling can be done by using this function
		 * in an if statement or adding a callback as the second parameter.
		 *
		 * @method overlaps
		 * @param {Sprite|Group} target
		 * @param {Function} [callback]
		 */
		overlaps(target, callback) {
			this._ensureOverlap(target, callback);
			this._overlaps[target] = callback || true;
			return this._overlappers.get(target) == 1;
		}

		/**
		 * Returns a truthy value while the group is overlapping with the
		 * target sprite or group. The value returned is the number of
		 * frames the group has been overlapping with the target.
		 *
		 * @method overlapping
		 * @param {Sprite|Group} target
		 * @param {Function} [callback]
		 * @return {Number} frames
		 */
		overlapping(target, callback) {
			this._ensureOverlap(target, callback);
			this._overlapping[target] = callback || true;
			let val = this._overlappers.get(target);
			return val > 0 ? val : 0;
		}

		/**
		 * Returns true on the first frame that the group no longer overlaps
		 * with the target sprite or group.
		 *
		 * @method overlapped
		 * @param {Sprite|Group} target
		 * @param {Function} [callback]
		 * @return {Boolean}
		 */
		overlapped(target, callback) {
			this._ensureOverlap(target, callback);
			this._overlapped[target] = callback || true;
			return this._overlappers.get(target) == -1;
		}

		/**
		 * @method move
		 */
		move(distance, direction, speed) {
			let movements = [];
			for (let s of this) {
				movements.push(s.move(distance, direction, speed));
			}
			return Promise.all(movements);
		}

		/**
		 * @method moveTo
		 */
		moveTo(x, y, speed) {
			let centroid = this.centroid;
			let movements = [];
			for (let s of this) {
				let dest = {
					x: s.x - centroid.x + x,
					y: s.y - centroid.y + y
				};
				movements.push(s.moveTo(dest.x, dest.y, speed));
			}
			return Promise.all(movements);
		}

		/**
		 * @method moveTowards
		 */
		moveTowards(x, y, tracking) {
			if (typeof x != 'number') {
				tracking = y;
				y = x.y;
				x = x.x;
			}
			if (x === undefined && y === undefined) return;
			let centroid = this.resetCentroid();
			for (let s of this) {
				if (s.distCentroid === undefined) this.resetDistancesFromCentroid();
				let dest = {
					x: s.distCentroid.x + x,
					y: s.distCentroid.y + y
				};
				s.moveTowards(dest.x, dest.y, tracking);
			}
		}

		/**
		 * @method moveAway
		 */
		moveAway(x, y, tracking) {
			if (typeof x != 'number') {
				tracking = y;
				y = x.y;
				x = x.x;
			}
			if (x === undefined && y === undefined) return;
			let centroid = this.resetCentroid();
			for (let s of this) {
				if (s.distCentroid === undefined) this.resetDistancesFromCentroid();
				let dest = {
					x: s.distCentroid.x + x,
					y: s.distCentroid.y + y
				};
				s.moveAway(dest.x, dest.y, tracking);
			}
		}

		/**
		 * Rotates the group around its centroid.
		 *
		 * TODO experimental function, subject to change!
		 *
		 * @method orbit
		 * @param {Number} amount Amount of rotation
		 */
		orbit(amount) {
			if (!this.centroid) this.resetCentroid();
			this.orbitAngle += amount;
			let angle = this.orbitAngle;
			for (let s of this) {
				if (s.distCentroid === undefined) this.resetDistancesFromCentroid();
				let x = s.distCentroid.x;
				let y = s.distCentroid.y;
				let x2 = x * this.p.cos(angle) - y * this.p.sin(angle);
				let y2 = x * this.p.sin(angle) + y * this.p.cos(angle);
				x2 += this.centroid.x;
				y2 += this.centroid.y;
				s.vel.x = (x2 - s.x) * 0.1 * s.tileSize;
				s.vel.y = (y2 - s.y) * 0.1 * s.tileSize;
			}
		}

		/**
		 * Gets the member at index i.
		 *
		 * @deprecated
		 * @method get
		 * @param {Number} i The index of the object to retrieve
		 */
		get(i) {
			return this[i];
		}

		/**
		 * Checks if the group contains a sprite.
		 *
		 * @method contains
		 * @param {Sprite} sprite The sprite to search
		 * @return {Number} Index or -1 if not found
		 */
		contains(sprite) {
			return this.indexOf(sprite) > -1;
		}

		/**
		 * Adds a sprite to the group. Returns true if the sprite was added
		 * because it was not already in the group.
		 *
		 * @method push
		 * @param {Sprite} s The sprite to be added
		 */
		push(s) {
			if (!(s instanceof Sprite)) {
				throw new Error('you can only add sprites to a group');
			}

			if (this.indexOf(s) == -1) {
				super.push(s);
				if (this.parent) this.p.world.groups[this.parent].push(s);
				s.groups.push(this);
				return true;
			}
		}

		/**
		 * Adds a sprite to the group. Returns true if the sprite was added
		 * because it was not already in the group.
		 *
		 * @method add
		 * @param {Sprite} s The sprite to be added
		 */
		add(s) {
			this.push(s);
		}

		/**
		 * Same as group.length
		 *
		 * @method size
		 */
		size() {
			return this.length;
		}

		/**
		 * Returns the group's unique identifier.
		 *
		 * @returns {String} groupID
		 */
		toString() {
			return 'g' + this.idNum;
		}

		/**
		 * Remove sprites that go outside the given culling boundary
		 * relative to the camera.
		 *
		 * @method cull
		 * @param {Number} top|size The distance that sprites can move below the p5.js canvas before they are removed. *OR* The distance sprites can travel outside the screen on all sides before they get removed.
		 * @param {Number} bottom|cb The distance that sprites can move below the p5.js canvas before they are removed.
		 * @param {Number} [left] The distance that sprites can move beyond the left side of the p5.js canvas before they are removed.
		 * @param {Number} [right] The distance that sprites can move beyond the right side of the p5.js canvas before they are removed.
		 * @param {Function} [cb(sprite)] The callback is given the sprite that
		 * passed the cull boundary, if no callback is given the sprite is
		 * removed by default
		 */
		cull(top, bottom, left, right, cb) {
			if (left === undefined) {
				let size = top;
				cb = bottom;
				top = bottom = left = right = size;
			}
			if (isNaN(top) || isNaN(bottom) || isNaN(left) || isNaN(right)) {
				throw new TypeError('The culling boundary must be defined with numbers');
			}
			if (cb && typeof cb != 'function') {
				throw new TypeError('The callback to group.cull must be a function');
			}

			let cx = this.p.camera.x - this.p.world.hw / this.p.camera.zoom;
			let cy = this.p.camera.y - this.p.world.hh / this.p.camera.zoom;

			let minX = -left + cx;
			let minY = -top + cy;
			let maxX = this.p.width + right + cx;
			let maxY = this.p.height + bottom + cy;

			for (let s of this) {
				if (s.x < minX || s.y < minY || s.x > maxX || s.y > maxY) {
					if (cb) cb(s);
					else s.remove();
				}
			}
		}

		/**
		 * If no input is given all sprites in the group are removed.
		 *
		 * If a sprite or index is given, that sprite is removed from this
		 * group and any group this group inherits from except for the
		 * allSprites group.
		 *
		 * @method remove
		 * @param {Sprite} item The sprite to be removed
		 * @return {Boolean} true if sprite was found and removed
		 */
		remove(item) {
			if (item === undefined) {
				while (this.length > 0) {
					this[0].remove();
				}
				return;
			}

			let idx;
			if (typeof item == 'number') {
				idx = item;
			} else {
				for (let i = this.length - 1; i >= 0; i--) {
					if (this[i] === item) {
						idx = i;
						break;
					}
				}
			}

			if (idx !== undefined) {
				let removed = this[idx];
				let gIdx = this[idx].groups.findIndex((g) => g.idNum == this.idNum);
				this[idx].groups.splice(gIdx, 1);
				this.splice(idx, 1);

				return removed;
			}
			throw new Error('Sprite not found in group');
		}

		/**
		 * Removes all sprites from the group and destroys the group.
		 *
		 * @method removeAll
		 */
		removeAll() {
			this.remove();
		}

		/**
		 * Returns the highest depth in a group
		 *
		 * @method maxDepth
		 * @return {Number} The depth of the sprite drawn on the top
		 */
		maxDepth() {
			if (this.length == 0) return 0;
			if (this.length == 1 && this[0].layer === undefined) return 0;
			let max = this[0].layer;
			for (let s of this) {
				if (s.layer > max) max = s.layer;
			}
			return max;
		}

		/**
		 * Returns the lowest depth in a group
		 *
		 * @method minDepth
		 * @return {Number} The depth of the sprite drawn on the bottom
		 */
		minDepth() {
			if (this.length === 0) {
				return 99999;
			}

			return this.reduce(function (minDepth, sprite) {
				return Math.min(minDepth, sprite.depth);
			}, Infinity);
		}

		draw() {
			let g = [...this];
			g.sort((a, b) => a.layer - b.layer);
			for (let i = 0; i < g.length; i++) {
				let sprite = g[i];
				if (sprite.life-- < 0) {
					sprite.remove();
					g.splice(i, 1);
					i--;
					continue;
				}
				if (sprite.visible) sprite.draw();
			}
		}
	}

	/**
	 * Adds an animation to the sprite. Use this function in the preload p5.js
	 * function. You don't need to name the animation if the sprite will only
	 * use one animation. See SpriteAnimation for more information.
	 *
	 * @example
	 * sprite.addAni(name, animation);
	 * sprite.addAni(name, frame1, frame2, frame3...);
	 * sprite.addAni(name, atlas);
	 *
	 * @method addAni
	 * @param {String} name SpriteAnimation identifier
	 * @param {SpriteAnimation} animation The preloaded animation
	 */
	Sprite.prototype.addAnimation =
		Group.prototype.addAnimation =
		Sprite.prototype.addAni =
		Group.prototype.addAni =
		Sprite.prototype.addImage =
		Group.prototype.addImage =
		Sprite.prototype.addImg =
		Group.prototype.addImg =
			function () {
				let args = [...arguments];
				let name, ani;
				if (args[0] instanceof SpriteAnimation) {
					ani = args[0];
					name = ani.name || 'default';
					ani.name = name;
				} else if (args[1] instanceof SpriteAnimation) {
					name = args[0];
					ani = args[1];
					ani.name = name;
				} else {
					ani = new SpriteAnimation(this, ...args);
					name = ani.name;
				}
				this.animations[name] = ani;
				this._animation = ani;
				// TODO resize sprite collider to animation dimensions
				// if (this._isAllSpritesGroup) {
				// 	this.w = ani.w;
				// 	this.h = ani.h;
				// }
				return ani;
			};

	/**
	 * Add multiple animations
	 *
	 * @method addAnis
	 */
	Sprite.prototype.addAnis =
		Group.prototype.addAnis =
		Sprite.prototype.addAnimations =
		Group.prototype.addAnimations =
		Sprite.prototype.addImages =
		Group.prototype.addImages =
		Sprite.prototype.addImgs =
		Group.prototype.addImgs =
			function () {
				let args = arguments;
				let atlases;
				if (args.length == 1) {
					atlases = args[0];
				} else {
					this.spriteSheet = args[0];
					atlases = args[1];
				}
				for (let name in atlases) {
					let atlas = atlases[name];
					this.addAni(name, atlas);
				}
			};

	/**
	 * Look at the World reference pages before reading these docs.
	 *
	 * https://p5play.org/learn/world.html
	 *
	 * @class World
	 * @constructor
	 */
	class World extends pl.World {
		constructor() {
			super(new pl.Vec2(0, 0), true);
			this.p = pInst;
			this.width = this.p.width;
			this.height = this.p.height;
			this._offset = { x: 0, y: 0 };
			let _this = this;
			this.offset = {
				get x() {
					return -_this._offset.x;
				},
				/**
				 * @property offset.x
				 */
				set x(val) {
					_this._offset.x = val;
					_this.resize();
				},
				get y() {
					return -_this._offset.y;
				},
				/**
				 * @property offset.y
				 */
				set y(val) {
					_this._offset.y = val;
					_this.resize();
				}
			};
			this.resize();

			/**
			 * If false, animations that are stopped before they are completed,
			 * typically by a call to sprite.changeAni, will restart at the
			 * frame they were stopped at. If true, animations will always
			 * start playing from frame 0 unless specified by the user in a
			 * separate `anim.changeFrame` call.
			 *
			 * @property autoResetAnimations
			 * @type {SpriteAnimation}
			 * @default false
			 */
			this.autoResetAnimations = false;

			this.palettes = this.p.world?.palettes || [
				{
					// a
					b: 'black',
					c: 'crimson',
					d: 'dark blue',
					// e
					f: 'fuchsia',
					g: 'green',
					h: 'hot pink',
					i: 'blue', // indigo
					// j
					k: 'black',
					l: 'lavender',
					m: 'magenta',
					n: 'brown',
					o: 'orange',
					p: 'pink',
					// q
					r: 'red',
					s: 'sky blue',
					t: 'turquoise',
					u: 'blue',
					v: 'violet',
					w: 'white',
					// x
					y: 'yellow'
					// z
				}
			];

			this.groups = [this.p.allSprites];
			this.groupsCreated = 1;
			this.spritesCreated = 0;
			this.contacts = [];

			this.on('begin-contact', this._beginContact);
			this.on('end-contact', this._endContact);

			/**
			 * Gravity vector
			 *
			 * @property gravity
			 */
			this.gravity = {
				get x() {
					return _this.m_gravity.x;
				},
				set x(val) {
					_this.m_gravity.x = _this.p.round(val || 0);
				},
				get y() {
					return _this.m_gravity.y;
				},
				set y(val) {
					_this.m_gravity.y = _this.p.round(val || 0);
				}
			};
		}

		resize(w, h) {
			w ??= this.p.width;
			h ??= this.p.height;
			this.origin = {
				x: w * 0.5 + this.offset.x,
				y: h * 0.5 + this.offset.y
			};
			if (this.p.allSprites.tileSize != 1) {
				this.origin.x -= this.p.allSprites.tileSize * 0.5;
				this.origin.y -= this.p.allSprites.tileSize * 0.5;
			}
			this.hw = w * 0.5;
			this.hh = h * 0.5;
			this.halfWidth = this.hw;
			this.halfHeight = this.hh;
		}

		_beginContact(contact) {
			// Get both fixtures
			let a = contact.m_fixtureA;
			let b = contact.m_fixtureB;
			let t = '_collisions';
			if (a.isSensor()) t = '_overlappers';
			a = a.m_body.sprite;
			b = b.m_body.sprite;

			a[t].set(b, 0);
			b[t].set(a, 0);

			for (let g of b.groups) {
				g[t].set(a, g[t].get(a) || 0);
				a[t].set(g, a[t].get(g) || 0);
			}

			for (let g of a.groups) {
				g[t].set(b, g[t].get(b) || 0);
				b[t].set(g, b[t].get(g) || 0);
				for (let g2 of b.groups) {
					g[t].set(g2, g[t].get(g2) || 0);
					g2[t].set(g, g2[t].get(g) || 0);
				}
			}
		}

		_endContact(contact) {
			let a = contact.m_fixtureA;
			let b = contact.m_fixtureB;
			let contactType = '_collisions';
			if (a.isSensor()) contactType = '_overlappers';
			a = a.m_body.sprite;
			b = b.m_body.sprite;

			a[contactType].set(b, -2);
			b[contactType].set(a, -2);

			for (let g of b.groups) {
				let inContact = false;
				for (let s of g) {
					if (s[contactType].get(a) >= 0) {
						inContact = true;
						break;
					}
				}
				if (!inContact) {
					g[contactType].set(a, -2);
					a[contactType].set(g, -2);
				}
			}

			for (let g of a.groups) {
				let inContact = false;
				for (let s of g) {
					if (s[contactType].get(b) >= 0) {
						inContact = true;
						break;
					}
				}
				if (!inContact) {
					g[contactType].set(b, -2);
					b[contactType].set(g, -2);
					for (let g2 of b.groups) {
						g[contactType].set(g2, -2);
						g2[contactType].set(g, -2);
					}
				}
			}
		}

		get autoCull() {
			return this.p.allSprites.autoCull;
		}

		set autoCull(val) {
			this.p.allSprites.autoCull = val;
		}

		get allowSleeping() {
			return this.getAllowSleeping();
		}

		set allowSleeping(val) {
			this.setAllowSleeping(val);
		}
	}

	/**
	 * Look at the Camera reference pages before reading these docs.
	 *
	 * https://p5play.org/learn/camera.html
	 *
	 * A camera facilitates scrolling and zooming for scenes extending beyond
	 * the canvas. A camera has a position, a zoom factor, and the mouse
	 * coordinates relative to the view.
	 * The camera is automatically created on the first draw cycle.
	 *
	 * In p5.js terms the camera wraps the whole drawing cycle in a
	 * transformation matrix but it can be disable anytime during the draw
	 * cycle for example to draw interface elements in an absolute position.
	 *
	 * @class Camera
	 * @constructor
	 * @param {Number} x Initial x coordinate
	 * @param {Number} y Initial y coordinate
	 * @param {Number} zoom magnification
	 **/
	class Camera {
		constructor(x, y, zoom) {
			this.p = pInst;
			let _this = this;

			this._pos = { x: 0, y: 0 };

			/**
			 * Camera zoom.
			 *
			 * A scale of 1 will be the normal size. Setting it to 2 will
			 * make everything twice the size. .5 will make everything half
			 * size.
			 *
			 * @property zoom
			 * @type {Number}
			 */
			this.zoom = zoom || 1;

			/**
			 * Get the translated mouse position relative to the camera view.
			 * Offsetting and scaling the canvas will not change the sprites' position
			 * nor the mouseX and mouseY variables. Use this property to read the mouse
			 * position if the camera moved or zoomed.
			 *
			 * @property mouse
			 * @type {Object}
			 */
			this.mouse = {
				x: this.p.mouseX,
				y: this.p.mouseY
			};

			/**
			 * True if the camera is active.
			 * Read only property. Use the methods Camera.on() and Camera.off()
			 * to enable or disable the camera.
			 *
			 * @property active
			 * @type {Boolean}
			 */
			this.active = false;

			this.bound = {
				min: { x: 0, y: 0 },
				max: { x: 0, y: 0 }
			};

			if (x) this.x = x;
			if (y) this.y = y;
		}

		get pos() {
			return this._pos;
		}

		get position() {
			return this._pos;
		}

		get x() {
			return this._pos.x;
		}

		set x(val) {
			this._pos.x = val;
			this.bound.min.x = this.x - this.p.world.hw / this.zoom - 100;
			this.bound.max.x = this.x + this.p.world.hw / this.zoom + 100;
		}

		get y() {
			return this._pos.y;
		}

		set y(val) {
			this._pos.y = val;
			this.bound.min.y = this.y - this.p.world.hh / this.zoom - 100;
			this.bound.max.y = this.y + this.p.world.hh / this.zoom + 100;
		}

		/**
		 * Activates the camera.
		 * The canvas will be drawn according to the camera position and scale until
		 * camera.off() is called
		 *
		 * @method on
		 */
		on() {
			if (!this.active) {
				this.p.push();
				this.p.scale(this.zoom);
				this.p.translate(-this.x + this.p.world.hw / this.zoom, -this.y + this.p.world.hh / this.zoom);
				this.active = true;
			}
		}

		/**
		 * Deactivates the camera.
		 * The canvas will be drawn normally, ignoring the camera's position
		 * and scale until camera.on() is called
		 *
		 * @method off
		 */
		off() {
			if (this.active) {
				this.p.pop();
				this.active = false;
			}
		}
	} //end camera class

	/**
	 *
	 * @private
	 * @param {String} type "collide" or "overlap"
	 * @param {Sprite} s0
	 * @param {Sprite} s1
	 * @returns contact cb if one can be found between the two sprites
	 */
	function _findContactCB(type, s0, s1) {
		let cb = s0[type][s1];
		if (cb) return cb;

		let s1IsSprite = s1 instanceof Sprite;

		if (s1IsSprite) {
			for (let g1 of s1.groups) {
				cb = s0[type][g1];
				if (cb) return cb;
			}
		}

		if (s0 instanceof Sprite) {
			for (let g0 of s0.groups) {
				cb = g0[type][s1];
				if (cb) return cb;
				if (s1IsSprite) {
					for (let g1 of s1.groups) {
						cb = g0[type][g1];
						if (cb) return cb;
					}
				}
			}
		}
		return false;
	}

	/**
	 * This planck function should've be named "shouldContact", because that's what
	 * it actually decides.
	 */
	pl.Fixture.prototype.shouldCollide = function (that) {
		// should this and that produce a contact event?
		let a = this;
		let b = that;

		// sensors overlap (returning true doesn't mean they will collide it means
		// they're included in begin contact and end contact events)
		if (a.isSensor() && b.isSensor()) return true;
		// ignore contact events between a sensor and a non-sensor
		if (a.isSensor() || b.isSensor()) return false;
		// else test if the two non-sensor colliders should overlap

		a = a.m_body.sprite;
		b = b.m_body.sprite;

		// if `a` has an overlap enabled with `b` their colliders should not produce a
		// contact event, the overlap contact event is between their sensors
		let shouldOverlap = _findContactCB('_overlap', a, b);
		if (!shouldOverlap) shouldOverlap = _findContactCB('_overlap', b, a);
		if (shouldOverlap) return false;
		return true;
	};

	/**
	 * Look at the Tiles reference pages before reading these docs.
	 *
	 * https://p5play.org/learn/tiles.html
	 *
	 * @class Tiles
	 * @constructor
	 * @param {String} tiles
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} w
	 * @param {Number} h
	 */
	class Tiles {
		constructor(tiles, x, y, w, h) {
			if (typeof tiles == 'string') tiles = tiles.split('\n');

			x ??= 0;
			y ??= 0;
			w ??= 1;
			h ??= 1;

			for (let row = 0; row < tiles.length; row++) {
				for (let col = 0; col < tiles[row].length; col++) {
					let t = tiles[row][col];
					if (t == ' ' || t == '.') continue;
					let ani, g;
					for (g of pInst.world.groups) {
						ani = g.animations[t];
						if (ani) break;
					}
					if (ani) {
						new g.Sprite(ani, x + col * w, y + row * h);
						continue;
					}
					let wasFound = false;
					for (g of pInst.world.groups) {
						if (g.tile == t) {
							wasFound = true;
							break;
						}
					}
					if (wasFound) {
						new g.Sprite(x + col * w, y + row * h);
						continue;
					}
					let s;
					for (s of pInst.allSprites) {
						if (s.tile == t) {
							wasFound = true;
							break;
						}
					}
					if (wasFound) {
						s.x = x + col * w;
						s.y = y + row * h;
						continue;
					}
					console.error('Tile not found: ' + t);
				}
			}
		}
	}
	this.Tiles = Tiles;

	/**
	 * Look at the p5.play reference pages before reading these docs.
	 *
	 * https://p5play.org/learn/sprite.html
	 *
	 * @class p5.play
	 */

	/**
	 * Equivalent to `new Tiles`
	 *
	 * @method createTiles
	 * @param {String|Array} tiles String or array of strings
	 */
	p5.prototype.createTiles = function (tiles, x, y, w, h) {
		return new Tiles(tiles, x, y, w, h);
	};

	/**
	 * This function is automatically called at the end of the p5.js draw
	 * loop, unless it was already called in the draw loop.
	 *
	 * @method updateSprites
	 * @param {Number} timeStep
	 * @param {Number} velocityIterations
	 * @param {Number} positionIterations
	 */
	p5.prototype.updateSprites = function (timeStep, velocityIterations, positionIterations) {
		for (let s of this.allSprites) {
			s.previousPosition.x = s.x;
			s.previousPosition.y = s.y;
		}

		// 2nd and 3rd arguments are velocity and position iterations
		this.world.step(timeStep || 1 / 60, velocityIterations || 8, positionIterations || 3);

		for (let s of this.allSprites) {
			s.update();
		}
		this.p5play.autoUpdateSprites = false;
	};

	/**
	 * Returns the sprites at a position.
	 *
	 * @method getSpriteAt
	 * @param {Number} x
	 * @param {Number} y
	 * @returns
	 */
	p5.prototype.getSpritesAt = function (x, y, group, cameraActiveWhenDrawn) {
		cameraActiveWhenDrawn ??= true;
		const convertedPoint = new pl.Vec2(x / plScale, y / plScale);
		const aabb = new pl.AABB();
		aabb.lowerBound = new pl.Vec2(convertedPoint.x - 0.001, convertedPoint.y - 0.001);
		aabb.upperBound = new pl.Vec2(convertedPoint.x + 0.001, convertedPoint.y + 0.001);

		// Query the world for overlapping shapes.
		let fxts = [];
		pInst.world.queryAABB(aabb, (fxt) => {
			if (fxt.getShape().testPoint(fxt.getBody().getTransform(), convertedPoint)) {
				fxts.push(fxt);
			}
			return true;
		});

		group ??= pInst.allSprites;

		let sprites = [];
		if (fxts.length > 0) {
			for (let s of group) {
				if (!s.body) continue;
				if (fxts.includes(s.body.m_fixtureList)) {
					if (s._cameraActiveWhenDrawn == cameraActiveWhenDrawn) sprites.push(s);
				}
			}
		}
		return sprites;
	};

	/**
	 * Returns the sprite at the top most layer position where
	 * the mouse click occurs
	 *
	 * @method getSpriteAt
	 * @param {Number} x
	 * @param {Number} y
	 * @returns
	 */
	p5.prototype.getSpriteAt = function (x, y, group) {
		let sprites = p5.prototype.getSpritesAt(x, y, group);
		sprites.sort((a, b) => (a.layer - b.layer) * -1);
		return sprites[0];
	};

	// TODO implement planck joints
	// the following code is from https://github.com/bobcgausa/cook-js

	// const debugDraw = (canvas, scale, world) => {
	// 	const context = canvas.getContext('2d');
	// 	//context.fillStyle = '#DDD';
	// 	//context.fillRect(0, 0, canvas.width, canvas.height);

	// 	// Draw joints
	// 	for (let j = world.m_jointList; j; j = j.m_next) {
	// 		context.lineWidth = 0.25;
	// 		context.strokeStyle = '#00F';
	// 		drawJoint(context, scale, world, j);
	// 	}
	// };

	// const drawJoint = (context, scale, world, joint) => {
	// 	context.save();
	// 	context.scale(scale, scale);
	// 	context.lineWidth /= scale;

	// 	const b1 = joint.m_bodyA;
	// 	const b2 = joint.m_bodyB;
	// 	const x1 = b1.getPosition();
	// 	const x2 = b2.getPosition();
	// 	let p1;
	// 	let p2;
	// 	context.beginPath();
	// 	switch (joint.m_type) {
	// 		case 'distance-joint':
	// 		case 'rope-joint':
	// 			context.moveTo(x1.x, x1.y);
	// 			context.lineTo(x2.x, x2.y);
	// 			break;
	// 		case 'wheel-joint':
	// 		case 'revolute-joint':
	// 			p1 = joint.m_localAnchorA;
	// 			p2 = joint.m_localAnchorB;
	// 			const a = b2.getAngle();
	// 			const v = new pl.Vec2(cos(a), sin(a));
	// 			context.moveTo(x2.x, x2.y);
	// 			context.lineTo(x2.x + v.x, x2.y + v.y);
	// 			break;
	// 		case 'mouse-joint':
	// 		case 'weld-joint':
	// 			p1 = joint.getAnchorA();
	// 			p2 = joint.getAnchorB();
	// 			context.moveTo(p1.x, p1.y);
	// 			context.lineTo(p2.x, p2.y);
	// 			break;
	// 		case 'pulley-joint':
	// 			p1 = joint.m_groundAnchorA;
	// 			p2 = joint.m_groundAnchorB;
	// 			context.moveTo(p1.x, p1.y);
	// 			context.lineTo(x1.x, x1.y);
	// 			context.moveTo(p2.x, p2.y);
	// 			context.lineTo(x2.x, x2.y);
	// 			context.moveTo(p1.x, p1.y);
	// 			context.lineTo(p2.x, p2.y);
	// 			break;
	// 		default:
	// 			break;
	// 	}
	// 	context.closePath();
	// 	context.stroke();
	// 	context.restore();
	// };

	// function getAABB(body) {
	// 	const aabb = new pl.AABB();
	// 	const t = new pl.Transform();
	// 	t.setIdentity();
	// 	const shapeAABB = new pl.AABB();
	// 	aabb.lowerBound = new pl.Vec2(1000000, 1000000);
	// 	aabb.upperBound = new pl.Vec2(-1000000, -1000000);
	// 	let fixture = body.body.getFixtureList();
	// 	while (fixture) {
	// 		const shape = fixture.getShape();
	// 		const childCount = shape.getChildCount(); //only for chains
	// 		for (let child = 0; child < childCount; ++child) {
	// 			shape.computeAABB(shapeAABB, body.body.m_xf, child);
	// 			unionTo(aabb, shapeAABB);
	// 		}
	// 		fixture = fixture.getNext();
	// 	}
	// 	aabb.lowerBound.mul(plScale); //upper left, offset from center
	// 	aabb.upperBound.mul(plScale); //lower right
	// 	return aabb;
	// }

	// function unionTo(a, b) {
	// 	a.lowerBound.x = min(a.lowerBound.x, b.lowerBound.x);
	// 	a.lowerBound.y = min(a.lowerBound.y, b.lowerBound.y);
	// 	a.upperBound.x = max(a.upperBound.x, b.upperBound.x);
	// 	a.upperBound.y = max(a.upperBound.y, b.upperBound.y);
	// }

	// The ray cast collects multiple hits along the ray in ALL mode.
	// The fixtures are not necessary reported in order.
	// We might not capture the closest fixture in ANY.
	// const rayCast = (() => {
	// 	let def = {
	// 		ANY: 0,
	// 		NEAREST: 2,
	// 		ALL: 1
	// 	};

	// 	const reset = (mode, ignore) => {
	// 		def.points = [];
	// 		def.normals = [];
	// 		def.fixtures = [];
	// 		def.fractions = [];
	// 		def.ignore = ignore || [];
	// 		def.mode = mode == undefined ? def.NEAREST : mode;
	// 	};

	// 	def.rayCast = (point1, point2, mode, ignore) => {
	// 		reset(mode, ignore);
	// 		world.rayCast(scaleTo(point1), scaleTo(point2), def.callback);
	// 	};

	// 	def.callback = (fixture, point, normal, fraction) => {
	// 		if (def.ignore.length > 0) for (let i = 0; i < def.ignore.length; i++) if (def.ignore[i] === fixture) return -1;
	// 		if (def.mode == def.NEAREST && def.points.length == 1) {
	// 			def.fixtures[0] = fixture;
	// 			def.points[0] = scaleFrom(point);
	// 			def.normals[0] = normal;
	// 			def.fractions[0] = fraction;
	// 		} else {
	// 			def.fixtures.push(fixture);
	// 			def.points.push(scaleFrom(point));
	// 			def.normals.push(normal);
	// 			def.fractions.push(fraction);
	// 		}
	// 		// -1 to ignore a fixture and continue
	// 		//  0 to terminate on first hit, or for searching
	// 		//  fraction seems to return nearest fixture as last entry in array
	// 		// +1 returns multiple but mix of low high or high low
	// 		return def.mode == def.NEAREST ? fraction : def.mode;
	// 	};

	// 	return def;
	// })();

	// const queryAABB = (() => {
	// 	let def = {};
	// 	function reset(search) {
	// 		def.fixtures = [];
	// 		def.search = search || [];
	// 	}

	// 	def.query = ({ lowerBound, upperBound }, search) => {
	// 		reset(search);
	// 		aabbc = new pl.AABB(lowerBound.mul(1 / plScale), upperBound.mul(1 / plScale));
	// 		world.queryAABB(aabbc, def.callback);
	// 	};

	// 	def.callback = (fixture) => {
	// 		def.fixtures.push(fixture);
	// 		return true;
	// 	};

	// 	return def;
	// })();

	/**
	 * Gets a color from a color palette
	 *
	 * @method colorPal
	 * @param {String} c A single character, a key found in the color palette object.
	 * @param {Number|Object} palette Can be a palette object or number index
	 * in the system's palettes array.
	 * @returns a hex color string for use by p5.js functions
	 */
	p5.prototype.colorPal = (c, palette) => {
		if (c instanceof p5.Color) return c;
		if (typeof palette == 'number') {
			palette = pInst.world.palettes[palette];
		}
		palette ??= pInst.world.palettes[0];
		let clr;
		if (palette) clr = palette[c];
		// if transparent
		if (clr === '' || c === '.' || c === ' ') {
			return pInst.color(0, 0, 0, 0);
		}
		return pInst.color(clr || c);
	};

	/**
	 * Create pixel art images from a string. Each character in the
	 * input string represents a color value defined in the palette
	 * object.
	 *
	 * @method spriteArt
	 * @param {String} txt Each character represents a pixel color value
	 * @param {Number} scale The scale of the image
	 * @param {Number|Object} palette Color palette
	 * @returns A p5.js Image
	 *
	 * @example
	 * let str = `
	 * ...yyyy
	 * .yybyybyy
	 * yyyyyyyyyy
	 * yybyyyybyy
	 * .yybbbbyy
	 * ...yyyy`;
	 *
	 * let img = spriteArt(str);
	 */
	p5.prototype.spriteArt = (txt, scale, palette) => {
		scale ??= 1;
		if (typeof palette == 'number') {
			palette = pInst.world.palettes[palette];
		}
		palette ??= pInst.world.palettes[0];
		let lines = txt; // accepts 2D arrays of characters
		if (typeof txt == 'string') {
			txt = txt.trim();
			txt = txt.replace(/\r*\n\t+/g, '\n'); // trim leading tabs
			txt = txt.replace(/\s+$/g, ''); // trim trailing whitespace
			lines = txt.split('\n');
		}
		let w = 0;
		for (let line of lines) {
			if (line.length > w) w = line.length;
		}
		let h = lines.length;
		let img = pInst.createImage(w * scale, h * scale);
		img.loadPixels();

		for (let i = 0; i < lines.length; i++) {
			for (let j = 0; j < lines[i].length; j++) {
				for (let sX = 0; sX < scale; sX++) {
					for (let sY = 0; sY < scale; sY++) {
						let c = p5.prototype.colorPal(lines[i][j], palette);
						img.set(j * scale + sX, i * scale + sY, c);
					}
				}
			}
		}
		img.updatePixels();
		img.w = img.width;
		img.h = img.height;
		pInst.p5play.images.onLoad(img);
		return img; // return the p5 graphics object
	};

	/**
	 * Deprecated, use sprite.draw() instead.
	 *
	 * allSprites.draw() is run automatically at the end of the p5.js
	 * draw loop, unless a sprite or group is drawn separately within the
	 * draw loop.
	 *
	 * @deprecated
	 * @method drawSprites
	 */
	p5.prototype.drawSprite = function (sprite) {
		if (pInst.frameCount == 1) console.warn('drawSprite() is deprecated, use sprite.draw() instead.');
		sprite.draw();
	};

	/**
	 * Deprecated, use group.draw() instead.
	 *
	 * allSprites.draw() is run automatically at the end of the p5.js
	 * draw loop, unless a sprite or group is drawn separately within the
	 * draw loop.
	 *
	 * @deprecated
	 * @method drawSprites
	 */
	p5.prototype.drawSprites = function (group) {
		if (pInst.frameCount == 1) console.warn('drawSprites() is deprecated, use group.draw() instead.');
		group ??= pInst.allSprites;
		group.draw();
	};

	/**
	 * Creates a new sprite. Equivalent to `new Sprite()`
	 *
	 * @returns {Sprite}
	 */
	p5.prototype.createSprite = function () {
		return new Sprite(...arguments);
	};

	/**
	 * Creates a new group of sprites. Equivalent to `new Group()`
	 *
	 * @returns {Group}
	 */
	p5.prototype.createGroup = function () {
		return new Group(...arguments);
	};

	/**
	 * Loads an animation.
	 * Use this in the preload p5.js function.
	 *
	 * @method loadAni
	 * @returns {SpriteAnimation}
	 */
	p5.prototype.loadAni = p5.prototype.loadAnimation = function () {
		let args = [...arguments];
		let parent, name;

		if (args[0] instanceof Sprite || args[0] instanceof Group) {
			parent = args[0];
			args = args.slice(1);
		}

		parent ??= this.allSprites;
		let sa = parent.addAnimation(...args);
		return sa;
	};

	/**
	 * Displays an animation. Similar to the p5.js image function.
	 *
	 * @method animation
	 * @param {SpriteAnimation} ani Animation to be displayed
	 * @param {Number} x X coordinate
	 * @param {Number} y Y coordinate
	 *
	 */
	p5.prototype.animation = function (ani, x, y, r, sX, sY) {
		if (ani.visible) ani.update();
		ani.draw(x, y, r, sX, sY);
	};

	/**
	 * Delay code execution in an async function for the specified time.
	 *
	 * @method delay
	 * @param {Number} millisecond
	 * @returns {Promise} A Promise that fulfills after the specified time.
	 *
	 * @example
	 * async function startGame() {
	 *   await delay(3000);
	 * }
	 */
	p5.prototype.delay = (millisecond) => {
		// if no input arg given, delay waits for the next possible animation frame
		if (!millisecond) {
			return new Promise(requestAnimationFrame);
		} else {
			// else it wraps setTimeout in a Promise
			return new Promise((resolve) => {
				setTimeout(resolve, millisecond);
			});
		}
	};

	/**
	 * Sleep for the specified time. Equivalent to the delay function.
	 *
	 * @method sleep
	 * @param {Number} millisecond
	 * @returns {Promise} A Promise that fulfills after the specified time.
	 *
	 * @example
	 * async function startGame() {
	 *   await sleep(3000);
	 * }
	 */
	p5.prototype.sleep = (millisecond) => {
		return this.delay(millisecond);
	};

	/**
	 * Awaitable function for playing sounds.
	 *
	 * @method play
	 * @param {p5.Sound} sound
	 * @returns {Promise}
	 */
	p5.prototype.play = (sound) => {
		if (!sound.play) throw new Error('Tried to play a sound but the sound is not a sound object: ' + sound);
		// TODO reject if sound not found
		return new Promise((resolve, reject) => {
			sound.play();
			sound.onended(() => resolve());
		});
	};

	let userDisabledP5Errors = p5.disableFriendlyErrors;
	p5.disableFriendlyErrors = true;

	const _createCanvas = this.createCanvas;

	/**
	 * Equivalent to p5.js createCanvas function and `new Canvas()`
	 *
	 * In p5.play a canvas can be created with an aspect ratio in the
	 * format `width:height`. For example `new Canvas('16:9')` will create
	 * the largest possible canvas with a 16:9 aspect ratio.
	 *
	 * This function also disables the default keydown responses for
	 * the arrow keys, slash, and spacebar. This is to prevent the
	 * browser from scrolling the page when the user is playing a game using
	 * common keyboard commands.
	 *
	 * @method createCanvas
	 * @param {Number} width|ratio
	 * @param {Number} height
	 */
	this.createCanvas = function () {
		let args = [...arguments];
		let isFullScreen = false;
		let pixelated = false;
		let w, h, ratio;
		if (typeof args[0] == 'string') {
			ratio = args[0].split(':');
		}
		if (!args.length) {
			args[0] = window.innerWidth;
			args[1] = window.innerHeight;
			isFullScreen = true;
		} else if (typeof args[0] == 'number' && typeof args[1] != 'number') {
			args[2] = args[1];
			args[1] = args[0];
		}

		if (args[2] == 'pixelated') {
			pixelated = true;
			isFullScreen = true;
			ratio = [args[0], args[1]];
		}
		if (ratio) {
			let rW = Number(ratio[0]);
			let rH = Number(ratio[1]);

			w = window.innerWidth;
			h = (window.innerWidth * rH) / rW;
			if (h > window.innerHeight) {
				w = (window.innerHeight * rW) / rH;
				h = window.innerHeight;
			}
			w = Math.round(w);
			h = Math.round(h);

			if (!pixelated) {
				args[0] = w;
				args[1] = h;
			}
		}
		if (args.length < 3) args[2] = 'p2d';
		let can = _createCanvas.call(pInst, ...args);
		this.canvas.tabIndex = 0;
		// log(this.canvas);
		this.canvas.addEventListener('keydown', function (e) {
			if (
				e.key == ' ' ||
				e.key == '/' ||
				e.key == 'ArrowUp' ||
				e.key == 'ArrowDown' ||
				e.key == 'ArrowLeft' ||
				e.key == 'ArrowRight'
			) {
				e.preventDefault();
			}
		});
		this.canvas.addEventListener('mouseover', () => {
			this.mouse.isOnCanvas = true;
			this.mouse.active = true;
		});
		this.canvas.addEventListener('mouseleave', () => {
			this.mouse.isOnCanvas = false;
		});
		this.canvas.addEventListener('touchstart', (e) => {
			e.preventDefault();
		});
		this.world.resize();
		if (!userDisabledP5Errors) p5.disableFriendlyErrors = false;

		/* prevent callout to copy image, etc when tap to hold */
		/* prevent webkit from resizing text to fit */
		/* prevent copy paste, to allow, change 'none' to 'text' */
		let style = `
canvas { 
	outline: none;
	-webkit-touch-callout: none;
	-webkit-text-size-adjust: none;
	-webkit-user-select: none;
	overscroll-behavior: none;
}
main{
	overscroll-behavior: none;
}`;
		if (isFullScreen) {
			style = 'html,\nbody,\n' + style;
			style += `
html, body {
	margin: 0;
	padding: 0;
	overflow: hidden;
}
main {
	margin: auto;
	display: flex;
	align-content: center;
	justify-content: center;
}`;
		}
		if (pixelated) {
			style += `
canvas {
	image-rendering: pixelated;
	width: ${w}px!important;
	height: ${h}px!important;
}`;
		}
		let styleElem = document.createElement('style');
		styleElem.innerHTML = style;
		document.head.appendChild(styleElem);

		let idx = navigator.userAgent.indexOf('iPhone OS');
		if (idx > -1) {
			let version = navigator.userAgent.substring(idx + 10, idx + 12);
			this.p5play.version = version;
			if (version < 16) {
				pInst.pixelDensity(1);
			}
			this.p5play.os.platform = 'iOS';
			this.p5play.os.version = version;
		} else if (navigator.userAgentData !== undefined) {
			this.p5play.os.platform = navigator.userAgentData.platform;
		}

		if (pixelated) {
			pInst.pixelDensity(1);
			pInst.noSmooth();
		}

		return can;
	};

	function Canvas() {
		return pInst.createCanvas(...arguments);
	}

	const _background = this.background;

	/**
	 * Just like the p5.js background function except it also accepts
	 * a color pallette code.
	 *
	 * @method background
	 */
	this.background = function () {
		let args = arguments;
		let c;
		if (args.length == 1 && (typeof args[0] == 'string' || args[0] instanceof p5.Color)) {
			c = p5.prototype.colorPal(args[0]);
		}
		if (c !== undefined) _background.call(this, c);
		else _background.call(this, ...args);
	};

	const _fill = this.fill;

	/**
	 * Just like the p5.js fill function except it also accepts
	 * a color pallette code.
	 *
	 * @method fill
	 */
	this.fill = function () {
		let args = arguments;
		let c;
		if (args.length == 1) {
			c = p5.prototype.colorPal(args[0]);
		}
		if (c !== undefined) _fill.call(this, c);
		else _fill.call(this, ...args);
	};

	const _stroke = this.stroke;

	/**
	 * Just like the p5.js stroke function except it also accepts
	 * a color pallette code.
	 *
	 * @method stroke
	 */
	this.stroke = function () {
		let args = arguments;
		let c;
		if (args.length == 1) {
			c = p5.prototype.colorPal(args[0]);
		}
		if (c !== undefined) _stroke.call(this, c);
		else _stroke.call(this, ...args);
	};

	// images is a cache of loaded/loading images, to prevent making
	// the same loadImage fetch requests multiple times (inefficient)
	this.p5play.images = {
		onLoad: (img) => {} // called anytime an image is fully loaded
	};

	const _loadImage = this.loadImage;

	/**
	 * Just like the p5.js loadImage function except it also caches images
	 * so that they are only loaded once. Multiple calls to loadImage with
	 * the same path will return the same image object. It also adds the
	 * image's url as a property of the image object.
	 *
	 * @method loadImage
	 * @param {string} url
	 * @param {number} [width]
	 * @param {number} [height]
	 * @param {function} [callback]
	 */
	this.loadImg = this.loadImage = function () {
		let args = arguments;
		let url = args[0];
		let img = pInst.p5play.images[url];
		let cb;
		if (typeof args[args.length - 1] == 'function') {
			cb = args[args.length - 1];
		}
		if (img) {
			// if not finished loading, add callback to the list
			if (img.width == 1 && img.height == 1) {
				if (cb) {
					img.cbs.push(cb);
					img.calls++;
				} else pInst._decrementPreload();
			} else {
				if (cb) cb(); // if already loaded, run the callback immediately
				pInst._decrementPreload();
			}
			return img;
		}
		img = _loadImage.call(pInst, url, (_img) => {
			_img.w = _img.width;
			_img.h = _img.height;
			for (let cb of _img.cbs) {
				cb();
			}
			for (let i = 1; i < _img.calls; i++) {
				pInst._decrementPreload();
			}
			// delete _img.calls;
			// delete _img.cbs;
			_img.cbs = [];
			pInst.p5play.images.onLoad(img);
		});
		img.cbs = [];
		img.calls = 1;
		if (cb) img.cbs.push(cb);
		img.url = url;
		pInst.p5play.images[url] = img;
		return img;
	};

	let errorMessages = {
		generic: [
			'Ah! I found an error',
			'Oh no! Something went wrong',
			'Oof! Something went wrong',
			'Houston, we have a problem',
			'Whoops, having trouble here'
		],
		Sprite: {
			constructor: {
				base: "Sorry I'm unable to make a new Sprite",
				0: "What is $0 for? If you're trying to specify the x position of the sprite, please specify the y position as well.",
				1: "If you're trying to specify points for a chain Sprite, please use an array of position arrays:\n$0"
			},
			hw: "I can't change the halfWidth of a Sprite directly, change the sprite's width instead.",
			hh: "I can't change the halfHeight of a Sprite directly, change the sprite's height instead.",
			rotate: 'The angle of rotation must be a number.',
			changeAnimation: `I can't find any animation named "$0".`,
			collisions: {
				0: "I can't make that sprite collide with $0. Sprites can only collide with another sprite or a group.",
				1: 'The collision callback has to be a function.'
			},
			overlaps: {
				0: "I can't make that sprite overlap with $0. Sprites can only overlap with another sprite or a group.",
				1: 'The overlap callback has to be a function.'
			}
		},
		SpriteAnimation: {
			constructor: {
				base: "Hey so, I tried to make a new SpriteAnimation but couldn't",
				0: `I don't know how to display this type of image: "$0". I can only use ".png" image files.`,
				1: 'The name of the animation must be the first input parameter.'
			}
		},
		Group: {
			constructor: {
				base: "Hmm awkward! Well it seems I can't make that new Group you wanted"
			}
		}
	};

	/**
	 *
	 * @param {String} func is the name of the function the error was thrown in
	 * @param {Number} errorNum is the error's code number
	 * @param {Array} e is an array with references to the cause of the error
	 */
	class FriendlyError extends Error {
		constructor(func, errorNum, e) {
			super();

			if (typeof func != 'string') {
				e = errorNum;
				errorNum = func;
				func = this.stack.match(/\n\s*at ([^\(]*)/)[1];
				func = func.slice(0, -1);
			}
			if (typeof errorNum != 'number') {
				e = errorNum;
				errorNum = undefined;
			}
			if (func.slice(0, 3) == 'new') func = func.slice(4);
			func = func.split('.');
			let className = func[0];
			func = func[1] || 'constructor';

			let ln = this.stack.match(/\/([^p\/][^5][^\/:]*:[^\/:]+):/);
			if (ln) {
				ln = ln[1].split(':');
				ln = ' in ' + ln[0] + ' at line ' + ln[1] + '. ';
			} else ln = '.';

			e = e || [];

			let m = errorMessages[className][func];
			let msg;
			if (m.base) msg = m.base + ln;
			else msg = errorMessages.generic[Math.floor(Math.random() * errorMessages.generic.length)] + ln;
			if (errorNum !== undefined) m = m[errorNum];
			m = m.replace(/\$([0-9]+)/g, (m, n) => {
				return e[n];
			});
			msg += m;

			p5._friendlyError(msg, func);
		}
	}

	this.Sprite = Sprite;
	this.SpriteAnimation = SpriteAnimation;
	this.Group = Group;
	this.World = World;
	this.Canvas = Canvas;

	/**
	 * A group of all the sprites.
	 *
	 * @property allSprites
	 */
	this.allSprites = new Group();
	this.allSprites.autoCull = true;
	this.allSprites.tileSize = 1;

	/**
	 * The planck physics world. Use this to change gravity and offset the
	 * sprite's coordinate system.
	 *
	 * @property world
	 */
	this.world = new World();

	/**
	 * Equal to the p5.js frameCount, the amount of times the draw() function has
	 * been called.
	 *
	 * @property frame
	 */
	this.frame = 0;

	/**
	 * The default camera. Use this to pan and zoom the camera.
	 *
	 * @property camera
	 */
	this.camera = new Camera();

	/**
	 * Look at the Input reference pages before reading these docs.
	 *
	 * https://p5play.org/learn/input_devices.html
	 *
	 * Root class for storing the state of inputs (mouse, keyboard,
	 * gamepads).
	 *
	 * -3 means input was released after being held, pressed for 12 frames
	 * -2 means input was pressed and released on the same frame
	 * -1 means input was released
	 * 0 means input is not pressed
	 * 1 means input was pressed
	 * >1 means input is still being pressed
	 * 12 means input was held
	 * >12 means input is being held
	 *
	 * @class InputDevice
	 */
	class InputDevice {
		constructor() {
			/**
			 * The amount of frames an input must be pressed to be considered held.
			 * Default is 12.
			 *
			 * @property holdThreshold
			 * @type {number}
			 */
			this.holdThreshold = 12;
		}

		init(inputs) {
			for (let inp of inputs) {
				this[inp] = 0;
			}
		}

		/**
		 * Attempt to auto-correct the user's input. Inheriting classes
		 * override this method.
		 */
		ac(inp) {
			return inp;
		}

		presses(inp) {
			inp ??= this.default;
			if (this[inp] === undefined) inp = this.ac(inp);
			return this[inp] == 1 || this[inp] == -2;
		}

		pressing(inp) {
			inp ??= this.default;
			if (this[inp] === undefined) inp = this.ac(inp);
			return this[inp] > 0 || this[inp] == -2;
		}

		pressed(inp) {
			return this.released(inp);
		}

		holds(inp) {
			inp ??= this.default;
			if (this[inp] === undefined) inp = this.ac(inp);
			return this[inp] == this.holdThreshold;
		}

		holding(inp) {
			inp ??= this.default;
			if (this[inp] === undefined) inp = this.ac(inp);
			return this[inp] >= this.holdThreshold;
		}

		held(inp) {
			inp ??= this.default;
			if (this[inp] === undefined) inp = this.ac(inp);
			return this[inp] == -3;
		}

		released(inp) {
			inp ??= this.default;
			if (this[inp] === undefined) inp = this.ac(inp);
			return this[inp] <= -1;
		}

		releases(inp) {
			return this.released(inp);
		}
	}

	class Mouse extends InputDevice {
		constructor() {
			super();
			let _this = this;

			// this.x and this.y store the actual position values of the mouse
			this._position = {
				get x() {
					return _this.x;
				},
				set x(val) {
					_this.x = val;
				},
				get y() {
					return _this.y;
				},
				set y(val) {
					_this.y = val;
				}
			};

			let inputs = ['x', 'y', 'left', 'center', 'right'];
			this.init(inputs);
			this.default = 'left';
			this.draggable = false;
			this.isOnCanvas = false;
			this.active = false;
		}

		get pos() {
			return this._position;
		}

		get position() {
			return this._position;
		}

		ac(inp) {
			if (inp.slice(0, 4)) inp = 'left';
			else if (inp.slice(0, 5) == 'right') inp = 'right';
			else if (inp.slice(0, 6) == 'middle') inp = 'center';
			else inp = inp.toLowerCase();
			return inp;
		}

		dragging(inp) {
			inp ??= this.default;
			this.draggable = true;
			return this[inp] >= this.holdThreshold;
		}
	}

	/**
	 * Stores the state of the left, center, or right mouse buttons.
	 *
	 * @property mouse
	 */
	this.mouse = new Mouse();

	class SpriteMouse extends Mouse {
		constructor() {
			super();
			this.hover = 0;
		}

		hovers() {
			return this.hover == 1;
		}

		hovering() {
			return this.hover > 0;
		}

		hovered() {
			return this.hover == -1;
		}
	}

	const _onmousedown = this._onmousedown;

	const __onmousedown = function (btn) {
		this.mouse[btn]++;
		this.mouse.active = true;

		let ms;
		if (this.p5play.mouseSprites.length) {
			ms = this.p5play.mouseSprites[0];
			ms.mouse[btn] = 1;
			// old mouse sprite didn't have the mouse released on it
			// so it just gets set to 0 (not pressed)
			if (this.p5play.mouseSprite) {
				this.p5play.mouseSprite.mouse[btn] = 0;
				if (btn == 'left') {
					this.p5play.mouseSprite.mouse.draggable = false;
				}
			}
			this.p5play.mouseSprite = ms;
		}
	};

	this._onmousedown = function (e) {
		let btn = 'left';
		if (e.button === 1) btn = 'center';
		else if (e.button === 2) btn = 'right';

		__onmousedown.call(this, btn);

		_onmousedown.call(this, e);
	};

	const _ontouchstart = this._ontouchstart;

	this._ontouchstart = function (e) {
		__onmousedown.call(this, 'left');
		_ontouchstart.call(this, e);
	};

	const _onmouseup = this._onmouseup;

	const __onmouseup = function (btn) {
		if (this.mouse[btn] >= this.mouse.holdThreshold) {
			this.mouse[btn] = -3;
		} else if (this.mouse[btn] > 1) this.mouse[btn] = -1;
		else this.mouse[btn] = -2;

		if (this.p5play.mouseSprite) {
			if (this.p5play.mouseSprite.mouse.hover > 1) {
				if (this.p5play.mouseSprite.mouse[btn] >= this.mouse.holdThreshold) {
					this.p5play.mouseSprite.mouse[btn] = -3;
				} else if (this.p5play.mouseSprite.mouse[btn] > 1) {
					this.p5play.mouseSprite.mouse[btn] = -1;
				} else {
					this.p5play.mouseSprite.mouse[btn] = -2;
				}
			} else {
				this.p5play.mouseSprite.mouse[btn] = 0;
				this.p5play.mouseSprite.mouse.draggable = false;
			}
		}
	};

	this._onmouseup = function (e) {
		let btn = 'left';
		if (e.button === 1) btn = 'center';
		else if (e.button === 2) btn = 'right';

		__onmouseup.call(this, btn);
		_onmouseup.call(this, e);
	};

	const _ontouchend = this._ontouchend;

	this._ontouchend = function (e) {
		__onmouseup.call(this, 'left');
		_ontouchend.call(this, e);
	};

	class KeyBoard extends InputDevice {
		constructor() {
			super();
			this.default = ' ';
		}

		ac(inp) {
			if (inp.length == 1) return inp.toLowerCase();
			if (!isNaN(inp)) {
				if (inp == 38) return 'ArrowUp';
				if (inp == 40) return 'ArrowDown';
				if (inp == 37) return 'ArrowLeft';
				if (inp == 39) return 'ArrowRight';
				throw new Error('Use key names with the keyboard input functions, not key codes!');
			}
			return inp[0].toUpperCase() + inp.slice(1).toLowerCase();
		}
	}

	/**
	 * 
	 * 
	 * @property kb (keyboard)
	 * @example
	// presses
	if (kb.presses('x')) {
		player.jump();
	}
 
	// holds
	if (kb.holds('e')) {
		player.chargeAttack();
	}

	// released
	if (kb.released('q')) {
		player.slide();
	}
	 */
	this.kb = new KeyBoard();
	this.keyboard = this.kb;

	if (navigator.keyboard) {
		const keyboard = navigator.keyboard;
		if (window == window.top) {
			keyboard.getLayoutMap().then((keyboardLayoutMap) => {
				const key = keyboardLayoutMap.get('KeyW');
				if (key != 'w') this.p5play.standardizeKeyboard = true;
			});
		} else {
			this.p5play.standardizeKeyboard = true;
		}
	} else {
		// Firefox doesn't have navigator.keyboard
		// so just make it use key codes
		this.p5play.standardizeKeyboard = true;
	}

	/**
	 * Deprecated, use kb.pressing(key) instead.
	 *
	 * @deprecated
	 * @method keyIsDown
	 * @param {String} key
	 */
	p5.prototype.keyIsDown = function (keyCode) {
		throw new Error(
			`The p5.js keyIsDown function is outdated and can't be used in p5.play. Trust me, you'll see that the p5.play kb.pressing function is much better. It uses key name strings that are easier to write and easier to read! https://p5play.org/learn/input_devices.html The p5.js keyIsDown function relies on key codes and custom constants for key codes, which are not only hard to remember but were also deprecated in the JavaScript language standards over six years ago and shouldn't be used in new projects. More info: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode`
		);
	};

	function getKeyFromCode(e) {
		let code = e.code;
		if (code.length == 4 && code.slice(0, 3) == 'Key') {
			return code[3].toLowerCase();
		}
		return e.key;
	}

	let simpleKeyControls = {
		w: 'up',
		s: 'down',
		a: 'left',
		d: 'right',
		ArrowUp: 'up',
		ArrowDown: 'down',
		ArrowLeft: 'left',
		ArrowRight: 'right',
		i: 'up2',
		k: 'down2',
		j: 'left2',
		l: 'right2'
	};

	const _onkeydown = this._onkeydown;

	this._onkeydown = function (e) {
		let key = e.key;
		if (this.p5play.standardizeKeyboard) {
			key = getKeyFromCode(e);
		}
		let keys = [key];
		let k = simpleKeyControls[key];
		if (k) keys.push(k);
		for (let k of keys) {
			if (!this.kb[k] || this.kb[k] < 0) {
				this.kb[k] = 1;
			}
		}
		_onkeydown.call(this, e);
	};

	const _onkeyup = this._onkeyup;

	this._onkeyup = function (e) {
		let key = e.key;
		if (this.p5play.standardizeKeyboard) {
			key = getKeyFromCode(e);
		}
		let keys = [key];
		let k = simpleKeyControls[key];
		if (k) keys.push(k);
		for (let k of keys) {
			if (this.kb[k] >= this.kb.holdThreshold) {
				this.kb[k] = -3;
			} else if (this.kb[k] > 1) this.kb[k] = -1;
			else this.kb[k] = -2;
		}

		_onkeyup.call(this, e);
	};

	class Contro extends InputDevice {
		constructor() {
			super();
			let inputs = [
				'a',
				'b',
				'x',
				'y',
				'l',
				'r',
				'lt',
				'rt',
				'select',
				'start',
				'up',
				'down',
				'left',
				'right',
				'leftTrigger',
				'rightTrigger'
			];
			this.init(inputs);

			this.leftStick = {
				x: 0,
				y: 0,
				btn: 0
			};

			this.rightStick = {
				x: 0,
				y: 0,
				btn: 0
			};

			this._btns = {
				a: 0,
				b: 1,
				x: 2,
				y: 3,
				l: 4,
				r: 5,
				lt: 6,
				rt: 7,
				select: 8,
				start: 9,
				// leftStickBtn: 10,
				// rightStickBtn: 11,
				up: 12,
				down: 13,
				left: 14,
				right: 15
			};
			this._axes = {
				leftStick: {
					x: 0,
					y: 1
				},
				rightStick: {
					x: 2,
					y: 3
				},
				leftTrigger: 4,
				rightTrigger: 5
			};
		}

		ac(inp) {
			return inp.toLowerCase();
		}

		_update() {
			this.gamepad = navigator.getGamepads()[this.gamepad.index];
			// TODO
			// if (this.index != this.gamepad.index) {
			// 	return; // contro disconnected
			// }
			let pad = this.gamepad;

			// buttons
			for (let name in this._btns) {
				let idx = this._btns[name];
				if (pad.buttons[idx].pressed) this[name]++;
				else this[name] = 0;
			}

			// sticks
			this.leftStick.x = pad.axes[this._axes.leftStick.x];
			this.leftStick.y = pad.axes[this._axes.leftStick.y];

			this.rightStick.x = pad.axes[this._axes.rightStick.x];
			this.rightStick.y = pad.axes[this._axes.rightStick.y];

			// TODO
			// triggers
			this.leftTrigger = pad.axes[this._axes.leftTrigger];
			this.rightTrigger = pad.axes[this._axes.rightTrigger];

			return true; // update completed
		}
	}

	class Contros extends Array {
		constructor() {
			super();
			let _this = this;
			window.addEventListener('gamepadconnected', (e) => {
				_this._addContro(e.gamepad);
			});

			this.default = 'a';

			let methods = ['presses', 'pressing', 'pressed', 'holds', 'holding', 'held', 'released'];
			for (let m of methods) {
				this[m] = (inp) => {
					if (this[0]) return this[0][m](inp);
				};
			}

			let props = ['leftStick', 'rightStick'];
			for (let prop of props) {
				this[prop] = {};
				for (let axis of ['x', 'y']) {
					Object.defineProperty(this[prop], axis, {
						get() {
							if (_this[0]) return _this[0][prop][axis];
							return 0;
						}
					});
				}
			}
		}

		_addContro(gp) {
			let contro = new Contro();
			contro.gamepad = gp;
			contro.id = gp.id;
			this.push(contro);
		}

		_update() {
			for (let i = 0; i < this.length; i++) {
				let connected = this[i]._update();
				if (!connected) {
					this.splice(i, 1);
					i--;
				}
			}
		}
	}

	this.contro = new Contros();
});

// called before each p5.js draw function call
p5.prototype.registerMethod('pre', function () {
	if (this.frameCount == 1) {
		this.camera.x = this.world.hw;
		this.camera.y = this.world.hh;
		this.camera.init = true;

		// this stops the right click menu from appearing
		this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
	}

	this.mouse.x = (this.mouseX - this.world.hw) / this.camera.zoom + this.camera.x;
	this.mouse.y = (this.mouseY - this.world.hh) / this.camera.zoom + this.camera.y;

	this.camera.mouse.x = this.mouseX;
	this.camera.mouse.y = this.mouseY;

	this.contro._update();
});

// called after each p5.js draw function call
p5.prototype.registerMethod('post', function p5playPostDraw() {
	this.frame = this.frameCount;

	if (this.p5play.autoDrawSprites) {
		this.camera.on();
		this.allSprites.draw();
		this.camera.off();
		this.p5play.autoDrawSprites = true;
	}

	if (this.p5play.autoUpdateSprites) {
		this.updateSprites();
		this.p5play.autoUpdateSprites = true;
	}

	if (this.allSprites.autoCull) {
		this.allSprites.cull(10000);
	}

	for (let btn of ['left', 'center', 'right']) {
		if (this.mouse[btn] < 0) this.mouse[btn] = 0;
		else if (this.mouse[btn] > 0) this.mouse[btn]++;

		if (this.p5play.mouseSprite) {
			if (this.p5play.mouseSprite.mouse[btn] < 0) {
				this.p5play.mouseSprite.mouse[btn] = 0;
			}
		}
	}

	for (let k in this.kb) {
		if (k == 'holdThreshold') continue;
		if (this.kb[k] < 0) this.kb[k] = 0;
		else if (this.kb[k] > 0) this.kb[k]++;
	}

	if (this.p5play.mouseTracking) {
		if (this.p5play.mouseSprite) {
			let val = 0;
			for (let btn of ['left', 'center', 'right']) {
				val += this.p5play.mouseSprite.mouse[btn];
			}
			if (val == 0) this.p5play.mouseSprite = null;
		}

		let sprites = p5.prototype.getSpritesAt(this.mouse.x, this.mouse.y);
		sprites.sort((a, b) => (a.layer - b.layer) * -1);

		let uiSprites = p5.prototype.getSpritesAt(this.camera.mouse.x, this.camera.mouse.y, this.allSprites, false);
		uiSprites.sort((a, b) => (a.layer - b.layer) * -1);

		sprites = sprites.concat(uiSprites);

		let ms;
		if (this.mouse.pressing('left') || this.mouse.pressing('center') || this.mouse.pressing('right')) {
			// mouse sprite is not draggable
			if (!this.p5play.mouseSprite?.mouse.draggable) {
				// if sprite is being dragged,
				// it should be dragged behind sprites on higher layers
				for (let s of sprites) {
					if (s == this.p5play.mouseSprite) {
						ms = s;
						break;
					}
				}
			} else {
				ms = this.p5play.mouseSprite;
			}
			// if mouse is pressing the sprite
			if (ms) {
				ms.mouse.left = this.mouse.left;
				ms.mouse.center = this.mouse.center;
				ms.mouse.right = this.mouse.right;
				ms.mouse.x = ms.x - this.mouse.x;
				ms.mouse.y = ms.y - this.mouse.y;
			} else if (this.p5play.mouseSprite) {
				this.p5play.mouseSprite.mouse.left = 0;
				this.p5play.mouseSprite.mouse.center = 0;
				this.p5play.mouseSprite.mouse.right = 0;
				this.p5play.mouseSprite.mouse.draggable = false;
			}
		}

		for (let s of sprites) {
			s.mouse.hover++;
		}

		for (let s of this.p5play.mouseSprites) {
			if ((!this.p5play.mouseSprite?.mouse.draggable || s != ms) && !sprites.includes(s)) {
				s.mouse.hover = -1;
				s.mouse.left = 0;
				s.mouse.center = 0;
				s.mouse.right = 0;
				s.mouse.draggable = false;
			}
		}
		this.p5play.mouseSprites = sprites;
	}

	this.camera.off();
});
