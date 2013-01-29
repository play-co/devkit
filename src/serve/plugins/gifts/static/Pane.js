import squill.Widget;
import squill.Cell;
import squill.models.DataSource as DataSource;
import util.ajax;

import squill.Delegate;
import std.uuid;

import sdkPlugin;

from util.browser import $;

var GiftEditor = Class(squill.Cell, function() {
	this._def = {
		className: 'giftEditor',
		children: [
			{id: 'label', type: 'label'},
			{id: 'name', type: 'text', placeholder: "Label"},
			{id: 'description', type: 'text', multiline: true, placeholder: "Description"},
			{id: 'btnDelete', type: 'button', label: "Delete"}
		]
	};

	this.buildWidget = function() {
		this.publish = delay(this.publish, 250);

		this.name.subscribe('ValueChange', this, 'save');
		this.description.subscribe('ValueChange', this, 'save');
		this.btnDelete.onClick = function () {
			this.publish('Deleted', this._data.id);
		}.bind(this);
	};

	this.save = function() {
		this._data.name = this.name.getValue();
		this._data.description = this.description.getValue();
		this.publish('Changed', this._data);
	};

	this.publish = function(type, data) {
		this.controller.publish(type, data);
	};

	this.render = function() {
		this.label.setText(this._data.id);
		this.name.setValue(this._data.name);
		this.description.setValue(this._data.description);
	};
});

exports = Class(sdkPlugin.SDKPlugin, function(supr) {

	var gifts = new DataSource();

	this.init = function() {

		this._def = {
			id: 'giftPanel',
			className: 'mainPanel',
			children: [
				{id: 'newGift', type: 'button', label: 'New Gift'},
				{id: 'list', type: 'list', isFixedHeight: false, controller: this, dataSource: gifts, cellCtor: GiftEditor}
			]
		};

		supr(this, 'init', arguments);
	};

	this.buildWidget = function() {
		this.list.subscribe('Changed', this, '_save');
		this.list.subscribe('Deleted', this, '_delete');
	};

	this.showProject = function(project) {
		supr(this, 'showProject', arguments);

		util.ajax.get({url: '/plugins/gifts/get/' + GLOBAL.overview.getCurrentProject().id, type: 'json'}, bind(this, '_onGifts'));
	};

	this._save = function(gift) {
		util.ajax.post({url: '/plugins/gifts/set/' + GLOBAL.overview.getCurrentProject().id, data: gift, headers: {"Content-Type": "application/json"}});
	};

	this._delete = function(id) {
		gifts.remove(id);
		util.ajax.post({url: '/plugins/gifts/delete/' + GLOBAL.overview.getCurrentProject().id, data: {id: id}, headers: {"Content-Type": "application/json"}});
	};

	this.delegate = new squill.Delegate(function(on) {
		on.newGift = function() {
			gifts.add({
				id: std.uuid.uuid(),
				name: null,
				description: null
			});
		};
	});

	this._onGifts = function (err, response) {
		if (err) { logger.log(err); return; }

		gifts.clear();

		for (var id in response) {
			gifts.add(response[id]);
		}
	};

});

