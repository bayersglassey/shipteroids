'use strict';

class Menu {
    constructor(player) {
        this.player = player;
        this.game = player.game;

        // keys: updated by this.player before this.step() is called
        this.keys = Key.createKeys();

        // prevKeys: the values of this.keys from previous step
        this.prevKeys = Key.createKeys();

        // previous: Menu instance or null.
        // (The Menu to return to when this one is closed)
        this.previous = null;
    }
    cleanup() {
    }
    step() {
        for(var keyname of KEYNAMES) {
            var prevKey = this.prevKeys[keyname];
            var key = this.keys[keyname];
            if(!prevKey.wasDown && key.wasDown) {
                this.keyDown(keyname);
            }
        }

        Key.copyKeys(this.keys, this.prevKeys);
    }
    keyDown(keyname) {
    }
    render(canvas) {
    }
}

class MenuOption {
    /* An option of OptionsMenu */

    constructor(title, value, description) {
        this.title = title;

        // The type of value depends on the subclass of OptionsMenu
        this.value = value;

        this.description = getDefault(description, null);
    }
    getTitle() {
        // May be overridden by subclasses
        return this.title;
    }
}

class BranchMenuOption extends MenuOption {
    /* An option whose value is a subclass of Menu */

    constructor(title, value, description, closeCallingMenu) {
        super(title, value, description);

        // Whether the calling menu closes itself before opening
        // the sub-menu (so that leaving the sub-menu doesn't take you
        // back to the calling menu)
        this.closeCallingMenu = getDefault(closeCallingMenu, false);
    }
}

class RunnableMenuOption extends MenuOption {
    /* An option whose value is a function to be called when the option
    is selected.
    The function takes one argument: the selected RunnableMenuOption.
    The function's "this" is the calling Menu.
    The function's return value is ignored. */
}

class OptionsMenu extends Menu {
    /* A menu which displays a list of options to be selected. */

    title = "??? Menu";

    // String displayed for the option to exit this menu
    finish_text = 'Leave menu';

    // Array of string
    description = [];

    // option_i: index into this.options, or -1 for "go back"
    option_i = -1;

    // options: Array of MenuOption
    // (to be overridden by subclasses)
    options = null;

    // Array of string, set by this.update()
    subtitles = null;

    initOptions() {
        // To be called at the end of subclasses' constructors,
        // after they've set this.options.

        if(this.options.length) this.option_i = 0;
        this.update();
    }
    getSelectedOption() {
        if(!this.options.length) return null;
        if(this.option_i < 0) return null;
        return this.options[this.option_i];
    }
    update() {
        this.subtitles = this.description.slice();
        this.subtitles.push('');

        var LBRACKET = '> ';
        var RBRACKET = ' <';

        if(!this.options.length) {
            this.subtitles.push('...no options!');
            this.subtitles.push('');
        }

        var selected_option = this.getSelectedOption();

        for(var i = 0; i < this.options.length; i++) {
            var option = this.options[i];

            var subtitle = this.getOptionTitle(option);
            if(option === selected_option) {
                subtitle = LBRACKET + subtitle + RBRACKET;
            }
            this.subtitles.push(subtitle);
        }

        var MDASH = '\u2014';
        var HLINE = MDASH.repeat(20);
        this.subtitles.push(HLINE);

        var subtitle = this.finish_text;
        if(this.option_i === -1) {
            subtitle = LBRACKET + subtitle + RBRACKET;
        }
        this.subtitles.push(subtitle);

        if(selected_option && selected_option.decription) {
            this.subtitles.push('');
            this.subtitles.push(selected_option.description);
        }
    }
    getOptionTitle(option) {
        // May be overridden by subclasses
        return option.getTitle();
    }
    keyDown(keyname) {
        if(keyname === 'u') {
            this.option_i--;
            if(this.option_i < -1) {
                this.option_i = this.options.length - 1;
            }
            this.update();
        } else if(keyname === 'd') {
            this.option_i++;
            if(this.option_i >= this.options.length) {
                this.option_i = -1;
            }
            this.update();
        } else if(keyname === 'enter') {
            if(this.option_i === -1) {
                this.finish();
            } else {
                var option = this.getSelectedOption();
                if(option) this.select(option);
            }
        }
    }
    _select(option) {
        // To be overridden by subclasses
    }
    select(option) {
        if(option instanceof BranchMenuOption) {
            if(option.closeCallingMenu) this.player.unsetMenu();
            this.player.setMenu(option.value);
        } else if(option instanceof RunnableMenuOption) {
            option.value.call(this, option);
        } else {
            this._select(option);
        }
        this.update();
    }
    finish() {
        this.player.unsetMenu();
    }
    render(canvas) {
        this.game.renderTitle(canvas, this.title, this.subtitles);
    }
}
