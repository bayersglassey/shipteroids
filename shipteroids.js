'use strict';


/**************************
* BUGS:

In "Basic Shop" there's an "undefined" item!..

Uncaught Error: No picture defined for letter: -
index.html?players=2&pickup_magnet=2&all_ships=1&x_shot_level=3&y_shot_level=3:4039 Uncaught Error: No picture defined for letter: -
    at Writer.getPicture (index.html?players=2&pickup_magnet=2&all_ships=1&x_shot_level=3&y_shot_level=3:1966:19)
    at Writer.getPictures (index.html?players=2&pickup_magnet=2&all_ships=1&x_shot_level=3&y_shot_level=3:1974:32)
    at Game.renderTextPictures (index.html?players=2&pickup_magnet=2&all_ships=1&x_shot_level=3&y_shot_level=3:3927:31)
    at renderText (index.html?players=2&pickup_magnet=2&all_ships=1&x_shot_level=3&y_shot_level=3:3975:18)
    at Game.renderPlayerStats (index.html?players=2&pickup_magnet=2&all_ships=1&x_shot_level=3&y_shot_level=3:3996:13)
    at Game.renderPlayer (index.html?players=2&pickup_magnet=2&all_ships=1&x_shot_level=3&y_shot_level=3:3907:14)
    at Game.intervalCallback (index.html?players=2&pickup_magnet=2&all_ships=1&x_shot_level=3&y_shot_level=3:4032:50)

*/


/******************************
* IDEAS:
*
* Really big ship (MotherShip) with "gravity"
*
* "Ball and chain" ship (hold attack to send out chain on spring, release
* to have it come back to you)
* Each ball & chain is a separate projectile.
* So, hold 'x' to fire it out; it has a max length & springiness while you
* continue to hold 'x'; but once you release, the spring disappears and the
* ball carries on.
*
* "Snake" ship
*
* Slightly better AI: each CPUPlayer can have 1 target, which is rendered
* as a line. By default, when cpu player is hit, it targets the shot's ship.
* cpu should probably understand the range of its weapons.
* (E.g. crab had better try to get close, others should try to stay within
* a certain range but not too close, etc)
* Some ships override the default behaviour, e.g. Torch tries to lay mines
* within a small area and stay out of trouble.
* It should be possible for cpu to target rocks, but idunno when they would.
* (Moles and Suits should know to try and get into/onto a rock, so they
* target them but don't shoot when targeting a rock.)
*
* Story: you start off with your warp drive broken.
* You need to fix it by shooting open one of the asteroids, exiting your ship,
* flying over to the thing you shot out of the asteroid, collecting it,
* bringing it back to your ship, and fixing the warp drive. (Too much?..)
* Then, you warp.
* You meet somebody. You've come to Deep Space, which is like its own country.
* There are political factions (the different colours of "team").
* Your ship was originally uncoloured, but the person you meet is from the
* green faction. They describe the local gov't situation. You join green team.
* Some people live on asteroids, some on planets.
* Implement little people running around, little households & towns & cities.
* You do various jobs, meet various people, eventually change factions &
* have to come back through areas you had been through before, but this
* time you're on a different team so it's more difficult (areas which had
* been full of allies are now full of enemies).
*
*
* TODO:
*
* !!! finish GamepadControlsMenu !!!
*
* ADD DEBUGGING -- specifically for timing. Need to figure out which parts of
* the code are occasionally slowing down.
*
* Black holes (or... planets?..) which have "gravity", sucking things around
* them towards themselves slightly.
*
* In multiplayer, needs to be easier to find your teammate!
* E.g. if in current area, show a little arrow pointing to teammate if
* they're not on your screen.
* And MapMenu should show you your teammates.
*
* Fixing current "Choose Ship" menu, where you can always get a free ship
* at full health, what if we make it so whenever warping into an area,
* you can choose a ship to use?
* And each ship has persistent hp, and... maybe separate upgrades?..
* So if one of your ships "explodes", you actually still have it, but
* at 0 hp (so you can't warp in with it???) and have to go pay for it
* to be repaired. And then either pay to get it to full hp, or maybe
* after repair it has like 10 hp and you need to go farm rocks for hp.
*
* Improve "AI"
* avoidTarget is currently pretty lame, no shooting so easy to hunt
* them down; better (for most ships) to back away on an angle while shooting.
* Let's have multiple behaviours of various types, e.g. "default", "fearful",
* "aggro".
* Different ship classes use different ones (or perhaps use each with
* different probabilities).
* Some ships stay aggro when low hp, or even go "kamikaze". E.g. Boxer is
* bad at running away.
* Others are super fearful, e.g. mole when not in a rock, maybe Torch?
*
* Saving/loading
*
* When a Field is populated, we should make sure things don't overlap,
* otherwise everything will start immediately rocketing around the screen.
*
* Better instructions, "story"...
* Collectables which affect the map. ("switches"? "keys"?)
* Warping is fiddly, so start game with it disabled.
* So first area, you first must prove that you've learned how to fly around,
* shoot, etc.
* So maybe something like, aside from the "SHIPteroids" rocks in first area,
* there is also some kind of switch thing. Which has no velocity, even if
* rocks hit it. So that you must fly to it, not just get lucky that it
* floats by.
* And you must fly to it and shoot it.
* And that... opens a portal?.. or just like... results in warping being
* unlocked? O_o
*
******************************/


// Query params
var ALL_SHIPS = getBoolParam('all_ships');
var RICH = getBoolParam('rich');
var SHOT_LEVEL = getIntParam('shotlevel');
var X_SHOT_LEVEL = getIntParam('xshotlevel', SHOT_LEVEL);
var Y_SHOT_LEVEL = getIntParam('yshotlevel', SHOT_LEVEL);
var PICKUP_MAGNET = getIntParam('magnet');
var HIDE_TEXT = getBoolParam('hide_text');
var NODAMAGE = getBoolParam('nodamage');
var VIBRATE = !getBoolParam('novibrate');
var N_PLAYERS = getIntParam('players', 1);
var MAX_PLAYERS = 2;
var DEFAULT_GRAVITY = getFloatParam('gravity', 0); // multiplier for planet gravity
var SHIP_ADDVELMUL = getFloatParam('ship_addvelmul', 0); // number between 0 and 1, increases ships' velmul towards 1
var DAMAGEMUL = getFloatParam('damagemul', 1);
var DEFAULT_ROCK_RADIUS = 10 * RADIUSMUL;
var MIN_ROCK_RADIUS = 9 * RADIUSMUL;
var WARP_AFTER_STEPS = getIntParam('warp_after', 35);
var DEFAULT_ADDHP = getFloatParam('addhp', 1 / 40);
var DEFAULT_ADDFUEL = getFloatParam('addfuel', 1 / 80);
var DEFAULT_MAXFUEL = 100;
var MAXGOLD = 999;
var WARP_COLLISION_DAMAGE = getFloatParam('warp_collision_damage', 10);
var WARP_FUEL = getFloatParam('warp_fuel', 10);
var MIN_MAP_NODE_RADIUS = 5;
var MAX_MAP_NODE_RADIUS = 20;
var MAX_SHOT_LEVEL = getIntParam('max_shot_level', 3);
var MAX_PICKUP_MAGNET = getIntParam('max_pickup_magnet', 2);
if(DEBUG) {
    RICH = true;
    ALL_SHIPS = true;
    PICKUP_MAGNET = MAX_PICKUP_MAGNET;
    X_SHOT_LEVEL = MAX_SHOT_LEVEL;
    Y_SHOT_LEVEL = MAX_SHOT_LEVEL;
}

// Game/field default options
var DEFAULT_FIELD_WIDTH  = 1000;
var DEFAULT_FIELD_HEIGHT = 1000;
var DEFAULT_STARS_PER    = 1 /    5000;
var DEFAULT_ROCKS_PER    = 1 /  300000;
var DEFAULT_PLANETS_PER  = 1 / 1000000;
var DEFAULT_SHIPS_PER    = 1 /  500000;
var DEFAULT_STAR_SPEED = 3;
var DEFAULT_ENERGY_CHANCE = .08;
var DEFAULT_FUEL_CHANCE = .12;
var DEFAULT_GOLD_CHANCE = 1;

// Keys used by this game
configureKeys([
    new KeyInfo('u',       'Up'),
    new KeyInfo('d',       'Down'),
    new KeyInfo('l',       'Left'),
    new KeyInfo('r',       'Right'),
    new KeyInfo('x',       'Weapon/ability #1'),
    new KeyInfo('y',       'Weapon/ability #2'),
    new KeyInfo('warp',    'Warp'),
    new KeyInfo('tab',     'View map'),
    new KeyInfo('enter',   'Open menu / make selection'),
]);

// Player keymappings
var DEFAULT_PLAYER_KEYMAPPINGS = {
    0: {
        u:       KEYS.up,
        d:       KEYS.down,
        l:       KEYS.left,
        r:       KEYS.right,
        x:       KEYS.space,
        y:       KEYS.shift,
        warp:    KEYS.bspace,
        tab:     KEYS.tab,
        enter:   KEYS.enter,
    },
    1: {
        u:       KEYS.w,
        d:       KEYS.s,
        l:       KEYS.a,
        r:       KEYS.d,
        x:       KEYS.v,
        y:       KEYS.b,
        warp:    KEYS.y,
        tab:     KEYS.n,
        enter:   KEYS.h,
    },

    // These players have juuust enough keys set that they can
    // open the menu and set up their controls...
    2: {
        u:     KEYS.i,
        d:     KEYS.k,
        enter: KEYS[8],
    },
    3: {
        u:     KEYS.o,
        d:     KEYS.l,
        enter: KEYS[9],
    },
};

// Gamepad button indices for HTML5 Gamepad.buttons
// (Assumes the "standard mapping",
// see: https://w3c.github.io/gamepad/#remapping
// and in particular: https://w3c.github.io/gamepad/standard_gamepad.svg)
var GAMEPAD_BUTTONS = {
    12: 'u',
    13: 'd',
    14: 'l',
    15: 'r',
     0: 'u',
     2: 'd',
     5: 'x',
     7: 'x',
     4: 'y',
     6: 'y',
     8: 'tab',
     9: 'enter',
     3: 'warp',
};

// Axis threshold: value between 0 and 1, past which we
// consider an HTML5 Gamepad axis (e.g. joystick) to be
// "pressed".
// That is, each value in Gamepad.axes can be between -1 and 1,
// but we want to convert that into boolean key presses for "left",
// "right", "up", "down".
var GAMEPAD_AXIS_THRESHOLD = .5;

// teams
class Team {
    constructor(name, color) {
        this.myname = name;
        this.color = color;
    }
}
var TEAMS = new OrderedDict()
    .set('green', new Team('Green', '#0f0'))
    .set('red', new Team('Red', '#f33'))
    .set('blue', new Team('Blue', '#33f'))
    .set('yellow', new Team('Yellow', '#ff0'))
;

class ShipTemplate {
    /* Blueprint for creating a Ship */

    constructor(cls, team) {
        this.cls = cls;
        this.team = team;
    }
}
class FieldTemplate {
    /* Blueprint for creating a Field and populating it with entities (stars,
    rocks, ships, etc). */

    text = null;
    rocksText = null;
    shop = null;

    width = new MinMax(DEFAULT_FIELD_WIDTH);
    height = new MinMax(DEFAULT_FIELD_HEIGHT);

    stars_per = new MinMax(DEFAULT_STARS_PER);
    rocks_per = new MinMax(DEFAULT_ROCKS_PER);
    planets_per = new MinMax(DEFAULT_PLANETS_PER);
    ships_per = new MinMax(DEFAULT_SHIPS_PER);

    rock_radius = new MinMax(7, 32).mul(RADIUSMUL);
    star_speed = new MinMax(
        DEFAULT_STAR_SPEED - 1.6, DEFAULT_STAR_SPEED + 1.5);

    energy_chance = DEFAULT_ENERGY_CHANCE;
    fuel_chance = DEFAULT_FUEL_CHANCE;
    gold_chance = DEFAULT_GOLD_CHANCE;

    ships = new WeightedArray();

    constructor(props) {
        if(props) for(var name in props) {
            if(name in this) this[name] = props[name];
        }
    }
    getSize() {
        return new Point(this.width.getRand(), this.height.getRand());
    }
    clone(props) {
        props = props || {};
        for(var name in this) {
            if(name in props) continue;

            var thisProp = this[name];
            if(thisProp instanceof MinMax) {
                props[name] = thisProp.clone();
            } else if(thisProp instanceof Shop) {
                props[name] = thisProp;
            } else if(thisProp instanceof WeightedArray) {
                props[name] = thisProp.clone();
            } else if(thisProp instanceof Text) {
                props[name] = thisProp.clone();
            } else if(typeof thisProp !== 'object' || thisProp === null) {
                // number, string, null
                props[name] = thisProp;
            } else {
                console.log(this);
                console.log(thisProp);
                throw new Error('Dunno what to do with property: ' + name);
            }
        }
        return new this.constructor(props);
    }
    createInterpolated(other, m) {
        // We create & return a new FieldTemplate whose values are linear
        // interpolations of those in this and other.
        // m: number between 0 and 1 (inclusive).
        // If m is 0, new FieldTemplate's values are exactly this's values.
        // If m is 1, new FieldTemplate's values are exactly other's values.
        // If m is .5, new FieldTemplate's values are halfway between this's
        // and other's values.
        // ...etc.

        var props = {};
        for(var name in this) {
            var thisProp = this[name];
            var otherProp = other[name];
            if(thisProp instanceof MinMax) {
                props[name] = thisProp.createInterpolated(otherProp, m);
            } else if(thisProp instanceof WeightedArray) {
                props[name] = thisProp.clone().addNormalized(otherProp, m);
            } else if(typeof thisProp === 'number') {
                props[name] = linear(thisProp, otherProp, m);
            } else if(
                thisProp instanceof Text ||
                otherProp instanceof Text ||
                thisProp instanceof Shop ||
                otherProp instanceof Shop ||
                typeof thisProp === 'string' ||
                typeof otherProp === 'string'
            ) {
                if(m === 0) props[name] = thisProp;
                else if(m === 1) props[name] = otherProp;
                else if(thisProp === otherProp) props[name] = thisProp;
                else {
                    // Don't bother trying to "interpolate"
                }
            } else if(thisProp === null || otherProp === null) {
                props[name] = null;
            } else {
                console.log(this, other);
                console.log(thisProp, otherProp);
                throw new Error('Dunno what to do with property: ' + name);
            }
        }
        return new FieldTemplate(props);
    }
}

class ShipteroidsField extends Field {

    constructor(game, size) {
        super(game, size);

        this.stars = [];

        this.planets = this.addEntityArray();
        this.ships = this.addEntityArray();
        this.shots = this.addEntityArray();
        this.effects = this.addEntityArray();
        this.rocks = this.addEntityArray();
        this.pickups = this.addEntityArray();

        this.template = null;
        this.shop = null;

        this.cpus = [];
        this.players = [];
    }
    populate(template) {
        this.template = template;

        this.shop = template.shop;

        var area = this.size.area();
        var n_stars = area * template.stars_per.getRand();
        var n_rocks = area * template.rocks_per.getRand();
        var n_planets = area * template.planets_per.getRand();
        var n_ships = area * template.ships_per.getRand();

        /* Add some random stars */
        var star_vel_rot = Random.randRotation();
        var star_speed = template.star_speed.getRand();
        for(var i = 0; i < n_stars; i++) {
            var star = new Star(this);
            this.stars.push(star);

            star.pos.setRandomWithin(this.size);

            /* Each star has a random "distance", as in, how far away it
            is.
            Distance is a number between 0 and 1, with higher numbers
            meaning "further away".
            Stars which are "further away" are darker and move slower,
            to give a bit of parallax-ish effect. */
            var distance = Random.randNumber(0.25, 0.75);
            var color_component = Math.floor(255 * distance);
            star.trailStrokeStyle = 'rgb('
                + color_component + ','
                + color_component + ','
                + color_component + ')';
            star.vel.setSpeed(star_speed * distance, star_vel_rot);
            star.distance = distance;
        }

        /* Sort this.stars by "distance" so that when we iterate over
        it in render(), more distant stars are rendered first, and
        therefore "painted over" by closer stars. */
        this.stars.sort((s1, s2) => Math.sign(s2.distance - s1.distance));

        // Add rocks
        for(var i = 0; i < n_rocks; i++) {
            var radius = template.rock_radius.getRand();
            var rock = this.addRock(Rock, radius);
        }

        // Add planets
        for(var i = 0; i < n_planets; i++) {
            var planet = this.addPlanet(Planet);
        }

        // Add ships
        for(var i = 0; i < n_ships; i++) {
            var ship_template = template.ships.randValue();
            if(!ship_template) continue;

            var player = this.addCPUPlayer();
            player.setTeam(ship_template.team);
            player.createShip(ship_template.cls);
        }

        // Maybe add rocks which spell out some text
        if(template.rocksText) {
            this.addRocksText(template.rocksText);
        }
    }
    addPlayer(player) {
        this.players.push(player);
    }
    removePlayer(player) {
        removeArrayElem(this.players, player);
        this.removeCamera(player.camera);
    }
    addCPUPlayer() {
        var player = new CPUPlayer(this.game, this);
        this.cpus.push(player);
        return player;
    }
    addShip(cls) {
        var entity = new cls(this);
        this.ships.pending.push(entity);
        return entity;
    }
    addShot(cls) {
        var entity = new cls(this);
        this.shots.pending.push(entity);
        return entity;
    }
    addEffect(cls) {
        var entity = new cls(this);
        this.effects.pending.push(entity);
        return entity;
    }
    addRock(cls, radius) {
        radius = getDefault(radius, DEFAULT_ROCK_RADIUS);
        var entity = new cls(this, radius);
        this.rocks.pending.push(entity);
        return entity;
    }
    addPickup(cls) {
        var entity = new cls(this);
        this.pickups.pending.push(entity);
        return entity;
    }
    addPlanet(cls) {
        var entity = new cls(this);
        this.planets.pending.push(entity);
        return entity;
    }
    addRocksText(text) {
        if(!text.length) return;

        var radiusmul = 1.2;

        var pictures = rockWriter.getPictures(text);
        var radius = DEFAULT_ROCK_RADIUS * radiusmul;
        var x0 = this.size.x / 2;
        var y0 = this.size.y / 2 - radius * 2.5;

        var padWidth = 0;
        var w = text.length * (radius * 2) + (text.length - 1) * padWidth;
        var x = x0 - w / 2;
        var y = y0;
        var dx = radius * 2 + padWidth;

        for(var picture of pictures) {

            // Kind of a hack: turn picture.radiusmul into a multiplier for
            // rock's radius, instead of for picture's radius.
            var thisRadius = radius * picture.radiusmul;
            picture.mul = 1;

            var rock = this.addRock(Rock, thisRadius);
            rock.pos.set(x, y);
            rock.vel.set();
            rock.picture = picture;
            rock.rot = 0;
            rock.rot_vel = 0;

            x += dx;
        }
    }
    step() {
        // NOTE: do CPU player stuff before anything else in step()... same
        // as how human players press keys etc before step() is called
        for(var player of this.cpus) player.step();
        super.step();
    }
    innerStep() {
        for(var shot of this.shots) {
            for(var ship of this.ships) {
                if(shot.ship && ship.isAlly(shot.ship)) continue;
                if(shot.colliding(ship)) shot.hit(ship);
                // Don't bother calling handleCollision() with Shots
                // (We might want to in future, though...)
            }
            for(var rock of this.rocks) {
                if(shot.ship && rock.isAlly(shot.ship)) continue;
                if(shot.colliding(rock)) shot.hit(rock);
                // Don't bother calling handleCollision() with Shots
                // (We might want to in future, though...)
            }
        }

        for(var i = 0; i < this.rocks.length; i++) {
            var rock = this.rocks[i];
            for(var j = i + 1; j < this.rocks.length; j++) {
                var other = this.rocks[j];
                if(rock.colliding(other)) {
                    rock.handleCollision(other);
                    other.handleCollision(rock);
                    rock.handleCollisionPhysics(other);
                }
            }
            for(var ship of this.ships) {
                if(rock.colliding(ship)) {
                    rock.handleCollision(ship);
                    ship.handleCollision(rock);
                    rock.handleCollisionPhysics(ship);
                }
            }
            for(var pickup of this.pickups) {
                if(rock.colliding(pickup)) {
                    rock.handleCollision(pickup);
                    pickup.handleCollision(rock);
                    rock.handleCollisionPhysics(pickup);
                }
            }
            if(DEFAULT_GRAVITY) for(var planet of this.planets) {
                rock.gravity(planet, DEFAULT_GRAVITY);
            }
        }

        for(var i = 0; i < this.ships.length; i++) {
            var ship = this.ships[i];
            for(var j = i + 1; j < this.ships.length; j++) {
                var other = this.ships[j];
                if(ship.colliding(other)) {
                    ship.handleCollision(other);
                    other.handleCollision(ship);
                    ship.handleCollisionPhysics(other);
                }
            }
            for(var pickup of this.pickups) {
                if(ship.pickupMagnet && ship.canPickup(pickup)) {
                    var d = ship.dist(pickup) - ship.radius - pickup.radius;
                    if(d <= 50 * RADIUSMUL * ship.pickupMagnet) {
                        pickup.vel.addSpeed(.2 + .2 * ship.pickupMagnet,
                            pickup.angle(ship));
                    }
                }
                if(ship.colliding(pickup)) {
                    ship.handleCollision(pickup);
                    pickup.handleCollision(ship);
                }
            }
            if(DEFAULT_GRAVITY) for(var planet of this.planets) {
                ship.gravity(planet, DEFAULT_GRAVITY);
            }
        }

        for(var i = 0; i < this.pickups.length; i++) {
            var pickup = this.pickups[i];
            for(var j = i + 1; j < this.pickups.length; j++) {
                var other = this.pickups[j];
                if(pickup.colliding(other)) {
                    pickup.handleCollisionPhysics(other);
                }
            }
        }

        for(var i = 0; i < this.planets.length; i++) {
            var planet = this.planets[i];
            for(var j = i + 1; j < this.planets.length; j++) {
                var other = this.planets[j];
                if(planet.colliding(other)) {
                    planet.handleCollisionPhysics(other);
                    // Don't bother calling handleCollision() with Planets
                }
            }
        }

        for(var star of this.stars) star.stepPhysics();
    }
    renderBackground(canvas, camera) {
        for(var star of this.stars) star.render(canvas, camera);
    }
}

var rockWriter = new Writer({
    // I dare you to make sense of the following.
    // (Hint: we're basically chipping each letter out of a decahedron.
    // The points of the decahedron are represented by the numbers 0 through
    // 9, and we use the Point.unit and Point.units helper functions to turn
    // those numbers into points.)

    ' ': new Picture(),
    S: new Picture([new Shape(Point.units(10, [
        new Point(0, -.5), 1, 2, 3, 4,
        new Point(0,  .5), 6, 7, 8, 9,
    ])).mulxy(1, 1.3)]),
    H: new Picture([new Shape(Point.units(10, [
        0, 1, 2,
        Point.unit(2 / 10).addxy(0,  .5),
        Point.unit(3 / 10).addxy(0,  .5), 3, 4,

        5, 6, 7,
        Point.unit(7 / 10).addxy(0, -.5),
        Point.unit(8 / 10).addxy(0, -.5), 8, 9,
    ]))]),
    I: new Picture([new Shape(Point.units(10, [1, 2, 3,  6, 7, 8]), {radiusmul: .9})]),
    P: new Picture([new Shape(Point.units(10, [0, 1, 2, 3, 4,  7, 8,
        Point.unit(0 / 10).addxy(-.6, .2)]))]),
    t: new Picture([new Shape(Point.units(10, [
        Point.unit(1 / 10).addxy(-.2), 2, 3,
        Point.unit(4 / 10).addxy( .2), 4, 5,
        Point.unit(5 / 10).addxy( .5), 7, 8,
        Point.unit(0 / 10).addxy(-.5), 0, 1,
    ]), {radiusmul: 1})]),
    e: new Picture([new Shape(Point.units(10, [0, 1, 2, 3, 4, 5, 6, 7, 8,
        new Point(-.25)]), {radiusmul: .85})]),
    r: new Picture([new Shape(Point.units(10, [0, 1, 2, 3, 4,  6, 7,
        new Point(-.25), new Point(.2, -.2)]), {radiusmul: .85})]),
    o: new Picture([Shape.newPolygon(10, {}, {radiusmul: 1.1})]),
    i: new Picture([new Shape(Point.units(10, [
        Point.unit(6 / 10).addxy(0, -.75), 6, 7, 8, 9,
        Point.unit(9 / 10).addxy(0, -.75),
        new Point(0, -.25), 2, 3,
        new Point(0, -.25),
    ]), {radiusmul: .85}).mulxy(.9, 1.2)]),
    d: new Picture([new Shape(Point.units(10, [
        2, 3,
        Point.unit(3 / 10).addxy(0, .75), 5, 6, 7, 8,
    ]), {radiusmul: 1})]),
    s: new Picture([new Shape(Point.units(10, [
        new Point( .25, -.25), 1, 2, 3, 4,
        new Point(-.25,  .25), 6, 7, 8, 9,
    ])).mulxy(.9, .8)]),
});

var ENERGY_PICTURE = blockyWriter.getPicture('E');
var ENERGY_COLOR = 'rgb(80,200,200)';
var FUEL_PICTURE = blockyWriter.getPicture('F');
var FUEL_COLOR = 'rgb(180,65,0)';
var GOLD_PICTURE = blockyWriter.getPicture('G');
var GOLD_COLOR = 'rgb(255,165,50)';

class Star extends Sprite {
    radius = 3 * RADIUSMUL;
    shouldRenderTrail = true;
    trailLineWidth = 1;
    trailCamVel = 1;
}

class Shotprops {
    /* The "properties" of an Entity's shots for a given keyname,
    e.g. 'x' or 'y'. */

    cooldown = 0; // how long till another shot can be fired
    n_shots = 0; // how many shots have been fired
    level = 0; // as level increases, weapon is more powerful

    step() {
        if(this.cooldown > 0) this.cooldown--;
    }
}

class ShipteroidsEntity extends Entity {
    /* This class used to be called Entity, but it got out of control, and
    currently contains a bunch of stuff which belongs on Rock, stuff which
    belongs on Ship, and a tiiiiny bit of stuff shared by those and a bunch
    of other subclasses.
    TODO: move some stuff off this class onto more specific classes */

    static myname = 'Entity';

    thrustSpeed = 2;
    reverseSpeed = 1.25;
    rotspeed = Math.PI / 25;

    maxAge = -1;
    fadeWithAge = false;

    team = null;
    inheritTeamColor = true;

    shotClass = {
        x: null,
        y: null,
        extra1: null, // No key for this one
    };

    thrustEffectClass = ThrustEffect;
    thrustEffectSpeedMul = 2;
    thrustEffectVelMul = 1;
    thrustEffectEvery = 3;
    thrustEffects = 1;
    thrustEffectPosRot = 0;

    // Set to thrustEffectEvery each time a thrust Effect is created
    thrustEffectCooldown = 0;

    is_warping = false;
    warping_counter = 0;

    static maxhp = -1;

    addhp = DEFAULT_ADDHP;

    // How much of a rock's radius we dig away from it
    dig_radius = 2 * RADIUSMUL;

    // Chance of producing gold when we dig a rock
    dig_gold_chance = 1;

    // How much damage we do to a rock's hp and maxhp by digging it
    dig_maxhp_damage = 10;

    constructor(field) {
        super(field);

        this.hp = this.maxhp = this.constructor.maxhp;

        this.shotprops = {};
        for(var keyname in this.shotClass) {
            this.shotprops[keyname] = new Shotprops();
        };

        this.keys = Key.createKeys();

        this.age = 0;
        this.dead = false;
    }
    getShip() {
        // Return the ship to which we "belong", e.g. this if this
        // is a Ship, or the ship which shot this if this is a Shot,
        // or the mole which is commandeering this if this is a Rock.
        // (To be overridden by subclasses)
        return null;
    }
    getPlayer(includeCPUs) {
        includeCPUs = getDefault(includeCPUs, false);

        for(var player of this.field.players) {
            if(player.entity === this) return player;
        }
        if(includeCPUs) for(var player of this.field.cpus) {
            if(player.entity === this) return player;
        }
        return null;
    }
    setTeam(team) {
        this.team = team;
        if(team && this.inheritTeamColor) {
            this.lineStrokeStyle = team.color;
            this.circleStrokeStyle = team.color;
        }
    }
    isAlly(other) {
        if(this === other) return true;
        if(this.team && this.team === other.team) return true;
        return this._isAlly(other) || other._isAlly(this);
    }
    _isAlly(other) {
        // May be overridden by subclasses
        return false;
    }
    setMaxHp(maxhp) {
        this.maxhp = maxhp;
        if(this.hp > this.maxhp) this.hp = this.maxhp;
    }
    setHp(hp) {
        this.hp = hp > this.maxhp? this.maxhp: hp;
    }
    heal(addhp) {
        if((this.hp += addhp) > this.maxhp) this.hp = this.maxhp;
    }
    damage(hp, other) {
        // hp < 0: this thing is invincible
        if(this.hp < 0) return;

        // hp === 0: this thing is already dead
        // (This check is important so we don't call this.die() multiple
        // times on the same thing, which can e.g. result in a LOT of rocks
        // being generated when this is a Rock)
        if(this.hp === 0) return;

        // IF WE GOT THIS FAR, WE ARE ACTUALLY TAKING DAMAGE

        var m = Math.min(hp / 35, 1);
        this.vibrate(Math.max(1000 * m, 200), m, m/4);

        // Let our player know we took some damage
        var ship = this.getShip();
        var player = ship? ship.getPlayer(true): null;
        if(player && other) {
            var otherShip = other.getShip();
            if(otherShip) player.tookDamage(otherShip);
        }

        if(this instanceof Ship && NODAMAGE) return;

        this.hp -= hp * DAMAGEMUL;
        if(this.hp < 0) this.hp = 0;
        if(!this.hp) {
            this.dieFromDamage();
        }
    }
    dieFromDamage() {
        // Subclasses may want to override this
        this.vibrate(1500, .2, .5);
        this.die();
    }
    die() {
        this.dead = true;
        this.remove();
    }
    gravity(other, mul, opts) {
        mul = getDefault(mul, 1);
        opts = opts || {};

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

        var r0 = this.radius / (this.radius + other.radius);
        var r1 = 1 - r0;

        var m = mul * r1 / Math.max(dist * dist, other.radius);
        this.vel.x += dx * m;
        this.vel.y += dy * m;
    }
    step() {
        for(var keyname in this.shotClass) {
            var shotprops = this.shotprops[keyname];
            shotprops.step();
        }

        if(this.thrustEffectCooldown > 0) this.thrustEffectCooldown--;

        if(this.is_warping) {
            var speed = this.thrustSpeed * 2 / Math.pow(this.getVelMul(), 3);
            this.thrust(speed, this.rot, {cls: null});
            if(this.age % 3 === 0) {
                this.addThrustEffects(speed, this.rot + Math.PI, {
                    cls: WarpEffect,
                    n_effects: 1,
                    velmul: 0,
                    posrot: Math.PI / 2,
                });
            }

            this.warping_counter++;
            if(this.warping_counter > WARP_AFTER_STEPS) {
                this.finishWarp();
            }
        }

        this.handleKeys();
        for(var keyname of KEYNAMES) {
            this.keys[keyname].step();
        }

        this.heal(this.addhp);

        this.age++;
        if(this.maxAge >= 0 && this.age >= this.maxAge) {
            this.die();
        }
    }
    handleKeys() {
        this._handleKeys();
        this.handleShotKeys();
    }
    _handleKeys() {
        // May be overridden entirely, see SuitShip
        if(this.keys.u.wasDown && !this.is_warping) {
            this.thrust(this.thrustSpeed, this.rot);
        }
        if(this.keys.d.wasDown && !this.is_warping) {
            this.thrust(this.reverseSpeed, this.rot + Math.PI);
        }
        if(this.keys.l.wasDown) {
            this.turn(this.rotspeed);
        }
        if(this.keys.r.wasDown) {
            this.turn(-this.rotspeed);
        }
        if(this.keys.warp.wasDown) {
            if(this.canWarp()) {
                var player = this.getPlayer();
                if(player && player.canWarp()) {
                    player.beginWarp();
                }
            }
        }
    }
    handleShotKeys() {
        for(var keyname in this.shotClass) {
            var shotprops = this.shotprops[keyname];
            if(!this.keys[keyname]) continue; // e.g. 'extra1'
            if(this.keys[keyname].wasDown && shotprops.cooldown === 0) {
                this.fire(keyname);
            }
        }
    }
    stepCPUKeys(keys) {
        // Do one step of a CPU player deciding which keys to press/release.
        // NOTE: This is for use when player is not targeting any particular
        // entity, i.e. ship is just kind of flying around aimlessly
        // NOTE: keys is player.keys (presumably this.getPlayer().keys)
        for(var keyname in keys) {
            var key = keys[keyname];
            this.stepCPUKey(key);
        }
    }
    stepCPUKey(key) {
        // Handle CPU player's decision of whether to press/release given key
        if(Math.random() < .1) key.down();
        if(Math.random() < .1) key.up();
    }
    avoidTarget(target, keys) {
        // Attempt to avoid target entity
        // NOTE: keys is player.keys (presumably this.getPlayer().keys)

        keys.u.down();
        keys.d.up();
        keys.l.up();
        keys.r.up();
        keys.x.up();
        keys.y.up();

        var angle = this.angle(target);
        var rot_diff = rotDiff(this.rot, angle) - Math.PI;
        if(rot_diff > 0) {
            // target is to our left
            // Attempt to keep rot_diff at -Math.PI / 2, that is,
            // keep target 90 degrees to our left
            if(rot_diff < Math.PI / 2) keys.r.down();
            else keys.l.down();
        } else {
            // target is to our right
            // Attempt to keep rot_diff at Math.PI / 2, that is,
            // keep target 90 degrees to our right
            if(rot_diff > -Math.PI / 2) keys.l.down();
            else keys.r.down();
        }
    }
    aimForTarget(target, keys) {
        // Attempt to chase & shoot down target entity
        // NOTE: keys is player.keys (presumably this.getPlayer().keys)

        keys.u.up();
        keys.d.up();
        keys.l.up();
        keys.r.up();

        for(var keyname of 'xy') {
            var shotClass = this.shotClass[keyname];

            // If this is a "standard" shot (as in, it goes forwards and
            // does damage), then shoot it.
            keys[keyname].set(shotClass && shotClass.isStandardShot);
        }

        var dist = this.dist(target);
        var tdist = this.idealTargetDist;
        if(dist < tdist) keys.d.down();
        if(dist > tdist) keys.u.down();

        var angle = this.angle(target);
        var rot_diff = rotDiff(this.rot, angle);
        if(rot_diff > 0) {
            // target is to our left
            keys.l.down();
        } else if(rot_diff < 0) {
            // target is to our right
            keys.r.down();
        }
    }
    turn(rot) {
        this.rot_vel += rot;
    }
    thrust(speed, rot, effect_opts) {
        this.vel.addSpeed(speed, rot);
        if(this.thrustEffectCooldown === 0) {
            this.addThrustEffects(speed, rot + Math.PI, effect_opts);
            this.thrustEffectCooldown += this.thrustEffectEvery;
        }
    }
    addThrustEffects(speed, rot, opts) {
        opts = opts || {};
        var cls = getDefault(opts.cls, this.thrustEffectClass);
        var n_effects = getDefault(opts.n_effects, this.thrustEffects);
        var velmul = getDefault(opts.velmul, this.thrustEffectVelMul);
        var speedmul = getDefault(opts.speedmul, this.thrustEffectSpeedMul);
        var posrot = getDefault(opts.posrot, this.thrustEffectPosRot);

        if(!cls) return;

        for(var i = 0; i < n_effects; i++) {
            var effect = this.field.addEffect(cls);

            var addrot = getRotVariance(i, n_effects) * posrot;
            effect.pos.copy(this.pos).addSpeed(this.radius, rot + addrot);

            effect.vel.copy(this.vel)
                .mul(velmul)
                .addSpeed(speed * speedmul, rot);

            effect.rot = rot;
        }
    }
    emitPickup(cls, opts) {
        opts = opts || {};
        var speed_min = getDefault(opts.speed_min, 2);
        var speed_max = getDefault(opts.speed_max, 5);
        var velmul = getDefault(opts.velmul, .75);

        var pickup = this.field.addPickup(cls);
        pickup.rot = this.rot;
        pickup.pos.copy(this.pos);
        var speed = Random.randNumber(speed_min, speed_max);
        pickup.vel.copy(this.vel).mul(velmul)
            .addSpeed(speed, Random.randRotation());

        return pickup;
    }
    emitEffects(cls, n_effects, opts) {
        opts = opts || {};
        var speed_min = getDefault(opts.speed_min, 0);
        var speed_max = getDefault(opts.speed_max, 0);
        var velmul = getDefault(opts.velmul, 0);
        var addx = getDefault(opts.addx, 0);
        var addy = getDefault(opts.addy, 0);

        for(var i = 0; i < n_effects; i++) {
            var effect = this.field.addEffect(cls);
            effect.rot = this.rot;
            effect.pos.copy(this.pos).addxy(addx, addy);
            var speed = Random.randNumber(speed_min, speed_max);
            effect.vel.copy(this.vel).mul(velmul)
                .addSpeed(speed, Random.randRotation());
        }
    }
    fire(keyname) {
        var shotprops = this.shotprops[keyname];
        var cls = this.shotClass[keyname];
        if(!cls) return;

        var serial_i = shotprops.n_shots % cls.serialShots;
        for(var i = 0; i < cls.initialShots; i++) {
            var shot_details = {i: i, serial_i: serial_i, shotprops: shotprops};
            var shot = this.shoot(cls, shot_details);
            this.afterShot(shot, shot_details);
        }

        if(cls.vibrateDuration) {
            this.vibrate(cls.vibrateDuration,
                cls.vibrateWeakMagnitude,
                cls.vibrateStrongMagnitude);
        }

        shotprops.cooldown += cls.cooldown;
        shotprops.n_shots++;
        if (cls.groupShots && shotprops.n_shots >= cls.groupShots) {
            shotprops.n_shots = 0;
            shotprops.cooldown = cls.groupCooldown;
        }
    }
    afterShot(shot, shot_details) {
        // Subclasses may add special behaviour...
        shot.afterShotBy(this, shot_details);
    }
    _shoot(cls) {
        var shot = this.field.addShot(cls);
        shot.ship = this;
        shot.setTeam(this.team);
        shot.pos.copy(this.pos);
        shot.rot = this.rot;
        return shot;
    }
    shoot(cls, shot_details) {

        // shot_i: index of this shot. E.g. if 3 are being fired at once,
        // this one might be 0, 1, or 2.
        var shot_i = shot_details.i;
        var serial_shot_i = shot_details.serial_i;
        var shotprops = shot_details.shotprops;

        var shot = this._shoot(cls);
        shot.applyPowerup(shotprops.level);

        shot.rot = this.rot
            + getRotVariance(shot_i, cls.initialShots)
                * shot.initialRotVariance
            + getRotVariance(serial_shot_i, cls.serialShots)
                * shot.serialRotVariance
            + Random.randNumber(-.5, .5)
                * shot.randomRotVariance;

        var posrot = 0
            + getRotVariance(shot_i, cls.initialShots)
                * shot.initialPosRotVariance
            + getRotVariance(serial_shot_i, cls.serialShots)
                * shot.serialPosRotVariance
            + Random.randNumber(-.5, .5)
                * shot.randomPosRotVariance;

        var speed = shot.initialSpeed
            + Random.randNumber(-.5, 5)
                * shot.randomSpeedVariance;

        var addpos = this.radius;

        if(shot.isReverseShot) {
            addpos = -addpos;
            speed = -speed;
        }

        shot.pos.addSpeed(addpos, shot.rot + posrot);
        shot.vel.copy(this.vel)
            .mul(shot.initialVelMul)
            .addSpeed(speed, shot.rot);
        return shot;
    }
    canCollide(other) {
        if(this === other) return false;
        return this._canCollide(other) && other._canCollide(this);
    }
    _canCollide(other) {
        // Can be overridden by subclasses
        return true;
    }
    colliding(other) {
        if(!this.canCollide(other)) return;
        var d = this.pos.dist(other.pos, this.field.size);
        return d < this.radius + other.radius;
    }
    handleCollision(other) {
        /* We collided with another Entity! Now what?
        (Subclasses are free to answer that question in various ways...) */

        if(this.is_warping && !this.isAlly(other)) {
            this.damage(WARP_COLLISION_DAMAGE);

            // ???...
            // If we don't do this, we could take warp_damage every frame
            // we're touching other...
            other.die();

            other.emitEffects(SmokeEffect, 4, {
                speed_min: 3,
                speed_max: 6,
                velmul: .65,
            });
            other.emitEffects(SparkEffect, 4, {
                speed_min: 3,
                speed_max: 6,
                velmul: .65,
            });
        }
    }
    handleCollisionPhysics(other) {
        /* We collided with another Entity!
        We are both pushed away, and take on some of each others
        velocity.
        NOTE: unlike handleCollision, this method is only called once
        per step for any given pair of entities.
        Subclasses should not override this method. */

        /* r0: number between 0 and 1.
        The closer it is to 1, the larger this.radius is than other.radius.
        If .5, they are equal. */
        var r0 = this.radius / (this.radius + other.radius);
        var r1 = 1 - r0;

        /* Distance between this and other */
        var dist = this.pos.dist(other.pos, this.field.size);

        /* Vibrate players' controllers?? */
        var vib_m = 1 - Math.min(dist / (this.radius + other.radius), 1);
        this.vibrate(Math.max(1000 * vib_m, 200), vib_m * .5 * r1, 0);
        other.vibrate(Math.max(1000 * vib_m, 200), vib_m * .5 * r0, 0);

        /* Avoid div by zero, eh */
        if(dist < .1) {
            dist = .1;
            var p = new Point().addSpeed(dist, Random.randRotation());
            dx += p.x;
            dy += p.y;
        }

        /* Target distance: this and other are just barely touching */
        var tdist = this.radius + other.radius;

        /* dx, dy: shortest vector from this to other, on the torus
        represented by this.field.size */
        var dx = moduloDiff(this.pos.x, other.pos.x, this.field.size.x);
        var dy = moduloDiff(this.pos.y, other.pos.y, this.field.size.y);

        /* mx, my: vector which would move this away from other, to where
        they are just barely touching */
        var mx = dx / dist * (dist - tdist);
        var my = dy / dist * (dist - tdist);

        /* Update addpos */
        var posmul = .5;
        this.addpos.x  += mx * r1 * posmul;
        this.addpos.y  += my * r1 * posmul;
        other.addpos.x -= mx * r0 * posmul;
        other.addpos.y -= my * r0 * posmul;

        /* Update vel */
        var velmul = .7;
        this.vel.x  += mx * r1 * velmul;
        this.vel.y  += my * r1 * velmul;
        other.vel.x -= mx * r0 * velmul;
        other.vel.y -= my * r0 * velmul;

        if(
            /* We are both instances of Ship or Rock */
            (this instanceof Ship || this instanceof Rock) &&
            (other instanceof Ship || other instanceof Rock) &&

            /* We are not BOTH rocks
            (because then we'll just cause each other to spin more
            and more... because rocks always have rotmul = 1) */
            !(this instanceof Rock && other instanceof Rock)
        ) {
            /* Update rot_vel */
            var rot_velmul = .15;
            this.rot_vel  += other.rot_vel * r1 * rot_velmul;
            other.rot_vel += this.rot_vel  * r0 * rot_velmul;
        }
    }
    canDig(rock) {
        return (
            rock.radius - this.dig_radius >= MIN_ROCK_RADIUS &&
            rock.maxhp - this.dig_maxhp_damage > 0
        );
    }
    dig(rock) {
        // NOTE: we assume that this.canDig(rock) was just called, and
        // returned true

        if(Math.random() < this.dig_gold_chance) this.emitPickup(GoldPickup);

        rock.emitEffects(SmokeEffect, 4, {
            speed_min: 3,
            speed_max: 6,
            velmul: .65,
        });

        rock.radius -= this.dig_radius;

        // Reduce rock's *maximum* hp, so we can't just dig and then
        // wait for rock's hp to regenerate...
        rock.setMaxHp(rock.maxhp - this.dig_maxhp_damage);

        // Damage rock with 0 damage, basically just so that if it has
        // a mole controlled by a CPU player, then CPU player will be
        // alerted that it "took damage" from us, so it will target us.
        rock.damage(0, this);
    }
    canWarp() {
        // May be overridden by subclasses
        return !this.is_warping;
    }
    beginWarp() {
        this.is_warping = true;
        this.vel.addSpeed(this.thrustSpeed * 5, this.rot);
    }
    finishWarp() {
        var player = this.getPlayer();
        player.useFuel(WARP_FUEL);
        player.shipHp = this.hp;

        if(player.canWarpImmediately()) {
            // Immediately warp to next area
            player.warp();
        } else {
            // Pop up a menu, so player can choose where to warp to next
            player.setMenu(WarpMapMenu);
        }

        this.die();
    }
    render(canvas, camera) {
        var fade = 1;
        if(this.fadeWithAge && this.maxAge > 0) {
            // maxFade: don't set fade lower than 1 - maxFade, that
            // would be too close to 0, so we wouldn't be able to see
            // the Entity
            var maxFade = .85;
            fade = 1 - (this.age / this.maxAge) * maxFade;
        }

        var ctx = canvas.getContext('2d');
        ctx.globalAlpha = fade;
        super.render(canvas, camera);
        ctx.globalAlpha = 1;
    }
    _render(canvas, camera, addx, addy) {
        super._render(canvas, camera, addx, addy);
        var player = this.getPlayer(true);
        if(player) player.renderEntity(canvas, camera, addx, addy);
    }
    renderCircle(canvas, camera, addx, addy) {
        super.renderCircle(canvas, camera, addx, addy);
        if(this.shouldRenderCircleLine) {
            this.renderCircleLine(canvas, camera, addx, addy);
        }
    }
    renderCircleLine(canvas, camera, addx, addy) {
        /* Render a little line indicating this.rot */
        var x0 = this.pos.x + addx;
        var y0 = this.pos.y + addy;
        var p = new Point(this.radius).rotate(this.rot);
        var x1 = x0 + p.x;
        var y1 = y0 + p.y;
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = this.circleStrokeStyle;
        ctx.lineWidth = this.circleLineWidth;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }
    vibrate(duration, weakMagnitude, strongMagnitude) {
        if(!VIBRATE) return;
        var player = this.getPlayer();
        if(!player) return;
        if(player.gamepad && player.gamepad.vibrationActuator) {
            player.gamepad.vibrationActuator.playEffect("dual-rumble", {
              startDelay: 0,
              duration: duration,
              weakMagnitude: weakMagnitude,
              strongMagnitude: strongMagnitude,
            });
        }
    }
}

class Pickup extends ShipteroidsEntity {
    static myname = 'Pickup';

    radius = 6 * RADIUSMUL;
    velmul = .95;

    circleStrokeStyle = 'rgb(255,255,255,.75)';
    circleFillStyle   = 'rgba(255,255,255,.15)';
    circleLineWidth = 2;

    picture = Picture.newPolygon(3);

    constructor(field) {
        super(field);

        var r = Random.randInt(3);
        this.radius = (4 + r * 1.25) * RADIUSMUL;
        this.pickupAmount = 5 + r * 5;
    }
    handleCollision(other) {
        if(other instanceof Ship && other.canPickup(this)) {
            this.handlePickedUp(other);
        }
        super.handleCollision(other);
    }
    handlePickedUp(other) {
        this.die();
    }
    die() {
        this.emitEffects(PickupEffect, 6, {
            speed_min: 3,
            speed_max: 6,
            velmul: .65,
        });
        super.die();
    }
}

class EnergyPickup extends Pickup {
    static myname = 'Energy';

    circleStrokeStyle = ENERGY_COLOR;
    picture = ENERGY_PICTURE;

    handlePickedUp(other) {
        other.heal(this.pickupAmount);
        super.handlePickedUp(other);
    }
}

class FuelPickup extends Pickup {
    static myname = 'Fuel';

    circleStrokeStyle = FUEL_COLOR;
    picture = FUEL_PICTURE;

    handlePickedUp(other) {
        var player = other.getPlayer();
        if(player) {
            player.addFuel(this.pickupAmount);
        }
        super.handlePickedUp(other);
    }
}

class GoldPickup extends Pickup {
    static myname = 'Gold';

    circleStrokeStyle = GOLD_COLOR;
    picture = GOLD_PICTURE;

    handlePickedUp(other) {
        var player = other.getPlayer();
        if(player) {
            player.addGold(this.pickupAmount);
        }
        super.handlePickedUp(other);
    }
}


class Trinket {
    /* Something with no particular use, which players can obtain */

    constructor(name, description) {
        this.myname = name;
        this.description = description;
    }
}

class Player {
    /* Base class for human and CPU players */

    shipClass = null;

    constructor(game) {
        this.game = game;
        this.entity = null;
        this.team = TEAMS.get('green');
        this.keys = Key.createKeys();
    }
    cleanup() {
        if(this.entity) this.entity.die();
    }
    setTeam(team) {
        this.team = team;
        if(this.entity) this.entity.setTeam(team);
    }
    setEntity(entity) {
        this.unsetEntity();
        this.entity = entity;
        entity.setTeam(this.team);
    }
    unsetEntity() {
        if(!this.entity) return;
        this.entity = null;
    }
    getField() {
        throw new Error('Subclasses should override this method');
    }
    createShip(cls) {
        cls = cls || this.shipClass;
        this.shipClass = cls;

        var field = this.getField();

        var ship = field.addShip(cls);
        ship.pos.setRandomWithin(field.size);
        ship.rot = Random.randRotation();
        this.setEntity(ship);
        return ship;
    }
    _beforeStep() {
        if(this.entity && this.entity.removed) this.entity = null;
    }
    _updateEntityKeys(keys) {
        if(this.entity) Key.copyKeys(keys, this.entity.keys);
    }
    _stepKeys() {
        for(var keyname of KEYNAMES) {
            var key = this.keys[keyname];
            key.step();
        }
    }
    step() {
        this._beforeStep();
        this._updateEntityKeys(this.keys);
        this._stepKeys();
    }
    renderEntity(canvas, camera, addx, addy) {
        // Render any extra stuff around our entity (who has just been
        // rendered).
        // (To be overridden by subclasses)
    }
    tookDamage(other) {
        // What do we do when our entity takes damage from another?
        // (To be overridden by subclasses)
    }
}

class HumanPlayer extends Player {
    /* A human player */

    // trinkets: Array of Trinket
    trinkets = [];

    // shipHp: saved between areas when warping.
    // MAYBE TODO: make a new class, StuffToSave or whatever, so we can
    // save more than just hp?..
    shipHp = null;

    // addmaxhp: whenever a new ship is created for us, add this much to its
    // max hp.
    addmaxhp = 0;

    // increase(Thrust|Reverse|Rot)Speed: integers which, when increased, add
    // a small multiplier to ship's thrustSpeed, reverseSpeed, or rotspeed
    increaseThrustSpeed = 0;
    increaseReverseSpeed = 0;
    increaseRotSpeed = 0;

    // pickupMagnet: integer indicating how strong player's ship's pull on
    // nearby pickups is
    pickupMagnet = PICKUP_MAGNET;

    // (x|y)ShotLevel: integer powerup level for the indicated shot
    // ('x' or 'y').
    // Is used to set Shotprops.level.
    xShotLevel = X_SHOT_LEVEL;
    yShotLevel = Y_SHOT_LEVEL;

    maxfuel = DEFAULT_MAXFUEL;
    fuel = DEFAULT_MAXFUEL / 2;

    maxgold = MAXGOLD;
    gold = RICH? MAXGOLD: 0;

    shipClasses = ALL_SHIPS? SHIP_CLASSES.getValues():
        [FighterShip, ScoutShip, BoxerShip];

    // gamepad_index: index into navigator.getGamepads(), or -1
    gamepad_index = -1;

    // gamepad: an HTML5 Gamepad instance, or null
    // (not really a persistent value, rather it's stored onto player at
    // the start of each step)
    gamepad = null;

    // Slightly hacky, lets us detect keydown events by comparing
    // this.keys.enter.wasDown against this.prevEnterWasDown (key's
    // wasDown value from previous step).
    prevEnterWasDown = false;

    menu = null;

    camera = null;

    constructor(game, canvas, progress) {
        super(game);
        this.canvas = canvas;
        this.progress = progress;

        // gamepad_keys: set directly each step based on gamepad state,
        // as opposed to being manipulated in response to events.
        this.gamepad_keys = Key.createKeys();

        // combined_keys: this.keys unioned with this.gamepad_keys
        this.combined_keys = Key.createKeys();

        this._getOrCreateField();
    }
    cleanup() {
        this._removeFromField();
        if (this.menu) this.menu.cleanup();
        this.game.removeCanvas(this.canvas);

        super.cleanup();
    }
    _removeFromField() {
        /* Removes this player from their current field (if any) */

        var field = this.progress.getField();
        if(!field) return;

        field.removePlayer(this);
        if(!field.players.length) {
            // If we were the last player in field, remove the field from the map
            this.progress.unsetField();
        }
    }
    _getOrCreateField() {
        /* Finds or creates the field for player.progress, and adds player
        to it. */

        var field = this.progress.getField();
        if(!field) {
            var template = this.progress.template;
            var size = template.getSize();

            field = new ShipteroidsField(this.game, size);
            field.populate(template);

            // add field to game.fields *next* step -- not *this* step,
            // because we're probably iterating over game.fields right now!
            this.game.pendingFields.push(field);

            // Store field in this.progress.map
            this.progress.setField(field);
        }

        this.camera = field.addCamera();

        field.addPlayer(this);
        return field;
    }
    getField() {
        /* Overrides Player.getField */
        return this.progress.getField();
    }
    getIndex() {
        // HACK: we assume all players have consistent indices in the
        // game.players Array.
        // That's... probably fine?..
        return this.game.players.indexOf(this);
    }
    addFuel(fuel) {
        this.fuel += fuel;
        if(this.fuel > this.maxfuel) this.fuel = this.maxfuel;
    }
    useFuel(fuel) {
        this.fuel -= fuel;
        if(this.fuel < 0) this.fuel = 0;
    }
    addGold(gold) {
        this.gold += gold;
        if(this.gold > this.maxgold) this.gold = this.maxgold;
    }
    useGold(gold) {
        this.gold -= gold;
        if(this.gold < 0) this.gold = 0;
    }
    canWarp() {
         return this.fuel >= WARP_FUEL;
    }
    beginWarp() {
        this.entity.beginWarp();
    }
    canWarpImmediately() {
        return this.progress.canProceed();
    }
    warp(edge) {
        /* Warp to the next Field */

        edge = getDefault(edge, null);

        this._removeFromField();
        if(edge) {
            // Proceed directly to given edge
            this.progress.setEdge(edge);
        } else {
            // Proceed to next field
            this.progress.proceed();
        }
        var field = this._getOrCreateField();

        if(field.shop) {
            // Do *NOT* "revive" player until they are done shopping!..
            // ShopMenu will handle that when it is closed.
            // That way, player's ship is created with the proper upgrades.
            this.setMenu(ShopMenu);
        } else {
            // "Revive" (create) player's ship after warping.
            this.reviveShip();
        }
    }
    createShip(cls) {
        var ship = super.createShip(cls);
        this.addShipBuffs(ship);
        this.camera.setTarget(ship);
        return ship;
    }
    addShipBuffs(ship) {
        // Tweak ship's properties based on items player has bought

        ship.maxhp += this.addmaxhp;
        ship.hp += this.addmaxhp;

        ship.pickupMagnet += this.pickupMagnet;

        ship.thrustSpeed *= (1 + .65 * this.increaseThrustSpeed);
        ship.reverseSpeed *= (1 + .65 * this.increaseReverseSpeed);
        ship.rotspeed *= (1 + .2 * this.increaseRotSpeed);

        for(var keyname of 'xy') {
            ship.shotprops[keyname].level += this[keyname + 'ShotLevel'];
        }

        // Allow ship to tweak itself based on the buffs, in particular
        // Shotprops.level.
        ship.afterAddShipBuffs();
    }
    reviveShip() {
        // "Revive" the ship "killed" when you warped from previous area
        var ship = this.createShip();
        if(this.shipHp !== null) ship.setHp(this.shipHp);

        return ship;
    }
    setMenu(cls) {
        var previous = this.menu;
        this.menu = new cls(this);
        this.menu.previous = previous;

        Key.copyKeys(this.combined_keys, this.menu.keys);
        Key.copyKeys(this.combined_keys, this.menu.prevKeys);

        // Unpress all keys so our ship doesn't fly in circles
        // or whatever while menu is open
        if(this.entity) {
            for(var keyname of KEYNAMES) this.entity.keys[keyname].up();
        }
    }
    unsetMenu() {
        if(!this.menu) return;
        this.menu.cleanup();
        this.menu = this.menu.previous;
    }
    step() {
        this._beforeStep();

        if(this.entity && this.fuel < WARP_FUEL) {
            this.addFuel(DEFAULT_ADDFUEL);
        }

        if(this.gamepad) {
            // If a gamepad is connected for this player, update
            // this.gamepad_keys based on gamepad's input
            this.handleGamepadInput();
        } else {
            // Reset gamepad keys if no gamepad is connected
            for(var keyname of KEYNAMES) {
                var gamepad_key = this.gamepad_keys[keyname];
                gamepad_key.up();
            }
        }

        for(var keyname of KEYNAMES) {
            var key = this.keys[keyname];
            var gamepad_key = this.gamepad_keys[keyname];
            this.combined_keys[keyname].copy(key).union(gamepad_key);
            gamepad_key.step();
        }

        // Slightly hacky: figure out whether a keydown event happened for our
        // "enter" key
        var enterWentDown = (
            !this.prevEnterWasDown && this.combined_keys.enter.wasDown);
        this.prevEnterWasDown = this.combined_keys.enter.wasDown;

        if(this.menu) {
            if(this.menu instanceof TabMapMenu && !this.combined_keys.tab.isDown) {
                this.unsetMenu();
            } else {
                Key.copyKeys(this.combined_keys, this.menu.keys);
                this.menu.step();
            }
        } else if(enterWentDown) {
            this.setMenu(MainMenu);
        } else if(this.combined_keys.tab.isDown) {
            this.setMenu(TabMapMenu);
        } else {
            this._updateEntityKeys(this.combined_keys);
        }

        this._stepKeys();
    }
    handleGamepadInput() {
        var gamepad = this.gamepad;

        for(var button_index in GAMEPAD_BUTTONS) {
            var keyname = GAMEPAD_BUTTONS[button_index];
            var key = this.gamepad_keys[keyname];
            var button = gamepad.buttons[button_index];
            if(button.pressed) key.down();
            else key.up();
        }

        var x_axis = gamepad.axes[0];
        var y_axis = gamepad.axes[1];
        this.gamepad_keys.l.set(x_axis < -GAMEPAD_AXIS_THRESHOLD);
        this.gamepad_keys.r.set(x_axis >  GAMEPAD_AXIS_THRESHOLD);
        this.gamepad_keys.u.set(y_axis < -GAMEPAD_AXIS_THRESHOLD);
        this.gamepad_keys.d.set(y_axis >  GAMEPAD_AXIS_THRESHOLD);
    }
}

class CPUPlayer extends Player {

    // The Entity we're currently interested in, or null.
    target = null;

    constructor(game, field) {
        super(game);

        this.field = field;

        // Distance past which we lose interest in our target
        this.max_target_dist = Random.randNumber(150, 300) * RADIUSMUL;

        // fear_hp_percent: hp below which we fear this.target
        this.fear_hp_percent = Random.randNumber(.15, .9);
    }
    getField() {
        /* Overrides Player.getField */
        return this.field;
    }
    getFearHp() {
        return this.fear_hp_percent * this.entity.maxhp;
    }
    isFearful() {
        return this.entity.hp < this.getFearHp();
    }
    getTargetDist() {
        // Distance between our entity and our target
        // (Assumes they both exist)
        return Math.max(0, this.entity.dist(this.target)
            - this.entity.radius - this.target.radius);
    }
    step() {
        this._beforeStep();

        if(this.target && this.target.removed) this.target = null;
        if(this.entity && this.target) {
            var targetDist = this.getTargetDist();
            if(targetDist > this.max_target_dist) this.target = null;
        }

        // Press/release keys
        if(this.entity && this.target) {
            // Bit hacky, this
            if(this.isFearful()) {
                this.entity.avoidTarget(this.target, this.keys);
            } else {
                this.entity.aimForTarget(this.target, this.keys);
            }
        } else if(this.entity) {

            // Entity decides which keys to press/release
            // (Basically so each subclass of Ship can override the default
            // "press random keys" implementation and maybe do something
            // slightly smarter for its shotClasses.
            // TODO: so maybe it's better to implement CPU stuff in CPUPlayer,
            // by switching on entity's shotClasses?..)
            this.entity.stepCPUKeys(this.keys);

        } else {
            for(var keyname in this.keys) {
                var key = this.keys[keyname];
                key.up();
            }
        }

        super.step();
    }
    renderEntity(canvas, camera, addx, addy) {
        super.renderEntity(canvas, camera, addx, addy);

        if(this.entity && this.target) {
            var targetDist = this.getTargetDist();

            var strokeStyle = 'rgba(255,200,255,.5)';
            var lineWidth = 2;
            if(this.isFearful()) {
                strokeStyle = 'rgba(200,0,200,.5)';
            }

            var fade = Math.max(.25, 1 - targetDist / this.max_target_dist);
            this.entity.renderLineTo(canvas, camera, addx, addy, this.target,
                strokeStyle, lineWidth, fade);
        }
    }
    tookDamage(other) {
        super.tookDamage(other);
        if(this.entity && other && !this.entity.isAlly(other)) {
            this.target = other;
        }
    }
}

class ShipteroidsGame extends Game {

    constructor(map, canvas_container, controls_elem) {
        super(canvas_container);
        this.map = map;
        this.controls_elem = controls_elem;

        this.players = [];
        this.fields = [];
        this.pendingFields = [];
    }
    addPlayer() {
        var canvas = this.addCanvas();
        this._updateCanvasWidths(this.players.length + 1);

        var player = this._addPlayer(canvas);
        var field = player.getField();

        if(field.shop) player.setMenu(ShopMenu);
        else player.setMenu(ChooseShipMenu);

        var keymapping = getDefault(
            DEFAULT_PLAYER_KEYMAPPINGS[player.getIndex()], null);
        if(keymapping) this.mapKeys(player.keys, keymapping);

        return player;
    }
    _addPlayer(canvas, progress) {
        if(!progress) progress = new MapProgress(this.map);

        var player = new HumanPlayer(this, canvas, progress);
        this.players.push(player);

        // Slight hack: setting this here, instead of HumanPlayer's
        // constructor, so that getIndex returns correct value
        player.gamepad_index = player.getIndex();

        return player;
    }
    _updateCanvasWidths(n_players) {
        n_players = getDefault(n_players, this.players.length);
        for(var canvas of this.canvases) {
            var players_per_row = Math.min(n_players, 2);
            canvas.style.maxWidth = String(
                Math.floor(100 / players_per_row)) + '%';
        }

        if(n_players > 1) {
            // HACKY MULTIPLAYER INTERFACE... just remove the controls :P
            this.controls_elem.style.display = 'none';
        } else {
            this.controls_elem.style.display = '';
        }
    }
    removePlayer() {
        // NOTE: you can only remove the last player, not an arbitrary
        // one. That's because we rely on players' indices into game.players,
        // see HumanPlayer.getIndex().

        if(this.players.length <= 1) throw new Error("Can't have no players");

        var player = this.players[this.players.length - 1];
        player.cleanup();
        this.players.pop();
        this._updateCanvasWidths();
    }
    step() {
        // Overrides Game.step()

        // Unset player.gamepad for all players.
        for(var player of this.players) player.gamepad = null;

        // Maybe poll for gamepads, and set player.gamepad for players
        // with a connected gamepad.
        if(this.gamepadsConnected) {
            var gamepads = navigator.getGamepads();
            for(var player of this.players) {
                player.gamepad =
                    getDefault(gamepads[player.gamepad_index], null);
            }
        }

        this.map.step();

        for(var player of this.players) player.step();

        if(this.pendingFields.length) {
            for(var field of this.pendingFields) this.fields.push(field);
            this.pendingFields.length = 0;
        }

        for(var i = 0; i < this.fields.length; i++) {
            var field = this.fields[i];
            field.step();
            if(!field.players.length) {
                // Remove fields which have no remaining references to them
                // (i.e. all players have warped out)
                field.cleanup();
                removeArrayElem(this.fields, field);
                i--;
                continue;
            }
        }

        super.step();
    }
    render() {
        // Overrides Game.render()
        for(var player of this.players) this.renderPlayer(player);
    }
    renderPlayer(player) {
        var canvas = player.canvas;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var field = player.getField();
        field.render(canvas, player.camera);

        if(player.menu) {
            player.menu.render(canvas);
        } else {
            var text = player.progress.template.text;
            if(text && !HIDE_TEXT) text.render(canvas);
        }

        this.renderPlayerStats(player);
    }
    renderTextPictures(canvas, text, writer, x0, y0, letterWidth, letterHeight, padWidth, padHeight, render_opts) {
        writer = getDefault(writer, blockyWriter);
        x0 = getDefault(x0, 0);
        y0 = getDefault(y0, 0);
        letterWidth = getDefault(letterWidth, 14);
        letterHeight = getDefault(letterHeight, 12);
        padWidth = getDefault(padWidth, 4);
        padHeight = getDefault(padHeight, 4);

        var x = x0;
        var y = y0;

        // "radius" x and y are just half the width * height.
        // Weird nomenclature, but anyway they are ultimately used as
        // multipliers of picture's points' x and y positions.
        var radius_x = letterWidth / 2;
        var radius_y = letterHeight / 2;

        var pictures = writer.getPictures(text);
        for(var picture of pictures) {

            // NOTE: we add radius_x/y (that is, half letter's width/height)
            // to x and y, because the letters' origins are in their centers,
            // but for rendering text we want to treat their top-left
            // corners as their origins.
            picture.render(canvas,
                x + radius_x, y + radius_y,
                0, radius_x, radius_y, render_opts);

            x += letterWidth + padWidth;
        }
    }
    renderPlayerStats(player) {
        var canvas = player.canvas;
        var ctx = canvas.getContext('2d');

        // Arguments to this.renderTextPictures:
        var writer = blockyWriter;
        var letterWidth = 20;
        var letterHeight = 24;
        var padWidth = 4;
        var padHeight = 4;

        // Number of lines of text we plan to render (bit of a hack, this)
        var n_lines = 3;

        var x0 = padWidth * 2;
        var y0 = canvas.height
            - letterHeight * n_lines
            - padHeight * (n_lines - 1)
            - padHeight * 2;
        var x = x0;
        var y = y0;
        var dx = letterWidth + padWidth;
        var dy = letterHeight + padHeight;

        var game = this;
        function renderText(text, strokeStyle) {
            var is_colored = strokeStyle !== undefined;
            strokeStyle = getDefault(strokeStyle, 'rgb(255,255,255)');
            var render_opts = {
                lineWidth: 2,
                strokeStyle: strokeStyle,
                fillStyle: is_colored? 'rgba(255,255,255,.25)':
                    'rgb(255,255,255)',
            };
            game.renderTextPictures(canvas, text, writer, x, y,
                letterWidth, letterHeight, padWidth, padHeight, render_opts);
            x += dx;
        }
        function newline() {
            x = x0;
            y += dy;
        }
        var parseAmount = amount =>
            parseInt(amount).toString().padStart(3, ' ');

        var entity = player.entity;
        if(entity) {
            renderText('E', ENERGY_COLOR);
            var text = ': ' + parseAmount(entity.hp)
                + ' / ' + parseAmount(entity.maxhp);
            if(entity.rock) {
                var rock = entity.rock;
                text += ' [' + parseAmount(rock.hp)
                    + ' / ' + parseAmount(rock.maxhp) + ']';
            }
            renderText(text);
        }
        newline();

        renderText('F', FUEL_COLOR);
        renderText(': ' + parseAmount(player.fuel)
            + ' / ' + parseAmount(player.maxfuel));
        newline();

        renderText('G', GOLD_COLOR);
        renderText(': ' + parseAmount(player.gold));
        newline();
    }
    renderTitle(canvas, title, subtitles) {
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';

        var x = canvas.width / 2;
        var y = canvas.height / 4;

        ctx.font = 'normal bold 40px sans-serif';
        ctx.fillText(title, x, y);
        y += 40;

        if(subtitles) for(var subtitle of subtitles) {
            ctx.font = 'normal bold 20px sans-serif';
            ctx.fillText(subtitle, x, y);
            y += 20;
        }
    }
}

class MainMenu extends OptionsMenu {
    title = "Main menu";

    options = [
        new BranchMenuOption("Choose ship", ChooseShipMenu, undefined, true),
        new BranchMenuOption("Set keyboard controls", KeyboardControlsMenu),
        new BranchMenuOption("Set gamepad controls", GamepadControlsMenu),
        new RunnableMenuOption("Add player", function(option) {
            if(this.game.players.length < MAX_PLAYERS) this.game.addPlayer();
        }),
        new RunnableMenuOption("Remove player", function(option) {
            if(this.game.players.length > 1) this.game.removePlayer();
        }),
    ];

    constructor(player) {
        super(player);
        this.initOptions();
    }
}

class KeyboardControlsMenu extends OptionsMenu {
    /* A menu which allows a player to set their controls. */

    title = "Set keyboard controls";

    // waitingForKey: Key or null.
    // If non-null, should be one of the Key instances in this.player.keys,
    // and we are waiting for player to press a key so that we can remap
    // its keycode.
    waitingForKey = null;

    constructor(player) {
        super(player);

        this.options = KEYINFOS.map(keyinfo =>
            new MenuOption(keyinfo.title, keyinfo, keyinfo.description));

        this.initOptions();
    }
    getOptionTitle(option) {
        var subtitle = option.getTitle();

        var keyinfo = option.value;
        var key = this.player.keys[keyinfo.myname];
        var keyCode = this.game.getKeyCode(key);
        if(key === this.waitingForKey) {
            subtitle += ' [ ...please press a key... ]';
        } else if(keyCode !== -1) {
            subtitle += ' [' + keyCode + ']';
        } else {
            subtitle += ' [ unmapped ]';
        }

        return subtitle;
    }
    _select(option) {
        var keyinfo = option.value;
        var key = this.player.keys[keyinfo.myname];

        this.waitingForKey = key;

        if(this.game.hasOwnProperty('keyDown')) {
            // If game.keyDown is already monkey-patched, that should mean
            // another player was in the process of setting their keys, and
            // we somehow selected one of our keys (probably with a gamepad).
            // So we call the monkey-patch, passing it a magic "unmapped"
            // keyCode value, and causing the monkey-patch to remove itself.
            this.game.keyDown(-1);
        }

        // Delicious HACK: we use Javascript magic to monkey-patch the game's
        // global keydown handler. Wheeeeee
        var menu = this;
        var game = this.game;
        game.keyDown = function(keyCode) {
            game.remapKey(key, keyCode);

            // Delete this monkey-patch, so that subsequent references to
            // game.keyDown are resolved to the class method (Game.keyDown)
            delete game.keyDown;

            menu.waitingForKey = null;
            menu.update();
        }
    }
}

class UseGamepadMenuOption extends RunnableMenuOption {
    constructor(gamepad_index) {
        var title = gamepad_index < 0? "Don't use gamepad":
            "Use gamepad #" + (gamepad_index + 1);

        function callback(option) {
            // NOTE: when this function is called, "this" is a Menu
            this.player.gamepad_index = option.gamepad_index;
        }

        super(title, callback);

        this.gamepad_index = gamepad_index;
    }
}

class GamepadControlsMenu extends OptionsMenu {
    /* A menu which allows a player to set their controls. */

    title = "Set gamepad controls";

    options = [
        new UseGamepadMenuOption(0),
        new UseGamepadMenuOption(1),
        new UseGamepadMenuOption(2),
        new UseGamepadMenuOption(3),
        new UseGamepadMenuOption(-1),
    ];

    constructor(player) {
        super(player);
        this.initOptions();
    }
    getOptionTitle(option) {
        var subtitle = option.getTitle();

        if(this.player.gamepad_index === option.gamepad_index) {
            subtitle = '[' + subtitle + ']';
        }

        return subtitle;
    }
}

class ShopMenu extends OptionsMenu {
    finish_text = 'Leave the shop';

    constructor(player) {
        super(player);

        var field = this.player.getField();
        this.shop = field.shop;
        this.title = this.shop.myname;
        this.description = this.shop.description;

        this.options = this.shop.items.map(item =>
            new MenuOption(item.myname, item, item.description));

        this.initOptions();
    }
    update() {
        super.update();

        var selected_option = this.getSelectedOption();

        if(selected_option) {
            var item = selected_option.value;
            var cantBuy = item.cantBuy(this.player);
            if(cantBuy) {
                this.subtitles.push('');
                this.subtitles.push(
                    "[Can't buy this: " + cantBuy + ']');
            }
        }
    }
    getOptionTitle(option) {
        var item = option.value;

        var subtitle = item.myname + ' (' + item.price + ' G)';
        if(item.wasBoughtBy(this.player)) {
            subtitle = '[BOUGHT] ' + subtitle;
        } else if(item.price > this.player.gold) {
            subtitle = '[CAN\'T AFFORD] ' + subtitle;
        } else if(item.cantBuy(this.player)) {
            subtitle = '[CAN\'T BUY] ' + subtitle;
        }
        return subtitle;
    }
    _select(option) {
        var item = option.value;
        if(item && !item.cantBuy(this.player)) {
            item.buy(this.player);
        }
    }
    finish() {
        // That is, "leave the shop"

        super.finish();

        if(!this.player.shipClass) {
            // HACK: if player hasn't chosen a ship yet, let them do so now.
            // This is just so that you can start the game at a shop node,
            // allowing you to buy upgrades first, *then* pick a ship (and
            // have the upgrades correctly applied to the ships created by
            // ChooseShipMenu).
            this.player.setMenu(ChooseShipMenu);
        } else {
            // When warping to an area with a shop, ShopMenu is opened and
            // players are *not* revived.
            // Now that we are closing ShopMenu, we revive the players.
            // Their ships will be created with any upgrades they bought.
            this.player.reviveShip();
        }
    }
}

class ChooseShipMenu extends Menu {
    ship_class_i = 0;

    // Array of string, set by this.updateShipClass()
    subtitles = null;

    constructor(player) {
        super(player);

        this.ship_class_i = player.shipClass === null?
            0: player.shipClasses.indexOf(player.shipClass);

        this.updateShipClass();
    }
    render(canvas) {
        this.game.renderTitle(canvas, 'Get Ready', this.subtitles);
    }
    keyDown(keyname) {
        if(keyname === 'l') {
            this.ship_class_i = modulo(this.ship_class_i - 1,
                this.player.shipClasses.length);
            this.updateShipClass();
        } else if(keyname === 'r') {
            this.ship_class_i = modulo(this.ship_class_i + 1,
                this.player.shipClasses.length);
            this.updateShipClass();
        } else if(keyname === 'enter') {
            this.player.unsetMenu();
        }
    }
    updateShipClass() {
        var old_ship = this.player.entity;

        var cls = this.player.shipClasses[this.ship_class_i];
        var ship = this.player.createShip(cls);

        // Point the ship upwards
        ship.rot = Math.PI / 2;

        var field = this.player.getField();

        if(old_ship) {
            ship.pos.copy(old_ship.pos);
            ship.vel.copy(old_ship.vel);
            ship.rot = old_ship.rot;

            old_ship.remove();

            // HACK: old_ship has only been marked for removal, we now
            // manually call the function which truly removes it.
            // We do this because otherwise, the old and new ships
            // coexist for one frame, which is enough time for them
            // to collide with each other...
            field.removeEntities(field.ships);
        } else {
            var i = this.player.getIndex();
            var addx = i * 14 * RADIUSMUL * 2;
            ship.pos.setMidpoint(field.size).addxy(addx);
        }

        // Reset camera's position to that of ship
        this.player.camera.initFromTarget();

        this.subtitles = [];
        this.subtitles.push('Choose your ship');
        switch(this.player.getIndex()) {
            case 0:
                this.subtitles.push('(Left/right arrow keys + Enter)');
                break;
            case 1:
                this.subtitles.push('(Z/C keys + H)');
                break;
            default: break;
        }
        this.subtitles.push('[' + cls.myname + ']');
    }
}

class MapMenu extends Menu {
    /* A menu which shows this.player.progress */

    node = null;
    edge_i = 0;

    // edge: calculated by updateEdge() based on node, edge_i
    // (Never null!)
    edge = null;

    // text: instance of Text, calculated by updateEdge()
    text = null;

    constructor(player) {
        super(player);

        var progress = player.progress;
        var node = progress.node;
        var edge = progress.edge;
        var edge_i = edge? node.getEdgeIndex(edge): 0;
        this.setNode(node, edge_i);
    }
    updateEdge() {
        var n_edges = this.node.numEdges();
        var edge_i = modulo(this.edge_i, n_edges);
        this.edge = this.node.getEdge(edge_i);
        this.updateText();
    }
    updateText() {
        var title = this.node.title;
        var lines = [];

        var progress = this.player.progress;
        var node1 = this.edge.getNode1();
        if(progress.edge && this.edge === progress.edge) {
            lines.push('Travelling to: ' + node1.title);
            lines.push(
                'Progress: ' + progress.edgeDist
                + ' / ' + progress.edge.getLen());
        } else {
            lines.push('Towards: ' + node1.title);
            lines.push('Distance: ' + this.edge.getLen());
        }

        if(this.node.description.length) {
            lines.push('');
            lines = lines.concat(this.node.description);
        }

        this.addControls(lines);

        this.text = new Text(title, lines);
    }
    addControls(lines) {
        lines.push('');
        lines.push('Left/right: select branch');
    }
    setNode(node, edge_i) {
        this.node = node;
        this.edge_i = getDefault(edge_i, 0);
        this.updateEdge();
    }
    keyDown(keyname) {
        if(keyname === 'l') {
            this.edge_i--;
            this.updateEdge();
        } else if(keyname === 'r') {
            this.edge_i++;
            this.updateEdge();
        }
    }
    render(canvas) {
        var ctx = canvas.getContext('2d');

        this.text.render(canvas);

        var progress = this.player.progress;
        var map = progress.map;

        var pos0 = this.node === progress.node?
            progress.getPos(): this.node.pos;

        var x0 = canvas.width / 2 - pos0.x;
        var y0 = canvas.height / 2 - pos0.y;

        // Point used for calculations
        var p = new Point();

        for(var node of map.nodes) {
            var x = x0 + node.pos.x;
            var y = y0 + node.pos.y;
            var radius = node.radius;
            var strokeStyle = node.strokeStyle;
            var fillStyle = node.fillStyle;
            var lineWidth = 3;

            if(node === this.node) {
                strokeStyle = '#fff';
                lineWidth += 2;
            }

            ctx.strokeStyle = strokeStyle;
            ctx.fillStyle = fillStyle;
            ctx.lineWidth = lineWidth;
            renderCircle(ctx, x, y, 0, radius);

            for(var edge of node.edges) {
                var node2 = edge.node1;
                var edgeAngle = node.pos.angle(node2.pos);
                var x2 = x0 + node2.pos.x;
                var y2 = y0 + node2.pos.y;
                var strokeStyle = edge.strokeStyle;
                var lineWidth = 2;

                if(edge === this.edge.edge) {
                    strokeStyle = '#fff';
                    lineWidth += 2;
                }

                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = strokeStyle;
                ctx.fillStyle = 'rgba(255,255,255,.2)';

                // Draw the edge's line
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x2, y2);
                ctx.closePath();
                ctx.stroke();

                // arrowPointSideLen: length in pixels of side of arrow's point
                var arrowPointSideLen = 12
                    * linear(node.radius, node2.radius, .75) / MAX_MAP_NODE_RADIUS
                    * edge.len;

                // arrowPointAngle: the angle of the arrow's point
                // (the smaller this is, the pointier the arrow is)
                var arrowPointAngle = Math.PI / 5;

                // arr_x, arr_y: the point of the arrow (partway between edge's
                // start and end nodes)
                var arr_m = .75;
                var arr_x = linear(x, x2, arr_m);
                var arr_y = linear(y, y2, arr_m);

                // Draw the edge's arrow
                ctx.beginPath();
                ctx.moveTo(arr_x, arr_y);
                p.set(arr_x, arr_y).addSpeed(arrowPointSideLen,
                    edgeAngle + arrowPointAngle / 2 + Math.PI);
                ctx.lineTo(p.x, p.y);
                p.set(arr_x, arr_y).addSpeed(arrowPointSideLen,
                    edgeAngle - arrowPointAngle / 2 + Math.PI);
                ctx.lineTo(p.x, p.y);
                ctx.lineTo(arr_x, arr_y);
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
            }
        }
    }
}

class TabMapMenu extends MapMenu {
    /* Menu player sees while holding tab (to view the entire map) */

    addControls(lines) {
        super.addControls(lines);
        lines.push('Up        : follow branch');
    }
    keyDown(keyname) {
        if(keyname === 'u') {
            this.setNode(this.edge.getNode1());
        } else {
            super.keyDown(keyname);
        }
    }
}

class WarpMapMenu extends MapMenu {
    /* Menu player uses to choose where to warp to next */

    addControls(lines) {
        super.addControls(lines);
        lines.push('Enter     : finish warping');
    }
    keyDown(keyname) {
        if(keyname === 'enter') {
            // We do this before calling player.warp(), because player.warp()
            // may call player.setMenu(ShopMenu)
            this.player.unsetMenu();

            this.player.warp(this.edge);
        } else {
            super.keyDown(keyname);
        }
    }
}

class Effect extends ShipteroidsEntity {
    static myname = 'Effect';
    fadeWithAge = true;
}

class WarpEffect extends Effect {
    radius = 2 * RADIUSMUL;
    shouldRenderCircle = true;
    shouldRenderCircleLine = false;
    circleStrokeStyle = 'rgba(0,255,255,.75)';
    circleFillStyle = 'transparent';

    velmul = .6;
    maxAge = 20;

    step() {
        this.radius += .5 * RADIUSMUL;
        super.step();
    }
}

class SmokeEffect extends Effect {
    radius = 7 * RADIUSMUL;
    shouldRenderCircle = true;
    shouldRenderCircleLine = false;
    circleStrokeStyle = 'transparent';
    circleFillStyle = 'rgba(200,200,200,.2)';
    velmul = 1;
    maxAge = 20;
}

class PickupEffect extends Effect {
    radius = 4 * RADIUSMUL;

    circleStrokeStyle = 'transparent';
    circleFillStyle = 'rgba(255,255,255,.3)';
    picture = Picture.newPolygon(4);

    velmul = .95;
    maxAge = 20;
}

class SnowflakeEffect extends Effect {
    radius = 4 * RADIUSMUL;

    circleStrokeStyle = 'rgb(255,255,255,.5)';

    picture = new Picture([
        new Shape([
            Point.unit(0 / 6),
            Point.unit(3 / 6),
        ], {fill: false}),
        new Shape([
            Point.unit(1 / 6),
            Point.unit(4 / 6),
        ], {fill: false}),
        new Shape([
            Point.unit(2 / 6),
            Point.unit(5 / 6),
        ], {fill: false}),
    ]);

    velmul = .85;
    maxAge = 20;
}

class FlameSmokeEffect extends SmokeEffect {
    radius = 4 * RADIUSMUL;
    circleFillStyle = 'rgba(75,75,50,.5)';
}

class ThrustEffect extends Effect {
    radius = 5 * RADIUSMUL;
    shouldRenderTrail = true;
    trailEnd = .3;
    trailStrokeStyle = 'rgba(0,255,255,.7)';
    trailLineWidth = 3;
    maxAge = 20;
}

class SmokeThrustEffect extends SmokeEffect {
    radius = 3 * RADIUSMUL;
}

class SparkEffect extends Effect {
    radius = 3 * RADIUSMUL;
    shouldRenderTrail = true;
    trailEnd = .3;
    trailStrokeStyle = 'rgba(255,255,0,.7)';
    trailLineWidth = 3;
    velmul = .95;
    maxAge = 20;
}

class Rock extends ShipteroidsEntity {
    static myname = 'Rock';

    circleStrokeStyle = '#987';
    velmul = 1;
    rotmul = 1;

    mole = null;

    constructor(field, radius) {
        super(field);

        radius = getDefault(radius, DEFAULT_ROCK_RADIUS);
        this.radius = radius;

        var default_hp = 30;
        this.hp = this.maxhp = parseInt(
            default_hp * radius / DEFAULT_ROCK_RADIUS);

        var n_points = Random.randIntInclusive(5, 10);
        this.picture = Picture.newPolygon(n_points,
            {rotVariance: .5, radiusVariance: .1});

        this.pos.setRandomWithin(field.size);

        var speed = Random.randNumber(3.5);
        this.vel.setSpeed(speed, Random.randRotation());

        this.rot_vel = Random.randNumber(-.5, .5) * Math.PI / 40;
    }
    getShip() {
        return this.mole;
    }
    damage(hp, other) {
        if(this.mole) hp /= 2;
        super.damage(hp, other);
    }
    remove() {
        if(this.mole) this.mole.exitRock();
        super.remove();
    }
    dieFromDamage() {
        if(this.radius >= MIN_ROCK_RADIUS) {
            var velmul = .75;
            var n_rocks = 2;
            var addposrot = Random.randRotation();
            for(var i = 0; i < n_rocks; i++) {
                var rock = this.field.addRock(
                    this.constructor, this.radius * .65);
                var posrot = (i / n_rocks) * Math.PI * 2 + addposrot;
                var posradius = this.radius;
                var radiusvelmul = .1;
                rock.pos.copy(this.pos)
                    .addSpeed(posradius, posrot);
                rock.vel.addMul(this.vel, velmul)
                    .addSpeed(posradius * radiusvelmul, posrot);
            }
        }
        this.emitEffects(SmokeEffect, 3, {
            speed_min: 3,
            speed_max: 6,
            velmul: .65,
        });

        if(Math.random() < this.field.template.energy_chance) {
            this.emitPickup(EnergyPickup);
        }
        if(Math.random() < this.field.template.fuel_chance) {
            this.emitPickup(FuelPickup);
        }

        super.dieFromDamage();
    }
}

class Planet extends ShipteroidsEntity {

    shouldRenderCircle = true;
    shouldRenderCircleLine = false;
    circleStrokeStyle = 'transparent';
    circleFillStyle = 'rgb(0,0,255)';

    velmul = 1;
    rotmul = 1;

    constructor(field) {
        super(field);

        this.radius = Random.randNumber(50,200);

        this.circleFillStyle = this.createFillGradient();

        this.pos.setRandomWithin(field.size);

        var speed = Random.randNumber(4,6);
        this.vel.setSpeed(speed, Random.randRotation());

        this.rot_vel = Random.randNumber(-.5, .5) * Math.PI / 40;
    }
    createFillGradient() {

        // HACK?! We create a <canvas> for the sole purpose of generating
        // a CanvasGradient.
        // And then we use this same CanvasGradient with different canvases?..
        // it seems to work okay. I can't find any docs on canvas or
        // CanvasGradient which say it's limited to use with the canvas used
        // to create it.
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        var innerPosSpeed = Random.randNumber(this.radius);
        var innerPos = new Point()
            .addSpeed(innerPosSpeed, Random.randRotation());

        var gradient = ctx.createRadialGradient(
            // x0, y0, r0
            innerPos.x, innerPos.y, 0,
            // x1, y1, r1
            0, 0, this.radius);

        var c0 = Random.randColor(50, 150);
        var c1 = Random.randColor(50, 100);
        var c2 = Random.randColor(100);

        gradient.addColorStop(.5, c0);
        gradient.addColorStop(.75, c1);
        gradient.addColorStop(1, c2);
        return gradient;
    }
}
