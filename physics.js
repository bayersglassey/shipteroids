'use strict';

class Point {
    /* A 2-dimensional point.
    Can also be used to represent the width+height of a rectangle,
    and/or represent the rectangle between (0,0) and (this.x,this.y). */

    constructor(x, y) {
        this.x = getDefault(x, 0);
        this.y = getDefault(y, 0);
    }
    clone() {
        return new Point(this.x, this.y);
    }
    set(x, y) {
        this.x = getDefault(x, 0);
        this.y = getDefault(y, 0);
        return this;
    }
    linear(other, m) {
        this.x = linear(this.x, other.x, m);
        this.y = linear(this.y, other.y, m);
        return this;
    }
    area() {
        return this.x * this.y;
    }
    dist(other, modulo) {
        var x0 = this.x;
        var y0 = this.y;
        var x1 = other? other.x: 0;
        var y1 = other? other.y: 0;

        var dx = Math.abs(x1 - x0);
        var dy = Math.abs(y1 - y0);
        if(modulo) {
            // If modulo is provided, it should be a Point representing
            // a rectangle representing a torus within which this and other
            // are contained.
            if(dx > modulo.x / 2) dx = modulo.x - dx;
            if(dy > modulo.y / 2) dy = modulo.y - dy;
        }
        return Math.sqrt(dx * dx + dy * dy);
    }
    angle(other, modulo) {
        var dx, dy;
        if(other) {
            if(modulo) {
                dx = moduloDiff(this.x, other.x, modulo.x);
                dy = moduloDiff(this.y, other.y, modulo.y);
            } else {
                dx = other.x - this.x;
                dy = other.y - this.y;
            }
        } else {
            dx = this.x;
            dy = this.y;
        }
        if(!dx && !dy) throw new Error("No angle between equal points");
        return Math.atan2(-dy, dx);
    }
    copy(other) {
        this.x = other.x;
        this.y = other.y;
        return this;
    }
    setMidpoint(other) {
        /* Sets this to the midpoint of the a rectangle formed between
        (0,0) and (other.x,other.y). */
        this.x = other.x / 2;
        this.y = other.y / 2;
        return this;
    }
    setRandomWithin(other) {
        /* Sets this to a random point within the rectangle formed between
        (0,0) and (other.x,other.y). */
        this.x = Random.randNumber(other.x);
        this.y = Random.randNumber(other.y);
        return this;
    }
    toString() {
        return "(" + this.x + ", " + this.y + ")";
    }
    validate() {
        // For debugging purposes: call this in places you want to see a
        // stack trace if a point gets an undefined coordinate
        if (notReallyANumber(this.x) || notReallyANumber(this.y)) {
            throw new Error("Invalid point: " + this);
        }
    }
    eq(other) {
        return this.x === other.x && this.y === other.y;
    }
    flip() {
        this.y = -this.y;
        return this;
    }
    addxy(x, y) {
        this.x += getDefault(x, 0);
        this.y += getDefault(y, 0);
        return this;
    }
    add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    addMul(other, mul) {
        this.x += other.x * mul;
        this.y += other.y * mul;
        return this;
    }
    mul(n) {
        this.x *= n;
        this.y *= n;
        return this;
    }
    mulxy(x, y) {
        this.x *= getDefault(x, 1);
        this.y *= getDefault(y, 1);
        return this;
    }
    modulo(other) {
        /* Returns this Point modulo the rectangle between (0,0) and
        (other.x, other.y).
        You can think of this as constraining this Point within the
        torus defined by the rectangle defined by other.
        If you're into that kind of thing. O_o */
        this.x = modulo(this.x, other.x);
        this.y = modulo(this.y, other.y);
        return this;
    }
    rotate(rot) {
        /*
            for(var i = 0; i < 4; i++) {
                var p = new Point(1).rotate(Math.PI * i / 2);
                console.log(p);
            }
            // {x:  1, y:  0}
            // {x:  0, y: -1}
            // {x: -1, y:  0}
            // {x:  0, y:  1}
        */
        var sin = Math.sin(rot);
        var cos = Math.cos(rot);
        var x =  this.x;
        var y = -this.y;
        this.x =  (x * cos - y * sin);
        this.y = -(x * sin + y * cos);
        return this;
    }
    static unit(rotmul) {
        return new this(1).rotate(Math.PI * 2 * rotmul);
    }
    static units(len, array) {
        /* Bit of a wacky function. Basically just used by
        rockWriter. */

        var points = [];
        for(var elem of array) {
            if(typeof elem === 'number') {
                points.push(this.unit(elem / len));
            } else if(elem instanceof Point) {
                points.push(elem.clone());
            } else {
                console.log('Invalid array element', elem);
                throw new Error('Invalid array element');
            }
        }
        return points;
    }
    static mirror(points) {
        var i0 = points.length - 1;
        for(var i = i0; i >= 0; i--) {
            var point = points[i];
            points.push(point.clone().flip());
        }
        return points;
    }
    setSpeed(speed, rot) {
        return this.set(speed).rotate(rot);
    }
    addSpeed(speed, rot) {
        var x = this.x;
        var y = this.y;
        this.setSpeed(speed, rot);
        this.x += x;
        this.y += y;
        return this;
    }
}

class Particle {
    /* Represents a thing with position and velocity. */

    radius = 1;

    modulo = null; // subclasses may override this

    constructor() {
        this.pos = new Point();
        this.vel = new Point();
    }
    stepPhysics() {
        this.pos.add(this.vel);
    }
    repel(other, opts) {
        opts = opts || {};
        var mul = getDefault(opts.mul, 1);

        var dx, dy;
        if(this.modulo) {
            dx = moduloDiff(this.pos.x, other.pos.x, this.modulo.x);
            dy = moduloDiff(this.pos.y, other.pos.y, this.modulo.y);
        } else {
            dx = other.pos.x - this.pos.x;
            dy = other.pos.y - this.pos.y;
        }

        var dist = this.pos.dist(other.pos, this.modulo);

        // Just say no to dividing by zero!
        if(!dist) {
            dist = .01;
            var p = new Point().addSpeed(dist, Random.randRotation());
            dx += p.x;
            dy += p.y;
        }

        var m = -mul / (dist * dist);
        this.vel.x += dx * m;
        this.vel.y += dy * m;
        other.vel.x -= dx * m;
        other.vel.y -= dy * m;
    }
    spring(other, tdist, opts) {
        // tdist: target distance (target spring length)

        opts = opts || {};
        var mul = getDefault(opts.mul, 1);
        var push = getDefault(opts.push, true);

        var dx, dy;
        if(this.modulo) {
            dx = moduloDiff(this.pos.x, other.pos.x, this.modulo.x);
            dy = moduloDiff(this.pos.y, other.pos.y, this.modulo.y);
        } else {
            dx = other.pos.x - this.pos.x;
            dy = other.pos.y - this.pos.y;
        }

        var dist = this.pos.dist(other.pos, this.modulo);

        // Early exit if we're already within target distance, and caller
        // said we shouldn't "push"
        if(!push && dist <= tdist) return;

        // Just say no to dividing by zero!
        if(!dist) {
            dist = .01;
            var p = new Point().addSpeed(dist, Random.randRotation());
            dx += p.x;
            dy += p.y;
        }

        // Vector which would move this to where dist between
        // this and other would be tdist
        var mx = dx / dist * (dist - tdist);
        var my = dy / dist * (dist - tdist);

        // r0, r1: relative "weights" of this and other.
        //    r0 is 0:   only other moves
        //    r0 is 1/2: this & other each move just as much
        //    r0 is 1:   only this moves
        var r0 = getDefault(opts.r0,
            this.radius / (this.radius + other.radius));
        var r1 = 1 - r0;

        this.vel.x += mx * r1 * mul;
        this.vel.y += my * r1 * mul;
        other.vel.x -= mx * r0 * mul;
        other.vel.y -= my * r0 * mul;
    }
}
