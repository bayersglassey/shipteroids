'use strict';


function linear(x0, x1, n) {
    /* Assumes: 0 <= n <= 1 */
    return x0 + (x1 - x0) * n;
}

function getDefault(value, default_value) {
    return value === undefined? default_value: value;
}

function removeArrayElem(arr, elem) {
    var i = arr.indexOf(elem);
    if(i >= 0) arr.splice(i, 1);
}

function range(a, b) {
    if(b === undefined) {
        b = a;
        a = 0;
    }
    var values = [];
    for(var i = a; i < b; i++) values.push(i);
    return values;
}

function modulo(x, n) {
    /* Returns the modulus of x / n.
    Expects n > 0.

    Example:

         x | n | modulo(x, n)
        ---+---+--------------
         -3| 3 | 0
         -2| 3 | 1
         -1| 3 | 2
          0| 3 | 0
          1| 3 | 1
          2| 3 | 2
          3| 3 | 0
    */
    return ((x % n) + n) % n;
}

function getRotVariance(i, n) {
    // rotVariance: number between -.5 and .5
    if(n <= 1) return 0;
    return i / (n - 1) - .5;
}

function moduloDiff(x0, x1, w) {
    /* Difference between two numbers on the "wrapped" interval between
    0 and w.
    (Distance from x0 to x1.) */
    x0 = modulo(x0, w);
    x1 = modulo(x1, w);
    var diff = x1 - x0;

    if(diff < -w/2)return diff + w;
    else if(diff > w/2)return diff - w;
    else return diff;
}

function rotDiff(r0, r1) {
    return moduloDiff(r0, r1, Math.PI * 2);
}

class Random {
    /* Utility functions for producing random values */

    static randNumber(a, b) {
        if(b === undefined) {
            b = a;
            a = 0;
        }
        return a + Math.random() * (b - a);
    }
    static randInt(a, b) {
        return Math.floor(this.randNumber(a, b));
    }
    static randIntInclusive(a, b) {
        return this.randInt(a, b + 1);
    }
    static choice(choices) {
        return choices[this.randInt(choices.length)];
    }
    static randRotation() {
        return this.randNumber(Math.PI * 2);
    }
    static randColor(min, max, alpha) {
        if(max === undefined) {
            max = min;
            min = 0;
        }
        if(max === undefined) max = 256;

        var r = this.randInt(min, max);
        var g = this.randInt(min, max);
        var b = this.randInt(min, max);
        return alpha === undefined? Color.rgb(r, g, b):
            Color.rgba(r, g, b, alpha);
    }
}

class Color {
    /* Helper functions for creating CSS colours */
    static rgb(r, g, b) {
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
    static rgba(r, g, b, a) {
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }
}

class OrderedDictEntry {
    constructor(key, value) {
        this.key = key;
        this.value = value;
    }
}
class OrderedDict {
    entries = []; // Array of OrderedDictEntry

    size() {
        return this.entries.length;
    }
    set(key, value) {
        var entry = this.getEntry(key);
        if(entry) {
            entry.value = value;
        } else {
            var entry = new OrderedDictEntry(key, value);
            this.entries.push(entry);
        }
        return this;
    }
    indexOf(value) {
        for(var i = 0; i < this.entries.length; i++) {
            var entry = this.entries[i];
            if(entry.value === value) return i;
        }
        return -1;
    }
    getEntry(key) {
        for(var entry of this.entries) {
            if(entry.key === key) return entry;
        }
        return null;
    }
    get(key) {
        var entry = this.getEntry(key);
        if(entry) return entry.value;
        return null;
    }
    getAt(i) {
        var entry = this.entries[i];
        if(entry) return entry.value;
        return null;
    }
    getKeys() {
        return this.entries.map(entry => entry.key);
    }
    getValues() {
        return this.entries.map(entry => entry.value);
    }
}

class MinMax {
    /* Represents a range of numbers, min..max.
    Used for e.g. generating random values within a range. */

    constructor(min, max) {
        this.min = getDefault(min, 0);
        this.max = getDefault(max, this.min);
    }
    clone() {
        return new this.constructor(this.min, this.max);
    }
    getAverage() {
        return (this.min + this.max) / 2;
    }
    getRand() {
        return Random.randNumber(this.min, this.max);
    }
    add(n) {
        this.min += n;
        this.max += n;
        return this;
    }
    mul(n) {
        this.min *= n;
        this.max *= n;
        return this;
    }
    createInterpolated(other, m) {
        return new MinMax(
            linear(this.min, other.min, m),
            linear(this.max, other.max, m));
    }
}

class WeightedArrayEntry {
    /* An entry of a WeightedArray */

    constructor(value, weight) {
        this.value = value;
        this.weight = weight;
    }
}

class WeightedArray {
    /* An Array whose values each have a "weight", used when e.g.
    choosing a value at random. */

    constructor(defaultValue, entries) {
        defaultValue = getDefault(defaultValue, null);
        entries = getDefault(entries, []);

        if(!(entries instanceof Array)) {
            throw new Error('Entries not an instance of Array');
        }
        for(var entry of entries) {
            if(!(entry instanceof WeightedArrayEntry)) {
                console.log(defaultValue, entries, entry);
                throw new Error(
                    'Entry is not an instance of WeightedArrayEntry');
            }
        }

        this.defaultValue = defaultValue;

        // entries: Array of WeightedArrayEntry
        this.entries = entries;
    }
    static from(values, defaultValue) {
        var a = new this(defaultValue);
        for(var value of values) a.addEntry(value, 1);
        return a;
    }
    static fromEntries(entries, defaultValue) {
        var a = new this(defaultValue);
        for(var entry of entries) a.addEntry(entry.value, entry.weight);
        return a;
    }
    addEntry(value, weight) {
        weight = getDefault(weight, 1);
        var entry = new WeightedArrayEntry(value, weight);
        this.entries.push(entry);
        return this;
    }
    getTotalWeight() {
        var totalWeight = 0;
        for(var entry of this.entries) totalWeight += entry.weight;
        return totalWeight;
    }
    normalize(targetTotalWeight) {
        targetTotalWeight = getDefault(targetTotalWeight, 1);

        var totalWeight = this.getTotalWeight();
        for(var entry of this.entries) {
            entry.weight = entry.weight / totalWeight * targetTotalWeight;
        }
        return this;
    }
    clone() {
        return WeightedArray.fromEntries(this.entries, this.defaultValue);
    }
    getEntry(value) {
        for(var entry of this.entries) {
            if(entry.value === value) return entry;
        }
        return null;
    }
    mul(m) {
        for(var entry of this.entries) entry.weight *= m;
    }
    add(other, m) {
        // m: number between 0 and 1, used to weight this and other.
        // That is, if m === 0 then all weights are equal to this's weights.
        // If m === 1 then all weights are equal to other's weights.
        // If m === .5 then this and other are equally weighted.
        m = getDefault(m, .5);

        this.mul(1 - m);

        for(var otherEntry of other.entries) {
            var thisEntry = this.getEntry(otherEntry.value);
            if(thisEntry) {
                thisEntry.weight += otherEntry.weight * m;
            } else {
                this.addEntry(otherEntry.value, otherEntry.weight * m);
            }
        }
        return this;
    }
    addNormalized(other, m) {
        var otherTotalWeight = other.getTotalWeight();
        if(otherTotalWeight) {
            this.normalize(otherTotalWeight);
            return this.add(other, m);
        }
        return this;
    }
    randValue() {
        var totalWeight = this.getTotalWeight();
        var r = Random.randNumber(totalWeight);
        for(var entry of this.entries) {
            r -= entry.weight;
            if(r < 0) return entry.value;
        }

        // If e.g. this.entries was empty, or totalWeight is 0:
        return this.defaultValue;
    }
}
