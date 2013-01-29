"use import";

from util.browser import $;

import squill.Delegate;
import squill.Widget as Widget;

import ..widgets.SliderGroup as SliderGroup;
import ..widgets.ColorGroup as ColorGroup;

exports = RangePanel = Class(Widget, function(supr) {
	this.init = function(opts) {
		this._fontEditor = opts.fontEditor;
		this._charListPanel = opts.charListPanel;

		this._def = {
			children: [
				{
					id: 'fontCharacters',
					className: 'fontGroup',
					children: [
						{
							id: 'charactersLabel',
							type: 'label',
							label: 'characters',
							className: 'label'
						},
						{
							className: 'fontRangeGroup',
							children: [
								{id: 'rangeLabel', type: 'label', label: 'Selected: none'}
							]
						},
						{
							className: 'fontRangeGroup',
							children: [
								{id: 'fontNoNumbers', type: 'button', label: 'none'},
								{id: 'fontAllNumbers', type: 'button', label: 'all'},
								{type: 'label', label: 'Numbers', className: 'smallLabel'}
							]
						},
						{
							className: 'fontRangeGroup',
							children: [
								{id: 'fontNoSymbols', type: 'button', label: 'none'},
								{id: 'fontAllSymbols', type: 'button', label: 'all'},
								{type: 'label', label: 'Symbols', className: 'smallLabel'}
							]
						},
						{
							className: 'fontRangeGroup',
							children: [
								{id: 'fontNoUpperCase', type: 'button', label: 'none'},
								{id: 'fontAllUpperCase', type: 'button', label: 'all'},
								{type: 'label', label: 'Upper-case letters', className: 'smallLabel'}
							]
						},
						{
							className: 'fontRangeGroup',
							children: [
								{id: 'fontNoLowerCase', type: 'button', label: 'none'},
								{id: 'fontAllLowerCase', type: 'button', label: 'all'},
								{type: 'label', label: 'Lower-case letters', className: 'smallLabel'}
							]
						}
					]
				}
			]
		};

		supr(this, 'init', arguments);
	};

	this.buildWidget = function() {
	};

	this.delegate = new squill.Delegate(function(on) {
		on.fontAllNumbers = function() {
			this._charListPanel.selectRange('numbers');
			this.rangeLabel.setLabel('Selected: ' + this._charListPanel.getRangeDescription());
		};

		on.fontNoNumbers = function() {
			this._charListPanel.deselectRange('numbers');
			this.rangeLabel.setLabel('Selected: ' + this._charListPanel.getRangeDescription());
		};

		on.fontAllUpperCase = function() {
			this._charListPanel.selectRange('uppercase');
			this.rangeLabel.setLabel('Selected: ' + this._charListPanel.getRangeDescription());
		};

		on.fontNoUpperCase = function() {
			this._charListPanel.deselectRange('uppercase');
			this.rangeLabel.setLabel('Selected: ' + this._charListPanel.getRangeDescription());
		};

		on.fontAllLowerCase = function() {
			this._charListPanel.selectRange('lowercase');
			this.rangeLabel.setLabel('Selected: ' + this._charListPanel.getRangeDescription());
		};

		on.fontNoLowerCase = function() {
			this._charListPanel.deselectRange('lowercase');
			this.rangeLabel.setLabel('Selected: ' + this._charListPanel.getRangeDescription());
		};

		on.fontAllSymbols = function() {
			this._charListPanel.selectRange('symbols1');
			this._charListPanel.selectRange('symbols2');
			this._charListPanel.selectRange('symbols3');
			this.rangeLabel.setLabel('Selected: ' + this._charListPanel.getRangeDescription());
		};

		on.fontNoSymbols = function() {
			this._charListPanel.deselectRange('symbols1');
			this._charListPanel.deselectRange('symbols2');
			this._charListPanel.deselectRange('symbols3');
			this.rangeLabel.setLabel('Selected: ' + this._charListPanel.getRangeDescription());
		};
	});
});