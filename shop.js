'use strict';

class ShopItem {
    name = 'Item';
    description = 'An item you can buy in a shop.';
    price = 10;

    // boughtBy: Object mapping player indices with game.players (see
    // HumanPlayer.getIndex) to boolean.
    // (Whether this item was bought by each player.)
    boughtBy = {};

    cantBuy(player) {
        // To be overridden by subclasses
        // Returns false if player *CAN* buy this item, otherwise returns
        // a string (to be displayed to player) describing why they *CAN'T*.
        // Don't you dare question my design decisions.

        if(this.wasBoughtBy(player)) {
            return 'Already bought!';
        }

        if(player.gold < this.price) {
            return 'Not enough gold!';
        }

        return null;
    }
    wasBoughtBy(player) {
        return Boolean(this.boughtBy[player.getIndex()]);
    }
    buy(player) {
        // To be overridden by subclasses
        // We assume this.cantBuy(player) has already been called successfully
        // (without throwing ShopItemBuyError)

        player.gold -= this.price;
        this.boughtBy[player.getIndex()] = true;
    }
}

class TrinketShopItem extends ShopItem {
    constructor(name, price, description) {
        super();
        this.myname = name;
        this.price = getDefault(price, 0);
        this.description = getDefault(description, 'A useless trinket.');
    }
    buy(player) {
        super.buy(player);

        var trinket = new Trinket(this.myname, this.description);
        player.trinkets.push(trinket);
    }
}

class PickupMagnetShopItem extends ShopItem {
    name = 'Pickup Magnet';
    description = 'Increases your ship\'s magnetic pull on nearby energy/fuel/gold.';
    price = 40;

    cantBuy(player) {
        var value = super.cantBuy(player);
        if(value) return value;

        if(player.pickupMagnet >= MAX_PICKUP_MAGNET) {
            return 'Pickup magnet already fully upgraded';
        }
        return null;
    }
    buy(player) {
        super.buy(player);
        player.pickupMagnet++;
    }
}

class MaxEnergyShopItem extends ShopItem {
    description = 'Permanently increases the maximum energy of your ship.';

    constructor(energy) {
        super();
        this.energy = energy;
        this.myname = '+' + String(energy) + ' Max Energy';
        this.price = 20 + energy * 2;
    }
    buy(player) {
        super.buy(player);
        player.addmaxhp += this.energy;
    }
}

class MaxFuelShopItem extends ShopItem {
    description = 'Permanently increases your maximum fuel.';

    constructor(fuel) {
        super();
        this.fuel = fuel;
        this.myname = '+' + String(fuel) + ' Max Fuel';
        this.price = 20 + fuel * 2;
    }
    buy(player) {
        super.buy(player);
        player.maxfuel += this.fuel;
        player.fuel += this.fuel;
    }
}

class SpeedShopItem extends ShopItem {
    name = 'Increase Thrust & Turn Speed';
    price = 40;
    description = 'Permanently increases your ship\'s forward/reverse thrust and turning speed.';

    buy(player) {
        super.buy(player);
        player.increaseThrustSpeed++;
        player.increaseReverseSpeed++;
        player.increaseRotSpeed++;
    }
}

class BasePowerupShopItem extends ShopItem {
    name = 'Weapon/Ability Powerup';
    price = 50;
    description = 'Permanently powers up your ship\'s weapon/ability.';

    keyname = null; // String, e.g. 'x', 'y'

    cantBuy(player) {
        var value = super.cantBuy(player);
        if(value) return value;

        if(player[this.keyname + 'ShotLevel'] >= MAX_SHOT_LEVEL) {
            return 'Already fully powered up';
        }
        return null;
    }
    buy(player) {
        super.buy(player);
        player[this.keyname + 'ShotLevel']++;
    }
}

class PrimaryPowerupShopItem extends BasePowerupShopItem {
    name = 'Primary Weapon/Ability Powerup';
    description = 'Permanently powers up your ship\'s primary weapon/ability.';
    keyname = 'x';
}

class SecondaryPowerupShopItem extends BasePowerupShopItem {
    name = 'Secondary Weapon/Ability Powerup';
    description = 'Permanently powers up your ship\'s secondary weapon/ability.';
    keyname = 'y';
}

class ShipShopItem extends ShopItem {
    description = 'Use ships you\'ve bought in the "Choose Ship" menu.';

    constructor(cls, price) {
        super();
        this.cls = cls;
        this.myname = 'Ship: ' + cls.myname;
        this.price = price;
    }
    cantBuy(player) {
        var value = super.cantBuy(player);
        if(value) return value;

        if(player.shipClasses.indexOf(this.cls) >= 0) {
            return 'Already have ship: ' + this.cls.myname;
        }
        return null;
    }
    buy(player) {
        super.buy(player);
        player.shipClasses.push(this.cls);
    }
}

class Shop {
    constructor(name, description, items) {
        this.myname = name;
        this.description = description;

        // items: Array of ShopItem
        this.items = items;
    }
}
