exports = Class(function() {
    this.init = function(sourceGrid) {
        var row;
        var x, z;
        
        this._sourceGrid = sourceGrid;
        this._width = sourceGrid[0].length;
        this._height = sourceGrid.length;
        this._limit = this._width * this._height;
        
        this._grid = [];
        for (z = 0; z < this._height; z++) {
            for (x = 0; x < this._width; x++) {
                this._grid.push({
                    parent: null,
                    value: z * this._width + x,
                    x: x,
                    z: z,
                    t: 0
                });
            }
        }

        this._neighbourList = [];
        for (x = 0; x < 8; x++) {
            this._neighbourList.push({x: 0, z: 0});
        }

        this._t = 1;
    };

    this._valid = function(x, z) {
        return this._sourceGrid[x][z].canPass;
    };

    this._tile = function(index) {
        var tile = this._grid[index],
            t = this._t;

        if (tile.t < t) {
            tile.f = 0;
            tile.g = 0;
            tile.t = t;
        }

        return tile;
    };
    
    this._findPath = function(startX, startZ, endX, endZ) {
        var result = [],
            grid = this._grid,
            path = [],
            width = this._width,
            end = this._tile(endZ * width + endX),
            open = [startZ * width + startX],
            neighbourList = this._neighbourList,
            neighbour,
            node,
            currentNode,
            length,
            max, min,
            i;

        this._t++;

        while (length = open.length) {
            max = this._limit;
            min = -1;
            for (i = 0; i < length; i++) {
                if (grid[open[i]].f < max) {
                    max = grid[open[i]].f;
                    min = i;
                }
            };

            node = this._tile(open.splice(min, 1)[0]);
            if (node.value === end.value) {
                currentNode = node;
                while (!((currentNode.x === startX) && (currentNode.z === startZ))) {
                    result.push([currentNode.x, currentNode.z]);
                    currentNode = currentNode.parent;
                };
            } else {
                i = this._neighbours(node.x, node.z);
                while (i) {
                    neighbour = neighbourList[--i];
                    currentNode = this._tile(neighbour.z * width + neighbour.x);
                    if (!path[currentNode.value]) {
                        path[currentNode.value] = true;
                        currentNode.parent = node;
                        currentNode.g = this._manhattan(neighbour, node) + node.g;
                        currentNode.f = this._manhattan(neighbour, end) + currentNode.g;
                        open.push(currentNode.value);
                    };
                };
            };
        };

        return result;
    };

    this.findPath = function(startX, startZ, endX, endZ) {
        
        return this._findPath(startX, startZ, endX, endZ);
        
        var path1, path2;

        this._wrap = false;
        path1 = this._findPath(startX, startZ, endX, endZ);
        this._wrap = true;
        path2 = this._findPath(startX, startZ, endX, endZ);

        return (path1.length < path2.length) ? path1 : path2;
    };

    this._neighbours = function(x, z) {
        var neighbourList = this._neighbourList,
            neighbourCount = 0,
            neighbour,
            width = this._width,
            height = this._height,
            x1Valid, x2Valid, z1Valid, z2Valid,
            z1, z2, x1, x2;

        if (this._wrap) {
            x1 = (x + width - 1) % width;
            x2 = (x + width + 1) % width;
            z1 = (z + height - 1) % height;
            z2 = (z + height + 1) % height;
            x1Valid = this._valid(x1, z),
            x2Valid = this._valid(x2, z);
            z1Valid = this._valid(x, z1);
            z2Valid = this._valid(x, z2);
        } else {
            x1 = x - 1;
            x2 = x + 1;
            z1 = z - 1;
            z2 = z + 1;
            x1Valid = (x1 > -1) && this._valid(x1, z),
            x2Valid = (x2 < width) && this._valid(x2, z);
            z1Valid = (z1 > -1) && this._valid(x, z1);
            z2Valid = (z2 < height) && this._valid(x, z2);
        }
            
        if (x1Valid) {
            neighbour = neighbourList[neighbourCount];
            neighbour.x = x1;
            neighbour.z = z;
            neighbourCount++;
        }
        if (x2Valid) {
            neighbour = neighbourList[neighbourCount];
            neighbour.x = x2;
            neighbour.z = z;
            neighbourCount++;
        }

        if (z1Valid) {
            neighbour = neighbourList[neighbourCount];
            neighbour.x = x;
            neighbour.z = z1;
            neighbourCount++;

            if (x2Valid && this._valid(x2, z1)) {
                neighbour = neighbourList[neighbourCount];
                neighbour.x = x2;
                neighbour.z = z1;
                neighbourCount++;
            }
            if (x1Valid && this._valid(x1, z1)) {
                neighbour = neighbourList[neighbourCount];
                neighbour.x = x1;
                neighbour.z = z1;
                neighbourCount++;
            }
        }
        if (z2Valid) {
            neighbour = neighbourList[neighbourCount];
            neighbour.x = x;
            neighbour.z = z2;
            neighbourCount++;

            if (x2Valid && this._valid(x2, z2)) {
                neighbour = neighbourList[neighbourCount];
                neighbour.x = x2;
                neighbour.z = z2;
                neighbourCount++;
            }
            if (x1Valid && this._valid(x1, z2)) {
                neighbour = neighbourList[neighbourCount];
                neighbour.x = x1;
                neighbour.z = z2;
                neighbourCount++;
            }
        }

        return neighbourCount;
    };

    this._manhattan = function(point, end) {
        return Math.abs(point.x - end.x) + Math.abs(point.z - end.z);
    };
});