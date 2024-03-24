
class MapNode extends Particle {
    /* A node of the graph represented by class Map. */

    constructor(map, template, title, description) {
        super();

        description = getDefault(description, []);

        this.map = map;
        this.template = template;
        this.title = title;

        // description: Array of string
        this.description = description;

        this.edges = [];
        this.backedges = [];

        this.field = null;

        // radius, pos, vel: don't affect anything, only used for rendering the
        // Map and its nodes/edges as a graph with "springy physics"
        // (also apparently known as a "force-directed graph")
        var speed = Random.randNumber(250);
        var rot = Random.randRotation();
        this.pos.addSpeed(speed, rot);
        this.radius = Random.randNumber(MIN_MAP_NODE_RADIUS, MAX_MAP_NODE_RADIUS);

        this.strokeStyle = Random.randColor(80, 256, .75);
        this.fillStyle = 'rgba(255,255,255,.25)';
    }
    unsetField() {
        this.field = null;
    }
    setField(field) {
        this.field = field;
    }
    getField() {
        return this.field;
    }
    addEdge(other, len) {
        var edge = new MapEdge(this, other, len);
        this.edges.push(edge);
        other.backedges.push(edge);
        return edge;
    }
    numEdges(includeBackedges) {
        includeBackedges = getDefault(includeBackedges, false);
        return includeBackedges?
            this.edges.length + this.backedges.length:
            this.edges.length;
    }
    getEdgeIndex(edge) {
        var i = this.edges.indexOf(edge.edge);
        if(i < 0) {
            i = this.backedges.indexOf(edge.edge);
            if(i < 0) {
                console.log(this, edge);
                throw new Error('Couldn\'t find edge');
            }
            i += this.edges.length;
        }
        return i;
    }
    getEdge(i) {
        return (i < this.edges.length)?
            this.edges[i].forwardEdge:
            this.backedges[i - this.edges.length].backEdge;
    }
    step() {
        this.pos.add(this.vel);
    }
}

class MapEdge {
    /* Connects one MapNode (this.node0) to another (this.node1).
    Has a length (this.len), an integer representing the number of
    warps you need to make in order to travel between this.node0 and
    this.node1. */

    constructor(node0, node1, len) {
        this.node0 = node0;
        this.node1 = node1;
        this.len = getDefault(len, 1);

        this.forwardEdge = new DirectedMapEdge(this, false);
        this.backEdge = new DirectedMapEdge(this, true);

        this.strokeStyle = Random.randColor(40, 200, .75);
    }
}

class DirectedMapEdge {
    /* Wraps a MapEdge, representing an arrow pointing along it in either
    direction (that is, either from node0 to node1, or vice versa). */

    constructor(edge, isBackEdge) {
        this.edge = edge;
        this.isBackEdge = isBackEdge;

        // Object mapping integers (0 < i < this.len) to Fields
        this.fields = {};
    }
    unsetField(i) {
        delete this.fields[i];
    }
    setField(i, field) {
        this.fields[i] = field;
    }
    getField(i) {
        return getDefault(this.fields[i], null);
    }
    getReversed() {
        return this.isBackEdge? this.edge.forwardEdge: this.edge.backEdge;
    }
    getLen() {
        return this.edge.len;
    }
    getNode0() {
        return this.isBackEdge? this.edge.node1: this.edge.node0;
    }
    getNode1() {
        return this.isBackEdge? this.edge.node0: this.edge.node1;
    }
}

class Map {
    /* A directed graph of MapNodes and MapEdges, each of which have an
    associated FieldTemplate. */

    // Array of MapNode
    nodes = [];

    // MapNode or null
    startNode = null;

    getStartNode() {
        if(this.startNode) return this.startNode;
        if(this.nodes.length) return this.nodes[0];
        return null;
    }
    addNode(template, title, description) {
        var node = new MapNode(this, template, title, description);
        this.nodes.push(node);
        return node;
    }
    step() {
        for(var i = 0; i < this.nodes.length; i++) {
            var node = this.nodes[i];

            var velmul = .95;
            node.vel.mul(velmul);

            // Nodes repel
            for(var j = i + 1; j < this.nodes.length; j++) {
                var other = this.nodes[j];
                node.repel(other, {mul: 5});
            }

            // Multiplier, converts edge.len into a length in pixels
            var lenmul = 50;

            // Edges act like springs
            for(var edge of node.edges) {
                var other = edge.node1;

                // Target distance (edge's length in pixels)
                var tdist = edge.len * lenmul;
                node.spring(other, tdist, {mul: .02});
            }
        }
        for(var node of this.nodes) node.step();
    }
}

class MapProgress {
    /* Represents players' "progress" across a Map.
    For instance, the MapNode at which they are currently located, and
    the MapEdge along which they are travelling (if applicable). */

    // edgeDist: how far we've travelled along this.edge.
    // It should always be the case that:
    //
    //   edgeDist >= 0 && edgeDist < edge.getLen()
    //
    edgeDist = 0;

    template = null;

    constructor(map, startNode) {
        if(!map.nodes.length) throw new Error('Map has no nodes');

        this.map = map;

        // MapNode
        this.node = getDefault(startNode, map.getStartNode());

        // DirectedMapEdge
        this.edge = null;

        this.updateTemplate();
    }
    getPos() {
        if(this.edge) {
            var pos0 = this.node.pos;
            var pos1 = this.edge.getNode1().pos;
            var m = this.edgeDist / this.edge.getLen();
            return pos0.clone().linear(pos1, m);
        } else {
            return this.node.pos;
        }
    }
    setEdge(edge) {
        if(this.edge) {
            throw new Error("Can't set edge yet, it's already set");
        }
        if(this.node !== edge.getNode0()) {
            console.log(this.node, edge);
            throw new Error("Edge does not start at current node");
        }
        this.edge = edge;
        this.edgeDist = 0;
        this.proceed();
        this.updateTemplate();
    }
    canProceed() {
        if(this.edge) return true;
        return this.node.numEdges() <= 1;
    }
    proceed() {
        if(!this.canProceed()) {
            throw new Error("Can't proceed yet, must set edge first");
        }

        if(this.edge) {
            if(this.edgeDist < this.edge.getLen() - 1) {
                this.edgeDist++;
            } else {
                this.node = this.edge.getNode1();
                this.edge = null;
            }
            this.updateTemplate();
        } else if(this.node.numEdges() === 1) {
            var edge = this.node.getEdge(0);
            this.setEdge(edge);
        } else {
            console.log(this.node);
            throw new Error(
                "Node doesn't have exactly 1 edge! "
                + "It has " + this.node.numEdges());
        }
    }
    unsetField(field) {
        if(this.edge) this.edge.unsetField(this.edgeDist);
        else this.node.unsetField();
    }
    setField(field) {
        if(this.edge) this.edge.setField(this.edgeDist, field);
        else this.node.setField(field);
    }
    getField() {
        if(this.edge) return this.edge.getField(this.edgeDist);
        else return this.node.getField();
    }
    updateTemplate() {
        if(!this.edge) {
            this.template = this.node.template;
            return;
        }

        var m = this.edgeDist / this.edge.getLen();
        var node0 = this.edge.getNode0();
        var node1 = this.edge.getNode1();
        this.template = node0.template
            .createInterpolated(node1.template, m);
    }
}



/****************************** DEFAULT MAP **********************************/

var defaultMap = new function() {
    var map = new Map();

    function mkships(teamsMap) {
        var ships = new WeightedArray();
        for(var teamName in teamsMap) {
            var team = TEAMS.get(teamName);
            var shipsMap = teamsMap[teamName];
            for(var shipName in shipsMap) {
                var shipClass = SHIP_CLASSES.get(shipName);
                var weight = shipsMap[shipName];
                var shipTemplate = new ShipTemplate(shipClass, team);
                ships.addEntry(shipTemplate, weight);
            }
        }
        return ships;
    }

    function mktemplate(props) {
        props = props || {};
        props = Object.assign({}, props);

        if(props.width) props.width.mul(DEFAULT_FIELD_WIDTH);
        if(props.height) props.height.mul(DEFAULT_FIELD_HEIGHT);

        if(props.stars_per) props.stars_per.mul(DEFAULT_STARS_PER);
        if(props.rocks_per) props.rocks_per.mul(DEFAULT_ROCKS_PER);
        if(props.planets_per) props.planets_per.mul(DEFAULT_PLANETS_PER);
        if(props.ships_per) props.ships_per.mul(DEFAULT_SHIPS_PER);

        if(props.rock_radius) props.rock_radius.mul(DEFAULT_ROCK_RADIUS * RADIUSMUL);
        if(props.star_speed) props.star_speed.mul(DEFAULT_STAR_SPEED);

        return new FieldTemplate(props);
    }

    function mknodes(nodeMap) {
        var nodes = {};
        for(var nodeName in nodeMap) {
            var nodeProps = nodeMap[nodeName];
            var node = map.addNode(nodeProps.template,
                nodeProps.title, nodeProps.description);
            nodes[nodeName] = node;
        }
        for(var nodeName in nodeMap) {
            var node = nodes[nodeName];
            var nodeProps = nodeMap[nodeName];
            var edgeMap = nodeProps.edges;
            if(!edgeMap) continue;
            for(var node1Name in edgeMap) {
                var node1 = nodes[node1Name];
                var len = edgeMap[node1Name];
                node.addEdge(node1, len);
            }
        }
        return nodes;
    }

    function defnode(title, description, template, edges) {
        // "defnode" not "mknode" because we don't actually return
        // a MapNode.
        return {
            title: title,
            description: description,
            template: template,
            edges: edges,
        };
    }

    var nodes = mknodes({

        // INTRODUCTION
        // A series of fields, comprising the title screen and tutorial.
        intro0: defnode('Introduction', [],
            mktemplate({
                rocks_per: new MinMax(0),
                rocksText: 'SHIPteroids',
                energy_chance: 0,
                fuel_chance: 0,
                text: new Text('Welcome to space', [
                    'Try out your new ship.',
                    'Once you\'re ready, press Backspace to warp to the next area.',
                    'Try not to hit things while warping.',
                ]),
            }), {intro1: 1}),
        intro1: defnode('Introduction', [],
            mktemplate({
                rocks_per: new MinMax(1),
                energy_chance: .5,
                fuel_chance: .5,
                text: new Text('Energy and fuel', [
                    'When your ship is damaged, it consumes energy.',
                    'When you warp, you consume fuel.',
                    'At the bottom of the screen, your energy',
                    'and fuel are shown as "E" and "F".',
                    'Shoot asteroids open to find more.',
                ]),
            }), {intro2: 1}),
        intro2: defnode('Introduction', [],
            mktemplate({
                rocks_per: new MinMax(2),
                ships_per: new MinMax(2),
                ships: mkships({
                    green: {fighter: 1},
                }),
                text: new Text('Friendly ships', [
                    '...are green, like you.',
                    'Don\'t worry, you can\'t damage each other.',
                ]),
            }), {intro3: 1}),
        intro3: defnode('Introduction',
            [
                'Welcome to the map!',
                'When warping, you move along the arrows on the map.',
                'When the path branches, you must choose which way to go.',
            ],
            mktemplate({
                rocks_per: new MinMax(.4),
                gold_chance: 1,
                ships_per: new MinMax(.5),
                ships: mkships({
                    blue: {fighter: 1},
                }),
                text: new Text('Hostile ship!', [
                    'At the bottom of the screen, your gold',
                    'is shown as "G".',
                    'Destroy ships to find more.',
                    'You can always warp away instead of fighting.',
                ]),
            }), {intro4a: 1, intro4b: 1}),
        intro4a: defnode('Introduction', [],
            mktemplate({
                width: new MinMax(4),
                height: new MinMax(.3),
                rocks_per: new MinMax(3),
                planets_per: new MinMax(0),
                text: new Text('The map', [
                    'Notice how space wraps around? Weird huh.',
                    'That\'s true in every area, it\'s just more obvious',
                    'in this one because it\'s so wide.',
                ]),
            }), {intro5: 1}),
        intro4b: defnode('Introduction', [],
            mktemplate({
                width: new MinMax(.3),
                height: new MinMax(4),
                rocks_per: new MinMax(3),
                planets_per: new MinMax(0),
                text: new Text('The map', [
                    'Notice how space wraps around? Weird huh.',
                    'That\'s true in every area, it\'s just more obvious',
                    'in this one because it\'s so tall.',
                ]),
            }), {intro5: 1}),
        intro5: defnode('Introduction', [],
            mktemplate({
                rocks_per: new MinMax(3),
                energy_chance: 0,
                fuel_chance: .75,
                text: new Text('Long warps', [
                    'Hold Tab to look at the map now, and you will see that',
                    'the "distance" to the next area is 2.',
                    'That means it will take 2 warps to get to the next area.',
                    'So stock up on fuel here! These asteroids are full of it...',
                ]),
            }), {intro6: 2}),
        intro6: defnode('Shop', [],
            mktemplate({
                rocks_per: new MinMax(0),
                shop: new Shop('Introductory Shop',
                    [
                        'There are shops in space!',
                        'And the only currency they accept is, uh, gold pieces.',
                        'Use the arrow keys to change selected item, and Enter to buy.',
                    ],
                    [
                        new TrinketShopItem('Useless Trinket', 5,
                            "It may not be very useful, but it's *yours*."),
                        Object.assign(new MaxEnergyShopItem(10), {
                            description:
                                "This would be really useful, " +
                                "if you could afford it."
                        }),
                    ]),
            }), {basic0: 1}),

        // BASIC TRAINING
        // A circular set of fields, introducing you to the most common
        // types of ship.
        basic0: defnode('Basic Training', [],
            mktemplate({
                ships_per: new MinMax(.75),
                ships: mkships({
                    green: {fighter: 1},
                    blue: {fighter: 1},
                }),
            }), {basic1: 1}),
        basic1: defnode('Basic Training', [],
            mktemplate({
                ships_per: new MinMax(.75),
                ships: mkships({
                    green: {scout: 1},
                    blue: {assault: 1},
                }),
            }), {basic2: 2}),
        basic2: defnode('Basic Training', [],
            mktemplate({ships: mkships({
                green: {fighter: .5, assault: 1, flag: .5},
                yellow: {fighter: 2, scout: 1, mole: .5},
            })}), {basic3: 2, basic_shop: 3}),
        basic_shop: defnode('Basic Shop', [],
            mktemplate({
                shop: new Shop('Basic Shop',
                    ['Basic stuff like upgrades and fancy new ships.'],
                    [
                        new MaxEnergyShopItem(10),
                        new MaxEnergyShopItem(10),
                        new MaxFuelShopItem(10),
                        new MaxFuelShopItem(10),
                        new PickupMagnetShopItem(),
                        new ShipShopItem(TurretShip, 40),
                        new ShipShopItem(HunterShip, 40),
                        new ShipShopItem(TroopShip, 40),
                        new ShipShopItem(SwarmShip, 40),
                        new ShipShopItem(FlagShip, 100),
                    ]),
            }), {basic2: 2}),
        basic3: defnode('Basic Training', [],
            mktemplate({ships: mkships({
                green: {assault: 1, scout: 1},
                yellow: {fighter: 1, mole: 1},
                red: {torch: 1},
            })}), {basic0: 2, fire0: 4, corridor0: 2}),

        // FIRE
        // A place full of torches and rams. Presumably red team's home base.
        fire0: defnode('Fire', [],
            mktemplate({
                height: new MinMax(3),
                rocks_per: new MinMax(.5),
                rock_radius: new MinMax(.15, .75),
                ships_per: new MinMax(2),
                ships: mkships({red: {ram: 1, torch: .25}}),
            }), {fire1: 2}),
        fire1: defnode('Fire', [],
            mktemplate({
                height: new MinMax(3),
                rocks_per: new MinMax(10,30),
                rock_radius: new MinMax(.15, .75),
                ships_per: new MinMax(2),
                ships: mkships({red: {torch: 1}}),
            }), {basic2: 1, fire_shop: 1}),
        fire_shop: defnode('Fire Shop', [],
            mktemplate({
                height: new MinMax(3),
                rocks_per: new MinMax(10,30),
                rock_radius: new MinMax(.15, .75),
                shop: new Shop('Fire Shop',
                    ['There is a shop among the flames.'],
                    [
                        new TrinketShopItem('Fire Trinket', 10,
                            'Proves you made it to the Fire area.'),
                        new MaxEnergyShopItem(40),
                        new MaxFuelShopItem(20),
                        new MaxFuelShopItem(20),
                        new PrimaryPowerupShopItem(),
                        new SecondaryPowerupShopItem(),
                        new ShipShopItem(TorchShip, 40),
                        new ShipShopItem(RamShip, 40),
                        new ShipShopItem(CrabShip, 40),
                    ]),
            }), {fire1: 1}),

        // CORRIDOR
        // A series of wide fields, with not many rocks, stars, or planets.
        // Mostly blue team (assault+hunter), with some red (crab+hunter).
        // Maybe the first time you meet hunters?..
        corridor0: defnode('Corridor', [],
            mktemplate({
                width: new MinMax(1, 2),
                height: new MinMax(.5, 1),
                rocks_per: new MinMax(.7),
                rock_radius: new MinMax(1, 2),
                stars_per: new MinMax(.2),
                planets_per: new MinMax(.2),
                ships: mkships({
                    green: {fighter: 1},
                    blue: {assault: 1, hunter: .5},
                    red: {crab: 1},
                }),
            }), {corridor1: 4}),
        corridor1: defnode('Corridor', [],
            mktemplate({
                width: new MinMax(2, 3),
                height: new MinMax(1),
                rocks_per: new MinMax(.7),
                rock_radius: new MinMax(1, 3),
                ships_per: new MinMax(.8),
                stars_per: new MinMax(.2),
                planets_per: new MinMax(.2),
                ships: mkships({
                    blue: {assault: 1, hunter: .5},
                    red: {crab: 1, hunter: .5},
                }),
            }), {corridor2: 4, corridor_shop: 1}),
        corridor_shop: defnode('Corridor', [],
            mktemplate({
                shop: new Shop('Secret Shop', [],
                    [
                        new MaxEnergyShopItem(20),
                        new MaxFuelShopItem(30),
                        new PrimaryPowerupShopItem(),
                        new PrimaryPowerupShopItem(),
                        new SecondaryPowerupShopItem(),
                        new SecondaryPowerupShopItem(),
                        new SpeedShopItem(),
                        new PickupMagnetShopItem(),
                    ]),
            }), {corridor1: 1}),
        corridor2: defnode('Corridor', [],
            mktemplate({
                width: new MinMax(2, 3),
                height: new MinMax(1, 2),
                rocks_per: new MinMax(.5),
                rock_radius: new MinMax(1, 3),
                ships_per: new MinMax(.8),
                stars_per: new MinMax(.2),
                planets_per: new MinMax(.2),
                ships: mkships({
                    blue: {assault: 1, hunter: .5, flag: .5},
                    red: {crab: 1, hunter: .5, ram: 1},
                }),
            }), {rock0: 3, mines0: 3}),

        // ROCK
        // A big field, full of rocks, bit of every team, lots of moles & suits.
        rock0: defnode('Rock', [],
            mktemplate({
                width: new MinMax(2),
                rocks_per: new MinMax(10),
                rock_radius: new MinMax(.7, 3.2),
                ships_per: new MinMax(2),
                ships: mkships({
                    green: {mole: 1, troop: 1},
                    blue: {mole: 1, troop: 1},
                    yellow: {mole: 1, engineer: 1},
                    red: {crab: 1},
                }),
            }), {rock1: 2}),
        rock1: defnode('Rock', [],
            mktemplate({
                width: new MinMax(2),
                rocks_per: new MinMax(20),
                rock_radius: new MinMax(.5, 1.5),
                ships_per: new MinMax(2),
                ships: mkships({
                    green: {fighter: 1, mole: .5, engineer: .5, troop: .5},
                    blue: {assault: 1, mole: 1, troop: 1},
                    yellow: {scout: 1, mole: 1, engineer: 1},
                    red: {mole: .5, troop: 2},
                }),
            }), {basic1: 2, rock_shop: 1}),
        rock_shop: defnode('Rock Shop', [],
            mktemplate({
                width: new MinMax(2),
                rocks_per: new MinMax(20),
                rock_radius: new MinMax(.5, 1.5),
                shop: new Shop('Rock Shop',
                    [],
                    [
                        new TrinketShopItem('Rock Trinket', 10,
                            'Proves you made it to the Rock area.'),
                        new MaxEnergyShopItem(20),
                        new MaxEnergyShopItem(20),
                        new MaxFuelShopItem(30),
                        new ShipShopItem(MoleShip, 40),
                        new ShipShopItem(EngineerShip, 40),
                        new ShipShopItem(BoreShip, 100),
                        new ShipShopItem(MinerShip, 100),
                    ]),
            }), {rock1: 1}),

        // MINES
        // Full of asteroids, miners, and bores.
        // And... swarms, to add some danger to it all.
        mines0: defnode('Mines', [],
            mktemplate({
                width: new MinMax(2),
                height: new MinMax(2),
                rocks_per: new MinMax(3),
                rock_radius: new MinMax(1, 2),
                ships_per: new MinMax(2),
                ships: mkships({
                    green: {mole: 1},
                    yellow: {mole: 1},
                    red: {swarm: 1},
                }),
            }), {mines1: 2}),
        mines1: defnode('Mines', [],
            mktemplate({
                width: new MinMax(3),
                height: new MinMax(3),
                rocks_per: new MinMax(2),
                rock_radius: new MinMax(1, 2),
                ships_per: new MinMax(1.2),
                ships: mkships({
                    green: {mole: 1, miner: 1},
                    yellow: {mole: 1, miner: 1},
                    blue: {swarm: 2},
                }),
            }), {mines2: 2}),
        mines2: defnode('Mines', [],
            mktemplate({
                width: new MinMax(2),
                height: new MinMax(2),
                rocks_per: new MinMax(5),
                rock_radius: new MinMax(.5, 1.5),
                ships: mkships({
                    yellow: {bore: 2},
                    blue: {swarm: 1},
                }),
            }), {corridor2: 2}),
    });

    var startNodeName = getParam('start_node');
    map.startNode = startNodeName? nodes[startNodeName]: null;

    return {
        map: map,
        nodes: nodes,
    };
};
