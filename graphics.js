'use strict';

function renderCircle(ctx, x0, y0, rot, radius, opts) {
    opts = opts || {};
    var scale = getDefault(opts.scale, 1);
    var scalex = getDefault(opts.scalex, scale);
    var scaley = getDefault(opts.scaley, scale);
    ctx.save();
    {
        ctx.translate(x0, y0);
        ctx.scale(scalex, scaley);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
    }
    ctx.restore();
}

class Text {
    /* Text which can be rendered onto a canvas. */

    constructor(title, lines) {
        this.title = title;
        this.lines = lines;
    }
    clone() {
        return new this.constructor(this.title, this.lines.slice());
    }
    render(canvas) {
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';

        var x = 16;
        var y = 20;

        ctx.font = 'normal bold 24px sans-serif';
        ctx.fillText(this.title, x, y);
        y += 26;

        ctx.font = 'normal 18px monospace';
        for(var line of this.lines) {
            ctx.fillText(line, x, y);
            y += 18;
        }
    }
}

class Shape {
    /* Specifies a polygon to draw on a canvas.
    Each Picture can have multiple Shapes. */

    stroke = true;
    fill = true;
    close = true;

    pos = new Point();
    rot = 0;
    radiusmul = 1;

    points = null; // Array of Point

    constructor(points, props) {
        if(points) this.points = points;
        if(props) for(var name in props) {
            if(name in this) this[name] = props[name];
        }
    }
    static newRect(x0, y0, x1, y1) {
        return new this([
            new Point(x0, y0),
            new Point(x1, y0),
            new Point(x1, y1),
            new Point(x0, y1),
        ]);
    }
    static newPolygon(n_points, opts, props) {
        opts = opts || {};
        var rotVariance = getDefault(opts.rotVariance, 0);
        var radiusVariance = getDefault(opts.radiusVariance, 0);
        var rot = getDefault(opts.rot, 0);

        var points = [];
        for(var i = 0; i < n_points; i++) {
            var i_varied = i + Random.randNumber(-rotVariance, rotVariance);
            var point_rot = (Math.PI * 2) * i_varied / n_points + rot;
            var radius = 1 + Random.randNumber(-.5, .5) * radiusVariance;
            var point = new Point().addSpeed(radius, point_rot);
            points.push(point);
        }
        return new this(points, props);
    }
    clone() {
        var points = this.points.map(p => p.clone());
        var shape = new this.constructor(points);
        shape.pos.copy(this.pos);
        for(var key in this) {
            if(typeof this[key] !== 'object') {
                shape[key] = this[key];
            }
        }
        return shape;
    }
    flip() {
        for(var point of this.points) point.flip();
        return this;
    }
    add(other_point) {
        for(var point of this.points) point.add(other_point);
        return this;
    }
    addxy(x, y) {
        for(var point of this.points) point.addxy(x, y);
        return this;
    }
    mul(n) {
        for(var point of this.points) point.mul(n);
        return this;
    }
    mulxy(x, y) {
        for(var point of this.points) point.mulxy(x, y);
        return this;
    }
}

class Picture {
    radiusmul = 1;

    constructor(shapes, props) {
        this.shapes = shapes || [];
        if(props) for(var name in props) {
            if(name in this) this[name] = props[name];
        }
    }
    clone() {
        var shapes = this.shapes.map(shape => shape.clone());
        var picture = new this.constructor(shapes);
        for(var key in this) {
            if(typeof this[key] !== 'object') {
                picture[key] = this[key];
            }
        }
        return picture;
    }
    static newPolygon(n_points, opts, props) {
        var shape = Shape.newPolygon(n_points, opts);
        return new this([shape], props);
    }
    render(canvas, x0, y0, rot, radius_x, radius_y, opts) {
        opts = opts || {};
        var strokeStyle = getDefault(opts.strokeStyle, 'rgb(255,255,255)');
        var lineWidth = getDefault(opts.lineWidth, 1);
        var fillStyle = getDefault(opts.fillStyle, 'rgba(255,255,255,.25)');

        // Point used for calculations
        var p = new Point();

        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.fillStyle = fillStyle;

        for(var shape of this.shapes) {
            var firstPoint = true;
            ctx.beginPath();
            for(var point of shape.points) {
                p.copy(point)
                    .rotate(shape.rot)
                    .add(shape.pos)
                    .rotate(rot)
                    .mulxy(radius_x, radius_y)
                    .mul(shape.radiusmul)
                    .addxy(x0, y0);
                if(firstPoint) {
                    ctx.moveTo(p.x, p.y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            }
            if(shape.close) ctx.closePath();
            if(shape.stroke) ctx.stroke();
            if(shape.fill) ctx.fill();
        }

    }
    renderEntity(entity, canvas, camera, addx, addy) {
        var x0 = entity.pos.x + addx;
        var y0 = entity.pos.y + addy;
        var rot = entity.rot;
        var radius = entity.radius * this.radiusmul;

        this.render(canvas, x0, y0, rot, radius, radius, {
            strokeStyle: entity.circleStrokeStyle,
            lineWidth: entity.circleLineWidth,
            fillStyle: entity.circleFillStyle,
        });
    }
}

class Writer {
    /* Utility class which converts strings of text into Arrays of
    Picture. */

    constructor(pictures_by_letter) {
        // pictures_by_letter: Object mapping letters (single-character
        // strings) to instances of Picture.
        this.pictures_by_letter = pictures_by_letter;
    }
    getPicture(letter) {
        var picture = this.pictures_by_letter[letter];
        if(!picture) {
            throw new Error(
                'No picture defined for letter: ' + letter);
        }
        return picture;
    }
    getPictures(text) {
        var pictures = [];
        for(var letter of text) {
            var picture = this.getPicture(letter);
            pictures.push(picture.clone());
        }
        return pictures;
    }
}

class BlockyDigits {
    /* Maps digits (single-character strings, e.g. '0') onto Pictures */

    constructor() {
        /* THE "PARTS":

              BBBB
            AA    CC
            AA    CC
              DDDD
            EE    GG
            EE    GG
              FFFF
        */
        this.shapes_by_part = {
            A: Shape.newRect(-1 , -1 , -.5,  0 ),
            B: Shape.newRect(-.5, -1 ,  .5, -.7),
            C: Shape.newRect( .5, -1 ,  1 ,  0 ),

            D: Shape.newRect(-.5, -.2,  .5,  .2),

            E: Shape.newRect(-1 ,  0 , -.5,  1 ),
            F: Shape.newRect(-.5,  .7,  .5,  1 ),
            G: Shape.newRect( .5,  0 ,  1 ,  1 ),
        };
        this.pictures_by_digit = {
            0: this.makePicture('ABCEFG'),
            1: this.makePicture('CG'),
            2: this.makePicture('BCDEF'),
            3: this.makePicture('BCDGF'),
            4: this.makePicture('ACDG'),
            5: this.makePicture('BADGF'),
            6: this.makePicture('BADEFG'),
            7: this.makePicture('BCG'),
            8: this.makePicture('ABCDEFG'),
            9: this.makePicture('BACDG'),
            '[': this.makePicture('BAEF'),
            ']': this.makePicture('BCGF'),
        };
    }
    makePicture(parts) {
        var shapes = [];
        for(var part of parts) {
            var shape = this.shapes_by_part[part];
            if(!shape) throw new Error('Part not found: ' + part);
            shapes.push(shape);
        }
        return new Picture(shapes);
    }
    getPicture(digit) {
        var picture = this.pictures_by_digit[digit];
        if(!picture) {
            throw new Error(
                'No picture defined for digit: ' + digit);
        }
        return picture;
    }
}

var blockyDigits = new BlockyDigits();

var blockyWriter = new Writer({
    E: new Picture([new Shape([
        // Top
        new Point(-1 , -1 ),
        new Point( 1 , -1 ),
        new Point( 1 , -.7),
        new Point(-.5, -.7),

        // Middle
        new Point(-.5, -.2),
        new Point( .5, -.2),
        new Point( .5,  .2),
        new Point(-.5,  .2),

        // Bottom
        new Point(-.5,  .7),
        new Point( 1 ,  .7),
        new Point( 1 ,  1 ),
        new Point(-1 ,  1 ),
    ])]),
    F: new Picture([new Shape([
        // Top
        new Point(-1 , -1 ),
        new Point( 1 , -1 ),
        new Point( 1 , -.7),
        new Point(-.5, -.7),

        // Middle
        new Point(-.5, -.2),
        new Point( .5, -.2),
        new Point( .5,  .2),
        new Point(-.5,  .2),

        // Bottom
        new Point(-.5,  1 ),
        new Point(-1 ,  1 ),
    ])]),
    G: new Picture([new Shape([
        // Top
        new Point( 1 , -.7),
        new Point( .5, -1 ),
        new Point(-.5, -1 ),
        new Point(-1 , -.7),

        // Bottom
        new Point(-1 ,  .7),
        new Point(-.5,  1 ),
        new Point( .5,  1 ),
        new Point( 1 ,  .7),

        // Middle
        new Point( 1 , -.2),
        new Point( 0 , -.2),
        new Point( 0 ,  .2),
        new Point( .5,  .2),
        new Point( .5,  .7),
        new Point(-.5,  .7),
        new Point(-.5, -.7),
    ])]),

    ' ': new Picture(),
    ':': new Picture([
        Shape.newRect(-.25, -.7,  .25, -.2),
        Shape.newRect(-.25,  .2,  .25,  .7),
    ]),
    '/': new Picture([new Shape([
        new Point(-1 ,  1 ),
        new Point(-.8,  1 ),
        new Point( .8, -1 ),
        new Point( 1 , -1 ),
    ])]),

    0: blockyDigits.getPicture('0'),
    1: blockyDigits.getPicture('1'),
    2: blockyDigits.getPicture('2'),
    3: blockyDigits.getPicture('3'),
    4: blockyDigits.getPicture('4'),
    5: blockyDigits.getPicture('5'),
    6: blockyDigits.getPicture('6'),
    7: blockyDigits.getPicture('7'),
    8: blockyDigits.getPicture('8'),
    9: blockyDigits.getPicture('9'),
    '[': blockyDigits.getPicture('['),
    ']': blockyDigits.getPicture(']'),
});
