import { Component, Input } from '@angular/core';
import { ImagePlugins } from 'phd-common';

@Component({
	selector: 'image',
	template: ''
// eslint-disable-next-line indent
})
export class MockCloudinaryImageComponent
{
	@Input() imageUrl: string;
	@Input() defaultImage: string;
	@Input() imagePlugins: ImagePlugins[];
}
