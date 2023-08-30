import { Component, Input } from '@angular/core';

@Component({
	selector: 'image',
	template: ''
// eslint-disable-next-line indent
})
export class MockCloudinaryImageComponent
{
	@Input() 'imageUrl': string;
	@Input() 'defaultImage': string;
}
