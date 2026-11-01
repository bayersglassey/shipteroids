'use strict';

class Shot extends ShipteroidsEntity {
    static myname = 'Shot';

    static initialShots = 1;
    static serialShots = 1;
    // "rot variance": difference in radians between the rot of first
    // and last Shot instance produced by firing this Shot type
    initialRotVariance = 0;
    serialRotVariance = 0;
    randomRotVariance = 0;
    initialPosRotVariance = 0;
    serialPosRotVariance = 0;
    randomPosRotVariance = 0;

    // A "standard" shot goes forwards and does damage.
    // This is used by cpu-controlling code to decide whether to use
    // this shot when attempting to shoot at an enemy target.
    static isStandardShot = true;

    isReverseShot = false;

    initialSpeed = 20;
    initialVelMul = 1;
    randomSpeedVariance = 0;

    // Making player's gamepad rumble when they shoot
    static vibrateDuration = 0;
    static vibrateWeakMagnitude = 0;
    static vibrateStrongMagnitude = 0;

    // How hard we move things we hit
    hitVelMul = .05;

    // How much we transfer our rotational velocity to things we hit
    hitRotMul = .1;

    // How much damage we do
    hitDamage = 10;

    // If < 1, the amount of damage we do goes down over time
    hitDamageAgeMul = 1;

    hitEffectClass = SparkEffect;

    level = 0;

    static cooldown = 4;

    // If groupShots > 0, then every time that many shots have been fired,
    // groupCooldown is applied
    static groupShots = 0;
    static groupCooldown = 10;

    constructor(field) {
        super(field);

        // The Ship who shot us out
        this.ship = null;
    }
    getShip() {
        return this.ship;
    }
    emitShots(cls, n_shots, opts) {
        var rot_variance = getDefault(opts.rot_variance, 0);
        var rand_rot_variance = getDefault(opts.rand_rot_variance, 0);
        var speed_min = getDefault(opts.speed_min, 0);
        var speed_max = getDefault(opts.speed_max, 0);

        var velmul = .8;
        for(var i = 0; i < n_shots; i++) {
            var shot = this._shoot(cls);
            shot.rot = this.rot
                + getRotVariance(i, n_shots) * rot_variance
                + Random.randNumber(-.5, .5) * rand_rot_variance;
            var speed = Random.randNumber(speed_min, speed_max);
            shot.vel.copy(this.vel).mul(velmul)
                .addSpeed(speed, shot.rot);

            // Emitted shots "inherit" emitting shot's power level
            shot.applyPowerup(this.level);
        }
    }
    applyPowerup(level) {
        // This is called by the Entity which fired this Shot (or the Shot
        // which emitted this Shot), to apply any powerups it may have had.
        level = getDefault(level, 0);

        this.radius += Math.ceil(this.radius * .075) * level;
        this.hitDamage += Math.ceil(this.hitDamage / 4) * level;
        this.initialSpeed += Math.ceil(this.initialSpeed / 4) * level;

        // Store level on this shot (used e.g. if this shot creates
        // more shots)
        this.level = level;
    }
    afterShotBy(entity, shot_details) {
        // Bit of a hack, called by Entity.shoot, Entity.emitShots, etc.
        // Just lets subclasses of Shot customize themselves a bit based
        // on the entity which shot them.
    }
    step() {
        super.step();
        this.hitDamage *= this.hitDamageAgeMul;
    }
    hit(other) {
        other.vel.addMul(this.vel, this.hitVelMul);
        other.rot_vel += this.rot_vel * this.hitRotMul;
        other.damage(this.hitDamage, this);
        this.emitEffects(this.hitEffectClass, 2, {
            speed_min: 2,
            speed_max: 4,
            velmul: .75,
        });
        this.die();
    }
}

class SingleShot extends Shot {
    radius = 3 * RADIUSMUL;
    velmul = .95;
    initialSpeed = 23;
    hitDamage = 10;
    hitDamageAgeMul = .95;
    shouldRenderTrail = true;
    static cooldown = 4;
    maxAge = 40;
    fadeWithAge = true;
}

class ShortSingleShot extends SingleShot {
    initialSpeed = 17;
    static cooldown = 3;
}

class SlowSingleShot extends SingleShot {
    initialSpeed = 17;
    static cooldown = 5;
}

class BoldSlowSingleShot extends SlowSingleShot {
    trailStrokeStyle = '#fa0';
    trailLineWidth = 3;
}

class RapidSingleShot extends SingleShot {
    radius = 4 * RADIUSMUL;
    initialSpeed = 26;
    hitDamage = 6;
    hitDamageAgeMul = .98;
    static cooldown = 2;
    hitVelMul = .09;
    trailStrokeStyle = '#aaa';
    trailEnd = .3;
}

class RapidDoubleShot extends RapidSingleShot {
    static serialShots = 2;
    serialPosRotVariance = Math.PI / 2;
}

class DoubleShot extends SingleShot {
    static serialShots = 2;
    serialRotVariance = Math.PI / 18;
}

class ToumaShot extends SingleShot {
    static initialShots = 2;
    initialRotVariance = Math.PI / 16;

    static serialShots = 4;
    serialRotVariance = Math.PI * 1.5;
}

class ShortDoubleShot extends ShortSingleShot {
    static serialShots = 2;
    serialRotVariance = Math.PI / 26;
    serialPosRotVariance = Math.PI / 3;
}

class TripleShot extends SingleShot {
    static initialShots = 3;
    static serialShots = 1;
    initialRotVariance = Math.PI / 13;
    serialRotVariance = 0;
    static cooldown = 7;
}

class QuadrupleShot extends SingleShot {
    static serialShots = 4;
    serialRotVariance = Math.PI / 20;
    serialPosRotVariance = Math.PI;
    static cooldown = 2;
}

class MiniBlasterShot extends Shot {
    radius = 4 * RADIUSMUL;
    initialSpeed = 18;
    initialVelMul = 1;
    velmul = 1;

    hitVelMul = .05;
    hitDamage = 5;

    maxAge = 12;
    static cooldown = 8;

    static vibrateDuration = 200;
    static vibrateStrongMagnitude = .2;

    picture = Picture.newPolygon(6);

    die() {
        this.emitEffects(SmokeEffect, 1, {
            speed_min: 3,
            speed_max: 6,
            velmul: .65,
        });
        this.emitShots(SingleShot, 2, {
            rot_variance: Math.PI / 4,
            speed_min: 10,
            speed_max: 10,
        });
        super.die();
    }
}

class DoubleMiniBlasterShot extends MiniBlasterShot {
    static serialShots = 2;
    serialRotVariance = Math.PI / 26;
    serialPosRotVariance = Math.PI / 3;
}

class BlasterShot extends Shot {
    radius = 10 * RADIUSMUL;
    initialSpeed = 14;
    initialVelMul = .7;
    velmul = 1;

    hitVelMul = .5;
    hitDamage = 15;

    maxAge = 20;
    static cooldown = 32;

    static vibrateDuration = 350;
    static vibrateWeakMagnitude = .2;
    static vibrateStrongMagnitude = .6;

    picture = Picture.newPolygon(6);

    afterShotBy(entity, shot_details) {
        super.afterShotBy(entity, shot_details);

        // Firing this weapon has a "push back" effect on whatever fired it
        var kickback = this.initialVelMul * (8 + 4 * this.level);
        entity.vel.addSpeed(kickback, this.rot + Math.PI);
    }
    die() {
        this.emitEffects(SmokeEffect, 3, {
            speed_min: 3,
            speed_max: 6,
            velmul: .65,
        });
        this.emitShots(SingleShot, 5, {
            rot_variance: Math.PI / 4,
            speed_min: 10,
            speed_max: 10,
        });
        super.die();
    }
}

class MissileShot extends Shot {
    radius = 6 * RADIUSMUL;
    initialSpeed = 10;
    initialVelMul = .6;
    velmul = .9;

    thrustSpeed = 3;

    hitVelMul = .45;
    hitDamage = 10;

    maxAge = 30;
    fadeWithAge = false;
    static cooldown = 24;

    static vibrateDuration = 300;
    static vibrateWeakMagnitude = .2;
    static vibrateStrongMagnitude = .4;

    shouldRenderTrail = true;
    trailCamVel = 0;

    picture = new Picture([
        new Shape([
            new Point(-1.2, -.3),
            new Point( 1.2, -.3),
            new Point( 1.2,  .3),
            new Point(-1.2,  .3),
        ]),
    ]);

    step() {
        if(this.age < this.maxAge / 2) {
            this.vel.addSpeed(this.thrustSpeed, this.rot);
        } else {
            this.shouldRenderTrail = false;
        }
        super.step();
    }
    afterShotBy(entity, shot_details) {
        super.afterShotBy(entity, shot_details);
        this.rot_vel = rotDiff(this.rot, entity.rot) * 2;
    }
    die() {
        this.emitEffects(SmokeEffect, 3, {
            speed_min: 3,
            speed_max: 6,
            velmul: .65,
        });
        super.die();
    }
}

class DoubleMissileShot extends MissileShot {
    static initialShots = 2;
    initialRotVariance = Math.PI / 9;
    initialPosRotVariance = Math.PI / 3;
}

class MissileBarrage extends MissileShot {
    static serialShots = 2;
    static groupShots = 4;
    static cooldown = 3;
    static groupCooldown = 30;
    initialRotVariance = Math.PI / 9;
    initialPosRotVariance = Math.PI / 3;
    serialRotVariance = Math.PI / 4;
}

class ToumaMissileShot extends MissileShot {
    static serialShots = 4;
    serialRotVariance = Math.PI * 1.5;

    static groupShots = 4;
    static cooldown = 3;
    static groupCooldown = 10;
}

class QuadrupleMissileShot extends MissileShot {
    static serialShots = 4;
    serialRotVariance = Math.PI / 4;
    serialPosRotVariance = Math.PI;
    static cooldown = 8;
}

class CannonShot extends Shot {
    radius = 4 * RADIUSMUL;
    initialSpeed = 0;
    initialVelMul = 1;
    velmul = 1;

    hitVelMul = .05;
    hitDamage = 5;

    maxAge = 12;
    static cooldown = 8;

    shouldRenderCircle = true;
    shouldRenderCircleLine = false;
    circleStrokeStyle = 'transparent';
    circleFillStyle = 'rgba(255,255,255,.75)';

    numChildShots = 12;
    childShotSpacing = 9 * RADIUSMUL;

    cannonColors = {
        r: [255, 255],
        g: [255, 180],
        b: [255, 100],
        a: [.5, .5],
    };

    afterShotBy(entity, shot_details) {
        super.afterShotBy(entity, shot_details);

        for(var i = 0; i < this.numChildShots; i++) {

            // shot_i: the shot we're about to create is the "i"th shot,
            // where i = 0 corresponds to the initial shot (that is, the shot
            // for which the afterShotBy method is currently being called).
            var shot_i = i + 1;

            var shot = entity.shoot(this.constructor, shot_details);
            shot.pos.addSpeed(
                shot_i * this.childShotSpacing, this.rot);
            shot.vel.copy(this.vel);
            shot.age = this.numChildShots - shot_i - 1;
            shot.applyPowerup(this.level);
        }

        // The current shot is considered the 0th shot, that is, shot_i = 0
        var shot_i = 0;
        this.age = this.numChildShots - shot_i - 1;
    }
    step() {
        super.step();

        this.radius = Math.max(1 * RADIUSMUL, this.radius - .5 * RADIUSMUL);

        var m = this.age / this.maxAge;
        var r = this.cannonColors.r;
        var g = this.cannonColors.g;
        var b = this.cannonColors.b;
        var a = this.cannonColors.a;
        this.circleStrokeStyle = 'transparent';
        this.circleFillStyle = Color.rgba(
            linear(r[0], r[1], m),
            linear(g[0], g[1], m),
            linear(b[0], b[1], m),
            linear(a[0], a[1], m));
    }
}

class DoubleCannonShot extends CannonShot {
    static serialShots = 2;
    serialPosRotVariance = Math.PI / 3;

    static cooldown = 4;
    static groupShots = 4;
    static groupCooldown = 12;
}

class SuperCannonShot extends CannonShot {
    radius = 8 * RADIUSMUL;
    initialSpeed = 10;

    static initialShots = 2;
    initialPosRotVariance = Math.PI * 1.25;

    maxAge = 22;
    static cooldown = 45;

    static vibrateDuration = 200;
    static vibrateStrongMagnitude = .2;

    numChildShots = 12;
    childShotSpacing = 12 * RADIUSMUL;

    cannonColors = {
        r: [200, 50],
        g: [150, 0],
        b: [255, 255],
        a: [.75, .25],
    };
}

class FlameShot extends Shot {
    randomRotVariance = Math.PI / 40;
    randomPosRotVariance = Math.PI / 8;
    randomSpeedVariance = 1.5;

    initialSpeed = 10;
    initialVelMul = .8;

    hitVelMul = 0;
    hitDamage = 3;
    hitDamageAgeMul = .975;
    hitEffectClass = FlameSmokeEffect;

    static cooldown = 1;

    radius = 3 * RADIUSMUL;
    velmul = .95;
    maxAge = 25;
    fadeWithAge = true;

    picture = new Picture([
        Shape.newPolygon(3, null, {stroke: false}),
        Shape.newPolygon(3, {rot: Math.PI * 2 / 6}, {stroke: false}),
    ]);
    circleFillStyle = 'rgba(255,180,0,.25)';

    constructor(field) {
        super(field);
        this.rot_vel = Random.randNumber(-.5, .5) * Math.PI / 40;
    }
    step() {
        super.step();
        this.radius += .2 * RADIUSMUL;
    }
}

class DoubleFlameShot extends FlameShot {
    randomRotVariance = Math.PI / 20;
    randomPosRotVariance = Math.PI / 4;

    static initialShots = 2;
    initialRotVariance = Math.PI / 9;
}

class ReverseFlameShot extends FlameShot {
    isReverseShot = true;

    static isStandardShot = false;

    hitDamage = 2;
    static cooldown = 2;
}

class RamFlameShot extends ReverseFlameShot {
    /* Ram's flames when it's ramming (when isRamming() is true) */
    radius = 5 * RADIUSMUL;
    circleFillStyle = 'rgba(255,200,0,.35)';
}

class MineShot extends Shot {
    radius = 6 * RADIUSMUL;
    initialSpeed = 0;
    velmul = .9;

    static isStandardShot = false;

    hitDamage = 8;

    maxAge = 300;
    static cooldown = 32;

    picture = Picture.newPolygon(6);
    circleFillStyle = 'rgba(255,180,0,.4)';
    circleLineWidth = 3;

    die() {
        this.emitShots(FlameShot, 5, {
            rot_variance: Math.PI * 2,
            rand_rot_variance: Math.PI / 3,
            speed_min: 3,
            speed_max: 6,
        });

        super.die();
    }
}

class ChompShot extends Shot {
    radius = 10 * RADIUSMUL;
    initialSpeed = 24;
    initialVelMul = 1;
    velmul = .9;

    hitVelMul = .325;
    hitDamage = 10;

    maxAge = 5;
    static cooldown = 6;

    static vibrateDuration = 200;
    static vibrateWeakMagnitude = .35;

    circleStrokeStyle = 'rgba(255,150,0,.4)';
    inheritTeamColor = false;

    picture = new Picture([
        new Shape([
            new Point(-.4, -.85),
            new Point( .9,    0),
            new Point(-.4,  .85),
        ], {fill: false, close: false}),
    ]);

    hit(other) {
        var velmul = .35;
        var rot_velmul = .3;
        other.vel.mul(velmul);
        other.rot_vel *= rot_velmul;

        super.hit(other);
    }
}

class ToolShot extends Shot {
    radius = 4 * RADIUSMUL;
    initialSpeed = 12;
    initialVelMul = .8;
    velmul = .95;

    hitVelMul = .25;
    hitDamage = 10;

    maxAge = 25;
    static cooldown = 12;

    fadeWithAge = true;

    picture = new Picture([
        new Shape([
            Point.unit(0 / 4),
            Point.unit(2 / 4),
        ], {fill: false}),
        new Shape([
            Point.unit(1 / 4),
            Point.unit(3 / 4),
        ], {fill: false}),
    ]);
}

class TripleToolShot extends ToolShot {
    static initialShots = 3;
    initialRotVariance = Math.PI / 13;
    hitDamage = 5;
    static cooldown = 7;
}

class RopeShot extends Shot {
    radius = 4 * RADIUSMUL;
    initialSpeed = 32;
    initialVelMul = .8;
    velmul = .99;

    static isStandardShot = false;

    hitVelMul = .45;
    hitDamage = 0;

    maxAge = 35;
    connectedMaxAge = 0;
    stuckMaxAge = 200;
    static cooldown = 23;

    fadeWithAge = true;

    picture = new Picture([
        new Shape([
            new Point(-1,  0),
            new Point( 1,  0),
        ], {fill: false}),
        new Shape([
            new Point( 0, -1),
            new Point( 0,  1),
        ], {fill: false}),
    ]);

    circleLineWidth = 3;
    circleStrokeStyle = 'rgba(100,255,255,.7)';
    inheritTeamColor = false;

    otherEnd = null;
    isFirstEnd = false;

    // ropeLen: set when two ends are connected (so, when otherEnd is set).
    // Only used by the end which isFirstEnd.
    ropeLen = 0;

    stickTarget = null;

    die() {
        // Do this first so that this.dead is true, preventing this.otherEnd
        // from trying to call this.die() again (and causing an infinite loop)
        super.die();

        // The two ends die together
        if(this.otherEnd && !this.otherEnd.dead) {
            this.otherEnd.die();
        }
    }
    hit(other) {

        // Don't try to stick to something if we're already sticking
        // to something
        if(this.stickTarget) return;

        // Don't try to stick to something this rope is already sticking to
        if(this.otherEnd && this.otherEnd.stickTarget === other) return;

        other.vel.addMul(this.vel, this.hitVelMul);
        other.damage(this.hitDamage, this);
        this.emitEffects(this.hitEffectClass, 2, {
            speed_min: 2,
            speed_max: 4,
            velmul: .75,
        });

        this.addStickTarget(other);
    }
    step() {
        if(this.stickTarget && this.stickTarget.removed) this.die();

        if(this.otherEnd && this.isFirstEnd) {
            var thisTarget = this.stickTarget? this.stickTarget: this;
            var otherTarget = this.otherEnd.stickTarget?
                this.otherEnd.stickTarget: this.otherEnd;
            thisTarget.spring(otherTarget, this.ropeLen, {mul: .05});
        }

        if(this.stickTarget) {
            this.pos.copy(this.stickTarget.pos);
            this.vel.copy(this.stickTarget.vel);
        }

        super.step();
    }
    addStickTarget(stickTarget) {
        this.stickTarget = stickTarget;
        this.addMaxAge(this.stuckMaxAge);
        if(this.otherEnd) {
            var firstEnd = this.isFirstEnd? this: this.otherEnd;
            firstEnd.ropeLen += stickTarget.radius;
        }
    }
    addMaxAge(n) {
        if(this.otherEnd && this.otherEnd.isFirstEnd) {
            // The "first end" is in control of aging for both ends.
            this.otherEnd.maxAge += n;
        } else {
            this.maxAge += n;
        }
    }
    addOtherEnd(other) {
        this.isFirstEnd = true;
        this.ropeLen = this.pos.dist(other.pos, this.field.size);

        this.otherEnd = other;
        other.otherEnd = this;

        // We take on other's maxAge, e.g. in case it has already been
        // stuck to something, which adds this.stuckMaxAge, and we don't
        // want to lose that when we set other.maxAge to -1 (see below).
        this.maxAge += other.maxAge;

        this.maxAge += this.connectedMaxAge;

        // this and other are now connected, and we'd like them both
        // to die at the exact same time.
        // So we set other.maxAge to -1, which means it will not die
        // from old age.
        // So "the first end" is "in charge" of both ends' ages, as it were.
        other.maxAge = -1;
    }
    renderRope(canvas, camera, addx, addy) {

        // Only one end needs to render the rope
        if(this.otherEnd && this.otherEnd.isFirstEnd) return;

        // maxFade: don't set fade lower than 1 - maxFade, that
        // would be too close to 0, so we wouldn't be able to see
        // the Entity
        var maxFade = .85;
        var fade = 1 - (this.age / this.maxAge) * maxFade;

        var strokeStyle = 'rgba(220,200,100,.75)';
        var lineWidth = 2;
        var otherEnd = this.ship;
        if(this.otherEnd) {
            lineWidth = 3;
            otherEnd = this.otherEnd;
        }

        this.renderLineTo(canvas, camera, addx, addy, otherEnd,
            strokeStyle, lineWidth, fade);
    }
    renderPicture(canvas, camera, addx, addy) {
        this.renderRope(canvas, camera, addx, addy);
        super.renderPicture(canvas, camera, addx, addy);
    }
}

class BoreShot extends Shot {
    radius = 6 * RADIUSMUL;
    initialSpeed = 16;
    initialVelMul = .9;
    velmul = .965;

    hitVelMul = .5;
    hitDamage = 15;

    maxAge = 20;
    static cooldown = 50;

    static vibrateDuration = 350;
    static vibrateWeakMagnitude = .2;
    static vibrateStrongMagnitude = .6;

    picture = new Picture([
        new Shape([
            new Point( 1 ,  0),
            new Point( .5, -1),
            new Point(-1 , -1),
            new Point(-1 ,  1),
            new Point( .5,  1),
        ]).mulxy(1, .5),
    ]);

    dig_gold_chance = .25;

    hit(other) {
        if(other instanceof Rock) {
            this.dig(other);
            this.die();
        } else {
            super.hit(other);
        }
    }
    die() {
        this.emitEffects(SmokeEffect, 3, {
            speed_min: 3,
            speed_max: 6,
            velmul: .65,
        });
        super.die();
    }
}
