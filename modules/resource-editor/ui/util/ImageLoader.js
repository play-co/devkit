export default class ImageLoader {
  constructor() {
    this.cache = {};
  }

  load(src) {
    if (src in this.cache) { return this.cache[src]; }
    return (this.cache[src] = new Promise((resolve, reject) => {
      let img = new Image();
      let clear = () => { img = img.onload = img.onerror = null; };
      img.src = src;
      img.onload = (_event) => {
        resolve({width: img.width, height: img.height});
        clear();
      };
      img.onerror = (event) => {
        reject(event);
        clear();
      };
    }));
  }
}

export let imageLoader = new ImageLoader();
