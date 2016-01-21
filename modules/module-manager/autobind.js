// lols: https://github.com/facebook/react/issues/3040#issuecomment-74131496
export default function autobind(thisarg) {
  let keys = Object.getOwnPropertyNames(Object.getPrototypeOf(thisarg));
  if (thisarg.bound) {
    throw new Error('thisarg.bound already exists', thisarg);
  }
  thisarg.bound = {};
  for (let name of keys) {
    let method = thisarg[name];
    // Supposedly you'd like to skip constructor
    if (!(method instanceof Function) || name === 'constructor') { continue; }
    thisarg.bound[name] = method.bind(thisarg);
  }
}
