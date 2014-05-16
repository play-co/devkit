var common = require('./common');
var logger = new common.Formatter('commands');

var Command = Class(function() {
    this.init = function(addonName, opts) {
        //if we don't have an addonName, its a core command.  Don't prefix
        if (addonName) {
            this._name = addonName + '.' + opts.name;
        } else {
            this._name = opts.name
        }
        this._shortDescription = opts.shortDescription;
        this._help = opts.help;
        this._handler = opts.handler;
        this._steps = opts.steps;
        this._hidden = opts.hidden;
    };

    this.getShortDescription = function() {
        return this._name + (this._shortDescription ? ': ' + this._shortDescription : '');
    };

    this.getName = function() {
        return this._name;
    };

    this.getHelp = function() {
        return this._help;
    };

    this.isHidden = function() {
        return this._hidden;
    };

    function nextStep(steps, args, cb) {
        if (!steps.length) {
            cb(null);
        } else {
            var step = steps.shift();
            var command = singleton.getCommand(step);
            if (command && command.run) {
                command.run(args, function(err) {
                    if (!err) {
                        nextStep(steps, args, cb);
                    } else {
                        cb( err);
                    }
                });
            } else {
                cb(true, "unknown command " + step);
            }
        }
    }
    //TODO are these things async somtimes?
    this.run = function(args, cb) {
        if (this._handler) {
            return this._handler(args, cb);
        } else if (this._steps)  {
            nextStep(this._steps, args, cb);
        } else {
            console.log("No handler or steps, doing nothing");
        }
    };

    this.getBefore = function() {
        return this._before;
    };
});

var CommandManager = Class(function() {
    this.init = function() {
        this._commands = [];
        this._commandsByName = {};
    };

    this.addCommand = function(addonName, commandOpts) {
        if (!commandOpts) {
            commandOpts = addonName;
            addonName = null;
        }
        var command = new Command(addonName, commandOpts);
        this._commands.push(command);
        this._commandsByName[command.getName()] = command;
    };

    this.getCommand = function(commandName) {
        return this._commandsByName[commandName];
    };

    this.getCommands = function() {
        return this._commands;
    };

    this.getAllCommandHelp = function() {
        return this._commands.filter(function(command) {
            return !command.isHidden();
        }).map(function(command) {
            return "  " + command.getShortDescription();
        });
    };

    this.getAllCommandNames = function() {
        return this._commands.filter(function(command) {
            return !command.isHidden();
        }).map(function(command) {
            return command.getName();
        });
    };
});

var singleton = module.exports = new CommandManager();
