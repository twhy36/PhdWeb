import { forwardRef, Injectable, Inject } from '@angular/core';
import { lazyload, placeholder } from '@cloudinary/ng';
import { Cloudinary } from '@cloudinary/url-gen';
import { outline } from '@cloudinary/url-gen/actions/effect';
import { fill, limitPad, pad, scale } from '@cloudinary/url-gen/actions/resize';
import { color } from '@cloudinary/url-gen/qualifiers/background';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { CLOUDINARY } from '../injection-tokens';

@Injectable()
export class ImageService
{
	constructor(@Inject(forwardRef(() => CLOUDINARY)) private cloudinary: Cloudinary) { }

	createImage(imageUrl: string)
	{
		return this.cloudinary.image(imageUrl);
	}

	getCropType(crop: string)
	{
		let cropType;

		switch (crop)
		{
			case 'pad':
				cropType = pad();

				break;
			case 'fill':
				cropType = fill();

				break;
			case 'lpad':
				cropType = limitPad();

				break;
			default:
				cropType = scale();

				break;
		}

		return cropType;
	}

	getEffectType(effect: string)
	{
		let effectType;

		switch (effect)
		{
			case 'outline':
				effectType = outline();

				break;
		}

		return effectType;
	}

	createBaseResizeAction(crop: string, width?: string | number, height?: string | number, backgroundColor?: string, gravity?: string)
	{
		const resizeAction = this.getCropType(crop);

		if (!!width)
		{
			resizeAction.width(width);
		}

		if (!!height)
		{
			resizeAction.height(height);
		}

		if (!!backgroundColor && (!!crop && crop !== 'fill' && crop !== 'scale'))
		{
			resizeAction.background(color(backgroundColor));
		}

		if (!!gravity)
		{
			resizeAction.gravity(autoGravity());
		}

		return resizeAction;
	}

	getPluggins(imagePlugins: ImagePlugins[], disablePlaceholder: boolean = false)
	{
		const pluginList = [];

		if (imagePlugins.includes(ImagePlugins.LazyLoad))
		{
			pluginList.push(lazyload());
		}

		// default placeholder unless specified 
		if (!disablePlaceholder)
		{
			pluginList.push(placeholder({ mode: 'blur' }));
		}

		return pluginList;
	}
}

export enum ImagePlugins
{
	LazyLoad,
	Placeholder
}

export interface ImageTransformation
{
	type: string;
	action: any;
}
