/** @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.
 
 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.
 
 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */
var PortManager = exports = Class(function () {
    this.init = function (opts) {
        this._rangeStart = opts.start;
        this._rangeEnd = opts.end;
        this._ports = {};
        for (var i = this._rangeStart; i < this._rangeEnd; i++) {
            this._ports[i] = false;
        };
    }
    this.isEmpty = function (port) {
        return this._ports[port];
    }
    this.useEmptyPort = function () {
        var port;
        for (port in this._ports) {
            if (!this._ports[port]) {
                this._ports[port] = true;
                return port;
            }
        }
    }
    this.clearPort = function (port) {
        if (port in this._ports) {
            this._ports[port] = false;
        }
    }
});
