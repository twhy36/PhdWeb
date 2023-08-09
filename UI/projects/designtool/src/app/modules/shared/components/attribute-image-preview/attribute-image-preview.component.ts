import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';

import { UnsubscribeOnDestroy, Attribute } from 'phd-common';

import * as _ from 'lodash';

@Component({
	selector: 'attribute-image-preview',
	templateUrl: 'attribute-image-preview.component.html',
	styleUrls: ['attribute-image-preview.component.scss']
})
export class AttributeImagePreviewComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
{
	@Input() attribute: Attribute;

	@Output() closePreview = new EventEmitter();

	imageUrl: string;
	title: string;
	doFade: boolean = false;

	constructor() { super(); }

	ngOnInit()
	{
		this.loadImage();
	}

	loadImage()
	{
		this.doFade = false;

		_.delay(i => this.doFade = true, 100);

		this.imageUrl = this.attribute.imageUrl;
		this.title = this.attribute.name;
	}

	ngOnChanges()
	{
		this.loadImage();
	}

	close()
	{
		this.closePreview.emit();
	}
}
