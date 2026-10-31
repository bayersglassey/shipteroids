'use strict';

// keyCode values
var KEYS = {
    a: 65,
    b: 66,
    c: 67,
    d: 68,
    e: 69,
    h: 72,
    i: 73,
    k: 75,
    l: 76,
    n: 78,
    o: 79,
    q: 81,
    s: 83,
    v: 86,
    w: 87,
    x: 88,
    y: 89,
    z: 90,

    8: 56,
    9: 57,

    up:     38,
    down:   40,
    left:   37,
    right:  39,
    pgup:   33,
    pgdown: 34,
    enter:  13,
    space:  32,
    shift:  16,
    bspace: 8,
    tab:    9,
};

class KeyInfo {
    constructor(name, title, description) {
        this.myname = name;
        this.title = title;
        this.description = getDefault(description, null);
    }
}

var KEYINFOS; // Array of KeyInfo, initialized by configureKeys
var KEYNAMES; // Array of String, initialized by configureKeys

function configureKeys(key_infos) {
    // NOTE: this function should be called once, before the game is started
    KEYINFOS = key_infos
    KEYNAMES = KEYINFOS.map(keyinfo => keyinfo.myname);
}

class Key {
    /* Represents the state of a key on the keyboard */

    constructor(name) {
        this.myname = name;
        this.isDown = false;
        this.wasDown = false;
    }
    static createKeys() {
        var keys = {};
        for(var keyname of KEYNAMES) {
            keys[keyname] = new this(keyname);
        }
        return keys;
    }
    static copyKeys(fromKeys, toKeys) {
        for(var keyname of KEYNAMES) {
            toKeys[keyname].copy(fromKeys[keyname]);
        }
    }
    static cloneKeys(keys) {
        var newKeys = this.createKeys();
        Key.copyKeys(keys, newKeys);
        return newKeys;
    }
    copy(other) {
        this.isDown = other.isDown;
        this.wasDown = other.wasDown;
        return this;
    }
    union(other) {
        // The state of this becomes the "union" of this and other.
        // So think "boolean OR".
        if(other.isDown) this.isDown = true;
        if(other.wasDown) this.wasDown = true;
        return this;
    }
    down() {
        this.isDown = this.wasDown = true;
    }
    up() {
        this.isDown = false;
    }
    set(isDown) {
        if(isDown) this.down();
        else this.up();
    }
    step() {
        this.wasDown = this.isDown;
    }
}
