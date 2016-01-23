import Promise from 'bluebird';

export default class ModuleInfo {
  constructor(opts) {
    this._raw = opts;

    this.name = opts.name;
    this.url = 'the url';  // TODO: implement server side
    this.ref = opts.version;
    this.status = 'ok';  // TODO: implement server side
    this.dependencies = [];
    // this.package = ;
    this.isSymlink = false;
  }

  addDependency(moduleInfo) {
    this.dependencies.push(moduleInfo);
  }
}

class ModuleTree {
  constructor() {
    this.modules = [];
  }

  addModule(moduleInfo) {
    if (moduleInfo._raw.isDependency) {
      // We know this is top level
      this.modules.push(moduleInfo);
      return true;
    }
    // > 1 level deep
    let parent = this.findByPath(moduleInfo._raw.parent);
    if (!parent) {
      return false;
    }

    parent.addDependency(moduleInfo)
    return true;
  }

  findByPath(path, _modules) {
    _modules = _modules || this.modules;
    for (let i = 0; i < _modules.length; i++) {
      let testModule = _modules[i];
      if (testModule._raw.path == path) {
        return testModule;
      }

      let res = this.findByPath(path, testModule.dependencies);
      if (res) {
        return res;
      }
    }
  }
}

/** Build a tree of ModuleInfo classes from a devkit module listing */
export function buildModuleTree(modules) {
  let tree = new ModuleTree();

  let modulesToAdd = [];
  Object.keys(modules).forEach((key) => {
    let moduleData = modules[key];
    modulesToAdd.push(new ModuleInfo(moduleData));
  });

  // let modulesToAdd = JSON.parse(JSON.stringify(modules));
  let maxDepth = 5;
  for (let depth = 0; depth < maxDepth; depth++) {
    modulesToAdd.forEach((moduleInfo, index) => {
      if (tree.addModule(moduleInfo)){
        modulesToAdd.splice(index, 1);
      }
    });
  }

  if (modulesToAdd.length > 0) {
    console.log('Failed to add modules:', modulesToAdd);
    debugger
  }

  // return tree;
  return Promise.resolve(tree);
}

