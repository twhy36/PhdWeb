import { Component, OnInit, OnChanges, Input } from '@angular/core';

import { UnsubscribeOnDestroy } from '../../utils/unsubscribe-on-destroy';

import { CloudinaryImage } from '@cloudinary/url-gen';
import { ImageTransformation, ImagePlugins, ImageService } from '../../services/image.service';

@Component({
	selector: 'image',
	templateUrl: './image.component.html',
	styleUrls: ['./image.component.scss']
})
export class ImageComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
{
	@Input() imageUrl: string;
	@Input() defaultImage: string;
	@Input() height: string | number;
	@Input() width: string | number;
	@Input() crop: string;
	@Input() backgroundColor: string = 'white';
	@Input() alt: string;
	@Input() gravity: string;
	@Input() imagePlugins: ImagePlugins[] = [];
	@Input() transformations: ImageTransformation[];
	@Input() disablePlaceholder: boolean = false;

	cldImage: CloudinaryImage;
	plugins: object[] = [];

	constructor(private imageService: ImageService)
	{
		super();
	}

	get imageUrlHasValue(): boolean
	{
		return this.imageUrl?.length > 0;
	}

	get defaultImageHasValue(): boolean
	{
		return this.defaultImage?.length > 0;
	}

	ngOnInit(): void
	{
		this.setImage();
	}

	ngOnChanges()
	{
		this.setImage();
	}

	setImage()
	{
		if (this.imageUrlHasValue)
		{
			this.plugins = this.imageService.getPluggins(this.imagePlugins, this.disablePlaceholder);

			// create the image
			this.cldImage = this.imageService.createImage(this.imageUrl);
			
			// default delivery time for now.  Not pulling images from cloudinary just passing in from picture park
			this.setDeliveryType('fetch');

			// set base resize action from the passed in parameters before applying any additional transformations
			const baseResizeAction = this.imageService.createBaseResizeAction(this.crop, this.width, this.height, this.backgroundColor, this.gravity);

			if (!!baseResizeAction)
			{
				this.setTransformation([{ type: 'resize', action: baseResizeAction }]);
			}

			if (this.transformations?.length > 0)
			{
				// apply any additional transformations
				this.setTransformation(this.transformations);
			}
		}
	}

	setTransformation(transformations: ImageTransformation[])
	{
		transformations.forEach(transformation =>
		{
			switch (transformation.type)
			{
				case 'resize':
					this.cldImage.resize(transformation.action);

					break;
				case 'effect':
					this.cldImage.effect(transformation.action);

					break;
			}
		});
	}

	setDeliveryType(deliveryType: string)
	{
		this.cldImage.setDeliveryType(deliveryType);
	}
}
