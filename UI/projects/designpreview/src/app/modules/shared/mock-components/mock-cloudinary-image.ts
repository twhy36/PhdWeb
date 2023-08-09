import { Component, Input } from '@angular/core';

@Component({
	selector: 'image',
	template: ''
	})
export class MockCloudinaryImage
{
	@Input() 'imageUrl': string;
	@Input() 'defaultImage': string;
}
