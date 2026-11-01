'use strict';

var RENDER_CIRCLES = getBoolParam('render_circles');
var RENDER_BOUNDARY = getBoolParam('render_boundary');
var VELMUL = getFloatParam('velmul', .7); // multiplier for vel when being added to pos
var ADDVELMUL = getFloatParam('addvelmul', 0); // number between 0 and 1, increases velmul towards 1
var ROTVELMUL = getFloatParam('rotvelmul', .5);
var MAXSPEED = getFloatParam('maxspeed', 80);
var RADIUSMUL = getFloatParam('radiusmul', 2);
var MAX_ROT_VEL = getFloatParam('maxrotvel', Math.PI / 5);

var SLOMO = getFloatParam('slomo', 0); // number between 0 and 1, slows down physics
VELMUL = linear(VELMUL, 0, SLOMO);
ADDVELMUL = linear(ADDVELMUL, 1, SLOMO);

class FieldParticle extends Particle {
    /* A particle which lives on a field. */

    radius = 10 * RADIUSMUL;

    constructor(field) {
        super();
        this.field = field;
        this.modulo = field.size;
    }
    dist(other) {
        return this.pos.dist(other.pos, this.field.size);
    }
    angle(other) {
        return this.pos.angle(other.pos, this.field.size);
    }
    stepPhysics() {
        // Make sure we don't go too fast
        var maxspeed = MAXSPEED;
        var speed = this.vel.dist();
        if(speed > maxspeed) this.vel.mul(maxspeed / speed);

        this.pos.addMul(this.vel, VELMUL).modulo(this.field.size);
    }
}

class Sprite extends FieldParticle {
    /* Represents a Particle which can be drawn onto a <canvas>. */

    shouldRenderCircle = false;
    shouldRenderCircleLine = true;
    circleStrokeStyle = 'rgb(0,200,0)';
    circleFillStyle   = 'rgba(255,255,255,.15)';
    circleLineWidth = 2;

    shouldRenderTrail = false;
    trailStart = 0;
    trailEnd   = 1;
    trailCamVel = 1;
    trailStrokeStyle = 'rgba(255,150,0,25)';
    trailLineWidth = 2;

    picture = null; /* instanceof Picture */

    render(canvas, camera) {
        var fieldx = this.field.size.x;
        var fieldy = this.field.size.y;
        var addx0 = this.pos.x < fieldx / 2? 0: -fieldx;
        var addy0 = this.pos.y < fieldy / 2? 0: -fieldy;

        for(var addx = addx0; addx <= addx0 + fieldx; addx += fieldx) {
            for(var addy = addy0; addy <= addy0 + fieldy; addy += fieldy) {
                this._render(canvas, camera, addx, addy);
            }
        }
    }
    _render(canvas, camera, addx, addy) {
        if(this.shouldRenderTrail) {
            this.renderTrail(canvas, camera, addx, addy);
        }
        if(this.shouldRenderCircle || RENDER_CIRCLES) {
            this.renderCircle(canvas, camera, addx, addy);
        }
        if(this.picture) {
            this.renderPicture(canvas, camera, addx, addy);
        }
    }
    renderPicture(canvas, camera, addx, addy) {
        this.picture.renderEntity(this, canvas, camera, addx, addy);
    }
    renderTrail(canvas, camera, addx, addy) {
        var x0 = this.pos.x + addx;
        var y0 = this.pos.y + addy;
        var x1 = x0 - this.vel.x + camera.vel.x * this.trailCamVel;
        var y1 = y0 - this.vel.y + camera.vel.y * this.trailCamVel;
        var trail_x0 = linear(x0, x1, this.trailStart);
        var trail_y0 = linear(y0, y1, this.trailStart);
        var trail_x1 = linear(x0, x1, this.trailEnd);
        var trail_y1 = linear(y0, y1, this.trailEnd);

        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = this.trailStrokeStyle;
        ctx.lineWidth = this.trailLineWidth;
        ctx.beginPath();
        ctx.moveTo(trail_x0, trail_y0);
        ctx.lineTo(trail_x1, trail_y1);
        ctx.stroke();
    }
    renderCircle(canvas, camera, addx, addy) {
        var x0 = this.pos.x + addx;
        var y0 = this.pos.y + addy;
        var ctx = canvas.getContext('2d');

        ctx.strokeStyle = this.circleStrokeStyle;
        ctx.lineWidth = this.circleLineWidth;
        ctx.fillStyle = this.circleFillStyle;
        renderCircle(ctx, x0, y0, this.rot, this.radius);
    }
    renderLineTo(canvas, camera, addx, addy, other, strokeStyle, lineWidth, alpha) {
        strokeStyle = getDefault(strokeStyle, 'rgb(255,255,255)');
        lineWidth = getDefault(lineWidth, 1);
        alpha = getDefault(alpha, 1);

        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;

        var fieldx = this.field.size.x;
        var fieldy = this.field.size.y;
        var x0 = this.pos.x + addx;
        var y0 = this.pos.y + addy;

        var dx = moduloDiff(this.pos.x, other.pos.x, fieldx);
        var dy = moduloDiff(this.pos.y, other.pos.y, fieldy);
        var x1 = x0 + dx;
        var y1 = y0 + dy;

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

class Entity extends Sprite {
    /* A Sprite which lives on a Field and can move around. */

    _shouldRemove = false;

    // removed: used by other entities with references to this one,
    // so they know they should stop referencing it
    removed = false;

    // addpos: entities can add to each others' addpos during step(),
    // and then addpos is added to pos during stepPhysics().
    // The purpose of this is to avoid modifying pos during step(),
    // because it's used in many calculations, so if it's modified
    // then the interactions between entities would be subtly different
    // depending on the order in which entities' step() is called...
    // Hope you get what I mean.
    addpos = new Point();

    velmul = .95;

    rot = 0;
    rot_vel = 0;
    rotmul = .5;

    step() {
        // To be overridden by subclasses
    }

    getVelMul() {
        // May be overridden by subclasses
        return linear(this.velmul, 1, ADDVELMUL);
    }

    stepPhysics() {
        this.vel.mul(this.getVelMul());

        if(this.rot_vel < -MAX_ROT_VEL) this.rot_vel = -MAX_ROT_VEL;
        if(this.rot_vel > MAX_ROT_VEL) this.rot_vel = MAX_ROT_VEL;
        this.rot += this.rot_vel * ROTVELMUL;
        this.rot_vel *= this.rotmul;

        super.stepPhysics();

        // Add addpos to pos, then reset addpos
        this.pos.add(this.addpos);
        this.addpos.set();
    }

    remove() {
        this._shouldRemove = true;
    }

    cleanup() {
        // May be overridden by subclasses
    }
}

class Field {
    /* Think of "field" in the sense of "playing field".
    It's basically a rectangle within which sprites can fly around.
    The edges of the rectangle "wrap around" (or you can say it's a
    "torus" if you prefer). */

    constructor(game, size) {
        this.game = game;
        this.size = size; // a Point, i.e. (width, height)

        this.entityArrays = [];
        this.cameras = [];

        /* Create a canvas for rendering this Field.
        This canvas is never attached to a parent element, we only
        use it for drawing, then copy its image onto another canvas. */
        this.innerCanvas = document.createElement('canvas');
        this.innerCanvas.width = this.size.x;
        this.innerCanvas.height = this.size.y;
    }

    addCamera() {
        var camera = new Camera(this);
        this.cameras.push(camera);
        return camera;
    }

    removeCamera(camera) {
        removeArrayElem(this.cameras, camera);
    }

    addEntityArray() {
        // Create an Array used to store Entity instances
        // (E.g. Game.ships, Game.rocks, etc)
        var entityArray = [];

        // Add a pending Array of things to be added to the Array at the
        // start of next Field.step
        entityArray.pending = [];

        this.entityArrays.push(entityArray);
        return entityArray;
    }

    innerStep() {
        // Subclasses should override this method
    }

    addPendingEntities(entityArray) {
        if(!entityArray.pending.length) return;
        for(var entity of entityArray.pending) entityArray.push(entity);
        entityArray.pending.length = 0;
    }

    step() {
        for(var entityArray of this.entityArrays) {
            this.addPendingEntities(entityArray);
        }

        for(var entityArray of this.entityArrays) {
            for(var entity of entityArray) entity.step();
        }

        this.innerStep();

        for(var entityArray of this.entityArrays) {
            this.removeEntities(entityArray);
        }

        for(var entityArray of this.entityArrays) {
            for(var entity of entityArray) entity.stepPhysics();
        }
    }

    removeEntities(entityArray) {
        for(var i = 0; i < entityArray.length; i++) {
            var entity = entityArray[i];
            if(entity._shouldRemove) {
                entity.removed = true;
                entity.cleanup();
                entityArray.splice(i, 1);
                i--;
            }
        }
    }

    cleanup() {
        for(var entityArray of this.entityArrays) {
            for(var entity of entityArray) entity.cleanup();
        }
    }

    renderBackground(canvas, camera) {
        // Can be overridden by subclasses
    }

    innerRender(camera) {
        var canvas = this.innerCanvas;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if(RENDER_BOUNDARY) this.renderBoundary(canvas);

        this.renderBackground(canvas, camera);
        for(var entityArray of this.entityArrays) {
            for(var entity of entityArray) entity.render(canvas, camera);
        }
    }

    renderBoundary(canvas) {
        /* Draw a box around the field */
        var ctx = canvas.getContext('2d');
        var w = this.size.x;
        var h = this.size.y;
        ctx.strokeStyle = '#800';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.stroke();
    }

    render(canvas, camera) {
        this.innerRender(camera);
        var innerCanvas = this.innerCanvas;

        var ctx = canvas.getContext('2d');
        var x0 = canvas.width  / 2 - camera.pos.x;
        var y0 = canvas.height / 2 - camera.pos.y;

        x0 = modulo(x0, innerCanvas.width);
        if(x0 > 0) x0 -= innerCanvas.width;
        y0 = modulo(y0, innerCanvas.height);
        if(y0 > 0) y0 -= innerCanvas.height;

        for(var x = x0; x < canvas.width; x += innerCanvas.width) {
            for(var y = y0; y < canvas.height; y += innerCanvas.height) {
                ctx.drawImage(this.innerCanvas, x, y);
            }
        }
    }
}
