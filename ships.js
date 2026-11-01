'use strict';

class Ship extends ShipteroidsEntity {
    static maxhp = 100;

    static myname = 'Ship';

    // idealTargetDist: ideal distance from target based on our weapons etc
    // (for use by CPU players)
    idealTargetDist = 30 * RADIUSMUL;

    pickupMagnet = 0;

    getVelMul() {
        // Kind of ganky: all ships' velmul can be modified by a global
        // variable, so we can quickly tweak the "slidiness" of the controls
        return linear(super.getVelMul(), 1, SHIP_ADDVELMUL);
    }
    getShip() {
        return this;
    }
    canEmitGold() {
        // Can be overridden by subclasses
        return true;
    }
    canPickup(pickup) {
        // Can be overridden by subclasses
        return true;
    }
    afterAddShipBuffs() {
        // Called after our properties have been tweaked by
        // Player.addShipBuffs.
        // In particular, this would be a good time to update any of
        // our properties based on Shotprops.level.
        // To be overridden by subclasses.
    }
    dieFromDamage() {
        if(
            this.canEmitGold() &&
            Math.random() < this.field.template.gold_chance
        ) {
            this.emitPickup(GoldPickup);
        }
        super.dieFromDamage();
    }
    die() {
        this.emitEffects(SmokeEffect, 4, {
            speed_min: 3,
            speed_max: 6,
            velmul: .65,
        });
        super.die();
    }
}

class FighterShip extends Ship {
    static myname = 'Fighter';

    radius = 7 * RADIUSMUL;
    thrustSpeed = 2;
    reverseSpeed = 1.25;
    velmul = .95;
    rotspeed = Math.PI / 25;
    rotmul = .45;

    static maxhp = 100;

    shotClass = {
        x: DoubleShot,
        y: DoubleMissileShot,
    };

    picture = new Picture([
        new Shape([
            new Point(-1  , -.95),
            new Point( 1.2,    0),
            new Point(-1  ,  .95),
        ], {stroke: false}),
        new Shape([
            new Point(-1  , -.95),
            new Point( 1.2,    0),
            new Point(-1  ,  .95),
        ], {fill: false, close: false}),
    ]);
}

class ToumaShip extends FighterShip {
    static myname = 'Touma';

    shotClass = {
        x: ToumaShot,
        y: ToumaMissileShot,
    };

    picture = new Picture([
        Shape.newPolygon(8),
        Shape.newPolygon(3).mulxy(.75, 1.25),
    ]);
}

class ScorpionShip extends FighterShip {
    static myname = 'Scorpion';

    radius = 11 * RADIUSMUL;

    constructor(field) {
        super(field);

        this.chomp_cooldown = 32;

        // Set up this.picture with Shapes assigned to properties of
        // this so that we can easily animate them
        this.left_arm = new Shape([
            new Point(  0, -.4),
            new Point( .2, -.9),
            new Point(  1, -.4),
        ]).addxy(.5, -.5);
        this.right_arm = this.left_arm.clone().flip();
        this.tail = [
            // TODO...
            Shape.newPolygon(8).mulxy(1.5, 1),
        ];
        this.picture = new Picture([
            Shape.newPolygon(8).mulxy(1.5, 1),
            this.left_arm,
            this.right_arm,
        ]);
    }
    step() {
        super.step();
        this.animate();
    }
    animate() {
        var i = this.shotprops.x.cooldown / this.chomp_cooldown;

        // NOTE: arm_addx, arm_addy seem to have less effect than I expected.
        // Bug in Picture.render?..
        var arm_addx = 1 * i;
        var arm_addy = .5 * i;

        var arm_rot = -Math.PI / 2 * i;

        this.left_arm.pos.set(arm_addx, arm_addy);
        this.left_arm.rot = arm_rot;

        this.right_arm.pos.set(arm_addx, -arm_addy);
        this.right_arm.rot = -arm_rot;
    }
}

class ScoutShip extends Ship {
    static myname = 'Scout';
    radius = 6 * RADIUSMUL;

    static maxhp = 100;
    wingsOut = true;

    shotClassWingsOut = {
        x: QuadrupleShot,
        y: null,
    };

    shotClassWingsIn = {
        x: RapidDoubleShot,
        y: null,
    };

    pictureWingsOut = new Picture([
        new Shape([
            new Point(-1.0,    0),
            new Point( -.2,   -1.8),
            new Point( -.1,   -.75),
            new Point( 1.2,    0),
            new Point( -.1,    .75),
            new Point( -.2,    1.8),
        ]),
    ]);

    pictureWingsIn = new Picture([
        new Shape([
            new Point(-1.0,    0),
            new Point(- .7,   -.75),
            new Point( 1.2,    0),
            new Point(- .7,    .75),
        ]),
    ]);

    constructor(field) {
        super(field);
        this._updateStats();
    }
    _updateStats() {
        if(this.wingsOut) {
            this.thrustSpeed = 2.25;
            this.reverseSpeed = 1.5;
            this.velmul = .85;
            this.rotspeed = Math.PI / 25;
            this.rotmul = .6;
            this.picture = this.pictureWingsOut;
            this.shotClass = this.shotClassWingsOut;
        } else {
            this.thrustSpeed = 2.75;
            this.reverseSpeed = 1.75;
            this.velmul = .95;
            this.rotspeed = Math.PI / 30;
            this.rotmul = .4;
            this.picture = this.pictureWingsIn;
            this.shotClass = this.shotClassWingsIn;
        }
    }
    step() {

        var keyname = 'y';
        var shotprops = this.shotprops[keyname];
        if(shotprops.cooldown === 0) {
            var wingsOut = !this.keys[keyname].wasDown;
            if(wingsOut != this.wingsOut) {
                this.wingsOut = wingsOut;
                this._updateStats();
                shotprops.cooldown += 5;
            }
        }

        super.step();
    }
    stepCPUKey(key) {
        if(key.myname === 'y') {
            // Don't switch between wings in/out too often
            if(key.isDown) {
                if(Math.random() < .05) key.up();
            } else {
                if(Math.random() < .05) key.down();
            }
        } else {
            super.stepCPUKey(key);
        }
    }
}

class RamShip extends Ship {
    static myname = 'Ram';
    radius = 7 * RADIUSMUL;

    thrustSpeed = 1.5;
    reverseSpeed = .75;
    velmul = .97;
    rotspeed = Math.PI / 28;
    rotmul = .65;

    ramSpeed = 1.25;
    ramDamage = 35;
    minRamSpeed = 25;
    maxRamSpeed = 50;

    static maxhp = 100;

    shotClass = {
        x: ShortDoubleShot,
        y: null,
        extra1: ReverseFlameShot,
    };

    thrustEffects = 2;
    thrustEffectPosRot = Math.PI / 2;

    constructor(field) {
        super(field);

        this.shape_left = new Shape([
            new Point(-1.2, -.95),
            new Point( 1.2,    0),
            new Point(-1  ,    0),
        ]);
        this.shape_right = this.shape_left.clone().flip();
        this.shape_middle = Shape.newPolygon(4,
            {radiusmul: 0, rot: Math.PI / 4},
        ).mul(.2);
        this.picture = new Picture([
            this.shape_left,
            this.shape_right,
            this.shape_middle,
        ]);
    }
    isRamming() {
        return this.keys.y.wasDown && this.vel.dist() >= this.minRamSpeed;
    }
    fire(keyName) {
        if(keyName == 'x' && this.isRamming()) return;
        super.fire(keyName);
    }
    damage(hp, other) {

        // We take less damage while ramming!
        if(this.isRamming()) {
            var hpmul = 1 - linear(0, .75, this.getRamPercent());
            hp *= hpmul;
        }

        super.damage(hp, other);
    }
    step() {
        super.step();

        var isRamming = this.isRamming();

        var ramPercent = this.getRamPercent();
        var ram_gap = .6 * ramPercent;
        if(isRamming) ram_gap *= 2;
        this.shape_left.pos.y = -ram_gap / 2;
        this.shape_right.pos.y = ram_gap / 2;
        this.shape_middle.radiusmul = ramPercent * (isRamming? 2: 1);

        if(isRamming) {
            this.shotClass.extra1 = RamFlameShot;
            this.fire('extra1');

            this.vel.addSpeed(this.ramSpeed, this.rot);
        } else {
            this.shotClass.extra1 = ReverseFlameShot;
            if(this.keys.y.wasDown) this.fire('extra1');
        }
    }
    stepCPUKey(key) {
        if(key.myname === 'y') {
            if(Math.random() < .05) key.down();
            if(Math.random() < .001) key.up();
        } else if(key.myname === 'u') {
            if(Math.random() < .05) key.down();
            if(Math.random() < .001) key.up();
        } else if(key.myname === 'l' || key.myname === 'r' || key.myname === 'd') {
            if(Math.random() < .05) key.down();
            if(Math.random() < .05) key.up();
        } else {
            super.stepCPUKey(key);
        }
    }
    getRamPercent() {
        // Return number between 0 and 1, representing how far we are
        // to max ram speed, where 0 indicates we have just started
        // ramming (our velocity is just high enough that isRamming()
        // is true).
        var speed = this.vel.dist();
        if(speed <= this.minRamSpeed) return 0;
        if(speed >= this.maxRamSpeed) return 1;
        return (speed - this.minRamSpeed)
            / (this.maxRamSpeed - this.minRamSpeed);
    }
    handleCollision(other) {
        var isAlly = other instanceof Ship? other.isAlly(this): false;
        if(this.isRamming() && !isAlly) {
            var damagemul = this.getRamPercent();
            var damage = this.ramDamage * damagemul;
            other.damage(damage, this);

            var hitVelMul = .5;
            other.vel.addMul(this.vel, hitVelMul);

            var velmul = .5;
            this.vel.mul(velmul);

            // r0: number between 0 and 1
            //   0 -> this.radius is infinitely bigger than other.radius
            //  .5 -> this.radius and other.radius are same size
            //   1 -> other.radius is infinitely bigger than this.radius
            var r0 = this.radius / (this.radius + other.radius);

            // addx/addy: vector sending this.pos to the point where this
            // touches other
            var dx = other.pos.x - this.pos.x;
            var dy = other.pos.y - this.pos.y;
            var addx = dx * r0;
            var addy = dy * r0;

            this.emitEffects(SparkEffect, 4, {
                speed_min: 2,
                speed_max: 4,
                velmul: .75,
                addx: addx,
                addy: addy,
            });
        }

        super.handleCollision(other);
    }
}

class BoxerShip extends Ship {
    static myname = 'Boxer';
    radius = 12 * RADIUSMUL;
    thrustSpeed = 1.25;
    reverseSpeed = .75;
    velmul = .95;
    rotspeed = Math.PI / 26;
    rotmul = .65;

    static maxhp = 135;

    shotClass = {
        x: TripleShot,
        y: BlasterShot,
    };

    picture = new Picture([
        new Shape([
            new Point(-.9,    0),
            new Point(-.4, -.95),
            new Point( .9,    0),
            new Point(-.4,  .95),
        ]),
    ]);
}

class TorchShip extends Ship {
    static myname = 'Torch';
    radius = 6 * RADIUSMUL;
    thrustSpeed = 1.45;
    reverseSpeed = 1;
    velmul = .95;
    rotspeed = Math.PI / 30;
    rotmul = .7;

    static maxhp = 80;

    shotClass = {
        x: DoubleFlameShot,
        y: MineShot,
    };

    thrustEffectClass = SmokeThrustEffect;
    thrustEffectVelMul = .2;
    thrustEffectEvery = 3;

    circleFillStyle = 'rgba(255,200,150,.35)';
    picture = new Picture([
        new Shape([
            new Point(-1.3,    0),
            new Point( 0  ,   -1),
            new Point( 1  ,    0),
            new Point( 0  ,    1),
        ]),
    ]);
}

class HunterShip extends Ship {
    static myname = 'Hunter';
    radius = 10 * RADIUSMUL;
    thrustSpeed = 1;
    reverseSpeed = .5;
    velmul = .95;
    rotspeed = Math.PI / 26;
    rotmul = .65;

    static maxhp = 100;

    addhp = DEFAULT_ADDHP * 2;

    shotClass = {
        x: DoubleMiniBlasterShot,
        y: null,
    };

    picture = new Picture([
        new Shape([
            new Point(-.9, -.9 ),
            new Point( .8, -.45),
            new Point(-.9,  .9 ),
            new Point( .8,  .45),
        ], {radiusmul: 1.2}),
    ]);

    thrustEffects = 2;
    thrustEffectPosRot = Math.PI / 2;

    cloaked = false;

    constructor(field) {
        super(field);
        this.updateThrustEffects();
    }
    render(canvas, camera) {
        if(this.cloaked) return;
        super.render(canvas, camera);
    }
    updateThrustEffects() {
        if(this.cloaked) {
            this.thrustEffectClass = SmokeThrustEffect;
            this.thrustEffectVelMul = .2;
        } else {
            this.thrustEffectClass = ThrustEffect;
            this.thrustEffectVelMul = 1;
        }
    }
    fire(keyname) {
        if(this.cloaked) return;
        super.fire(keyname);
    }
    thrust(speed, rot, effect_opts) {
        if(this.cloaked) speed *= 2;
        super.thrust(speed, rot, effect_opts);
    }
    canWarp() {
        if(this.cloaked) return false;
        return super.canWarp();
    }
    step() {

        var keyname = 'y';
        var shotprops = this.shotprops[keyname];
        if(shotprops.cooldown === 0 && !this.is_warping) {
            var cloaked = this.keys[keyname].wasDown;
            if(cloaked != this.cloaked) {
                if(cloaked) {
                    var cloakdamage = 2
                        * (1 - this.shotprops.y.level / MAX_SHOT_LEVEL);
                    this.damage(cloakdamage);
                }
                this.cloaked = cloaked;
                this.updateThrustEffects();
                this.emitEffects(SmokeEffect, 4, {
                    speed_min: 3,
                    speed_max: 6,
                    velmul: .65,
                });
                shotprops.cooldown += 5;
            }
        }

        super.step();

        if(this.cloaked) {
            this.damage(this.addhp + 1/20);
        }
    }
    stepCPUKey(key) {
        if(key.myname === 'y') {
            if(this.hp < 15) {
                // Don't kill yourself by staying cloaked at low health
                key.up();
            } else if(key.isDown) {
                // Don't uncloak too soon
                if(Math.random() < .05) key.up();
            } else {
                // Don't randomly cloak very often
                if(Math.random() < .002) key.down();
            }
        } else {
            super.stepCPUKey(key);
        }
    }
    avoidTarget(target, keys) {
        super.avoidTarget(target, keys);

        // Cloak unless it would kill us to do so
        if(this.hp >= 15) keys.y.down();
        else keys.y.up();
    }
    _canCollide(other) {
        if(this.cloaked) return false;
        return super._canCollide(other);
    }
}

class BaseTurretShip extends Ship {
    flagship = null;

    remove() {
        if(this.flagship) this.flagship.removeTurret(this);
        super.remove();
    }
    canEmitGold() {
        return false;
    }
    getPlayer(includeCPUs) {
        if(this.flagship) return this.flagship.getPlayer(includeCPUs);
        return super.getPlayer(includeCPUs);
    }
}

class HasTurretsShip extends Ship {
    max_turret_cooldown = 100;
    max_turrets = 1;
    turret_class = null; // should extend BaseTurretShip

    constructor(field) {
        super(field);

        this.turrets = [];
        this.turret_cooldown = this.max_turret_cooldown;
    }
    remove() {
        // We iterate over a copy of this.turrets, because when we kill
        // each turret, it removes itself from this.turrets, which would
        // mess up an iteration over this.turrets.
        var turrets = this.turrets.slice();
        for(var turret of turrets) turret.die();
        super.remove();
    }
    addTurret() {
        var turret = this.field.addShip(this.turret_class);
        turret.setTeam(this.team);
        turret.pos.copy(this.pos)
            .addSpeed(this.radius + turret.radius, this.rot);
        turret.vel.copy(this.vel);
        turret.flagship = this;

        var player = this.getPlayer();
        if(player) {
            // Turret gets the same "buffs" from player's items as flagship
            player.addShipBuffs(turret);
        }

        this.turrets.push(turret);
        this.turret_cooldown = this.max_turret_cooldown;
        return turret;
    }
    removeTurret(turret) {
        removeArrayElem(this.turrets, turret);
        turret.flagship = null;
    }
    step() {
        super.step();
        if(this.turrets.length < this.max_turrets && !this.is_warping) {
            if(this.turret_cooldown) {
                this.turret_cooldown--;
            } else {
                this.addTurret();
            }
        }
    }
    beginWarp() {

        // Clone the array before iterating, since turret.die() calls
        // turret.remove() which removes the turret from this.turrets
        var turrets = this.turrets.slice();
        for(var turret of turrets) turret.die();

        super.beginWarp();
    }
    renderTurretLines(canvas, camera, addx, addy) {
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = 'rgba(0,200,200,.25)';
        ctx.lineWidth = 2;

        var fieldx = this.field.size.x;
        var fieldy = this.field.size.y;
        var x0 = this.pos.x + addx;
        var y0 = this.pos.y + addy;
        for(var turret of this.turrets) {
            var dx = moduloDiff(this.pos.x, turret.pos.x, fieldx);
            var dy = moduloDiff(this.pos.y, turret.pos.y, fieldy);
            var x1 = x0 + dx;
            var y1 = y0 + dy;

            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.closePath();
            ctx.stroke();
        }
    }
    renderPicture(canvas, camera, addx, addy) {
        this.renderTurretLines(canvas, camera, addx, addy);
        super.renderPicture(canvas, camera, addx, addy);
    }
}

class TurretShip extends BaseTurretShip {
    static myname = 'Turret';
    radius = 6 * RADIUSMUL;
    thrustSpeed = .95;
    reverseSpeed = .55;
    velmul = .95;
    rotspeed = Math.PI / 40;
    rotmul = .7;

    static maxhp = 180;

    shotClass = {
        x: DoubleShot,
        y: DoubleMissileShot,
    };

    picture = new Picture([
        Shape.newPolygon(6),
        new Shape([
            new Point(0  , 0),
            new Point(1.2, 0),
        ], {fill: false, close: false}),
    ]);
}

class KingTurretShip extends TurretShip {
    static myname = 'King Turret';
    radius = 9 * RADIUSMUL;

    shotClass = {
        x: QuadrupleShot,
        y: QuadrupleMissileShot,
    };
}

class FlagTurretShip extends TurretShip {
    static maxhp = 60;
}

class FlagShip extends HasTurretsShip {
    static myname = 'Flagship';
    radius = 10.5 * RADIUSMUL;
    thrustSpeed = 1.25;
    reverseSpeed = 1.25;
    velmul = .9;
    rotspeed = Math.PI / 34;
    rotmul = .5;

    shotClass = {
        x: SingleShot,
        y: MissileShot,
    };

    static maxhp = 175;

    max_turret_cooldown = 100;
    max_turrets = 2;
    turret_class = FlagTurretShip;

    picture = new Picture([
        new Shape([
            new Point(-.9, -.3),
            new Point(-.7, -.5),
            new Point( .9, -.5),
            new Point( .9,  .5),
            new Point(-.7,  .5),
            new Point(-.9,  .3),
        ]),
    ], {radiusmul: 1.2});

    step() {
        super.step();
        for(var turret of this.turrets) {
            for(var keyname of 'xy') {
                var key = this.keys[keyname];
                turret.keys[keyname].copy(key);
            }
            for(var keyname of 'lrud') {
                turret.keys[keyname].up();
            }

            var tdist = 60 * RADIUSMUL;
            this.spring(turret, tdist,
                {mul: .02, push: false, r0: 1});

            var targetAngle = this.rot;
            turret.rot_vel += rotDiff(turret.rot, targetAngle) * .2;
        }
    }
}

class MoleShip extends Ship {
    static myname = 'Mole';
    radius = 6 * RADIUSMUL;
    thrustSpeed = 2.05;
    reverseSpeed = 1.15;
    velmul = .95;
    rotspeed = Math.PI / 30;
    rotmul = .6;

    static maxhp = 60;

    shotClass = {
        x: ShortDoubleShot,
        y: null,
    };

    picture = new Picture([
        new Shape([
            new Point(-.7, -.3),
            new Point(-.4, -.9),
            new Point( .9, -.5),
            new Point(-.1,   0),
            new Point( .9,  .5),
            new Point(-.4,  .9),
            new Point(-.7,  .3),
        ]),
    ]);

    rock = null;

    remove() {
        if(this.rock) this.exitRock();
        super.remove();
    }
    step() {
        var rock = this.rock;
        if(rock) {
            var fieldx = this.field.size.x;
            var fieldy = this.field.size.y;

            var dx = moduloDiff(this.pos.x, rock.pos.x, fieldx);
            var dy = moduloDiff(this.pos.y, rock.pos.y, fieldy);

            this.addpos.x += dx * .2;
            this.addpos.y += dy * .2;
            this.vel.x += dx * .1;
            this.vel.y += dy * .1;

            rock.rot_vel *= .95;
            rock.vel.mul(this.getVelMul());

            var addhp = (1 / 20) * (1 + .75 * this.shotprops.y.level);
            rock.heal(addhp);
        }
        super.step();
    }
    stepCPUKey(key) {
        if(key.myname === 'y') {
            if(this.rock) {
                // Usually don't exit your rock
                if(Math.random() < .001) key.down();
                else key.up();
            } else {
                // Try to enter rocks
                if(Math.random() < .5) key.down();
                else key.up();
            }
        } else {
            super.stepCPUKey(key);
        }
    }
    fire(keyname) {
        if(keyname === 'y') {
            var shotprops = this.shotprops[keyname];
            if(this.rock) {

                // NOTE: we add to this.pos, not this.addpos, otherwise
                // this ship will collide with its rock and get a ton of
                // velocity added to it this frame
                this.pos.addSpeed(this.rock.radius * .5, this.rot);

                this.exitRock();
                shotprops.cooldown += 10;
            } else {
                var foundRock = null;
                for(var rock of this.field.rocks) {
                    if(!this.colliding(rock)) continue;
                    if(rock.mole) continue;
                    foundRock = rock;
                    break;
                }
                if(foundRock) {
                    this.enterRock(foundRock);
                    shotprops.cooldown += 30;
                }
            }
        } else {
            super.fire(keyname);
        }
    }
    afterShot(shot, shot_details) {
        super.afterShot(shot, shot_details);

        var rock = this.rock;
        if(rock) {
            shot.addpos.addSpeed(rock.radius - this.radius, this.rot);
        }
    }
    thrust(speed, rot, effect_opts) {
        var rock = this.rock;
        if(rock) {
            var mul = DEFAULT_ROCK_RADIUS / rock.radius;
            if(mul > 1) mul = 1;
            rock.vel.addSpeed(speed * mul, rot);
        }
        super.thrust(speed, rot, effect_opts);
    }
    turn(rot) {
        var rock = this.rock;
        if(rock) {
            var mul = DEFAULT_ROCK_RADIUS / rock.radius;
            if(mul > 1) mul = 1;
            rock.rot_vel += rot * mul * .3;
        }
        super.turn(rot);
    }
    enterRock(rock) {
        rock.mole = this;
        this.rock = rock;
        this.emitEffects(SparkEffect, 4, {
            speed_min: 3,
            speed_max: 6,
            velmul: .65,
        });
    }
    exitRock() {
        this.rock.mole = null;
        this.rock = null;
    }
    canWarp() {
        if(this.rock) return false;
        return super.canWarp();
    }
    _canCollide(other) {
        if(other === this.rock) return false;
        return super._canCollide();
    }
    _isAlly(other) {
        if(other === this.rock) return true;
        return super._isAlly(other);
    }
    canPickup(pickup) {
        if(this.rock) return false;
        return super.canPickup(pickup);
    }
}

class SuitShip extends Ship {
    static myname = 'Suit';
    radius = 6 * RADIUSMUL;
    thrustSpeed = .5;
    reverseSpeed = .5;
    velmul = .995;
    rotspeed = Math.PI / 50;
    rotmul = .85;

    static maxhp = 85;

    thrustEffectClass = null;

    rock = null;
    rock_cooldown = 0;

    // rockPos: our target position on the surface of this.rock
    // (We store this point on ourself just so we don't have to allocate
    // a fresh Point every frame... I don't know if that would actually
    // affect Javascript's performance. O_o I'm sure it doesn't matter.
    // Ah well, some habits from C die hard.)
    rockPos = new Point();

    step() {
        if(this.rock && this.rock.removed) this.unsetRock();

        if(this.rock_cooldown > 0) this.rock_cooldown--;

        super.step();

        if(this.rock) this.followRock();
    }
    setRock(rock) {
        this.rock = rock;

        // Wait this many ticks before being able to jump back off rock
        this.rock_cooldown = 10;

        // We just landed on a rock, which means we were holding down 'y'
        // button. So add some cooldown before doing our 'y' action on the
        // rock.
        this.shotprops.y.cooldown += 10;

        if(this.pos.eq(rock.pos)) {
            this.rot = Random.randRotation();
        } else {
            this.rot = rock.pos.angle(this.pos, this.field.size);
        }

        this.emitEffects(SmokeEffect, 2, {
            speed_min: 3,
            speed_max: 6,
            velmul: .65,
        });
        this.followRock();
    }
    unsetRock() {
        this.rock = null;

        // Wait this many ticks before being able to land on another rock
        this.rock_cooldown = 10;

        this.emitEffects(SmokeEffect, 2, {
            speed_min: 3,
            speed_max: 6,
            velmul: .65,
        });
    }
    followRock() {
        var rock = this.rock;

        var fieldx = this.field.size.x;
        var fieldy = this.field.size.y;

        this.rockPos.copy(rock.pos)
            .addSpeed(rock.radius + this.radius / 2, this.rot);
        var dx = moduloDiff(this.pos.x, this.rockPos.x, fieldx);
        var dy = moduloDiff(this.pos.y, this.rockPos.y, fieldy);

        this.addpos.x += dx * .5;
        this.addpos.y += dy * .5;
        this.vel.x += dx * .2;
        this.vel.y += dy * .2;
    }
    fire(keyname) {
        if(keyname === 'y') {
            // Only fire 'y' when we're on a rock.
            // Otherwise, 'y' is used to *land* on rocks (which is handled
            // elsewhere, see _handleKeys)
            if(this.rock) super.fire(keyname);
        } else {
            super.fire(keyname);
        }
    }
    _handleKeys() {
        if(this.rock) {
            // Override Ship._handleKeys entirely

            if(this.keys.u.wasDown && this.rock_cooldown === 0) {
                // Jump off this.rock
                this.vel.addSpeed(this.thrustSpeed * 5, this.rot);
                this.unsetRock();
                return;
            }

            // Turn slower when standing on bigger rocks
            // (because this.rot affects our position directly, and we want
            // to make sure we don't "move faster" when standing on bigger
            // rocks)
            var rotspeed = this.rotspeed * 1.5
                * (DEFAULT_ROCK_RADIUS / this.rock.radius);

            if(this.keys.l.wasDown) {
                this.turn(rotspeed);
            }
            if(this.keys.r.wasDown) {
                this.turn(-rotspeed);
            }
        } else {

            if(this.keys.y.wasDown && this.rock_cooldown === 0) {
                // Attempt to land on any rock we're in contact with

                var foundRock = null;
                for(var rock of this.field.rocks) {
                    if(!this.colliding(rock)) continue;
                    foundRock = rock;
                    break;
                }
                if(foundRock) {
                    this.setRock(foundRock);
                }
            }

            super._handleKeys();
        }
    }
    canWarp() {
        if(this.rock) return false;
        return super.canWarp();
    }
    _canCollide(other) {
        if(other === this.rock) return false;
        return super._canCollide();
    }
    _isAlly(other) {
        if(other === this.rock) return true;
        return super._isAlly(other);
    }
    stepCPUKey(key) {
        if(key.myname === 'u' && this.rock) {
            // Usually don't exit your rock
            if(Math.random() < .001) key.down();
            else key.up();
        } else if(key.myname === 'y' && !this.rock) {
            // Try to enter rocks
            if(Math.random() < .5) key.down();
            else key.up();
        } else {
            super.stepCPUKey(key);
        }
    }
}

class MinerShip extends SuitShip {
    static myname = 'Miner';

    shotClass = {
        x: ToolShot,
        y: null,
    };

    dig_cooldown = 100;

    picture = new Picture([
        // body
        Shape.newPolygon(3, {rot: Math.PI}).addxy(-.3, 0).mul(.9),
        // head
        Shape.newPolygon(3, {rot: Math.PI}).addxy(1.2, 0).mul(.5),
        // left arm
        Shape.newPolygon(4).mul(.2).addxy( .1, -1),
        // right arm
        Shape.newPolygon(4).mul(.2).addxy( .1,  1),
        // left leg
        Shape.newPolygon(4, {rot: Math.PI / 4}).mulxy(.6, .3).addxy(-1, -.6),
        // right leg
        Shape.newPolygon(4, {rot: Math.PI / 4}).mulxy(.6, .3).addxy(-1,  .6),
    ]);

    afterAddShipBuffs() {
        super.afterAddShipBuffs();

        this.dig_cooldown -= 15 * this.shotprops.y.level;
    }
    fire(keyname) {
        if(
            keyname === 'y' && this.rock && this.canDig(this.rock) &&
            this.rock_cooldown === 0
        ) {
            this.dig(this.rock);
            var shotprops = this.shotprops[keyname];
            shotprops.cooldown += this.dig_cooldown;
        } else {
            super.fire(keyname);
        }
    }
    canPickup(pickup) {

        // MinerShip can't pick up gold while its digger is cooling down.
        // (So that it doesn't immediately pick up gold it generates
        // by digging)
        if(
            pickup instanceof GoldPickup &&
            this.shotprops.y.cooldown > 0
        ) return false;

        return super.canPickup(pickup);
    }
}

class EngineerShip extends SuitShip {
    static myname = 'Engineer';

    shotClass = {
        x: ToolShot,
        y: RopeShot,
    };

    picture = new Picture([
        // body
        Shape.newPolygon(4, {rot: Math.PI / 4}).addxy(-.3, 0).mul(.9),
        // head
        Shape.newPolygon(4, {rot: Math.PI / 4}).addxy(1.2, 0).mul(.5),

        new Shape([
            // left arm
            new Point( .1, - .8),
            new Point( .1, -1.2),
        ]),
        new Shape([
            // right arm
            new Point( .1,   .8),
            new Point( .1,  1.2),
        ]),
        new Shape([
            // left leg
            new Point(- .9, -.5),
            new Point(-1.2, -.8),
        ]),
        new Shape([
            // right leg
            new Point(- .9,  .5),
            new Point(-1.2,  .8),
        ]),
    ]);

    ropeEnd = null;

    afterShot(shot, shot_details) {
        super.afterShot(shot, shot_details);
        if(shot instanceof RopeShot) {
            if(this.ropeEnd) {
                this.ropeEnd.addOtherEnd(shot);
                this.ropeEnd = null;
            } else {
                this.ropeEnd = shot;
            }
        }
    }
    step() {
        super.step();
        if(this.ropeEnd && this.ropeEnd.removed) this.ropeEnd = null;
    }
}

class TroopShip extends SuitShip {
    static myname = 'Troop';
    radius = 7 * RADIUSMUL;

    static maxhp = 95;

    shotClass = {
        x: TripleToolShot,
        y: MissileBarrage,
    };

    picture = new Picture([
        // body
        Shape.newPolygon(5).addxy(-.3, 0).mul(.9),
        // head
        Shape.newPolygon(4, {rot: Math.PI / 4}).addxy(1.2, 0).mul(.5),

        // left arm
        Shape.newPolygon(3).mul(.3).addxy(.1, -1),

        // right arm
        Shape.newPolygon(3).mul(.3).addxy(.1,  1),

        new Shape([
            // left leg
            new Point(- .9, -.5),
            new Point(-1.2, -.8),
        ]),
        new Shape([
            // right leg
            new Point(- .9,  .5),
            new Point(-1.2,  .8),
        ]),
    ]);
}

class CrabShip extends Ship {
    static myname = 'Crab';
    radius = 14 * RADIUSMUL;
    thrustSpeed = 3.25;
    reverseSpeed = 2.5;
    velmul = .85;
    rotspeed = Math.PI / 30;
    rotmul = .65;

    addhp = DEFAULT_ADDHP * 4;

    idealTargetDist = 5 * RADIUSMUL;

    static maxhp = 200;

    shotClass = {
        x: ChompShot,
        y: null,
    };

    constructor(field) {
        super(field);

        this.chomp_thrust = this.thrustSpeed * 10;
        this.chomp_cooldown = 32;

        // Set up this.picture with Shapes assigned to properties of
        // this so that we can easily animate them
        this.left_arm = new Shape([
            new Point(  0, -.4),
            new Point( .2, -.9),
            new Point(  1, -.4),
        ]);
        this.right_arm = this.left_arm.clone().flip();
        this.picture = new Picture([
            new Shape([
                // Body
                new Point(  0, -.7),
                new Point(-.8,   0),
                new Point(  0,  .7),
            ]),
            this.left_arm,
            this.right_arm,
        ]);
    }
    step() {
        super.step();
        this.animate();
    }
    animate() {
        var i = this.shotprops.x.cooldown / this.chomp_cooldown;

        // NOTE: arm_addx, arm_addy seem to have less effect than I expected.
        // Bug in Picture.render?..
        var arm_addx = 1 * i;
        var arm_addy = .5 * i;

        var arm_rot = -Math.PI / 2 * i;

        this.left_arm.pos.set(arm_addx, arm_addy);
        this.left_arm.rot = arm_rot;

        this.right_arm.pos.set(arm_addx, -arm_addy);
        this.right_arm.rot = -arm_rot;
    }
    turn(rot) {

        // This is kind of cool, but doesn't quite feel right.
        //var speed = rot * this.thrustSpeed * 4;
        //this.vel.addSpeed(speed, this.rot + Math.PI / 2);

        super.turn(rot);
    }
    fire(keyname) {
        if(keyname === 'y') {
            var shotprops = this.shotprops[keyname];

            var speed = this.chomp_thrust * (1 + .4 * shotprops.level);
            this.thrust(speed, this.rot, {cls: null});
            this.addThrustEffects(2 + shotprops.level, this.rot + Math.PI, {
                cls: FlameSmokeEffect,
                n_effects: 3,
                velmul: 0,
                posrot: Math.PI / 2,
            });

            shotprops.cooldown += this.chomp_cooldown;
        } else {
            super.fire(keyname);
        }
    }
}

function _initSwarmShip(leader) {
    // Poor man's multiple inheritance...
    // SwarmShip inherits from HasTurretsShip, SwarmTurretShip inherits
    // from BaseTurretShip, but both classes need to share some common
    // initialization, so here we are.

    // Are we the leader of our swarm?..
    leader = getDefault(leader, false);

    this.thrustSpeed = 2.2;
    this.reverseSpeed = 1.9;
    this.velmul = .9;

    this.rotspeed = Math.PI / 45;
    this.rotmul = .75;

    if(leader) {
        // Leader is slower going forwards, but faster going backwards.
        // That helps him stay behind his swarm...
        this.thrustSpeed *= .8;
        this.reverseSpeed *= 1.3;
    }

    this.shotClass = {
        x: leader? BoldSlowSingleShot: SlowSingleShot,
        y: null,
    };

    this.picture = new Picture([
        new Shape([
            new Point(-1.0,    0),
            new Point(- .1,   -.5),
            new Point( 1.2,    0),
            new Point(- .1,    .5),
        ]),
    ]);
}

class SwarmTurretShip extends BaseTurretShip {
    static myname = 'Swarm';
    radius = 5 * RADIUSMUL;

    thrustSpeed = .7;
    reverseSpeed = .4;
    velmul = .975;
    rotspeed = Math.PI / 45;
    rotmul = .85;

    static maxhp = 35;

    initSwarmShip = _initSwarmShip;

    constructor(field) {
        super(field);
        this.initSwarmShip();
    }
}

class SwarmShip extends HasTurretsShip {
    static myname = 'Swarm';
    radius = 6 * RADIUSMUL;

    static maxhp = 60;

    circleLineWidth = 3;

    max_turret_cooldown = 25;
    max_turrets = 3;
    turret_class = SwarmTurretShip;

    initSwarmShip = _initSwarmShip;

    constructor(field) {
        super(field);
        this.initSwarmShip(true);
    }
    afterAddShipBuffs() {
        super.afterAddShipBuffs();

        // Upgrades to our 'y' shot translate into more turrets.
        this.max_turrets += this.shotprops.y.level;
    }
    step() {
        var tightFormation = this.keys.y.isDown;

        var tdist = (tightFormation? 25: 65) * RADIUSMUL;
        var springmul = (tightFormation? .03: .02);
        for(var turret of this.turrets) {
            this.spring(turret, tdist,
                {mul: springmul, push: false, r0: .85});
        }

        super.step();

        for(var turret of this.turrets) {
            var targetAngle = this.rot;
            var rot_vel_mul = tightFormation? .2: .1;
            turret.rot_vel += rotDiff(turret.rot, targetAngle)
                * rot_vel_mul;

            for(var keyname of 'y') {
                turret.keys[keyname].up();
            }

            if(tightFormation) {
                for(var keyname of 'xud') {
                    var key = this.keys[keyname];
                    turret.keys[keyname].copy(key);
                }
                for(var keyname of 'lr') {
                    turret.keys[keyname].up();
                }
            } else {
                for(var keyname of 'x') {
                    var key = this.keys[keyname];
                    turret.keys[keyname].copy(key);
                }
                for(var keyname of 'lrud') {
                    if(Math.random() < .1) turret.keys[keyname].down();
                    if(Math.random() < .1) turret.keys[keyname].up();
                }
            }
        }
    }
    stepCPUKey(key) {
        if(key.myname === 'y') {
            if(Math.random() < .05) key.down();
            if(Math.random() < .01) key.up();
        } else {
            super.stepCPUKey(key);
        }
    }
}

class BoreShip extends Ship {
    static myname = 'Bore';

    radius = 7 * RADIUSMUL;
    thrustSpeed = 1.2;
    reverseSpeed = .9;
    velmul = .98;
    rotspeed = Math.PI / 25;
    rotmul = .45;

    static maxhp = 100;

    shotClass = {
        x: SingleShot,
        y: BoreShot,
    };

    picture = new Picture([
        new Shape([
            new Point(-1  , -.75),
            new Point( 1  , -.75),
            new Point( 1  ,  .75),
            new Point(-1  ,  .75),
        ], {stroke: false}),
        new Shape([
            new Point(-1  , -.75),
            new Point( 1  , -.75),
            new Point( 1  ,  .75),
            new Point(-1  ,  .75),
        ], {fill: false, close: false}),
    ]);
}

class CannonShip extends Ship {
    static myname = 'Cannon';

    radius = 9 * RADIUSMUL;
    thrustSpeed = .78;
    reverseSpeed = .4;
    velmul = .98;
    rotspeed = Math.PI / 68;
    rotmul = .87;

    static maxhp = 90;

    shotClass = {
        x: DoubleCannonShot,
        y: SuperCannonShot,
    };

    picture = new Picture([
        new Shape(Point.mirror([
            new Point(-1  , -1 ),
            new Point(-.8 , -1 ),
            new Point(-.8 , -.5),
            new Point( 1 , -.5),
            new Point( 1 , -.2),
            new Point( 0 , -.2),
        ])),
    ]);
}

var SHIP_CLASSES = new OrderedDict()
    .set('fighter', FighterShip)
    .set('scout', ScoutShip)
    .set('boxer', BoxerShip)
    .set('torch', TorchShip)
    .set('turret', TurretShip)
    .set('kingturret', KingTurretShip)
    .set('flag', FlagShip)
    .set('mole', MoleShip)
    .set('crab', CrabShip)
    .set('ram', RamShip)
    .set('hunter', HunterShip)
    .set('swarm', SwarmShip)
    .set('miner', MinerShip)
    .set('engineer', EngineerShip)
    .set('troop', TroopShip)
    .set('bore', BoreShip)
    .set('cannon', CannonShip)
    .set('touma', ToumaShip)
    .set('scorpion', ScorpionShip)
;
