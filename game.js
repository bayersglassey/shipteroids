'use strict';

class Game {

    constructor(canvas_container) {
        this.canvas_container = canvas_container;

        canvas_container.addEventListener('keydown', this.onKeyDown.bind(this));
        canvas_container.addEventListener('keyup', this.onKeyUp.bind(this));

        window.addEventListener('gamepadconnected',
            this.onGamepadActivity.bind(this));
        window.addEventListener('gamepaddisconnected',
            this.onGamepadActivity.bind(this));

        this.intervalId = 0;

        // Whether to bother polling for gamepads
        this.gamepadsConnected = false;

        /* Hashmap from keyCode values to Key instances */
        this.keysByCode = {};

        this.tick = 0;
    }
    onKeyDown(event) {
        if(!event.repeat) this.keyDown(event.keyCode);
        event.preventDefault();
    }
    onKeyUp(event) {
        if(!event.repeat) this.keyUp(event.keyCode);
        event.preventDefault();
    }
    onGamepadActivity(event) {
        // This handler is for either of these events:
        //   'gamepadconnected'
        //   'gamepaddisconnected'
        // ...why? Well you see:
        // Apparently the Gamepad API can be a bit wonky, and fire
        // 'gamepaddisconnected' when gamepads are connected.
        // Also, I've found that holding onto a Gamepad object is no
        // good -- its buttons are never updated.
        // So we need to call navigator.getGamepads() ever frame anyway.
        // SOOOO, instead of trying to detect when gamepads are
        // connected/disconnected, we just listen for either event, and
        // in either case *somebody was touching a gamepad at some point*,
        // so we flip a flag which tells us to bother polling
        // navigator.getGamepads() every frame.
        // Make sense?
        // Hahahahaha sure
        this.gamepadsConnected = true;
    }
    mapKey(key, keyCode) {
        this.keysByCode[keyCode] = key;
    }
    mapKeys(keys, keymap) {
        for(var keyname in keymap) {
            this.mapKey(keys[keyname], keymap[keyname]);
        }
    }
    getKeyCode(findKey) {
        for(var keyCode in this.keysByCode) {
            if(this.keysByCode[keyCode] === findKey) return keyCode;
        }
        return -1;
    }
    getKeyByCode(findKeyCode) {
        for(var keyCode in this.keysByCode) {
            if(keyCode === findKeyCode) return this.keysByCode[keyCode];
        }
        return null;
    }
    remapKey(key, keyCode) {
        var oldKeyCode = this.getKeyCode(key);
        if(oldKeyCode !== -1) delete this.keysByCode[oldKeyCode];
        this.mapKey(key, keyCode);
    }
    keyDown(keyCode) {
        var key = this.keysByCode[keyCode];
        if(key) key.down();
    }
    keyUp(keyCode) {
        var key = this.keysByCode[keyCode];
        if(key) key.up();
    }
    step() {
        /* To be overridden by subclasses... */
        this.tick++;
    }
    render() {
        /* To be overridden by subclasses... */
    }
    intervalCallback() {
        /* Callback for use with setInterval */
        if(TIMING) var t0 = new Date();
        try {
            this.step();
            this.render();
        } catch(ex) {
            // Stop the same error from throwing repeatedly.
            // Don't set this.intervalId to 0 though, for debugging
            // purposes.
            clearInterval(this.intervalId);

            throw ex;
        }
        if(TIMING) {
            var t1 = new Date();
            console.log('TIMING: ' + String(t1 - t0));
        }
    }
    play(millis) {
        millis = getDefault(millis, 30);
        if(this.intervalId) clearInterval(this.intervalId);
        var callback = this.intervalCallback.bind(this);
        this.intervalId = setInterval(callback, millis);
    }
    pause() {
        if(!this.intervalId) return;
        clearInterval(this.intervalId);
        this.intervalId = 0;
    }
}
