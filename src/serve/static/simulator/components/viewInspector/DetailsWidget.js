from util.browser import $;
import squill.Widget as Widget;
import .InputWidget;

function noop(e) {
  e.stopPropagation();
  e.preventDefault();
  return false;
}

var PropRow = Class(Widget, function (supr) {
  this.init = function (opts) {
    var children = [];
    this._def = {
      className: 'propRow',
      children: children
    };

    if (typeof opts.prop == 'string') { opts.prop = {title: opts.prop, id: opts.prop}; }

    var props = opts.props || [opts.prop];
    props.forEach(function (prop) {
      children.push({className: 'propTitle', text: prop.title || prop.id}, {id: prop.id, type: InputWidget, prop: prop});
    });

    this._def.className += ' propCount' + props.length;

    supr(this, 'init', arguments);

    this.props = props;
  }
});

exports = Class(Widget, function (supr) {
  this._def = {
    children: [
      {id: '_header', children: [
        {text: 'editing: ', tag: 'span'},
        {id: '_editorType', tag: 'span', text: 'simulator', type: 'label'},
        {id: '_closeBtn', type: 'button', children: [{className: 'glyphicon glyphicon-remove'}]}
      ]},
      {id: 'details', children: [
        {id: 'viewDetails', type: 'label'}
      ]},
      {id: 'detailsScroller', children: [
        {className: 'propRow propSection', text: 'position'},
        {type: PropRow, props: [{title: 'x', id: 'relX'}, {title: 'y', 'id': 'relY'}]},
        {type: PropRow, prop: {title: 'r', id: 'relR', increment: 0.01}},
        {type: PropRow, props: [{title: 'width', id: 'relWidth'}, {title: 'height', id: 'relHeight'}]},
        {type: PropRow, prop: {title: 'scale', id: 'relScale'}},

        {className: 'propRow propSection', text: 'style'},
        {type: PropRow, prop: {id: 'opacity', min: 0, max: 1, increment: 0.01}},
        {type: PropRow, prop: 'zIndex'},
        {type: PropRow, prop: {id: 'visible', type: 'boolean'}},
        {type: PropRow, props: [{title: 'anchor x', id: 'anchorX'}, {title: 'y', id: 'anchorY'}]},
        {type: PropRow, props: [{title: 'offset x', id: 'offsetX'}, {title: 'y', id: 'offsetY'}]},
        {type: PropRow, prop: {id: 'clip', type: 'boolean'}},
        {type: PropRow, prop: {id: 'inLayout', type: 'boolean'}},
        {type: PropRow, prop: 'order'},
        {type: PropRow, prop: 'flex'},
        {type: PropRow, prop: 'layout'},

        {id: 'boxProps', children: [
          {className: 'propRow propSection', text: 'box layout'},
          {type: PropRow, props: [{id: 'left'}, {id: 'right'}]},
          {type: PropRow, props: [{id: 'top'}, {id: 'bottom'}]},

          {type: PropRow, props: [{id: 'minWidth'}, {title: 'height', id: 'minHeight'}]},
          {type: PropRow, props: [{id: 'maxWidth'}, {title: 'height', id: 'maxHeight'}]},
          {type: PropRow, props: [{id: 'layoutWidth'}, {title: 'height', id: 'layoutHeight'}]},
          {type: PropRow, props: [{id: 'centerX', type: 'boolean'}, {id: 'centerY', type: 'boolean'}]},

        ]},

        {id: 'linearProps', children: [
          {className: 'propRow propSection', text: 'linear layout'},
          {type: PropRow, prop: 'subviews'},
          {type: PropRow, prop: 'direction'},
          {type: PropRow, prop: 'justifyContent'},
          {type: PropRow, prop: {id: 'padding', type: 'string'}},
        ]},

        {className: 'propRow propSection', text: 'absolute position'},
        {type: PropRow, props: [{title: 'x', id: 'absX'}, {title: 'y', 'id': 'absY'}]},
        {type: PropRow, prop: {title: 'r', id: 'absR', increment: 0.01}},
        {type: PropRow, props: [{title: 'width', id: 'absWidth'}, {title: 'height', id: 'absHeight'}]},
        {type: PropRow, prop: {title: 'scale', id: 'absScale'}},

        {tag: 'div', id: 'dropArea', text: 'Drop Here \u2193', children: [
          {tag: 'button', id: 'saveImg', text: "save image"}
        ]}
      ]}
    ]
  };

  this.buildWidget = function () {

    this._children.forEach(function (child) {
      if (child instanceof PropRow) {
        child.props.forEach(function (prop) {
          this[prop.id] = child[prop.id];
          this[prop.id].subscribe('ValueChange', this, '_onValueChange', prop.id);
        }, this);
      }
    }, this);
  };

  this.delegate = function (key) {
    if (key == '_closeBtn') {
      this._inspector.close();
    }
  }

  this._onValueChange = function (key) {
    if (this._viewUID) {
      var value = this[key].getValue();
      this._inspector.setViewProp(this._viewUID, key, value);
    }
  };

  this.setInspector = function (inspector) {
    this._inspector = inspector;
  };

  this.imageView = function (uid, node) {
    // get the view properties
    this._inspector.getViewProps(uid, bind(this, function (err, res) {
      if (err) return;

      // show the drop area
      this.dropArea.style.display = res.isImageView ? "block" : "none";

      //if already data set, show save button
      if (!node.currentImage || !node.currentImage.data) {
        this.saveImg.style.display = "none";
      } else {
        this.saveImg.style.display = "block";
      }

      if (res.isImageView) {
        //create the object if not set
        if (!node.currentImage) {
          node.currentImage = {};
        }

        //update the uid and path
        node.currentImage.uid = uid;
        node.currentImage.path = res.imagePath;
      } else {
        //delete the property
        delete node['currentImage'];
      }
    }));
  }

  this.showView = function (uid) {
    this._viewUID = uid;

    if (uid) {
      this._inspector.getViewProps(uid, bind(this, function (err, res) {
        if (res) {
          this.viewDetails.setText(res.description);
          if (res.layout == 'linear') {
            $.show(this.linearProps);
          } else {
            $.hide(this.linearProps);
          }

          for (var key in res) {
            if (this[key] && this[key].setValue) {
              this[key].setValue(res[key]);
            }
          }
        }
      }));
    }
  };

  this.hideProps = function () {
    for (var i = 0, p; p = arguments[i]; ++i) {
      $.hide(this['_row' + p]);
    }
  }

  this.showProps = function () {
    for (var i = 0, p; p = arguments[i]; ++i) {
      $.show(this['_row' + p]);
    }
  }

  this.init = function() {
    supr(this, "init", arguments);

    this.dropArea.addEventListener("dragenter", noop, false);
    this.dropArea.addEventListener("dragexit", bind(this, function(e) {
      this.dropArea.className = "";
      return noop(e);
    }), false);

    //modify the styles
    this.dropArea.addEventListener("dragover", bind(this, function(e) {
      this.dropArea.className = "over";
      return noop(e);
    }), false);

    this.dropArea.addEventListener("drop", bind(this, this.dropImage), false);

    this.saveImg.addEventListener("click", bind(this, this.saveImage), false);
  };

  this.dropImage = function(e) {
    var files = e.dataTransfer.files;
    var count = files.length;
    var file  = files[0];

    if (count < 1) {
      return console.log("No image found");
    }

    var reader = new FileReader();
    reader.onload = bind(this, function(evt) {
      //set the preview
      if (!currentNode || !currentNode.currentImage) return;

      this._inspector.setImage(currentNode.currentImage.uid, evt.target.result);
      currentNode.currentImage.data = evt.target.result;
    });

    reader.readAsDataURL(file);

    this.saveImg.style.display = "block";
    return noop(e);
  }

  this.saveImage = function() {
    var img = currentNode && currentNode.currentImage;
    if (!img) return;

    var path = encodeURIComponent(img.path.substr(10));

    util.ajax.post({
      url: "/art/replaceImage/" + this._opts.appID + "/" + path,
      data: {data: img.data},
      headers: {
        'Content-Type': 'application/json'
      }
    }, bind(this, function(err, resp) {
      if (!err) {
        delete currentNode.currentImage.data;
        this.saveImg.style.display = "none";
      }
    }));
  }
});
